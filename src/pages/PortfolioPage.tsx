import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, PieChart } from "lucide-react";
import { getUserStockProducts } from "@/lib/api-stocks";

const PortfolioPage = () => {
  const [holdings, setHoldings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPortfolio = async () => {
      try {
        const userId = localStorage.getItem("user_id") ?? "";
        const data = await getUserStockProducts(userId);
        setHoldings(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load portfolio");
      } finally {
        setIsLoading(false);
      }
    };

    fetchPortfolio();
  }, []);

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
      <div className="px-4 pt-2">
        <h2 className="text-lg font-display font-bold">Portfolio</h2>
      </div>

      <div className="px-4 mt-4">
        <div className="space-y-2">
          {holdings.map((asset, i) => (
            <PortfolioRow key={asset.id} asset={asset} index={i} />
          ))}
        </div>

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

const PortfolioRow = ({ asset, index }: { asset: any; index: number }) => {
  const navigate = useNavigate();
  const isPositive = (asset.finalchange ?? 0) >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      onClick={() => navigate("/stock", { state: { asset } })}
      className="flex items-center justify-between p-3.5 rounded-xl bg-card border border-border cursor-pointer hover:border-primary/20 transition-colors"
    >
      {/* Left: logo + info */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-secondary overflow-hidden flex items-center justify-center flex-shrink-0">
          {asset.logo ? (
            <img
              src={asset.logo}
              alt={asset.stock_name}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
                (e.target as HTMLImageElement).parentElement!.innerHTML =
                  `<span class="text-sm font-bold text-primary">${asset.stock_code.slice(0, 2)}</span>`;
              }}
            />
          ) : (
            <span className="text-sm font-bold text-primary">
              {asset.stock_code.slice(0, 2)}
            </span>
          )}
        </div>
        <div>
          <p className="text-sm font-bold">{asset.stock_code}</p>
          <p className="text-xs text-muted-foreground">{asset.stock_name}</p>
          <div className="flex items-center gap-1 mt-0.5 text-xs text-muted-foreground">
            <PieChart className="w-3 h-3" />
            <span>{asset.user_share ?? asset.quantity ?? 0} shares</span>
          </div>
        </div>
      </div>

      {/* Right: change badge */}
      <div
        className={`flex items-center gap-1 px-3 py-1.5 rounded-lg border text-xs font-semibold ${
          isPositive
            ? "text-accent border-accent/30 bg-accent/10"
            : "text-destructive border-destructive/30 bg-destructive/10"
        }`}
      >
        {isPositive ? (
          <TrendingUp className="w-3.5 h-3.5" />
        ) : (
          <TrendingDown className="w-3.5 h-3.5" />
        )}
        <span>
          {isPositive ? "+" : ""}
          {(asset.finalchange ?? 0).toFixed(2)}%
        </span>
      </div>
    </motion.div>
  );
};

export default PortfolioPage;