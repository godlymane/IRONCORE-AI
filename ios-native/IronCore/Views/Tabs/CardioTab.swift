import SwiftUI

/// Cardio tab — mirrors React CardioView.jsx
/// Logs cardio sessions with calorie burn tracking
struct CardioTab: View {
    @EnvironmentObject var firestoreManager: FirestoreManager
    @EnvironmentObject var authManager: AuthManager
    @State private var caloriesBurned = ""
    @State private var isSaving = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    // Log cardio
                    VStack(spacing: 12) {
                        Text("Log Cardio Session")
                            .font(.headline)
                            .foregroundStyle(.white)
                            .frame(maxWidth: .infinity, alignment: .leading)

                        TextField("Calories burned", text: $caloriesBurned)
                            .keyboardType(.numberPad)
                            .textFieldStyle(.roundedBorder)

                        Button {
                            logCardio()
                        } label: {
                            HStack {
                                if isSaving {
                                    ProgressView()
                                        .tint(.white)
                                } else {
                                    Image(systemName: "flame.fill")
                                    Text("Log Cardio (+\(XPReward.cardio) XP)")
                                }
                            }
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(Color.orange)
                            .foregroundStyle(.white)
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                        }
                        .disabled(caloriesBurned.isEmpty || isSaving)
                    }
                    .padding()
                    .background(Color.white.opacity(0.05))
                    .clipShape(RoundedRectangle(cornerRadius: 16))

                    // Cardio history
                    VStack(alignment: .leading, spacing: 12) {
                        Text("History")
                            .font(.headline)
                            .foregroundStyle(.white)

                        ForEach(firestoreManager.burned.prefix(10)) { entry in
                            HStack {
                                Image(systemName: "flame")
                                    .foregroundStyle(.orange)
                                Text("\(Int(entry.calories)) cal")
                                    .foregroundStyle(.white)
                                Spacer()
                                Text(entry.date)
                                    .font(.caption)
                                    .foregroundStyle(.gray)
                            }
                            .padding(.vertical, 4)
                        }
                    }
                }
                .padding()
            }
            .background(Color.black)
            .navigationTitle("Cardio")
            .navigationBarTitleDisplayMode(.inline)
        }
    }

    private func logCardio() {
        guard let uid = authManager.currentUser?.uid,
              let cal = Double(caloriesBurned) else { return }

        isSaving = true
        let entry = CardioEntry(date: todayDateString(), userId: uid, calories: cal)
        Task {
            try? await firestoreManager.addEntry(
                uid: uid,
                collection: "burned",
                data: entry,
                xpReward: XPReward.cardio
            )
            await MainActor.run {
                caloriesBurned = ""
                isSaving = false
            }
        }
    }
}
