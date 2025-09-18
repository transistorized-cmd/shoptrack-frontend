import { describe, it, expect, beforeEach } from 'vitest';
import {
  factories,
  variants,
  mockServices,
  createTestUser,
  createTestReceipt,
  testScenarios,
  resetFactories,
  userFactory,
  receiptFactory,
  apiResponseFactory,
  pluginFactory,
} from '../index';

describe('Test Data Factories', () => {
  beforeEach(() => {
    resetFactories();
  });

  describe('Basic Factory Functionality', () => {
    it('should create user with default values', () => {
      const user = factories.user.build();

      expect(user).toBeDefined();
      expect(user.id).toBeDefined();
      expect(user.email).toMatch(/\S+@\S+\.\S+/);
      expect(user.firstName).toBeTruthy();
      expect(user.lastName).toBeTruthy();
      expect(user.createdAt).toBeTruthy();
    });

    it('should allow field overrides', () => {
      const user = factories.user.build({
        email: 'specific@example.com',
        firstName: 'John',
      });

      expect(user.email).toBe('specific@example.com');
      expect(user.firstName).toBe('John');
      expect(user.lastName).toBeTruthy(); // Should still have default
    });

    it('should create multiple unique items', () => {
      const users = factories.user.buildList(3);

      expect(users).toHaveLength(3);
      expect(new Set(users.map(u => u.id)).size).toBe(3); // All unique IDs
      expect(new Set(users.map(u => u.email)).size).toBe(3); // All unique emails
    });
  });

  describe('User Variants', () => {
    it('should create authenticated user', () => {
      const user = variants.users.authenticated();

      expect(user.id).toBe(1);
      expect(user.email).toBe('test@example.com');
      expect(user.firstName).toBe('Test');
      expect(user.lastName).toBe('User');
      expect(user.emailConfirmed).toBe(true);
      expect(user.hasPassword).toBe(true);
      expect(user.isActive).toBe(true);
    });

    it('should create unconfirmed email user', () => {
      const user = variants.users.unconfirmedEmail();

      expect(user.emailConfirmed).toBe(false);
      expect(user.emailVerifiedAt).toBeNull();
    });

    it('should create OAuth-only user', () => {
      const user = variants.users.oauthOnly();

      expect(user.hasPassword).toBe(false);
      expect(user.provider).toBe('google');
      expect(user.connectedAccounts).toHaveLength(1);
      expect(user.connectedAccounts?.[0].provider).toBe('google');
    });

    it('should create premium user', () => {
      const user = variants.users.premium();

      expect(user.subscriptionStatus).toBe('active');
      expect(user.subscriptionPlan).toBe('premium');
      expect(user.subscriptionExpiresAt).toBeTruthy();
    });
  });

  describe('Receipt Factory', () => {
    it('should create receipt with items', () => {
      const receipt = factories.receipt.build();

      expect(receipt).toBeDefined();
      expect(receipt.id).toBeDefined();
      expect(receipt.filename).toBeTruthy();
      expect(receipt.items).toBeDefined();
      expect(Array.isArray(receipt.items)).toBe(true);
      expect(receipt.totalItemsDetected).toBe(receipt.items?.length);
    });

    it('should create completed receipt variant', () => {
      const receipt = variants.receipts.completed();

      expect(receipt.id).toBe(1);
      expect(receipt.filename).toBe('test-file.jpg');
      expect(receipt.processingStatus).toBe('completed');
      expect(receipt.storeName).toBe('Test Store');
      expect(receipt.totalItemsDetected).toBe(3);
      expect(receipt.items).toHaveLength(3);
    });

    it('should create failed receipt variant', () => {
      const receipt = variants.receipts.failed();

      expect(receipt.processingStatus).toBe('failed');
      expect(receipt.totalItemsDetected).toBe(0);
      expect(receipt.items).toEqual([]);
      expect(receipt.imageQualityAssessment).toBe('poor');
    });
  });

  describe('API Response Factory', () => {
    it('should create successful API response', () => {
      const response = variants.apiResponses.success({ test: 'data' });

      expect(response.success).toBe(true);
      expect(response.message).toBe('Success');
      expect(response.data).toEqual({ test: 'data' });
    });

    it('should create error API response', () => {
      const response = variants.apiResponses.notFound();

      expect(response.success).toBe(false);
      expect(response.message).toBe('Resource not found');
      expect(response.errors).toContain('The requested resource was not found');
    });

    it('should create axios response variants', () => {
      const okResponse = variants.axiosResponses.ok({ data: 'test' });

      expect(okResponse.status).toBe(200);
      expect(okResponse.statusText).toBe('OK');
      expect(okResponse.data.success).toBe(true);
      expect(okResponse.data.data).toEqual({ data: 'test' });
    });
  });

  describe('Helper Functions', () => {
    it('should create test user with auth response', () => {
      const { user, authResponse } = createTestUser();

      expect(user).toBeDefined();
      expect(authResponse).toBeDefined();
      expect(authResponse.user).toEqual(user);
      expect(authResponse.success).toBe(true);
    });

    it('should create test receipt with items', () => {
      const { receipt, items } = createTestReceipt({
        itemCount: 5,
        receipt: { storeName: 'Custom Store' },
      });

      expect(receipt).toBeDefined();
      expect(items).toHaveLength(5);
      expect(receipt.items).toEqual(items);
      expect(receipt.storeName).toBe('Custom Store');
      expect(receipt.totalItemsDetected).toBe(5);
      expect(receipt.successfullyParsed).toBe(5);

      // Items should have matching receiptId
      items.forEach(item => {
        expect(item.receiptId).toBe(receipt.id);
      });
    });
  });

  describe('Test Scenarios', () => {
    it('should create new user registration scenario', () => {
      const { user, authResponse } = testScenarios.newUserRegistration();

      expect(user).toBeDefined();
      expect(authResponse).toBeDefined();
      expect(authResponse.success).toBe(true);
    });

    it('should create user with receipts scenario', () => {
      const { user, authResponse, receipts } = testScenarios.userWithReceipts(3);

      expect(user).toBeDefined();
      expect(authResponse).toBeDefined();
      expect(receipts).toHaveLength(3);
    });

    it('should create failed upload scenario', () => {
      const { user, job, notification } = testScenarios.failedUpload();

      expect(user).toBeDefined();
      expect(job.status).toBe('failed');
      expect(notification.type).toBe('error');
    });
  });

  describe('Mock Services', () => {
    it('should provide auth service mocks', () => {
      expect(mockServices.auth.success.login).toBeDefined();
      expect(mockServices.auth.error.login).toBeDefined();
      expect(typeof mockServices.auth.success.login).toBe('function');
    });

    it('should provide receipts service mocks', () => {
      expect(mockServices.receipts.success.getReceipts).toBeDefined();
      expect(mockServices.receipts.error.getReceipts).toBeDefined();
      expect(typeof mockServices.receipts.success.getReceipts).toBe('function');
    });

    it('should return promises from mock services', async () => {
      const result = await mockServices.auth.success.login();
      expect(result).toBeDefined();
      expect(result.success).toBe(true);

      try {
        await mockServices.auth.error.login();
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });
  });

  describe('Type Safety', () => {
    it('should create properly typed objects', () => {
      const user = userFactory.build();
      const receipt = receiptFactory.build();

      // These should not cause TypeScript errors
      expect(typeof user.id).toBe('number');
      expect(typeof user.email).toBe('string');
      expect(typeof user.emailConfirmed).toBe('boolean');

      expect(typeof receipt.id).toBe('number');
      expect(typeof receipt.filename).toBe('string');
      expect(Array.isArray(receipt.items)).toBe(true);
    });
  });

  describe('Factory Customization', () => {
    it('should handle complex overrides', () => {
      const receipt = receiptFactory.build({
        storeName: 'Complex Store',
        items: [
          {
            id: 100,
            receiptId: 1,
            itemName: 'Custom Item',
            totalPrice: 99.99,
            confidence: 'manual',
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
          }
        ],
        totalItemsDetected: 1,
        successfullyParsed: 1,
      });

      expect(receipt.storeName).toBe('Complex Store');
      expect(receipt.items).toHaveLength(1);
      expect(receipt.items?.[0].itemName).toBe('Custom Item');
      expect(receipt.items?.[0].confidence).toBe('manual');
    });
  });

  describe('Deterministic Behavior', () => {
    it('should produce same results when seeded', () => {
      resetFactories(); // Reset with default seed

      const user1 = userFactory.build();
      const user2 = userFactory.build();

      resetFactories(); // Reset again with same seed

      const user3 = userFactory.build();
      const user4 = userFactory.build();

      // With same seed, should get same sequence
      expect(user1.email).toBe(user3.email);
      expect(user2.email).toBe(user4.email);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty list creation', () => {
      const users = userFactory.buildList(0);
      expect(users).toEqual([]);
    });

    it('should handle large list creation', () => {
      const users = userFactory.buildList(100);
      expect(users).toHaveLength(100);

      // Should all be unique
      const emails = users.map(u => u.email);
      expect(new Set(emails).size).toBe(100);
    });

    it('should handle nested overrides', () => {
      const { receipt } = createTestReceipt({
        receipt: {
          claudeResponseJson: {
            storeName: 'Nested Store',
            confidence: 'high',
            items: [],
            processingTime: 5000,
            imageQuality: 'excellent',
          }
        }
      });

      expect(receipt.claudeResponseJson?.storeName).toBe('Nested Store');
      expect(receipt.claudeResponseJson?.confidence).toBe('high');
    });
  });
});