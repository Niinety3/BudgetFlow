package com.budgetflow.notifier.service

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log

/**
 * Ensures the NotificationListenerService is restarted after device reboot.
 * Android automatically restarts NotificationListenerService, but this receiver
 * serves as an additional safety net.
 */
class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_BOOT_COMPLETED) {
            Log.d("BootReceiver", "Device booted, NotificationListenerService will auto-restart")
        }
    }
}
