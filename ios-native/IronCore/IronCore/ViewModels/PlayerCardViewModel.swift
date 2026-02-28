import Foundation
import FirebaseAuth
import FirebaseFirestore
import FirebaseFunctions
import LocalAuthentication

/// Player Card flow orchestration — mirrors PlayerCardView.jsx from React prototype.
/// Steps: landing → username → pin → creating → reveal
@MainActor
final class PlayerCardViewModel: ObservableObject {
    enum Step: Equatable {
        case landing
        case username
        case pin
        case creating
        case reveal
        case login       // Recovery phrase login flow
        case pinVerify   // PIN verification for existing users
    }

    @Published var step: Step = .landing
    @Published var username: String = ""
    @Published var usernameError: String?
    @Published var usernameAvailable: Bool?
    @Published var isCheckingUsername: Bool = false

    @Published var pin: String = ""
    @Published var confirmPin: String = ""
    @Published var pinStep: PinStep = .enter
    @Published var pinError: String?

    @Published var recoveryPhrase: String = ""
    @Published var phraseConfirmed: Bool = false
    @Published var isCreating: Bool = false
    @Published var creationError: String?

    // Login flow
    @Published var loginPhrase: String = ""
    @Published var loginError: String?
    @Published var isLoggingIn: Bool = false
    @Published var loginAttempts: Int = 0

    enum PinStep {
        case enter
        case confirm
    }

    private let firestore = FirestoreService.shared
    private let auth = AuthService.shared
    private var usernameCheckTask: Task<Void, Never>?

    // MARK: - Username Validation

    func onUsernameChanged(_ value: String) {
        username = value
        usernameError = nil
        usernameAvailable = nil

        let result = PlayerIdentity.validateUsername(value)
        if !result.valid {
            usernameError = result.error
            return
        }

        // Debounced availability check
        usernameCheckTask?.cancel()
        usernameCheckTask = Task {
            isCheckingUsername = true
            try? await Task.sleep(nanoseconds: 400_000_000) // 400ms debounce

            guard !Task.isCancelled else { return }

            do {
                let available = try await firestore.isUsernameAvailable(result.clean)
                guard !Task.isCancelled else { return }
                usernameAvailable = available
                if !available {
                    usernameError = "Username taken"
                }
            } catch {
                usernameError = "Could not check availability"
            }
            isCheckingUsername = false
        }
    }

    func submitUsername() {
        let result = PlayerIdentity.validateUsername(username)
        guard result.valid, usernameAvailable == true else { return }
        username = result.clean
        step = .pin
    }

    // MARK: - PIN Setup

    func onPinDigit(_ digit: String) {
        switch pinStep {
        case .enter:
            pin.append(digit)
            if pin.count == 6 {
                pinStep = .confirm
            }
        case .confirm:
            confirmPin.append(digit)
            if confirmPin.count == 6 {
                if confirmPin == pin {
                    pinError = nil
                    Task { await createAccount() }
                } else {
                    pinError = "PINs don't match"
                    confirmPin = ""
                    pinStep = .enter
                    pin = ""
                }
            }
        }
    }

    func onPinDelete() {
        switch pinStep {
        case .enter:
            if !pin.isEmpty { pin.removeLast() }
        case .confirm:
            if !confirmPin.isEmpty { confirmPin.removeLast() }
        }
    }

    var currentPinDisplay: String {
        switch pinStep {
        case .enter: return pin
        case .confirm: return confirmPin
        }
    }

    var currentPinCount: Int {
        switch pinStep {
        case .enter: return pin.count
        case .confirm: return confirmPin.count
        }
    }

    var pinTitle: String {
        switch pinStep {
        case .enter: return "CREATE YOUR PIN"
        case .confirm: return "CONFIRM YOUR PIN"
        }
    }

    // MARK: - Account Creation (matches handlePinSet in PlayerCardView.jsx)

    private func createAccount() async {
        step = .creating
        isCreating = true
        creationError = nil

        do {
            // 1. Anonymous sign-in
            let user = try await auth.signInAnonymously()
            let uid = user.uid

            // 2. Generate recovery phrase
            let phrase = PlayerIdentity.generatePhrase()
            let phraseHash = PlayerIdentity.hashPhrase(phrase)
            let pinHash = PlayerIdentity.hashPin(pin)

            // 3. Claim username
            let cleanUsername = PlayerIdentity.validateUsername(username).clean
            try await firestore.claimUsername(cleanUsername, uid: uid)

            // 4. Write profile
            try await firestore.saveProfile(uid: uid, data: [
                "username": cleanUsername,
                "phraseHash": phraseHash,
                "pinHash": pinHash,
                "xp": 0,
                "league": "iron",
                "onboarded": false,
                "createdAt": FieldValue.serverTimestamp(),
                "schemaVersion": 2
            ])

            // 5. Save PIN locally (matches localStorage in React)
            UserDefaults.standard.set(pinHash, forKey: "ironai_pin_\(uid)")

            // 6. Store phrase for reveal screen
            recoveryPhrase = phrase

            step = .reveal
        } catch {
            creationError = error.localizedDescription
            step = .pin
            pin = ""
            confirmPin = ""
            pinStep = .enter
        }

        isCreating = false
    }

    // MARK: - Recovery Phrase Login (matches React Cloud Function recoverAccount)

    func loginWithPhrase() async {
        guard !loginPhrase.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            loginError = "Enter your 12-word recovery phrase"
            return
        }

        isLoggingIn = true
        loginError = nil

        do {
            let functions = Functions.functions()
            let phraseHash = PlayerIdentity.hashPhrase(loginPhrase)

            let result = try await functions.httpsCallable("recoverAccount").call([
                "phraseHash": phraseHash
            ])

            if let data = result.data as? [String: Any],
               let token = data["token"] as? String {
                // Sign in with custom token
                try await Auth.auth().signIn(withCustomToken: token)
                loginError = nil
            } else {
                loginError = "No account found for this phrase"
            }
        } catch {
            loginAttempts += 1
            loginError = "Recovery failed. Check your phrase and try again."
        }

        isLoggingIn = false
    }

    // MARK: - PIN Verification (for returning users)

    @Published var verifyPin: String = ""
    @Published var verifyAttempts: Int = 0
    @Published var verifyError: String?

    func onVerifyPinDigit(_ digit: String) {
        verifyPin.append(digit)
        if verifyPin.count == 6 {
            checkVerifyPin()
        }
    }

    func onVerifyPinDelete() {
        if !verifyPin.isEmpty { verifyPin.removeLast() }
    }

    private func checkVerifyPin() {
        guard let uid = Auth.auth().currentUser?.uid else { return }
        let storedHash = UserDefaults.standard.string(forKey: "ironai_pin_\(uid)") ?? ""
        let enteredHash = PlayerIdentity.hashPin(verifyPin)

        if enteredHash == storedHash {
            verifyError = nil
            // PIN correct — proceed to app
        } else {
            verifyAttempts += 1
            verifyError = verifyAttempts >= 3 ? "Too many attempts" : "Incorrect PIN"
            verifyPin = ""
        }
    }

    // MARK: - Biometrics

    func requestBiometrics() {
        let context = LAContext()
        var error: NSError?
        guard context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error) else {
            return
        }

        context.evaluatePolicy(
            .deviceOwnerAuthenticationWithBiometrics,
            localizedReason: "Unlock IronCore"
        ) { success, _ in
            if success {
                Task { @MainActor in
                    if let uid = Auth.auth().currentUser?.uid {
                        try? await self.firestore.saveProfile(uid: uid, data: [
                            "biometricsEnabled": true
                        ])
                    }
                }
            }
        }
    }

    // MARK: - Copy Phrase

    func copyPhrase() {
        #if canImport(UIKit)
        UIPasteboard.general.string = recoveryPhrase
        #endif
    }

    var phraseWords: [String] {
        recoveryPhrase.components(separatedBy: " ")
    }

    // MARK: - Continue After Reveal

    func continueAfterReveal() {
        // At this point, the user has seen their phrase and confirmed.
        // AuthViewModel will detect the new user and transition to onboarding.
        // Optionally prompt biometrics.
        requestBiometrics()
    }
}
