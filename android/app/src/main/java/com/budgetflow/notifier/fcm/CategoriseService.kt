package com.budgetflow.notifier.fcm

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log
import androidx.core.app.NotificationCompat
import com.budgetflow.notifier.MainActivity
import com.budgetflow.notifier.network.WebhookClient
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import com.budgetflow.notifier.service.dataStore
import androidx.datastore.preferences.core.stringPreferencesKey
import kotlinx.coroutines.flow.first
import org.json.JSONArray

class CategoriseService : FirebaseMessagingService() {

    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())

    companion object {
        private const val TAG = "CategoriseService"
        private const val CHANNEL_ID = "budgetflow_review"
        private const val NOTIFICATION_ID = 1001
    }

    override fun onNewToken(token: String) {
        Log.d(TAG, "New FCM token: $token")
        // Token will be registered with BudgetFlow when user enters API key
    }

    override fun onMessageReceived(message: RemoteMessage) {
        val data = message.data
        val type = data["type"] ?: return

        if (type == "needs_review") {
            val merchant = data["merchant"] ?: return
            val amount = data["amount"] ?: return
            val transactionId = data["transaction_id"] ?: return
            val categoriesJson = data["categories"] ?: "[]"

            val categories = try {
                val arr = JSONArray(categoriesJson)
                (0 until arr.length()).map { arr.getString(it) }
            } catch (e: Exception) {
                emptyList()
            }

            showReviewNotification(merchant, amount, transactionId, categories)
        }
    }

    private fun showReviewNotification(
        merchant: String,
        amount: String,
        transactionId: String,
        categories: List<String>
    ) {
        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

        // Create notification channel
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Transaction Review",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Notifications for transactions that need categorisation"
            }
            notificationManager.createNotificationChannel(channel)
        }

        val builder = NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle("BudgetFlow")
            .setContentText("$merchant £$amount — ${categories.joinToString(" or ")}?")
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)

        // Add action buttons for each category option
        categories.forEachIndexed { index, category ->
            val intent = Intent(this, CategoryActionReceiver::class.java).apply {
                action = "CATEGORISE_$index"
                putExtra("transaction_id", transactionId)
                putExtra("category_name", category)
            }
            val pendingIntent = PendingIntent.getBroadcast(
                this, index, intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            builder.addAction(0, category, pendingIntent)
        }

        // Default tap opens the app
        val mainIntent = Intent(this, MainActivity::class.java)
        val mainPendingIntent = PendingIntent.getActivity(
            this, 0, mainIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        builder.setContentIntent(mainPendingIntent)

        notificationManager.notify(NOTIFICATION_ID + transactionId.hashCode(), builder.build())
    }
}
