import axios from "axios";

const API_URL = import.meta.env.VITE_PUBLIC_API_URL;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MobileMoneyUser {
  id: number;
  email: string;
  first_name?: string;
  last_name?: string;
}

export interface MobileMoneyTransaction {
  transaction_id: number;
  stock_id: number;
  amount: number;
  direction: "in" | "out";
  reference_code: string;
  user_id: number;
  start_date: string;
  approve_id: number;
  approve_date: string;
  status: "" | "approve" | "cancel";
  stock_code: string;
}

export interface Currency {
  id: string | number;
  stock_name: string;
  category: string;
}

// ─── getUsers ─────────────────────────────────────────────────────────────────
// Used to build emailToIdMap for live email validation (mirrors Flutter loadEmailSuggestions)

export const getUsers = async (): Promise<MobileMoneyUser[]> => {
  const response = await axios.post(`${API_URL}/getUsers`, {});
  const data = response.data;
  if (data?.message === "success") return data.users as MobileMoneyUser[];
  throw new Error("Failed to fetch users");
};

// ─── getCurrencies ────────────────────────────────────────────────────────────
// Fetches currency assets and prepends the default RWANDAN FRANCS entry
// (mirrors Flutter currentFilteredAssets init with RWF at index 0)

export const getCurrencies = async (): Promise<Currency[]> => {
  // Flutter logic:

  // → fetch all assets, filter by category == "currencies" client-side, prepend RWF
  const response = await axios.post(`${API_URL}/getStockProducts`, {});
  const data = response.data;
  const allAssets: Currency[] = Array.isArray(data)
    ? data
    : Array.isArray(data?.stocks)
    ? data.stocks
    : [];


  const currencyAssets = allAssets.filter(
    (asset) => asset.category?.toLowerCase() === "currencies"
  );


  return [
    { id: "0", stock_name: "RWANDAN FRANCS", category: "currencies" },
    ...currencyAssets,
  ];

};


// ─── getAccountRequests ───────────────────────────────────────────────────────
// Fetches transactions for the current user
// (mirrors Flutter fetchTransactions)

export const getAccountRequests = async (
  userId: string
): Promise<MobileMoneyTransaction[]> => {
  const response = await axios.post(`${API_URL}/accountRequests`, {
    user_id: userId,
  });
  const data = response.data;
  if (data?.status === "success") return data.data as MobileMoneyTransaction[];
  throw new Error(data?.message ?? "Failed to fetch transactions");
};

// ─── getUserData ──────────────────────────────────────────────────────────────
// Fetches a single user's profile by ID


export const getUserData = async (userId: string): Promise<any> => {
  const response = await axios.post(`${API_URL}/getUserData`, {
    user_id: userId,
  });
  const data = response.data;
  if (data?.message === "success") return data;
  throw new Error("Failed to fetch user");
};

// ─── accountTransact ──────────────────────────────────────────────────────────
// Submits the transfer after password confirmation on the ConfirmScreen


export const accountTransact = async (payload: {
  user_id: string;
  stock_id: number | string;
  reference_code: string; // receiver ID as string
  direction: "in" | "out";
  amount: string;
  password: string;
  // proof of payment (optional)
  // proof_image_url?: string;
  // direction: "in";
    // reference_code: 1;

}): Promise<{ message?: string; status?: string }> => {
  const response = await axios.post(`${API_URL}/accountTransact`, payload);
  console.log("Account Transaction Response:", response.data);
  return response.data;
};

// ─── transactionApprove ───────────────────────────────────────────────────────
// Called when a receiver taps Approve or Cancel on a pending transaction
// (mirrors Flutter _handleAction calling /transactionApprove)

export const transactionApprove = async (payload: {
  user_id: string;
  password: string;
  transaction_id: string;
  status: "approve" | "cancel";
}): Promise<{ status?: string; message?: string }> => {
  const response = await axios.post(`${API_URL}/transactionApprove`, payload);

  return response.data;
};