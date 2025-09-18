import { useI18n } from "vue-i18n";

/**
 * Composable for localizing date formatting
 * Automatically uses the current locale from vue-i18n
 */
export const useDateLocalization = () => {
  const { locale } = useI18n();

  /**
   * Maps vue-i18n locale codes to JavaScript locale strings
   * This mapping ensures proper date formatting for each supported language
   */
  const getJavaScriptLocale = (localeCode: string): string => {
    const localeMap: Record<string, string> = {
      en: "en-US",
      es: "es-ES",
    };
    return localeMap[localeCode] || "en-US";
  };

  /**
   * Format a date string using the current locale
   * @param dateString - The date string to format
   * @param options - Intl.DateTimeFormatOptions for custom formatting
   * @returns Formatted date string in the current locale
   */
  const formatDate = (
    dateString: string | Date,
    options: Intl.DateTimeFormatOptions = {
      year: "numeric",
      month: "short",
      day: "numeric",
    },
  ): string => {
    try {
      const date =
        typeof dateString === "string" ? new Date(dateString) : dateString;

      // Check if date is valid
      if (isNaN(date.getTime())) {
        console.warn("Invalid date provided to formatDate:", dateString);
        return "Invalid Date";
      }

      const jsLocale = getJavaScriptLocale(locale.value);
      return date.toLocaleDateString(jsLocale, options);
    } catch (error) {
      console.error("Error formatting date:", error);
      return "Invalid Date";
    }
  };

  /**
   * Format a date and time string using the current locale
   * @param dateString - The date string to format
   * @param options - Intl.DateTimeFormatOptions for custom formatting
   * @returns Formatted date and time string in the current locale
   */
  const formatDateTime = (
    dateString: string | Date,
    options: Intl.DateTimeFormatOptions = {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    },
  ): string => {
    try {
      const date =
        typeof dateString === "string" ? new Date(dateString) : dateString;

      // Check if date is valid
      if (isNaN(date.getTime())) {
        console.warn("Invalid date provided to formatDateTime:", dateString);
        return "Invalid Date";
      }

      const jsLocale = getJavaScriptLocale(locale.value);
      return date.toLocaleString(jsLocale, options);
    } catch (error) {
      console.error("Error formatting date time:", error);
      return "Invalid Date";
    }
  };

  /**
   * Format a date for short display (e.g., "Sep 13" or "13 Sep")
   * @param dateString - The date string to format
   * @returns Short formatted date string in the current locale
   */
  const formatDateShort = (dateString: string | Date): string => {
    return formatDate(dateString, {
      month: "short",
      day: "numeric",
    });
  };

  /**
   * Format a date for long display (e.g., "September 13, 2024" or "13 de septiembre de 2024")
   * @param dateString - The date string to format
   * @returns Long formatted date string in the current locale
   */
  const formatDateLong = (dateString: string | Date): string => {
    return formatDate(dateString, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  /**
   * Get the current JavaScript locale string
   * @returns Current JavaScript locale (e.g., 'en-US', 'es-ES')
   */
  const getCurrentJavaScriptLocale = (): string => {
    return getJavaScriptLocale(locale.value);
  };

  /**
   * Get the current locale for HTML lang attributes
   * @returns Current locale string for HTML elements (e.g., 'en-US', 'es-ES')
   */
  const getCurrentLanguageTag = (): string => {
    return getJavaScriptLocale(locale.value);
  };

  return {
    formatDate,
    formatDateTime,
    formatDateShort,
    formatDateLong,
    getCurrentJavaScriptLocale,
    getCurrentLanguageTag,
  };
};
