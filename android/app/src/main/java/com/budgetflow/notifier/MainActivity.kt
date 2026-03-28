package com.budgetflow.notifier

import android.content.ComponentName
import android.content.Intent
import android.os.Bundle
import android.provider.Settings
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import com.budgetflow.notifier.network.WebhookClient
import com.budgetflow.notifier.service.RevolutListenerService
import com.budgetflow.notifier.service.dataStore
import com.google.firebase.messaging.FirebaseMessaging
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.launch

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            MaterialTheme(
                colorScheme = darkColorScheme()
            ) {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    SettingsScreen()
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen() {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val dataStore = context.dataStore

    var webhookUrl by remember { mutableStateOf("") }
    var apiKey by remember { mutableStateOf("") }
    var michaelDigits by remember { mutableStateOf("") }
    var klaudiaDigits by remember { mutableStateOf("") }
    var isListening by remember { mutableStateOf(false) }
    var isSaving by remember { mutableStateOf(false) }

    // Load saved settings
    LaunchedEffect(Unit) {
        val prefs = dataStore.data.first()
        webhookUrl = prefs[stringPreferencesKey("webhook_url")] ?: "https://tsxckkiydmuefxptztha.supabase.co/functions/v1/ingest-transaction"
        apiKey = prefs[stringPreferencesKey("api_key")] ?: ""
        michaelDigits = prefs[stringPreferencesKey("michael_digits")] ?: ""
        klaudiaDigits = prefs[stringPreferencesKey("klaudia_digits")] ?: ""

        // Check if notification listener is enabled
        isListening = isNotificationListenerEnabled(context)
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        Text(
            text = "BudgetFlow Notifier",
            style = MaterialTheme.typography.headlineMedium,
            fontWeight = FontWeight.Bold
        )

        Text(
            text = "Captures Revolut transaction notifications and sends them to BudgetFlow automatically.",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )

        // Status card
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(
                containerColor = if (isListening && apiKey.isNotEmpty())
                    MaterialTheme.colorScheme.primaryContainer
                else MaterialTheme.colorScheme.errorContainer
            )
        ) {
            Row(
                modifier = Modifier.padding(16.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Text(
                    text = if (isListening && apiKey.isNotEmpty()) "✓ Listening"
                           else if (!isListening) "⚠ Permission needed"
                           else "⚠ API key needed",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold
                )
            }
        }

        if (!isListening) {
            Button(
                onClick = {
                    context.startActivity(Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS))
                },
                modifier = Modifier.fillMaxWidth()
            ) {
                Text("Enable Notification Access")
            }
        }

        HorizontalDivider()

        // Settings fields
        Text("Webhook Settings", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)

        OutlinedTextField(
            value = apiKey,
            onValueChange = { apiKey = it },
            label = { Text("API Key") },
            placeholder = { Text("From BudgetFlow Settings page") },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true
        )

        OutlinedTextField(
            value = webhookUrl,
            onValueChange = { webhookUrl = it },
            label = { Text("Webhook URL") },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true
        )

        HorizontalDivider()

        Text("Card Identification", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)

        Text(
            text = "Last 4 digits of each card, used to tag who made the purchase.",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )

        OutlinedTextField(
            value = michaelDigits,
            onValueChange = { if (it.length <= 4) michaelDigits = it.filter { c -> c.isDigit() } },
            label = { Text("Michael's card (last 4)") },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true
        )

        OutlinedTextField(
            value = klaudiaDigits,
            onValueChange = { if (it.length <= 4) klaudiaDigits = it.filter { c -> c.isDigit() } },
            label = { Text("Klaudia's card (last 4)") },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true
        )

        // Save button
        Button(
            onClick = {
                scope.launch {
                    isSaving = true
                    dataStore.edit { prefs ->
                        prefs[stringPreferencesKey("webhook_url")] = webhookUrl
                        prefs[stringPreferencesKey("api_key")] = apiKey
                        prefs[stringPreferencesKey("michael_digits")] = michaelDigits
                        prefs[stringPreferencesKey("klaudia_digits")] = klaudiaDigits
                    }

                    // Register FCM token with the webhook
                    FirebaseMessaging.getInstance().token.addOnSuccessListener { token ->
                        // The token is used by the server to send push notifications back
                        android.util.Log.d("FCM", "Token: $token")
                    }

                    isSaving = false
                    Toast.makeText(context, "Settings saved", Toast.LENGTH_SHORT).show()
                }
            },
            modifier = Modifier.fillMaxWidth(),
            enabled = !isSaving
        ) {
            Text(if (isSaving) "Saving..." else "Save Settings")
        }

        // Test button
        OutlinedButton(
            onClick = {
                scope.launch {
                    val result = WebhookClient.sendTransaction(
                        webhookUrl = webhookUrl,
                        apiKey = apiKey,
                        merchant = "Test Merchant",
                        amount = 1.00,
                        cardDigits = michaelDigits.takeIf { it.length == 4 }
                    )
                    result.fold(
                        onSuccess = {
                            Toast.makeText(context, "Test successful!", Toast.LENGTH_SHORT).show()
                        },
                        onFailure = {
                            Toast.makeText(context, "Test failed: ${it.message}", Toast.LENGTH_LONG).show()
                        }
                    )
                }
            },
            modifier = Modifier.fillMaxWidth()
        ) {
            Text("Send Test Transaction")
        }
    }
}

private fun isNotificationListenerEnabled(context: android.content.Context): Boolean {
    val enabledListeners = Settings.Secure.getString(
        context.contentResolver,
        "enabled_notification_listeners"
    ) ?: return false
    val componentName = ComponentName(context, RevolutListenerService::class.java).flattenToString()
    return enabledListeners.contains(componentName)
}
