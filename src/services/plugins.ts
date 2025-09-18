import api, { apiWithTimeout } from "./api";
import type {
  ReceiptPlugin,
  ReportPlugin,
  PluginStatistics,
} from "@/types/plugin";
import { errorLogger } from "./errorLogging";

export interface PluginDetectionResult {
  success: boolean;
  plugin?: ReceiptPlugin;
  pluginKey?: string;
  pluginName?: string;
  pluginDescription?: string;
  color?: string;
  confidence?: number;
  message?: string;
}

export const pluginsService = {
  async getAllPlugins(): Promise<{
    receiptPlugins: ReceiptPlugin[];
    reportPlugins: ReportPlugin[];
  }> {
    try {
      // Quick operation - use fast timeout (10 seconds)
      const response = await apiWithTimeout.fast.get("/plugins");
      return response.data;
    } catch (error) {
      errorLogger.logApiError(
        error instanceof Error ? error : new Error(String(error)),
        "/plugins",
      );
      throw error;
    }
  },

  async getPluginStatistics(): Promise<PluginStatistics> {
    try {
      // Quick operation - use fast timeout (10 seconds)
      const response = await apiWithTimeout.fast.get("/plugins/statistics");
      return response.data;
    } catch (error) {
      errorLogger.logApiError(
        error instanceof Error ? error : new Error(String(error)),
        "/plugins/statistics",
      );
      throw error;
    }
  },

  // Client-side plugin detection based on file extension
  async detectPlugin(
    file: File,
    availablePlugins: ReceiptPlugin[],
  ): Promise<PluginDetectionResult> {
    try {
      const fileExtension = "." + file.name.split(".").pop()?.toLowerCase();

      // Find plugins that support this file type
      const compatiblePlugins = availablePlugins.filter((plugin) =>
        plugin.supportedFileTypes.some(
          (type) => type.toLowerCase() === fileExtension,
        ),
      );

      if (compatiblePlugins.length === 0) {
        return {
          success: false,
          message: `No plugins support ${fileExtension} files`,
        };
      }

      // Prefer more specific plugins (like Amazon) over generic ones
      const bestPlugin = compatiblePlugins.sort((a, b) => {
        if (a.key.includes("generic")) return 1;
        if (b.key.includes("generic")) return -1;
        return 0;
      })[0];

      return {
        success: true,
        plugin: bestPlugin,
        pluginKey: bestPlugin.key,
        pluginName: bestPlugin.name,
        pluginDescription: bestPlugin.description,
        color: bestPlugin.color,
        confidence: 0.8,
        message: `Detected ${bestPlugin.name} for ${fileExtension} file`,
      };
    } catch (error) {
      errorLogger.logError(
        error instanceof Error ? error : new Error(String(error)),
        "Plugin Detection",
        {
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          availablePluginsCount: availablePlugins.length,
        },
      );
      return {
        success: false,
        message: "Error occurred during plugin detection",
      };
    }
  },

  async uploadWithAutoDetection(
    file: File,
    onUploadProgress?: (progressEvent: any) => void,
  ): Promise<any> {
    try {
      const formData = new FormData();
      formData.append("file", file);

      // Claude AI processing - use 3-minute timeout ONLY for Claude AI receipt processing
      const response = await apiWithTimeout.claudeUpload.post(
        "/upload",
        formData,
        {
          onUploadProgress,
        },
      );
      return response.data;
    } catch (error) {
      errorLogger.logApiError(
        error instanceof Error ? error : new Error(String(error)),
        "/upload",
        (error as any)?.response?.status,
      );
      throw error;
    }
  },

  async uploadWithSpecificPlugin(
    file: File,
    pluginKey: string,
    onUploadProgress?: (progressEvent: any) => void,
  ): Promise<any> {
    try {
      const formData = new FormData();
      formData.append("file", file);

      // Determine timeout based on plugin type - only Claude plugins get 3-minute timeout
      const isClaudePlugin =
        pluginKey.includes("generic") || pluginKey.includes("receipt");
      const uploadMethod = isClaudePlugin
        ? apiWithTimeout.claudeUpload
        : apiWithTimeout.standardUpload;

      const response = await uploadMethod.post(
        `/upload?pluginKey=${pluginKey}`,
        formData,
        {
          onUploadProgress,
        },
      );
      return response.data;
    } catch (error) {
      errorLogger.logApiError(
        error instanceof Error ? error : new Error(String(error)),
        `/upload?pluginKey=${pluginKey}`,
        (error as any)?.response?.status,
      );
      throw error;
    }
  },
};
