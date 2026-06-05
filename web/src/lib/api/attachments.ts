import apiClient from './client';

const uploadWithRetry = async (
  file: File,
  claimId?: string,
  claimItemId?: string,
  retries = 3,
): Promise<any> => {
  const formData = new FormData();
  formData.append('file', file);
  const params: any = {};
  if (claimId) params.claimId = claimId;
  if (claimItemId) params.claimItemId = claimItemId;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const r = await apiClient.post('/attachments/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        params,
        timeout: 30000,
      });
      return r.data;
    } catch (err: any) {
      const isNetworkError = !err.response;
      if (isNetworkError && attempt < retries) {
        await new Promise(res => setTimeout(res, attempt * 1500));
        continue;
      }
      throw err;
    }
  }
};

export const attachmentsApi = {
  upload: (file: File, claimId?: string, claimItemId?: string) =>
    uploadWithRetry(file, claimId, claimItemId),

  getSignedUrl: (id: string) =>
    apiClient.get(`/attachments/${id}/url`).then((r) => r.data),

  remove: (id: string) =>
    apiClient.delete(`/attachments/${id}`).then((r) => r.data),
};
