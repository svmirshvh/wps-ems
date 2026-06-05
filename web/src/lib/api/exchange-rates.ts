import apiClient from './client';

export const exchangeRatesApi = {
  getLatest: () => apiClient.get('/exchange-rates/latest').then((r) => r.data),
  getAll: () => apiClient.get('/exchange-rates').then((r) => r.data),
  create: (data: any) => apiClient.post('/exchange-rates', data).then((r) => r.data),
};
