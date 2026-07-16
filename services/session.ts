import { api } from './api';
import { FilterType } from '../constants/theme';

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
 * Let the backend know a print job started/completed on-device (native AirPrint),
 * so session status and WebSocket listeners stay in sync. No image is uploaded.
 */
export const notifyPrintStatus = async (
  sessionId: string,
  status: 'printing' | 'printed' | 'error',
): Promise<void> => {
  await api.post(`/session/${sessionId}/print-status`, { status });
};

export interface PhotoAnalysisResult {
  filter: FilterType;
  brightness: number;
  contrast: number;
  saturation: number;
  warmth: number;
}

/**
 * Ask the backend to analyze the session's uploaded photo (via OpenAI vision)
 * and recommend a filter + brightness/contrast/saturation/warmth, similar to a
 * Lightroom "Auto" suggestion.
 */
export const analyzePhoto = async (
  sessionId: string,
): Promise<PhotoAnalysisResult> => {
  const { data } = await api.post<PhotoAnalysisResult>(
    `/session/${sessionId}/analyze-photo`,
  );
  return data;
};
