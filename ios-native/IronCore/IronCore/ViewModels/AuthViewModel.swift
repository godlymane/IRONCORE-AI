import SwiftUI
import FirebaseAuth
import FirebaseFirestore
import AuthenticationServices

enum AuthState: Equatable {
    case loading
    case unauthenticated
    case onboarding
    case authenticated
}

/// Auth state machine — mirrors App.jsx auth guard logic
/// Flow: loading → unauthenticated → (login) → onboarding/authenticated
@MainActor
final class AuthViewModel: ObservableObject {
    @Published var authState: AuthState = .loading
    @Published var user: User?
    @Published var profile: UserProfile?
    @Published var error: String?
    @Published var isSigningIn = false

    private var authHandle: AuthStateDidChangeListenerHandle?
    private var profileListener: ListenerRegistration?
    private let authService = AuthService.shared
    private let firestoreService = FirestoreService.shared

    // Convenience accessor
    var uid: String? { user?.uid }

    // Apple Sign-In nonce
    var currentNonce: String?

    init() {
        listenToAuthState()
    }

    deinit {
        if let handle = authHandle {
            Auth.auth().removeStateDidChangeListener(handle)
        }
        stopProfileListener()
    }

    // MARK: - Auth State Listener (matches onAuthStateChanged in React)

    private func listenToAuthState() {
        authHandle = authService.listenToAuthState { [weak self] user in
            Task { @MainActor in
                guard let self = self else { return }
                self.user = user

                if let user = user {
                    // Check cached onboarding status (matches localStorage check in App.jsx)
                    let cachedOnboarded = UserDefaults.standard.bool(forKey: "ironai_onboarded_\(user.uid)")
                    if cachedOnboarded {
                        self.authState = .authenticated
                    }
                    // Initial load from Firestore, then start live listener
                    await self.loadProfile(uid: user.uid)
                    self.startProfileListener(uid: user.uid)
                    // Retry any onboarding writes that failed previously
                    await self.retryPendingOnboarding()
                    // Request push notification permission + start in-app notification listener
                    Task {
                        let _ = await NotificationService.shared.requestPermission()
                        NotificationService.shared.startListening(uid: user.uid)
                    }
                } else {
                    self.stopProfileListener()
                    NotificationService.shared.stopListening()
                    self.profile = nil
                    self.authState = .unauthenticated
                }
            }
        }
    }

    // MARK: - Profile Loading (matches useFitnessData profile loading)

    private func loadProfile(uid: String) async {
        do {
            let profile = try await firestoreService.getProfile(uid: uid)
            self.profile = profile

            if let profile = profile, profile.onboarded {
                // Cache onboarding status (matches localStorage.setItem in React)
                UserDefaults.standard.set(true, forKey: "ironai_onboarded_\(uid)")
                self.authState = .authenticated
            } else {
                self.authState = .onboarding
            }
        } catch {
            // If Firestore fails but cache says onboarded, trust the cache
            let cachedOnboarded = UserDefaults.standard.bool(forKey: "ironai_onboarded_\(uid)")
            self.authState = cachedOnboarded ? .authenticated : .onboarding
        }
    }

    // MARK: - Live Profile Listener (keeps profile fresh after initial load)

    private func startProfileListener(uid: String) {
        // Don't double-subscribe
        stopProfileListener()

        profileListener = firestoreService.listenToProfile(uid: uid) { [weak self] result in
            Task { @MainActor in
                guard let self = self else { return }
                switch result {
                case .success(let profile):
                    if let profile = profile {
                        self.profile = profile
                        if profile.onboarded {
                            UserDefaults.standard.set(true, forKey: "ironai_onboarded_\(uid)")
                            if self.authState != .authenticated {
                                self.authState = .authenticated
                            }
                        }
                    }
                    // nil means doc doesn't exist yet — don't change state,
                    // initial loadProfile already handled this

                case .failure:
                    // Error (network or decode) — keep current profile and auth state.
                    // Never kick an authenticated user back to onboarding because
                    // of a transient error or Codable mismatch.
                    break
                }
            }
        }
    }

    private func stopProfileListener() {
        profileListener?.remove()
        profileListener = nil
    }

    // MARK: - Email/Password Sign In

    func signInWithEmail(email: String, password: String) async {
        isSigningIn = true
        error = nil
        do {
            let user = try await authService.signInWithEmail(email: email, password: password)
            self.user = user
        } catch {
            self.error = error.localizedDescription
        }
        isSigningIn = false
    }

    func createAccount(email: String, password: String) async {
        isSigningIn = true
        error = nil
        do {
            let user = try await authService.createAccountWithEmail(email: email, password: password)
            self.user = user
        } catch {
            self.error = error.localizedDescription
        }
        isSigningIn = false
    }

    // MARK: - Google Sign-In (matches signInWithGoogle in useFitnessData.js)

    func signInWithGoogle() async {
        isSigningIn = true
        error = nil
        do {
            let user = try await authService.signInWithGoogle()
            self.user = user
        } catch {
            // Cancelled by user — silent (matches React: auth/popup-closed-by-user)
            let nsError = error as NSError
            if nsError.domain == "com.google.GIDSignIn" && nsError.code == -5 {
                // GIDSignIn cancel code — silent
            } else {
                self.error = error.localizedDescription
            }
        }
        isSigningIn = false
    }

    // MARK: - Apple Sign-In

    func handleAppleSignIn(result: Result<ASAuthorization, Error>) async {
        isSigningIn = true
        error = nil

        switch result {
        case .success(let authorization):
            guard let appleIDCredential = authorization.credential as? ASAuthorizationAppleIDCredential,
                  let nonce = currentNonce else {
                error = "Invalid Apple Sign-In response"
                isSigningIn = false
                return
            }
            do {
                let user = try await authService.signInWithApple(credential: appleIDCredential, nonce: nonce)
                self.user = user
            } catch {
                self.error = error.localizedDescription
            }

        case .failure(let err):
            // User cancelled — silent (matches React: auth/popup-closed-by-user)
            if (err as NSError).code == ASAuthorizationError.canceled.rawValue {
                // Silent cancel
            } else {
                self.error = err.localizedDescription
            }
        }
        isSigningIn = false
    }

    func prepareAppleSignIn() -> String {
        let nonce = authService.randomNonce()
        currentNonce = nonce
        return authService.sha256(nonce)
    }

    // MARK: - Onboarding Complete (matches handleOnboardingComplete in App.jsx)

    func completeOnboarding(data: OnboardingData) async {
        guard let uid = user?.uid else { return }

        // 1. Update UI immediately (non-blocking, matches React pattern)
        authState = .authenticated

        // 2. Cache to UserDefaults (matches localStorage in React)
        UserDefaults.standard.set(true, forKey: "ironai_onboarded_\(uid)")

        // 3. Write to Firestore — retry up to 3 times on failure.
        // UserDefaults cache keeps user in .authenticated even if Firestore fails,
        // so they're never sent back to onboarding. Pending data is cached locally
        // and retried on next app launch.
        Task {
            var succeeded = false
            for attempt in 1...3 {
                do {
                    try await firestoreService.completeOnboarding(uid: uid, onboardingData: data)
                    succeeded = true
                    break
                } catch {
                    print("[Onboarding] Firestore write attempt \(attempt) failed: \(error)")
                    if attempt < 3 {
                        try? await Task.sleep(nanoseconds: UInt64(attempt) * 1_000_000_000)
                    }
                }
            }
            if !succeeded {
                print("[Onboarding] CRITICAL: Profile save failed after 3 attempts. Caching locally.")
                cachePendingOnboarding(uid: uid, data: data)
            }
        }
    }

    /// Retry any pending onboarding writes that failed previously.
    /// Call this on app launch after auth resolves.
    func retryPendingOnboarding() async {
        guard let uid = user?.uid else { return }
        let key = "ironai_pending_onboarding_\(uid)"
        guard let cached = UserDefaults.standard.dictionary(forKey: key) else { return }

        let onboardingData = onboardingDataFromCache(cached)
        do {
            try await firestoreService.completeOnboarding(uid: uid, onboardingData: onboardingData)
            UserDefaults.standard.removeObject(forKey: key)
            print("[Onboarding] Pending profile write succeeded on retry")
        } catch {
            print("[Onboarding] Pending profile retry still failing: \(error)")
        }
    }

    private func cachePendingOnboarding(uid: String, data: OnboardingData) {
        let dict: [String: Any] = [
            "goal": data.goal.rawValue,
            "gender": data.gender.rawValue,
            "weight": data.weight ?? 0,
            "height": data.height ?? 0,
            "age": data.age ?? 0,
            "activityLevel": data.activityLevel.rawValue,
            "intensity": data.intensity.rawValue,
            "calories": data.calculatedCalories,
            "protein": data.calculatedProtein,
            "carbs": data.calculatedCarbs,
            "fat": data.calculatedFat,
            "tdee": data.calculatedTDEE,
            "bmr": data.calculatedBMR
        ]
        UserDefaults.standard.set(dict, forKey: "ironai_pending_onboarding_\(uid)")
    }

    private func onboardingDataFromCache(_ dict: [String: Any]) -> OnboardingData {
        var data = OnboardingData()
        data.goal = FitnessGoal(rawValue: dict["goal"] as? String ?? "maintain") ?? .maintain
        data.gender = Gender(rawValue: dict["gender"] as? String ?? "male") ?? .male
        data.weight = dict["weight"] as? Double
        data.height = dict["height"] as? Double
        data.age = dict["age"] as? Int
        data.activityLevel = ActivityLevel(rawValue: dict["activityLevel"] as? Double ?? 1.55) ?? .moderate
        data.intensity = IntensityLevel(rawValue: dict["intensity"] as? String ?? "moderate") ?? .moderate
        data.calculatedCalories = dict["calories"] as? Int ?? 0
        data.calculatedProtein = dict["protein"] as? Int ?? 0
        data.calculatedCarbs = dict["carbs"] as? Int ?? 0
        data.calculatedFat = dict["fat"] as? Int ?? 0
        data.calculatedTDEE = dict["tdee"] as? Int ?? 0
        data.calculatedBMR = dict["bmr"] as? Int ?? 0
        return data
    }

    // MARK: - Sign Out (matches logout in useFitnessData.js)

    func signOut() {
        guard let uid = user?.uid else { return }

        // Stop live listeners before signing out
        stopProfileListener()

        do {
            try authService.signOut()
        } catch {
            self.error = error.localizedDescription
            return
        }

        // Clear cached data (matches localStorage.removeItem in React)
        UserDefaults.standard.removeObject(forKey: "ironai_onboarded_\(uid)")
        UserDefaults.standard.removeObject(forKey: "ironai_profile_\(uid)")

        profile = nil
        user = nil
        authState = .unauthenticated
    }
}
