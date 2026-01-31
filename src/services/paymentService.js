// IronCore AI - Payment Service (Razorpay Integration)
// Handles subscriptions and premium status

import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
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
        price: 5.99, // USD
        priceINR: 499,
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
        price: 49.99, // USD
        priceINR: 3999,
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

// Create a payment order
export const createPaymentOrder = async (planId, userId) => {
    const plan = PRICING_PLANS[planId];
    if (!plan || plan.price === 0) {
        throw new Error('Invalid plan selected');
    }

    // In production, this should call your backend to create a Razorpay order
    // For now, we'll use client-side checkout (test mode)
    return {
        planId,
        amount: plan.priceINR * 100, // Razorpay expects paise
        currency: 'INR',
        userId
    };
};

// Open Razorpay checkout
export const openCheckout = async (orderData, userInfo, onSuccess, onFailure) => {
    const isLoaded = await initializeRazorpay();

    if (!isLoaded) {
        onFailure(new Error('Failed to load Razorpay SDK'));
        return;
    }

    const plan = PRICING_PLANS[orderData.planId];

    const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_YOUR_KEY', // Replace with your key
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'IronCore AI',
        description: `${plan.name} Subscription`,
        image: '/icon-192.png', // Your app logo
        prefill: {
            name: userInfo.displayName || '',
            email: userInfo.email || '',
            contact: userInfo.phone || ''
        },
        theme: {
            color: '#DC2626' // Your brand red
        },
        handler: async function (response) {
            // Payment successful
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

// Activate subscription in Firestore
export const activateSubscription = async (userId, planId, paymentResponse) => {
    const plan = PRICING_PLANS[planId];
    const now = new Date();

    // Calculate expiry based on plan
    const expiryDate = new Date(now);
    if (planId === 'pro_yearly') {
        expiryDate.setFullYear(expiryDate.getFullYear() + 1);
    } else {
        expiryDate.setMonth(expiryDate.getMonth() + 1);
    }

    const subscriptionData = {
        planId,
        status: 'active',
        startDate: now.toISOString(),
        expiryDate: expiryDate.toISOString(),
        paymentId: paymentResponse.razorpay_payment_id,
        orderId: paymentResponse.razorpay_order_id || null,
        signature: paymentResponse.razorpay_signature || null,
        updatedAt: serverTimestamp()
    };

    // Update user's subscription in Firestore
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
        subscription: subscriptionData,
        isPremium: true
    });

    // Also store in subscriptions collection for analytics
    const subRef = doc(db, 'subscriptions', `${userId}_${paymentResponse.razorpay_payment_id}`);
    await setDoc(subRef, {
        userId,
        ...subscriptionData,
        createdAt: serverTimestamp()
    });

    return subscriptionData;
};

// Check if user has active premium subscription
export const checkPremiumStatus = async (userId) => {
    if (!userId) return { isPremium: false, plan: 'free' };

    try {
        const userRef = doc(db, 'users', userId);
        const userDoc = await getDoc(userRef);

        if (!userDoc.exists()) {
            return { isPremium: false, plan: 'free' };
        }

        const userData = userDoc.data();
        const subscription = userData.subscription;

        if (!subscription || subscription.status !== 'active') {
            return { isPremium: false, plan: 'free' };
        }

        // Check if subscription has expired
        const expiryDate = new Date(subscription.expiryDate);
        if (expiryDate < new Date()) {
            // Subscription expired, update status
            await updateDoc(userRef, {
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

console.log('✅ Payment Service loaded');
