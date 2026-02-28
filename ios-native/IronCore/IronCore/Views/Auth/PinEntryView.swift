import SwiftUI

/// PIN Entry — 6-digit numpad with animated dots.
/// Mirrors PinEntryView.jsx from React prototype.
/// Two modes: setup (create + confirm) and verify (check stored hash).
struct PinEntryView: View {
    let title: String
    let subtitle: String?
    let pinCount: Int
    let error: String?
    let onDigit: (String) -> Void
    let onDelete: () -> Void

    var body: some View {
        VStack(spacing: 32) {
            // Title
            VStack(spacing: 8) {
                Text(title)
                    .font(.system(size: 18, weight: .black))
                    .foregroundColor(.white)
                    .tracking(2)

                if let subtitle = subtitle {
                    Text(subtitle)
                        .font(.system(size: 13))
                        .foregroundColor(.gray)
                }
            }

            // PIN dots
            HStack(spacing: 16) {
                ForEach(0..<6, id: \.self) { index in
                    Circle()
                        .fill(index < pinCount ? Color.ironRedLight : Color.white.opacity(0.1))
                        .frame(width: 16, height: 16)
                        .overlay(
                            Circle()
                                .stroke(
                                    index < pinCount ? Color.ironRedLight : Color.white.opacity(0.2),
                                    lineWidth: 1.5
                                )
                        )
                        .scaleEffect(index < pinCount ? 1.2 : 1.0)
                        .animation(.spring(response: 0.2), value: pinCount)
                }
            }

            // Error
            if let error = error {
                Text(error)
                    .font(.system(size: 13, weight: .medium))
                    .foregroundColor(.ironRedLight)
                    .transition(.opacity)
            }

            // Numpad
            VStack(spacing: 12) {
                ForEach(0..<3, id: \.self) { row in
                    HStack(spacing: 20) {
                        ForEach(1...3, id: \.self) { col in
                            let digit = "\(row * 3 + col)"
                            numpadButton(digit)
                        }
                    }
                }

                // Bottom row: empty, 0, delete
                HStack(spacing: 20) {
                    Color.clear
                        .frame(width: 72, height: 72)

                    numpadButton("0")

                    Button(action: onDelete) {
                        Image(systemName: "delete.left.fill")
                            .font(.system(size: 22))
                            .foregroundColor(.white.opacity(0.6))
                            .frame(width: 72, height: 72)
                    }
                }
            }
        }
    }

    private func numpadButton(_ digit: String) -> some View {
        Button {
            let generator = UIImpactFeedbackGenerator(style: .light)
            generator.impactOccurred()
            onDigit(digit)
        } label: {
            Text(digit)
                .font(.system(size: 28, weight: .bold))
                .foregroundColor(.white)
                .frame(width: 72, height: 72)
                .background(
                    Circle()
                        .fill(Color.white.opacity(0.06))
                        .overlay(
                            Circle()
                                .stroke(Color.white.opacity(0.1), lineWidth: 1)
                        )
                )
        }
    }
}
