import SwiftUI
import AuthenticationServices

/// Login screen — matches LoginView.jsx
/// Features: Apple Sign-In, Google Sign-In, Email/Password
/// Dark theme with animated gradient orbs, glass feature cards
struct LoginView: View {
    @EnvironmentObject var authVM: AuthViewModel
    @State private var showEmailAuth = false
    @State private var email = ""
    @State private var password = ""
    @State private var isCreatingAccount = false

    var body: some View {
        ZStack {
            // Background
            Color.black.ignoresSafeArea()
            AnimatedBackground()

            ScrollView(showsIndicators: false) {
                VStack(spacing: 32) {
                    Spacer(minLength: 60)

                    // Logo
                    logoSection

                    // Title
                    titleSection

                    // Feature Cards
                    featureCards

                    // Auth Buttons
                    authButtons

                    // Version Badge
                    versionBadge

                    Spacer(minLength: 40)
                }
                .padding(.horizontal, 24)
            }
        }
    }

    // MARK: - Logo (matches React glass logo container)
    private var logoSection: some View {
        ZStack {
            // Glow
            Circle()
                .fill(
                    RadialGradient(
                        colors: [Color.ironRed.opacity(0.6), .clear],
                        center: .center,
                        startRadius: 0,
                        endRadius: 60
                    )
                )
                .frame(width: 120, height: 120)
                .blur(radius: 20)

            // Icon container
            RoundedRectangle(cornerRadius: 24)
                .fill(
                    LinearGradient(
                        colors: [Color.ironRed.opacity(0.9), Color.ironRedDark.opacity(0.9)],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
                .frame(width: 80, height: 80)
                .shadow(color: .ironRed.opacity(0.4), radius: 20, y: 10)
                .overlay(
                    Image(systemName: "dumbbell.fill")
                        .font(.system(size: 36))
                        .foregroundColor(.white)
                )
        }
    }

    // MARK: - Title
    private var titleSection: some View {
        VStack(spacing: 8) {
            Text("IRONCORE")
                .font(.system(size: 44, weight: .black))
                .italic()
                .foregroundStyle(
                    LinearGradient(
                        colors: [.white, Color(red: 0.78, green: 0.82, blue: 0.99)],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )

            Text("AI-Powered Fitness Evolution")
                .font(.system(size: 14, weight: .semibold))
                .foregroundStyle(
                    LinearGradient(
                        colors: [.ironRed, .ironRedLight, .ironRedExtra],
                        startPoint: .leading,
                        endPoint: .trailing
                    )
                )
        }
    }

    // MARK: - Feature Cards (matches React FeatureCard components)
    private var featureCards: some View {
        VStack(spacing: 12) {
            FeatureCard(
                icon: "bolt.fill",
                iconColor: .yellow,
                title: "Smart Tracking",
                description: "AI-powered nutrition & workout logging"
            )
            FeatureCard(
                icon: "target",
                iconColor: .orange,
                title: "Goal Precision",
                description: "Custom protocols for your body type"
            )
            FeatureCard(
                icon: "sparkles",
                iconColor: .ironRedLight,
                title: "AI Coach",
                description: "24/7 personalized guidance & plans"
            )
        }
        .padding(.vertical, 8)
    }

    // MARK: - Auth Buttons
    private var authButtons: some View {
        VStack(spacing: 12) {
            // Apple Sign-In (native, primary)
            SignInWithAppleButton(.signIn) { request in
                let hashedNonce = authVM.prepareAppleSignIn()
                request.requestedScopes = [.fullName, .email]
                request.nonce = hashedNonce
            } onCompletion: { result in
                Task { await authVM.handleAppleSignIn(result: result) }
            }
            .signInWithAppleButtonStyle(.white)
            .frame(height: 56)
            .cornerRadius(16)

            // Google Sign-In (matches React "Continue with Google")
            Button {
                Task { await authVM.signInWithGoogle() }
            } label: {
                HStack(spacing: 10) {
                    // Google "G" logo
                    ZStack {
                        Circle()
                            .fill(Color.white)
                            .frame(width: 24, height: 24)
                        Text("G")
                            .font(.system(size: 16, weight: .bold))
                            .foregroundStyle(
                                LinearGradient(
                                    colors: [
                                        Color(red: 0.26, green: 0.52, blue: 0.96), // Google blue
                                        Color(red: 0.86, green: 0.20, blue: 0.18), // Google red
                                        Color(red: 0.96, green: 0.73, blue: 0.16), // Google yellow
                                        Color(red: 0.20, green: 0.66, blue: 0.33)  // Google green
                                    ],
                                    startPoint: .topLeading,
                                    endPoint: .bottomTrailing
                                )
                            )
                    }
                    Text("Continue with Google")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundColor(.black)
                }
                .frame(maxWidth: .infinity)
                .frame(height: 56)
                .background(
                    RoundedRectangle(cornerRadius: 16)
                        .fill(Color.white)
                )
            }

            // Email/Password toggle
            Button {
                withAnimation { showEmailAuth.toggle() }
            } label: {
                HStack(spacing: 8) {
                    Image(systemName: "envelope.fill")
                        .font(.system(size: 16))
                    Text(showEmailAuth ? "Hide Email Sign-In" : "Continue with Email")
                        .font(.system(size: 14, weight: .bold))
                }
                .foregroundColor(.white)
                .frame(maxWidth: .infinity)
                .frame(height: 56)
                .background(
                    RoundedRectangle(cornerRadius: 16)
                        .fill(LinearGradient.glassGradient)
                )
                .overlay(
                    RoundedRectangle(cornerRadius: 16)
                        .stroke(Color.glassBorder, lineWidth: 1)
                )
            }

            // Email/Password Form
            if showEmailAuth {
                emailAuthForm
                    .transition(.opacity.combined(with: .move(edge: .top)))
            }

            // Error display
            if let error = authVM.error {
                Text(error)
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(.ironRedLight)
                    .padding(.horizontal, 16)
                    .padding(.vertical, 8)
                    .background(Color.ironRed.opacity(0.1))
                    .cornerRadius(8)
            }
        }
    }

    // MARK: - Email Auth Form
    private var emailAuthForm: some View {
        VStack(spacing: 12) {
            TextField("Email", text: $email)
                .textContentType(.emailAddress)
                .keyboardType(.emailAddress)
                .autocapitalization(.none)
                .padding(16)
                .background(RoundedRectangle(cornerRadius: 12).fill(Color.glassWhite))
                .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.glassBorder))
                .foregroundColor(.white)

            SecureField("Password", text: $password)
                .textContentType(.password)
                .padding(16)
                .background(RoundedRectangle(cornerRadius: 12).fill(Color.glassWhite))
                .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.glassBorder))
                .foregroundColor(.white)

            HStack(spacing: 12) {
                Button {
                    Task { await authVM.signInWithEmail(email: email, password: password) }
                } label: {
                    Text("Sign In")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .frame(height: 48)
                        .background(
                            RoundedRectangle(cornerRadius: 12)
                                .fill(LinearGradient.ironGradient)
                        )
                }

                Button {
                    Task { await authVM.createAccount(email: email, password: password) }
                } label: {
                    Text("Create Account")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .frame(height: 48)
                        .background(
                            RoundedRectangle(cornerRadius: 12)
                                .fill(LinearGradient.glassGradient)
                        )
                        .overlay(
                            RoundedRectangle(cornerRadius: 12)
                                .stroke(Color.glassBorder)
                        )
                }
            }

            if authVM.isSigningIn {
                ProgressView()
                    .tint(.ironRed)
            }
        }
        .padding(16)
        .glassCard()
    }

    // MARK: - Version Badge
    private var versionBadge: some View {
        HStack(spacing: 8) {
            Circle()
                .fill(Color.green)
                .frame(width: 8, height: 8)

            Text("V2.0 • CLOUD READY")
                .font(.system(size: 11, weight: .bold))
                .tracking(2)
                .foregroundColor(.textTertiary)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 8)
        .background(
            Capsule()
                .fill(LinearGradient.glassGradient)
        )
        .overlay(
            Capsule()
                .stroke(Color.glassBorder, lineWidth: 1)
        )
    }
}

// MARK: - Feature Card Component (matches React FeatureCard)
private struct FeatureCard: View {
    let icon: String
    let iconColor: Color
    let title: String
    let description: String

    var body: some View {
        HStack(spacing: 16) {
            // Icon container
            RoundedRectangle(cornerRadius: 12)
                .fill(LinearGradient.glassGradient)
                .frame(width: 44, height: 44)
                .overlay(
                    RoundedRectangle(cornerRadius: 12)
                        .stroke(Color.glassHighlight, lineWidth: 1)
                )
                .overlay(
                    Image(systemName: icon)
                        .font(.system(size: 18))
                        .foregroundColor(iconColor)
                )

            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.system(size: 14, weight: .bold))
                    .foregroundColor(.white)
                Text(description)
                    .font(.system(size: 12))
                    .foregroundColor(.textTertiary)
            }

            Spacer()
        }
        .padding(16)
        .glassCard()
    }
}

// MARK: - Animated Background (matches React gradient orbs)
struct AnimatedBackground: View {
    @State private var animate = false

    var body: some View {
        ZStack {
            // Top-left red orb
            Circle()
                .fill(
                    RadialGradient(
                        colors: [Color.ironRed.opacity(0.3), .clear],
                        center: .center,
                        startRadius: 0,
                        endRadius: 300
                    )
                )
                .frame(width: 600, height: 600)
                .offset(x: -150, y: -200)
                .opacity(animate ? 0.8 : 0.4)

            // Bottom-right dark red orb
            Circle()
                .fill(
                    RadialGradient(
                        colors: [Color.ironRedDark.opacity(0.25), .clear],
                        center: .center,
                        startRadius: 0,
                        endRadius: 300
                    )
                )
                .frame(width: 600, height: 600)
                .offset(x: 150, y: 300)
                .opacity(animate ? 0.6 : 0.3)

            // Grid overlay
            GridPattern()
                .opacity(0.03)
        }
        .ignoresSafeArea()
        .onAppear {
            withAnimation(.easeInOut(duration: 3).repeatForever(autoreverses: true)) {
                animate = true
            }
        }
    }
}

// Grid pattern overlay (matches React grid background)
private struct GridPattern: View {
    var body: some View {
        Canvas { context, size in
            let spacing: CGFloat = 50
            for x in stride(from: 0, through: size.width, by: spacing) {
                var path = Path()
                path.move(to: CGPoint(x: x, y: 0))
                path.addLine(to: CGPoint(x: x, y: size.height))
                context.stroke(path, with: .color(.white.opacity(0.1)), lineWidth: 1)
            }
            for y in stride(from: 0, through: size.height, by: spacing) {
                var path = Path()
                path.move(to: CGPoint(x: 0, y: y))
                path.addLine(to: CGPoint(x: size.width, y: y))
                context.stroke(path, with: .color(.white.opacity(0.1)), lineWidth: 1)
            }
        }
    }
}
