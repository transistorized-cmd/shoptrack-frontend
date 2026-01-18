import { describe, it, expect, beforeEach, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { nextTick } from "vue";
import { createPinia, setActivePinia } from "pinia";
import ReceiptDetailModal from "../ReceiptDetailModal.vue";
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

// Mock categories store
vi.mock("@/stores/categories", () => ({
  useCategoriesStore: () => ({
    getName: vi.fn((id: number, locale: string) => {
      const categoryNames = {
        1: { en: "Fruits", es: "Frutas" },
      };
      return categoryNames[id]?.[locale] || `Category ${id}`;
    }),
    byLocale: {
      en: [{ id: 1, name: "Fruits" }],
      es: [{ id: 1, name: "Frutas" }],
    },
    fetchCategories: vi.fn(),
  }),
}));

// Mock i18n getCurrentLocale
vi.mock("@/i18n", () => ({
  getCurrentLocale: () => "en",
}));

describe("ReceiptDetailModal Component", () => {
  let wrapper: any;
  let pinia: any;

  beforeEach(() => {
    pinia = createPinia();
    setActivePinia(pinia);
  });

  const mockItems: ReceiptItem[] = [
    {
      id: 1,
      receiptId: 1,
      itemName: "Apple",
      quantity: 3,
      totalPrice: 4.5,
      pricePerUnit: 1.5,
      category: "fruit",
      confidence: "high",
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
    },
    {
      id: 2,
      receiptId: 1,
      itemName: "Banana",
      quantity: 2,
      totalPrice: 3.0,
      pricePerUnit: 1.5,
      category: "fruit",
      confidence: "medium",
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
    },
  ];

  const mockReceipt: Receipt = {
    id: 123,
    filename: "grocery-receipt.jpg",
    receiptDate: "2024-01-15T10:30:00Z",
    receiptNumber: "GR001",
    storeName: "SuperMart",
    processingStatus: "completed",
    imageQualityAssessment: "excellent",
    totalItemsDetected: 10,
    successfullyParsed: 8,
    items: mockItems,
    claudeResponseJson: { confidence: 0.95, metadata: { version: "1.0" } },
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-15T10:35:00Z",
  };

  const createWrapper = (
    props: Partial<{ isOpen: boolean; receipt: Receipt }> = {},
  ) => {
    wrapper = mount(ReceiptDetailModal, {
      props: {
        isOpen: false,
        receipt: mockReceipt,
        ...props,
      },
      global: {
        plugins: [pinia],
      },
    });
  };

  beforeEach(() => {
    createWrapper();
  });

  describe("Modal Visibility", () => {
    it("should not render when isOpen is false", () => {
      createWrapper({ isOpen: false });

      expect(wrapper.find(".fixed.inset-0.z-50").exists()).toBe(false);
      expect(wrapper.html()).toBe("<!--v-if-->");
    });

    it("should render when isOpen is true", () => {
      createWrapper({ isOpen: true });

      expect(wrapper.find(".fixed.inset-0.z-50").exists()).toBe(true);
      expect(wrapper.find(".bg-white.rounded-lg").exists()).toBe(true);
    });

    it("should show modal backdrop", () => {
      createWrapper({ isOpen: true });

      const backdrop = wrapper.find(".fixed.inset-0.bg-black.bg-opacity-50");
      expect(backdrop.exists()).toBe(true);
    });
  });

  describe("Header Section", () => {
    beforeEach(() => {
      createWrapper({ isOpen: true });
    });

    it("should display modal title", () => {
      expect(wrapper.find("h2").text()).toBe("Receipt Details");
    });

    it("should display receipt filename", () => {
      expect(wrapper.text()).toContain("grocery-receipt.jpg");
    });

    it("should have close button", () => {
      const closeButton = wrapper.find("button");
      expect(closeButton.exists()).toBe(true);

      // Check SVG close icon
      expect(closeButton.find("svg").exists()).toBe(true);
    });
  });

  describe("Image Section", () => {
    beforeEach(() => {
      createWrapper({ isOpen: true });
    });

    it("should show image section header", () => {
      expect(wrapper.text()).toContain("Receipt Image");
    });

    it("should show placeholder when no image URL", () => {
      expect(wrapper.text()).toContain("Image not available");
      expect(wrapper.find("svg").exists()).toBe(true);
    });

    it("should load image when modal opens", async () => {
      createWrapper({ isOpen: false });

      // Open modal
      await wrapper.setProps({ isOpen: true });
      await nextTick();

      // The image URL can be absolute or relative depending on API config
      expect(wrapper.vm.imageUrl).toContain("/receipts/123/image");
    });

    it("should clear image URL when modal closes", async () => {
      createWrapper({ isOpen: true });

      // Close modal
      await wrapper.setProps({ isOpen: false });
      await nextTick();

      expect(wrapper.vm.imageUrl).toBe(null);
    });

    it("should handle image load error", async () => {
      createWrapper({ isOpen: true });
      wrapper.vm.imageUrl = "/test-image.jpg";
      await nextTick();

      const img = wrapper.find("img");
      await img.trigger("error");

      expect(wrapper.vm.imageUrl).toBe(null);
    });
  });

  describe("Receipt Information Section", () => {
    beforeEach(() => {
      createWrapper({ isOpen: true });
    });

    it("should display basic receipt information", () => {
      expect(wrapper.text()).toContain("Receipt Information");
      expect(wrapper.text()).toContain("Jan 15, 2024"); // formatted date (abbreviated)
      expect(wrapper.text()).toContain("GR001"); // receipt number
      expect(wrapper.text()).toContain("completed"); // status
      expect(wrapper.text()).toContain("10"); // total items
      expect(wrapper.text()).toContain("8"); // successfully parsed
      expect(wrapper.text()).toContain("excellent"); // image quality
    });

    it("should show N/A for missing date", () => {
      createWrapper({
        isOpen: true,
        receipt: { ...mockReceipt, receiptDate: undefined },
      });

      expect(wrapper.text()).toContain("N/A");
    });

    it("should hide receipt number when not present", () => {
      createWrapper({
        isOpen: true,
        receipt: { ...mockReceipt, receiptNumber: undefined },
      });

      expect(wrapper.text()).not.toContain("Receipt #");
    });

    it("should hide image quality when not present", () => {
      createWrapper({
        isOpen: true,
        receipt: { ...mockReceipt, imageQualityAssessment: undefined },
      });

      expect(wrapper.text()).not.toContain("Image Quality");
    });

    it("should display correct status styling", () => {
      const statusElement = wrapper.find(".inline-flex.items-center");
      expect(statusElement.classes()).toContain("bg-green-100");
      expect(statusElement.classes()).toContain("text-green-800");
    });
  });

  describe("Items List Section", () => {
    beforeEach(() => {
      createWrapper({ isOpen: true });
    });

    it("should display items header with count", () => {
      expect(wrapper.text()).toContain("Items (2)");
    });

    it("should display all items with details", () => {
      expect(wrapper.text()).toContain("Apple");
      expect(wrapper.text()).toContain("$4.50");
      expect(wrapper.text()).toContain("Qty: 3");
      expect(wrapper.text()).toContain("Unit: $1.50");
      expect(wrapper.text()).toContain("Fruit");

      expect(wrapper.text()).toContain("Banana");
      expect(wrapper.text()).toContain("$3.00");
      expect(wrapper.text()).toContain("Qty: 2");
    });

    it("should calculate total correctly", () => {
      expect(wrapper.text()).toContain("Total:");
      expect(wrapper.text()).toContain("$7.50"); // 4.50 + 3.00
    });

    it("should handle missing category", () => {
      const itemsWithoutCategory = [{ ...mockItems[0], category: undefined }];

      createWrapper({
        isOpen: true,
        receipt: { ...mockReceipt, items: itemsWithoutCategory },
      });

      // Should not show category badge
      expect(wrapper.find(".bg-blue-100.text-blue-800").exists()).toBe(false);
    });

    it("should handle missing quantity and unit price", () => {
      const itemsWithMissingData = [
        { ...mockItems[0], quantity: undefined, pricePerUnit: undefined },
      ];

      createWrapper({
        isOpen: true,
        receipt: { ...mockReceipt, items: itemsWithMissingData },
      });

      expect(wrapper.text()).toContain("Qty: 1"); // default quantity
      expect(wrapper.text()).toContain("Unit: $0.00"); // default unit price
    });

    it("should not show items section when no items", () => {
      createWrapper({
        isOpen: true,
        receipt: { ...mockReceipt, items: [] },
      });

      expect(wrapper.text()).not.toContain("Items (");
      expect(wrapper.text()).not.toContain("Total:");
    });

    it("should handle undefined items", () => {
      createWrapper({
        isOpen: true,
        receipt: { ...mockReceipt, items: undefined },
      });

      expect(wrapper.text()).not.toContain("Items (");
    });
  });

  describe("Debug Information", () => {
    beforeEach(() => {
      createWrapper({ isOpen: true });
    });

    it("should initially hide debug info", () => {
      expect(wrapper.text()).not.toContain("Claude AI Response");
      expect(wrapper.text()).toContain("Show Debug Info");
    });

    it("should toggle debug info visibility", async () => {
      const toggleButton = wrapper
        .findAll("button")
        .find((btn: any) => btn.text().includes("Show Debug Info"));

      await toggleButton?.trigger("click");

      expect(wrapper.text()).toContain("Claude AI Response");
      expect(wrapper.text()).toContain("Hide Debug Info");
      expect(wrapper.text()).toContain('"confidence": 0.95');
    });

    it("should not show debug section when no Claude response", () => {
      createWrapper({
        isOpen: true,
        receipt: { ...mockReceipt, claudeResponseJson: undefined },
      });

      const toggleButton = wrapper
        .findAll("button")
        .find((btn: any) => btn.text().includes("Show Debug Info"));

      toggleButton?.trigger("click");

      expect(wrapper.text()).not.toContain("Claude AI Response");
    });

    it("should format JSON response correctly", async () => {
      const toggleButton = wrapper
        .findAll("button")
        .find((btn: any) => btn.text().includes("Show Debug Info"));

      await toggleButton?.trigger("click");

      const preElement = wrapper.find("pre");
      expect(preElement.exists()).toBe(true);
      expect(preElement.text()).toContain('"confidence": 0.95');
      expect(preElement.text()).toContain('"metadata"');
    });
  });

  describe("Footer Actions", () => {
    beforeEach(() => {
      createWrapper({ isOpen: true });
    });

    it("should have reprocess and close buttons", () => {
      const reprocessBtn = wrapper
        .findAll("button")
        .find((btn: any) => btn.text().includes("Reprocess"));
      const closeBtn = wrapper
        .findAll("button")
        .find((btn: any) => btn.text() === "Close");

      expect(reprocessBtn?.exists()).toBe(true);
      expect(closeBtn?.exists()).toBe(true);
    });

    it("should emit reprocess event", async () => {
      const reprocessBtn = wrapper
        .findAll("button")
        .find((btn: any) => btn.text().includes("Reprocess"));

      await reprocessBtn?.trigger("click");

      expect(wrapper.emitted("reprocess")).toBeTruthy();
      expect(wrapper.emitted("reprocess")[0]).toEqual([123]);
    });

    it("should emit close event when close button clicked", async () => {
      const closeBtn = wrapper
        .findAll("button")
        .find((btn: any) => btn.text() === "Close");

      await closeBtn?.trigger("click");

      expect(wrapper.emitted("close")).toBeTruthy();
    });

    it("should emit close event when backdrop clicked", async () => {
      const backdrop = wrapper.find(".fixed.inset-0.bg-black.bg-opacity-50");

      await backdrop.trigger("click");

      expect(wrapper.emitted("close")).toBeTruthy();
    });

    it("should emit close event when X button clicked", async () => {
      const xButton = wrapper
        .find("button")
        .find("svg")
        ?.element.closest("button");

      await wrapper.get("button").trigger("click"); // First button should be the X

      expect(wrapper.emitted("close")).toBeTruthy();
    });
  });

  describe("Date Formatting", () => {
    it("should format date to long format", () => {
      createWrapper({
        isOpen: true,
        receipt: { ...mockReceipt, receiptDate: "2024-12-25T15:30:00Z" },
      });

      expect(wrapper.text()).toContain("Dec 25, 2024");
    });

    it("should handle invalid date gracefully", () => {
      createWrapper({
        isOpen: true,
        receipt: { ...mockReceipt, receiptDate: "invalid-date" },
      });

      // Should still render without crashing
      expect(wrapper.exists()).toBe(true);
    });
  });

  describe("Status Color Logic", () => {
    it("should apply correct color for each status", () => {
      const testCases = [
        { status: "completed", expectedClass: "bg-green-100" },
        { status: "pending", expectedClass: "bg-yellow-100" },
        { status: "processing", expectedClass: "bg-blue-100" },
        { status: "failed", expectedClass: "bg-red-100" },
      ];

      testCases.forEach(({ status, expectedClass }) => {
        createWrapper({
          isOpen: true,
          receipt: { ...mockReceipt, processingStatus: status as any },
        });

        const statusElement = wrapper.find(".inline-flex.items-center");
        expect(statusElement.classes()).toContain(expectedClass);
      });
    });

    it("should apply default color for unknown status", () => {
      createWrapper({
        isOpen: true,
        receipt: { ...mockReceipt, processingStatus: "unknown" as any },
      });

      const statusElement = wrapper.find(".inline-flex.items-center");
      expect(statusElement.classes()).toContain("bg-gray-100");
    });
  });

  describe("Accessibility", () => {
    beforeEach(() => {
      createWrapper({ isOpen: true });
    });

    it("should have proper modal structure", () => {
      expect(wrapper.find('[role="dialog"]').exists()).toBe(false); // Could be improved
      expect(wrapper.find(".fixed.inset-0").exists()).toBe(true);
    });

    it("should have semantic headings hierarchy", () => {
      const headings = wrapper.findAll("h2, h3, h4");
      expect(headings.length).toBeGreaterThan(0);
      expect(headings[0].element.tagName).toBe("H2"); // Main title
    });

    it("should have alt text for image", async () => {
      wrapper.vm.imageUrl = "/test-image.jpg";
      await nextTick();

      const img = wrapper.find("img");
      expect(img.attributes("alt")).toBe("grocery-receipt.jpg");
    });
  });

  describe("Responsive Design", () => {
    beforeEach(() => {
      createWrapper({ isOpen: true });
    });

    it("should have responsive layout classes", () => {
      expect(wrapper.find(".lg\\:w-1\\/2").exists()).toBe(true);
      expect(wrapper.find(".flex.flex-col.lg\\:flex-row").exists()).toBe(true);
    });

    it("should have max width and height constraints", () => {
      expect(wrapper.find(".max-w-6xl").exists()).toBe(true);
      expect(wrapper.find(".max-h-\\[90vh\\]").exists()).toBe(true);
    });
  });

  describe("Edge Cases", () => {
    it("should handle receipt with zero items", () => {
      createWrapper({
        isOpen: true,
        receipt: {
          ...mockReceipt,
          items: [],
          totalItemsDetected: 0,
          successfullyParsed: 0,
        },
      });

      expect(wrapper.text()).toContain("0"); // Stats should show zero
      expect(wrapper.text()).not.toContain("Items ("); // No items section
    });

    it("should handle very large item lists", () => {
      const manyItems = Array.from({ length: 50 }, (_, i) => ({
        ...mockItems[0],
        id: i + 1,
        itemName: `Item ${i + 1}`,
        totalPrice: (i + 1) * 1.5,
      }));

      createWrapper({
        isOpen: true,
        receipt: { ...mockReceipt, items: manyItems },
      });

      expect(wrapper.text()).toContain("Items (50)");
      expect(wrapper.find(".max-h-96.overflow-y-auto").exists()).toBe(true);
    });

    it("should handle missing or null props gracefully", () => {
      createWrapper({
        isOpen: true,
        receipt: {
          ...mockReceipt,
          receiptDate: undefined,
          receiptNumber: undefined,
          imageQualityAssessment: undefined,
          items: undefined,
          claudeResponseJson: undefined,
        },
      });

      expect(wrapper.exists()).toBe(true);
      expect(wrapper.text()).toContain("N/A");
    });
  });
});
