import Foundation
import Combine
import FirebaseAuth
import FirebaseFirestore
import AuthenticationServices

/// Manages Firebase Authentication — email, Google, Apple Sign-In
/// Mirrors the React app's auth functions in useFitnessData.js
final class AuthManager: ObservableObject {
    static let shared = AuthManager()

    @Published var currentUser: User?
    @Published var isLoading = true
    @Published var error: String?

    private var authListener: AuthStateDidChangeListenerHandle?
    private let db = Firestore.firestore()

    private init() {
        listenForAuthChanges()
    }

    deinit {
        if let listener = authListener {
            Auth.auth().removeStateDidChangeListener(listener)
        }
    }

    // MARK: - Auth State Listener

    private func listenForAuthChanges() {
        authListener = Auth.auth().addStateDidChangeListener { [weak self] _, user in
            guard let self else { return }
            DispatchQueue.main.async {
                self.currentUser = user
                self.isLoading = false

                if let user {
                    FirestoreManager.shared.startCoreListeners(uid: user.uid)
                } else {
                    FirestoreManager.shared.clearAllData()
                }
            }
        }
    }

    // MARK: - Email Auth (mirrors React signUpWithEmail / loginWithEmail)

    /// Sign up with email. Username gets @ironcore.app suffix if no @ present.
    func signUp(emailOrUsername: String, password: String, displayName: String) async throws {
        let email = formatEmail(emailOrUsername)
        let result = try await Auth.auth().createUser(withEmail: email, password: password)

        // Set display name
        let changeRequest = result.user.createProfileChangeRequest()
        changeRequest.displayName = displayName
        try await changeRequest.commitChanges()

        // Initialize user in Firestore
        try await initializeUser(
            uid: result.user.uid,
            username: displayName,
            avatarUrl: defaultAvatarURL(seed: displayName)
        )
    }

    /// Sign in with email
    func signIn(emailOrUsername: String, password: String) async throws {
        let email = formatEmail(emailOrUsername)
        try await Auth.auth().signIn(withEmail: email, password: password)
    }

    // MARK: - Apple Sign-In

    /// Handle Apple Sign-In credential
    func signInWithApple(credential: ASAuthorizationAppleIDCredential, nonce: String) async throws {
        guard let tokenData = credential.identityToken,
              let idToken = String(data: tokenData, encoding: .utf8) else {
            throw AuthError.invalidCredential
        }

        let oauthCredential = OAuthProvider.appleCredential(
            withIDToken: idToken,
            rawNonce: nonce,
            fullName: credential.fullName
        )
        let result = try await Auth.auth().signIn(with: oauthCredential)

        // Initialize if new user
        if result.additionalUserInfo?.isNewUser == true {
            let name = credential.fullName?.givenName ?? "Athlete"
            try await initializeUser(
                uid: result.user.uid,
                username: name,
                avatarUrl: defaultAvatarURL(seed: name)
            )
        }
    }

    // MARK: - Google Sign-In

    /// Handle Google Sign-In (requires GoogleSignIn SDK integration)
    func signInWithGoogle(idToken: String, accessToken: String) async throws {
        let credential = GoogleAuthProvider.credential(
            withIDToken: idToken,
            accessToken: accessToken
        )
        let result = try await Auth.auth().signIn(with: credential)

        // Initialize if new user
        if result.additionalUserInfo?.isNewUser == true {
            let name = result.user.displayName ?? "Athlete"
            try await initializeUser(
                uid: result.user.uid,
                username: name,
                avatarUrl: result.user.photoURL?.absoluteString ?? defaultAvatarURL(seed: name)
            )
        }
    }

    // MARK: - Sign Out

    func signOut() throws {
        try Auth.auth().signOut()
        FirestoreManager.shared.clearAllData()
    }

    // MARK: - Initialize User (mirrors React arenaService.initializeUser)

    private func initializeUser(uid: String, username: String, avatarUrl: String) async throws {
        let now = FieldValue.serverTimestamp()

        // Root user doc
        let userRef = db.collection("users").document(uid)
        try await userRef.setData([
            "username": username,
            "level": 1,
            "xp": 0,
            "workoutsCompleted": 0,
            "wins": 0,
            "losses": 0,
            "currentStreak": 1,
            "longestStreak": 1,
            "streakFreezeCount": 1,
            "league": "Iron Novice",
            "avatarUrl": avatarUrl,
            "isPremium": false,
            "lastLoginAt": now,
            "lastStreakUpdateAt": now,
            "createdAt": now,
            "updatedAt": now,
        ])

        // Profile doc
        let profileRef = db.collection("users").document(uid)
            .collection("data").document("profile")
        try await profileRef.setData([
            "userId": uid,
            "photoURL": avatarUrl,
            "schemaVersion": 3,
            "currentStreak": 0,
            "streakMultiplier": 1.0,
            "streakShields": 0,
            "xp": 0,
            "rewardDayIndex": 0,
            "doubleXPTokens": 0,
            "inventory": [] as [Any],
            "isPremium": false,
            "onboarded": false,
        ])

        // Leaderboard entry
        let leaderboardRef = db.collection("leaderboard").document(uid)
        try await leaderboardRef.setData([
            "userId": uid,
            "username": username,
            "xp": 0,
            "level": 1,
            "league": "Iron Novice",
            "avatarUrl": avatarUrl,
            "todayVolume": 0,
            "lastUpdated": now,
        ])
    }

    // MARK: - Helpers

    /// Convert username to email format (mirrors React formatEmail)
    private func formatEmail(_ input: String) -> String {
        if input.contains("@") { return input }
        return "\(input)@ironcore.app"
    }
}

enum AuthError: LocalizedError {
    case invalidCredential

    var errorDescription: String? {
        switch self {
        case .invalidCredential:
            return "Invalid authentication credential"
        }
    }
}
