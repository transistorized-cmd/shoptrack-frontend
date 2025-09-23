import { describe, it, expect, vi, afterEach } from "vitest";
import { ref } from "vue";
import { useDateLocalization } from "../useDateLocalization";

// Create reactive locale mock
const mockLocale = ref("en");
const mockSetLocale = vi.fn((newLocale: string) => {
  mockLocale.value = newLocale;
});

// Mock useTranslation composable
vi.mock("@/composables/useTranslation", () => ({
  useTranslation: () => ({
    locale: mockLocale,
    setLocale: mockSetLocale,
    t: (key: string) => key,
  }),
}));

describe("useDateLocalization", () => {
  const composable = useDateLocalization();

  afterEach(() => {
    vi.clearAllMocks();
    mockSetLocale.mockClear();
    mockLocale.value = "en";
  });

  describe("formatDate", () => {
    it("should format valid date string with default options", () => {
      const dateString = "2024-01-15T10:30:00Z";
      const result = composable.formatDate(dateString);

      expect(result).toBe("Jan 15, 2024");
    });

    it("should format Date object with default options", () => {
      const date = new Date("2024-01-15T10:30:00Z");
      const result = composable.formatDate(date);

      expect(result).toBe("Jan 15, 2024");
    });

    it("should format date with custom options", () => {
      const dateString = "2024-01-15T10:30:00Z";
      const options: Intl.DateTimeFormatOptions = {
        year: "numeric",
        month: "long",
        day: "numeric",
      };
      const result = composable.formatDate(dateString, options);

      expect(result).toBe("January 15, 2024");
    });

    it("should handle Spanish locale", () => {
      mockLocale.value = "es";
      const dateString = "2024-01-15T10:30:00Z";
      const result = composable.formatDate(dateString);

      // Should use Spanish formatting
      expect(result).toMatch(/ene|enero/i);
    });

    it("should handle invalid date strings", () => {
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const result = composable.formatDate("invalid-date");

      expect(result).toBe("Invalid Date");
      expect(consoleSpy).toHaveBeenCalledWith(
        "Invalid date provided to formatDate:",
        "invalid-date",
      );

      consoleSpy.mockRestore();
    });

    it("should handle errors gracefully", () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      // Mock Date constructor to throw error
      const originalDate = globalThis.Date;
      globalThis.Date = vi.fn().mockImplementation(() => {
        throw new Error("Date error");
      }) as any;

      const result = composable.formatDate("2024-01-15");

      expect(result).toBe("Invalid Date");
      expect(consoleSpy).toHaveBeenCalledWith(
        "Error formatting date:",
        expect.any(Error),
      );

      // Restore
      globalThis.Date = originalDate;
      consoleSpy.mockRestore();
    });
  });

  describe("formatDateTime", () => {
    it("should format valid date string with default options", () => {
      const dateString = "2024-01-15T10:30:00Z";
      const result = composable.formatDateTime(dateString);

      // The exact time display depends on timezone, so we check for the date part and presence of time
      expect(result).toContain("Jan 15, 2024");
      expect(result).toMatch(/\d{1,2}:\d{2}/); // Contains time format
    });

    it("should format Date object with default options", () => {
      const date = new Date("2024-01-15T10:30:00Z");
      const result = composable.formatDateTime(date);

      expect(result).toContain("Jan 15, 2024");
      expect(result).toMatch(/\d{1,2}:\d{2}/); // Contains time format
    });

    it("should format datetime with custom options", () => {
      const dateString = "2024-01-15T10:30:00Z";
      const options: Intl.DateTimeFormatOptions = {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
      };
      const result = composable.formatDateTime(dateString, options);

      expect(result).toContain("January 15, 2024");
      expect(result).toMatch(/\d{1,2}:\d{2}:\d{2}/); // Contains time with seconds
    });

    it("should handle Spanish locale for datetime", () => {
      mockLocale.value = "es";
      const dateString = "2024-01-15T10:30:00Z";
      const result = composable.formatDateTime(dateString);

      // Should use Spanish formatting
      expect(result).toMatch(/ene|enero/i);
    });

    it("should handle invalid date strings", () => {
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const result = composable.formatDateTime("invalid-date");

      expect(result).toBe("Invalid Date");
      expect(consoleSpy).toHaveBeenCalledWith(
        "Invalid date provided to formatDateTime:",
        "invalid-date",
      );

      consoleSpy.mockRestore();
    });

    it("should handle errors gracefully", () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      // Mock Date constructor to throw error
      const originalDate = globalThis.Date;
      globalThis.Date = vi.fn().mockImplementation(() => {
        throw new Error("DateTime error");
      }) as any;

      const result = composable.formatDateTime("2024-01-15");

      expect(result).toBe("Invalid Date");
      expect(consoleSpy).toHaveBeenCalledWith(
        "Error formatting date time:",
        expect.any(Error),
      );

      // Restore
      globalThis.Date = originalDate;
      consoleSpy.mockRestore();
    });
  });

  describe("formatDateShort", () => {
    it("should format date with short month and day only", () => {
      const dateString = "2024-01-15T10:30:00Z";
      const result = composable.formatDateShort(dateString);

      expect(result).toBe("Jan 15");
    });

    it("should handle Date object", () => {
      const date = new Date("2024-01-15T10:30:00Z");
      const result = composable.formatDateShort(date);

      expect(result).toBe("Jan 15");
    });

    it("should handle Spanish locale", () => {
      mockLocale.value = "es";
      const dateString = "2024-01-15T10:30:00Z";
      const result = composable.formatDateShort(dateString);

      expect(result).toMatch(/ene|15/);
    });
  });

  describe("formatDateLong", () => {
    it("should format date with full month name", () => {
      const dateString = "2024-01-15T10:30:00Z";
      const result = composable.formatDateLong(dateString);

      expect(result).toBe("January 15, 2024");
    });

    it("should handle Date object", () => {
      const date = new Date("2024-01-15T10:30:00Z");
      const result = composable.formatDateLong(date);

      expect(result).toBe("January 15, 2024");
    });

    it("should handle Spanish locale", () => {
      mockLocale.value = "es";
      const dateString = "2024-01-15T10:30:00Z";
      const result = composable.formatDateLong(dateString);

      expect(result).toMatch(/enero/i);
    });
  });

  describe("getCurrentJavaScriptLocale", () => {
    it("should return English locale by default", () => {
      const result = composable.getCurrentJavaScriptLocale();
      expect(result).toBe("en-US");
    });

    it("should return Spanish locale when set", () => {
      mockLocale.value = "es";
      const result = composable.getCurrentJavaScriptLocale();
      expect(result).toBe("es-ES");
    });

    it("should fallback to English for unknown locales", () => {
      mockLocale.value = "fr";
      const result = composable.getCurrentJavaScriptLocale();
      expect(result).toBe("en-US");
    });
  });

  describe("getCurrentLanguageTag", () => {
    it("should return the same as getCurrentJavaScriptLocale", () => {
      const jsLocale = composable.getCurrentJavaScriptLocale();
      const langTag = composable.getCurrentLanguageTag();

      expect(langTag).toBe(jsLocale);
    });

    it("should handle different locales", () => {
      mockLocale.value = "es";
      const result = composable.getCurrentLanguageTag();
      expect(result).toBe("es-ES");
    });
  });

  describe("Locale mapping", () => {
    it("should map supported locales correctly", () => {
      const testCases = [
        { input: "en", expected: "en-US" },
        { input: "es", expected: "es-ES" },
        { input: "unknown", expected: "en-US" },
        { input: "", expected: "en-US" },
      ];

      testCases.forEach(({ input, expected }) => {
        mockLocale.value = input;
        const result = composable.getCurrentJavaScriptLocale();
        expect(result).toBe(expected);
      });
    });
  });

  describe("Edge cases", () => {
    it("should handle null date inputs gracefully", () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const result = composable.formatDate(null as any);

      expect(result).toBe("Invalid Date");
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it("should handle undefined date inputs gracefully", () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const result = composable.formatDate(undefined as any);

      expect(result).toBe("Invalid Date");
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it("should handle empty string inputs gracefully", () => {
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const result = composable.formatDate("");

      expect(result).toBe("Invalid Date");
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });
});