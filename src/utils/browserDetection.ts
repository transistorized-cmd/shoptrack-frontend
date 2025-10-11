/**
 * Utility functions for detecting browser language, timezone, and other preferences
 */

/**
 * Get the user's preferred language from the browser
 * Returns language code like "en", "es", "fr" (without region)
 */
export function getBrowserLanguage(): string {
  // Get browser language (e.g., "en-US", "es-ES", "fr-FR")
  const fullLanguage = navigator.language || (navigator as any).userLanguage || 'en-US'

  // Extract just the language code (e.g., "en" from "en-US")
  const languageCode = fullLanguage.split('-')[0].toLowerCase()

  // Validate it's a 2-letter code
  if (languageCode.length === 2 && /^[a-z]{2}$/.test(languageCode)) {
    return languageCode
  }

  return 'en' // Default to English
}

/**
 * Get the user's timezone from the browser
 * Returns IANA timezone string like "America/New_York", "Europe/London", "UTC"
 */
export function getBrowserTimezone(): string {
  try {
    // Try to get timezone from Intl API
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
    if (timezone && timezone.length > 0) {
      return timezone
    }
  } catch (error) {
    console.warn('Failed to detect timezone:', error)
  }

  return 'UTC' // Default to UTC
}

/**
 * Infer preferred currency from browser language/region
 * This is a best-guess based on common patterns
 */
export function inferCurrencyFromLanguage(languageCode?: string): string {
  const lang = languageCode || getBrowserLanguage()
  const fullLanguage = navigator.language || 'en-US'

  // Map of region codes to currencies
  const regionToCurrency: Record<string, string> = {
    // United States
    'US': 'USD',
    // European Union countries
    'DE': 'EUR', 'FR': 'EUR', 'ES': 'EUR', 'IT': 'EUR', 'NL': 'EUR',
    'BE': 'EUR', 'AT': 'EUR', 'PT': 'EUR', 'IE': 'EUR', 'GR': 'EUR',
    'FI': 'EUR', 'LU': 'EUR', 'SI': 'EUR', 'CY': 'EUR', 'MT': 'EUR',
    'SK': 'EUR', 'EE': 'EUR', 'LV': 'EUR', 'LT': 'EUR',
    // United Kingdom
    'GB': 'GBP',
    // Canada
    'CA': 'CAD',
    // Australia
    'AU': 'AUD',
    // New Zealand
    'NZ': 'NZD',
    // Switzerland
    'CH': 'CHF',
    // Japan
    'JP': 'JPY',
    // China
    'CN': 'CNY',
    // India
    'IN': 'INR',
    // Brazil
    'BR': 'BRL',
    // Mexico
    'MX': 'MXN',
    // Singapore
    'SG': 'SGD',
    // Hong Kong
    'HK': 'HKD',
    // South Korea
    'KR': 'KRW',
    // Sweden
    'SE': 'SEK',
    // Norway
    'NO': 'NOK',
    // Denmark
    'DK': 'DKK',
    // Poland
    'PL': 'PLN',
    // Czech Republic
    'CZ': 'CZK',
    // Hungary
    'HU': 'HUF',
    // Romania
    'RO': 'RON',
    // South Africa
    'ZA': 'ZAR',
    // Turkey
    'TR': 'TRY',
    // Russia
    'RU': 'RUB',
    // Israel
    'IL': 'ILS',
    // Thailand
    'TH': 'THB',
    // Malaysia
    'MY': 'MYR',
    // Indonesia
    'ID': 'IDR',
    // Philippines
    'PH': 'PHP',
    // Vietnam
    'VN': 'VND',
    // Argentina
    'AR': 'ARS',
    // Chile
    'CL': 'CLP',
    // Colombia
    'CO': 'COP',
    // Peru
    'PE': 'PEN',
  }

  // Try to extract region code from full language (e.g., "US" from "en-US")
  const parts = fullLanguage.split('-')
  if (parts.length > 1) {
    const regionCode = parts[1].toUpperCase()
    if (regionToCurrency[regionCode]) {
      return regionToCurrency[regionCode]
    }
  }

  // Fallback based on language code alone
  const languageToCurrency: Record<string, string> = {
    'en': 'USD', // Default English to USD
    'es': 'EUR', // Spanish to EUR (most Spanish speakers in EU/Latin America)
    'fr': 'EUR', // French to EUR
    'de': 'EUR', // German to EUR
    'it': 'EUR', // Italian to EUR
    'pt': 'EUR', // Portuguese to EUR (can also be BRL)
    'nl': 'EUR', // Dutch to EUR
    'ja': 'JPY', // Japanese to JPY
    'zh': 'CNY', // Chinese to CNY
    'ko': 'KRW', // Korean to KRW
    'sv': 'SEK', // Swedish to SEK
    'no': 'NOK', // Norwegian to NOK
    'da': 'DKK', // Danish to DKK
    'fi': 'EUR', // Finnish to EUR
    'pl': 'PLN', // Polish to PLN
    'cs': 'CZK', // Czech to CZK
    'hu': 'HUF', // Hungarian to HUF
    'ro': 'RON', // Romanian to RON
    'ru': 'RUB', // Russian to RUB
    'tr': 'TRY', // Turkish to TRY
    'ar': 'USD', // Arabic to USD (varies widely)
    'he': 'ILS', // Hebrew to ILS
    'th': 'THB', // Thai to THB
    'vi': 'VND', // Vietnamese to VND
    'id': 'IDR', // Indonesian to IDR
    'ms': 'MYR', // Malay to MYR
    'tl': 'PHP', // Tagalog to PHP
  }

  return languageToCurrency[lang] || 'USD' // Default to USD
}

/**
 * Get all browser preferences for registration
 */
export interface BrowserPreferences {
  languageCode: string
  timezone: string
  currency: string
}

export function getBrowserPreferences(): BrowserPreferences {
  const languageCode = getBrowserLanguage()
  const timezone = getBrowserTimezone()
  const currency = inferCurrencyFromLanguage(languageCode)

  return {
    languageCode,
    timezone,
    currency,
  }
}
