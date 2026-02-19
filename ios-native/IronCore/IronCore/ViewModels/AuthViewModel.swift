import SwiftUI
import FirebaseAuth
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
    private var profileListener: Any?
    private let authService = AuthService.shared
    private let firestoreService = FirestoreService.shared

    // Apple Sign-In nonce
    var currentNonce: String?

    init() {
        listenToAuthState()
    }

    deinit {
        if let handle = authHandle {
            Auth.auth().removeStateDidChangeListener(handle)
        }
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
                    // Also load from Firestore
                    await self.loadProfile(uid: user.uid)
                } else {
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

        // 3. Write to Firestore in background (matches async updateData in React)
        Task {
            do {
                try await firestoreService.completeOnboarding(uid: uid, onboardingData: data)
            } catch {
                print("Profile save error: \(error)")
            }
        }
    }

    // MARK: - Sign Out (matches logout in useFitnessData.js)

    func signOut() {
        guard let uid = user?.uid else { return }

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
