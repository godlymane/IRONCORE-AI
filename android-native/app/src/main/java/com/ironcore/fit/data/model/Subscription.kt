package com.ironcore.fit.data.model

import com.google.firebase.Timestamp
import com.google.firebase.firestore.ServerTimestamp

/**
 * Firestore path: /subscriptions/{userId}_{paymentId}
 * Also: /subscriptions/{userId}_apple_{transactionId}
 */
data class Subscription(
    val id: String = "",
    val userId: String = "",
    val planId: String = "",
    val status: String = "active",
    val startDate: String = "",
    val expiryDate: String = "",
    val paymentId: String = "",
    val orderId: String = "",
    val updatedAt: Timestamp? = null,
    @ServerTimestamp val createdAt: Timestamp? = null
)

/**
 * Firestore path: /orders/{orderId}
 * Server-created via Cloud Function, client reads only.
 */
data class Order(
    val id: String = "",
    val userId: String = "",
    val planId: String = "",
    val amount: Int = 0,
    val currency: String = "USD",
    val razorpayOrderId: String = "",
    val status: String = "created",
    val paymentId: String = "",
    @ServerTimestamp val createdAt: Timestamp? = null,
    val paidAt: Timestamp? = null
)
