import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, PlusCircle, BarChart3 } from "lucide-react";
import { getAllStocks, getStockChart, buyStock, sellStock, addWatchList } from "@/lib/api-stocks";
import StockChart from "@/components/StockChart";
import BuySellPanel from "@/components/BuySellPanel";
import { toast } from "sonner";

const extractChartStats = (data: { date: string; price: number }[]) => {
  if (!data.length) return { open: "-", todayHigh: "-", todayLow: "-", high52Week: "-", low52Week: "-" };
  const prices = data.map((d) => d.price);
  return {
    open: prices[0]?.toFixed(2) ?? "-",
    todayHigh: Math.max(...prices).toFixed(2),
    todayLow: Math.min(...prices).toFixed(2),
    high52Week: Math.max(...prices).toFixed(2),
    low52Week: Math.min(...prices).toFixed(2),
  };
};

const formatCurrency = (value: number) =>
  value.toLocaleString("en-RW", { minimumFractionDigits: 2 });

const StockDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [asset, setAsset] = useState<any>(null);
  const [chartData, setChartData] = useState<{ date: string; price: number }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isChartLoading, setIsChartLoading] = useState(true);
  const [isTransacting, setIsTransacting] = useState(false);
  const [isWatchlisting, setIsWatchlisting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStock = async () => {
      try {
        const userId = localStorage.getItem("user_id") ?? "";
        const stocks = await getAllStocks(userId);
        const found = stocks.find((s: any) => String(s.id) === String(id));
        if (!found) throw new Error("Stock not found");
        setAsset(found);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load stock");
      } finally {
        setIsLoading(false);
      }
    };

    fetchStock();
  }, [id]);

  useEffect(() => {
    const fetchChart = async () => {
      if (!id) return;
      setIsChartLoading(true);
      try {
        const data = await getStockChart(Number(id));
        const normalized = data.map((point: any) => ({
          date: point.date ?? point.created_at ?? point.timestamp ?? "",
          price: parseFloat(point.price ?? point.close ?? point.value ?? 0),
        }));
        setChartData(normalized);
      } catch {
        setChartData([]);
      } finally {
        setIsChartLoading(false);
      }
    };

    fetchChart();
  }, [id]);

  const chartStats = useMemo(() => extractChartStats(chartData), [chartData]);

  if (isLoading) {
    return (
      <div className="app-shell min-h-screen bg-background flex items-center justify-center">
        <p className="text-sm text-muted-foreground animate-pulse">Loading stock...</p>
      </div>
    );
  }

  if (error || !asset) {
    return (
      <div className="app-shell min-h-screen bg-background flex flex-col items-center justify-center gap-3">
        <p className="text-sm text-destructive">{error ?? "Stock not found"}</p>
        <button onClick={() => navigate(-1)} className="text-xs text-primary underline">
          Go back
        </button>
      </div>
    );
  }

  const handleAddWatchlist = async () => {
    const userId = localStorage.getItem("user_id") ?? "";
    setIsWatchlisting(true);
    try {
      await addWatchList(userId, asset.id);
      toast.success(`${asset.stock_code} added to watchlist`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add to watchlist");
    } finally {
      setIsWatchlisting(false);
    }
  };

  const handleTransaction = async (action: "buy" | "sell", price: number, quantity: number) => {
    const userId = localStorage.getItem("user_id") ?? "";
    setIsTransacting(true);
    try {
      if (action === "buy") {
        await buyStock(userId, asset.id, quantity, price);
      } else {
        await sellStock(userId, asset.id, quantity, price);
      }
      toast.success(
        `${action === "buy" ? "Bought" : "Sold"} ${quantity} shares of ${asset.stock_code} at RWF ${formatCurrency(price)}`
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Transaction failed");
    } finally {
      setIsTransacting(false);
    }
  };

  const handleCancel = () => toast.info("Transaction cancelled");

  return (
    <div className="app-shell min-h-screen bg-background pb-48">
      {/* App bar */}
      <div className="flex items-center justify-between p-4">
        <button onClick={() => navigate(-1)} className="text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-base font-display font-bold">{asset.stock_name}</h1>
        <button
          onClick={handleAddWatchlist}
          disabled={isWatchlisting}
          className="text-primary disabled:opacity-50"
        >
          <PlusCircle className={`w-5 h-5 ${isWatchlisting ? "animate-pulse" : ""}`} />
        </button>
      </div>

      {/* Chart section */}
      {isChartLoading ? (
        <div className="px-4 h-52 flex items-center justify-center">
          <p className="text-xs text-muted-foreground animate-pulse">Loading chart...</p>
        </div>
      ) : chartData.length === 0 ? (
        <div className="mx-4 h-52 flex flex-col items-center justify-center rounded-2xl border border-dashed border-border gap-2">
          <BarChart3 className="w-8 h-8 text-muted-foreground/40" />
          <p className="text-sm font-semibold text-muted-foreground">No chart data available</p>
          <p className="text-xs text-muted-foreground/60">Price history has not been recorded yet</p>
        </div>
      ) : (
        <StockChart data={chartData} asset={asset} chartStats={chartStats} />
      )}

      {/* Key Stats */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="px-4 mt-6"
      >
        <h3 className="text-base font-display font-bold mb-3">Key Stats</h3>
        <div className="space-y-3">
          <StatRow
            items={[
              { label: "Open", value: chartData.length ? `RWF ${chartStats.open}` : "—" },
              { label: "High", value: chartData.length ? `RWF ${chartStats.todayHigh}` : "—" },
              { label: "Low", value: chartData.length ? `RWF ${chartStats.todayLow}` : "—" },
            ]}
          />
          <StatRow
            items={[
              { label: "Prev Close", value: chartData.length ? `RWF ${chartStats.open}` : "—" },
              { label: "52W High", value: chartData.length ? `RWF ${chartStats.high52Week}` : "—" },
              { label: "52W Low", value: chartData.length ? `RWF ${chartStats.low52Week}` : "—" },
            ]}
          />
          <StatRow
            items={[
              { label: "Price", value: `RWF ${formatCurrency(asset.price)}` },
              { label: "Mkt Cap", value: asset.quantity.toLocaleString() },
              { label: "User Share", value: asset.user_share.toString() },
            ]}
          />
          <StatRow
            items={[
              { label: "Min Sell", value: `RWF ${formatCurrency(asset.min_sell_price)}` },
              { label: "Max Buy", value: `RWF ${formatCurrency(asset.max_buy_price)}` },
              { label: "Interest", value: `${asset.interest_rate}%` },
            ]}
          />
        </div>
      </motion.div>

      {/* Company Profile */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="px-4 mt-8"
      >
        <h3 className="text-base font-display font-bold mb-3">Company Profile</h3>
        <p className="text-sm text-muted-foreground mb-1">{asset.stock_name}</p>
        <p className="text-sm mb-4">{asset.description}</p>

        <div className="space-y-0">
          <InfoRow label="Stock Code" value={asset.stock_code} />
          <InfoRow label="Category" value={asset.category} />
          <InfoRow label="Payback Date" value={asset.payback_date !== "0000-00-00" ? asset.payback_date : "N/A"} />
          <InfoRow label="Current Price" value={`RWF ${formatCurrency(asset.current_price)}`} />
          <InfoRow label="Headquarters" value="Nyarugenge - Kigali - Rwanda" />
        </div>
      </motion.div>

      {/* Buy/Sell Panel */}
      <BuySellPanel
        asset={asset}
        disabled={isTransacting}
        onBuy={(price, qty) => handleTransaction("buy", price, qty)}
        onSell={(price, qty) => handleTransaction("sell", price, qty)}
        onCancel={handleCancel}
      />
    </div>
  );
};

const StatRow = ({ items }: { items: { label: string; value: string }[] }) => (
  <div className="flex justify-between">
    {items.map((item) => (
      <div key={item.label} className="flex-1">
        <p className="text-xs text-muted-foreground">{item.label}</p>
        <p className="text-xs font-semibold">{item.value}</p>
      </div>
    ))}
  </div>
);

const InfoRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex justify-between items-center py-2.5 border-b border-border">
    <span className="text-xs text-muted-foreground">{label}</span>
    <span className="text-xs font-semibold text-right">{value}</span>
  </div>
);

export default StockDetailPage;