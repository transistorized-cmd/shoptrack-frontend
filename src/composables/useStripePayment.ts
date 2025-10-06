import { ref, computed } from 'vue';
import { loadStripe } from '@stripe/stripe-js';
import type { Stripe, StripeElements, StripeCardElement } from '@stripe/stripe-js';
import subscriptionService from '@/services/subscriptionService';

// Stripe publishable key (should be in env variables)
const STRIPE_PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '';

/**
 * Composable for Stripe payment integration
 * Handles payment method collection, subscription creation, and Stripe Elements setup
 */
export function useStripePayment() {
  const stripe = ref<Stripe | null>(null);
  const elements = ref<StripeElements | null>(null);
  const cardElement = ref<StripeCardElement | null>(null);

  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const setupIntentClientSecret = ref<string | null>(null);

  /**
   * Initialize Stripe
   */
  const initializeStripe = async () => {
    if (!STRIPE_PUBLISHABLE_KEY) {
      error.value = 'Stripe publishable key is not configured';
      console.error('Missing VITE_STRIPE_PUBLISHABLE_KEY environment variable');
      return false;
    }

    try {
      stripe.value = await loadStripe(STRIPE_PUBLISHABLE_KEY);

      if (!stripe.value) {
        error.value = 'Failed to load Stripe';
        return false;
      }

      return true;
    } catch (err: any) {
      error.value = err.message || 'Failed to initialize Stripe';
      console.error('Stripe initialization error:', err);
      return false;
    }
  };

  /**
   * Create Stripe Elements for payment method collection
   */
  const createPaymentElements = async (elementType: 'card' | 'payment' = 'card') => {
    if (!stripe.value) {
      await initializeStripe();
    }

    if (!stripe.value) {
      error.value = 'Stripe not initialized';
      return null;
    }

    try {
      // Create setup intent to get client secret
      const setupIntent = await subscriptionService.createSetupIntent();
      setupIntentClientSecret.value = setupIntent.clientSecret;

      // Create Stripe Elements instance
      elements.value = stripe.value.elements({
        clientSecret: setupIntent.clientSecret,
      });

      return elements.value;
    } catch (err: any) {
      error.value = err.response?.data?.message || err.message || 'Failed to create payment elements';
      console.error('Create payment elements error:', err);
      return null;
    }
  };

  /**
   * Mount card element to DOM
   */
  const mountCardElement = async (elementId: string) => {
    if (!elements.value) {
      await createPaymentElements();
    }

    if (!elements.value) {
      return false;
    }

    try {
      // Detect dark mode
      const isDarkMode = document.documentElement.classList.contains('dark');

      // Create card element with theme-appropriate colors
      cardElement.value = elements.value.create('card', {
        style: {
          base: {
            fontSize: '16px',
            color: isDarkMode ? '#e5e7eb' : '#32325d',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            '::placeholder': {
              color: isDarkMode ? '#9ca3af' : '#aab7c4',
            },
          },
          invalid: {
            color: '#ef4444',
            iconColor: '#ef4444',
          },
        },
      });

      // Mount to DOM
      const element = document.getElementById(elementId);
      if (element) {
        cardElement.value.mount(`#${elementId}`);

        // Listen for errors
        cardElement.value.on('change', (event) => {
          if (event.error) {
            error.value = event.error.message;
          } else {
            error.value = null;
          }
        });

        return true;
      } else {
        error.value = `Element with id "${elementId}" not found`;
        return false;
      }
    } catch (err: any) {
      error.value = err.message || 'Failed to mount card element';
      console.error('Mount card element error:', err);
      return false;
    }
  };

  /**
   * Confirm payment method setup and get payment method ID
   */
  const confirmSetup = async (cardholderName?: string): Promise<string | null> => {
    if (!stripe.value || !setupIntentClientSecret.value || !cardElement.value) {
      error.value = 'Stripe not properly initialized';
      return null;
    }

    isLoading.value = true;
    error.value = null;

    try {
      const paymentMethodData: any = {
        card: cardElement.value,
      };

      // Add billing details if cardholder name is provided
      if (cardholderName) {
        paymentMethodData.billing_details = {
          name: cardholderName,
        };
      }

      const { setupIntent, error: stripeError } = await stripe.value.confirmCardSetup(
        setupIntentClientSecret.value,
        {
          payment_method: paymentMethodData,
        }
      );

      if (stripeError) {
        error.value = stripeError.message || 'Failed to confirm payment method';
        return null;
      }

      if (setupIntent?.payment_method) {
        return setupIntent.payment_method as string;
      }

      error.value = 'No payment method returned';
      return null;
    } catch (err: any) {
      error.value = err.message || 'Failed to confirm payment method';
      console.error('Confirm setup error:', err);
      return null;
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * Add payment method to user's account
   */
  const addPaymentMethod = async (paymentMethodId: string) => {
    try {
      const paymentMethod = await subscriptionService.addPaymentMethod({
        paymentMethodId
      });
      return paymentMethod;
    } catch (err: any) {
      error.value = err.response?.data?.message || err.message || 'Failed to add payment method';
      console.error('Add payment method error:', err);
      throw err;
    }
  };

  /**
   * Complete payment method collection flow
   * Returns the payment method ID after confirmation and addition to user's account
   */
  const collectPaymentMethod = async (cardholderName?: string): Promise<string | null> => {
    // Step 1: Confirm setup intent and get Stripe payment method ID
    const stripePaymentMethodId = await confirmSetup(cardholderName);

    if (!stripePaymentMethodId) {
      return null;
    }

    // Step 2: Add payment method to user's account in backend
    try {
      const paymentMethod = await addPaymentMethod(stripePaymentMethodId);
      return stripePaymentMethodId;
    } catch (err) {
      return null;
    }
  };

  /**
   * Cleanup Stripe elements
   */
  const cleanup = () => {
    if (cardElement.value) {
      cardElement.value.destroy();
      cardElement.value = null;
    }

    elements.value = null;
    setupIntentClientSecret.value = null;
    error.value = null;
  };

  const isReady = computed(() => !!stripe.value);

  return {
    // State
    isLoading,
    error,
    isReady,

    // Methods
    initializeStripe,
    createPaymentElements,
    mountCardElement,
    confirmSetup,
    addPaymentMethod,
    collectPaymentMethod,
    cleanup
  };
}
