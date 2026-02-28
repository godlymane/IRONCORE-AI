import SwiftUI
import AVFoundation

/// AI Lab — dual-mode hub: Chat Coach + Vision Lab (Form Correction + AI tools).
/// Mirrors AILabView.jsx from React prototype.
/// Tab 1 (Chat Coach): placeholder for Gemini-based AI chat (future).
/// Tab 2 (Vision Lab): Form Correction camera, + tool grid for future AI features.
struct AILabView: View {
    @EnvironmentObject var authVM: AuthViewModel
    @EnvironmentObject var premiumVM: PremiumViewModel

    @State private var labTab = 0 // 0 = coach, 1 = vision
    @State private var activeFeature: String? = nil
    @State private var cameraPermGranted = false

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            VStack(spacing: 0) {
                header
                tabSwitcher

                if labTab == 0 {
                    CoachChatView()
                } else {
                    visionLabContent
                }
            }
        }
        .onAppear {
            checkCameraPermission()
        }
    }

    // MARK: - Header

    private var header: some View {
        HStack(spacing: 12) {
            ZStack {
                RoundedRectangle(cornerRadius: 16)
                    .fill(
                        LinearGradient(
                            colors: [Color.ironRed, Color(hex: "#9333ea")],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
                    .frame(width: 44, height: 44)

                Image(systemName: "brain.head.profile")
                    .font(.system(size: 20, weight: .bold))
                    .foregroundColor(.white)
            }

            VStack(alignment: .leading, spacing: 2) {
                Text("AI COACH")
                    .font(.system(size: 20, weight: .black))
                    .foregroundColor(.white)
                    .tracking(-0.5)

                Text("Advanced Intelligence & Analysis")
                    .font(.system(size: 11))
                    .foregroundColor(Color.white.opacity(0.5))
            }

            Spacer()
        }
        .padding(.horizontal, 16)
        .padding(.top, 8)
        .padding(.bottom, 12)
    }

    // MARK: - Tab Switcher

    private var tabSwitcher: some View {
        HStack(spacing: 0) {
            tabButton("Chat Coach", tag: 0, color: Color.ironRed)
            tabButton("Vision Lab", tag: 1, color: Color(hex: "#9333ea"))
        }
        .padding(4)
        .background(
            RoundedRectangle(cornerRadius: 14)
                .fill(Color.white.opacity(0.04))
                .overlay(
                    RoundedRectangle(cornerRadius: 14)
                        .stroke(Color.white.opacity(0.06), lineWidth: 1)
                )
        )
        .padding(.horizontal, 16)
        .padding(.bottom, 12)
    }

    private func tabButton(_ title: String, tag: Int, color: Color) -> some View {
        Button {
            withAnimation(.easeInOut(duration: 0.2)) { labTab = tag }
        } label: {
            Text(title)
                .font(.system(size: 12, weight: .black))
                .tracking(0.5)
                .foregroundColor(labTab == tag ? .white : .gray)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 10)
                .background(
                    Group {
                        if labTab == tag {
                            RoundedRectangle(cornerRadius: 12)
                                .fill(color.opacity(0.8))
                                .shadow(color: color.opacity(0.3), radius: 8)
                        }
                    }
                )
        }
    }

    // MARK: - Chat Coach (Phase 2 placeholder — Gemini integration)

    private var coachPlaceholder: some View {
        ScrollView(.vertical, showsIndicators: false) {
            VStack(spacing: 20) {
                Spacer().frame(height: 40)

                Image(systemName: "bubble.left.and.bubble.right.fill")
                    .font(.system(size: 48))
                    .foregroundStyle(LinearGradient.ironGradient)

                Text("AI CHAT COACH")
                    .font(.system(size: 22, weight: .black))
                    .italic()
                    .foregroundColor(.white)

                Text("Personalized fitness coaching powered by AI.\nAsk anything about training, nutrition, or recovery.")
                    .font(.system(size: 14))
                    .foregroundColor(Color.white.opacity(0.5))
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 32)

                // Feature list
                VStack(spacing: 12) {
                    coachFeatureRow(icon: "dumbbell.fill", text: "Workout generation", color: .ironRedLight)
                    coachFeatureRow(icon: "fork.knife", text: "Nutrition guidance", color: .green)
                    coachFeatureRow(icon: "moon.fill", text: "Recovery advice", color: .cyan)
                    coachFeatureRow(icon: "chart.line.uptrend.xyaxis", text: "Progress analysis", color: .purple)
                }
                .padding(.horizontal, 32)

                Text("Coming Soon")
                    .font(.system(size: 12, weight: .bold))
                    .foregroundColor(.ironRedLight)
                    .padding(.horizontal, 16)
                    .padding(.vertical, 8)
                    .background(Capsule().fill(Color.ironRed.opacity(0.1)))

                Spacer()
            }
            .padding(.bottom, 100)
        }
    }

    private func coachFeatureRow(icon: String, text: String, color: Color) -> some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .font(.system(size: 14))
                .foregroundColor(color)
                .frame(width: 32, height: 32)
                .background(
                    Circle().fill(color.opacity(0.15))
                )

            Text(text)
                .font(.system(size: 14))
                .foregroundColor(.white)

            Spacer()

            Image(systemName: "chevron.right")
                .font(.system(size: 10, weight: .bold))
                .foregroundColor(Color.white.opacity(0.2))
        }
        .padding(12)
        .background(
            RoundedRectangle(cornerRadius: 14)
                .fill(Color.white.opacity(0.04))
                .overlay(
                    RoundedRectangle(cornerRadius: 14)
                        .stroke(Color.white.opacity(0.06), lineWidth: 1)
                )
        )
    }

    // MARK: - Vision Lab Content

    @ViewBuilder
    private var visionLabContent: some View {
        if let feature = activeFeature {
            // Active feature view
            VStack(spacing: 0) {
                // Back button
                HStack {
                    Button {
                        withAnimation { activeFeature = nil }
                    } label: {
                        HStack(spacing: 6) {
                            Image(systemName: "chevron.left")
                                .font(.system(size: 12, weight: .bold))
                            Text("Back to Tools")
                                .font(.system(size: 13, weight: .bold))
                        }
                        .foregroundColor(.gray)
                        .padding(.horizontal, 14)
                        .padding(.vertical, 8)
                        .background(
                            RoundedRectangle(cornerRadius: 10)
                                .fill(Color.white.opacity(0.06))
                        )
                    }
                    Spacer()
                }
                .padding(.horizontal, 16)
                .padding(.bottom, 8)

                // Render feature
                if feature == "form" {
                    if !cameraPermGranted {
                        CameraPermissionPrimingView(
                            onGranted: { cameraPermGranted = true },
                            onSkip: { activeFeature = nil }
                        )
                    } else {
                        ScrollView(.vertical, showsIndicators: false) {
                            FormCorrectionView(onComplete: { activeFeature = nil })
                                .padding(.bottom, 100)
                        }
                    }
                } else {
                    toolPlaceholder(feature)
                }
            }
        } else {
            // Tool grid
            ScrollView(.vertical, showsIndicators: false) {
                toolGrid
                    .padding(.bottom, 100)
            }
        }
    }

    // MARK: - Tool Grid (matches AILabView.jsx features array)

    private var toolGrid: some View {
        LazyVGrid(columns: [GridItem(.flexible(), spacing: 12), GridItem(.flexible(), spacing: 12)], spacing: 12) {
            ForEach(aiTools, id: \.id) { tool in
                toolCard(tool)
            }
        }
        .padding(.horizontal, 16)
    }

    private struct AITool: Identifiable {
        let id: String
        let name: String
        let icon: String
        let desc: String
        let color: Color
        let isPremium: Bool
    }

    private var aiTools: [AITool] {
        [
            AITool(id: "form", name: "Form Coach", icon: "camera.fill", desc: "AI pose detection", color: .ironRedLight, isPremium: true),
            AITool(id: "voice", name: "Voice", icon: "mic.fill", desc: "Hands-free logging", color: .green, isPremium: false),
            AITool(id: "analytics", name: "Predictions", icon: "brain", desc: "Predictive analytics", color: .purple, isPremium: true),
            AITool(id: "timer", name: "Smart Rest", icon: "timer", desc: "Adaptive timing", color: .orange, isPremium: false),
            AITool(id: "sleep", name: "Recovery", icon: "moon.fill", desc: "Sleep tracking", color: .cyan, isPremium: false),
            AITool(id: "gamify", name: "Achievements", icon: "trophy.fill", desc: "50+ badges", color: .yellow, isPremium: false),
            AITool(id: "nutrition", name: "Nutrition", icon: "drop.fill", desc: "Macro tracking", color: .green, isPremium: false),
            AITool(id: "stats", name: "Analytics", icon: "chart.line.uptrend.xyaxis", desc: "Progress graphs", color: .pink, isPremium: true),
        ]
    }

    private func toolCard(_ tool: AITool) -> some View {
        Button {
            if tool.isPremium && !premiumVM.isPremium {
                _ = premiumVM.requirePremium(tool.id == "form" ? "aiCoachCalls" : "unlimitedHistory")
            } else {
                withAnimation { activeFeature = tool.id }
            }
        } label: {
            VStack(alignment: .leading, spacing: 12) {
                ZStack {
                    // Premium lock badge
                    if tool.isPremium && !premiumVM.isPremium {
                        HStack {
                            Spacer()
                            VStack {
                                ZStack {
                                    Circle()
                                        .fill(Color(hex: "#eab308").opacity(0.2))
                                        .frame(width: 24, height: 24)
                                    Image(systemName: "lock.fill")
                                        .font(.system(size: 10))
                                        .foregroundColor(Color(hex: "#eab308"))
                                }
                                Spacer()
                            }
                        }
                    }

                    HStack {
                        VStack(alignment: .leading, spacing: 0) {
                            Image(systemName: tool.icon)
                                .font(.system(size: 24))
                                .foregroundColor(tool.color)
                                .padding(.bottom, 20)

                            Text(tool.name)
                                .font(.system(size: 16, weight: .bold))
                                .foregroundColor(.white)

                            Text(tool.isPremium && !premiumVM.isPremium ? "PRO" : tool.desc)
                                .font(.system(size: 11))
                                .foregroundColor(Color.white.opacity(0.5))
                        }
                        Spacer()
                    }
                }
            }
            .padding(16)
            .background(
                RoundedRectangle(cornerRadius: 20)
                    .fill(
                        LinearGradient(
                            colors: [tool.color.opacity(0.15), tool.color.opacity(0.05)],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
                    .overlay(
                        RoundedRectangle(cornerRadius: 20)
                            .stroke(tool.color.opacity(0.3), lineWidth: 1)
                    )
            )
        }
    }

    // MARK: - Tool Placeholder (for features not yet built)

    private func toolPlaceholder(_ featureId: String) -> some View {
        let name = aiTools.first(where: { $0.id == featureId })?.name ?? featureId

        return VStack(spacing: 16) {
            Spacer()
            Image(systemName: "gearshape.fill")
                .font(.system(size: 40))
                .foregroundColor(.gray)
            Text(name.uppercased())
                .font(.system(size: 18, weight: .black))
                .foregroundColor(.white)
            Text("Coming Soon")
                .font(.system(size: 13))
                .foregroundColor(.gray)
            Spacer()
        }
    }

    // MARK: - Camera Permission Check

    private func checkCameraPermission() {
        if AVCaptureDevice.authorizationStatus(for: .video) == .authorized {
            cameraPermGranted = true
        }
    }
}

// MARK: - Camera Permission Priming Screen

/// Matches CameraPermissionPriming from AILabView.jsx — reduces denial rate.
struct CameraPermissionPrimingView: View {
    let onGranted: () -> Void
    let onSkip: () -> Void

    @State private var checking = false
    @State private var denied = false

    var body: some View {
        VStack(spacing: 24) {
            Spacer()

            // Icon
            ZStack {
                Circle()
                    .fill(Color.ironRed.opacity(0.15))
                    .frame(width: 80, height: 80)
                    .overlay(
                        Circle().stroke(Color.ironRed.opacity(0.3), lineWidth: 1)
                    )
                Image(systemName: "camera.fill")
                    .font(.system(size: 36))
                    .foregroundColor(.ironRedLight)
            }

            // Title & body
            VStack(spacing: 8) {
                Text("THE AI NEEDS TO SEE YOU TRAIN")
                    .font(.system(size: 18, weight: .black))
                    .foregroundColor(.white)

                Text("IronCore uses your phone camera to watch your form and correct it in real-time.")
                    .font(.system(size: 13))
                    .foregroundColor(.gray)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 20)
            }

            // Privacy assurances
            VStack(spacing: 8) {
                privacyRow(icon: "eye.slash.fill", text: "No video is recorded")
                privacyRow(icon: "checkmark.shield.fill", text: "No data leaves your phone")
            }
            .padding(.horizontal, 40)

            if denied {
                VStack(spacing: 12) {
                    Text("Camera access needed for form correction. Enable in Settings.")
                        .font(.system(size: 12, weight: .medium))
                        .foregroundColor(.ironRedLight)
                        .multilineTextAlignment(.center)
                        .padding(14)
                        .background(
                            RoundedRectangle(cornerRadius: 14)
                                .fill(Color.ironRedLight.opacity(0.1))
                                .overlay(
                                    RoundedRectangle(cornerRadius: 14)
                                        .stroke(Color.ironRedLight.opacity(0.3), lineWidth: 1)
                                )
                        )

                    Button {
                        if let url = URL(string: UIApplication.openSettingsURLString) {
                            UIApplication.shared.open(url)
                        }
                    } label: {
                        HStack(spacing: 6) {
                            Image(systemName: "gearshape.fill")
                                .font(.system(size: 12))
                            Text("Open Settings")
                                .font(.system(size: 13, weight: .bold))
                        }
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 14)
                        .background(
                            RoundedRectangle(cornerRadius: 14)
                                .fill(Color.white.opacity(0.08))
                                .overlay(
                                    RoundedRectangle(cornerRadius: 14)
                                        .stroke(Color.white.opacity(0.1), lineWidth: 1)
                                )
                        )
                    }
                }
                .padding(.horizontal, 40)
            } else {
                VStack(spacing: 12) {
                    Button {
                        requestCamera()
                    } label: {
                        HStack(spacing: 8) {
                            if checking {
                                ProgressView()
                                    .tint(.white)
                                    .scaleEffect(0.8)
                            } else {
                                Image(systemName: "camera.fill")
                                    .font(.system(size: 14))
                            }
                            Text(checking ? "Requesting..." : "ENABLE CAMERA")
                                .font(.system(size: 14, weight: .black))
                        }
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 14)
                        .background(
                            RoundedRectangle(cornerRadius: 14)
                                .fill(
                                    LinearGradient(
                                        colors: [Color.ironRed, Color.ironRedDark],
                                        startPoint: .topLeading,
                                        endPoint: .bottomTrailing
                                    )
                                )
                        )
                    }
                    .disabled(checking)
                    .padding(.horizontal, 40)

                    Button { onSkip() } label: {
                        Text("Skip for now")
                            .font(.system(size: 12))
                            .foregroundColor(.gray)
                    }
                }
            }

            Spacer()
        }
    }

    private func privacyRow(icon: String, text: String) -> some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .font(.system(size: 14))
                .foregroundColor(.green)

            Text(text)
                .font(.system(size: 12))
                .foregroundColor(Color.white.opacity(0.7))

            Spacer()
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 10)
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(Color.white.opacity(0.04))
                .overlay(
                    RoundedRectangle(cornerRadius: 12)
                        .stroke(Color.white.opacity(0.08), lineWidth: 1)
                )
        )
    }

    private func requestCamera() {
        checking = true
        AVCaptureDevice.requestAccess(for: .video) { granted in
            DispatchQueue.main.async {
                checking = false
                if granted {
                    onGranted()
                } else {
                    denied = true
                }
            }
        }
    }
}
