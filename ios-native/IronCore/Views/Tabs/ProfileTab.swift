import SwiftUI

/// Profile tab — mirrors React ProfileHub.jsx
/// Shows: avatar, stats, settings, logout
struct ProfileTab: View {
    @EnvironmentObject var firestoreManager: FirestoreManager
    @EnvironmentObject var authManager: AuthManager
    @EnvironmentObject var storeKitManager: StoreKitManager

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    // Avatar & name
                    if let profile = firestoreManager.profile {
                        ProfileHeader(profile: profile)
                    }

                    // Stats grid
                    StatsGrid()

                    // Premium status
                    PremiumCard()

                    // Sign out
                    Button(role: .destructive) {
                        try? authManager.signOut()
                    } label: {
                        HStack {
                            Image(systemName: "rectangle.portrait.and.arrow.right")
                            Text("Sign Out")
                        }
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.white.opacity(0.05))
                        .foregroundStyle(.red)
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                    }
                }
                .padding()
            }
            .background(Color.black)
            .navigationTitle("Profile")
            .navigationBarTitleDisplayMode(.inline)
        }
    }
}

struct ProfileHeader: View {
    let profile: UserProfile

    var body: some View {
        VStack(spacing: 12) {
            AsyncImage(url: URL(string: profile.photoURL ?? "")) { image in
                image.resizable().scaledToFill()
            } placeholder: {
                Image(systemName: "person.circle.fill")
                    .resizable()
                    .foregroundStyle(.gray)
            }
            .frame(width: 80, height: 80)
            .clipShape(Circle())

            Text(profile.userId)
                .font(.title3.bold())
                .foregroundStyle(.white)

            HStack(spacing: 16) {
                StatPill(label: "Level", value: "\(calculateLevel(xp: profile.xp))")
                StatPill(label: "XP", value: "\(profile.xp)")
                StatPill(label: "League", value: getLeague(xp: profile.xp))
            }
        }
    }
}

struct StatPill: View {
    let label: String
    let value: String

    var body: some View {
        VStack(spacing: 2) {
            Text(value)
                .font(.subheadline.bold())
                .foregroundStyle(.white)
            Text(label)
                .font(.caption2)
                .foregroundStyle(.gray)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 6)
        .background(Color.white.opacity(0.05))
        .clipShape(Capsule())
    }
}

struct StatsGrid: View {
    @EnvironmentObject var firestoreManager: FirestoreManager

    var body: some View {
        let profile = firestoreManager.profile
        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
            StatCard(icon: "dumbbell", label: "Workouts", value: "\(firestoreManager.workouts.count)")
            StatCard(icon: "flame", label: "Streak", value: "\(profile?.currentStreak ?? 0)")
            StatCard(icon: "fork.knife", label: "Meals Logged", value: "\(firestoreManager.meals.count)")
            StatCard(icon: "photo", label: "Progress Photos", value: "\(firestoreManager.photos.count)")
        }
    }
}

struct StatCard: View {
    let icon: String
    let label: String
    let value: String

    var body: some View {
        VStack(spacing: 8) {
            Image(systemName: icon)
                .font(.title2)
                .foregroundStyle(.red)
            Text(value)
                .font(.title3.bold())
                .foregroundStyle(.white)
            Text(label)
                .font(.caption)
                .foregroundStyle(.gray)
        }
        .frame(maxWidth: .infinity)
        .padding()
        .background(Color.white.opacity(0.05))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}

struct PremiumCard: View {
    @EnvironmentObject var storeKitManager: StoreKitManager

    var body: some View {
        VStack(spacing: 12) {
            HStack {
                Image(systemName: storeKitManager.isPremium ? "crown.fill" : "crown")
                    .foregroundStyle(.yellow)
                Text(storeKitManager.isPremium ? "Premium Active" : "Upgrade to Premium")
                    .font(.headline)
                    .foregroundStyle(.white)
                Spacer()
            }

            if !storeKitManager.isPremium {
                Text("Unlimited AI coaching, form correction, full leagues & more")
                    .font(.caption)
                    .foregroundStyle(.gray)
                    .frame(maxWidth: .infinity, alignment: .leading)

                if let monthly = storeKitManager.monthlyProduct {
                    Text("\(monthly.displayPrice)/mo")
                        .font(.subheadline.bold())
                        .foregroundStyle(.red)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }
            }
        }
        .padding()
        .background(Color.white.opacity(0.05))
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }
}
