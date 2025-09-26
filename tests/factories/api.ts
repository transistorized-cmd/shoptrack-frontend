/**
 * API response and HTTP-related test data factories
 * Provides factories for common API responses, errors, and HTTP patterns
 */
import { faker } from "@faker-js/faker";
import { createFactory, testId, testDate } from "./base";
import type { AxiosResponse, AxiosError, AxiosRequestConfig } from "axios";

/**
 * Generic API response factory
 */
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  errors?: string[];
  meta?: {
    page?: number;
    pageSize?: number;
    totalCount?: number;
    totalPages?: number;
  };
  timestamp?: string;
}

export const apiResponseFactory = createFactory<ApiResponse>(() => ({
  success: true,
  message: "Operation completed successfully",
  data: null,
  errors: [],
  meta: {},
  timestamp: testDate.recent(),
}));

/**
 * API error response factory
 */
export const apiErrorResponseFactory = createFactory<ApiResponse>(() => ({
  success: false,
  message: "Operation failed",
  data: null,
  errors: [faker.lorem.sentence()],
  timestamp: testDate.recent(),
}));

/**
 * Axios response factory
 */
export const axiosResponseFactory = createFactory<AxiosResponse>(() => ({
  data: apiResponseFactory.build(),
  status: 200,
  statusText: "OK",
  headers: {
    "content-type": "application/json",
    "x-request-id": testId.uuid(),
  },
  config: axiosRequestConfigFactory.build(),
  request: {},
}));

/**
 * Axios request config factory
 */
export const axiosRequestConfigFactory = createFactory<AxiosRequestConfig>(
  () => ({
    method: "get",
    url: "/api/test",
    baseURL: "http://localhost:5298",
    timeout: 8000,
    headers: {
      "Content-Type": "application/json",
      "X-Requested-With": "XMLHttpRequest",
    },
    withCredentials: true,
  }),
);

/**
 * Axios error factory
 */
export const axiosErrorFactory = createFactory<Partial<AxiosError>>(() => ({
  message: "Request failed",
  name: "AxiosError",
  code: "ERR_BAD_REQUEST",
  config: axiosRequestConfigFactory.build(),
  response: axiosResponseFactory.build({
    status: 400,
    statusText: "Bad Request",
    data: apiErrorResponseFactory.build(),
  }),
  isAxiosError: true,
  toJSON: () => ({}),
}));

/**
 * File upload response factory
 */
export interface UploadResponse {
  success: boolean;
  fileId: string;
  filename: string;
  size: number;
  url: string;
  processingJobId?: string;
}

export const uploadResponseFactory = createFactory<UploadResponse>(() => ({
  success: true,
  fileId: testId.uuid(),
  filename: `upload-${testId.sequence()}.jpg`,
  size: faker.number.int({ min: 1024, max: 10 * 1024 * 1024 }),
  url: `/uploads/${testId.uuid()}.jpg`,
  processingJobId: testId.uuid(),
}));

/**
 * Pagination metadata factory
 */
export interface PaginationMeta {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export const paginationMetaFactory = createFactory<PaginationMeta>(() => {
  const page = faker.number.int({ min: 1, max: 10 });
  const pageSize = faker.helpers.arrayElement([10, 20, 50, 100]);
  const totalCount = faker.number.int({ min: pageSize, max: 1000 });
  const totalPages = Math.ceil(totalCount / pageSize);

  return {
    page,
    pageSize,
    totalCount,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };
});

/**
 * Validation error factory
 */
export interface ValidationError {
  field: string;
  message: string;
  code: string;
  value?: any;
}

export const validationErrorFactory = createFactory<ValidationError>(() => ({
  field: faker.database.column(),
  message: faker.lorem.sentence(),
  code: faker.helpers.arrayElement([
    "required",
    "invalid_format",
    "too_long",
    "too_short",
    "invalid_value",
  ]),
  value: faker.lorem.word(),
}));

/**
 * Predefined API response variants
 */
export const apiResponseVariants = {
  /**
   * Successful response with data
   */
  success: <T>(data: T) =>
    apiResponseFactory.build({
      success: true,
      message: "Success",
      data,
    }),

  /**
   * Successful response without data
   */
  successNoData: () =>
    apiResponseFactory.build({
      success: true,
      message: "Operation completed successfully",
      data: null,
    }),

  /**
   * Not found error
   */
  notFound: () =>
    apiErrorResponseFactory.build({
      success: false,
      message: "Resource not found",
      errors: ["The requested resource was not found"],
    }),

  /**
   * Validation error
   */
  validationError: (
    errors: ValidationError[] = [validationErrorFactory.build()],
  ) =>
    apiErrorResponseFactory.build({
      success: false,
      message: "Validation failed",
      errors: errors.map((e) => `${e.field}: ${e.message}`),
    }),

  /**
   * Unauthorized error
   */
  unauthorized: () =>
    apiErrorResponseFactory.build({
      success: false,
      message: "Unauthorized",
      errors: ["Authentication required"],
    }),

  /**
   * Forbidden error
   */
  forbidden: () =>
    apiErrorResponseFactory.build({
      success: false,
      message: "Forbidden",
      errors: ["Insufficient permissions"],
    }),

  /**
   * Server error
   */
  serverError: () =>
    apiErrorResponseFactory.build({
      success: false,
      message: "Internal server error",
      errors: ["An unexpected error occurred"],
    }),

  /**
   * Rate limit error
   */
  rateLimited: () =>
    apiErrorResponseFactory.build({
      success: false,
      message: "Too many requests",
      errors: ["Rate limit exceeded. Please try again later."],
    }),
};

/**
 * Predefined Axios response variants
 */
export const axiosResponseVariants = {
  /**
   * 200 OK response
   */
  ok: <T>(data: T) =>
    axiosResponseFactory.build({
      status: 200,
      statusText: "OK",
      data: apiResponseVariants.success(data),
    }),

  /**
   * 201 Created response
   */
  created: <T>(data: T) =>
    axiosResponseFactory.build({
      status: 201,
      statusText: "Created",
      data: apiResponseVariants.success(data),
    }),

  /**
   * 204 No Content response
   */
  noContent: () =>
    axiosResponseFactory.build({
      status: 204,
      statusText: "No Content",
      data: null,
    }),

  /**
   * 400 Bad Request response
   */
  badRequest: (errors?: ValidationError[]) =>
    axiosResponseFactory.build({
      status: 400,
      statusText: "Bad Request",
      data: apiResponseVariants.validationError(errors),
    }),

  /**
   * 401 Unauthorized response
   */
  unauthorized: () =>
    axiosResponseFactory.build({
      status: 401,
      statusText: "Unauthorized",
      data: apiResponseVariants.unauthorized(),
    }),

  /**
   * 403 Forbidden response
   */
  forbidden: () =>
    axiosResponseFactory.build({
      status: 403,
      statusText: "Forbidden",
      data: apiResponseVariants.forbidden(),
    }),

  /**
   * 404 Not Found response
   */
  notFound: () =>
    axiosResponseFactory.build({
      status: 404,
      statusText: "Not Found",
      data: apiResponseVariants.notFound(),
    }),

  /**
   * 419 CSRF Token Mismatch response
   */
  csrfMismatch: () =>
    axiosResponseFactory.build({
      status: 419,
      statusText: "CSRF Token Mismatch",
      data: apiErrorResponseFactory.build({
        success: false,
        message: "CSRF token mismatch",
        errors: ["Invalid CSRF token"],
      }),
    }),

  /**
   * 429 Rate Limited response
   */
  rateLimited: () =>
    axiosResponseFactory.build({
      status: 429,
      statusText: "Too Many Requests",
      data: apiResponseVariants.rateLimited(),
    }),

  /**
   * 500 Internal Server Error response
   */
  serverError: () =>
    axiosResponseFactory.build({
      status: 500,
      statusText: "Internal Server Error",
      data: apiResponseVariants.serverError(),
    }),
};

/**
 * Predefined Axios error variants
 */
export const axiosErrorVariants = {
  /**
   * Network error (no response)
   */
  networkError: () =>
    axiosErrorFactory.build({
      message: "Network Error",
      code: "ERR_NETWORK",
      response: undefined,
    }),

  /**
   * Timeout error
   */
  timeout: () =>
    axiosErrorFactory.build({
      message: "timeout of 8000ms exceeded",
      code: "ECONNABORTED",
      response: undefined,
    }),

  /**
   * 400 Bad Request error
   */
  badRequest: (errors?: ValidationError[]) =>
    axiosErrorFactory.build({
      message: "Request failed with status code 400",
      code: "ERR_BAD_REQUEST",
      response: axiosResponseVariants.badRequest(errors),
    }),

  /**
   * 401 Unauthorized error
   */
  unauthorized: () =>
    axiosErrorFactory.build({
      message: "Request failed with status code 401",
      code: "ERR_BAD_REQUEST",
      response: axiosResponseVariants.unauthorized(),
    }),

  /**
   * 403 Forbidden error
   */
  forbidden: () =>
    axiosErrorFactory.build({
      message: "Request failed with status code 403",
      code: "ERR_BAD_REQUEST",
      response: axiosResponseVariants.forbidden(),
    }),

  /**
   * 404 Not Found error
   */
  notFound: () =>
    axiosErrorFactory.build({
      message: "Request failed with status code 404",
      code: "ERR_BAD_REQUEST",
      response: axiosResponseVariants.notFound(),
    }),

  /**
   * 500 Server Error
   */
  serverError: () =>
    axiosErrorFactory.build({
      message: "Request failed with status code 500",
      code: "ERR_BAD_REQUEST",
      response: axiosResponseVariants.serverError(),
    }),
};

/**
 * Mock API call helpers
 */
export const mockApiCalls = {
  /**
   * Mock successful API call
   */
  mockSuccess: <T>(data: T) => {
    return Promise.resolve(axiosResponseVariants.ok(data));
  },

  /**
   * Mock API call with custom response
   */
  mockResponse: (response: AxiosResponse) => {
    return Promise.resolve(response);
  },

  /**
   * Mock API error
   */
  mockError: (error: Partial<AxiosError>) => {
    return Promise.reject(error);
  },

  /**
   * Mock delayed response
   */
  mockDelayed: <T>(data: T, delay = 100) => {
    return new Promise<AxiosResponse>((resolve) => {
      setTimeout(() => {
        resolve(axiosResponseVariants.ok(data));
      }, delay);
    });
  },

  /**
   * Mock intermittent failure
   */
  mockIntermittent: <T>(data: T, failureRate = 0.3) => {
    if (Math.random() < failureRate) {
      return Promise.reject(axiosErrorVariants.serverError());
    }
    return Promise.resolve(axiosResponseVariants.ok(data));
  },
};
