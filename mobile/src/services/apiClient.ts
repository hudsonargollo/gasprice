import AsyncStorage from '@react-native-async-storage/async-storage';
import { ApiResponse, NetworkError } from '../types';

// Configuration
// For Expo Go, use your computer's IP address instead of localhost
// You can find your IP with: npm run get-ip
const API_BASE_URL = __DEV__ 
  ? 'https://pricepro.clubemkt.digital/api' // Use production API for testing
  : 'https://pricepro.clubemkt.digital/api'; // Production VPS - WORKING!

const REQUEST_TIMEOUT = 10000; // 10 seconds

class ApiClient {
  private baseURL: string;
  private timeout: number;

  constructor(baseURL: string = API_BASE_URL, timeout: number = REQUEST_TIMEOUT) {
    this.baseURL = baseURL;
    this.timeout = timeout;
  }

  /**
   * Get stored authentication token
   */
  private async getAuthToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem('auth_token');
    } catch (error) {
      console.warn('Failed to get auth token:', error);
      return null;
    }
  }

  /**
   * Create request headers
   */
  private async createHeaders(includeAuth: boolean = true): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    if (includeAuth) {
      const token = await this.getAuthToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    return headers;
  }

  /**
   * Handle API response
   */
  private async handleResponse<T>(response: Response): Promise<T> {
    const contentType = response.headers.get('content-type');
    const isJson = contentType && contentType.includes('application/json');

    let data: any;
    try {
      data = isJson ? await response.json() : await response.text();
    } catch (error) {
      throw new ApiNetworkError('Failed to parse response', response.status);
    }

    if (!response.ok) {
      const errorMessage = data?.message || data?.error || `HTTP ${response.status}`;
      throw new ApiNetworkError(errorMessage, response.status);
    }

    return data;
  }

  /**
   * Create fetch request with timeout
   */
  private async fetchWithTimeout(
    url: string,
    options: RequestInit
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new ApiNetworkError('Request timeout', 408);
      }
      throw new ApiNetworkError(error.message || 'Network error');
    }
  }

  /**
   * GET request
   */
  async get<T>(endpoint: string, includeAuth: boolean = true): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const headers = await this.createHeaders(includeAuth);

    const response = await this.fetchWithTimeout(url, {
      method: 'GET',
      headers,
    });

    return this.handleResponse<T>(response);
  }

  /**
   * POST request
   */
  async post<T>(
    endpoint: string,
    data?: any,
    includeAuth: boolean = true
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const headers = await this.createHeaders(includeAuth);

    const response = await this.fetchWithTimeout(url, {
      method: 'POST',
      headers,
      body: data ? JSON.stringify(data) : undefined,
    });

    return this.handleResponse<T>(response);
  }

  /**
   * PUT request
   */
  async put<T>(
    endpoint: string,
    data?: any,
    includeAuth: boolean = true
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const headers = await this.createHeaders(includeAuth);

    const response = await this.fetchWithTimeout(url, {
      method: 'PUT',
      headers,
      body: data ? JSON.stringify(data) : undefined,
    });

    return this.handleResponse<T>(response);
  }

  /**
   * DELETE request
   */
  async delete<T>(endpoint: string, includeAuth: boolean = true): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const headers = await this.createHeaders(includeAuth);

    const response = await this.fetchWithTimeout(url, {
      method: 'DELETE',
      headers,
    });

    return this.handleResponse<T>(response);
  }

  /**
   * Upload file (multipart/form-data)
   */
  async upload<T>(
    endpoint: string,
    formData: FormData,
    includeAuth: boolean = true
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const token = includeAuth ? await this.getAuthToken() : null;

    const headers: Record<string, string> = {
      'Accept': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await this.fetchWithTimeout(url, {
      method: 'POST',
      headers,
      body: formData,
    });

    return this.handleResponse<T>(response);
  }

  /**
   * Set base URL
   */
  setBaseURL(baseURL: string): void {
    this.baseURL = baseURL;
  }

  /**
   * Set timeout
   */
  setTimeout(timeout: number): void {
    this.timeout = timeout;
  }
}

// Create and export singleton instance
export const apiClient = new ApiClient();

// Export NetworkError class
export class ApiNetworkError extends Error {
  status?: number;
  code?: string;

  constructor(message: string, status?: number, code?: string) {
    super(message);
    this.name = 'NetworkError';
    this.status = status;
    this.code = code;
  }
}