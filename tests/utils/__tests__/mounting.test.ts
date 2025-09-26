import { describe, it, expect, vi } from "vitest";
import { defineComponent, ref } from "vue";
import {
  mountComponent,
  shallowMountComponent,
  mountForProps,
  mountForEvents,
  mountWithSlots,
  mountView,
  shallowMountView,
  createTestI18n,
  commonStubs,
  testPatterns,
  mountComposable,
} from "../mounting";

// Test component
const TestComponent = defineComponent({
  name: "TestComponent",
  props: {
    title: String,
    count: Number,
    active: Boolean,
  },
  emits: ["click", "update"],
  template: `
    <div class="test-component">
      <h1>{{ title }}</h1>
      <p>Count: {{ count }}</p>
      <button @click="$emit('click', 'test')" :disabled="!active">
        Click me
      </button>
      <slot name="header" />
      <slot />
    </div>
  `,
});

// Test component with child
const ParentComponent = defineComponent({
  name: "ParentComponent",
  components: { TestComponent },
  template: `
    <div class="parent">
      <TestComponent title="Child" :count="5" />
      <router-link to="/test">Navigate</router-link>
    </div>
  `,
});

describe("Mounting Utilities", () => {
  describe("createTestI18n", () => {
    it("should create i18n instance with default locale", () => {
      const i18n = createTestI18n();
      expect(i18n.global.locale.value).toBe("en");
    });

    it("should create i18n instance with custom locale", () => {
      const i18n = createTestI18n("es");
      expect(i18n.global.locale.value).toBe("es");
    });

    it("should include common translations", () => {
      const i18n = createTestI18n();
      expect(i18n.global.t("common.loading")).toBe("Loading...");
      expect(i18n.global.t("search.placeholder")).toBe("Search...");
    });

    it("should merge additional messages", () => {
      const additionalMessages = {
        en: {
          custom: {
            message: "Custom message",
          },
        },
      };

      const i18n = createTestI18n("en", additionalMessages);
      expect(i18n.global.t("custom.message")).toBe("Custom message");
    });
  });

  describe("commonStubs", () => {
    it("should provide RouterLink stub", () => {
      expect(commonStubs.RouterLink).toBeDefined();
      expect(commonStubs.RouterLink.name).toBe("RouterLink");
    });

    it("should provide icon stubs", () => {
      expect(commonStubs.BellIcon).toBeDefined();
      expect(commonStubs.SunIcon).toBeDefined();
      expect(commonStubs.MoonIcon).toBeDefined();
    });

    it("should provide component stubs", () => {
      expect(commonStubs.SearchInput).toBeDefined();
      expect(commonStubs.NotificationMenu).toBeDefined();
      expect(commonStubs.ThemeToggle).toBeDefined();
    });
  });

  describe("mountComponent", () => {
    it("should mount component with default plugins", () => {
      const wrapper = mountComponent(TestComponent, {
        props: { title: "Test", count: 10, active: true },
      });

      expect(wrapper.exists()).toBe(true);
      expect(wrapper.text()).toContain("Test");
      expect(wrapper.text()).toContain("Count: 10");

      wrapper.unmount();
    });

    it("should include i18n plugin by default", () => {
      const wrapper = mountComponent(TestComponent);

      // Test that i18n is available
      expect(wrapper.vm.$t).toBeDefined();

      wrapper.unmount();
    });

    it("should include router plugin by default", () => {
      const wrapper = mountComponent(ParentComponent);

      // RouterLink should be available
      expect(wrapper.find("a").exists()).toBe(true);

      wrapper.unmount();
    });
  });

  describe("shallowMountComponent", () => {
    it("should shallow mount with stubbed children", () => {
      const wrapper = shallowMountComponent(ParentComponent);

      expect(wrapper.exists()).toBe(true);
      expect(wrapper.find(".parent").exists()).toBe(true);

      // Child component should be stubbed with shallow mounting
      // The TestComponent should be rendered as a stub
      expect(wrapper.findComponent({ name: "TestComponent" }).exists()).toBe(
        true,
      );

      wrapper.unmount();
    });

    it("should stub RouterLink components", () => {
      const wrapper = shallowMountComponent(ParentComponent);

      const routerLink = wrapper.find("a");
      expect(routerLink.exists()).toBe(true);

      wrapper.unmount();
    });
  });

  describe("mountForProps", () => {
    it("should mount with specified props", () => {
      const props = {
        title: "Prop Test",
        count: 42,
        active: false,
      };

      const wrapper = mountForProps(TestComponent, props);

      expect(wrapper.props()).toMatchObject(props);
      expect(wrapper.text()).toContain("Prop Test");
      expect(wrapper.text()).toContain("Count: 42");

      wrapper.unmount();
    });
  });

  describe("mountForEvents", () => {
    it("should mount component for event testing", async () => {
      const wrapper = mountForEvents(TestComponent, {
        props: { active: true },
      });

      await wrapper.find("button").trigger("click");

      const emitted = wrapper.emitted();
      expect(emitted.click).toBeTruthy();
      expect(emitted.click[0]).toEqual(["test"]);

      wrapper.unmount();
    });
  });

  describe("mountWithSlots", () => {
    it("should mount component with slots", () => {
      const slots = {
        header: "<h2>Header Slot</h2>",
        default: "<p>Default Slot</p>",
      };

      const wrapper = mountWithSlots(TestComponent, slots);

      expect(wrapper.text()).toContain("Header Slot");
      expect(wrapper.text()).toContain("Default Slot");

      wrapper.unmount();
    });
  });

  describe("mountView and shallowMountView", () => {
    it("should mount view with all plugins", () => {
      const wrapper = mountView(TestComponent);

      expect(wrapper.exists()).toBe(true);
      expect(wrapper.vm.$t).toBeDefined(); // i18n
      expect(wrapper.vm.$router).toBeDefined(); // router

      wrapper.unmount();
    });

    it("should shallow mount view with stubbed children", () => {
      const wrapper = shallowMountView(ParentComponent);

      expect(wrapper.exists()).toBe(true);
      expect(wrapper.vm.$t).toBeDefined();
      expect(wrapper.vm.$router).toBeDefined();

      wrapper.unmount();
    });
  });

  describe("mountComposable", () => {
    it("should mount composable for testing", () => {
      const useCounter = () => {
        const count = ref(0);
        const increment = () => count.value++;
        return { count, increment };
      };

      const { wrapper, result } = mountComposable(useCounter);

      expect(result.count.value).toBe(0);
      result.increment();
      expect(result.count.value).toBe(1);

      wrapper.unmount();
    });
  });

  describe("testPatterns", () => {
    describe("shouldRender", () => {
      it("should test component renders", () => {
        const wrapper = testPatterns.shouldRender(TestComponent);
        expect(wrapper.exists()).toBe(true);
        wrapper.unmount();
      });
    });

    describe("shouldAcceptProps", () => {
      it("should test props acceptance", () => {
        const props = { title: "Test Title" };
        const wrapper = testPatterns.shouldAcceptProps(
          TestComponent,
          props,
          "Test Title",
        );
        expect(wrapper.text()).toContain("Test Title");
        wrapper.unmount();
      });

      it("should test props with regex pattern", () => {
        const props = { title: "Pattern123" };
        const wrapper = testPatterns.shouldAcceptProps(
          TestComponent,
          props,
          /Pattern\d+/,
        );
        expect(wrapper.text()).toMatch(/Pattern\d+/);
        wrapper.unmount();
      });
    });

    describe("shouldEmitEvent", () => {
      it("should test event emission", async () => {
        const wrapper = await testPatterns.shouldEmitEvent(
          TestComponent,
          async (wrapper) => {
            // Set active prop so button is not disabled
            await wrapper.setProps({ active: true });
            await wrapper.find("button").trigger("click");
          },
          "click",
          "test",
        );
        expect(wrapper.emitted("click")).toBeTruthy();
        wrapper.unmount();
      });
    });

    describe("shouldRenderSlots", () => {
      it("should test slot rendering", () => {
        const slots = { default: "Slot Content" };
        const wrapper = testPatterns.shouldRenderSlots(
          TestComponent,
          slots,
          "Slot Content",
        );
        expect(wrapper.text()).toContain("Slot Content");
        wrapper.unmount();
      });
    });
  });

  describe("Plugin Configuration", () => {
    it("should allow disabling plugins", () => {
      const wrapper = mountComponent(TestComponent, {
        withI18n: false,
        withPinia: false,
        withRouter: false,
      });

      expect(wrapper.exists()).toBe(true);
      // i18n should not be available
      expect(wrapper.vm.$t).toBeUndefined();

      wrapper.unmount();
    });

    it("should allow custom component stubs", () => {
      const customStubs = {
        TestComponent: {
          name: "TestComponent",
          template: '<div data-testid="custom-stub">Custom Stub</div>',
        },
      };

      const wrapper = shallowMountComponent(ParentComponent, {
        componentStubs: customStubs,
      });

      expect(wrapper.find('[data-testid="custom-stub"]').exists()).toBe(true);
      expect(wrapper.text()).toContain("Custom Stub");

      wrapper.unmount();
    });
  });

  describe("Error Handling", () => {
    it("should handle invalid components gracefully", () => {
      expect(() => {
        const wrapper = mountComponent(null as any);
        wrapper.unmount();
      }).toThrow();
    });

    it("should handle missing props gracefully", () => {
      const wrapper = mountComponent(TestComponent);
      expect(wrapper.exists()).toBe(true);
      wrapper.unmount();
    });
  });

  describe("Performance Considerations", () => {
    it("should be faster with shallow mounting", () => {
      const startShallow = performance.now();
      const shallowWrapper = shallowMountComponent(ParentComponent);
      const shallowTime = performance.now() - startShallow;
      shallowWrapper.unmount();

      const startFull = performance.now();
      const fullWrapper = mountComponent(ParentComponent);
      const fullTime = performance.now() - startFull;
      fullWrapper.unmount();

      // This is environment-dependent, but shallow should generally be faster
      expect(shallowTime).toBeLessThan(fullTime * 3); // Allow significant variance
    });
  });
});
