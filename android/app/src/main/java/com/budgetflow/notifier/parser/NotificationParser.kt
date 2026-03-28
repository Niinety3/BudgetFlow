package com.budgetflow.notifier.parser

data class ParsedTransaction(
    val merchant: String,
    val amount: Double,
    val cardDigits: String?
)

object NotificationParser {

    private val PAYMENT_PATTERNS = listOf(
        // "You paid £34.50 at M&S"
        Regex("""(?:You )?[Pp]aid\s+£(\d+\.?\d*)\s+at\s+(.+?)(?:\s+with\s+[•*]+(\d{4}))?\s*$"""),
        // "£34.50 paid at M&S"
        Regex("""£(\d+\.?\d*)\s+(?:paid\s+)?(?:at|to)\s+(.+?)(?:\s+with\s+[•*]+(\d{4}))?\s*$"""),
        // "Payment of £34.50 to M&S"
        Regex("""(?:Payment|Charge)\s+of\s+£(\d+\.?\d*)\s+(?:at|to)\s+(.+?)$""", RegexOption.IGNORE_CASE),
        // "💳 Paid £34.50 at M&S"
        Regex("""💳\s*(?:You )?[Pp]aid\s+£(\d+\.?\d*)\s+at\s+(.+?)(?:\s+with\s+[•*]+(\d{4}))?\s*$"""),
    )

    private val SKIP_PATTERNS = listOf(
        Regex("""(?i)declined"""),
        Regex("""(?i)received"""),
        Regex("""(?i)topped up"""),
        Regex("""(?i)exchanged"""),
        Regex("""(?i)refund"""),
    )

    fun parse(notificationText: String): ParsedTransaction? {
        // Skip non-payment notifications
        for (pattern in SKIP_PATTERNS) {
            if (pattern.containsMatchIn(notificationText)) {
                return null
            }
        }

        // Try each payment pattern
        for (pattern in PAYMENT_PATTERNS) {
            val match = pattern.find(notificationText)
            if (match != null) {
                val amount = match.groupValues[1].toDoubleOrNull() ?: continue
                val merchant = match.groupValues[2].trim()
                val cardDigits = match.groupValues.getOrNull(3)?.takeIf { it.isNotEmpty() }

                if (merchant.isNotEmpty() && amount > 0) {
                    return ParsedTransaction(
                        merchant = merchant,
                        amount = amount,
                        cardDigits = cardDigits
                    )
                }
            }
        }

        return null
    }
}
