import axios, { AxiosError } from 'axios';
import { ApiResponse } from '../types/orion';

export class ApiError extends Error {
  public code?: string;
  public status?: number;

  constructor(message: string, code?: string, status?: number) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
  }
}

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.response.use(
  (response) => {
    // The server wraps data in an ApiResponse object: { success, data, error }
    const payload = response.data as ApiResponse;
    
    // Explicitly check for successful response
    if (payload.success === false) {
      throw new ApiError(
        payload.error?.message || 'API operation failed without specific error message',
        payload.error?.code,
        response.status
      );
    }
    
    // Auto-unwrap and return the genuine payload to the services
    return payload.data;
  },
  (error: AxiosError<ApiResponse>) => {
    if (error.response) {
      const payload = error.response.data;
      if (payload && payload.success === false) {
        throw new ApiError(
          payload.error?.message || error.message,
          payload.error?.code,
          error.response.status
        );
      }
      throw new ApiError(error.message, undefined, error.response.status);
    } else if (error.request) {
      throw new ApiError('No response received from the server (Network Error)');
    } else {
      throw new ApiError(error.message);
    }
  }
);

export default api;
