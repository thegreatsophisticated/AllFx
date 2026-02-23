import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown } from "lucide-react";
import { getAllStocks } from "@/lib/api-stocks";

// Match whatever shape your API actually returns
export type Asset = {
  id: string | number;
  stock_code: string;
  stock_name: string;
  finalchange: number;
  logo?: string;
};

const ExplorePage = () => {
  const [stocks, setStocks] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStocks = async () => {
      try {
        const userId = localStorage.getItem("user_id") ?? "";
        const data = await getAllStocks(userId);
        console.log('Fetched stocks:', data);
        setStocks(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load stocks");
      } finally {
        setIsLoading(false);
      }
    };

    fetchStocks();
  }, []);

  const topGainers = useMemo(
    () => stocks.filter((a) => a.finalchange >= 0).sort((a, b) => b.finalchange - a.finalchange),
    [stocks]
  );
  console.log('Top gainers:', topGainers);
  const topLosers = useMemo(
    () => stocks.filter((a) => a.finalchange < 0).sort((a, b) => a.finalchange - b.finalchange),
    [stocks]
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-sm text-muted-foreground animate-pulse">Loading stocks...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 gap-3">
        <p className="text-sm text-destructive text-center">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="text-xs text-primary underline"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="pb-20">
      <div className="px-4 pt-4">
        <h2 className="text-lg font-display font-bold">Trade Stocks</h2>
      </div>

      <section className="mt-5">
        <h3 className="px-4 text-sm font-semibold text-muted-foreground mb-3">
          Top Gainers Today
        </h3>
        {topGainers.length === 0 ? (
          <p className="px-4 text-xs text-muted-foreground">No gainers today</p>
        ) : (
          <div className="flex gap-3 overflow-x-auto px-4 no-scrollbar pb-2">
            {topGainers.map((asset, i) => (
              <GainerLoserCard key={asset.id} asset={asset} index={i} />
            ))}
          </div>
        )}
      </section>

      <section className="mt-6">
        <h3 className="px-4 text-sm font-semibold text-muted-foreground mb-3">
          Top Losers Today
        </h3>
        {topLosers.length === 0 ? (
          <p className="px-4 text-xs text-muted-foreground">No losers today</p>
        ) : (
          <div className="flex gap-3 overflow-x-auto px-4 no-scrollbar pb-2">
            {topLosers.map((asset, i) => (
              <GainerLoserCard key={asset.id} asset={asset} index={i} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

const GainerLoserCard = ({ asset, index }: { asset: Asset; index: number }) => {
  const navigate = useNavigate();
  const isPositive = asset.finalchange >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.05 }}
      className="flex-shrink-0 w-44 p-4 rounded-2xl bg-card border border-border flex flex-col items-center gap-3"
    >
      <div className="w-16 h-16 rounded-full bg-secondary overflow-hidden flex items-center justify-center">
        {asset.logo ? (
          <img
            src={asset.logo}
            alt={asset.stock_name}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
              (e.target as HTMLImageElement).parentElement!.innerHTML =
                `<span class="text-lg font-bold text-primary">${asset.stock_code.slice(0, 2)}</span>`;
            }}
          />
        ) : (
          <span className="text-lg font-bold text-primary">
            {asset.stock_code.slice(0, 2)}
          </span>
        )}
      </div>

      <div className="text-center">
        <p className="text-sm font-bold">{asset.stock_code}</p>
        <p className="text-xs text-muted-foreground truncate max-w-[140px]">
          {asset.stock_name}
        </p>
      </div>

      <div
        className={`flex items-center gap-1 px-3 py-1.5 rounded-lg border text-xs font-semibold ${
          isPositive
            ? "text-accent border-accent/30 bg-accent/10"
            : "text-destructive border-destructive/30 bg-destructive/10"
        }`}
      >
        {isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
        <span>
          {isPositive ? "+" : ""}
          {asset.finalchange.toFixed(2)}%
        </span>
      </div>

      <button
        onClick={() => navigate(`/stock/${asset.id}`)}
        className="w-full py-2 rounded-lg bg-accent/10 text-accent text-xs font-semibold border border-accent/20 hover:bg-accent/20 transition-colors"
      >
        Trade
      </button>
    </motion.div>
  );
};

export default ExplorePage;