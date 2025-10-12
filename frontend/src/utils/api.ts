import axios from 'axios';
import { BACKEND_URL } from './constants';

const api = axios.create({
  baseURL: BACKEND_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface RegisterData {
  name: string;
  location: string;
  certifications: string[];
  role: string;
}

export interface RegisterResponse {
  profileHash: number[];
  profileHashHex: string;
  cid: string;
  profileData: any;
}

export interface BatchMetadataData {
  batchId: string;
  origin: {
    production_date: number;
    quantity: number;
    weight: number;
    product_type: string;
  };
  metadata: any;
}

export interface BatchMetadataResponse {
  metadataHash: number[];
  metadataHashHex: string;
  cid: string;
}

export interface IoTData {
  timestamp: number;
  temperature: number;
  humidity: number;
  location: { lat: number; lng: number; name: string };
}

export const registerUser = async (data: RegisterData): Promise<RegisterResponse> => {
  const response = await api.post('/api/register', data);
  return response.data;
};

export const uploadBatchMetadata = async (data: BatchMetadataData): Promise<BatchMetadataResponse> => {
  const response = await api.post('/api/batch/metadata', data);
  return response.data;
};

export const getMetadata = async (cid: string): Promise<any> => {
  const response = await api.get(`/api/batch/metadata/${cid}`);
  return response.data;
};

export const getProfile = async (cid: string): Promise<any> => {
  const response = await api.get(`/api/profile/${cid}`);
  return response.data;
};

export const getIoTData = async (batchId: string): Promise<IoTData[]> => {
  const response = await api.get(`/api/iot/${batchId}`);
  return response.data;
};

export default api;
