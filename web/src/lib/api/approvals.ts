import apiClient from './client';

export const approvalsApi = {
  getPending: () => apiClient.get('/approvals/pending').then((r) => r.data),

  approve: (claimId: string, data: { action: 'approve' | 'reject'; comment?: string }) =>
    apiClient.post(`/approvals/${claimId}`, data).then((r) => r.data),

  reopen: (claimId: string) =>
    apiClient.post(`/approvals/${claimId}/reopen`).then((r) => r.data),
};
