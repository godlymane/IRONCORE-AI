import SwiftUI
import AuthenticationServices

/// Login screen — mirrors React LoginView.jsx
/// Supports: email/username, Google, Apple Sign-In
struct LoginView: View {
    @EnvironmentObject var authManager: AuthManager
    @State private var emailOrUsername = ""
    @State private var password = ""
    @State private var isSignUp = false
    @State private var displayName = ""
    @State private var isLoading = false
    @State private var errorMessage: String?

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            ScrollView {
                VStack(spacing: 32) {
                    Spacer(minLength: 60)

                    // Logo
                    VStack(spacing: 8) {
                        Image(systemName: "flame.fill")
                            .font(.system(size: 56))
                            .foregroundStyle(.red)
                        Text("IRONCORE")
                            .font(.system(size: 28, weight: .black))
                            .foregroundStyle(.white)
                            .tracking(4)
                        Text("Your Phone. Your Trainer.")
                            .font(.subheadline)
                            .foregroundStyle(.gray)
                    }

                    // Form
                    VStack(spacing: 16) {
                        if isSignUp {
                            TextField("Display Name", text: $displayName)
                                .textFieldStyle(IronTextFieldStyle())
                                .textContentType(.name)
                        }

                        TextField("Email or Username", text: $emailOrUsername)
                            .textFieldStyle(IronTextFieldStyle())
                            .textContentType(.emailAddress)
                            .autocapitalization(.none)

                        SecureField("Password", text: $password)
                            .textFieldStyle(IronTextFieldStyle())
                            .textContentType(isSignUp ? .newPassword : .password)

                        if let error = errorMessage {
                            Text(error)
                                .font(.caption)
                                .foregroundStyle(.red)
                        }

                        Button {
                            handleAuth()
                        } label: {
                            HStack {
                                if isLoading {
                                    ProgressView().tint(.white)
                                } else {
                                    Text(isSignUp ? "Create Account" : "Sign In")
                                        .font(.headline)
                                }
                            }
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(Color.red)
                            .foregroundStyle(.white)
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                        }
                        .disabled(isLoading)
                    }

                    // Divider
                    HStack {
                        Rectangle().fill(Color.gray.opacity(0.3)).frame(height: 1)
                        Text("OR").font(.caption).foregroundStyle(.gray)
                        Rectangle().fill(Color.gray.opacity(0.3)).frame(height: 1)
                    }

                    // Apple Sign-In
                    SignInWithAppleButton(.signIn) { request in
                        request.requestedScopes = [.fullName, .email]
                    } onCompletion: { result in
                        handleAppleSignIn(result)
                    }
                    .signInWithAppleButtonStyle(.white)
                    .frame(height: 50)
                    .clipShape(RoundedRectangle(cornerRadius: 12))

                    // Toggle sign up / sign in
                    Button {
                        isSignUp.toggle()
                        errorMessage = nil
                    } label: {
                        Text(isSignUp ? "Already have an account? Sign In" : "Don't have an account? Sign Up")
                            .font(.subheadline)
                            .foregroundStyle(.gray)
                    }

                    Spacer(minLength: 40)
                }
                .padding(.horizontal, 24)
            }
        }
    }

    // MARK: - Auth Handlers

    private func handleAuth() {
        isLoading = true
        errorMessage = nil

        Task {
            do {
                if isSignUp {
                    try await authManager.signUp(
                        emailOrUsername: emailOrUsername,
                        password: password,
                        displayName: displayName
                    )
                } else {
                    try await authManager.signIn(
                        emailOrUsername: emailOrUsername,
                        password: password
                    )
                }
            } catch {
                await MainActor.run {
                    errorMessage = error.localizedDescription
                }
            }
            await MainActor.run { isLoading = false }
        }
    }

    private func handleAppleSignIn(_ result: Result<ASAuthorization, Error>) {
        switch result {
        case .success(let auth):
            if let credential = auth.credential as? ASAuthorizationAppleIDCredential {
                Task {
                    do {
                        // Note: nonce handling would be added for production
                        try await authManager.signInWithApple(credential: credential, nonce: "")
                    } catch {
                        await MainActor.run { errorMessage = error.localizedDescription }
                    }
                }
            }
        case .failure(let error):
            errorMessage = error.localizedDescription
        }
    }
}

// MARK: - Custom TextField Style

struct IronTextFieldStyle: TextFieldStyle {
    func _body(configuration: TextField<_Label>) -> some View {
        configuration
            .padding()
            .background(Color.white.opacity(0.08))
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .foregroundStyle(.white)
    }
}
