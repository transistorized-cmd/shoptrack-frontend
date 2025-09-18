import { describe, it, expect, beforeEach, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { nextTick } from "vue";
import ForgotPassword from "../ForgotPassword.vue";
import { createMockRouter } from "../../../tests/utils/router";
import { useAuthStore } from "@/stores/auth";

// Mock dependencies
vi.mock("@/stores/auth");

describe("ForgotPassword Component", () => {
  let wrapper: any;
  let mockAuthStore: any;
  let mockRouter: any;

  const createWrapper = () => {
    const { mockRouter: router } = createMockRouter("/forgot-password");
    mockRouter = router;

    wrapper = mount(ForgotPassword, {
      global: {
        plugins: [mockRouter],
        mocks: {
          $t: (key: string) => {
            const translations: Record<string, string> = {
              "auth.checkYourEmail": "Check Your Email",
              "auth.forgotPasswordTitle": "Forgot Your Password?",
              "auth.emailSentDescription":
                "We've sent a password reset link to your email address.",
              "auth.forgotPasswordDescription":
                "Enter your email address and we'll send you a link to reset your password.",
              "auth.emailSentSuccessfully": "Email Sent Successfully",
              "auth.emailSentDetails":
                "Check your email and click the link to reset your password.",
              "auth.emailSentSpamCheck":
                "Don't forget to check your spam folder.",
              "auth.unableToSendResetEmail": "Unable to Send Reset Email",
              "auth.email": "Email",
              "auth.sending": "Sending...",
              "auth.sendResetLink": "Send Reset Link",
              "auth.resendEmail": "Resend Email",
              "auth.backToSignIn": "Back to Sign In",
              "auth.securityNotice":
                "For security reasons, we will only send reset links to registered email addresses.",
            };
            return translations[key] || key;
          },
        },
      },
    });
  };

  beforeEach(() => {
    // Mock auth store
    mockAuthStore = {
      error: null,
      forgotPassword: vi.fn(),
      clearError: vi.fn(),
    };
    vi.mocked(useAuthStore).mockReturnValue(mockAuthStore);

    createWrapper();
  });

  describe("Component Rendering", () => {
    it("should render initial forgot password form", () => {
      expect(wrapper.find("h2").text()).toBe("Forgot Your Password?");
      expect(wrapper.find("#email-address").exists()).toBe(true);
      expect(wrapper.find('button[type="submit"]').exists()).toBe(true);
      expect(wrapper.text()).toContain(
        "Enter your email address and we'll send you a link",
      );
    });

    it("should render back to sign in link", () => {
      const backLink = wrapper.find('a[href="/login"]');
      expect(backLink.exists()).toBe(true);
      expect(backLink.text()).toBe("← Back to Sign In");
    });

    it("should render security notice", () => {
      expect(wrapper.text()).toContain(
        "For security reasons, we will only send reset links to registered email addresses",
      );
    });
  });

  describe("Form Input Handling", () => {
    it("should update email input value", async () => {
      const emailInput = wrapper.find("#email-address");
      await emailInput.setValue("test@example.com");

      expect((emailInput.element as HTMLInputElement).value).toBe(
        "test@example.com",
      );
    });

    it("should disable submit button when email is empty", () => {
      const submitButton = wrapper.find('button[type="submit"]');
      expect(submitButton.attributes("disabled")).toBeDefined();
    });

    it("should enable submit button when email is provided", async () => {
      const emailInput = wrapper.find("#email-address");
      await emailInput.setValue("test@example.com");
      await nextTick();

      const submitButton = wrapper.find('button[type="submit"]');
      expect(submitButton.attributes("disabled")).toBeUndefined();
    });
  });

  describe("Form Submission", () => {
    beforeEach(async () => {
      const emailInput = wrapper.find("#email-address");
      await emailInput.setValue("test@example.com");
    });

    it("should call forgotPassword on form submission", async () => {
      mockAuthStore.forgotPassword.mockResolvedValue({ success: true });

      const form = wrapper.find("form");
      await form.trigger("submit");
      await nextTick();

      expect(mockAuthStore.forgotPassword).toHaveBeenCalledWith({
        email: "test@example.com",
      });
    });

    it("should show loading state during submission", async () => {
      mockAuthStore.forgotPassword.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve({ success: true }), 100),
          ),
      );

      const form = wrapper.find("form");
      const submitButton = wrapper.find('button[type="submit"]');

      await form.trigger("submit");
      await nextTick();

      expect(submitButton.text()).toBe("Sending...");
      expect(submitButton.attributes("disabled")).toBeDefined();
    });

    it("should not submit form when email is empty", async () => {
      const emailInput = wrapper.find("#email-address");
      await emailInput.setValue("");

      const form = wrapper.find("form");
      await form.trigger("submit");

      expect(mockAuthStore.forgotPassword).not.toHaveBeenCalled();
    });
  });

  describe("Success State", () => {
    beforeEach(async () => {
      const emailInput = wrapper.find("#email-address");
      await emailInput.setValue("test@example.com");

      mockAuthStore.forgotPassword.mockResolvedValue({ success: true });

      const form = wrapper.find("form");
      await form.trigger("submit");
      await nextTick();
    });

    it("should show success message after email sent", () => {
      expect(wrapper.find("h2").text()).toBe("Check Your Email");
      expect(wrapper.text()).toContain(
        "We've sent a password reset link to your email address",
      );
      expect(wrapper.text()).toContain("Email Sent Successfully");
      expect(wrapper.text()).toContain(
        "Check your email and click the link to reset your password",
      );
      expect(wrapper.text()).toContain(
        "Don't forget to check your spam folder",
      );
    });

    it("should hide the form after success", () => {
      expect(wrapper.find("form").exists()).toBe(false);
      expect(wrapper.find("#email-address").exists()).toBe(false);
    });

    it("should show resend email button", () => {
      const resendButton = wrapper
        .findAll("button")
        .find((btn: any) => btn.text().includes("Resend Email"));
      expect(resendButton?.exists()).toBe(true);
    });

    it("should show back to sign in button", () => {
      const backButton = wrapper
        .findAll("button")
        .find((btn: any) => btn.text().includes("Back to Sign In"));
      expect(backButton?.exists()).toBe(true);
    });

    it("should handle resend email", async () => {
      mockAuthStore.forgotPassword.mockResolvedValue({ success: true });

      const resendButton = wrapper
        .findAll("button")
        .find((btn: any) => btn.text().includes("Resend Email"));

      await resendButton?.trigger("click");
      await nextTick();

      expect(mockAuthStore.forgotPassword).toHaveBeenCalledWith({
        email: "test@example.com",
      });
    });

    it("should navigate to login on back button click", async () => {
      const backButton = wrapper
        .findAll("button")
        .find((btn: any) => btn.text().includes("Back to Sign In"));

      await backButton?.trigger("click");

      expect(mockRouter.push).toHaveBeenCalledWith("/login");
    });
  });

  describe("Error Handling", () => {
    beforeEach(async () => {
      const emailInput = wrapper.find("#email-address");
      await emailInput.setValue("test@example.com");
    });

    it("should display error messages when error exists", async () => {
      // Create a new component instance with error already set
      mockAuthStore.error = { message: "Email not found" };
      createWrapper();

      const emailInput = wrapper.find("#email-address");
      await emailInput.setValue("test@example.com");
      await nextTick();

      expect(wrapper.text()).toContain("Unable to Send Reset Email");
      expect(wrapper.text()).toContain("Email not found");
    });

    it("should not display error in success state", async () => {
      mockAuthStore.forgotPassword.mockResolvedValue({ success: true });

      const form = wrapper.find("form");
      await form.trigger("submit");
      await nextTick();

      // Set error after success
      mockAuthStore.error = { message: "Some error" };
      await wrapper.vm.$forceUpdate();
      await nextTick();

      expect(wrapper.text()).not.toContain("Unable to Send Reset Email");
      expect(wrapper.text()).not.toContain("Some error");
    });

    it("should handle forgot password failure", async () => {
      // Set up error state
      mockAuthStore.error = { message: "Email address not found" };
      mockAuthStore.forgotPassword.mockResolvedValue({
        success: false,
        message: "Email address not found",
      });

      // Re-create wrapper with error state
      createWrapper();

      const emailInput = wrapper.find("#email-address");
      await emailInput.setValue("test@example.com");
      await nextTick();

      expect(wrapper.text()).toContain("Unable to Send Reset Email");
      expect(wrapper.text()).toContain("Email address not found");
      expect(wrapper.find("form").exists()).toBe(true); // Form should still be visible
    });
  });

  describe("Loading States", () => {
    beforeEach(async () => {
      const emailInput = wrapper.find("#email-address");
      await emailInput.setValue("test@example.com");
    });

    it("should disable resend button during loading", async () => {
      mockAuthStore.forgotPassword.mockResolvedValue({ success: true });

      const form = wrapper.find("form");
      await form.trigger("submit");
      await nextTick();

      // Now test resend loading
      mockAuthStore.forgotPassword.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve({ success: true }), 100),
          ),
      );

      const resendButton = wrapper
        .findAll("button")
        .find((btn: any) => btn.text().includes("Resend Email"));

      await resendButton?.trigger("click");
      await nextTick();

      const updatedResendButton = wrapper
        .findAll("button")
        .find((btn: any) => btn.text().includes("Sending..."));

      expect(updatedResendButton?.attributes("disabled")).toBeDefined();
    });

    it("should disable email input during loading", async () => {
      mockAuthStore.forgotPassword.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve({ success: true }), 100),
          ),
      );

      const form = wrapper.find("form");
      await form.trigger("submit");
      await nextTick();

      const emailInput = wrapper.find("#email-address");
      expect(emailInput.attributes("disabled")).toBeDefined();
    });
  });

  describe("Error Clearing", () => {
    it("should clear errors when email changes", async () => {
      const emailInput = wrapper.find("#email-address");
      await emailInput.setValue("test@example.com");

      expect(mockAuthStore.clearError).toHaveBeenCalled();
    });
  });

  describe("Accessibility", () => {
    it("should have proper form labels", () => {
      expect(wrapper.find('label[for="email-address"]').exists()).toBe(true);
    });

    it("should have proper input attributes", () => {
      const emailInput = wrapper.find("#email-address");

      expect(emailInput.attributes("type")).toBe("email");
      expect(emailInput.attributes("autocomplete")).toBe("username");
      expect(emailInput.attributes("required")).toBeDefined();
    });

    it("should have proper button states", async () => {
      const submitButton = wrapper.find('button[type="submit"]');

      // Initially disabled
      expect(submitButton.attributes("disabled")).toBeDefined();

      // Enabled after email input
      const emailInput = wrapper.find("#email-address");
      await emailInput.setValue("test@example.com");
      await nextTick();

      expect(submitButton.attributes("disabled")).toBeUndefined();
    });
  });

  describe("Security Features", () => {
    it("should display security notice", () => {
      expect(wrapper.text()).toContain(
        "For security reasons, we will only send reset links to registered email addresses",
      );
    });

    it("should not reveal whether email exists", async () => {
      // Even if email doesn't exist, should show success to prevent email enumeration
      mockAuthStore.forgotPassword.mockResolvedValue({ success: true });

      const emailInput = wrapper.find("#email-address");
      await emailInput.setValue("nonexistent@example.com");

      const form = wrapper.find("form");
      await form.trigger("submit");
      await nextTick();

      expect(wrapper.text()).toContain("Check Your Email");
      expect(wrapper.text()).toContain("Email Sent Successfully");
    });
  });
});
