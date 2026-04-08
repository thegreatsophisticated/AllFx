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

export const updateUserInfo = async (
  userId: string,
  fields: {
    first_name: string;
    last_name: string;
    phone: string;
    country: string;
    state: string;
    city: string;
  }
) => {
  const response = await axios.post(`${API_URL}/updateUserInfo`, {
    user_id: userId,
    company_id: sessionStorage.getItem("company_id") ?? "",  // ✅ fixes PHP warning
    company_role: "",                                        // ✅ fixes PHP warning
    ...fields,
  });
  const data = response.data;
  if (data?.status === 'success') return data;              // ✅ matches actual response
  throw new Error(data?.message ?? 'Failed to update profile');
};

export const logout = async () => {
  const token = sessionStorage.getItem("token");
  try {
    await axios.post(`${API_URL}/logout`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    });
  } finally {
    sessionStorage.removeItem("user_id");
    sessionStorage.removeItem("email");
    sessionStorage.removeItem("company_id");
  }
};

// ── Add these two functions to your existing api-auth.ts ──────────────────────

export const requestPasswordReset = async (email: string) => {
  // Uses the standalone PHP endpoint (form-encoded, not JSON)
  const response = await axios.post(
    "https://irebegroup.com/api/reset_password.php",
    new URLSearchParams({ email }),          // matches Flutter's body: {'email': email}
  );
  const data = response.data;
  if (data?.status === "success" || data?.message?.toLowerCase().includes("sent")) return data;
  throw new Error(data?.message ?? "Failed to send reset email");
};


// export const resetPassword = async (email: string, password: string) => {
//   const response = await axios.post(`${API_URL}/resetPassword`, { email, password });
//   const data = response.data;
//   if (data?.status === "success" || data?.message?.toLowerCase().includes("success")) return data;
//   throw new Error(data?.message ?? "Failed to reset password");
// };


// Add this to your existing api-auth.ts
// (remove requestPasswordReset if you added it earlier — it's not needed)

export const resetPassword = async (email: string, password: string) => {
  const response = await axios.post(`${API_URL}/resetPassword`, { email, password });
  const data = response.data;
  if (data?.status === "success" || data?.message?.toLowerCase().includes("success")) return data;
  throw new Error(data?.message ?? "Failed to reset password");
};