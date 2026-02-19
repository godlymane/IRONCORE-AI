// IronCore AI - Payment Service (Razorpay Integration)
// Handles subscriptions and premium status

import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getApp } from 'firebase/app';
import { db } from '../firebase';

// Pricing Plans
export const PRICING_PLANS = {
    free: {
        id: 'free',
        name: 'Free',
        price: 0,
        priceINR: 0,
        features: {
            aiCoachCalls: 3, // per day
            progressPhotos: 5, // total
            workoutHistory: 7, // days
            battlePassTrack: 'free',
            guilds: false,
            unlimitedHistory: false
        }
    },
    pro_monthly: {
        id: 'pro_monthly',
        name: 'Pro Monthly',
        price: 3.49, // USD
        priceINR: 299,
        razorpayPlanId: null, // Set after creating plan in Razorpay dashboard
        features: {
            aiCoachCalls: Infinity,
            progressPhotos: Infinity,
            workoutHistory: Infinity,
            battlePassTrack: 'premium',
            guilds: true,
            unlimitedHistory: true
        }
    },
    pro_yearly: {
        id: 'pro_yearly',
        name: 'Pro Yearly',
        price: 23.99, // USD
        priceINR: 1999,
        razorpayPlanId: null, // Set after creating plan in Razorpay dashboard
        features: {
            aiCoachCalls: Infinity,
            progressPhotos: Infinity,
            workoutHistory: Infinity,
            battlePassTrack: 'premium',
            guilds: true,
            unlimitedHistory: true
        }
    }
};

// Initialize Razorpay checkout
export const initializeRazorpay = () => {
    return new Promise((resolve) => {
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
    });
};

// Create a payment order via Cloud Function (server-side Razorpay order creation)
// Amount is determined server-side only — client never sends price
export const createPaymentOrder = async (planId, userId) => {
    const plan = PRICING_PLANS[planId];
    if (!plan || plan.price === 0) {
        throw new Error('Invalid plan selected');
    }

    try {
        const functions = getFunctions(getApp());
        const createOrder = httpsCallable(functions, 'createRazorpayOrder');
        const result = await createOrder({ planId });

        if (!result.data?.orderId) {
            throw new Error('Server did not return a valid order ID');
        }

        return {
            planId,
            orderId: result.data.orderId,
            amount: result.data.amount,
            currency: result.data.currency,
            userId,
        };
    } catch (e) {
        console.error('Failed to create Razorpay order:', e);
        throw new Error('Could not create payment order. Try again later.');
    }
};

// Open Razorpay checkout
export const openCheckout = async (orderData, userInfo, onSuccess, onFailure) => {
    const isLoaded = await initializeRazorpay();

    if (!isLoaded) {
        onFailure(new Error('Failed to load Razorpay SDK'));
        return;
    }

    const plan = PRICING_PLANS[orderData.planId];

    if (!orderData.orderId) {
        onFailure(new Error('Missing order ID — payment cannot be verified securely.'));
        return;
    }

    const options = {
        key: (() => {
            const k = import.meta.env.VITE_RAZORPAY_KEY_ID;
            if (!k) throw new Error('VITE_RAZORPAY_KEY_ID is not set — cannot initialize payment.');
            return k;
        })(),
        order_id: orderData.orderId, // Server-generated Razorpay order ID — required for signature verification
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'IronCore AI',
        description: `${plan.name} Subscription`,
        image: '/icon-192.png',
        prefill: {
            name: userInfo.displayName || '',
            email: userInfo.email || '',
            contact: userInfo.phone || ''
        },
        theme: {
            color: '#DC2626'
        },
        handler: async function (response) {
            // Payment successful — verify server-side with order_id + signature
            if (!response.razorpay_order_id || !response.razorpay_signature) {
                onFailure(new Error('Payment response missing verification data.'));
                return;
            }
            try {
                await activateSubscription(orderData.userId, orderData.planId, response);
                onSuccess(response);
            } catch (error) {
                onFailure(error);
            }
        },
        modal: {
            ondismiss: function () {
                console.log('Payment modal closed');
            }
        }
    };

    const razorpay = new window.Razorpay(options);
    razorpay.on('payment.failed', function (response) {
        onFailure(new Error(response.error.description));
    });
    razorpay.open();
};

// Activate subscription via server-side Cloud Function (validates payment server-side)
// All three Razorpay fields are REQUIRED — server rejects if any are missing
export const activateSubscription = async (userId, planId, paymentResponse) => {
    if (!paymentResponse.razorpay_payment_id || !paymentResponse.razorpay_order_id || !paymentResponse.razorpay_signature) {
        throw new Error('Incomplete payment response — cannot verify.');
    }

    try {
        const functions = getFunctions(getApp());
        const verifyPayment = httpsCallable(functions, 'verifyPayment');
        const result = await verifyPayment({
            paymentId: paymentResponse.razorpay_payment_id,
            orderId: paymentResponse.razorpay_order_id,
            signature: paymentResponse.razorpay_signature,
            planId,
        });
        return result.data.subscription;
    } catch (e) {
        console.error('Server-side payment verification failed:', e);
        throw new Error('Payment verification failed. Contact support if charged.');
    }
};

// Check if user has active premium subscription
export const checkPremiumStatus = async (userId) => {
    if (!userId) return { isPremium: false, plan: 'free' };

    try {
        // Read from the same path useFitnessData writes to
        const profileRef = doc(db, 'users', userId, 'data', 'profile');
        const profileDoc = await getDoc(profileRef);

        if (!profileDoc.exists()) {
            return { isPremium: false, plan: 'free' };
        }

        const profileData = profileDoc.data();
        const subscription = profileData.subscription;

        if (!subscription || subscription.status !== 'active') {
            return { isPremium: false, plan: 'free' };
        }

        // Check if subscription has expired
        const expiryDate = new Date(subscription.expiryDate);
        if (expiryDate < new Date()) {
            // Subscription expired, update status
            await updateDoc(profileRef, {
                'subscription.status': 'expired',
                isPremium: false
            });
            return { isPremium: false, plan: 'free', expired: true };
        }

        return {
            isPremium: true,
            plan: subscription.planId,
            expiryDate: subscription.expiryDate,
            features: PRICING_PLANS[subscription.planId]?.features || PRICING_PLANS.free.features
        };
    } catch (error) {
        console.error('Error checking premium status:', error);
        return { isPremium: false, plan: 'free' };
    }
};

// Get feature limits for current plan
export const getFeatureLimits = (isPremium, planId = 'free') => {
    const plan = isPremium ? PRICING_PLANS[planId] : PRICING_PLANS.free;
    return plan?.features || PRICING_PLANS.free.features;
};

// Check if a specific feature is available
export const canUseFeature = (feature, isPremium, planId = 'free') => {
    const limits = getFeatureLimits(isPremium, planId);
    const limit = limits[feature];

    if (limit === Infinity || limit === true) return true;
    if (limit === false || limit === 0) return false;

    return limit; // Returns the limit number
};

// Payment Service module
