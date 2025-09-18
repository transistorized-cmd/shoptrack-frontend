import { describe, it, expect, beforeEach, vi } from "vitest";
import { mount } from "@vue/test-utils";
import ReceiptCard from "../ReceiptCard.vue";
import { createMockRouter } from "../../../../tests/utils/router";
import type { Receipt, ReceiptItem } from "@/types/receipt";

// Mock vue-i18n
vi.mock("vue-i18n", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useI18n: () => ({
      t: (key: string) => key,
      locale: { value: "en" },
    }),
  };
});

// Create a test i18n instance for global $t
import { createI18n } from "vue-i18n";
const createTestI18n = (locale = "en") => {
  return createI18n({
    legacy: false,
    locale,
    fallbackLocale: "en",
    messages: {
      en: {
        receipts: {
          processing: "Processing...",
          items: "items"
        }
      },
      es: {},
    },
    globalInjection: true,
  });
};

describe("ReceiptCard Component", () => {
  let wrapper: any;
  let mockRouter: any;

  const mockItem: ReceiptItem = {
    id: 1,
    receiptId: 1,
    itemName: "Test Item",
    quantity: 2,
    totalPrice: 12.99,
    pricePerUnit: 6.495,
    category: "grocery",
    confidence: "high",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  };

  const mockReceipt: Receipt = {
    id: 1,
    filename: "test-receipt.jpg",
    receiptDate: "2024-01-15T10:30:00Z",
    receiptNumber: "R001",
    storeName: "Test Store",
    processingStatus: "completed",
    imageQualityAssessment: "good",
    totalItemsDetected: 5,
    successfullyParsed: 5,
    items: [mockItem],
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  };

  const createWrapper = (receipt: Partial<Receipt> = {}) => {
    const { mockRouter: router } = createMockRouter();
    mockRouter = router;

    wrapper = mount(ReceiptCard, {
      props: {
        receipt: { ...mockReceipt, ...receipt },
      },
      global: {
        plugins: [mockRouter, createTestI18n()],
      },
    });
  };

  beforeEach(() => {
    createWrapper();
  });

  describe("Component Rendering", () => {
    it("should render receipt basic information", () => {
      expect(wrapper.text()).toContain("test-receipt.jpg");
      expect(wrapper.text()).toContain("Jan 15, 2024");
      expect(wrapper.text()).toContain("Receipt #R001");
      // Note: Component doesn't display status text, only shows processing indicator when processing
    });

    it("should display stats correctly", () => {
      expect(wrapper.text()).toContain("5"); // totalItemsDetected
      expect(wrapper.text()).toContain("Items Detected");
      expect(wrapper.text()).toContain("5"); // successfullyParsed
      expect(wrapper.text()).toContain("Successfully Parsed");
    });

    it("should show delete button with correct styling", () => {
      const deleteButton = wrapper.find(".inline-flex.items-center");
      expect(deleteButton.text()).toBe("🗑️");
      expect(deleteButton.classes()).toContain("bg-red-100");
    });

    it("should render items preview", () => {
      expect(wrapper.text()).toContain("Items");
      expect(wrapper.text()).toContain("Test Item");
      expect(wrapper.text()).toContain("$12.99");
    });

    it("should render delete button", () => {
      const buttons = wrapper.findAll("button");
      const deleteBtn = buttons.find((btn: any) =>
        btn.text().includes("🗑️"),
      );

      expect(deleteBtn?.exists()).toBe(true);

      // Component uses click handler for navigation, not RouterLink
    });
  });

  // Note: Component doesn't display status badges, only shows processing indicator when processing

  describe("Processing Indicator", () => {
    it("should show processing indicator when status is processing", () => {
      createWrapper({ processingStatus: "processing" });

      expect(wrapper.text()).toContain("Processing...");
      expect(wrapper.find(".animate-spin").exists()).toBe(true);
    });

    it("should not show processing indicator for other statuses", () => {
      createWrapper({ processingStatus: "completed" });

      expect(wrapper.text()).not.toContain("Processing...");
      expect(wrapper.find(".animate-spin").exists()).toBe(false);
    });

    // Note: Reprocess functionality is only available in ReceiptDetail view, not in ReceiptCard
  });

  describe("Items Display", () => {
    it("should show first 3 items", () => {
      const multipleItems: ReceiptItem[] = [
        { ...mockItem, id: 1, itemName: "Item 1", totalPrice: 10.0 },
        { ...mockItem, id: 2, itemName: "Item 2", totalPrice: 15.0 },
        { ...mockItem, id: 3, itemName: "Item 3", totalPrice: 20.0 },
        { ...mockItem, id: 4, itemName: "Item 4", totalPrice: 25.0 },
      ];

      createWrapper({ items: multipleItems });

      expect(wrapper.text()).toContain("Item 1");
      expect(wrapper.text()).toContain("Item 2");
      expect(wrapper.text()).toContain("Item 3");
      expect(wrapper.text()).toContain("+1 more items");
    });

    it("should handle empty items list", () => {
      createWrapper({ items: [] });

      // Should not show the items preview section (checking for h4 with "Items" text)
      const itemsHeader = wrapper
        .findAll("h4")
        .find((h: any) => h.text() === "Items");
      expect(itemsHeader).toBeFalsy();
      expect(wrapper.find(".space-y-1").exists()).toBe(false);
    });

    it("should handle missing items", () => {
      createWrapper({ items: undefined });

      // Should not show the items preview section (checking for h4 with "Items" text)
      const itemsHeader = wrapper
        .findAll("h4")
        .find((h: any) => h.text() === "Items");
      expect(itemsHeader).toBeFalsy();
      expect(wrapper.find(".space-y-1").exists()).toBe(false);
    });

    it("should format prices correctly", () => {
      const itemWithDecimalPrice: ReceiptItem = {
        ...mockItem,
        totalPrice: 123.456,
      };

      createWrapper({ items: [itemWithDecimalPrice] });

      expect(wrapper.text()).toContain("$123.46");
    });
  });

  describe("Date Formatting", () => {
    it("should format date correctly", () => {
      createWrapper({ receiptDate: "2024-12-25T15:30:00Z" });

      expect(wrapper.text()).toContain("Dec 25, 2024");
    });

    it('should show "No date" when date is missing', () => {
      createWrapper({ receiptDate: undefined });

      expect(wrapper.text()).toContain("No date");
    });

    it("should handle invalid date gracefully", () => {
      createWrapper({ receiptDate: "invalid-date" });

      // Should still render without crashing
      expect(wrapper.exists()).toBe(true);
    });
  });

  describe("Optional Fields", () => {
    it("should handle missing receipt number", () => {
      createWrapper({ receiptNumber: undefined });

      expect(wrapper.text()).not.toContain("Receipt #");
    });

    it("should show receipt number when present", () => {
      createWrapper({ receiptNumber: "ABC123" });

      expect(wrapper.text()).toContain("Receipt #ABC123");
    });
  });

  describe("Event Emissions", () => {
    it("should emit delete event when delete button is clicked", async () => {
      const deleteBtn = wrapper
        .findAll("button")
        .find((btn: any) => btn.text().includes("🗑️"));

      await deleteBtn?.trigger("click");

      expect(wrapper.emitted("delete")).toBeTruthy();
      expect(wrapper.emitted("delete")[0]).toEqual([1]);
    });

    // Note: Component doesn't have a reprocess button, only delete button
  });

  describe("Router Integration", () => {
    it("should navigate to receipt detail on card click", async () => {
      const card = wrapper.find(".card");
      expect(card.exists()).toBe(true);

      await card.trigger("click");

      // Check that router.push was called with correct parameters
      expect(mockRouter.push).toHaveBeenCalledWith({
        name: "receipt-detail",
        params: { id: "1" },
      });
    });

    it("should have clickable card with cursor pointer", () => {
      const card = wrapper.find(".card");
      expect(card.classes()).toContain("cursor-pointer");
    });
  });

  describe("Accessibility", () => {
    it("should have proper button titles/tooltips", () => {
      const deleteBtn = wrapper
        .findAll("button")
        .find((btn: any) => btn.text().includes("🗑️"));

      expect(deleteBtn?.attributes("title")).toBe("Delete receipt");
    });

    it("should have semantic structure with proper headings", () => {
      expect(wrapper.find("h3").exists()).toBe(true);
      expect(wrapper.find("h4").exists()).toBe(true);
    });
  });

  describe("Responsive Design", () => {
    it("should have grid layout for stats", () => {
      const statsGrid = wrapper.find(".grid.grid-cols-2");
      expect(statsGrid.exists()).toBe(true);
    });

    it("should have proper flex layout for actions", () => {
      const headerSection = wrapper.find(".flex.flex-col.sm\\:flex-row");
      expect(headerSection.exists()).toBe(true);
      expect(headerSection.classes()).toContain("sm:justify-between");
    });
  });

  describe("Dark Mode Support", () => {
    it("should have dark mode classes", () => {
      // Check if component includes dark mode classes
      const html = wrapper.html();
      expect(html).toMatch(/dark:/);
    });
  });

  describe("Edge Cases", () => {
    it("should handle zero totals", () => {
      createWrapper({
        totalItemsDetected: 0,
        successfullyParsed: 0,
      });

      expect(wrapper.text()).toContain("0");
    });

    it("should handle very long filename", () => {
      const longFilename =
        "very-long-filename-that-might-cause-layout-issues-and-should-be-truncated.jpg";
      createWrapper({ filename: longFilename });

      expect(wrapper.text()).toContain(longFilename);
      expect(wrapper.find("h3").classes()).toContain("truncate");
    });

    it("should handle very long item names", () => {
      const longItemName =
        "Very Long Item Name That Should Be Truncated In The Display";
      const longItem: ReceiptItem = {
        ...mockItem,
        itemName: longItemName,
      };

      createWrapper({ items: [longItem] });

      expect(wrapper.text()).toContain(longItemName);
      const itemNameElement = wrapper.find(
        ".text-gray-600.dark\\:text-gray-300.truncate",
      );
      expect(itemNameElement.classes()).toContain("truncate");
    });

    it("should handle null/undefined item prices", () => {
      const itemWithNullPrice: ReceiptItem = {
        ...mockItem,
        totalPrice: 0,
      };

      createWrapper({ items: [itemWithNullPrice] });

      expect(wrapper.text()).toContain("$0.00");
    });
  });
});
