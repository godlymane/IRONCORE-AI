package com.ironcore.fit.data.repository

import android.app.Activity
import android.content.Context
import com.android.billingclient.api.*
import com.ironcore.fit.data.remote.CloudFunctions
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.suspendCancellableCoroutine
import javax.inject.Inject
import javax.inject.Singleton
import kotlin.coroutines.resume

/**
 * Google Play Billing Library v7 wrapper.
 *
 * Product IDs match Apple StoreKit IDs for cross-platform parity:
 *   - com.ironcore.fit.pro_monthly  → $12.99/mo
 *   - com.ironcore.fit.pro_yearly   → $79.99/yr
 *   - com.ironcore.fit.battlepass   → $4.99-9.99 one-time per season
 *
 * Flow:
 * 1. Connect billing client on app start
 * 2. Query product details from Play Console
 * 3. Launch purchase flow (returns to onPurchasesUpdated)
 * 4. Verify purchase server-side via Cloud Function
 * 5. Acknowledge purchase (required within 3 days or auto-refund)
 */
@Singleton
class BillingRepository @Inject constructor(
    @ApplicationContext private val context: Context,
    private val cloudFunctions: CloudFunctions
) {

    companion object {
        const val PRODUCT_PRO_MONTHLY = "com.ironcore.fit.pro_monthly"
        const val PRODUCT_PRO_YEARLY = "com.ironcore.fit.pro_yearly"
        const val PRODUCT_BATTLE_PASS = "com.ironcore.fit.battlepass"
    }

    private var billingClient: BillingClient? = null

    private val _connectionState = MutableStateFlow(false)
    val isConnected: StateFlow<Boolean> = _connectionState.asStateFlow()

    private val _subscriptionProducts = MutableStateFlow<List<ProductDetails>>(emptyList())
    val subscriptionProducts: StateFlow<List<ProductDetails>> = _subscriptionProducts.asStateFlow()

    private val _inAppProducts = MutableStateFlow<List<ProductDetails>>(emptyList())
    val inAppProducts: StateFlow<List<ProductDetails>> = _inAppProducts.asStateFlow()

    private val _purchases = MutableStateFlow<List<Purchase>>(emptyList())
    val purchases: StateFlow<List<Purchase>> = _purchases.asStateFlow()

    private var purchaseCallback: ((BillingResult, List<Purchase>?) -> Unit)? = null

    // ── Connection ──────────────────────────────────────────────

    fun connect() {
        billingClient = BillingClient.newBuilder(context)
            .setListener { billingResult, purchases ->
                purchaseCallback?.invoke(billingResult, purchases)
            }
            .enablePendingPurchases(
                PendingPurchasesParams.newBuilder()
                    .enableOneTimeProducts()
                    .enablePrepaidPlans()
                    .build()
            )
            .build()

        billingClient?.startConnection(object : BillingClientStateListener {
            override fun onBillingSetupFinished(billingResult: BillingResult) {
                if (billingResult.responseCode == BillingClient.BillingResponseCode.OK) {
                    _connectionState.value = true
                }
            }

            override fun onBillingServiceDisconnected() {
                _connectionState.value = false
                // Retry connection
                connect()
            }
        })
    }

    fun disconnect() {
        billingClient?.endConnection()
        billingClient = null
        _connectionState.value = false
    }

    // ── Query Products ──────────────────────────────────────────

    suspend fun querySubscriptionProducts() {
        val client = billingClient ?: return

        val params = QueryProductDetailsParams.newBuilder()
            .setProductList(
                listOf(
                    QueryProductDetailsParams.Product.newBuilder()
                        .setProductId(PRODUCT_PRO_MONTHLY)
                        .setProductType(BillingClient.ProductType.SUBS)
                        .build(),
                    QueryProductDetailsParams.Product.newBuilder()
                        .setProductId(PRODUCT_PRO_YEARLY)
                        .setProductType(BillingClient.ProductType.SUBS)
                        .build()
                )
            )
            .build()

        val result = client.queryProductDetails(params)
        if (result.billingResult.responseCode == BillingClient.BillingResponseCode.OK) {
            _subscriptionProducts.value = result.productDetailsList ?: emptyList()
        }
    }

    suspend fun queryInAppProducts() {
        val client = billingClient ?: return

        val params = QueryProductDetailsParams.newBuilder()
            .setProductList(
                listOf(
                    QueryProductDetailsParams.Product.newBuilder()
                        .setProductId(PRODUCT_BATTLE_PASS)
                        .setProductType(BillingClient.ProductType.INAPP)
                        .build()
                )
            )
            .build()

        val result = client.queryProductDetails(params)
        if (result.billingResult.responseCode == BillingClient.BillingResponseCode.OK) {
            _inAppProducts.value = result.productDetailsList ?: emptyList()
        }
    }

    // ── Launch Purchase ─────────────────────────────────────────

    /**
     * Launch the Google Play purchase flow for a subscription.
     * Returns the Purchase on success, null on cancellation/failure.
     */
    suspend fun launchSubscriptionPurchase(
        activity: Activity,
        productDetails: ProductDetails,
        offerToken: String
    ): Purchase? = suspendCancellableCoroutine { cont ->
        val client = billingClient ?: run {
            cont.resume(null)
            return@suspendCancellableCoroutine
        }

        purchaseCallback = { billingResult, purchases ->
            purchaseCallback = null
            if (billingResult.responseCode == BillingClient.BillingResponseCode.OK
                && purchases != null && purchases.isNotEmpty()
            ) {
                cont.resume(purchases.first())
            } else {
                cont.resume(null)
            }
        }

        val flowParams = BillingFlowParams.newBuilder()
            .setProductDetailsParamsList(
                listOf(
                    BillingFlowParams.ProductDetailsParams.newBuilder()
                        .setProductDetails(productDetails)
                        .setOfferToken(offerToken)
                        .build()
                )
            )
            .build()

        client.launchBillingFlow(activity, flowParams)
    }

    /** Launch purchase flow for a one-time in-app product (Battle Pass). */
    suspend fun launchInAppPurchase(
        activity: Activity,
        productDetails: ProductDetails
    ): Purchase? = suspendCancellableCoroutine { cont ->
        val client = billingClient ?: run {
            cont.resume(null)
            return@suspendCancellableCoroutine
        }

        purchaseCallback = { billingResult, purchases ->
            purchaseCallback = null
            if (billingResult.responseCode == BillingClient.BillingResponseCode.OK
                && purchases != null && purchases.isNotEmpty()
            ) {
                cont.resume(purchases.first())
            } else {
                cont.resume(null)
            }
        }

        val flowParams = BillingFlowParams.newBuilder()
            .setProductDetailsParamsList(
                listOf(
                    BillingFlowParams.ProductDetailsParams.newBuilder()
                        .setProductDetails(productDetails)
                        .build()
                )
            )
            .build()

        client.launchBillingFlow(activity, flowParams)
    }

    // ── Verification & Acknowledgement ──────────────────────────

    /**
     * After successful purchase:
     * 1. Send to Cloud Function for server-side verification
     * 2. Acknowledge the purchase (Google refunds unacknowledged purchases after 3 days)
     */
    suspend fun verifyAndAcknowledge(purchase: Purchase): Boolean {
        // Server-side verification via Cloud Function
        val result = cloudFunctions.verifyGooglePlayPurchase(
            purchaseToken = purchase.purchaseToken,
            productId = purchase.products.first()
        )

        val verified = result["success"] as? Boolean ?: false
        if (!verified) return false

        // Acknowledge the purchase
        if (purchase.purchaseState == Purchase.PurchaseState.PURCHASED
            && !purchase.isAcknowledged
        ) {
            val ackParams = AcknowledgePurchaseParams.newBuilder()
                .setPurchaseToken(purchase.purchaseToken)
                .build()
            val ackResult = billingClient?.acknowledgePurchase(ackParams)
            return ackResult?.responseCode == BillingClient.BillingResponseCode.OK
        }

        return true
    }

    // ── Restore Purchases ───────────────────────────────────────

    suspend fun queryExistingPurchases() {
        val client = billingClient ?: return

        val subsParams = QueryPurchasesParams.newBuilder()
            .setProductType(BillingClient.ProductType.SUBS)
            .build()
        val subsResult = client.queryPurchasesAsync(subsParams)

        val inAppParams = QueryPurchasesParams.newBuilder()
            .setProductType(BillingClient.ProductType.INAPP)
            .build()
        val inAppResult = client.queryPurchasesAsync(inAppParams)

        val allPurchases = mutableListOf<Purchase>()
        if (subsResult.billingResult.responseCode == BillingClient.BillingResponseCode.OK) {
            allPurchases.addAll(subsResult.purchasesList)
        }
        if (inAppResult.billingResult.responseCode == BillingClient.BillingResponseCode.OK) {
            allPurchases.addAll(inAppResult.purchasesList)
        }
        _purchases.value = allPurchases
    }
}
