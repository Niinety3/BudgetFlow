package com.budgetflow.notifier.fcm

import android.app.NotificationManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import com.budgetflow.notifier.network.WebhookClient
import com.budgetflow.notifier.service.dataStore
import androidx.datastore.preferences.core.stringPreferencesKey
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch

/**
 * Receives taps on notification action buttons (e.g. "Groceries" / "Shopping")
 * and sends the categorisation to the BudgetFlow webhook.
 */
class CategoryActionReceiver : BroadcastReceiver() {

    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())

    companion object {
        private const val TAG = "CategoryAction"
    }

    override fun onReceive(context: Context, intent: Intent) {
        val transactionId = intent.getStringExtra("transaction_id") ?: return
        val categoryName = intent.getStringExtra("category_name") ?: return

        Log.d(TAG, "Categorising $transactionId as $categoryName")

        // Dismiss the notification
        val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        notificationManager.cancel(1001 + transactionId.hashCode())

        scope.launch {
            try {
                val prefs = context.dataStore.data.first()
                val webhookUrl = prefs[stringPreferencesKey("webhook_url")] ?: return@launch
                val apiKey = prefs[stringPreferencesKey("api_key")] ?: return@launch

                val result = WebhookClient.categoriseTransaction(
                    webhookUrl = webhookUrl,
                    apiKey = apiKey,
                    transactionId = transactionId,
                    categoryName = categoryName
                )

                result.fold(
                    onSuccess = { Log.d(TAG, "Categorised: $it") },
                    onFailure = { Log.e(TAG, "Failed to categorise", it) }
                )
            } catch (e: Exception) {
                Log.e(TAG, "Error categorising", e)
            }
        }
    }
}
