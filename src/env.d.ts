// / <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_GOOGLE_CLIENT_ID: string;
  readonly VITE_APPLE_CLIENT_ID: string;
  readonly VITE_API_PROTOCOL?: string;
  readonly VITE_API_HOST?: string;
  readonly VITE_API_PORT?: string;
  readonly VITE_API_TARGET?: string;
  readonly VITE_ERROR_LOGGING_ENDPOINT?: string;
  readonly VITE_ERROR_LOGGING_API_KEY?: string;
  readonly VITE_STAGING_MONITORING_ENDPOINT?: string;
  readonly VITE_STAGING_ANALYTICS_KEY?: string;
  readonly VITE_MONITORING_ENDPOINT?: string;
  readonly VITE_ANALYTICS_KEY?: string;
  readonly MODE: string;
  readonly BASE_URL: string;
  readonly DEV: boolean;
  readonly PROD: boolean;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
