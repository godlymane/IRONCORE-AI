import SwiftUI
import FirebaseAuth

/// Player Card — multi-step identity creation + card reveal.
/// Mirrors PlayerCardView.jsx from React prototype.
/// Flow: landing → username → pin → creating → reveal
struct PlayerCardView: View {
    @StateObject private var vm = PlayerCardViewModel()
    @EnvironmentObject var authVM: AuthViewModel
    var onDismiss: (() -> Void)?

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            switch vm.step {
            case .landing:
                landingScreen
            case .username:
                usernameScreen
            case .pin:
                pinSetupScreen
            case .creating:
                creatingScreen
            case .reveal:
                cardRevealScreen
            case .login:
                loginScreen
            case .pinVerify:
                pinVerifyScreen
            }
        }
        .animation(.easeInOut(duration: 0.3), value: vm.step)
    }

    // MARK: - Landing Screen

    private var landingScreen: some View {
        VStack(spacing: 0) {
            // Back button (when embedded in LoginView)
            if onDismiss != nil {
                HStack {
                    Button { onDismiss?() } label: {
                        HStack(spacing: 6) {
                            Image(systemName: "chevron.left")
                                .font(.system(size: 14, weight: .semibold))
                            Text("Back")
                                .font(.system(size: 14, weight: .medium))
                        }
                        .foregroundColor(.white.opacity(0.7))
                    }
                    Spacer()
                }
                .padding(.top, 8)
            }

            Spacer()

            // Logo
            ZStack {
                Circle()
                    .fill(Color.ironRed.opacity(0.15))
                    .frame(width: 100, height: 100)
                Image(systemName: "shield.checkered")
                    .font(.system(size: 44))
                    .foregroundColor(.ironRedLight)
            }

            Spacer().frame(height: 32)

            Text("IRONCORE")
                .font(.system(size: 32, weight: .black))
                .foregroundColor(.white)
                .tracking(6)

            Text("Your Phone. Your Trainer.")
                .font(.system(size: 14))
                .foregroundColor(.gray)
                .padding(.top, 4)

            Spacer().frame(height: 48)

            // Create Account
            Button { vm.step = .username } label: {
                HStack(spacing: 10) {
                    Image(systemName: "plus.circle.fill")
                        .font(.system(size: 18))
                    Text("CREATE ACCOUNT")
                        .font(.system(size: 16, weight: .black))
                }
                .foregroundColor(.white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 18)
                .background(
                    RoundedRectangle(cornerRadius: 16)
                        .fill(
                            LinearGradient(
                                colors: [Color.ironRed, Color.ironRedDark],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )
                )
                .shadow(color: Color.ironRed.opacity(0.4), radius: 16, y: 8)
            }

            Spacer().frame(height: 14)

            // Log In
            Button { vm.step = .login } label: {
                HStack(spacing: 10) {
                    Image(systemName: "key.fill")
                        .font(.system(size: 16))
                    Text("LOG IN")
                        .font(.system(size: 16, weight: .black))
                }
                .foregroundColor(.white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 18)
                .background(
                    RoundedRectangle(cornerRadius: 16)
                        .fill(Color.white.opacity(0.06))
                        .overlay(
                            RoundedRectangle(cornerRadius: 16)
                                .stroke(Color.white.opacity(0.1), lineWidth: 1)
                        )
                )
            }

            Spacer()

            // Footer
            Text("No email required. Your identity is your phrase.")
                .font(.system(size: 11))
                .foregroundColor(.gray.opacity(0.5))
                .padding(.bottom, 20)
        }
        .padding(.horizontal, 24)
    }

    // MARK: - Username Screen

    private var usernameScreen: some View {
        VStack(spacing: 0) {
            // Back button
            HStack {
                Button { vm.step = .landing } label: {
                    Image(systemName: "chevron.left")
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundColor(.white)
                        .frame(width: 40, height: 40)
                }
                Spacer()
            }
            .padding(.top, 8)

            Spacer().frame(height: 32)

            Text("CHOOSE YOUR NAME")
                .font(.system(size: 20, weight: .black))
                .foregroundColor(.white)
                .tracking(2)

            Text("This is how other players will see you")
                .font(.system(size: 13))
                .foregroundColor(.gray)
                .padding(.top, 6)

            Spacer().frame(height: 40)

            // Username input
            HStack(spacing: 0) {
                Text("@")
                    .font(.system(size: 20, weight: .bold))
                    .foregroundColor(.ironRedLight)
                    .padding(.leading, 16)

                TextField("username", text: Binding(
                    get: { vm.username },
                    set: { vm.onUsernameChanged($0) }
                ))
                .font(.system(size: 18, weight: .medium))
                .foregroundColor(.white)
                .autocapitalization(.none)
                .disableAutocorrection(true)
                .padding(.horizontal, 8)
                .padding(.vertical, 16)

                // Status indicator
                Group {
                    if vm.isCheckingUsername {
                        ProgressView()
                            .tint(.gray)
                            .scaleEffect(0.8)
                    } else if vm.usernameAvailable == true {
                        Image(systemName: "checkmark.circle.fill")
                            .foregroundColor(.green)
                    } else if vm.usernameError != nil {
                        Image(systemName: "xmark.circle.fill")
                            .foregroundColor(.ironRedLight)
                    }
                }
                .padding(.trailing, 16)
            }
            .background(
                RoundedRectangle(cornerRadius: 16)
                    .fill(Color.white.opacity(0.05))
                    .overlay(
                        RoundedRectangle(cornerRadius: 16)
                            .stroke(
                                vm.usernameError != nil ? Color.ironRedLight.opacity(0.5) :
                                    vm.usernameAvailable == true ? Color.green.opacity(0.5) :
                                    Color.white.opacity(0.1),
                                lineWidth: 1
                            )
                    )
            )

            // Error / validation
            if let error = vm.usernameError {
                Text(error)
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(.ironRedLight)
                    .padding(.top, 8)
            }

            // Rules
            VStack(alignment: .leading, spacing: 4) {
                ruleRow("3-20 characters", met: vm.username.count >= 3 && vm.username.count <= 20)
                ruleRow("Letters, numbers, underscores", met: vm.username.range(of: "^[a-zA-Z][a-zA-Z0-9_]*$", options: .regularExpression) != nil)
                ruleRow("Starts with a letter", met: vm.username.first?.isLetter == true)
            }
            .padding(.top, 16)

            Spacer()

            // Continue button
            Button { vm.submitUsername() } label: {
                Text("CONTINUE")
                    .font(.system(size: 16, weight: .black))
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 18)
                    .background(
                        RoundedRectangle(cornerRadius: 16)
                            .fill(
                                vm.usernameAvailable == true
                                    ? LinearGradient(colors: [Color.ironRed, Color.ironRedDark], startPoint: .leading, endPoint: .trailing)
                                    : LinearGradient(colors: [Color.gray.opacity(0.3), Color.gray.opacity(0.2)], startPoint: .leading, endPoint: .trailing)
                            )
                    )
            }
            .disabled(vm.usernameAvailable != true)
            .padding(.bottom, 20)
        }
        .padding(.horizontal, 24)
    }

    private func ruleRow(_ text: String, met: Bool) -> some View {
        HStack(spacing: 8) {
            Image(systemName: met ? "checkmark.circle.fill" : "circle")
                .font(.system(size: 12))
                .foregroundColor(met ? .green : .gray.opacity(0.4))
            Text(text)
                .font(.system(size: 12))
                .foregroundColor(met ? .white.opacity(0.6) : .gray.opacity(0.4))
        }
    }

    // MARK: - PIN Setup Screen

    private var pinSetupScreen: some View {
        VStack(spacing: 0) {
            // Back button
            HStack {
                Button {
                    vm.step = .username
                    vm.pin = ""
                    vm.confirmPin = ""
                    vm.pinStep = .enter
                    vm.pinError = nil
                } label: {
                    Image(systemName: "chevron.left")
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundColor(.white)
                        .frame(width: 40, height: 40)
                }
                Spacer()
            }
            .padding(.top, 8)

            Spacer().frame(height: 24)

            PinEntryView(
                title: vm.pinTitle,
                subtitle: vm.pinStep == .enter
                    ? "6-digit PIN to secure your account"
                    : "Enter the same PIN again",
                pinCount: vm.currentPinCount,
                error: vm.pinError,
                onDigit: { vm.onPinDigit($0) },
                onDelete: { vm.onPinDelete() }
            )

            Spacer()
        }
        .padding(.horizontal, 24)
    }

    // MARK: - Creating Screen

    private var creatingScreen: some View {
        VStack(spacing: 24) {
            Spacer()

            ZStack {
                Circle()
                    .fill(Color.ironRed.opacity(0.15))
                    .frame(width: 80, height: 80)
                ProgressView()
                    .tint(.ironRedLight)
                    .scaleEffect(1.5)
            }

            Text("FORGING YOUR IDENTITY")
                .font(.system(size: 18, weight: .black))
                .foregroundColor(.white)
                .tracking(2)

            Text("Creating account, generating keys...")
                .font(.system(size: 13))
                .foregroundColor(.gray)

            if let error = vm.creationError {
                Text(error)
                    .font(.system(size: 13, weight: .medium))
                    .foregroundColor(.ironRedLight)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 32)
            }

            Spacer()
        }
    }

    // MARK: - Card Reveal Screen

    private var cardRevealScreen: some View {
        ScrollView(.vertical, showsIndicators: false) {
            VStack(spacing: 24) {
                // Player Card
                VStack(spacing: 16) {
                    // Header
                    HStack {
                        Image(systemName: "shield.checkered")
                            .font(.system(size: 14))
                            .foregroundColor(.ironRedLight)
                        Text("IRONCORE PLAYER CARD")
                            .font(.system(size: 10, weight: .black))
                            .foregroundColor(.ironRedLight)
                            .tracking(2)
                        Spacer()
                    }

                    // Username
                    HStack {
                        VStack(alignment: .leading, spacing: 4) {
                            Text("@\(vm.username)")
                                .font(.system(size: 24, weight: .black))
                                .foregroundColor(.white)
                            Text("Iron League")
                                .font(.system(size: 12, weight: .bold))
                                .foregroundColor(.gray)
                        }
                        Spacer()

                        // Avatar
                        ZStack {
                            Circle()
                                .fill(Color.ironRed.opacity(0.2))
                                .frame(width: 56, height: 56)
                            Text(String(vm.username.prefix(1)).uppercased())
                                .font(.system(size: 24, weight: .black))
                                .foregroundColor(.ironRedLight)
                        }
                    }

                    Divider().background(Color.white.opacity(0.1))

                    // Stats row
                    HStack {
                        statCell(label: "XP", value: "0")
                        Spacer()
                        statCell(label: "LEAGUE", value: "IRON")
                        Spacer()
                        statCell(label: "RANK", value: "--")
                    }
                }
                .padding(20)
                .modifier(GlassCard())

                // Recovery Phrase
                VStack(spacing: 14) {
                    HStack {
                        Image(systemName: "key.fill")
                            .font(.system(size: 14))
                            .foregroundColor(Color(hex: "#eab308"))
                        Text("RECOVERY PHRASE")
                            .font(.system(size: 11, weight: .black))
                            .foregroundColor(Color(hex: "#eab308"))
                            .tracking(2)
                        Spacer()
                    }

                    Text("Write this down and keep it safe. This is the ONLY way to recover your account.")
                        .font(.system(size: 12))
                        .foregroundColor(.gray)
                        .fixedSize(horizontal: false, vertical: true)

                    // 12-word grid (4x3)
                    LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 8), count: 4), spacing: 8) {
                        ForEach(Array(vm.phraseWords.enumerated()), id: \.offset) { index, word in
                            HStack(spacing: 4) {
                                Text("\(index + 1)")
                                    .font(.system(size: 9, weight: .bold, design: .monospaced))
                                    .foregroundColor(.gray)
                                Text(word)
                                    .font(.system(size: 12, weight: .bold, design: .monospaced))
                                    .foregroundColor(.white)
                            }
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 8)
                            .background(
                                RoundedRectangle(cornerRadius: 8)
                                    .fill(Color.white.opacity(0.04))
                                    .overlay(
                                        RoundedRectangle(cornerRadius: 8)
                                            .stroke(Color.white.opacity(0.08), lineWidth: 1)
                                    )
                            )
                        }
                    }

                    // Action buttons
                    HStack(spacing: 12) {
                        Button {
                            vm.copyPhrase()
                        } label: {
                            HStack(spacing: 6) {
                                Image(systemName: "doc.on.doc")
                                    .font(.system(size: 12))
                                Text("Copy")
                                    .font(.system(size: 13, weight: .bold))
                            }
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 12)
                            .background(
                                RoundedRectangle(cornerRadius: 12)
                                    .fill(Color.white.opacity(0.06))
                                    .overlay(
                                        RoundedRectangle(cornerRadius: 12)
                                            .stroke(Color.white.opacity(0.1), lineWidth: 1)
                                    )
                            )
                        }
                    }
                }
                .padding(16)
                .background(
                    RoundedRectangle(cornerRadius: 20)
                        .fill(Color(hex: "#eab308").opacity(0.04))
                        .overlay(
                            RoundedRectangle(cornerRadius: 20)
                                .stroke(Color(hex: "#eab308").opacity(0.15), lineWidth: 1)
                        )
                )

                // Confirmation checkbox
                Button {
                    vm.phraseConfirmed.toggle()
                } label: {
                    HStack(spacing: 12) {
                        Image(systemName: vm.phraseConfirmed ? "checkmark.square.fill" : "square")
                            .font(.system(size: 20))
                            .foregroundColor(vm.phraseConfirmed ? .green : .gray)

                        Text("I have saved my recovery phrase")
                            .font(.system(size: 14, weight: .medium))
                            .foregroundColor(.white)

                        Spacer()
                    }
                }

                // Continue button
                Button {
                    vm.continueAfterReveal()
                } label: {
                    Text("CONTINUE TO IRONCORE")
                        .font(.system(size: 16, weight: .black))
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 18)
                        .background(
                            RoundedRectangle(cornerRadius: 16)
                                .fill(
                                    vm.phraseConfirmed
                                        ? LinearGradient(colors: [Color.ironRed, Color.ironRedDark], startPoint: .leading, endPoint: .trailing)
                                        : LinearGradient(colors: [Color.gray.opacity(0.3), Color.gray.opacity(0.2)], startPoint: .leading, endPoint: .trailing)
                                )
                        )
                }
                .disabled(!vm.phraseConfirmed)
                .padding(.bottom, 20)
            }
            .padding(.horizontal, 24)
            .padding(.top, 16)
        }
    }

    private func statCell(label: String, value: String) -> some View {
        VStack(spacing: 4) {
            Text(value)
                .font(.system(size: 18, weight: .black, design: .monospaced))
                .foregroundColor(.white)
            Text(label)
                .font(.system(size: 9, weight: .bold))
                .foregroundColor(.gray)
                .tracking(1)
        }
    }

    // MARK: - Login Screen (Recovery Phrase)

    private var loginScreen: some View {
        VStack(spacing: 0) {
            // Back button
            HStack {
                Button { vm.step = .landing } label: {
                    Image(systemName: "chevron.left")
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundColor(.white)
                        .frame(width: 40, height: 40)
                }
                Spacer()
            }
            .padding(.top, 8)

            Spacer().frame(height: 32)

            Image(systemName: "key.fill")
                .font(.system(size: 36))
                .foregroundColor(.ironRedLight)

            Spacer().frame(height: 16)

            Text("RECOVERY LOGIN")
                .font(.system(size: 20, weight: .black))
                .foregroundColor(.white)
                .tracking(2)

            Text("Enter your 12-word recovery phrase")
                .font(.system(size: 13))
                .foregroundColor(.gray)
                .padding(.top, 6)

            Spacer().frame(height: 32)

            // Phrase input
            TextEditor(text: $vm.loginPhrase)
                .font(.system(size: 16, weight: .medium, design: .monospaced))
                .foregroundColor(.white)
                .scrollContentBackground(.hidden)
                .frame(height: 120)
                .padding(16)
                .background(
                    RoundedRectangle(cornerRadius: 16)
                        .fill(Color.white.opacity(0.05))
                        .overlay(
                            RoundedRectangle(cornerRadius: 16)
                                .stroke(Color.white.opacity(0.1), lineWidth: 1)
                        )
                )
                .autocapitalization(.none)
                .disableAutocorrection(true)

            if let error = vm.loginError {
                Text(error)
                    .font(.system(size: 13, weight: .medium))
                    .foregroundColor(.ironRedLight)
                    .padding(.top, 8)
            }

            Spacer()

            // Login button
            Button {
                Task { await vm.loginWithPhrase() }
            } label: {
                HStack(spacing: 8) {
                    if vm.isLoggingIn {
                        ProgressView().tint(.white).scaleEffect(0.8)
                    }
                    Text(vm.isLoggingIn ? "RECOVERING..." : "RECOVER ACCOUNT")
                        .font(.system(size: 16, weight: .black))
                }
                .foregroundColor(.white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 18)
                .background(
                    RoundedRectangle(cornerRadius: 16)
                        .fill(
                            LinearGradient(
                                colors: [Color.ironRed, Color.ironRedDark],
                                startPoint: .leading,
                                endPoint: .trailing
                            )
                        )
                )
            }
            .disabled(vm.isLoggingIn)
            .padding(.bottom, 20)
        }
        .padding(.horizontal, 24)
    }

    // MARK: - PIN Verify Screen (Returning Users)

    private var pinVerifyScreen: some View {
        VStack(spacing: 0) {
            Spacer().frame(height: 60)

            PinEntryView(
                title: "ENTER YOUR PIN",
                subtitle: "Unlock IronCore",
                pinCount: vm.verifyPin.count,
                error: vm.verifyError,
                onDigit: { vm.onVerifyPinDigit($0) },
                onDelete: { vm.onVerifyPinDelete() }
            )

            if vm.verifyAttempts >= 3 {
                Spacer().frame(height: 20)

                Button {
                    vm.step = .login
                } label: {
                    HStack(spacing: 8) {
                        Image(systemName: "key.fill")
                            .font(.system(size: 14))
                        Text("Use Recovery Phrase")
                            .font(.system(size: 14, weight: .bold))
                    }
                    .foregroundColor(.ironRedLight)
                }
            }

            Spacer()
        }
        .padding(.horizontal, 24)
    }
}
