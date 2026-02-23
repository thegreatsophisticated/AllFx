import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, PieChart } from "lucide-react";
import { mockAssets, mockUser, formatCurrency, type Asset } from "@/lib/mockData";

const PortfolioPage = () => {
  const holdings = mockAssets.filter((a) => a.user_share > 0);

  return (
    <div className="pb-20">
      {/* Header */}
      <div className="px-4 pt-2">
        <h2 className="text-lg font-display font-bold">Portfolio</h2>
      </div>

      {/* Holdings list */}
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

const PortfolioRow = ({ asset, index }: { asset: Asset; index: number }) => {
  const navigate = useNavigate();
  const isPositive = asset.finalchange >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      onClick={() => navigate(`/stock/${asset.id}`)}
      className="flex items-center justify-between p-3.5 rounded-xl bg-card border border-border cursor-pointer hover:border-primary/20 transition-colors"
    >
      {/* Left: logo + info */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-secondary overflow-hidden flex items-center justify-center flex-shrink-0">
          <img
            src={asset.logo}
            alt={asset.stock_name}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
              (e.target as HTMLImageElement).parentElement!.innerHTML = `<span class="text-sm font-bold text-primary">${asset.stock_code.slice(0, 2)}</span>`;
            }}
          />
        </div>
        <div>
          <p className="text-sm font-bold">{asset.stock_code}</p>
          <p className="text-xs text-muted-foreground">{asset.stock_name}</p>
          <div className="flex items-center gap-1 mt-0.5 text-xs text-muted-foreground">
            <PieChart className="w-3 h-3" />
            <span>{asset.user_share} shares</span>
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
          {asset.finalchange.toFixed(2)}%
        </span>
      </div>
    </motion.div>
  );
};

export default PortfolioPage;
