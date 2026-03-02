import SwiftUI
import FirebaseAuth

/// Track / My Stats screen — mirrors TrackView.jsx from React prototype.
/// Shows: hero profile header, weight card, height card, body fat card,
/// BMI + FFMI metrics, info banner, and weight log history.
struct TrackView: View {
    @StateObject private var viewModel = TrackViewModel()
    @EnvironmentObject var authVM: AuthViewModel
    let profile: UserProfile?

    // Brand colors
    private let ironRed = Color(red: 220/255, green: 38/255, blue: 38/255)
    private let ironRedDark = Color(red: 185/255, green: 28/255, blue: 28/255)

    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            VStack(spacing: 16) {
                heroHeader
                infoBanner
                bodyMetricsGrid
                if viewModel.hasBodyMetrics(from: profile) {
                    advancedMetrics
                }
                weightLog
            }
            .padding(.horizontal, 16)
            .padding(.bottom, 24)
        }
        .background(Color.black)
        .onAppear {
            if let uid = Auth.auth().currentUser?.uid {
                viewModel.startListening(uid: uid)
            }
        }
        .onDisappear {
            viewModel.stopListening()
        }
    }

    // MARK: - Hero Profile Header

    private var heroHeader: some View {
        HStack(spacing: 14) {
            // Profile photo
            ZStack {
                Circle()
                    .stroke(ironRed, lineWidth: 2)
                    .frame(width: 80, height: 80)

                if let url = viewModel.photoURL(from: profile),
                   let imageURL = URL(string: url) {
                    AsyncImage(url: imageURL) { phase in
                        switch phase {
                        case .success(let image):
                            image
                                .resizable()
                                .scaledToFill()
                                .frame(width: 72, height: 72)
                                .clipShape(Circle())
                        case .failure:
                            placeholderAvatar
                        case .empty:
                            ProgressView()
                                .tint(.textTertiary)
                                .frame(width: 72, height: 72)
                        @unknown default:
                            placeholderAvatar
                        }
                    }
                } else {
                    placeholderAvatar
                }
            }

            // Title + pills
            VStack(alignment: .leading, spacing: 8) {
                HStack {
                    Text("MY STATS")
                        .font(.system(size: 20, weight: .black))
                        .italic()
                        .foregroundColor(.white)
                        .tracking(-0.5)

                    Spacer()

                    // PRO badge
                    Text("PRO")
                        .font(.system(size: 11, weight: .bold))
                        .foregroundColor(ironRed)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(
                            RoundedRectangle(cornerRadius: 4)
                                .fill(ironRed.opacity(0.15))
                                .overlay(
                                    RoundedRectangle(cornerRadius: 4)
                                        .stroke(ironRed.opacity(0.3), lineWidth: 1)
                                )
                        )
                }

                // Gender + Age pills
                HStack(spacing: 8) {
                    pillTag(viewModel.gender(from: profile))
                    pillTag("\(viewModel.age(from: profile)) YRS")
                }
            }
        }
        .padding(16)
        .background(
            RoundedRectangle(cornerRadius: 24)
                .fill(Color.white.opacity(0.04))
                .overlay(
                    RoundedRectangle(cornerRadius: 24)
                        .stroke(Color.white.opacity(0.08), lineWidth: 1)
                )
        )
        .padding(.top, 8)
    }

    private var placeholderAvatar: some View {
        ZStack {
            Circle()
                .fill(Color(UIColor.systemGray6).opacity(0.3))
                .frame(width: 72, height: 72)
            Image(systemName: "person.fill")
                .font(.system(size: 28))
                .foregroundColor(.textTertiary)
        }
    }

    private func pillTag(_ text: String) -> some View {
        Text(text.uppercased())
            .font(.system(size: 11, weight: .bold))
            .foregroundColor(Color.white.opacity(0.7))
            .padding(.horizontal, 12)
            .padding(.vertical, 5)
            .background(
                Capsule()
                    .fill(Color.black)
                    .overlay(
                        Capsule()
                            .stroke(Color.white.opacity(0.12), lineWidth: 1)
                    )
            )
    }

    // MARK: - Info Banner

    private var infoBanner: some View {
        HStack(spacing: 10) {
            ZStack {
                RoundedRectangle(cornerRadius: 8)
                    .fill(ironRed.opacity(0.1))
                    .frame(width: 28, height: 28)
                Image(systemName: "lock.fill")
                    .font(.system(size: 12))
                    .foregroundColor(ironRed)
            }

            Text("Stats are managed in ")
                .font(.system(size: 12))
                .foregroundColor(.textTertiary)
            + Text("Goal Architect")
                .font(.system(size: 12, weight: .bold))
                .foregroundColor(ironRed)
            + Text(" (Home)")
                .font(.system(size: 12))
                .foregroundColor(.textTertiary)

            Spacer()
        }
        .padding(12)
        .background(
            RoundedRectangle(cornerRadius: 14)
                .fill(Color.white.opacity(0.03))
                .overlay(
                    RoundedRectangle(cornerRadius: 14)
                        .stroke(ironRed.opacity(0.15), lineWidth: 1)
                )
        )
    }

    // MARK: - Body Metrics Grid (Weight | Height + Body Fat)

    private var bodyMetricsGrid: some View {
        HStack(alignment: .top, spacing: 12) {
            // Weight card (larger, left side)
            weightCard
                .frame(maxWidth: .infinity)

            // Right column: Height + Body Fat stacked
            VStack(spacing: 12) {
                heightCard
                bodyFatCard
            }
            .frame(maxWidth: .infinity)
        }
    }

    // MARK: - Weight Card

    private var weightCard: some View {
        VStack(alignment: .leading, spacing: 8) {
            // Label
            HStack(spacing: 4) {
                Image(systemName: "scalemass.fill")
                    .font(.system(size: 11))
                    .foregroundColor(.textTertiary)
                Text("WEIGHT")
                    .font(.system(size: 11, weight: .bold))
                    .foregroundColor(.textTertiary)
            }

            // Big number
            HStack(alignment: .firstTextBaseline, spacing: 4) {
                if let weight = viewModel.currentWeight(from: profile) {
                    Text(weight.formatted(.number.precision(.fractionLength(0...1))))
                        .font(.system(size: 40, weight: .black))
                        .italic()
                        .foregroundColor(.white)
                        .tracking(-1)
                } else {
                    Text("--")
                        .font(.system(size: 40, weight: .black))
                        .italic()
                        .foregroundColor(.white)
                }
                Text("kg")
                    .font(.system(size: 14, weight: .bold))
                    .foregroundColor(.textTertiary)
            }

            // Target progress bar
            if let target = viewModel.targetWeight(from: profile) {
                let percent = viewModel.goalPercent(from: profile)

                VStack(spacing: 4) {
                    HStack {
                        Text("TARGET: \(Int(target))kg")
                            .font(.system(size: 11, weight: .bold))
                            .foregroundColor(ironRed)
                        Spacer()
                        Text("\(Int(percent))%")
                            .font(.system(size: 11, weight: .medium))
                            .foregroundColor(.textTertiary)
                    }

                    GeometryReader { geo in
                        ZStack(alignment: .leading) {
                            RoundedRectangle(cornerRadius: 3)
                                .fill(Color.white.opacity(0.08))
                                .frame(height: 5)
                            RoundedRectangle(cornerRadius: 3)
                                .fill(ironRed)
                                .frame(width: geo.size.width * (percent / 100.0), height: 5)
                                .animation(.easeOut(duration: 1.0), value: percent)
                        }
                    }
                    .frame(height: 5)
                }
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            RoundedRectangle(cornerRadius: 24)
                .fill(
                    LinearGradient(
                        colors: [Color(UIColor.systemGray6).opacity(0.15), Color.black.opacity(0.3)],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
                .overlay(
                    RoundedRectangle(cornerRadius: 24)
                        .stroke(Color.white.opacity(0.08), lineWidth: 1)
                )
        )
    }

    // MARK: - Height Card

    private var heightCard: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(spacing: 4) {
                Image(systemName: "ruler.fill")
                    .font(.system(size: 11))
                    .foregroundColor(.textTertiary)
                Text("HEIGHT")
                    .font(.system(size: 11, weight: .bold))
                    .foregroundColor(.textTertiary)
            }

            HStack(alignment: .firstTextBaseline, spacing: 3) {
                if let height = viewModel.currentHeight(from: profile) {
                    Text("\(Int(height))")
                        .font(.system(size: 22, weight: .black))
                        .foregroundColor(.white)
                } else {
                    Text("--")
                        .font(.system(size: 22, weight: .black))
                        .foregroundColor(.white)
                }
                Text("cm")
                    .font(.system(size: 11, weight: .medium))
                    .foregroundColor(.textTertiary)
            }
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            RoundedRectangle(cornerRadius: 18)
                .fill(Color(UIColor.systemGray6).opacity(0.1))
                .overlay(
                    RoundedRectangle(cornerRadius: 18)
                        .stroke(Color.white.opacity(0.08), lineWidth: 1)
                )
        )
    }

    // MARK: - Body Fat Card

    private var bodyFatCard: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(spacing: 4) {
                Image(systemName: "heart.fill")
                    .font(.system(size: 11))
                    .foregroundColor(.textTertiary)
                Text("BODY FAT")
                    .font(.system(size: 11, weight: .bold))
                    .foregroundColor(.textTertiary)
            }

            HStack(alignment: .firstTextBaseline, spacing: 3) {
                if let fat = viewModel.bodyFat(from: profile) {
                    Text(fat.formatted(.number.precision(.fractionLength(0...1))))
                        .font(.system(size: 22, weight: .black))
                        .foregroundColor(.cyan)
                } else {
                    Text("--")
                        .font(.system(size: 22, weight: .black))
                        .foregroundColor(.cyan)
                }
                Text("%")
                    .font(.system(size: 11, weight: .medium))
                    .foregroundColor(.textTertiary)
            }
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            RoundedRectangle(cornerRadius: 18)
                .fill(Color(UIColor.systemGray6).opacity(0.1))
                .overlay(
                    RoundedRectangle(cornerRadius: 18)
                        .stroke(Color.white.opacity(0.08), lineWidth: 1)
                )
        )
    }

    // MARK: - Advanced Metrics (BMI + FFMI)

    private var advancedMetrics: some View {
        HStack(spacing: 12) {
            // BMI Card
            VStack(alignment: .leading, spacing: 6) {
                Text("BMI SCORE")
                    .font(.system(size: 11, weight: .bold))
                    .foregroundColor(.textTertiary)

                Text(viewModel.bmiString(from: profile))
                    .font(.system(size: 22, weight: .black, design: .monospaced))
                    .foregroundColor(.white)

                Text("GENERAL HEALTH")
                    .font(.system(size: 11, weight: .medium))
                    .foregroundColor(.textTertiary)
                    .opacity(0.7)
            }
            .padding(16)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(
                RoundedRectangle(cornerRadius: 18)
                    .fill(Color.white.opacity(0.04))
                    .overlay(
                        RoundedRectangle(cornerRadius: 18)
                            .stroke(Color.white.opacity(0.08), lineWidth: 1)
                    )
            )

            // FFMI Card
            ZStack(alignment: .topTrailing) {
                VStack(alignment: .leading, spacing: 6) {
                    Text("FFMI SCORE")
                        .font(.system(size: 11, weight: .bold))
                        .foregroundColor(.textTertiary)

                    Text(viewModel.ffmiString(from: profile))
                        .font(.system(size: 22, weight: .black, design: .monospaced))
                        .foregroundColor(.yellow)

                    Text("MUSCLE POTENTIAL")
                        .font(.system(size: 11, weight: .medium))
                        .foregroundColor(.textTertiary)
                        .opacity(0.7)
                }
                .padding(16)
                .frame(maxWidth: .infinity, alignment: .leading)

                // Background bolt icon (decorative, low opacity)
                Image(systemName: "bolt.fill")
                    .font(.system(size: 48))
                    .foregroundColor(.yellow.opacity(0.06))
                    .padding(8)
            }
            .background(
                RoundedRectangle(cornerRadius: 18)
                    .fill(Color.white.opacity(0.04))
                    .overlay(
                        RoundedRectangle(cornerRadius: 18)
                            .stroke(Color.white.opacity(0.08), lineWidth: 1)
                    )
            )
        }
    }

    // MARK: - Weight Log History

    private var weightLog: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Section header
            HStack(spacing: 6) {
                Image(systemName: "arrow.up.right")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundColor(.textTertiary)
                Text("WEIGHT LOG")
                    .font(.system(size: 12, weight: .bold))
                    .foregroundColor(.textTertiary)
            }
            .padding(.top, 4)

            let entries = viewModel.sortedProgress.prefix(5).filter { $0.weight > 0 }

            if entries.isEmpty {
                Text("No history recorded yet.")
                    .font(.system(size: 13))
                    .italic()
                    .foregroundColor(.textTertiary)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 20)
            } else {
                ForEach(Array(entries)) { entry in
                    weightLogRow(entry: entry)
                }
            }
        }
    }

    private func weightLogRow(entry: TrackViewModel.ProgressEntry) -> some View {
        HStack(spacing: 12) {
            // Day number circle
            ZStack {
                Circle()
                    .fill(Color.black)
                    .frame(width: 34, height: 34)
                    .overlay(
                        Circle()
                            .stroke(Color.white.opacity(0.1), lineWidth: 1)
                    )
                Text("\(entry.dayNumber)")
                    .font(.system(size: 12, weight: .bold))
                    .foregroundColor(.textTertiary)
            }

            // Label + date
            VStack(alignment: .leading, spacing: 2) {
                Text("Weigh In")
                    .font(.system(size: 13, weight: .bold))
                    .foregroundColor(.white)
                Text(entry.shortDate)
                    .font(.system(size: 11))
                    .foregroundColor(.textTertiary)
            }

            Spacer()

            // Weight value (mono)
            Text("\(entry.weight, specifier: "%.1f") kg")
                .font(.system(size: 14, weight: .black, design: .monospaced))
                .foregroundColor(.white)
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 12)
        .background(
            RoundedRectangle(cornerRadius: 18)
                .fill(Color(UIColor.systemGray6).opacity(0.1))
                .overlay(
                    RoundedRectangle(cornerRadius: 18)
                        .stroke(Color.white.opacity(0.06), lineWidth: 1)
                )
        )
    }
}

// MARK: - Preview

#Preview {
    TrackView(profile: nil)
        .preferredColorScheme(.dark)
}
