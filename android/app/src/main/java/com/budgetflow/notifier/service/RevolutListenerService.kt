package com.budgetflow.notifier.service

import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.util.Log
import com.budgetflow.notifier.parser.NotificationParser
import com.budgetflow.notifier.network.WebhookClient
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import androidx.datastore.preferences.core.stringPreferencesKey
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map

class RevolutListenerService : NotificationListenerService() {

    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())

    companion object {
        private const val TAG = "RevolutListener"
        private const val REVOLUT_PACKAGE = "com.revolut.revolut"
    }

    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        if (sbn == null) return
        if (sbn.packageName != REVOLUT_PACKAGE) return

        val extras = sbn.notification.extras
        val text = extras.getCharSequence("android.text")?.toString()
            ?: extras.getCharSequence("android.bigText")?.toString()
            ?: return

        Log.d(TAG, "Revolut notification: $text")

        val parsed = NotificationParser.parse(text)
        if (parsed == null) {
            Log.d(TAG, "Could not parse notification, skipping")
            return
        }

        Log.d(TAG, "Parsed: ${parsed.merchant} £${parsed.amount} card:${parsed.cardDigits}")

        scope.launch {
            try {
                val dataStore = applicationContext.dataStore
                val prefs = dataStore.data.first()
                val webhookUrl = prefs[stringPreferencesKey("webhook_url")] ?: return@launch
                val apiKey = prefs[stringPreferencesKey("api_key")] ?: return@launch

                val result = WebhookClient.sendTransaction(
                    webhookUrl = webhookUrl,
                    apiKey = apiKey,
                    merchant = parsed.merchant,
                    amount = parsed.amount,
                    cardDigits = parsed.cardDigits
                )

                result.fold(
                    onSuccess = { Log.d(TAG, "Transaction sent: $it") },
                    onFailure = { Log.e(TAG, "Failed to send transaction", it) }
                )
            } catch (e: Exception) {
                Log.e(TAG, "Error processing notification", e)
            }
        }
    }
}
