import apiClient from './client';

export const claimsApi = {
  getDashboard: () => apiClient.get('/claims/dashboard').then((r) => r.data),

  getFinanceMembers: () => apiClient.get('/claims/finance-members').then((r) => r.data),

  list: (params?: { status?: string; page?: number; limit?: number; search?: string; scope?: string }) =>
    apiClient.get('/claims', { params }).then((r) => r.data),

  get: (id: string) => apiClient.get(`/claims/${id}`).then((r) => r.data),

  create: (data: { eventName?: string; purpose?: string; department?: string; notes?: string }) =>
    apiClient.post('/claims', data).then((r) => r.data),

  update: (id: string, data: any) =>
    apiClient.put(`/claims/${id}`, data).then((r) => r.data),

  submit: (id: string, assignedFinanceId?: string) =>
    apiClient.post(`/claims/${id}/submit`, { assignedFinanceId }).then((r) => r.data),

  inviteFinance: (claimId: string, financeId: string) =>
    apiClient.post(`/claims/${claimId}/invite-finance`, { financeId }).then((r) => r.data),

  delete: (id: string) =>
    apiClient.delete(`/claims/${id}`).then((r) => r.data),

  downloadPdf: (id: string) =>
    apiClient.get(`/claims/${id}/pdf`, { responseType: 'blob' }).then((r) => r.data),

  // Claim items
  addItem: (claimId: string, data: any) =>
    apiClient.post(`/claims/${claimId}/items`, data).then((r) => r.data),

  updateItem: (claimId: string, itemId: string, data: any) =>
    apiClient.put(`/claims/${claimId}/items/${itemId}`, data).then((r) => r.data),

  deleteItem: (claimId: string, itemId: string) =>
    apiClient.delete(`/claims/${claimId}/items/${itemId}`).then((r) => r.data),
};

export const usersApi = {
  updateBankDetails: (userId: string, data: { accountNo?: string; iban?: string; swift?: string; bankName?: string }) =>
    apiClient.put(`/users/${userId}/bank-details`, data).then((r) => r.data),
};
