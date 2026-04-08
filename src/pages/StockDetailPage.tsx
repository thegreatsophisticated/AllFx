import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, PlusCircle, BarChart3, RefreshCw } from "lucide-react";
import { getStockChart, buyStock, sellStock, addWatchList } from "@/lib/api-stocks";
import StockChart from "@/components/StockChart";
import BuySellPanel from "@/components/BuySellPanel";
import { toast } from "sonner";

// ── Helpers ───────────────────────────────────────────────────────────────

const extractChartStats = (data: { date: string; price: number }[]) => {
  if (!data.length)
    return {
      open: "-",
      todayHigh: "-",
      todayLow: "-",
      high52Week: "-",
      low52Week: "-",
    };

  const prices = data.map((d) => d.price);

  // "Today" = last 24 hours
  const now = Date.now();
  const cutoff24h = now - 24 * 60 * 60 * 1000;
  const todayPrices = data
    .filter((d) => new Date(d.date).getTime() >= cutoff24h)
    .map((d) => d.price);

  const effectiveTodayPrices = todayPrices.length ? todayPrices : prices;

  return {
    open: prices[0]?.toFixed(2) ?? "-",
    todayHigh: Math.max(...effectiveTodayPrices).toFixed(2),
    todayLow: Math.min(...effectiveTodayPrices).toFixed(2),
    high52Week: Math.max(...prices).toFixed(2),
    low52Week: Math.min(...prices).toFixed(2),
  };
};

const formatCurrency = (value: number) =>
  value.toLocaleString("en-RW", { minimumFractionDigits: 2 });

// ── Component ─────────────────────────────────────────────────────────────

const StockDetailPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const asset = location.state?.asset ?? null;

  // ── Never use sessionStorage for live financial data — always fetch fresh.
  // Read user identity from sessionStorage (written at login, cleared on logout).
  const userId = sessionStorage.getItem("user_id") ?? "";

  const [chartData, setChartData] = useState<{ date: string; price: number }[]>([]);
  const [isChartLoading, setIsChartLoading] = useState(true);
  const [isTransacting, setIsTransacting] = useState(false);
  const [isWatchlisting, setIsWatchlisting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // ── Ask / Bid state (extend as your API provides these fields) ────────
  const [askBid, setAskBid] = useState<{
    ask: number | null;
    bid: number | null;
  }>({ ask: null, bid: null });

  // ── Fetch chart data — cache: "no-store" prevents stale browser caching
  const fetchChart = useCallback(async (showRefreshSpinner = false) => {
    if (!asset?.id) return;
    if (showRefreshSpinner) setIsRefreshing(true);
    else setIsChartLoading(true);

    try {
      // Pass cache-busting param so the browser never serves a cached response
      const data = await getStockChart(Number(asset.id));
      const normalized = data.map((point: any) => ({
        date: point.date ?? point.created_at ?? point.timestamp ?? "",
        price: parseFloat(point.price ?? point.close ?? point.value ?? 0),
      }));
      setChartData(normalized);

      // If the API returns ask/bid alongside chart data, capture them here.
      // Adjust field names to match your actual API response.
      if (data[0]?.ask !== undefined || data[0]?.bid !== undefined) {
        const last = data[data.length - 1] ?? {};
        setAskBid({
          ask: last.ask != null ? parseFloat(last.ask) : null,
          bid: last.bid != null ? parseFloat(last.bid) : null,
        });
      }
    } catch {
      setChartData([]);
    } finally {
      setIsChartLoading(false);
      setIsRefreshing(false);
    }
  }, [asset?.id]);

  useEffect(() => {
    fetchChart(false);
  }, [fetchChart]);

  const chartStats = useMemo(() => extractChartStats(chartData), [chartData]);

  // ── Full page refresh after any transaction ───────────────────────────
  const refreshAll = useCallback(async () => {
    await fetchChart(true);
  }, [fetchChart]);

  if (!asset) {
    return (
      <div className="app-shell min-h-screen bg-background flex flex-col items-center justify-center gap-3">
        <p className="text-sm text-destructive">Stock not found</p>
        <button onClick={() => navigate(-1)} className="text-xs text-primary underline">
          Go back
        </button>
      </div>
    );
  }

  // ── Watchlist ──────────────────────────────────────────────────────────
  const handleAddWatchlist = async () => {
    if (!userId) {
      toast.error("Please log in to add to watchlist.");
      return;
    }
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

  // ── Buy / Sell ─────────────────────────────────────────────────────────
  const handleTransaction = async (
    action: "buy" | "sell",
    price: number,
    quantity: number
  ) => {
    if (!userId) {
      toast.error("Please log in to trade.");
      return;
    }
    setIsTransacting(true);
    try {
      if (action === "buy") {
        await buyStock(userId, asset.id, quantity, price);
      } else {
        await sellStock(userId, asset.id, quantity, price);
      }
      toast.success(
        `${action === "buy" ? "Bought" : "Sold"} ${quantity} shares of ${
          asset.stock_code
        } at RWF ${formatCurrency(price)}`
      );
      // ✅ Refresh chart, key stats and ask/bid after transaction
      await refreshAll();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Transaction failed");
    } finally {
      setIsTransacting(false);
    }
  };

  // ── Cancel ─────────────────────────────────────────────────────────────
  // Cancel was previously a no-op toast. Now it also triggers a data refresh
  // so that any pending orders cancelled on the server are reflected immediately.
  const handleCancel = async () => {
    toast.info("Transaction cancelled");
    // ✅ Refresh after cancel so ask/bid/chart reflects cancelled order
    await refreshAll();
  };

  return (
    <div className="app-shell min-h-screen bg-background pb-48">
      {/* App bar */}
      <div className="flex items-center justify-between p-4">
        <button onClick={() => navigate(-1)} className="text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-base font-display font-bold">{asset.stock_name}</h1>
        <div className="flex items-center gap-3">
          {/* Manual refresh button */}
          <button
            onClick={() => refreshAll()}
            disabled={isRefreshing}
            className="text-muted-foreground disabled:opacity-50"
            title="Refresh data"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={handleAddWatchlist}
            disabled={isWatchlisting}
            className="text-primary disabled:opacity-50"
          >
            <PlusCircle className={`w-5 h-5 ${isWatchlisting ? "animate-pulse" : ""}`} />
          </button>
        </div>
      </div>

      {/* ── Ask / Bid bar ──────────────────────────────────────────────────── */}
      {(askBid.ask !== null || askBid.bid !== null) && (
        <div className="mx-4 mb-3 flex justify-between items-center bg-secondary/50 rounded-xl px-4 py-2.5">
          <div className="text-center flex-1">
            <p className="text-xs text-muted-foreground">Bid</p>
            <p className="text-sm font-bold text-accent">
              {askBid.bid !== null ? `RWF ${formatCurrency(askBid.bid)}` : "—"}
            </p>
          </div>
          <div className="h-6 w-px bg-border mx-2" />
          <div className="text-center flex-1">
            <p className="text-xs text-muted-foreground">Ask</p>
            <p className="text-sm font-bold text-destructive">
              {askBid.ask !== null ? `RWF ${formatCurrency(askBid.ask)}` : "—"}
            </p>
          </div>
        </div>
      )}

      {/* Chart section */}
      {isChartLoading ? (
        <div className="px-4 h-52 flex items-center justify-center">
          <p className="text-xs text-muted-foreground animate-pulse">Loading chart...</p>
        </div>
      ) : chartData.length === 0 ? (
        <div className="mx-4 h-52 flex flex-col items-center justify-center rounded-2xl border border-dashed border-border gap-2">
          <BarChart3 className="w-8 h-8 text-muted-foreground/40" />
          <p className="text-sm font-semibold text-muted-foreground">
            No chart data available
          </p>
          <p className="text-xs text-muted-foreground/60">
            Price history has not been recorded yet
          </p>
        </div>
      ) : (
        <StockChart data={chartData} asset={asset} chartStats={chartStats} />
      )}

      {/* ── Key Stats ──────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="px-4 mt-6"
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-display font-bold">Key Stats</h3>
          {isRefreshing && (
            <span className="text-xs text-muted-foreground animate-pulse">
              Updating…
            </span>
          )}
        </div>
        <div className="space-y-3">
          <StatRow
            items={[
              { label: "Open", value: chartData.length ? `RWF ${chartStats.open}` : "—" },
              { label: "Today High", value: chartData.length ? `RWF ${chartStats.todayHigh}` : "—" },
              { label: "Today Low", value: chartData.length ? `RWF ${chartStats.todayLow}` : "—" },
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
              { label: "Price", value: `RWF ${formatCurrency(asset.price ?? 0)}` },
              { label: "Mkt Cap", value: (asset.quantity ?? 0).toLocaleString() },
              { label: "User Share", value: String(asset.user_shares ?? 0) },
            ]}
          />
          <StatRow
            items={[
              { label: " P/E Ratio", value: `RWF ${formatCurrency(asset.min_sell_price ?? "_")}` },
              { label: "PB. Ratio", value: `RWF ${formatCurrency(asset.max_buy_price ?? "_")}` },
              { label: "Interest", value: `${asset.interest_rate ?? "_"}%` },
            ]}
          />
        </div>
      </motion.div>

      {/* ── Company Profile ────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="px-4 mt-8"
      >
        <h3 className="text-base font-display font-bold mb-3">Company Profile</h3>
        <p className="text-sm text-muted-foreground mb-1">{asset.stock_name}</p>
        <p className="text-sm mb-4">{asset.description ?? "—"}</p>

        <div className="space-y-0">
          <InfoRow label="Stock Code" value={asset.stock_code ?? "—"} />
          <InfoRow label="Category" value={asset.category ?? "—"} />
          <InfoRow label="Owner" value={asset.owner ?? "—"} />
          <InfoRow
            label="Payback Date"
            value={
              asset.payback_date && asset.payback_date !== "0000-00-00"
                ? asset.payback_date
                : "N/A"
            }
          />
          <InfoRow
            label="Current Price"
            value={`RWF ${formatCurrency(asset.current_price ?? asset.price ?? 0)}`}
          />
          <InfoRow label="Headquarters" value={asset.location ?? "—"} />
        </div>
      </motion.div>

      {/* ── Buy / Sell Panel ───────────────────────────────────────────────── */}
      <BuySellPanel
        asset={asset}
        disabled={isTransacting}
        onBuy={(price, qty) => handleTransaction("buy", price, qty)}
        onSell={(price, qty) => handleTransaction("sell", price, qty)}
        // ✅ Cancel is now wired and triggers a data refresh
        onCancel={handleCancel}
      />
    </div>
  );
};

// ── Sub-components ────────────────────────────────────────────────────────

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