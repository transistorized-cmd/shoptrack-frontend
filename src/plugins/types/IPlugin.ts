export interface IPlugin {
  id: string;
  name: string;
  version: string;
  description: string;
  icon: string;
  color: string;
  gradientFrom: string;
  gradientTo: string;
  fileTypes: string[];
  maxFileSize: number;
  features: string[];
  uploadEndpoint: string;
  hasManualEntry?: boolean;
  manualEntryRoute?: string;
}

export interface PluginMetadata {
  id: string;
  name: string;
  version: string;
  description: string;
  icon: string;
  color: string;
  fileTypes: string[];
  maxFileSize: number;
  features: string[];
}

export interface PluginCapabilities {
  fileUpload: boolean;
  manualEntry: boolean;
  batchProcessing: boolean;
  imageProcessing: boolean;
  dataValidation?: boolean;
  encryptionSupport?: boolean;
}

export interface PluginConfig {
  plugin: IPlugin;
  capabilities: PluginCapabilities;
  endpoints: {
    upload: string;
    detect?: string;
    manual?: string;
    validate?: string;
    status?: string;
  };
}
