import SwiftUI

/// AI Lab tab — mirrors React AILabView.jsx
/// Shows pose detection camera and AI coaching
struct AILabTab: View {
    @State private var showCamera = false
    @EnvironmentObject var storeKitManager: StoreKitManager

    var body: some View {
        NavigationStack {
            VStack(spacing: 24) {
                Spacer()

                Image(systemName: "figure.strengthtraining.traditional")
                    .font(.system(size: 80))
                    .foregroundStyle(.red)

                Text("AI Form Correction")
                    .font(.title2.bold())
                    .foregroundStyle(.white)

                Text("Point your camera at yourself while exercising. The AI will analyze your form in real-time and provide corrections.")
                    .font(.subheadline)
                    .foregroundStyle(.gray)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 32)

                Button {
                    showCamera = true
                } label: {
                    HStack {
                        Image(systemName: "camera.viewfinder")
                        Text("Start Form Check")
                            .font(.headline)
                    }
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color.red)
                    .foregroundStyle(.white)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                }
                .padding(.horizontal)

                Spacer()
            }
            .background(Color.black)
            .navigationTitle("AI Lab")
            .navigationBarTitleDisplayMode(.inline)
            .fullScreenCover(isPresented: $showCamera) {
                PoseDetectionView()
                    .overlay(alignment: .topLeading) {
                        Button {
                            showCamera = false
                        } label: {
                            Image(systemName: "xmark.circle.fill")
                                .font(.title)
                                .foregroundStyle(.white)
                                .padding()
                        }
                    }
            }
        }
    }
}
