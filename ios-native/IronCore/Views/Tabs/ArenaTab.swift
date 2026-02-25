import SwiftUI

/// Arena tab — mirrors React ArenaView.jsx
/// Shows: leaderboard, battles, community boss, global chat
struct ArenaTab: View {
    @EnvironmentObject var firestoreManager: FirestoreManager
    @State private var selectedSection: ArenaSection = .leaderboard

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Section picker
                Picker("Section", selection: $selectedSection) {
                    ForEach(ArenaSection.allCases, id: \.self) { section in
                        Text(section.rawValue).tag(section)
                    }
                }
                .pickerStyle(.segmented)
                .padding()

                // Content
                ScrollView {
                    switch selectedSection {
                    case .leaderboard:
                        LeaderboardView(entries: firestoreManager.leaderboard)
                    case .battles:
                        BattlesView(battles: firestoreManager.battles)
                    case .boss:
                        BossView(boss: firestoreManager.communityBoss)
                    case .chat:
                        GlobalChatView(messages: firestoreManager.chat)
                    }
                }
            }
            .background(Color.black)
            .navigationTitle("Arena")
            .navigationBarTitleDisplayMode(.inline)
        }
    }
}

enum ArenaSection: String, CaseIterable {
    case leaderboard = "Ranks"
    case battles = "Battles"
    case boss = "Boss"
    case chat = "Chat"
}

// MARK: - Leaderboard

struct LeaderboardView: View {
    let entries: [LeaderboardEntry]

    var body: some View {
        LazyVStack(spacing: 8) {
            ForEach(Array(entries.enumerated()), id: \.element.id) { index, entry in
                HStack(spacing: 12) {
                    Text("#\(index + 1)")
                        .font(.caption.bold().monospaced())
                        .foregroundStyle(index < 3 ? .yellow : .gray)
                        .frame(width: 36)

                    AsyncImage(url: URL(string: entry.avatarUrl)) { image in
                        image.resizable().scaledToFill()
                    } placeholder: {
                        Circle().fill(Color.gray.opacity(0.3))
                    }
                    .frame(width: 36, height: 36)
                    .clipShape(Circle())

                    VStack(alignment: .leading) {
                        Text(entry.username)
                            .font(.subheadline.bold())
                            .foregroundStyle(.white)
                        Text(entry.league)
                            .font(.caption)
                            .foregroundStyle(.red)
                    }

                    Spacer()

                    Text("\(entry.xp) XP")
                        .font(.caption.bold().monospaced())
                        .foregroundStyle(.white)
                }
                .padding(.horizontal)
                .padding(.vertical, 8)
            }
        }
        .padding(.vertical)
    }
}

// MARK: - Battles

struct BattlesView: View {
    let battles: [Battle]

    var body: some View {
        if battles.isEmpty {
            VStack(spacing: 12) {
                Image(systemName: "person.2.fill")
                    .font(.system(size: 40))
                    .foregroundStyle(.gray)
                Text("No battles yet")
                    .foregroundStyle(.gray)
            }
            .padding(.top, 60)
        } else {
            LazyVStack(spacing: 8) {
                ForEach(battles) { battle in
                    HStack {
                        Text(battle.challenger.username)
                            .foregroundStyle(.white)
                        Text("vs")
                            .foregroundStyle(.gray)
                        Text(battle.opponent.username)
                            .foregroundStyle(.white)
                        Spacer()
                        Text(battle.status)
                            .font(.caption)
                            .foregroundStyle(battle.status == "completed" ? .green : .orange)
                    }
                    .padding()
                    .background(Color.white.opacity(0.05))
                    .clipShape(RoundedRectangle(cornerRadius: 8))
                }
            }
            .padding()
        }
    }
}

// MARK: - Boss

struct BossView: View {
    let boss: CommunityBoss?

    var body: some View {
        if let boss {
            VStack(spacing: 16) {
                Text(boss.name)
                    .font(.title2.bold())
                    .foregroundStyle(.red)

                // HP bar
                let hpPercent = Double(boss.currentHP) / Double(max(boss.totalHP, 1))
                VStack(spacing: 4) {
                    GeometryReader { geometry in
                        ZStack(alignment: .leading) {
                            RoundedRectangle(cornerRadius: 6)
                                .fill(Color.gray.opacity(0.3))
                            RoundedRectangle(cornerRadius: 6)
                                .fill(Color.red)
                                .frame(width: geometry.size.width * hpPercent)
                        }
                    }
                    .frame(height: 16)

                    Text("\(boss.currentHP) / \(boss.totalHP) HP")
                        .font(.caption.monospaced())
                        .foregroundStyle(.gray)
                }

                // Top contributors
                Text("Top Contributors")
                    .font(.headline)
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity, alignment: .leading)

                ForEach(Array(boss.contributors.sorted { $0.damageDealt > $1.damageDealt }.prefix(10).enumerated()), id: \.offset) { _, contributor in
                    HStack {
                        Text(contributor.username)
                            .foregroundStyle(.white)
                        Spacer()
                        Text("\(contributor.damageDealt) dmg")
                            .font(.caption.monospaced())
                            .foregroundStyle(.orange)
                    }
                }
            }
            .padding()
        } else {
            VStack(spacing: 12) {
                Image(systemName: "shield.slash")
                    .font(.system(size: 40))
                    .foregroundStyle(.gray)
                Text("No active boss")
                    .foregroundStyle(.gray)
            }
            .padding(.top, 60)
        }
    }
}

// MARK: - Global Chat

struct GlobalChatView: View {
    let messages: [ChatMessage]

    var body: some View {
        LazyVStack(spacing: 8) {
            ForEach(messages) { msg in
                HStack(alignment: .top, spacing: 8) {
                    AsyncImage(url: URL(string: msg.photo)) { image in
                        image.resizable().scaledToFill()
                    } placeholder: {
                        Circle().fill(Color.gray.opacity(0.3))
                    }
                    .frame(width: 28, height: 28)
                    .clipShape(Circle())

                    VStack(alignment: .leading, spacing: 2) {
                        Text(msg.username)
                            .font(.caption.bold())
                            .foregroundStyle(.red)
                        Text(msg.text)
                            .font(.subheadline)
                            .foregroundStyle(.white)
                    }
                    Spacer()
                }
                .padding(.horizontal)
            }
        }
        .padding(.vertical)
    }
}
