import apiClient from './client';

export const financeApi = {
  getDashboard: (params?: any) =>
    apiClient.get('/finance/dashboard', { params }).then((r) => r.data),

  getExport: (params?: any) =>
    apiClient.get('/finance/export', { params }).then((r) => r.data),
};
