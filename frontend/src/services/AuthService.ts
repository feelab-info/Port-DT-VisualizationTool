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
}

export interface ApiError {
  error: string;
  details?: string;
}

class AuthService {
  private readonly TOKEN_KEY = 'port_auth_token';
  private readonly USER_KEY = 'port_auth_user';
  private isRefreshing = false;
  private refreshSubscribers: ((token: string) => void)[] = [];

  constructor() {
    this.setupInterceptors();
  }

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

    // Response interceptor - handle token refresh on 401
    axios.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config;
        
        if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
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

        return Promise.reject(error);
      }
    );
  }

  // Get stored token
  getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(this.TOKEN_KEY);
  }

  // Get stored user data
  getCurrentUser(): User | null {
    if (typeof window === 'undefined') return null;
    const userData = localStorage.getItem(this.USER_KEY);
    return userData ? JSON.parse(userData) : null;
  }

  // Set authorization header for axios requests
  setAuthHeader(token: string): void {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  // Remove authorization header
  removeAuthHeader(): void {
    delete axios.defaults.headers.common['Authorization'];
  }

  // Login function
  async login(email: string, name: string): Promise<LoginResponse> {
    try {
      const response = await axios.post<LoginResponse>(`${API_BASE_URL}/api/auth/login`, {
        email,
        name,
      });

      if (response.data.success && response.data.token) {
        // Store token and user data
        localStorage.setItem(this.TOKEN_KEY, response.data.token);
        localStorage.setItem(this.USER_KEY, JSON.stringify(response.data.user));
        
        return response.data;
      } else {
        return {
          success: false,
          error: response.data.error || 'Login failed',
        };
      }
    } catch (error) {
      console.error('Login error:', error);
      
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<ApiError>;
        return {
          success: false,
          error: axiosError.response?.data?.error || 'Network error during login',
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
    const token = this.getToken();
    if (!token) return false;

    try {
      const response = await axios.get<LoginResponse>(`${API_BASE_URL}/api/auth/validate`);
      return response.data.success;
    } catch (error) {
      console.error('Token validation error:', error);
      this.logout();
      return false;
    }
  }

  // Refresh token
  async refreshToken(): Promise<LoginResponse> {
    const token = this.getToken();
    if (!token) {
      return { success: false, error: 'No token to refresh' };
    }

    try {
      const response = await axios.post<LoginResponse>(`${API_BASE_URL}/api/auth/refresh`);
      
      if (response.data.success && response.data.token) {
        // Update stored token and user data
        localStorage.setItem(this.TOKEN_KEY, response.data.token);
        localStorage.setItem(this.USER_KEY, JSON.stringify(response.data.user));
        
        return response.data;
      } else {
        this.logout();
        return {
          success: false,
          error: response.data.error || 'Token refresh failed',
        };
      }
    } catch (error) {
      console.error('Token refresh error:', error);
      this.logout();
      
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<ApiError>;
        return {
          success: false,
          error: axiosError.response?.data?.error || 'Network error during token refresh',
        };
      }
      
      return {
        success: false,
        error: 'An unexpected error occurred during token refresh',
      };
    }
  }

  // Logout
  logout(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.TOKEN_KEY);
      localStorage.removeItem(this.USER_KEY);
    }
    this.removeAuthHeader();
  }

  // Initialize auth service (set token on app startup)
  initialize(): void {
    const token = this.getToken();
    if (token) {
      this.setAuthHeader(token);
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

// Custom type for axios config to include _retry flag
declare module 'axios' {
  interface AxiosRequestConfig {
    _retry?: boolean;
  }
}

export const authService = new AuthService(); 