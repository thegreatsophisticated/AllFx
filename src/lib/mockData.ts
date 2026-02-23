// Mock data for the app
export interface Asset {
  id: string;
  stock_name: string;
  stock_code: string;
  category: string;
  quantity: number;
  price: number;
  owner_id: string;
  user_share: number;
  min_sell_price: number;
  current_price: number;
  max_buy_price: number;
  interest_rate: string;
  payback_date: string;
  description: string;
  finalchange: number;
  logo: string;
}

export interface UserInfo {
  email: string;
  phone: string;
  first_name: string;
  last_name: string;
  country: string;
  state: string;
  city: string;
  account_balance: number;
}

export const mockUser: UserInfo = {
  email: "john@allfx.com",
  phone: "+250789123456",
  first_name: "John",
  last_name: "Doe",
  country: "Rwanda",
  state: "Kigali",
  city: "Nyarugenge",
  account_balance: 1250000,
};

export const mockAssets: Asset[] = [
  { id: "1", stock_name: "Bank of Kigali", stock_code: "BK", category: "Banking", quantity: 100, price: 280, owner_id: "1", user_share: 50, min_sell_price: 275, current_price: 285, max_buy_price: 290, interest_rate: "5.2", payback_date: "2026-12-01", description: "Leading commercial bank in Rwanda", finalchange: 3.45, logo: "https://upload.wikimedia.org/wikipedia/en/thumb/a/a1/Bank_of_Kigali_logo.svg/1200px-Bank_of_Kigali_logo.svg.png" },
  { id: "2", stock_name: "Bralirwa", stock_code: "BLR", category: "Manufacturing", quantity: 200, price: 160, owner_id: "1", user_share: 80, min_sell_price: 155, current_price: 165, max_buy_price: 170, interest_rate: "3.8", payback_date: "2026-06-15", description: "Beverages manufacturer", finalchange: 1.25, logo: "https://www.bfrenz.com/wp-content/uploads/2024/08/Bralirwa_logo.png" },
  { id: "3", stock_name: "Crystal Telecom", stock_code: "CTL", category: "Telecom", quantity: 150, price: 90, owner_id: "1", user_share: 30, min_sell_price: 85, current_price: 92, max_buy_price: 95, interest_rate: "4.5", payback_date: "2027-03-01", description: "Telecommunications provider", finalchange: -2.10, logo: "https://i0.wp.com/www.taarifa.rw/wp-content/uploads/2019/07/crystal-ventures.jpg" },
  { id: "4", stock_name: "Equity Group", stock_code: "EQG", category: "Banking", quantity: 75, price: 420, owner_id: "1", user_share: 25, min_sell_price: 415, current_price: 425, max_buy_price: 430, interest_rate: "6.1", payback_date: "2026-09-30", description: "Multinational banking group", finalchange: 5.72, logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5a/Equity_Group_Holdings_Logo.svg/1200px-Equity_Group_Holdings_Logo.svg.png" },
  { id: "5", stock_name: "Nation Media", stock_code: "NMG", category: "Media", quantity: 300, price: 45, owner_id: "1", user_share: 120, min_sell_price: 42, current_price: 47, max_buy_price: 50, interest_rate: "2.9", payback_date: "2027-01-15", description: "East Africa's largest media company", finalchange: -4.35, logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6e/Nation_Media_Group_Logo.svg/1200px-Nation_Media_Group_Logo.svg.png" },
  { id: "6", stock_name: "Safaricom", stock_code: "SCOM", category: "Telecom", quantity: 500, price: 32, owner_id: "1", user_share: 200, min_sell_price: 30, current_price: 33, max_buy_price: 35, interest_rate: "4.0", payback_date: "2026-08-20", description: "Kenya's leading telco", finalchange: 2.88, logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/04/Safaricom_logo.svg/1200px-Safaricom_logo.svg.png" },
  { id: "7", stock_name: "I&M Group", stock_code: "IMH", category: "Banking", quantity: 120, price: 350, owner_id: "1", user_share: 0, min_sell_price: 340, current_price: 345, max_buy_price: 360, interest_rate: "5.5", payback_date: "2027-06-01", description: "Regional banking group", finalchange: -1.42, logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/I%26M_Bank_logo.svg/1200px-I%26M_Bank_logo.svg.png" },
  { id: "8", stock_name: "KCB Group", stock_code: "KCB", category: "Banking", quantity: 250, price: 380, owner_id: "1", user_share: 0, min_sell_price: 370, current_price: 390, max_buy_price: 400, interest_rate: "5.8", payback_date: "2027-03-15", description: "Kenya Commercial Bank Group", finalchange: -3.68, logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e2/KCB_Group_logo.svg/1200px-KCB_Group_logo.svg.png" },
];

export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-RW", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
};
