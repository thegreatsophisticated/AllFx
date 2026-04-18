import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp, TrendingDown, PieChart, Layers, User, Trash2 } from "lucide-react";
import { getUserStockProducts, removeWatchList } from "@/lib/api-stocks";
import { toast } from "sonner";

const PortfolioPage = () => {
  const [holdings, setHoldings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<number | null>(null);
  const userId = sessionStorage.getItem("user_id") ?? "";

  const fetchPortfolio = async () => {
    try {
      setIsLoading(true);
      const data = await getUserStockProducts(userId);
      setHoldings(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load portfolio");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchPortfolio(); }, []);

  const handleRemoveWatchlist = async (stockId: number, stockCode: string) => {
    if (!userId) { toast.error("Please log in."); return; }
    setRemovingId(stockId);
    try {
      await removeWatchList(userId, stockId);
      toast.success(`${stockCode} removed from watchlist`);
      // Optimistically remove from list
      setHoldings((prev) => prev.filter((h) => h.id !== stockId));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove");
    } finally {
      setRemovingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-sm text-muted-foreground animate-pulse">Loading portfolio...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 gap-3">
        <p className="text-sm text-destructive text-center">{error}</p>
        <button onClick={fetchPortfolio} className="text-xs text-primary underline">
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="pb-20">
      <div className="px-4 pt-2">
        <h2 className="text-lg font-display font-bold">Portfolio</h2>
        <p className="text-xs text-muted-foreground mt-0.5">{holdings.length} holding{holdings.length !== 1 ? "s" : ""}</p>
      </div>

      <div className="px-4 mt-4">
        <AnimatePresence>
          <div className="space-y-2">
            {holdings.map((asset, i) => (
              <PortfolioRow
                key={asset.id}
                asset={asset}
                index={i}
                isRemoving={removingId === asset.id}
                onRemove={() => handleRemoveWatchlist(asset.id, asset.stock_code)}
              />
            ))}
          </div>
        </AnimatePresence>

        {holdings.length === 0 && (
          <div className="text-center mt-16">
            <PieChart className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No stocks in your portfolio</p>
          </div>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────

const PortfolioRow = ({
  asset,
  index,
  isRemoving,
  onRemove,
}: {
  asset: any;
  index: number;
  isRemoving: boolean;
  onRemove: () => void;
}) => {
  const navigate = useNavigate();
  const isPositive = (asset.finalchange ?? 0) >= 0;

  // Separate: total market quantity vs what user owns
  const marketQuantity = asset.quantity ?? 0;       // total shares in market
  const userShares = asset.user_shares ?? 0;         // user's owned shares

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ delay: index * 0.05 }}
      className="rounded-xl bg-card border border-border overflow-hidden"
    >
      {/* Main row — navigates to detail */}
      <div
        onClick={() => navigate("/stock", { state: { asset } })}
        className="flex items-center justify-between p-3.5 cursor-pointer hover:bg-secondary/30 transition-colors"
      >
        {/* Left: logo + name */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-11 h-11 rounded-full bg-secondary overflow-hidden flex items-center justify-center flex-shrink-0">
            {asset.logo ? (
              <img
                src={asset.logo}
                alt={asset.stock_name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                  (e.target as HTMLImageElement).parentElement!.innerHTML =
                    `<span class="text-sm font-bold text-primary">${asset.stock_code?.slice(0, 2)}</span>`;
                }}
              />
            ) : (
              <span className="text-sm font-bold text-primary">
                {asset.stock_code?.slice(0, 2)}
              </span>
            )}
          </div>

          <div className="min-w-0">
            <p className="text-sm font-bold truncate">{asset.stock_code}</p>
            <p className="text-xs text-muted-foreground truncate">{asset.stock_name}</p>
          </div>
        </div>

        {/* Right: change badge */}
        <div
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-semibold ml-2 flex-shrink-0 ${
            isPositive
              ? "text-emerald-500 border-emerald-500/30 bg-emerald-500/10"
              : "text-destructive border-destructive/30 bg-destructive/10"
          }`}
        >
          {isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
          <span>{isPositive ? "+" : ""}{(asset.finalchange ?? 0).toFixed(2)}%</span>
        </div>
      </div>

      {/* Footer bar: quantity | user_shares | remove */}
      <div className="flex items-center border-t border-border divide-x divide-border">
        {/* Total market shares */}
        <div className="flex items-center gap-1.5 px-3.5 py-2 flex-1">
          <Layers className="w-3 h-3 text-muted-foreground flex-shrink-0" />
          <div>
            <p className="text-[9px] uppercase tracking-wider text-muted-foreground leading-none mb-0.5">Market Qty</p>
            <p className="text-xs font-semibold">{marketQuantity.toLocaleString()}</p>
          </div>
        </div>

        {/* User's own shares */}
        <div className="flex items-center gap-1.5 px-3.5 py-2 flex-1">
          <User className="w-3 h-3 text-muted-foreground flex-shrink-0" />
          <div>
            <p className="text-[9px] uppercase tracking-wider text-muted-foreground leading-none mb-0.5">My Shares</p>
            <p className={`text-xs font-semibold ${userShares > 0 ? "text-primary" : ""}`}>
              {userShares.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Remove from watchlist */}
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          disabled={isRemoving}
          className="flex items-center justify-center px-4 py-2 text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors disabled:opacity-40"
          title="Remove from watchlist"
        >
          <Trash2 className={`w-3.5 h-3.5 ${isRemoving ? "animate-pulse" : ""}`} />
        </button>
      </div>
    </motion.div>
  );
};

export default PortfolioPage;
