// IronCore AI - Google Play Billing Service
// Wraps cordova-plugin-purchase for Capacitor Android

import { getFunctions, httpsCallable } from 'firebase/functions';
import { getApp } from 'firebase/app';
import 'cordova-plugin-purchase/www/store';

const { CdvPurchase } = window;

// Google Play product IDs — must match Play Console entries
const PRODUCT_IDS = [
    'pro_monthly',
    'pro_yearly',
    'elite_monthly',
    'elite_yearly',
];

let storeInitialized = false;

/**
 * Initialize the CdvPurchase store and register products.
 * Call once on app start (after deviceready / Capacitor ready).
 */
export const initStore = () => {
    if (storeInitialized || !CdvPurchase) return;

    const store = CdvPurchase.store;

    // Register all subscription products
    PRODUCT_IDS.forEach(id => {
        store.register({
            id,
            type: CdvPurchase.ProductType.PAID_SUBSCRIPTION,
            platform: CdvPurchase.Platform.GOOGLE_PLAY,
        });
    });

    // Set up receipt verification via Cloud Function
    store.validator = async (receipt, callback) => {
        try {
            const transaction = receipt.transactions?.[0];
            if (!transaction) {
                callback({ ok: false, message: 'No transaction found' });
                return;
            }

            const purchaseToken = transaction.purchaseToken || transaction.receipt;
            const productId = transaction.products?.[0]?.id || receipt.products?.[0]?.id;

            if (!purchaseToken || !productId) {
                callback({ ok: false, message: 'Missing purchase token or product ID' });
                return;
            }

            const functions = getFunctions(getApp());
            const verify = httpsCallable(functions, 'verifyGooglePlayPurchase');
            const result = await verify({ purchaseToken, productId });

            if (result.data?.success) {
                callback({ ok: true, data: { transaction: { type: 'android-playstore' } } });
            } else {
                callback({ ok: false, message: result.data?.error || 'Verification failed' });
            }
        } catch (err) {
            console.error('[PlayBilling] Verification error:', err);
            callback({ ok: false, message: err.message });
        }
    };

    store.initialize([CdvPurchase.Platform.GOOGLE_PLAY]);
    storeInitialized = true;
};

/**
 * Get the CdvPurchase product object for a given plan ID.
 */
export const getProduct = (planId) => {
    if (!CdvPurchase) return null;
    return CdvPurchase.store.get(planId, CdvPurchase.Platform.GOOGLE_PLAY);
};

/**
 * Get all registered products with their Play Store prices.
 */
export const getProducts = () => {
    if (!CdvPurchase) return [];
    return PRODUCT_IDS.map(id => CdvPurchase.store.get(id, CdvPurchase.Platform.GOOGLE_PLAY)).filter(Boolean);
};

/**
 * Launch the Google Play purchase flow for a subscription.
 * Returns a promise that resolves when the purchase is verified or rejects on error.
 */
export const purchaseSubscription = (planId) => {
    return new Promise((resolve, reject) => {
        if (!CdvPurchase) {
            reject(new Error('Billing not available'));
            return;
        }

        const product = getProduct(planId);
        if (!product) {
            reject(new Error(`Product ${planId} not found`));
            return;
        }

        const offer = product.getOffer();
        if (!offer) {
            reject(new Error(`No offer found for ${planId}`));
            return;
        }

        const store = CdvPurchase.store;

        const onApproved = (transaction) => {
            transaction.verify();
        };

        const onVerified = (receipt) => {
            receipt.finish();
            cleanup();
            resolve({ success: true, planId });
        };

        const onError = (error) => {
            cleanup();
            reject(new Error(error.message || 'Purchase failed'));
        };

        const cleanup = () => {
            store.off(onApproved);
            store.off(onVerified);
            store.off(onError);
        };

        store.when()
            .approved(onApproved)
            .verified(onVerified);
        store.error(onError);

        offer.order()
            .then(error => {
                if (error) {
                    cleanup();
                    reject(new Error(error.message || 'Order failed'));
                }
            });
    });
};

/**
 * Restore previous purchases (e.g., after reinstall or device switch).
 * Triggers re-verification of owned subscriptions.
 */
export const restorePurchases = async () => {
    if (!CdvPurchase) return { restored: false, message: 'Billing not available' };

    try {
        await CdvPurchase.store.restorePurchases();
        return { restored: true };
    } catch (err) {
        return { restored: false, message: err.message || 'Restore failed' };
    }
};
