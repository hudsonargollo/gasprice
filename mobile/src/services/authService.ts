import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from './apiClient';
import { LoginCredentials, AuthToken, User } from '../types';

class AuthService {
  private readonly TOKEN_KEY = 'auth_token';
  private readonly USER_KEY = 'user_data';

  /**
   * Login user with credentials
   */
  async login(credentials: LoginCredentials): Promise<AuthToken> {
    try {
      const response = await apiClient.post<any>('/auth/login', credentials, false);
      
      // Handle the API response structure: { message, data: { token, user } }
      const authData = {
        token: response.data.token,
        user: response.data.user,
        expiresIn: response.data.expiresIn
      };
      
      // Store token and user data
      await this.storeAuthData(authData);
      
      return authData;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    try {
      // Call logout endpoint to invalidate token on server
      await apiClient.post('/auth/logout');
    } catch (error) {
      console.warn('Logout API call failed:', error);
      // Continue with local logout even if API call fails
    } finally {
      // Clear local storage
      await this.clearAuthData();
    }
  }

  /**
   * Refresh authentication token
   */
  async refreshToken(currentToken: string): Promise<AuthToken> {
    try {
      const response = await apiClient.post<AuthToken>('/auth/refresh', {
        token: currentToken,
      });
      
      // Store new token and user data
      await this.storeAuthData(response);
      
      return response;
    } catch (error) {
      console.error('Token refresh error:', error);
      // Clear auth data if refresh fails
      await this.clearAuthData();
      throw error;
    }
  }

  /**
   * Get stored authentication token
   */
  async getStoredToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(this.TOKEN_KEY);
    } catch (error) {
      console.error('Error getting stored token:', error);
      return null;
    }
  }

  /**
   * Get stored user data
   */
  async getStoredUser(): Promise<User | null> {
    try {
      const userData = await AsyncStorage.getItem(this.USER_KEY);
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Error getting stored user:', error);
      return null;
    }
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    try {
      const token = await this.getStoredToken();
      const user = await this.getStoredUser();
      
      if (!token || !user) {
        return false;
      }

      // TODO: Add token expiration check
      // For now, assume token is valid if it exists
      return true;
    } catch (error) {
      console.error('Error checking authentication:', error);
      return false;
    }
  }

  /**
   * Validate current token with server
   */
  async validateToken(): Promise<User | null> {
    try {
      const response = await apiClient.get<{ user: User }>('/auth/validate');
      return response.user;
    } catch (error) {
      console.error('Token validation error:', error);
      // Clear auth data if validation fails
      await this.clearAuthData();
      return null;
    }
  }

  /**
   * Store authentication data
   */
  private async storeAuthData(authData: AuthToken): Promise<void> {
    try {
      console.log('Storing auth data:', { hasToken: !!authData.token, hasUser: !!authData.user });
      
      await Promise.all([
        AsyncStorage.setItem(this.TOKEN_KEY, authData.token),
        AsyncStorage.setItem(this.USER_KEY, JSON.stringify(authData.user)),
      ]);
      
      console.log('Auth data stored successfully');
    } catch (error) {
      console.error('Error storing auth data:', error);
      throw new Error('Failed to store authentication data');
    }
  }

  /**
   * Clear authentication data
   */
  private async clearAuthData(): Promise<void> {
    try {
      await Promise.all([
        AsyncStorage.removeItem(this.TOKEN_KEY),
        AsyncStorage.removeItem(this.USER_KEY),
      ]);
    } catch (error) {
      console.error('Error clearing auth data:', error);
    }
  }

  /**
   * Get authorization header
   */
  async getAuthHeader(): Promise<{ Authorization: string } | {}> {
    const token = await this.getStoredToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }
}

// Create and export singleton instance
export const authService = new AuthService();