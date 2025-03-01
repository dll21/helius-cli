import axios, { AxiosError, AxiosRequestConfig } from "axios";
import { getConfig } from "./config";

// Define webhook types based on Helius API
export interface Webhook {
  webhookID: string;
  webhookURL: string;
  transactionTypes: string[];
  accountAddresses: string[];
  webhookType: string;
  authHeader?: string;
  txnStatus?: string[];
  encoding?: string;
  encoding_config?: {
    format: string;
    compression: string;
  };
}

/**
 * Base API client for Helius API
 */
class HeliusApiClient {
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    const { baseUrl, apiKey } = getConfig();
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }

  /**
   * Refreshes the client configuration
   */
  refreshConfig(): void {
    const { baseUrl, apiKey } = getConfig();
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }

  /**
   * Makes a request to the Helius API
   * @param method HTTP method
   * @param endpoint API endpoint
   * @param data Request data
   * @returns Response data
   */
  async request<T>(
    method: "GET" | "POST" | "PUT" | "DELETE",
    endpoint: string,
    data?: any
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const config: AxiosRequestConfig = {
      method,
      url,
      headers: {
        "Content-Type": "application/json",
      },
      params: {
        "api-key": this.apiKey,
      },
    };

    if (data && (method === "POST" || method === "PUT")) {
      config.data = data;
    }

    try {
      const response = await axios(config);
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError;
      if (axiosError.response) {
        throw new Error(
          `API Error: ${axiosError.response.status} - ${JSON.stringify(
            axiosError.response.data
          )}`
        );
      } else if (axiosError.request) {
        throw new Error("No response received from API");
      } else {
        throw new Error(`Error setting up request: ${axiosError.message}`);
      }
    }
  }

  /**
   * Gets all webhooks
   * @returns List of webhooks
   */
  async getAllWebhooks(): Promise<Webhook[]> {
    return this.request<Webhook[]>("GET", "/webhooks");
  }

  /**
   * Gets a webhook by ID
   * @param id Webhook ID
   * @returns Webhook details
   */
  async getWebhook(id: string): Promise<Webhook> {
    return this.request<Webhook>("GET", `/webhooks/${id}`);
  }

  /**
   * Creates a new webhook
   * @param webhook Webhook data
   * @returns Created webhook
   */
  async createWebhook(webhook: Omit<Webhook, "id">): Promise<Webhook> {
    return this.request<Webhook>("POST", "/webhooks", webhook);
  }

  /**
   * Updates a webhook
   * @param id Webhook ID
   * @param webhook Updated webhook data
   * @returns Updated webhook
   */
  async updateWebhook(
    id: string,
    webhook: Partial<Omit<Webhook, "id">>
  ): Promise<Webhook> {
    return this.request<Webhook>("PUT", `/webhooks/${id}`, webhook);
  }

  /**
   * Deletes a webhook
   * @param id Webhook ID
   * @returns Success status
   */
  async deleteWebhook(id: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>("DELETE", `/webhooks/${id}`);
  }
}

// Export a singleton instance
export const heliusApi = new HeliusApiClient();

export default heliusApi;
