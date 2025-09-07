import axios, { AxiosError } from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';

export interface User {
  email: string;
  name: string;
}

export interface LoginResponse {
  success: boolean;
  token?: string;
  user?: User;
  message?: string;
  error?: string;
  nextStep?: string;
  requiresVerification?: boolean;
}

export interface RegistrationResponse {
  success: boolean;
  message?: string;
  error?: string;
  nextStep?: string;
  email?: string;
}

export interface VerificationResponse {
  success: boolean;
  message?: string;
  error?: string;
  nextStep?: string;
}

export interface ResendCodeResponse {
  success: boolean;
  message?: string;
  error?: string;
}

interface ApiError {
  error: string;
  errorType?: string;
  nextStep?: string;
  requiresVerification?: boolean;
}

// Custom type for axios config to include _retry flag
declare module 'axios' {
  interface InternalAxiosRequestConfig {
    _retry?: boolean;
  }
}

class AuthService {
  private readonly TOKEN_KEY = 'port_auth_token';
  private readonly USER_KEY = 'port_auth_user';
  private isRefreshing = false;
  private refreshSubscribers: ((token: string) => void)[] = [];

  // Set up axios interceptors for automatic token handling
  private setupInterceptors(): void {
    // Request interceptor - add token to all requests
    axios.interceptors.request.use(
      (config) => {
        const token = this.getToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor - handle token refresh on 401 only
    axios.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config;
        
        // Only handle 401 errors for token refresh, let other errors pass through
        if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
          // Skip token refresh for auth endpoints - be more specific with URL matching
          const requestUrl = originalRequest.url || '';
          const isAuthEndpoint = requestUrl.includes('/api/auth/login') || 
                                requestUrl.includes('/api/auth/register') ||
                                requestUrl.includes('/api/auth/verify-email') ||
                                requestUrl.includes('/api/auth/resend-code') ||
                                requestUrl.includes('/api/auth/debug-email');
          
          console.log('[AuthService] 401 error detected:', {
            url: requestUrl,
            isAuthEndpoint,
            shouldSkipRefresh: isAuthEndpoint
          });
          
          if (isAuthEndpoint) {
            console.log('[AuthService] Skipping token refresh for auth endpoint - letting error pass through');
            // For auth endpoints, we want the error to be handled by the calling code
            // Don't try to refresh token, just pass the error through
            return Promise.reject(error);
          }
          
          if (this.isRefreshing) {
            // If already refreshing, wait for it to complete
            return new Promise((resolve) => {
              this.refreshSubscribers.push((token: string) => {
                originalRequest.headers.Authorization = `Bearer ${token}`;
                resolve(axios(originalRequest));
              });
            });
          }

          originalRequest._retry = true;
          this.isRefreshing = true;

          try {
            const refreshResult = await this.refreshToken();
            if (refreshResult.success && refreshResult.token) {
              // Notify all waiting requests with the new token
              this.refreshSubscribers.forEach(callback => callback(refreshResult.token!));
              this.refreshSubscribers = [];
              
              // Retry the original request with new token
              originalRequest.headers.Authorization = `Bearer ${refreshResult.token}`;
              return axios(originalRequest);
            } else {
              this.logout();
              return Promise.reject(error);
            }
          } catch {
            this.logout();
            return Promise.reject(error);
          } finally {
            this.isRefreshing = false;
          }
        }

        // For all other errors (including 403), just reject and let the calling code handle it
        return Promise.reject(error);
      }
    );
  }

  // Initialize auth service
  initialize(): void {
    this.setupInterceptors();
  }

  // Get stored token
  getToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(this.TOKEN_KEY);
    }
    return null;
  }

  // Get current user data
  getCurrentUser(): User | null {
    if (typeof window !== 'undefined') {
      const userData = localStorage.getItem(this.USER_KEY);
      return userData ? JSON.parse(userData) : null;
    }
    return null;
  }

  // Registration function
  async register(email: string, name: string, password: string): Promise<RegistrationResponse> {
    try {
      const response = await axios.post<RegistrationResponse>(`${API_BASE_URL}/api/auth/register`, {
        email,
        name,
        password,
      });

      return response.data;
    } catch (error) {
      console.error('Registration error:', error);
      
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<ApiError>;
        return {
          success: false,
          error: axiosError.response?.data?.error || 'Network error during registration',
        };
      }
      
      return {
        success: false,
        error: 'An unexpected error occurred during registration',
      };
    }
  }

  // Verify email function
  async verifyEmail(email: string, code: string): Promise<VerificationResponse> {
    try {
      const response = await axios.post<VerificationResponse>(`${API_BASE_URL}/api/auth/verify-email`, {
        email,
        code,
      });

      return response.data;
    } catch (error) {
      console.error('Email verification error:', error);
      
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<ApiError>;
        return {
          success: false,
          error: axiosError.response?.data?.error || 'Network error during verification',
        };
      }
      
      return {
        success: false,
        error: 'An unexpected error occurred during verification',
      };
    }
  }

  // Resend verification code function
  async resendVerificationCode(email: string): Promise<ResendCodeResponse> {
    try {
      const response = await axios.post<ResendCodeResponse>(`${API_BASE_URL}/api/auth/resend-code`, {
        email,
      });

      return response.data;
    } catch (error) {
      console.error('Resend code error:', error);
      
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<ApiError>;
        return {
          success: false,
          error: axiosError.response?.data?.error || 'Network error during code resend',
        };
      }
      
      return {
        success: false,
        error: 'An unexpected error occurred while resending code',
      };
    }
  }

  // Login function
  async login(email: string, name: string, password: string): Promise<LoginResponse> {
    try {
      console.log('[AuthService] Making login request:', { email, name });
      const response = await axios.post<LoginResponse>(`${API_BASE_URL}/api/auth/login`, {
        email,
        name,
        password,
      });

      console.log('[AuthService] Login response:', response.status, response.data);

      if (response.data.success && response.data.token) {
        // Store token and user data
        localStorage.setItem(this.TOKEN_KEY, response.data.token);
        localStorage.setItem(this.USER_KEY, JSON.stringify(response.data.user));
        
        return response.data;
      } else {
        console.log('[AuthService] Login failed with response data:', response.data);
        return {
          success: false,
          error: response.data.error || 'Login failed',
          nextStep: response.data.nextStep,
          requiresVerification: response.data.requiresVerification,
        };
      }
    } catch (error) {
      console.error('[AuthService] Login error:', error);
      
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<ApiError>;
        console.log('[AuthService] Axios error details:', {
          status: axiosError.response?.status,
          data: axiosError.response?.data,
          message: axiosError.message
        });
        
        // For 401 errors from auth endpoints, the response should contain our API error data
        if (axiosError.response?.status === 401 && axiosError.response?.data) {
          console.log('[AuthService] Processing 401 response data:', axiosError.response.data);
          const responseData = axiosError.response.data;
          
          return {
            success: false,
            error: responseData.error || 'Authentication failed',
            nextStep: responseData.nextStep,
            requiresVerification: responseData.requiresVerification,
          };
        }
        
        // For other errors, use generic error handling
        return {
          success: false,
          error: axiosError.response?.data?.error || 'Network error during login',
          nextStep: axiosError.response?.data?.nextStep,
          requiresVerification: axiosError.response?.data?.requiresVerification,
        };
      }
      
      return {
        success: false,
        error: 'An unexpected error occurred',
      };
    }
  }

  // Validate current token
  async validateToken(): Promise<boolean> {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/auth/validate`);
      return response.data.success;
    } catch {
      return false;
    }
  }

  // Refresh token
  async refreshToken(): Promise<LoginResponse> {
    try {
      const response = await axios.post<LoginResponse>(`${API_BASE_URL}/api/auth/refresh`);
      
      if (response.data.success && response.data.token) {
        // Update stored token and user data
        localStorage.setItem(this.TOKEN_KEY, response.data.token);
        localStorage.setItem(this.USER_KEY, JSON.stringify(response.data.user));
      }
      
      return response.data;
    } catch (error) {
      console.error('Token refresh error:', error);
      return {
        success: false,
        error: 'Failed to refresh token',
      };
    }
  }

  // Logout function
  logout(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.TOKEN_KEY);
      localStorage.removeItem(this.USER_KEY);
    }
  }

  // Email validation helper
  validatePortEmail(email: string): boolean {
    // Allow specific exception email
    if (email === 'diogo.paulino10@gmail.com') {
      return true;
    }
    
    // Allow emails ending with @apram.pt
    return email.endsWith('@apram.pt');
  }
}

// Create singleton instance
const authService = new AuthService();
export { authService }; 