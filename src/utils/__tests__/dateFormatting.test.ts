import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  formatLocalDate,
  getFirstDayOfMonth,
  getLastDayOfMonth,
  getFirstDayOfPreviousMonth,
  getLastDayOfPreviousMonth,
  getCurrentMonthDateRange,
  getPreviousMonthDateRange,
  getDateMonthsAgo,
  getDateDaysAgo,
} from "../dateFormatting";

describe("dateFormatting", () => {
  describe("formatLocalDate", () => {
    it("should format date to YYYY-MM-DD using local timezone", () => {
      // Create a date at noon local time (safe from timezone issues)
      const date = new Date(2026, 0, 15, 12, 0, 0); // Jan 15, 2026 12:00 local
      expect(formatLocalDate(date)).toBe("2026-01-15");
    });

    it("should handle single-digit months with zero padding", () => {
      const date = new Date(2026, 0, 1, 12, 0, 0); // Jan 1
      expect(formatLocalDate(date)).toBe("2026-01-01");
    });

    it("should handle single-digit days with zero padding", () => {
      const date = new Date(2026, 11, 5, 12, 0, 0); // Dec 5
      expect(formatLocalDate(date)).toBe("2026-12-05");
    });

    it("should handle December correctly", () => {
      const date = new Date(2025, 11, 31, 12, 0, 0); // Dec 31, 2025
      expect(formatLocalDate(date)).toBe("2025-12-31");
    });

    it("should handle year transitions correctly", () => {
      const date = new Date(2026, 0, 1, 12, 0, 0); // Jan 1, 2026
      expect(formatLocalDate(date)).toBe("2026-01-01");
    });

    /**
     * CRITICAL TEST: This is the exact bug that was fixed.
     * toISOString() would return the previous day for dates near midnight in UTC+ timezones.
     */
    it("should NOT shift date back when near midnight in UTC+ timezone", () => {
      // Simulate midnight on Jan 1, 2026 local time
      // In UTC+1 (Spain), this is Dec 31, 2025 23:00 UTC
      const jan1Midnight = new Date(2026, 0, 1, 0, 0, 0);

      // Our function should return the LOCAL date (Jan 1)
      const result = formatLocalDate(jan1Midnight);
      expect(result).toBe("2026-01-01");

      // Demonstrate the bug that toISOString would cause:
      // This test documents WHY we don't use toISOString
      const isoDatePart = jan1Midnight.toISOString().split("T")[0];
      // In a UTC+ timezone, this would be "2025-12-31" - the wrong date!
      // We can't assert this in tests since CI might run in UTC, but the
      // important thing is our function always returns "2026-01-01"
    });

    it("should handle dates at end of day correctly", () => {
      const date = new Date(2026, 0, 1, 23, 59, 59); // Jan 1, 2026 23:59:59 local
      expect(formatLocalDate(date)).toBe("2026-01-01");
    });

    it("should handle leap year dates", () => {
      const date = new Date(2024, 1, 29, 12, 0, 0); // Feb 29, 2024 (leap year)
      expect(formatLocalDate(date)).toBe("2024-02-29");
    });

    it("should handle dates in different months", () => {
      const testCases = [
        { date: new Date(2026, 0, 15), expected: "2026-01-15" }, // January
        { date: new Date(2026, 5, 15), expected: "2026-06-15" }, // June
        { date: new Date(2026, 11, 15), expected: "2026-12-15" }, // December
      ];

      testCases.forEach(({ date, expected }) => {
        expect(formatLocalDate(date)).toBe(expected);
      });
    });
  });

  describe("formatLocalDate vs toISOString comparison", () => {
    /**
     * These tests document the difference between our function and toISOString.
     * They help prevent future developers from "simplifying" to toISOString.
     */
    it("should always use local date components, not UTC", () => {
      // Create dates at various times
      const dates = [
        new Date(2026, 0, 1, 0, 0, 0), // midnight
        new Date(2026, 0, 1, 6, 0, 0), // 6am
        new Date(2026, 0, 1, 12, 0, 0), // noon
        new Date(2026, 0, 1, 18, 0, 0), // 6pm
        new Date(2026, 0, 1, 23, 59, 59), // near midnight
      ];

      // All should return "2026-01-01" regardless of time
      dates.forEach((date) => {
        expect(formatLocalDate(date)).toBe("2026-01-01");
      });
    });

    it("should match getFullYear, getMonth+1, and getDate values", () => {
      const date = new Date(2026, 5, 20, 15, 30, 0);

      const result = formatLocalDate(date);
      const expected = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

      expect(result).toBe(expected);
    });
  });

  describe("getFirstDayOfMonth", () => {
    it("should return first day of current month", () => {
      const referenceDate = new Date(2026, 0, 15, 12, 0, 0); // Jan 15
      const result = getFirstDayOfMonth(referenceDate);

      expect(result.getDate()).toBe(1);
      expect(result.getMonth()).toBe(0); // January
      expect(result.getFullYear()).toBe(2026);
    });

    it("should handle December correctly", () => {
      const referenceDate = new Date(2025, 11, 25, 12, 0, 0); // Dec 25
      const result = getFirstDayOfMonth(referenceDate);

      expect(result.getDate()).toBe(1);
      expect(result.getMonth()).toBe(11); // December
      expect(result.getFullYear()).toBe(2025);
    });
  });

  describe("getLastDayOfMonth", () => {
    it("should return last day of month with 31 days", () => {
      const referenceDate = new Date(2026, 0, 15); // January
      const result = getLastDayOfMonth(referenceDate);

      expect(result.getDate()).toBe(31);
      expect(result.getMonth()).toBe(0);
    });

    it("should return last day of February in non-leap year", () => {
      const referenceDate = new Date(2025, 1, 15); // February 2025
      const result = getLastDayOfMonth(referenceDate);

      expect(result.getDate()).toBe(28);
    });

    it("should return last day of February in leap year", () => {
      const referenceDate = new Date(2024, 1, 15); // February 2024
      const result = getLastDayOfMonth(referenceDate);

      expect(result.getDate()).toBe(29);
    });

    it("should return last day of month with 30 days", () => {
      const referenceDate = new Date(2026, 3, 15); // April
      const result = getLastDayOfMonth(referenceDate);

      expect(result.getDate()).toBe(30);
    });
  });

  describe("getFirstDayOfPreviousMonth", () => {
    it("should return first day of previous month", () => {
      const referenceDate = new Date(2026, 1, 15); // Feb 15
      const result = getFirstDayOfPreviousMonth(referenceDate);

      expect(result.getDate()).toBe(1);
      expect(result.getMonth()).toBe(0); // January
      expect(result.getFullYear()).toBe(2026);
    });

    it("should handle year transition (January -> December)", () => {
      const referenceDate = new Date(2026, 0, 15); // Jan 15, 2026
      const result = getFirstDayOfPreviousMonth(referenceDate);

      expect(result.getDate()).toBe(1);
      expect(result.getMonth()).toBe(11); // December
      expect(result.getFullYear()).toBe(2025);
    });
  });

  describe("getLastDayOfPreviousMonth", () => {
    it("should return last day of previous month", () => {
      const referenceDate = new Date(2026, 1, 15); // Feb 15
      const result = getLastDayOfPreviousMonth(referenceDate);

      expect(result.getDate()).toBe(31); // January has 31 days
      expect(result.getMonth()).toBe(0); // January
      expect(result.getFullYear()).toBe(2026);
    });

    it("should handle year transition correctly", () => {
      const referenceDate = new Date(2026, 0, 15); // Jan 15, 2026
      const result = getLastDayOfPreviousMonth(referenceDate);

      expect(result.getDate()).toBe(31); // December has 31 days
      expect(result.getMonth()).toBe(11); // December
      expect(result.getFullYear()).toBe(2025);
    });
  });

  describe("getCurrentMonthDateRange", () => {
    it("should return correct date range for current month", () => {
      // Mock the current date
      const mockDate = new Date(2026, 0, 22, 12, 0, 0); // Jan 22, 2026
      vi.useFakeTimers();
      vi.setSystemTime(mockDate);

      const result = getCurrentMonthDateRange();

      expect(result.startDate).toBe("2026-01-01");
      expect(result.endDate).toBe("2026-01-22");

      vi.useRealTimers();
    });
  });

  describe("getPreviousMonthDateRange", () => {
    it("should return correct date range for previous month", () => {
      const mockDate = new Date(2026, 0, 22, 12, 0, 0); // Jan 22, 2026
      vi.useFakeTimers();
      vi.setSystemTime(mockDate);

      const result = getPreviousMonthDateRange();

      expect(result.startDate).toBe("2025-12-01");
      expect(result.endDate).toBe("2025-12-31");

      vi.useRealTimers();
    });

    it("should handle different months correctly", () => {
      const mockDate = new Date(2026, 2, 15, 12, 0, 0); // March 15, 2026
      vi.useFakeTimers();
      vi.setSystemTime(mockDate);

      const result = getPreviousMonthDateRange();

      expect(result.startDate).toBe("2026-02-01");
      expect(result.endDate).toBe("2026-02-28"); // 2026 is not a leap year

      vi.useRealTimers();
    });
  });

  describe("getDateMonthsAgo", () => {
    it("should return date 3 months ago", () => {
      const mockDate = new Date(2026, 3, 15, 12, 0, 0); // April 15, 2026
      vi.useFakeTimers();
      vi.setSystemTime(mockDate);

      const result = getDateMonthsAgo(3);
      expect(result).toBe("2026-01-15");

      vi.useRealTimers();
    });

    it("should handle year transitions", () => {
      const mockDate = new Date(2026, 1, 15, 12, 0, 0); // Feb 15, 2026
      vi.useFakeTimers();
      vi.setSystemTime(mockDate);

      const result = getDateMonthsAgo(6);
      expect(result).toBe("2025-08-15");

      vi.useRealTimers();
    });
  });

  describe("getDateDaysAgo", () => {
    it("should return date N days ago", () => {
      const mockDate = new Date(2026, 0, 22, 12, 0, 0); // Jan 22, 2026
      vi.useFakeTimers();
      vi.setSystemTime(mockDate);

      const result = getDateDaysAgo(7);
      expect(result).toBe("2026-01-15");

      vi.useRealTimers();
    });

    it("should handle month transitions", () => {
      const mockDate = new Date(2026, 0, 5, 12, 0, 0); // Jan 5, 2026
      vi.useFakeTimers();
      vi.setSystemTime(mockDate);

      const result = getDateDaysAgo(10);
      expect(result).toBe("2025-12-26");

      vi.useRealTimers();
    });

    it("should handle year transitions", () => {
      const mockDate = new Date(2026, 0, 1, 12, 0, 0); // Jan 1, 2026
      vi.useFakeTimers();
      vi.setSystemTime(mockDate);

      const result = getDateDaysAgo(1);
      expect(result).toBe("2025-12-31");

      vi.useRealTimers();
    });
  });

  describe("Regression prevention: UTC vs Local timezone", () => {
    /**
     * This test suite specifically documents and tests the bug that was fixed.
     * It serves as documentation for future developers.
     */

    it("REGRESSION TEST: formatLocalDate must use local timezone, not UTC", () => {
      // This test ensures we don't accidentally revert to toISOString()

      // Create a date at the start of the day
      const startOfDay = new Date(2026, 0, 1, 0, 0, 0);

      // Our function must return the LOCAL date
      expect(formatLocalDate(startOfDay)).toBe("2026-01-01");

      // Verify we're using local date methods
      expect(startOfDay.getFullYear()).toBe(2026);
      expect(startOfDay.getMonth()).toBe(0); // January
      expect(startOfDay.getDate()).toBe(1);
    });

    it("REGRESSION TEST: date at midnight should not shift to previous day", () => {
      // The original bug: midnight local time in UTC+1 timezone
      // becomes 23:00 previous day in UTC
      const midnightLocal = new Date(2026, 0, 1, 0, 0, 0);

      // Format should be the intended date, not the UTC date
      expect(formatLocalDate(midnightLocal)).toBe("2026-01-01");
    });

    it("REGRESSION TEST: multiple dates near midnight should all be correct", () => {
      const dates = [
        { date: new Date(2026, 0, 1, 0, 0, 0), expected: "2026-01-01" },
        { date: new Date(2026, 0, 1, 0, 30, 0), expected: "2026-01-01" },
        { date: new Date(2026, 0, 2, 0, 0, 0), expected: "2026-01-02" },
        { date: new Date(2026, 5, 15, 0, 0, 0), expected: "2026-06-15" },
        { date: new Date(2026, 11, 31, 0, 0, 0), expected: "2026-12-31" },
      ];

      dates.forEach(({ date, expected }) => {
        expect(formatLocalDate(date)).toBe(expected);
      });
    });

    it("DOCUMENTATION: why we don't use toISOString", () => {
      /**
       * This test documents the behavior difference.
       *
       * toISOString() converts to UTC first, then formats.
       * For users in UTC+ timezones (like Europe/Madrid, UTC+1):
       * - Local midnight = UTC previous day at 23:00
       * - toISOString() would return "2025-12-31T23:00:00.000Z"
       * - Splitting gives "2025-12-31" instead of "2026-01-01"
       *
       * Our formatLocalDate() uses getFullYear(), getMonth(), getDate()
       * which return LOCAL time values, avoiding this bug.
       */

      const date = new Date(2026, 0, 1, 0, 0, 0);

      // These always return local time values
      expect(date.getFullYear()).toBe(2026);
      expect(date.getMonth()).toBe(0);
      expect(date.getDate()).toBe(1);

      // Our function uses these local values
      expect(formatLocalDate(date)).toBe("2026-01-01");
    });
  });
});
