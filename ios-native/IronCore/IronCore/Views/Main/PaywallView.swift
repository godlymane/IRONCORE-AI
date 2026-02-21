import SwiftUI

/// Premium paywall modal — mirrors PremiumPaywall.jsx from React prototype.
/// Full-screen overlay with contextual trigger, feature comparison, plan selection, CTA.
struct PaywallView: View {
    @EnvironmentObject var premiumVM: PremiumViewModel
    @State private var selectedPlan: String = "pro_yearly"
    @State private var loading = false
    @State private var error: String?

    private let storeKit = StoreKitService.shared

    // MARK: - Feature Lists (match React PremiumPaywall.jsx)

    private let freeLimitations = [
        "Workout history limited to 30 days",
        "Basic form score only (no rep-by-rep breakdown)",
        "No predictive analytics or AI insights",
        "Standard Arena matchmaking",
        "No guild creation (join only)",
        "No data export",
    ]

    private let premiumFeatures: [(icon: String, text: String)] = [
        ("bolt.fill", "Unlimited workout history — every session, forever"),
        ("camera.fill", "Full AI form analysis — rep-by-rep, joint tracking"),
        ("brain.head.profile", "Predictive analytics — AI-driven insights"),
        ("shield.lefthalf.filled", "Priority Arena matchmaking"),
        ("person.3.fill", "Guild creation + officer tools"),
        ("chart.bar.fill", "Advanced progression charts"),
        ("arrow.down.doc.fill", "Data export (CSV) — your data, anytime"),
        ("medal.fill", "Exclusive badges & profile cosmetics"),
    ]

    var body: some View {
        ZStack {
            // Backdrop
            Color.black.opacity(0.85)
                .ignoresSafeArea()

            ScrollView(.vertical, showsIndicators: false) {
                VStack(spacing: 0) {
                    headerSection
                    freeLimitationsSection
                    divider
                    premiumFeaturesSection
                    planSelection
                    errorMessage
                    ctaSection
                }
                .padding(.horizontal, 24)
                .padding(.vertical, 32)
            }
            .background(
                RoundedRectangle(cornerRadius: 28)
                    .fill(
                        LinearGradient(
                            colors: [
                                Color(white: 0.08).opacity(0.98),
                                Color(white: 0.04).opacity(0.99),
                            ],
                            startPoint: .top,
                            endPoint: .bottom
                        )
                    )
                    .overlay(
                        RoundedRectangle(cornerRadius: 28)
                            .stroke(Color.white.opacity(0.1), lineWidth: 1)
                    )
                    .shadow(color: Color.black.opacity(0.5), radius: 25, y: 10)
                    .shadow(color: Color.ironRed.opacity(0.1), radius: 50)
            )
            .padding(.horizontal, 16)
            .padding(.vertical, 40)
        }
        .onAppear {
            Task { await storeKit.loadProducts() }
        }
    }

    // MARK: - Header

    private var headerSection: some View {
        VStack(spacing: 12) {
            // Contextual line
            if let feature = premiumVM.paywallFeature,
               let line = PremiumViewModel.contextualLines[feature] {
                Text(line)
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(Color.white.opacity(0.5))
                    .multilineTextAlignment(.center)
                    .padding(.bottom, 4)
            }

            // Crown icon
            ZStack {
                Circle()
                    .fill(
                        LinearGradient(
                            colors: [
                                Color.ironRed.opacity(0.3),
                                Color(hex: "#fb923c").opacity(0.2),
                            ],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
                    .frame(width: 80, height: 80)
                    .shadow(color: Color.ironRed.opacity(0.3), radius: 20)

                Image(systemName: "crown.fill")
                    .font(.system(size: 36))
                    .foregroundColor(Color(hex: "#fbbf24"))
            }

            Text("IRONCORE PREMIUM")
                .font(.system(size: 24, weight: .black))
                .foregroundColor(.white)
                .tracking(1)

            Text("The full protocol. Unlocked.")
                .font(.system(size: 14))
                .foregroundColor(Color.white.opacity(0.5))
        }
        .padding(.bottom, 20)
    }

    // MARK: - Free Limitations

    private var freeLimitationsSection: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("WHAT YOU'RE MISSING ON FREE")
                .font(.system(size: 10, weight: .black))
                .foregroundColor(Color.white.opacity(0.3))
                .tracking(2)
                .padding(.bottom, 4)

            ForEach(freeLimitations, id: \.self) { text in
                HStack(alignment: .top, spacing: 10) {
                    Image(systemName: "xmark")
                        .font(.system(size: 10, weight: .bold))
                        .foregroundColor(Color(hex: "#ef4444").opacity(0.6))
                        .frame(width: 14)
                    Text(text)
                        .font(.system(size: 12))
                        .foregroundColor(Color.white.opacity(0.4))
                }
                .padding(.vertical, 3)
            }
        }
        .padding(.bottom, 8)
    }

    private var divider: some View {
        Rectangle()
            .fill(Color.white.opacity(0.05))
            .frame(height: 1)
            .padding(.vertical, 8)
    }

    // MARK: - Premium Features

    private var premiumFeaturesSection: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("WHAT PREMIUM UNLOCKS")
                .font(.system(size: 10, weight: .black))
                .foregroundColor(Color.white.opacity(0.3))
                .tracking(2)
                .padding(.bottom, 4)

            ForEach(premiumFeatures, id: \.text) { feature in
                HStack(alignment: .top, spacing: 10) {
                    Image(systemName: "checkmark")
                        .font(.system(size: 10, weight: .bold))
                        .foregroundColor(Color(hex: "#34d399"))
                        .frame(width: 14)
                    Text(feature.text)
                        .font(.system(size: 12))
                        .foregroundColor(Color.white.opacity(0.7))
                }
                .padding(.vertical, 3)
            }
        }
        .padding(.bottom, 16)
    }

    // MARK: - Plan Selection

    private var planSelection: some View {
        HStack(spacing: 12) {
            // Monthly
            planCard(
                label: "Monthly",
                planId: "pro_monthly",
                price: monthlyPrice,
                perUnit: "/month",
                subtext: "Cancel anytime.",
                badge: nil
            )

            // Yearly
            planCard(
                label: "Annual",
                planId: "pro_yearly",
                price: yearlyPrice,
                perUnit: "/year",
                subtext: yearlySavings,
                badge: "Best Value"
            )
        }
        .padding(.bottom, 16)
    }

    private func planCard(
        label: String,
        planId: String,
        price: String,
        perUnit: String,
        subtext: String,
        badge: String?
    ) -> some View {
        let isSelected = selectedPlan == planId

        return Button { selectedPlan = planId } label: {
            ZStack(alignment: .top) {
                VStack(spacing: 4) {
                    Text(label.uppercased())
                        .font(.system(size: 10, weight: .black))
                        .foregroundColor(Color.white.opacity(0.5))
                        .tracking(2)

                    Text(price)
                        .font(.system(size: 22, weight: .black))
                        .foregroundColor(.white)

                    Text(perUnit)
                        .font(.system(size: 10))
                        .foregroundColor(Color.white.opacity(0.3))

                    Text(subtext)
                        .font(.system(size: 10))
                        .foregroundColor(
                            planId == "pro_yearly"
                                ? Color(hex: "#34d399")
                                : Color.white.opacity(0.4)
                        )
                        .padding(.top, 2)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 16)
                .padding(.horizontal, 8)
                .background(
                    RoundedRectangle(cornerRadius: 16)
                        .fill(isSelected ? Color.ironRed.opacity(0.1) : Color.white.opacity(0.05))
                )
                .overlay(
                    RoundedRectangle(cornerRadius: 16)
                        .stroke(
                            isSelected ? Color.ironRedLight : Color.white.opacity(0.1),
                            lineWidth: isSelected ? 2 : 1
                        )
                )

                // Badge
                if let badge = badge {
                    Text(badge.uppercased())
                        .font(.system(size: 9, weight: .black))
                        .foregroundColor(.black)
                        .padding(.horizontal, 10)
                        .padding(.vertical, 3)
                        .background(Capsule().fill(Color(hex: "#34d399")))
                        .offset(y: -10)
                }
            }
        }
    }

    // MARK: - Error

    @ViewBuilder
    private var errorMessage: some View {
        if let error = error {
            Text(error)
                .font(.system(size: 13))
                .foregroundColor(.ironRedLight)
                .multilineTextAlignment(.center)
                .padding(.bottom, 8)
        }
    }

    // MARK: - CTA + Bottom

    private var ctaSection: some View {
        VStack(spacing: 12) {
            // Main CTA
            Button {
                Task { await handlePurchase() }
            } label: {
                HStack(spacing: 8) {
                    if loading {
                        ProgressView()
                            .tint(.white)
                            .scaleEffect(0.8)
                        Text("Processing...")
                            .font(.system(size: 17, weight: .black))
                            .foregroundColor(.white)
                    } else {
                        Image(systemName: "sparkles")
                            .font(.system(size: 18))
                            .foregroundColor(.white)
                        Text(selectedPlan == "pro_yearly" ? "START ANNUAL" : "START MONTHLY")
                            .font(.system(size: 17, weight: .black))
                            .foregroundColor(.white)
                    }
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 16)
                .background(
                    LinearGradient(
                        colors: [Color.ironRed, Color(hex: "#ea580c")],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
                .clipShape(RoundedRectangle(cornerRadius: 16))
                .shadow(color: Color.ironRed.opacity(0.4), radius: 20, y: 5)
            }
            .disabled(loading)
            .opacity(loading ? 0.7 : 1)

            // Disclaimer
            Text("Cancel anytime from Settings. No contracts. No hidden fees.")
                .font(.system(size: 11))
                .foregroundColor(Color.white.opacity(0.3))
                .multilineTextAlignment(.center)

            // Bottom buttons
            HStack(spacing: 16) {
                Button { premiumVM.closePaywall() } label: {
                    Text("MAYBE LATER")
                        .font(.system(size: 12, weight: .bold))
                        .foregroundColor(Color.white.opacity(0.4))
                }

                Text("|")
                    .font(.system(size: 12))
                    .foregroundColor(Color.white.opacity(0.1))

                Button {
                    Task {
                        loading = true
                        await premiumVM.restorePurchases()
                        loading = false
                        if !premiumVM.isPremium {
                            error = "No active subscription found."
                        }
                    }
                } label: {
                    Text("RESTORE PURCHASE")
                        .font(.system(size: 12, weight: .bold))
                        .foregroundColor(Color.white.opacity(0.4))
                }
            }
        }
    }

    // MARK: - Purchase Logic

    private func handlePurchase() async {
        loading = true
        error = nil
        await premiumVM.purchase(planId: selectedPlan)

        if storeKit.purchaseState == .success {
            // Paywall auto-dismisses via PremiumViewModel.purchase()
        } else if case .failed(let msg) = storeKit.purchaseState {
            error = msg
        }
        loading = false
    }

    // MARK: - Price Helpers

    private var monthlyPrice: String {
        if let product = storeKit.product(for: "pro_monthly") {
            return product.displayPrice
        }
        return "$12.99"
    }

    private var yearlyPrice: String {
        if let product = storeKit.product(for: "pro_yearly") {
            return product.displayPrice
        }
        return "$79.99"
    }

    private var yearlySavings: String {
        if let product = storeKit.product(for: "pro_yearly") {
            let monthly = product.price / 12
            let formatter = NumberFormatter()
            formatter.numberStyle = .currency
            formatter.locale = product.priceFormatStyle.locale
            let monthlyStr = formatter.string(from: monthly as NSDecimalNumber) ?? "$6.67"
            return "\(monthlyStr)/mo · Save 44%"
        }
        return "$6.67/mo · Save 44%"
    }
}
