import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";
import { mount } from "@vue/test-utils";
import { nextTick } from "vue";
import Register from "../Register.vue";
import { createMockRouter } from "../../../tests/utils/router";
import { useAuthStore } from "@/stores/auth";
import { useOAuth } from "@/composables/useOAuth";

// Mock dependencies
vi.mock("@/stores/auth");
vi.mock("@/composables/useOAuth");
vi.mock("vue-i18n", async (importOriginal) => {
  const actual = (await importOriginal()) as any;
  return {
    ...actual,
    useI18n: () => ({
      t: (key: string) => key,
    }),
  };
});

describe("Register Component", () => {
  let wrapper: any;
  let mockAuthStore: any;
  let mockOAuth: any;
  let mockRouter: any;

  const createWrapper = () => {
    const { mockRouter: router } = createMockRouter("/register");
    mockRouter = router;

    wrapper = mount(Register, {
      global: {
        plugins: [mockRouter],
        mocks: {
          $t: (key: string) => {
            const translations: Record<string, string> = {
              "auth.createYourAccount": "Create Your Account",
              "common.or": "Or",
              "auth.signInToExistingAccount": "Sign in to existing account",
              "auth.registrationError": "Registration Error",
              "auth.accountCreatedSuccessfully": "Account Created Successfully",
              "auth.quickSignUpWith": "Quick sign up with",
              "auth.orRegisterWithEmail": "Or register with email",
              "auth.firstName": "First Name",
              "auth.lastName": "Last Name",
              "auth.email": "Email",
              "auth.password": "Password",
              "auth.confirmPassword": "Confirm Password",
              "auth.iAgreeToThe": "I agree to the",
              "auth.termsOfService": "Terms of Service",
              "auth.and": "and",
              "auth.privacyPolicy": "Privacy Policy",
              "auth.creatingAccount": "Creating account...",
              "auth.createAccount": "Create Account",
              "auth.continueToSignInButton": "Continue to Sign In",
              "auth.sending": "Sending...",
              "auth.resendConfirmationEmail": "Resend confirmation email",
              "auth.securityNoticeRegistration":
                "Your data is encrypted and secure.",
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
      register: vi.fn(),
      resendEmailConfirmation: vi.fn(),
      clearError: vi.fn(),
    };
    vi.mocked(useAuthStore).mockReturnValue(mockAuthStore);

    // Mock OAuth composable
    mockOAuth = {
      loading: false,
      error: null,
      loginWithGoogle: vi.fn(),
      loginWithApple: vi.fn(),
      clearError: vi.fn(),
    };
    vi.mocked(useOAuth).mockReturnValue(mockOAuth);

    createWrapper();
  });

  describe("Component Rendering", () => {
    it("should render the registration form with all elements", () => {
      expect(wrapper.find("h2").text()).toBe("Create Your Account");
      expect(wrapper.find("#first-name").exists()).toBe(true);
      expect(wrapper.find("#last-name").exists()).toBe(true);
      expect(wrapper.find("#email-address").exists()).toBe(true);
      expect(wrapper.find("#password").exists()).toBe(true);
      expect(wrapper.find("#confirm-password").exists()).toBe(true);
      expect(wrapper.find("#accept-terms").exists()).toBe(true);
      expect(wrapper.find('button[type="submit"]').exists()).toBe(true);
    });

    it("should render OAuth registration buttons", () => {
      const googleButton = wrapper
        .findAll("button")
        .find((btn: any) => btn.text().includes("Google"));
      const appleButton = wrapper
        .findAll("button")
        .find((btn: any) => btn.text().includes("Apple"));

      expect(googleButton?.exists()).toBe(true);
      expect(appleButton?.exists()).toBe(true);
    });

    it("should render sign in link", () => {
      const signInLink = wrapper.find('a[href="/login"]');
      expect(signInLink.exists()).toBe(true);
      expect(signInLink.text()).toBe("Sign in to existing account");
    });
  });

  describe("Form Input Handling", () => {
    it("should update first name input", async () => {
      const input = wrapper.find("#first-name");
      await input.setValue("John");

      expect((input.element as HTMLInputElement).value).toBe("John");
    });

    it("should update last name input", async () => {
      const input = wrapper.find("#last-name");
      await input.setValue("Doe");

      expect((input.element as HTMLInputElement).value).toBe("Doe");
    });

    it("should update email input", async () => {
      const input = wrapper.find("#email-address");
      await input.setValue("john@example.com");

      expect((input.element as HTMLInputElement).value).toBe(
        "john@example.com",
      );
    });

    it("should toggle password visibility", async () => {
      const passwordInput = wrapper.find("#password");
      const toggleButtons = wrapper.findAll('button[type="button"]');
      const passwordToggle = toggleButtons.find((btn: any) =>
        btn.element.closest(".relative")?.querySelector("#password"),
      );

      expect(passwordInput.attributes("type")).toBe("password");

      await passwordToggle?.trigger("click");
      expect(passwordInput.attributes("type")).toBe("text");

      await passwordToggle?.trigger("click");
      expect(passwordInput.attributes("type")).toBe("password");
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

    it("should validate minimum length", async () => {
      const passwordInput = wrapper.find("#password");

      await passwordInput.setValue("short");
      await nextTick();

      // Short password should not meet requirement
      const requirements = wrapper.findAll("ul li");
      const lengthReq = requirements[0];
      expect(lengthReq.classes()).not.toContain("text-green-600");

      await passwordInput.setValue("longpassword");
      await nextTick();

      // Long password should meet requirement
      const updatedReqs = wrapper.findAll("ul li");
      const updatedLengthReq = updatedReqs[0];
      expect(updatedLengthReq.classes()).toContain("text-green-600");
    });
  });

  describe("Form Validation", () => {
    const fillValidForm = async () => {
      await wrapper.find("#first-name").setValue("John");
      await wrapper.find("#last-name").setValue("Doe");
      await wrapper.find("#email-address").setValue("john@example.com");
      await wrapper.find("#password").setValue("StrongPass123!");
      await wrapper.find("#confirm-password").setValue("StrongPass123!");
      await wrapper.find("#accept-terms").setChecked(true);
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

    it("should validate email format", async () => {
      const emailInput = wrapper.find("#email-address");

      await emailInput.setValue("invalid-email");
      await emailInput.trigger("blur");
      await nextTick();

      expect(wrapper.text()).toContain("Please enter a valid email address");
    });

    it("should validate password confirmation", async () => {
      const passwordInput = wrapper.find("#password");
      const confirmInput = wrapper.find("#confirm-password");

      await passwordInput.setValue("password123");
      await confirmInput.setValue("differentpassword");
      await nextTick();

      expect(wrapper.text()).toContain("Passwords do not match");
    });

    it("should require terms acceptance", async () => {
      await wrapper.find("#first-name").setValue("John");
      await wrapper.find("#last-name").setValue("Doe");
      await wrapper.find("#email-address").setValue("john@example.com");
      await wrapper.find("#password").setValue("StrongPass123!");
      await wrapper.find("#confirm-password").setValue("StrongPass123!");
      // Don't check terms

      await nextTick();

      const submitButton = wrapper.find('button[type="submit"]');
      expect(submitButton.attributes("disabled")).toBeDefined();
    });
  });

  describe("Form Submission", () => {
    const fillValidForm = async () => {
      await wrapper.find("#first-name").setValue("John");
      await wrapper.find("#last-name").setValue("Doe");
      await wrapper.find("#email-address").setValue("john@example.com");
      await wrapper.find("#password").setValue("StrongPass123!");
      await wrapper.find("#confirm-password").setValue("StrongPass123!");
      await wrapper.find("#accept-terms").setChecked(true);
      await nextTick();
    };

    it("should call register on form submission", async () => {
      await fillValidForm();

      mockAuthStore.register.mockResolvedValue({ success: true });

      const form = wrapper.find("form");
      await form.trigger("submit");
      await nextTick();

      expect(mockAuthStore.register).toHaveBeenCalledWith({
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
        password: "StrongPass123!",
        confirmPassword: "StrongPass123!",
        acceptTerms: true,
      });
    });

    it("should show loading state during registration", async () => {
      await fillValidForm();

      mockAuthStore.register.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve({ success: true }), 100),
          ),
      );

      const form = wrapper.find("form");
      const submitButton = wrapper.find('button[type="submit"]');

      await form.trigger("submit");
      await nextTick();

      expect(submitButton.text()).toBe("Creating account...");
      expect(submitButton.attributes("disabled")).toBeDefined();
    });

    it("should show success state after registration", async () => {
      await fillValidForm();

      mockAuthStore.register.mockResolvedValue({
        success: true,
        requiresEmailConfirmation: false,
      });

      const form = wrapper.find("form");
      await form.trigger("submit");
      await nextTick();

      expect(wrapper.text()).toContain("Account Created Successfully");
      const continueButton = wrapper
        .findAll("button")
        .find((btn: any) => btn.text().includes("Continue to Sign In"));
      expect(continueButton?.exists()).toBe(true);
      expect(continueButton?.text()).toContain("Continue to Sign In");
    });

    it("should handle email confirmation requirement", async () => {
      await fillValidForm();

      mockAuthStore.register.mockResolvedValue({
        success: true,
        requiresEmailConfirmation: true,
      });

      const form = wrapper.find("form");
      await form.trigger("submit");
      await nextTick();

      expect(wrapper.text()).toContain(
        "Please check your email and click the confirmation link",
      );
      const resendButton = wrapper
        .findAll("button")
        .find((btn: any) => btn.text().includes("Resend confirmation email"));
      expect(resendButton?.exists()).toBe(true);
      expect(resendButton?.text()).toContain("Resend confirmation email");
    });

    it("should not submit invalid form", async () => {
      // Don't fill form completely
      await wrapper.find("#email-address").setValue("john@example.com");

      const form = wrapper.find("form");
      await form.trigger("submit");

      expect(mockAuthStore.register).not.toHaveBeenCalled();
    });
  });

  describe("OAuth Registration", () => {
    it("should handle Google OAuth registration", async () => {
      mockOAuth.loginWithGoogle.mockResolvedValue({ success: true });

      const googleButton = wrapper
        .findAll("button")
        .find((btn: any) => btn.text().includes("Google"));

      await googleButton?.trigger("click");
      await nextTick();

      expect(mockOAuth.loginWithGoogle).toHaveBeenCalled();
    });

    it("should handle Apple OAuth registration", async () => {
      mockOAuth.loginWithApple.mockResolvedValue({ success: true });

      const appleButton = wrapper
        .findAll("button")
        .find((btn: any) => btn.text().includes("Apple"));

      await appleButton?.trigger("click");
      await nextTick();

      expect(mockOAuth.loginWithApple).toHaveBeenCalled();
    });

    it("should disable OAuth buttons during loading", async () => {
      mockOAuth.loading = true;
      await wrapper.vm.$forceUpdate();
      await nextTick();

      const googleButton = wrapper
        .findAll("button")
        .find((btn: any) => btn.text().includes("Google"));

      expect(googleButton?.attributes("disabled")).toBeDefined();
    });
  });

  describe("Error Handling", () => {
    it("should display registration errors", async () => {
      mockAuthStore.error = { message: "Email already exists" };
      wrapper.vm.hasAttemptedRegistration = true;
      await wrapper.vm.$forceUpdate();
      await nextTick();

      expect(wrapper.text()).toContain("Email already exists");
    });

    it("should display detailed validation errors", async () => {
      mockAuthStore.error = {
        message: "Validation failed",
        details: {
          email: ["Email format is invalid"],
          password: ["Password too weak"],
        },
      };
      wrapper.vm.hasAttemptedRegistration = true;
      await wrapper.vm.$forceUpdate();
      await nextTick();

      expect(wrapper.text()).toContain("email: Email format is invalid");
      expect(wrapper.text()).toContain("password: Password too weak");
    });

    it("should display OAuth errors", async () => {
      mockOAuth.error = "OAuth registration failed";
      wrapper.vm.hasAttemptedRegistration = true;
      await wrapper.vm.$forceUpdate();
      await nextTick();

      expect(wrapper.text()).toContain("OAuth registration failed");
    });
  });

  describe("Success Actions", () => {
    beforeEach(async () => {
      const form = wrapper.find("form");

      await wrapper.find("#first-name").setValue("John");
      await wrapper.find("#last-name").setValue("Doe");
      await wrapper.find("#email-address").setValue("john@example.com");
      await wrapper.find("#password").setValue("StrongPass123!");
      await wrapper.find("#confirm-password").setValue("StrongPass123!");
      await wrapper.find("#accept-terms").setChecked(true);

      mockAuthStore.register.mockResolvedValue({
        success: true,
        requiresEmailConfirmation: false,
      });

      await form.trigger("submit");
      await nextTick();
    });

    it("should navigate to login on continue button click", async () => {
      const continueButton = wrapper
        .findAll("button")
        .find((btn: any) => btn.text().includes("Continue to Sign In"));
      await continueButton?.trigger("click");
      await nextTick();

      expect(mockRouter.push).toHaveBeenCalledWith("/login");
    });

    it("should handle email confirmation resend", async () => {
      wrapper.vm.needsEmailConfirmation = true;
      await nextTick();

      mockAuthStore.resendEmailConfirmation.mockResolvedValue({
        success: true,
      });

      const resendButton = wrapper
        .findAll("button")
        .find((btn: any) => btn.text().includes("Resend confirmation email"));

      await resendButton?.trigger("click");
      await nextTick();

      expect(mockAuthStore.resendEmailConfirmation).toHaveBeenCalled();
      expect(wrapper.text()).toContain("Confirmation email sent");
    });
  });

  describe("Component Lifecycle", () => {
    it("should clear errors on mount", () => {
      expect(mockAuthStore.clearError).toHaveBeenCalled();
    });

    it("should clear errors when form inputs change", async () => {
      const emailInput = wrapper.find("#email-address");
      await emailInput.setValue("test@example.com");

      expect(mockAuthStore.clearError).toHaveBeenCalled();
      expect(mockOAuth.clearError).toHaveBeenCalled();
    });
  });

  describe("Accessibility", () => {
    it("should have proper form labels", () => {
      expect(wrapper.find('label[for="first-name"]').exists()).toBe(true);
      expect(wrapper.find('label[for="last-name"]').exists()).toBe(true);
      expect(wrapper.find('label[for="email-address"]').exists()).toBe(true);
      expect(wrapper.find('label[for="password"]').exists()).toBe(true);
      expect(wrapper.find('label[for="confirm-password"]').exists()).toBe(true);
      expect(wrapper.find('label[for="accept-terms"]').exists()).toBe(true);
    });

    it("should have proper input attributes", () => {
      const emailInput = wrapper.find("#email-address");
      const passwordInput = wrapper.find("#password");
      const firstNameInput = wrapper.find("#first-name");

      expect(emailInput.attributes("type")).toBe("email");
      expect(emailInput.attributes("autocomplete")).toBe("username");
      expect(emailInput.attributes("required")).toBeDefined();

      expect(passwordInput.attributes("type")).toBe("password");
      expect(passwordInput.attributes("autocomplete")).toBe("new-password");
      expect(passwordInput.attributes("required")).toBeDefined();

      expect(firstNameInput.attributes("autocomplete")).toBe("given-name");
    });

    it("should have external links with proper attributes", () => {
      const termsLink = wrapper.find('a[href="/terms"]');
      const privacyLink = wrapper.find('a[href="/privacy"]');

      expect(termsLink.attributes("target")).toBe("_blank");
      expect(termsLink.attributes("rel")).toBe("noopener noreferrer");

      expect(privacyLink.attributes("target")).toBe("_blank");
      expect(privacyLink.attributes("rel")).toBe("noopener noreferrer");
    });
  });
});
