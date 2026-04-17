import axios from 'axios';

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:5000';
console.log(API_BASE_URL,'API_BASE_URL')
export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: false,
  timeout: 15000,
});

export { API_BASE_URL };

export const WS_BASE_URL =
  process.env.EXPO_PUBLIC_WS_BASE_URL ||
  API_BASE_URL.replace(/^http/, 'ws');
