import { apiRequest } from "./queryClient";

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface SignupData {
  username: string;
  password: string;
  confirmPassword: string;
  bio?: string;
}

export interface AuthResponse {
  user: {
    id: number;
    username: string;
    isAdmin: boolean;
    avatar?: string;
    bio?: string;
  };
  sessionId: string;
}

export const authAPI = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await apiRequest("POST", "/api/login", credentials);
    return response.json();
  },

  async signup(data: SignupData): Promise<AuthResponse> {
    const response = await apiRequest("POST", "/api/signup", data);
    return response.json();
  },

  async logout(): Promise<void> {
    await apiRequest("POST", "/api/logout");
  },

  async getCurrentUser() {
    const sessionId = localStorage.getItem('sessionId');
    if (!sessionId) {
      return null;
    }

    try {
      const response = await fetch('/api/me', {
        headers: {
          'Authorization': `Bearer ${sessionId}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to get current user');
      }

      return response.json();
    } catch (error) {
      console.error('Get current user failed:', error);
      return null;
    }
  },

  async checkUsernameAvailability(username: string): Promise<boolean> {
    try {
      const response = await fetch(`/api/check/${username}`);
      if (!response.ok) {
        throw new Error('Failed to check username');
      }
      const data = await response.json();
      return data.available;
    } catch (error) {
      console.error('Username check failed:', error);
      return false;
    }
  },
};

export function getAuthHeaders() {
  const sessionId = localStorage.getItem('sessionId');
  return sessionId ? { Authorization: `Bearer ${sessionId}` } : {};
}

export function isAuthenticated(): boolean {
  return !!localStorage.getItem('sessionId');
}

export function getSessionId(): string | null {
  return localStorage.getItem('sessionId');
}

export function clearSession(): void {
  localStorage.removeItem('sessionId');
}

// Username validation helper
export function validateUsername(username: string): { isValid: boolean; error?: string } {
  if (!username) {
    return { isValid: false, error: "Username is required" };
  }

  if (!username.startsWith('tp-')) {
    return { isValid: false, error: "Username must start with 'tp-'" };
  }

  if (username.length < 4) {
    return { isValid: false, error: "Username must be at least 4 characters long" };
  }

  if (!/^tp-[a-zA-Z0-9_]+$/.test(username)) {
    return { isValid: false, error: "Username can only contain letters, numbers, and underscores after 'tp-'" };
  }

  return { isValid: true };
}

// Password validation helper
export function validatePassword(password: string): { isValid: boolean; error?: string } {
  if (!password) {
    return { isValid: false, error: "Password is required" };
  }

  if (password.length < 6) {
    return { isValid: false, error: "Password must be at least 6 characters long" };
  }

  return { isValid: true };
}
