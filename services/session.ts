import { api } from './api';

export interface CreateSessionResponse {
  token: string;
  status: string;
  kioskUrl: string;
  mobileUrl: string;
}

export const createSession = async (): Promise<CreateSessionResponse> => {
  const { data } = await api.post<CreateSessionResponse>('/session');
  return data;
};

export interface UploadImageResponse {
  message: string;
  status: string;
  imageUrl: string;
}

export const uploadSessionImage = async (params: {
  sessionId: string;
  imageUri: string;
  mimeType?: string;
}): Promise<UploadImageResponse> => {
  const formData = new FormData();
  const filename = params.imageUri.split('/').pop() || 'photo.jpg';
  const mimeType = params.mimeType || 'image/jpeg';

  formData.append('image', {
    uri: params.imageUri,
    name: filename,
    type: mimeType,
  } as unknown as Blob);

  const { data } = await api.post<UploadImageResponse>(
    `/session/${params.sessionId}/image`,
    formData,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
    },
  );

  return data;
};

export interface CreatePaymentIntentResponse {
  clientSecret: string;
  paymentIntentId: string;
  amount: number;
  currency: string;
}

export const createPaymentIntent = async (
  sessionId: string,
): Promise<CreatePaymentIntentResponse> => {
  const { data } = await api.post<CreatePaymentIntentResponse>(
    `/session/${sessionId}/payment-intent`,
  );
  return data;
};

export const confirmPaymentOnServer = async (params: {
  sessionId: string;
  paymentIntentId: string;
}): Promise<{ status: string }> => {
  const { data } = await api.post<{ status: string }>(
    `/session/${params.sessionId}/payment-confirm`,
    { paymentIntentId: params.paymentIntentId },
  );
  return data;
};

export const requestPrint = async (sessionId: string): Promise<void> => {
  await api.post(`/session/${sessionId}/print`);
};

/**
 * Send a rendered image (with filters baked in) to the backend for server-side
 * CUPS printing.
 */
export const requestPrintWithImage = async (params: {
  sessionId: string;
  imageUri: string;
  filterType?: string;
  brightness?: number;
}): Promise<{ message: string; status: string }> => {
  const formData = new FormData();
  formData.append('image', {
    uri: params.imageUri,
    name: 'postcard.jpg',
    type: 'image/jpeg',
  } as unknown as Blob);

  if (params.filterType) {
    formData.append('filter', params.filterType);
  }
  if (params.brightness !== undefined) {
    formData.append('brightness', String(params.brightness));
  }

  const { data } = await api.post<{ message: string; status: string }>(
    `/session/${params.sessionId}/print`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );

  return data;
};
