import Foundation
import FirebaseAuth
import AuthenticationServices
import CryptoKit

/// Firebase Auth service — matches useFitnessData.js login/logout
/// Supports: Google Sign-In, Apple Sign-In, Email/Password
final class AuthService {
    static let shared = AuthService()
    private init() {}

    var currentUser: User? { Auth.auth().currentUser }

    // MARK: - Auth State Listener (matches onAuthStateChanged in React)

    func listenToAuthState(completion: @escaping (User?) -> Void) -> AuthStateDidChangeListenerHandle {
        return Auth.auth().addStateDidChangeListener { _, user in
            completion(user)
        }
    }

    // MARK: - Email/Password Auth

    func signInWithEmail(email: String, password: String) async throws -> User {
        let result = try await Auth.auth().signIn(withEmail: email, password: password)
        return result.user
    }

    func createAccountWithEmail(email: String, password: String) async throws -> User {
        let result = try await Auth.auth().createUser(withEmail: email, password: password)
        return result.user
    }

    // MARK: - Google Sign-In (via Firebase Auth REST + custom flow)
    // Full Google Sign-In requires GoogleSignIn SDK — configured in SPM

    // MARK: - Apple Sign-In

    func signInWithApple(credential: ASAuthorizationAppleIDCredential, nonce: String) async throws -> User {
        guard let appleIDToken = credential.identityToken,
              let idTokenString = String(data: appleIDToken, encoding: .utf8) else {
            throw AuthError.invalidCredential
        }

        let firebaseCredential = OAuthProvider.appleCredential(
            withIDToken: idTokenString,
            rawNonce: nonce,
            fullName: credential.fullName
        )

        let result = try await Auth.auth().signIn(with: firebaseCredential)
        return result.user
    }

    /// Generate a random nonce for Apple Sign-In (security requirement)
    func randomNonce(length: Int = 32) -> String {
        precondition(length > 0)
        var randomBytes = [UInt8](repeating: 0, count: length)
        let errorCode = SecRandomCopyBytes(kSecRandomDefault, randomBytes.count, &randomBytes)
        if errorCode != errSecSuccess {
            fatalError("Unable to generate nonce. SecRandomCopyBytes failed with OSStatus \(errorCode)")
        }
        let charset: [Character] = Array("0123456789ABCDEFGHIJKLMNOPQRSTUVXYZabcdefghijklmnopqrstuvwxyz-._")
        return String(randomBytes.map { byte in charset[Int(byte) % charset.count] })
    }

    /// SHA256 hash of the nonce (Apple Sign-In requirement)
    func sha256(_ input: String) -> String {
        let inputData = Data(input.utf8)
        let hashedData = SHA256.hash(data: inputData)
        return hashedData.compactMap { String(format: "%02x", $0) }.joined()
    }

    // MARK: - Logout (matches logout in useFitnessData.js)

    func signOut() throws {
        try Auth.auth().signOut()
    }
}

enum AuthError: LocalizedError {
    case invalidCredential
    case cancelled

    var errorDescription: String? {
        switch self {
        case .invalidCredential: return "Invalid authentication credential"
        case .cancelled: return "Sign-in was cancelled"
        }
    }
}
