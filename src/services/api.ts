// Get API URL from environment variable
// Make sure to set VITE_API_URL in your .env file
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3300/api';

// Types
export interface ApiResponse<T = any> {
  status: number;
  message: string;
  data: T;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface DashboardStats {
  totalCompanies?: number;
  activeCompanies?: number;
  inactiveCompanies?: number;
  recentCompanies?: any[];
  totalUsers?: number;
}

export type UserRole = 'SUPER_ADMIN' | 'COMPANY';

export interface User {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  companyId?: string;
  isActive: boolean;
  profileImage?: string;
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Company {
  userEmail?: string;
  hasPassword?: boolean;
  _id: string;
  name: string;
  email?: string;
  address?: string;
  mobile?: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

class ApiService {
  private token: string | null = localStorage.getItem('authToken');

  public setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('authToken', token);
    } else {
      localStorage.removeItem('authToken');
    }
  }

  private async request(endpoint: string, options: any = {}, baseUrl: string = API_BASE_URL) {
    const url = `${baseUrl}${endpoint}`;
    const config = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(this.token && { Authorization: `Bearer ${this.token}` }),
        ...options.headers,
      },
      credentials: 'include',
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      let data: any;
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        throw new Error(`Unexpected response format: ${text || response.statusText}`);
      }
      
      if (!response.ok) {
        throw new Error(data.message || `Request failed: ${response.status}`);
      }
      
      return data;
    } catch (error: any) {
      console.error('API Request failed:', { url, error: error.message });
      throw error;
    }
  }

  // Authentication
  async login(email: string, password: string): Promise<ApiResponse<{ token: string; admin: User }>> {
    const response = await this.request('/admin/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }) as ApiResponse<{ token: string; admin: User }>;

    if (response.data?.token) {
      this.token = response.data.token;
      localStorage.setItem('authToken', this.token);
      localStorage.setItem('user', JSON.stringify(response.data.admin));
    }

    return response;
  }

  async register(data: { name: string; email: string; password: string }): Promise<ApiResponse<{ token: string; admin: User }>> {
    const response = await this.request('/admin/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }) as ApiResponse<{ token: string; admin: User }>;

    if (response.data?.token) {
      this.token = response.data.token;
      localStorage.setItem('authToken', this.token);
      localStorage.setItem('user', JSON.stringify(response.data.admin));
    }

    return response;
  }

  async companyLogin(email: string, password: string): Promise<ApiResponse<{ token: string; user: User }>> {
    const response = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }) as ApiResponse<{ token: string; user: User }>;

    if (response.data?.token) {
      this.token = response.data.token;
      localStorage.setItem('authToken', this.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }

    return response;
  }

  async logout(): Promise<ApiResponse> {
    const response = await this.request('/auth/logout', { method: 'POST' });
    this.token = null;
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    return response;
  }

  // Profile
  async getProfile(): Promise<ApiResponse<{ user: User }>> {
    return this.request('/auth/profile', {
      method: 'POST',
      body: JSON.stringify({})
    });
  }

  async updateProfile(data: { name?: string; email?: string }): Promise<ApiResponse<{ user: User }>> {
    return this.request('/auth/profile/update', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async changePassword(data: { currentPassword: string; newPassword: string }): Promise<ApiResponse> {
    return this.request('/auth/profile/change-password', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  // Dashboard
  async getDashboardStats(): Promise<ApiResponse<DashboardStats>> {
    return this.request('/dashboard/stats', {
      method: 'POST',
      body: JSON.stringify({})
    });
  }

  // Companies
  async getCompanies(params: PaginationParams & { isActive?: string | boolean } = {}): Promise<ApiResponse> {
    return this.request('/companies/list', {
      method: 'POST',
      body: JSON.stringify(params)
    });
  }

  async createCompany(data: { name: string; address?: string; mobile?: string; description?: string; email: string; password: string }): Promise<ApiResponse<{ company: Company; user: User }>> {
    return this.request('/companies', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async getCompanyById(id: string): Promise<ApiResponse<{ company: Company }>> {
    return this.request(`/companies/${id}`, {
      method: 'GET'
    });
  }

  async updateCompany(data: { id: string; name?: string; address?: string; mobile?: string; description?: string; isActive?: boolean; email?: string; password?: string }): Promise<ApiResponse<{ company: Company }>> {
    return this.request('/companies/update', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async deleteCompany(id: string): Promise<ApiResponse> {
    return this.request('/companies/delete', {
      method: 'POST',
      body: JSON.stringify({ id })
    });
  }

  async toggleCompanyStatus(id: string): Promise<ApiResponse<{ company: Company }>> {
    return this.request('/companies/toggle-status', {
      method: 'POST',
      body: JSON.stringify({ id })
    });
  }

  // Backward compatibility aliases
  async getCompanyProfile() { return this.getProfile(); }
  async updateCompanyProfile(data: any) { return this.updateProfile(data); }
  async changeCompanyPassword(data: any) { return this.changePassword(data); }
}

export const apiService = new ApiService();
export default apiService;