/**
 * Date formatting utilities for API requests
 *
 * IMPORTANT: These functions use LOCAL timezone, not UTC.
 * This prevents off-by-one day issues when users are in UTC+ timezones.
 *
 * Background: Using toISOString().split('T')[0] converts dates to UTC before
 * formatting, which can shift dates back by one day for users in timezones
 * like Europe/Madrid (UTC+1). For example:
 * - User selects "January 1, 2026" at midnight local time
 * - toISOString() converts to "2025-12-31T23:00:00.000Z" (UTC)
 * - Splitting gives "2025-12-31" instead of "2026-01-01"
 *
 * These utilities format dates using local timezone to prevent this issue.
 */

/**
 * Format a Date object to YYYY-MM-DD string using LOCAL timezone.
 * Use this for API query parameters where you want the user's intended date.
 *
 * @param date - The Date object to format
 * @returns Date string in YYYY-MM-DD format
 *
 * @example
 * const today = new Date(); // Jan 1, 2026 at midnight in Spain (UTC+1)
 * formatLocalDate(today); // "2026-01-01" (correct!)
 *
 * // DON'T use this (buggy for UTC+ timezones):
 * today.toISOString().split('T')[0]; // "2025-12-31" (wrong!)
 */
export function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Get the first day of the current month in local timezone.
 *
 * @returns Date object representing the first day of the current month
 */
export function getFirstDayOfMonth(date: Date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

/**
 * Get the last day of the current month in local timezone.
 *
 * @returns Date object representing the last day of the current month
 */
export function getLastDayOfMonth(date: Date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

/**
 * Get the first day of the previous month in local timezone.
 *
 * @returns Date object representing the first day of the previous month
 */
export function getFirstDayOfPreviousMonth(date: Date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth() - 1, 1);
}

/**
 * Get the last day of the previous month in local timezone.
 *
 * @returns Date object representing the last day of the previous month
 */
export function getLastDayOfPreviousMonth(date: Date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth(), 0);
}

/**
 * Get date range for the current month formatted for API requests.
 *
 * @returns Object with startDate and endDate strings in YYYY-MM-DD format
 */
export function getCurrentMonthDateRange(): {
  startDate: string;
  endDate: string;
} {
  const now = new Date();
  return {
    startDate: formatLocalDate(getFirstDayOfMonth(now)),
    endDate: formatLocalDate(now),
  };
}

/**
 * Get date range for the previous month formatted for API requests.
 *
 * @returns Object with startDate and endDate strings in YYYY-MM-DD format
 */
export function getPreviousMonthDateRange(): {
  startDate: string;
  endDate: string;
} {
  const now = new Date();
  return {
    startDate: formatLocalDate(getFirstDayOfPreviousMonth(now)),
    endDate: formatLocalDate(getLastDayOfPreviousMonth(now)),
  };
}

/**
 * Get a date N months ago formatted for API requests.
 *
 * @param monthsAgo - Number of months to go back
 * @returns Date string in YYYY-MM-DD format
 */
export function getDateMonthsAgo(monthsAgo: number): string {
  const date = new Date();
  date.setMonth(date.getMonth() - monthsAgo);
  return formatLocalDate(date);
}

/**
 * Get a date N days ago formatted for API requests.
 *
 * @param daysAgo - Number of days to go back
 * @returns Date string in YYYY-MM-DD format
 */
export function getDateDaysAgo(daysAgo: number): string {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return formatLocalDate(date);
}
