const getApiBaseUrl = () => {
  // Check if we're in a WebContainer environment
  if (typeof window !== 'undefined' && window.location.hostname.includes('webcontainer-api.io')) {
    // In WebContainer, use relative URLs to let the proxy handle routing
    return '/api';
  }
  
  // For local development
  return import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
};

const API_BASE_URL = getApiBaseUrl();

class ApiClient {
  private getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` })
    };
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const config: RequestInit = {
      headers: this.getAuthHeaders(),
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API request failed: ${endpoint}`, error);
      throw error;
    }
  }

  // Auth APIs
  async login(email: string, password: string, branch_id: string) {
    return this.request<{ token: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, branch_id }),
    });
  }

  async register(userData: any) {
    return this.request<any>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async getProfile() {
    return this.request<any>('/auth/profile');
  }

  // Branch APIs
  async getBranches() {
    return this.request<any[]>('/branches');
  }

  async getBranch(id: string) {
    return this.request<any>(`/branches/${id}`);
  }

  async createBranch(branchData: any) {
    return this.request<any>('/branches', {
      method: 'POST',
      body: JSON.stringify(branchData),
    });
  }

  async updateBranch(id: string, branchData: any) {
    return this.request<any>(`/branches/${id}`, {
      method: 'PUT',
      body: JSON.stringify(branchData),
    });
  }

  async deleteBranch(id: string) {
    return this.request<any>(`/branches/${id}`, {
      method: 'DELETE',
    });
  }

  async getBranchStats(id: string) {
    return this.request<any>(`/branches/${id}/stats`);
  }

  // Room APIs
  async getRooms(branchId?: string) {
    const query = branchId ? `?branch_id=${branchId}` : '';
    return this.request<any[]>(`/rooms${query}`);
  }

  async getRoom(id: string) {
    return this.request<any>(`/rooms/${id}`);
  }

  async createRoom(roomData: any) {
    return this.request<any>('/rooms', {
      method: 'POST',
      body: JSON.stringify(roomData),
    });
  }

  async updateRoom(id: string, roomData: any) {
    return this.request<any>(`/rooms/${id}`, {
      method: 'PUT',
      body: JSON.stringify(roomData),
    });
  }

  async deleteRoom(id: string) {
    return this.request<any>(`/rooms/${id}`, {
      method: 'DELETE',
    });
  }

  async checkRoomAvailability(id: string, startTime: string, endTime: string) {
    return this.request<{ available: boolean }>(`/rooms/${id}/check-availability`, {
      method: 'POST',
      body: JSON.stringify({ start_time: startTime, end_time: endTime }),
    });
  }

  // Client APIs
  async getClients(branchId?: string) {
    const query = branchId ? `?branch_id=${branchId}` : '';
    return this.request<any[]>(`/clients${query}`);
  }

  async getClient(id: string) {
    return this.request<any>(`/clients/${id}`);
  }

  async createClient(clientData: any) {
    return this.request<any>('/clients', {
      method: 'POST',
      body: JSON.stringify(clientData),
    });
  }

  async updateClient(id: string, clientData: any) {
    return this.request<any>(`/clients/${id}`, {
      method: 'PUT',
      body: JSON.stringify(clientData),
    });
  }

  async deleteClient(id: string) {
    return this.request<any>(`/clients/${id}`, {
      method: 'DELETE',
    });
  }

  async addLoyaltyPoints(clientId: string, points: number, description?: string) {
    return this.request<any>(`/clients/${clientId}/loyalty-points`, {
      method: 'POST',
      body: JSON.stringify({ points, description }),
    });
  }

  async getLoyaltyPointsHistory(clientId: string) {
    return this.request<any[]>(`/clients/${clientId}/loyalty-points`);
  }

  // Booking APIs
  async getBookings(branchId?: string) {
    const query = branchId ? `?branch_id=${branchId}` : '';
    return this.request<any[]>(`/bookings${query}`);
  }

  async getBooking(id: string) {
    return this.request<any>(`/bookings/${id}`);
  }

  async createBooking(bookingData: any) {
    return this.request<any>('/bookings', {
      method: 'POST',
      body: JSON.stringify(bookingData),
    });
  }

  async updateBooking(id: string, bookingData: any) {
    return this.request<any>(`/bookings/${id}`, {
      method: 'PUT',
      body: JSON.stringify(bookingData),
    });
  }

  async cancelBooking(id: string) {
    return this.request<any>(`/bookings/${id}/cancel`, {
      method: 'PUT',
    });
  }

  async getBookingsByDateRange(start: string, end: string, branchId?: string) {
    const query = branchId ? `?branch_id=${branchId}` : '';
    return this.request<any[]>(`/bookings/date-range/${start}/${end}${query}`);
  }

  // Inventory APIs
  async getProducts(branchId?: string) {
    const query = branchId ? `?branch_id=${branchId}` : '';
    return this.request<any[]>(`/inventory/products${query}`);
  }

  async getLowStockProducts(branchId?: string) {
    const query = branchId ? `?branch_id=${branchId}` : '';
    return this.request<any[]>(`/inventory/products/low-stock${query}`);
  }

  async createProduct(productData: any) {
    return this.request<any>('/inventory/products', {
      method: 'POST',
      body: JSON.stringify(productData),
    });
  }

  async updateProduct(id: string, productData: any) {
    return this.request<any>(`/inventory/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(productData),
    });
  }

  async getSuppliers(branchId?: string) {
    const query = branchId ? `?branch_id=${branchId}` : '';
    return this.request<any[]>(`/inventory/suppliers${query}`);
  }

  async createSupplier(supplierData: any) {
    return this.request<any>('/inventory/suppliers', {
      method: 'POST',
      body: JSON.stringify(supplierData),
    });
  }

  // Supplier Product Details APIs
  async getSupplierProducts(supplierId: string) {
    return this.request<any[]>(`/inventory/supplier-products/${supplierId}`);
  }

  async addSupplierProduct(data: any) {
    return this.request<any>('/inventory/supplier-products', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateSupplierProduct(id: string, data: any) {
    return this.request<any>(`/inventory/supplier-products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async getProductSuppliers(productId: string) {
    return this.request<any[]>(`/inventory/product-suppliers/${productId}`);
  }

  // Employee APIs
  async getEmployees(branchId?: string) {
    const query = branchId ? `?branch_id=${branchId}` : '';
    return this.request<any[]>(`/employees${query}`);
  }

  async getTasks() {
    return this.request<any[]>('/employees/tasks');
  }

  async createTask(taskData: any) {
    return this.request<any>('/employees/tasks', {
      method: 'POST',
      body: JSON.stringify(taskData),
    });
  }

  async updateTaskStatus(id: string, status: string) {
    return this.request<any>(`/employees/tasks/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  }

  async checkIn() {
    return this.request<any>('/employees/attendance/checkin', {
      method: 'POST',
    });
  }

  async checkOut(breakDuration?: number, notes?: string) {
    return this.request<any>('/employees/attendance/checkout', {
      method: 'PUT',
      body: JSON.stringify({ break_duration: breakDuration, notes }),
    });
  }

  // Finance APIs
  async getInvoices(branchId?: string) {
    const query = branchId ? `?branch_id=${branchId}` : '';
    return this.request<any[]>(`/finance/invoices${query}`);
  }

  async createInvoice(invoiceData: any) {
    return this.request<any>('/finance/invoices', {
      method: 'POST',
      body: JSON.stringify(invoiceData),
    });
  }

  async updateInvoiceStatus(id: string, status: string) {
    return this.request<any>(`/finance/invoices/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  }

  async addInvoiceItem(invoiceId: string, itemData: any) {
    return this.request<any>(`/finance/invoices/${invoiceId}/items`, {
      method: 'POST',
      body: JSON.stringify(itemData),
    });
  }

  async splitInvoiceItem(invoiceId: string, itemId: string) {
    return this.request<any>(`/finance/invoices/${invoiceId}/items/${itemId}/split`, {
      method: 'POST',
    });
  }


  async getExpenses(branchId?: string) {
    const query = branchId ? `?branch_id=${branchId}` : '';
    return this.request<any[]>(`/finance/expenses${query}`);
  }

  async createExpense(expenseData: any) {
    return this.request<any>('/finance/expenses', {
      method: 'POST',
      body: JSON.stringify(expenseData),
    });
  }

  async approveExpense(id: string) {
    return this.request<any>(`/finance/expenses/${id}/approve`, {
      method: 'PUT',
    });
  }

  // Reports APIs
  async getFinancialSummary(branchId?: string, startDate?: string, endDate?: string) {
    const params = new URLSearchParams();
    if (branchId) params.append('branch_id', branchId);
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request<any>(`/reports/financial-summary${query}`);
  }

  async getBookingStats(branchId?: string, period?: string) {
    const params = new URLSearchParams();
    if (branchId) params.append('branch_id', branchId);
    if (period) params.append('period', period);
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request<any>(`/reports/booking-stats${query}`);
  }

  async getClientStats(branchId?: string) {
    const query = branchId ? `?branch_id=${branchId}` : '';
    return this.request<any>(`/reports/client-stats${query}`);
  }

  async getInventoryAlerts(branchId?: string) {
    const query = branchId ? `?branch_id=${branchId}` : '';
    return this.request<any>(`/reports/inventory-alerts${query}`);
  }

  // Purchase Order APIs
  async getPurchaseOrders(branchId?: string) {
    const query = branchId ? `?branch_id=${branchId}` : '';
    return this.request<any[]>(`/purchase-orders${query}`);
  }

  async getPurchaseOrder(id: string) {
    return this.request<any>(`/purchase-orders/${id}`);
  }

  async createPurchaseOrder(orderData: any) {
    return this.request<any>('/purchase-orders', {
      method: 'POST',
      body: JSON.stringify(orderData),
    });
  }

  async updatePurchaseOrder(id: string, orderData: any) {
    return this.request<any>(`/purchase-orders/${id}`, {
      method: 'PUT',
      body: JSON.stringify(orderData),
    });
  }

  async deletePurchaseOrder(id: string) {
    return this.request<any>(`/purchase-orders/${id}`, {
      method: 'DELETE',
    });
  }

  async updatePurchaseOrderStatus(id: string, status: string) {
    return this.request<any>(`/purchase-orders/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  }

  async addPurchaseOrderItem(orderId: string, itemData: any) {
    return this.request<any>(`/purchase-orders/${orderId}/items`, {
      method: 'POST',
      body: JSON.stringify(itemData),
    });
  }

  async updatePurchaseOrderItem(orderId: string, itemId: string, itemData: any) {
    return this.request<any>(`/purchase-orders/${orderId}/items/${itemId}`, {
      method: 'PUT',
      body: JSON.stringify(itemData),
    });
  }

  async deletePurchaseOrderItem(orderId: string, itemId: string) {
    return this.request<any>(`/purchase-orders/${orderId}/items/${itemId}`, {
      method: 'DELETE',
    });
  }
}

export const apiClient = new ApiClient();