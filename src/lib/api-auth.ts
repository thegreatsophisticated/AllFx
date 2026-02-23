import axios from 'axios';

const API_URL = import.meta.env.VITE_PUBLIC_API_URL;

export const login = async (email: string, password: string) => {
  const response = await axios.post(`${API_URL}/login`, { email, password });
  const data = response.data;
  if (data?.user_id) return data;
  throw new Error(data?.message ?? 'Login failed');
};

export const register = async (phone: string, email: string, password: string) => {
  const response = await axios.post(`${API_URL}/register`, { phone, email, password });
  const data = response.data;
  if (data?.user_id || data?.message?.toLowerCase().includes('success')) return data;
  throw new Error(data?.message ?? 'Registration failed');
};

export const getUserData = async (userId: string) => {
  const response = await axios.post(`${API_URL}/getUserData`, { user_id: userId });
  const data = response.data;
  if (data?.user_id || data?.email) return data;
  throw new Error(data?.message ?? 'Failed to fetch user data');
};

export const logout = async () => {
  const token = localStorage.getItem("token");
  try {
    await axios.post(`${API_URL}/logout`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    });
  } finally {
    localStorage.removeItem("user_id");
    localStorage.removeItem("email");
    localStorage.removeItem("company_id");
  }
};