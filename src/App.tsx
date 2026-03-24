import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import WelcomePage from "./pages/WelcomePage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import DashboardLayout from "./pages/DashboardLayout";
import PortfolioPage from "./pages/PortfolioPage";
import ExplorePage from "./pages/ExplorePage";
import SearchPage from "./pages/SearchPage";
import NotFound from "./pages/NotFound";
import StockDetailPage from "./pages/StockDetailPage";
import MobileMoney from "./pages/MobileMoney";
import UserTopUp from "./pages/UserTopUp";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<WelcomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/stock" element={<StockDetailPage />} />
          <Route path="/mobile-money" element={<MobileMoney />} />
          <Route path="/user-top-up" element={<UserTopUp />} />
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<PortfolioPage />} />
            <Route path="explore" element={<ExplorePage />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;