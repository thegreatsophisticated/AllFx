import axios from 'axios';

const API_URL = import.meta.env.VITE_PUBLIC_API_URL;

export const getAllStocks = async (userId: string) => {
  const response = await axios.post(`${API_URL}/getAllStocks`, { user_id: userId });
  const data = response.data;
  if (Array.isArray(data)) return data.map((stock) => ({ ...stock, finalchange: stock.finalchange ?? 0 }));
  if (Array.isArray(data?.stocks)) return data.stocks.map((stock) => ({ ...stock, finalchange: stock.finalchange ?? 0 }));
  throw new Error(data?.message ?? 'Failed to fetch stocks');
};

export const getUserStockProducts = async (userId: string) => {
  const response = await axios.post(`${API_URL}/getUserStockProducts`, { userID: userId });
  const data = response.data;
  console.log('Portfolio data:', data); 
  if (Array.isArray(data)) return data.map((stock) => ({ ...stock, finalchange: stock.finalchange ?? 0 }));
  if (Array.isArray(data?.stocks)) return data.stocks.map((stock) => ({ ...stock, finalchange: stock.finalchange ?? 0 }));
  throw new Error(data?.message ?? 'Failed to fetch portfolio');
};

export const getStockChart = async (stockId: number) => {
  const response = await axios.post(`${API_URL}/getStockChart`, { stock_id: stockId });
 
  const data = response.data?.data;
   console.log('Chart data:',data.data);
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.chart)) return data.chart;
  throw new Error(data?.message ?? 'Failed to fetch chart data');
};

export const addWatchList = async (userId: string, stockId: number) => {
  const response = await axios.post(`${API_URL}/addWatchList`, { user_id: userId, stock_id: stockId });
  const data = response.data;
  if (data?.message?.toLowerCase().includes('success') || data?.status === 'success') return data;
  throw new Error(data?.message ?? 'Failed to add to watchlist');
};



// export const buyStock = async (userId: string, stockId: number, quantity: number, price: number) => {
//   const userIDNumber = Number(userId);
//   const response = await axios.post(`${API_URL}/buyStock`, { user_id: userIDNumber, stock_id: stockId, quantity, price });
//   const data = response.data;
//   if (data?.message?.toLowerCase().includes('success') || data?.transaction_id || data?.status === 'success') return data;
//   throw new Error(data?.message ?? 'Buy failed');
// };


// export const sellStock = async (userId: string, stockId: number, quantity: number, price: number) => {
//   const userIDNumber = Number(userId);
//   const response = await axios.post(`${API_URL}/sellStock`, { user_id: userIDNumber, stock_id: stockId, quantity, price });
//   const data = response.data;
//   if (data?.message?.toLowerCase().includes('success') || data?.transaction_id || data?.status === 'success') return data;
//   throw new Error(data?.message ?? 'Sell failed');
// };

export const buyStock = async (userId: string, stockId: number, quantity: number, price: number) => {
  const userIDNumber = Number(userId);
  const response = await axios.post(`${API_URL}/buyStock`, { user_id: userIDNumber, stock_id: stockId, quantity, price });
  const data = response.data;
  
  // Always throw with the real API message on error
  if (data?.status === 'error') throw new Error(data?.message ?? 'Buy failed');
  return data; 
};

export const sellStock = async (userId: string, stockId: number, quantity: number, price: number) => {
  const userIDNumber = Number(userId);
  const response = await axios.post(`${API_URL}/sellStock`, { user_id: userIDNumber, stock_id: stockId, quantity, price });
  const data = response.data;
  if (data?.status === 'error') throw new Error(data?.message ?? 'Sell failed');
  return data;
};



export const getStockProducts = async (category: string = "19") => {
  const response = await axios.post(`${API_URL}/getStockProducts`, { category });
  const data = response.data;
  if (Array.isArray(data)) return data.map((stock) => ({ ...stock, finalchange: stock.finalchange ?? 0 }));
  if (Array.isArray(data?.stocks)) return data.stocks.map((stock) => ({ ...stock, finalchange: stock.finalchange ?? 0 }));
  throw new Error(data?.message ?? "Failed to fetch stock products");
};
