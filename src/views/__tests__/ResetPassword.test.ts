import { describe, it, expect, beforeEach, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { nextTick } from "vue";
import ResetPassword from "../ResetPassword.vue";
import { createMockRouter } from "../../../tests/utils/router";
import { useAuthStore } from "@/stores/auth";

// Mock dependencies
vi.mock("@/stores/auth");
vi.mock("vue-i18n", async (importOriginal) => {
  const actual = await importOriginal() as any;
  return {
    ...actual,
    useI18n: () => ({
      t: (key: string) => key,
    }),
  };
});

describe("ResetPassword Component", () => {
  let wrapper: any;
  let mockAuthStore: any;
  let mockRouter: any;

  const createWrapper = (
    query: { token?: string; email?: string } = { token: "valid-token", email: "test@example.com" },
  ) => {
    const { mockRouter: router } = createMockRouter("/reset-password");
    mockRouter = router;

    // Mock the current route with query parameters
    const queryParams = new URLSearchParams();
    if (query.token) queryParams.set('token', query.token);
    if (query.email) queryParams.set('email', query.email);
    const queryString = queryParams.toString();

    mockRouter.currentRoute.value = {
      path: "/reset-password",
      query,
      params: {},
      name: "ResetPassword",
      hash: "",
      fullPath: `/reset-password${queryString ? '?' + queryString : ''}`,
      matched: [],
      meta: {},
      redirectedFrom: undefined,
    };

    wrapper = mount(ResetPassword, {
      global: {
        plugins: [mockRouter],
        mocks: {
          $t: (key: string) => {
            const translations: Record<string, string> = {
              "auth.passwordUpdated": "Password Updated",
              "auth.resetPasswordTitle": "Reset Your Password",
              "auth.passwordUpdatedDescription":
                "Your password has been successfully updated.",
              "auth.resetPasswordDescription": "Enter your new password below.",
              "auth.passwordResetSuccessful": "Password Reset Successful",
              "auth.passwordResetSuccessDetails":
                "You can now sign in with your new password.",
              "auth.passwordResetFailed": "Password Reset Failed",
              "auth.invalidOrExpiredLink": "Invalid or Expired Link",
              "auth.invalidLinkDescription":
                "This password reset link is invalid or has expired. Please request a new one.",
              "auth.newPassword": "New Password",
              "auth.confirmNewPassword": "Confirm New Password",
              "auth.passwordRequirements.atLeast8Characters":
                "At least 8 characters",
              "auth.passwordRequirements.containsUppercase":
                "Contains uppercase letter",
              "auth.passwordRequirements.containsLowercase":
                "Contains lowercase letter",
              "auth.passwordRequirements.containsNumber": "Contains number",
              "auth.passwordRequirements.containsSpecialChar":
                "Contains special character",
              "auth.passwordStrength.veryWeak": "Very Weak",
              "auth.passwordStrength.weak": "Weak",
              "auth.passwordStrength.fair": "Fair",
              "auth.passwordStrength.good": "Good",
              "auth.passwordStrength.strong": "Strong",
              "auth.passwordStrength.veryStrong": "Very Strong",
              "auth.updatingPassword": "Updating password...",
              "auth.updatePassword": "Update Password",
              "auth.continueToSignIn": "Continue to Sign In",
              "auth.backToSignIn": "Back to Sign In",
              "auth.requestNewLink": "Request New Link",
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
      resetPassword: vi.fn(),
      clearError: vi.fn(),
    };
    vi.mocked(useAuthStore).mockReturnValue(mockAuthStore);

    createWrapper();
  });

  describe("Component Rendering", () => {
    it("should render reset password form with valid token", () => {
      expect(wrapper.find("h2").text()).toBe("Reset Your Password");
      expect(wrapper.find("#password").exists()).toBe(true);
      expect(wrapper.find("#confirm-password").exists()).toBe(true);
      expect(wrapper.find('button[type="submit"]').exists()).toBe(true);
      expect(wrapper.text()).toContain("Enter your new password below");
    });

    it("should render invalid token warning without token", async () => {
      createWrapper({ token: "", email: "test@example.com" });
      await nextTick();

      expect(wrapper.text()).toContain("Invalid or Expired Link");
      expect(wrapper.text()).toContain(
        "This password reset link is invalid or has expired",
      );
      expect(wrapper.find("form").exists()).toBe(false);
    });

    it("should render invalid token warning without email", async () => {
      createWrapper({ token: "valid-token", email: "" });
      await nextTick();

      expect(wrapper.text()).toContain("Invalid or Expired Link");
      expect(wrapper.find("form").exists()).toBe(false);
    });

    it("should render back to sign in link", () => {
      const backLink = wrapper.find('a[href="/login"]');
      expect(backLink.exists()).toBe(true);
      expect(backLink.text()).toBe("← Back to Sign In");
    });
  });

  describe("Form Input Handling", () => {
    it("should update password input value", async () => {
      const passwordInput = wrapper.find("#password");
      await passwordInput.setValue("NewPass123!");

      expect((passwordInput.element as HTMLInputElement).value).toBe(
        "NewPass123!",
      );
    });

    it("should update confirm password input value", async () => {
      const confirmInput = wrapper.find("#confirm-password");
      await confirmInput.setValue("NewPass123!");

      expect((confirmInput.element as HTMLInputElement).value).toBe(
        "NewPass123!",
      );
    });

    it("should toggle password visibility", async () => {
      const passwordInput = wrapper.find("#password");
      const toggleButtons = wrapper.findAll('button[type="button"]');
      const passwordToggle = toggleButtons[0]; // First toggle button for password

      expect(passwordInput.attributes("type")).toBe("password");

      await passwordToggle.trigger("click");
      expect(passwordInput.attributes("type")).toBe("text");

      await passwordToggle.trigger("click");
      expect(passwordInput.attributes("type")).toBe("password");
    });

    it("should toggle confirm password visibility", async () => {
      const confirmInput = wrapper.find("#confirm-password");
      const toggleButtons = wrapper.findAll('button[type="button"]');
      const confirmToggle = toggleButtons[1]; // Second toggle button for confirm password

      expect(confirmInput.attributes("type")).toBe("password");

      await confirmToggle.trigger("click");
      expect(confirmInput.attributes("type")).toBe("text");

      await confirmToggle.trigger("click");
      expect(confirmInput.attributes("type")).toBe("password");
    });
  });

  describe("Password Strength Validation", () => {
    beforeEach(async () => {
      const passwordInput = wrapper.find("#password");
      await passwordInput.setValue("TestPass123!");
      await nextTick();
    });

    it("should show password strength indicator", () => {
      expect(wrapper.find(".bg-gray-200.rounded-full").exists()).toBe(true);
    });

    it("should show password requirements checklist", () => {
      const requirements = wrapper.findAll("ul li");
      expect(requirements.length).toBe(5); // 5 password requirements
    });

    it("should validate password strength", async () => {
      const passwordInput = wrapper.find("#password");

      // Test weak password
      await passwordInput.setValue("a");
      await nextTick();

      expect(wrapper.text()).toContain("auth.passwordStrength.weak");

      // Test strong password
      await passwordInput.setValue("StrongPass123!");
      await nextTick();

      expect(wrapper.text()).toContain("auth.passwordStrength.veryStrong");
    });

    it("should update strength indicator color", async () => {
      const passwordInput = wrapper.find("#password");

      // Test weak password (red)
      await passwordInput.setValue("weak");
      await nextTick();

      const weakIndicator = wrapper.find(".bg-red-500");
      expect(weakIndicator.exists()).toBe(true);

      // Test strong password (green)
      await passwordInput.setValue("StrongPass123!");
      await nextTick();

      const strongIndicator = wrapper.find(".bg-green-500");
      expect(strongIndicator.exists()).toBe(true);
    });
  });

  describe("Form Validation", () => {
    const fillValidForm = async () => {
      await wrapper.find("#password").setValue("StrongPass123!");
      await wrapper.find("#confirm-password").setValue("StrongPass123!");
      await nextTick();
    };

    it("should disable submit button with invalid form", () => {
      const submitButton = wrapper.find('button[type="submit"]');
      expect(submitButton.attributes("disabled")).toBeDefined();
    });

    it("should enable submit button with valid form", async () => {
      await fillValidForm();

      const submitButton = wrapper.find('button[type="submit"]');
      expect(submitButton.attributes("disabled")).toBeUndefined();
    });

    it("should validate password confirmation", async () => {
      const passwordInput = wrapper.find("#password");
      const confirmInput = wrapper.find("#confirm-password");

      await passwordInput.setValue("password123");
      await confirmInput.setValue("differentpassword");
      await nextTick();

      expect(wrapper.text()).toContain("Passwords do not match");
    });

    it("should require minimum password strength", async () => {
      const passwordInput = wrapper.find("#password");
      const confirmInput = wrapper.find("#confirm-password");

      await passwordInput.setValue("weak");
      await confirmInput.setValue("weak");
      await nextTick();

      const submitButton = wrapper.find('button[type="submit"]');
      expect(submitButton.attributes("disabled")).toBeDefined();
    });
  });

  describe("Form Submission", () => {
    const fillValidForm = async () => {
      await wrapper.find("#password").setValue("StrongPass123!");
      await wrapper.find("#confirm-password").setValue("StrongPass123!");
      await nextTick();
    };

    it("should call resetPassword on form submission", async () => {
      await fillValidForm();

      mockAuthStore.resetPassword.mockResolvedValue({ success: true });

      const form = wrapper.find("form");
      await form.trigger("submit");
      await nextTick();

      expect(mockAuthStore.resetPassword).toHaveBeenCalledWith({
        email: "test@example.com",
        token: "valid-token",
        password: "StrongPass123!",
        confirmPassword: "StrongPass123!",
      });
    });

    it("should show loading state during submission", async () => {
      await fillValidForm();

      mockAuthStore.resetPassword.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve({ success: true }), 100),
          ),
      );

      const form = wrapper.find("form");
      const submitButton = wrapper.find('button[type="submit"]');

      await form.trigger("submit");
      await nextTick();

      expect(submitButton.text()).toBe("Updating password...");
      expect(submitButton.attributes("disabled")).toBeDefined();
    });

    it("should not submit invalid form", async () => {
      // Don't fill form completely
      await wrapper.find("#password").setValue("weak");

      const form = wrapper.find("form");
      await form.trigger("submit");

      expect(mockAuthStore.resetPassword).not.toHaveBeenCalled();
    });
  });

  describe("Success State", () => {
    beforeEach(async () => {
      await wrapper.find("#password").setValue("StrongPass123!");
      await wrapper.find("#confirm-password").setValue("StrongPass123!");

      mockAuthStore.resetPassword.mockResolvedValue({ success: true });

      const form = wrapper.find("form");
      await form.trigger("submit");
      await nextTick();
    });

    it("should show success message after password reset", () => {
      expect(wrapper.find("h2").text()).toBe("Password Updated");
      expect(wrapper.text()).toContain(
        "Your password has been successfully updated",
      );
      expect(wrapper.text()).toContain("Password Reset Successful");
      expect(wrapper.text()).toContain(
        "You can now sign in with your new password",
      );
    });

    it("should hide the form after success", () => {
      expect(wrapper.find("form").exists()).toBe(false);
      expect(wrapper.find("#password").exists()).toBe(false);
    });

    it("should show continue to sign in button", () => {
      const continueButton = wrapper
        .findAll("button")
        .find((btn: any) => btn.text().includes("Continue to Sign In"));
      expect(continueButton?.exists()).toBe(true);
    });

    it("should navigate to login on continue button click", async () => {
      const continueButton = wrapper
        .findAll("button")
        .find((btn: any) => btn.text().includes("Continue to Sign In"));

      await continueButton?.trigger("click");

      expect(mockRouter.push).toHaveBeenCalledWith("/login");
    });
  });

  describe("Invalid Token State", () => {
    beforeEach(() => {
      createWrapper({ token: "", email: "" });
    });

    it("should show invalid token warning", () => {
      expect(wrapper.text()).toContain("Invalid or Expired Link");
      expect(wrapper.text()).toContain(
        "This password reset link is invalid or has expired",
      );
    });

    it("should show request new link button", () => {
      const requestButton = wrapper
        .findAll("button")
        .find((btn: any) => btn.text().includes("Request New Link"));
      expect(requestButton?.exists()).toBe(true);
    });

    it("should navigate to forgot password on request new link", async () => {
      const requestButton = wrapper
        .findAll("button")
        .find((btn: any) => btn.text().includes("Request New Link"));

      await requestButton?.trigger("click");

      expect(mockRouter.push).toHaveBeenCalledWith("/forgot-password");
    });

    it("should show back to sign in button", () => {
      const backButton = wrapper
        .findAll("button")
        .find((btn: any) => btn.text().includes("Back to Sign In"));
      expect(backButton?.exists()).toBe(true);
    });
  });

  describe("Error Handling", () => {
    beforeEach(async () => {
      await wrapper.find("#password").setValue("StrongPass123!");
      await wrapper.find("#confirm-password").setValue("StrongPass123!");
    });

    it("should display reset password errors", async () => {
      // Set the error directly on the reactive authStore
      mockAuthStore.error = { message: "Token has expired" };
      
      // Re-create wrapper to ensure error state is picked up
      createWrapper();
      await nextTick();

      expect(wrapper.text()).toContain("Password Reset Failed");
      expect(wrapper.text()).toContain("Token has expired");
    });

    it("should display detailed validation errors", async () => {
      mockAuthStore.error = {
        message: "Validation failed",
        details: {
          password: ["Password too weak"],
          token: ["Invalid token"],
        },
      };
      
      // Re-create wrapper to ensure error state is picked up
      createWrapper();
      await nextTick();

      expect(wrapper.text()).toContain("password: Password too weak");
      expect(wrapper.text()).toContain("token: Invalid token");
    });

    it("should handle expired token error", async () => {
      mockAuthStore.resetPassword.mockResolvedValue({
        success: false,
        message: "Token is invalid or expired",
      });

      const form = wrapper.find("form");
      await form.trigger("submit");
      await nextTick();

      expect(wrapper.text()).toContain("Invalid or Expired Link");
      expect(wrapper.find("form").exists()).toBe(false);
    });

    it("should not display error in success state", async () => {
      mockAuthStore.resetPassword.mockResolvedValue({ success: true });

      const form = wrapper.find("form");
      await form.trigger("submit");
      await nextTick();

      // Set error after success
      mockAuthStore.error = { message: "Some error" };
      await wrapper.vm.$forceUpdate();
      await nextTick();

      expect(wrapper.text()).not.toContain("Password Reset Failed");
      expect(wrapper.text()).not.toContain("Some error");
    });
  });

  describe("Error Clearing", () => {
    it("should clear errors when form inputs change", async () => {
      const passwordInput = wrapper.find("#password");
      await passwordInput.setValue("newpassword");

      expect(mockAuthStore.clearError).toHaveBeenCalled();
    });
  });

  describe("Accessibility", () => {
    it("should have proper form labels", () => {
      expect(wrapper.find('label[for="password"]').exists()).toBe(true);
      expect(wrapper.find('label[for="confirm-password"]').exists()).toBe(true);
    });

    it("should have proper input attributes", () => {
      const passwordInput = wrapper.find("#password");
      const confirmInput = wrapper.find("#confirm-password");

      expect(passwordInput.attributes("type")).toBe("password");
      expect(passwordInput.attributes("autocomplete")).toBe("new-password");
      expect(passwordInput.attributes("required")).toBeDefined();

      expect(confirmInput.attributes("type")).toBe("password");
      expect(confirmInput.attributes("autocomplete")).toBe("new-password");
      expect(confirmInput.attributes("required")).toBeDefined();
    });

    it("should have proper button states", async () => {
      const submitButton = wrapper.find('button[type="submit"]');

      // Initially disabled
      expect(submitButton.attributes("disabled")).toBeDefined();

      // Enabled after valid form
      await wrapper.find("#password").setValue("StrongPass123!");
      await wrapper.find("#confirm-password").setValue("StrongPass123!");
      await nextTick();

      expect(submitButton.attributes("disabled")).toBeUndefined();
    });
  });

  describe("Security Features", () => {
    it("should validate token and email from URL parameters", () => {
      expect(wrapper.vm.form.token).toBe("valid-token");
      expect(wrapper.vm.form.email).toBe("test@example.com");
    });

    it("should handle missing URL parameters securely", async () => {
      createWrapper({ token: undefined, email: undefined });
      
      // Wait for onMounted hook to execute
      await nextTick();

      expect(wrapper.text()).toContain("Invalid or Expired Link");
      expect(wrapper.find("form").exists()).toBe(false);
    });

    it("should require strong passwords", async () => {
      const passwordInput = wrapper.find("#password");
      await passwordInput.setValue("weak");
      await nextTick();

      const submitButton = wrapper.find('button[type="submit"]');
      expect(submitButton.attributes("disabled")).toBeDefined();
    });
  });
});
