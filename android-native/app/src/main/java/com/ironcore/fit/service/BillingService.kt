package com.ironcore.fit.service

import android.app.Activity
import android.content.Context
import com.android.billingclient.api.*
import com.ironcore.fit.data.remote.CloudFunctions
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Google Play Billing service for IronCore Fit subscriptions and Battle Pass.
 *
 * Product IDs:
 *   - com.ironcore.fit.premium.monthly  -> $12.99/mo
 *   - com.ironcore.fit.premium.yearly   -> $79.99/yr
 *   - com.ironcore.fit.battlepass.s1     -> $4.99-9.99 per season
 *
 * Flow:
 * 1. Connect billing client on app start via startConnection()
 * 2. Query product details from Play Console
 * 3. Launch purchase flow (returns to PurchasesUpdatedListener)
 * 4. Verify purchase server-side via Cloud Function (verifyPayment)
 * 5. Acknowledge purchase (required within 3 days or Google auto-refunds)
 * 6. Update isPremium state
 */
@Singleton
class BillingService @Inject constructor(
    @ApplicationContext private val context: Context,
    private val cloudFunctions: CloudFunctions
) {
    private val _products = MutableStateFlow<List<ProductDetails>>(emptyList())
    val products: StateFlow<List<ProductDetails>> = _products.asStateFlow()

    private val _isPremium = MutableStateFlow(false)
    val isPremium: StateFlow<Boolean> = _isPremium.asStateFlow()

    private val scope = CoroutineScope(Dispatchers.IO)

    private val purchasesUpdatedListener = PurchasesUpdatedListener { billingResult, purchases ->
        if (billingResult.responseCode == BillingClient.BillingResponseCode.OK) {
            purchases?.forEach { purchase -> handlePurchase(purchase) }
        }
    }

    private val billingClient = BillingClient.newBuilder(context)
        .setListener(purchasesUpdatedListener)
        .enablePendingPurchases(
            PendingPurchasesParams.newBuilder()
                .enableOneTimeProducts()
                .enablePrepaidPlans()
                .build()
        )
        .build()

    companion object {
        val PRODUCT_IDS = listOf(
            "com.ironcore.fit.premium.monthly",
            "com.ironcore.fit.premium.yearly",
            "com.ironcore.fit.battlepass.s1"
        )
    }

    /**
     * Start the billing client connection.
     * Should be called from Application.onCreate() or MainActivity.
     */
    fun startConnection() {
        billingClient.startConnection(object : BillingClientStateListener {
            override fun onBillingSetupFinished(result: BillingResult) {
                if (result.responseCode == BillingClient.BillingResponseCode.OK) {
                    queryProducts()
                    queryPurchases()
                }
            }

            override fun onBillingServiceDisconnected() {
                // Auto-retry on next operation; BillingClient handles reconnection
            }
        })
    }

    /**
     * Query available subscription products from the Play Console.
     * Populates the products StateFlow for the paywall UI.
     */
    private fun queryProducts() {
        val params = QueryProductDetailsParams.newBuilder()
            .setProductList(PRODUCT_IDS.map { productId ->
                QueryProductDetailsParams.Product.newBuilder()
                    .setProductId(productId)
                    .setProductType(BillingClient.ProductType.SUBS)
                    .build()
            }).build()

        billingClient.queryProductDetailsAsync(params) { result, productDetailsList ->
            if (result.responseCode == BillingClient.BillingResponseCode.OK) {
                _products.value = productDetailsList
            }
        }
    }

    /**
     * Launch the Google Play purchase flow for a specific product.
     * The Activity is needed because Play Billing opens a system UI overlay.
     */
    fun launchPurchaseFlow(activity: Activity, productDetails: ProductDetails) {
        val offerToken = productDetails.subscriptionOfferDetails
            ?.firstOrNull()?.offerToken ?: return

        val params = BillingFlowParams.newBuilder()
            .setProductDetailsParamsList(listOf(
                BillingFlowParams.ProductDetailsParams.newBuilder()
                    .setProductDetails(productDetails)
                    .setOfferToken(offerToken)
                    .build()
            )).build()

        billingClient.launchBillingFlow(activity, params)
    }

    /**
     * Handle a completed purchase:
     * 1. Verify server-side via Cloud Function
     * 2. Acknowledge the purchase (Google requirement)
     * 3. Update local premium state
     */
    private fun handlePurchase(purchase: Purchase) {
        if (purchase.purchaseState == Purchase.PurchaseState.PURCHASED) {
            scope.launch {
                try {
                    // Server-side verification writes subscription data to Firestore
                    cloudFunctions.verifyGooglePlayPurchase(
                        purchaseToken = purchase.purchaseToken,
                        productId = purchase.products.first()
                    )

                    // Acknowledge purchase — required within 3 days or auto-refund
                    if (!purchase.isAcknowledged) {
                        val ackParams = AcknowledgePurchaseParams.newBuilder()
                            .setPurchaseToken(purchase.purchaseToken)
                            .build()
                        billingClient.acknowledgePurchase(ackParams) { /* no-op */ }
                    }

                    _isPremium.value = true
                } catch (_: Exception) {
                    // Verification failed — user stays on free tier
                    // Cloud Function logs the error for debugging
                }
            }
        }
    }

    /**
     * Check existing purchases to determine if the user has an active
     * premium subscription. Called on app start and after reconnection.
     */
    private fun queryPurchases() {
        billingClient.queryPurchasesAsync(
            QueryPurchasesParams.newBuilder()
                .setProductType(BillingClient.ProductType.SUBS)
                .build()
        ) { _, purchases ->
            _isPremium.value = purchases.any {
                it.purchaseState == Purchase.PurchaseState.PURCHASED
            }
        }
    }

    /** Disconnect the billing client. Call from onDestroy. */
    fun endConnection() {
        billingClient.endConnection()
    }
}
