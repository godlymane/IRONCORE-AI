import SwiftUI

/// Full AI Coach Chat — replaces the placeholder in AILabView.
/// Mirrors CoachView.jsx from React prototype.
/// Two modes: Chat Coach (Gemini-powered conversation) + Workout Generator.
struct CoachChatView: View {
    @StateObject private var vm = CoachViewModel()
    @EnvironmentObject var authVM: AuthViewModel
    @EnvironmentObject var premiumVM: PremiumViewModel

    private var uid: String { authVM.uid ?? "" }
    private var profile: UserProfile? { authVM.profile }

    var body: some View {
        VStack(spacing: 0) {
            modePicker
            if vm.mode == .chat {
                chatContent
            } else {
                generatorContent
            }
        }
        .onAppear {
            vm.initialize(profile: profile)
        }
    }

    // MARK: - Mode Picker

    private var modePicker: some View {
        HStack(spacing: 0) {
            ForEach(CoachViewModel.CoachMode.allCases, id: \.self) { mode in
                Button {
                    withAnimation(.easeInOut(duration: 0.2)) { vm.mode = mode }
                } label: {
                    Text(mode.rawValue)
                        .font(.system(size: 11, weight: .black))
                        .tracking(0.5)
                        .foregroundColor(vm.mode == mode ? .white : .gray)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 8)
                        .background(
                            Group {
                                if vm.mode == mode {
                                    RoundedRectangle(cornerRadius: 10)
                                        .fill(Color.ironRed.opacity(0.7))
                                }
                            }
                        )
                }
            }
        }
        .padding(3)
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(Color.white.opacity(0.04))
        )
        .padding(.horizontal, 16)
        .padding(.bottom, 8)
    }

    // MARK: - Chat Content

    private var chatContent: some View {
        VStack(spacing: 0) {
            // Messages
            ScrollViewReader { proxy in
                ScrollView(.vertical, showsIndicators: false) {
                    LazyVStack(spacing: 12) {
                        ForEach(vm.messages) { msg in
                            messageBubble(msg)
                                .id(msg.id)
                        }

                        if vm.isLoading {
                            typingIndicator
                        }
                    }
                    .padding(.horizontal, 16)
                    .padding(.top, 8)
                    .padding(.bottom, 16)
                }
                .onChange(of: vm.messages.count) { _ in
                    if let last = vm.messages.last {
                        withAnimation { proxy.scrollTo(last.id, anchor: .bottom) }
                    }
                }
            }

            // Quick prompts
            quickPrompts

            // Input bar
            chatInputBar
        }
    }

    private func messageBubble(_ msg: CoachViewModel.ChatMessage) -> some View {
        HStack {
            if msg.role == .user { Spacer(minLength: 60) }

            VStack(alignment: msg.role == .user ? .trailing : .leading, spacing: 4) {
                if msg.role == .ai {
                    HStack(spacing: 6) {
                        Image(systemName: "brain.head.profile")
                            .font(.system(size: 10))
                            .foregroundColor(.ironRedLight)
                        Text("IronCore Coach")
                            .font(.system(size: 10, weight: .bold))
                            .foregroundColor(.ironRedLight)
                    }
                }

                Text(msg.text)
                    .font(.system(size: 14))
                    .foregroundColor(.white)
                    .padding(12)
                    .background(
                        RoundedRectangle(cornerRadius: 16)
                            .fill(msg.role == .user
                                  ? Color.ironRed.opacity(0.3)
                                  : Color.white.opacity(0.06))
                    )
            }

            if msg.role == .ai { Spacer(minLength: 60) }
        }
    }

    private var typingIndicator: some View {
        HStack {
            HStack(spacing: 4) {
                ForEach(0..<3, id: \.self) { i in
                    Circle()
                        .fill(Color.ironRedLight)
                        .frame(width: 6, height: 6)
                        .opacity(0.6)
                }
            }
            .padding(12)
            .background(
                RoundedRectangle(cornerRadius: 16)
                    .fill(Color.white.opacity(0.06))
            )
            Spacer()
        }
    }

    private var quickPrompts: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                quickPromptChip("What should I eat today?")
                quickPromptChip("Rate my workout split")
                quickPromptChip("How much protein do I need?")
                quickPromptChip("Best exercises for chest?")
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 8)
        }
    }

    private func quickPromptChip(_ text: String) -> some View {
        Button {
            Task {
                await vm.sendQuickPrompt(
                    text,
                    profile: profile,
                    meals: [],
                    workouts: [],
                    isPremium: premiumVM.isPremium
                )
            }
        } label: {
            Text(text)
                .font(.system(size: 11, weight: .semibold))
                .foregroundColor(.ironRedLight)
                .padding(.horizontal, 12)
                .padding(.vertical, 8)
                .background(
                    Capsule()
                        .fill(Color.ironRed.opacity(0.1))
                        .overlay(Capsule().stroke(Color.ironRed.opacity(0.2), lineWidth: 1))
                )
        }
        .disabled(vm.isLoading)
    }

    private var chatInputBar: some View {
        HStack(spacing: 10) {
            TextField("Ask your coach...", text: $vm.input)
                .font(.system(size: 14))
                .foregroundColor(.white)
                .padding(12)
                .background(
                    RoundedRectangle(cornerRadius: 14)
                        .fill(Color.white.opacity(0.06))
                        .overlay(
                            RoundedRectangle(cornerRadius: 14)
                                .stroke(Color.white.opacity(0.1), lineWidth: 1)
                        )
                )
                .submitLabel(.send)
                .onSubmit { sendChat() }

            Button(action: sendChat) {
                Image(systemName: "arrow.up.circle.fill")
                    .font(.system(size: 32))
                    .foregroundColor(vm.input.trimmingCharacters(in: .whitespaces).isEmpty || vm.isLoading
                                     ? Color.gray.opacity(0.3)
                                     : Color.ironRedLight)
            }
            .disabled(vm.input.trimmingCharacters(in: .whitespaces).isEmpty || vm.isLoading)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
        .background(Color.black.opacity(0.8))
    }

    private func sendChat() {
        Task {
            await vm.sendMessage(
                profile: profile,
                meals: [],
                workouts: [],
                isPremium: premiumVM.isPremium
            )
        }
    }

    // MARK: - Generator Content

    private var generatorContent: some View {
        ScrollView(.vertical, showsIndicators: false) {
            VStack(spacing: 20) {
                // Equipment picker
                pickerSection(title: "EQUIPMENT", options: CoachViewModel.equipmentOptions.map { $0.1 }, selected: equipmentLabel) { label in
                    if let match = CoachViewModel.equipmentOptions.first(where: { $0.1 == label }) {
                        vm.genEquipment = match.0
                    }
                }

                // Duration picker
                pickerSection(title: "DURATION", options: CoachViewModel.durationOptions.map { "\($0) min" }, selected: "\(vm.genDuration) min") { label in
                    vm.genDuration = label.replacingOccurrences(of: " min", with: "")
                }

                // Focus picker
                VStack(alignment: .leading, spacing: 8) {
                    Text("FOCUS")
                        .font(.system(size: 10, weight: .black))
                        .foregroundColor(Color.white.opacity(0.4))
                        .tracking(2)

                    LazyVGrid(columns: [GridItem(.adaptive(minimum: 80), spacing: 8)], spacing: 8) {
                        ForEach(CoachViewModel.splits, id: \.self) { split in
                            Button {
                                vm.genFocus = split
                            } label: {
                                Text(split)
                                    .font(.system(size: 12, weight: .bold))
                                    .foregroundColor(vm.genFocus == split ? .white : .gray)
                                    .padding(.horizontal, 12)
                                    .padding(.vertical, 8)
                                    .frame(maxWidth: .infinity)
                                    .background(
                                        RoundedRectangle(cornerRadius: 10)
                                            .fill(vm.genFocus == split ? Color.ironRed.opacity(0.6) : Color.white.opacity(0.04))
                                    )
                            }
                        }
                    }

                    if vm.genFocus == "Custom" {
                        TextField("Custom focus...", text: $vm.customFocus)
                            .font(.system(size: 14))
                            .foregroundColor(.white)
                            .padding(12)
                            .background(
                                RoundedRectangle(cornerRadius: 12)
                                    .fill(Color.white.opacity(0.06))
                            )
                    }
                }

                // Generate button
                Button {
                    Task {
                        await vm.generateWorkout(
                            profile: profile,
                            workouts: [],
                            isPremium: premiumVM.isPremium
                        )
                    }
                } label: {
                    HStack(spacing: 8) {
                        if vm.isLoading {
                            ProgressView().tint(.white).scaleEffect(0.8)
                        } else {
                            Image(systemName: "sparkles")
                                .font(.system(size: 14))
                        }
                        Text(vm.isLoading ? "GENERATING..." : "GENERATE WORKOUT")
                            .font(.system(size: 14, weight: .black))
                    }
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 16)
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
                    .shadow(color: Color.ironRed.opacity(0.3), radius: 10)
                }
                .disabled(vm.isLoading)

                if let error = vm.errorMessage {
                    Text(error)
                        .font(.system(size: 12, weight: .medium))
                        .foregroundColor(.ironRedLight)
                }

                // Generated plan
                if let plan = vm.generatedPlan {
                    generatedPlanCard(plan)
                }
            }
            .padding(.horizontal, 16)
            .padding(.bottom, 100)
        }
    }

    private var equipmentLabel: String {
        CoachViewModel.equipmentOptions.first(where: { $0.0 == vm.genEquipment })?.1 ?? "Full Gym"
    }

    private func pickerSection(title: String, options: [String], selected: String, onSelect: @escaping (String) -> Void) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title)
                .font(.system(size: 10, weight: .black))
                .foregroundColor(Color.white.opacity(0.4))
                .tracking(2)

            HStack(spacing: 8) {
                ForEach(options, id: \.self) { option in
                    Button { onSelect(option) } label: {
                        Text(option)
                            .font(.system(size: 12, weight: .bold))
                            .foregroundColor(selected == option ? .white : .gray)
                            .padding(.horizontal, 12)
                            .padding(.vertical, 8)
                            .frame(maxWidth: .infinity)
                            .background(
                                RoundedRectangle(cornerRadius: 10)
                                    .fill(selected == option ? Color.ironRed.opacity(0.6) : Color.white.opacity(0.04))
                            )
                    }
                }
            }
        }
    }

    private func generatedPlanCard(_ plan: CoachViewModel.GeneratedWorkout) -> some View {
        VStack(spacing: 16) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text(plan.title)
                        .font(.system(size: 16, weight: .black))
                        .foregroundColor(.white)
                    Text("\(plan.exercises.count) exercises")
                        .font(.system(size: 12))
                        .foregroundColor(.gray)
                }
                Spacer()
                Image(systemName: "checkmark.circle.fill")
                    .font(.system(size: 24))
                    .foregroundColor(.green)
            }

            ForEach(Array(plan.exercises.enumerated()), id: \.offset) { idx, ex in
                HStack(spacing: 12) {
                    Text("\(idx + 1)")
                        .font(.system(size: 12, weight: .black, design: .monospaced))
                        .foregroundColor(.ironRedLight)
                        .frame(width: 24, height: 24)
                        .background(Circle().fill(Color.ironRed.opacity(0.2)))

                    VStack(alignment: .leading, spacing: 2) {
                        Text(ex.name)
                            .font(.system(size: 14, weight: .bold))
                            .foregroundColor(.white)
                        Text("\(ex.sets) sets x \(ex.reps) reps • \(ex.rest) rest")
                            .font(.system(size: 11))
                            .foregroundColor(.gray)
                    }

                    Spacer()
                }
                .padding(.vertical, 4)
            }

            // Start Mission button
            Button {
                Task { await vm.startMission(uid: uid) }
            } label: {
                HStack(spacing: 8) {
                    Image(systemName: vm.missionStarted ? "checkmark" : "play.fill")
                        .font(.system(size: 14))
                    Text(vm.missionStarted ? "MISSION STARTED" : "START MISSION")
                        .font(.system(size: 14, weight: .black))
                }
                .foregroundColor(.white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 14)
                .background(
                    RoundedRectangle(cornerRadius: 14)
                        .fill(vm.missionStarted
                              ? Color.green.opacity(0.6)
                              : LinearGradient(colors: [Color.ironRed, Color.ironRedDark], startPoint: .leading, endPoint: .trailing))
                )
            }
            .disabled(vm.missionStarted)

            if !vm.missionStarted {
                Button { vm.resetGenerator() } label: {
                    Text("Generate Another")
                        .font(.system(size: 12, weight: .bold))
                        .foregroundColor(.gray)
                }
            }
        }
        .padding(16)
        .modifier(GlassCard())
    }
}
