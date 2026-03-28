import axios from 'axios';

const API_BASE_URL = 'http://localhost:5001/api';

export const api = {
  login: async (credentials: any) => {
    const response = await axios.post(`${API_BASE_URL}/login`, credentials);
    return response.data;
  },
  getVisitors: async () => {
    const response = await axios.get(`${API_BASE_URL}/visitors`);
    return response.data;
  },
  addVisitor: async (visitor: any) => {
    const response = await axios.post(`${API_BASE_URL}/visitors`, visitor);
    return response.data;
  },
  updateVisitor: async (id: string, visitor: any) => {
    const response = await axios.put(`${API_BASE_URL}/visitors/${id}`, visitor);
    return response.data;
  },
  deleteVisitor: async (id: string) => {
    const response = await axios.delete(`${API_BASE_URL}/visitors/${id}`);
    return response.data;
  }
};
