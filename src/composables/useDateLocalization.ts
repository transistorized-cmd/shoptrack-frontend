import { useTranslation } from "@/composables/useTranslation";

/**
 * Composable for localizing date formatting
 * Automatically uses the current locale from our translation system
 */
export const useDateLocalization = () => {
  const { locale } = useTranslation();

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

      // Safe browser API access with fallbacks
      if (typeof Intl !== 'undefined' && Intl.DateTimeFormat) {
        return new Intl.DateTimeFormat(jsLocale, options).format(date);
      } else if (typeof date.toLocaleDateString === 'function') {
        return date.toLocaleDateString(jsLocale, options);
      } else {
        // Fallback for environments without browser APIs
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                       'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const month = options.month === 'long' ?
          ['January', 'February', 'March', 'April', 'May', 'June',
           'July', 'August', 'September', 'October', 'November', 'December'][date.getMonth()] :
          months[date.getMonth()];
        const day = date.getDate();
        const year = date.getFullYear();

        if (options.year === 'numeric' && options.month && options.day) {
          return `${month} ${day}, ${year}`;
        } else if (options.month && options.day) {
          return `${month} ${day}`;
        } else {
          return `${month} ${day}, ${year}`;
        }
      }
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

      // Safe browser API access with fallbacks
      if (typeof Intl !== 'undefined' && Intl.DateTimeFormat) {
        return new Intl.DateTimeFormat(jsLocale, options).format(date);
      } else if (typeof date.toLocaleString === 'function') {
        return date.toLocaleString(jsLocale, options);
      } else {
        // Fallback for environments without browser APIs
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                       'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const month = options.month === 'long' ?
          ['January', 'February', 'March', 'April', 'May', 'June',
           'July', 'August', 'September', 'October', 'November', 'December'][date.getMonth()] :
          months[date.getMonth()];
        const day = date.getDate();
        const year = date.getFullYear();
        const hour = String(date.getHours()).padStart(2, '0');
        const minute = String(date.getMinutes()).padStart(2, '0');

        if (options.hour && options.minute) {
          return `${month} ${day}, ${year} ${hour}:${minute}`;
        } else {
          return `${month} ${day}, ${year}`;
        }
      }
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
