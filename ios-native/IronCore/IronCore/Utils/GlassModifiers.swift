import SwiftUI

// Glass card modifier — matches React prototype glass styling
struct GlassCard: ViewModifier {
    var selected: Bool = false

    func body(content: Content) -> some View {
        content
            .background(
                RoundedRectangle(cornerRadius: 20)
                    .fill(
                        selected
                            ? LinearGradient(
                                colors: [Color.ironRed.opacity(0.2), Color.ironRedDark.opacity(0.1)],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                            : LinearGradient.glassGradient
                    )
            )
            .overlay(
                RoundedRectangle(cornerRadius: 20)
                    .stroke(
                        selected
                            ? Color.ironRedLight.opacity(0.4)
                            : Color.glassBorder,
                        lineWidth: 1
                    )
            )
            .shadow(
                color: selected ? Color.ironRed.opacity(0.2) : Color.black.opacity(0.2),
                radius: selected ? 20 : 10,
                y: selected ? 10 : 5
            )
    }
}

extension View {
    func glassCard(selected: Bool = false) -> some View {
        modifier(GlassCard(selected: selected))
    }
}

// Glass input field
struct GlassInputField: View {
    let label: String
    @Binding var value: String
    var placeholder: String = ""
    var unit: String = ""
    var highlight: Bool = false

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label.uppercased())
                .font(.system(size: 11, weight: .bold))
                .foregroundColor(highlight ? .orange : .textTertiary)

            HStack(alignment: .firstTextBaseline, spacing: 4) {
                TextField(placeholder, text: $value)
                    .keyboardType(.decimalPad)
                    .font(.system(size: 24, weight: .black))
                    .foregroundColor(.white)

                if !unit.isEmpty {
                    Text(unit)
                        .font(.system(size: 11))
                        .foregroundColor(.textTertiary)
                }
            }
        }
        .padding(16)
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(LinearGradient.glassGradient)
        )
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(
                    highlight ? Color.orange.opacity(0.4) : Color.glassBorder,
                    lineWidth: 1
                )
        )
    }
}
