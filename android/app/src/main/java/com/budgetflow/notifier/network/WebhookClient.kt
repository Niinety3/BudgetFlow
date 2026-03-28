package com.budgetflow.notifier.network

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.util.concurrent.TimeUnit

object WebhookClient {

    private val client = OkHttpClient.Builder()
        .connectTimeout(10, TimeUnit.SECONDS)
        .writeTimeout(10, TimeUnit.SECONDS)
        .readTimeout(10, TimeUnit.SECONDS)
        .build()

    private const val JSON_MEDIA_TYPE = "application/json; charset=utf-8"

    suspend fun sendTransaction(
        webhookUrl: String,
        apiKey: String,
        merchant: String,
        amount: Double,
        cardDigits: String?
    ): Result<String> = withContext(Dispatchers.IO) {
        try {
            val json = JSONObject().apply {
                put("merchant", merchant)
                put("amount", amount)
                put("api_key", apiKey)
                if (cardDigits != null) {
                    put("card_digits", cardDigits)
                }
            }

            val body = json.toString().toRequestBody(JSON_MEDIA_TYPE.toMediaType())
            val request = Request.Builder()
                .url(webhookUrl)
                .post(body)
                .build()

            val response = client.newCall(request).execute()
            val responseBody = response.body?.string() ?: ""

            if (response.isSuccessful) {
                Result.success(responseBody)
            } else {
                Result.failure(Exception("HTTP ${response.code}: $responseBody"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun categoriseTransaction(
        webhookUrl: String,
        apiKey: String,
        transactionId: String,
        categoryName: String
    ): Result<String> = withContext(Dispatchers.IO) {
        try {
            val json = JSONObject().apply {
                put("transaction_id", transactionId)
                put("category_name", categoryName)
                put("api_key", apiKey)
            }

            val body = json.toString().toRequestBody(JSON_MEDIA_TYPE.toMediaType())
            // Replace ingest-transaction with categorise-transaction in the URL
            val url = webhookUrl.replace("ingest-transaction", "categorise-transaction")
            val request = Request.Builder()
                .url(url)
                .post(body)
                .build()

            val response = client.newCall(request).execute()
            val responseBody = response.body?.string() ?: ""

            if (response.isSuccessful) {
                Result.success(responseBody)
            } else {
                Result.failure(Exception("HTTP ${response.code}: $responseBody"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
