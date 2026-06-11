// Get API URL from environment variable (.env)
// Base must be http://localhost:3300/api — NOT /api/admin
// api.ts appends paths like /auth/login or /admin/login
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

/** Aggregated money block for sales */
export interface DashboardSalesSummary {
  count: number;
  totalAmount: number;
  totalPaid: number;
  totalPending: number;
}

export interface DashboardExpensesSummary {
  count: number;
  totalAmount: number;
}

export interface DashboardReceivedSummary {
  count: number;
  totalAmount: number;
}

/** Returned shape depends on role — see dashboard.controller.js */
export interface DashboardStats {
  role?: 'SUPER_ADMIN' | 'COMPANY';
  totalCompanies?: number;
  activeCompanies?: number;
  inactiveCompanies?: number;
  totalUsers?: number;
  partyCount?: number;
  sales?: DashboardSalesSummary;
  expenses?: DashboardExpensesSummary;
  received?: DashboardReceivedSummary;
  pendingSalesCount?: number;
  /** Super Admin: collected on sales minus expenses */
  netPosition?: number;
  /** Company: collected on sales minus expenses */
  netAfterExpenses?: number;
  recentCompanies?: any[];
  recentSales?: any[];
  recentExpenses?: any[];
  recentPayments?: any[];
  company?: User;
  partyActiveCount?: number;
}

export type AnalyticsRange = 'week' | 'month' | 'year' | 'all';

export interface AnalyticsBucketRow {
  key: string;
  label: string;
  salesBilled: number;
  saleCount: number;
  expenses: number;
  expenseCount: number;
  paymentsReceived: number;
  paymentCount: number;
  netInflow: number;
}

export interface CompanyAnalyticsData {
  range: AnalyticsRange;
  bucket: 'day' | 'month';
  periodLabel: string;
  rangeStart: string | null;
  rangeEnd: string;
  summary: {
    salesBilled: number;
    paymentsReceived: number;
    expenses: number;
    netInflow: number;
    outstanding: number;
    saleLines: number;
    expenseLines: number;
    paymentRecords: number;
  };
  series: AnalyticsBucketRow[];
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

/** Populated company on party (Super Admin list) */
export interface PartyCompanyInfo {
  _id: string;
  name: string;
  email?: string;
  mobile?: string;
  address?: string;
  isActive?: boolean;
}

export interface Party {
  _id: string;
  companyId: string | PartyCompanyInfo;
  name: string;
  address?: string;
  mobile?: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedParties {
  docs: Party[];
  totalDocs: number;
  limit: number;
  page: number;
  totalPages: number;
  pagingCounter?: number;
  hasPrevPage?: boolean;
  hasNextPage?: boolean;
  prevPage?: number | null;
  nextPage?: number | null;
}

export interface SalePartyInfo {
  _id: string;
  name: string;
  mobile?: string;
  address?: string;
  isActive?: boolean;
}

export interface SaleCompanyInfo {
  _id: string;
  name: string;
  email?: string;
  mobile?: string;
  isActive?: boolean;
}

export interface Sale {
  _id: string;
  companyId: string | SaleCompanyInfo;
  partyId: string | SalePartyInfo;
  saleDate: string;
  designNumber: string;
  card: string;
  workType: string;
  hook: string;
  pricePerUnit: number;
  amount: number;
  /** Amount received via Received Payments (FIFO). Omitted on legacy rows → treat as 0 */
  paidAmount?: number;
  createdAt: string;
  updatedAt: string;
}

/** Pending-sales API includes computed pending balance */
export interface PendingSaleRow extends Sale {
  paidAmount: number;
  pendingAmount: number;
}

export interface PaginatedSales {
  docs: Sale[];
  totalDocs: number;
  limit: number;
  page: number;
  totalPages: number;
  pagingCounter?: number;
  hasPrevPage?: boolean;
  hasNextPage?: boolean;
  prevPage?: number | null;
  nextPage?: number | null;
}

/** Must match Backend/models/expense.model.js EXPENSE_CATEGORIES */
export const EXPENSE_CATEGORY_KEYS = [
  'EMPLOYEE_SALARY',
  'TEA_SNACKS',
  'LIGHT_BILL',
  'RENT',
  'STATIONERY',
  'INTERNET_PHONE',
  'TRANSPORT',
  'MAINTENANCE',
  'MARKETING',
  'OTHER',
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORY_KEYS)[number];

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  EMPLOYEE_SALARY: 'Employee salary',
  TEA_SNACKS: 'Tea & snacks',
  LIGHT_BILL: 'Light / electricity',
  RENT: 'Rent',
  STATIONERY: 'Stationery',
  INTERNET_PHONE: 'Internet & phone',
  TRANSPORT: 'Transport',
  MAINTENANCE: 'Maintenance',
  MARKETING: 'Marketing',
  OTHER: 'Other',
};

export interface Expense {
  _id: string;
  companyId: string | SaleCompanyInfo;
  expenseDate: string;
  category: ExpenseCategory;
  title: string;
  notes: string;
  amount: number;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedExpenses {
  docs: Expense[];
  totalDocs: number;
  limit: number;
  page: number;
  totalPages: number;
  pagingCounter?: number;
  hasPrevPage?: boolean;
  hasNextPage?: boolean;
  prevPage?: number | null;
  nextPage?: number | null;
}

/** Match Backend/models/receivedPayment.model.js */
export const PAYMENT_METHOD_KEYS = [
  'CASH',
  'UPI',
  'BANK_TRANSFER',
  'CHEQUE',
  'TDS',
  'OTHER',
] as const;

export type PaymentMethod = (typeof PAYMENT_METHOD_KEYS)[number];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: 'Cash',
  UPI: 'UPI',
  BANK_TRANSFER: 'Bank transfer',
  CHEQUE: 'Cheque',
  TDS: 'TDS',
  OTHER: 'Other',
};

export interface PaymentAllocation {
  saleId: string;
  amount: number;
}

export interface ReceivedPayment {
  _id: string;
  companyId: string;
  partyId: string | SalePartyInfo;
  paymentDate: string;
  paymentMethod: PaymentMethod;
  amount: number;
  notes: string;
  allocations: PaymentAllocation[];
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedReceivedPayments {
  docs: ReceivedPayment[];
  totalDocs: number;
  limit: number;
  page: number;
  totalPages: number;
  pagingCounter?: number;
  hasPrevPage?: boolean;
  hasNextPage?: boolean;
  prevPage?: number | null;
  nextPage?: number | null;
}

class ApiService {
  private token: string | null = localStorage.getItem('authToken');
  private onUnauthorized: (() => void) | null = null;
  private unauthorizedHandled = false;

  public setToken(token: string | null) {
    this.token = token;
    if (token) {
      this.unauthorizedHandled = false;
      localStorage.setItem('authToken', token);
    } else {
      localStorage.removeItem('authToken');
    }
  }

  public setOnUnauthorized(callback: (() => void) | null) {
    this.onUnauthorized = callback;
  }

  private isSessionExpiredMessage(message: string): boolean {
    const normalized = message.toLowerCase();
    return (
      normalized.includes('token expired') ||
      normalized.includes('invalid token') ||
      normalized.includes('invalid token or inactive user')
    );
  }

  private handleUnauthorized() {
    if (this.unauthorizedHandled) {
      return;
    }
    this.unauthorizedHandled = true;
    this.setToken(null);
    localStorage.removeItem('user');
    this.onUnauthorized?.();
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
        const message = data.message || `Request failed: ${response.status}`;
        if (this.token && this.isSessionExpiredMessage(message)) {
          this.handleUnauthorized();
        }
        throw new Error(message);
      }

      // Backend often returns HTTP 200 with { status: 200, message, data: 0 } for validation/auth failures
      if (data && typeof data === 'object' && data.status === 200 && data.data === 0) {
        const message = data.message || 'Request failed';
        if (this.token && this.isSessionExpiredMessage(message)) {
          this.handleUnauthorized();
        }
        throw new Error(message);
      }
      
      return data;
    } catch (error: any) {
      if (this.token && error?.message && this.isSessionExpiredMessage(error.message)) {
        this.handleUnauthorized();
      }
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

  /** Company analytics — weekly / monthly / yearly / all-time series */
  async getCompanyAnalytics(
    range: AnalyticsRange = 'month'
  ): Promise<ApiResponse<CompanyAnalyticsData>> {
    return this.request('/analytics/company', {
      method: 'POST',
      body: JSON.stringify({ range }),
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

  // Parties (company users only)
  async createParty(data: {
    name: string;
    address?: string;
    mobile?: string;
    description?: string;
    isActive?: boolean;
  }): Promise<ApiResponse<{ party: Party }>> {
    return this.request('/parties', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getParties(
    params: PaginationParams & { isActive?: 'all' | 'active' | 'inactive' | boolean | string } = {}
  ): Promise<ApiResponse<PaginatedParties>> {
    return this.request('/parties/list', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async getPartyById(id: string): Promise<ApiResponse<{ party: Party }>> {
    return this.request(`/parties/${id}`, { method: 'GET' });
  }

  async updateParty(data: {
    id: string;
    name?: string;
    address?: string;
    mobile?: string;
    description?: string;
    isActive?: boolean;
  }): Promise<ApiResponse<{ party: Party }>> {
    return this.request('/parties/update', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteParty(id: string): Promise<ApiResponse> {
    return this.request('/parties/delete', {
      method: 'POST',
      body: JSON.stringify({ id }),
    });
  }

  async togglePartyStatus(id: string): Promise<ApiResponse<{ party: Party }>> {
    return this.request('/parties/toggle-status', {
      method: 'POST',
      body: JSON.stringify({ id }),
    });
  }

  /** Super Admin: all parties across companies (uses /api/admin) */
  async adminListParties(
    params: PaginationParams & {
      isActive?: 'all' | 'active' | 'inactive' | boolean | string;
      companyId?: string;
    } = {}
  ): Promise<ApiResponse<PaginatedParties>> {
    return this.request('/admin/parties/list', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  // Sales (company users)
  async createSale(data: {
    partyId: string;
    saleDate: string;
    designNumber?: string;
    card?: string;
    workType?: string;
    hook?: string;
    pricePerUnit?: number;
    amount: number;
  }): Promise<ApiResponse<{ sale: Sale }>> {
    return this.request('/sales', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getSales(
    params: PaginationParams & {
      partyId?: string;
      dateFrom?: string;
      dateTo?: string;
    } = {}
  ): Promise<ApiResponse<PaginatedSales>> {
    return this.request('/sales/list', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async getSaleById(id: string): Promise<ApiResponse<{ sale: Sale }>> {
    return this.request(`/sales/${id}`, { method: 'GET' });
  }

  async updateSale(data: {
    id: string;
    partyId?: string;
    saleDate?: string;
    designNumber?: string;
    card?: string;
    workType?: string;
    hook?: string;
    pricePerUnit?: number;
    amount?: number;
  }): Promise<ApiResponse<{ sale: Sale }>> {
    return this.request('/sales/update', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteSale(id: string): Promise<ApiResponse> {
    return this.request('/sales/delete', {
      method: 'POST',
      body: JSON.stringify({ id }),
    });
  }

  /** Super Admin: all sales */
  async adminListSales(
    params: PaginationParams & {
      companyId?: string;
      partyId?: string;
      dateFrom?: string;
      dateTo?: string;
    } = {}
  ): Promise<ApiResponse<PaginatedSales>> {
    return this.request('/admin/sales/list', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  // Expenses (company users)
  async createExpense(data: {
    expenseDate: string;
    category: ExpenseCategory;
    title?: string;
    notes?: string;
    amount: number;
  }): Promise<ApiResponse<{ expense: Expense }>> {
    return this.request('/expenses', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getExpenses(
    params: PaginationParams & {
      category?: ExpenseCategory | 'all';
      dateFrom?: string;
      dateTo?: string;
    } = {}
  ): Promise<ApiResponse<PaginatedExpenses>> {
    return this.request('/expenses/list', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async getExpenseById(id: string): Promise<ApiResponse<{ expense: Expense }>> {
    return this.request(`/expenses/${id}`, { method: 'GET' });
  }

  async updateExpense(data: {
    id: string;
    expenseDate?: string;
    category?: ExpenseCategory;
    title?: string;
    notes?: string;
    amount?: number;
  }): Promise<ApiResponse<{ expense: Expense }>> {
    return this.request('/expenses/update', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteExpense(id: string): Promise<ApiResponse> {
    return this.request('/expenses/delete', {
      method: 'POST',
      body: JSON.stringify({ id }),
    });
  }

  /** Super Admin: all expenses */
  async adminListExpenses(
    params: PaginationParams & {
      companyId?: string;
      category?: ExpenseCategory | 'all';
      dateFrom?: string;
      dateTo?: string;
    } = {}
  ): Promise<ApiResponse<PaginatedExpenses>> {
    return this.request('/admin/expenses/list', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  // Received payments (company users)
  async getPendingSalesByParty(partyId: string): Promise<
    ApiResponse<{ sales: PendingSaleRow[]; party: Party }>
  > {
    return this.request('/received-payments/pending-sales', {
      method: 'POST',
      body: JSON.stringify({ partyId }),
    });
  }

  async createReceivedPayment(data: {
    partyId: string;
    saleIds: string[];
    paymentAmount: number;
    paymentMethod: PaymentMethod;
    paymentDate: string;
    notes?: string;
  }): Promise<ApiResponse<{ receivedPayment: ReceivedPayment }>> {
    return this.request('/received-payments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async listReceivedPayments(
    params: PaginationParams & {
      partyId?: string | 'all';
      dateFrom?: string;
      dateTo?: string;
    } = {}
  ): Promise<ApiResponse<PaginatedReceivedPayments>> {
    return this.request('/received-payments/list', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async getReceivedPaymentById(id: string): Promise<ApiResponse<{ receivedPayment: ReceivedPayment }>> {
    return this.request(`/received-payments/${id}`, { method: 'GET' });
  }

  // Backward compatibility aliases
  async getCompanyProfile() { return this.getProfile(); }
  async updateCompanyProfile(data: any) { return this.updateProfile(data); }
  async changeCompanyPassword(data: any) { return this.changePassword(data); }
}

export const apiService = new ApiService();
export default apiService;