import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  PlusCircle,
  BarChart3,
  RefreshCw,
  XCircle,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import {
  getStockChart,
  buyStock,
  sellStock,
  addWatchList,
} from "@/lib/api-stocks";
import StockChart from "@/components/StockChart";
import BuySellPanel from "@/components/BuySellPanel";
import { toast } from "sonner";

// ─────────────────────────────────────────────────────────────────────────────
// Cancel Stock API
// ─────────────────────────────────────────────────────────────────────────────

const cancelStock = async (userId: string, stockId: string): Promise<string> => {
  const response = await fetch(
    "https://irebegrp.com/irebe/index.php/cancelStock",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, stock_id: stockId }),
    }
  );

  if (!response.ok) {
    throw new Error(`Server error: ${response.status}`);
  }

  const data = await response.json();
  return data.message ?? "Transaction cancelled.";
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const extractChartStats = (data: { date: string; price: number }[]) => {
  if (!data.length)
    return { open: "-", todayHigh: "-", todayLow: "-", high52Week: "-", low52Week: "-" };

  const prices = data.map((d) => d.price);
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

const getPriceChange = (data: { price: number }[]) => {
  if (data.length < 2) return { change: 0, pct: 0, isPositive: true };
  const first = data[0].price;
  const last = data[data.length - 1].price;
  const change = last - first;
  const pct = (change / first) * 100;
  return { change, pct, isPositive: change >= 0 };
};

// ─────────────────────────────────────────────────────────────────────────────
// Cancel Confirmation Modal
// ─────────────────────────────────────────────────────────────────────────────

interface CancelModalProps {
  stockName: string;
  isOpen: boolean;
  isCancelling: boolean;
  onConfirm: () => void;
  onDismiss: () => void;
}

const CancelModal = ({
  stockName,
  isOpen,
  isCancelling,
  onConfirm,
  onDismiss,
}: CancelModalProps) => (
  <AnimatePresence>
    {isOpen && (
      <>
        {/* Backdrop */}
        <motion.div
          key="backdrop"
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onDismiss}
        />

        {/* Sheet */}
        <motion.div
          key="sheet"
          className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl bg-background border-t border-border p-6 pb-10 shadow-2xl"
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 30, stiffness: 300 }}
        >
          {/* Handle */}
          <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-muted-foreground/30" />

          {/* Icon */}
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-destructive/10 p-4">
              <XCircle className="w-8 h-8 text-destructive" />
            </div>
          </div>

          <h2 className="text-center text-lg font-display font-bold mb-1">
            Cancel Transaction
          </h2>
          <p className="text-center text-sm text-muted-foreground mb-6">
            Are you sure you want to cancel your pending order for{" "}
            <span className="font-semibold text-foreground">{stockName}</span>?
            This action cannot be undone.
          </p>

          <div className="flex flex-col gap-3">
            <button
              onClick={onConfirm}
              disabled={isCancelling}
              className="w-full rounded-2xl bg-destructive py-3.5 text-sm font-semibold text-white disabled:opacity-60 transition-opacity active:scale-[0.98]"
            >
              {isCancelling ? (
                <span className="flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Cancelling…
                </span>
              ) : (
                "Yes, Cancel Order"
              )}
            </button>
            <button
              onClick={onDismiss}
              disabled={isCancelling}
              className="w-full rounded-2xl bg-secondary py-3.5 text-sm font-semibold text-foreground disabled:opacity-60 transition-opacity"
            >
              Keep Order
            </button>
          </div>
        </motion.div>
      </>
    )}
  </AnimatePresence>
);

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

const StockDetailPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const asset = location.state?.asset ?? null;
  const userId = sessionStorage.getItem("user_id") ?? "";

  const [chartData, setChartData] = useState<{ date: string; price: number }[]>([]);
  const [isChartLoading, setIsChartLoading] = useState(true);
  const [isTransacting, setIsTransacting] = useState(false);
  const [isWatchlisting, setIsWatchlisting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Cancel state
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  const [askBid, setAskBid] = useState<{ ask: number | null; bid: number | null }>({
    ask: null,
    bid: null,
  });

  // ── Fetch chart ─────────────────────────────────────────────────────────
  const fetchChart = useCallback(
    async (showRefreshSpinner = false) => {
      if (!asset?.id) return;
      if (showRefreshSpinner) setIsRefreshing(true);
      else setIsChartLoading(true);

      try {
        const data = await getStockChart(Number(asset.id));
        const normalized = data.map((point: any) => ({
          date: point.date ?? point.created_at ?? point.timestamp ?? "",
          price: parseFloat(point.price ?? point.close ?? point.value ?? 0),
        }));
        setChartData(normalized);

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
    },
    [asset?.id]
  );

  useEffect(() => {
    fetchChart(false);
  }, [fetchChart]);

  const chartStats = useMemo(() => extractChartStats(chartData), [chartData]);
  const priceChange = useMemo(() => getPriceChange(chartData), [chartData]);

  const refreshAll = useCallback(async () => {
    await fetchChart(true);
  }, [fetchChart]);

  // ── Guard ───────────────────────────────────────────────────────────────
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

  // ── Watchlist ───────────────────────────────────────────────────────────
  const handleAddWatchlist = async () => {
    if (!userId) { toast.error("Please log in to add to watchlist."); return; }
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

  // ── Buy / Sell ──────────────────────────────────────────────────────────
  const handleTransaction = async (
    action: "buy" | "sell",
    price: number,
    quantity: number
  ) => {
    if (!userId) { toast.error("Please log in to trade."); return; }
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
      await refreshAll();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Transaction failed");
    } finally {
      setIsTransacting(false);
    }
  };

  // ── Cancel ──────────────────────────────────────────────────────────────
  // Opens confirmation modal; actual cancellation fires on confirm.
  const handleCancelRequest = () => {
    if (!userId) { toast.error("Please log in to cancel orders."); return; }
    setShowCancelModal(true);
  };

  const handleCancelConfirm = async () => {
    setIsCancelling(true);
    try {
      const message = await cancelStock(userId, String(asset.id));
      toast.success(message);
      setShowCancelModal(false);
      // Refresh chart & stats so cancelled order is immediately reflected
      await refreshAll();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to cancel order");
    } finally {
      setIsCancelling(false);
    }
  };

  const handleCancelDismiss = () => {
    if (!isCancelling) setShowCancelModal(false);
  };

  // ── Render ──────────────────────────────────────────────────────────────
  const currentPrice = asset.current_price ?? asset.price ?? 0;

  return (
    <>
      <div className="app-shell min-h-screen bg-background pb-48">
        {/* ── App bar ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center justify-center w-9 h-9 rounded-xl bg-secondary text-foreground active:scale-95 transition-transform"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div className="text-center">
            <h1 className="text-sm font-display font-bold leading-tight">
              {asset.stock_name}
            </h1>
            <span className="text-xs text-muted-foreground">{asset.stock_code}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => refreshAll()}
              disabled={isRefreshing}
              className="flex items-center justify-center w-9 h-9 rounded-xl bg-secondary text-muted-foreground disabled:opacity-50 active:scale-95 transition-transform"
              title="Refresh data"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={handleAddWatchlist}
              disabled={isWatchlisting}
              className="flex items-center justify-center w-9 h-9 rounded-xl bg-secondary text-primary disabled:opacity-50 active:scale-95 transition-transform"
            >
              <PlusCircle className={`w-4 h-4 ${isWatchlisting ? "animate-pulse" : ""}`} />
            </button>
          </div>
        </div>

        {/* ── Price Hero ──────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="px-4 pt-2 pb-4"
        >
          <p className="text-3xl font-display font-bold tracking-tight">
            RWF {formatCurrency(currentPrice)}
          </p>
          {chartData.length >= 2 && (
            <div
              className={`flex items-center gap-1.5 mt-1 text-sm font-semibold ${
                priceChange.isPositive ? "text-emerald-500" : "text-destructive"
              }`}
            >
              {priceChange.isPositive ? (
                <TrendingUp className="w-4 h-4" />
              ) : (
                <TrendingDown className="w-4 h-4" />
              )}
              <span>
                {priceChange.isPositive ? "+" : ""}
                {formatCurrency(priceChange.change)} (
                {priceChange.pct.toFixed(2)}%)
              </span>
            </div>
          )}
        </motion.div>

        {/* ── Ask / Bid bar ────────────────────────────────────────────────── */}
        {(askBid.ask !== null || askBid.bid !== null) && (
          <div className="mx-4 mb-3 flex justify-between items-center bg-secondary/50 rounded-2xl px-4 py-3 border border-border">
            <div className="text-center flex-1">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Bid</p>
              <p className="text-sm font-bold text-emerald-500">
                {askBid.bid !== null ? `RWF ${formatCurrency(askBid.bid)}` : "—"}
              </p>
            </div>
            <div className="h-8 w-px bg-border mx-2" />
            <div className="text-center flex-1">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Ask</p>
              <p className="text-sm font-bold text-destructive">
                {askBid.ask !== null ? `RWF ${formatCurrency(askBid.ask)}` : "—"}
              </p>
            </div>
          </div>
        )}

        {/* ── Cancel Order Banner ──────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.05 }}
          className="mx-4 mb-4"
        >
          <button
            onClick={handleCancelRequest}
            disabled={isCancelling}
            className="w-full flex items-center justify-center gap-2 rounded-2xl border border-destructive/40 bg-destructive/5 py-3 text-sm font-semibold text-destructive hover:bg-destructive/10 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            <XCircle className="w-4 h-4" />
            Cancel Pending Order
          </button>
        </motion.div>

        {/* ── Chart ───────────────────────────────────────────────────────── */}
        {isChartLoading ? (
          <div className="px-4 h-52 flex items-center justify-center">
            <p className="text-xs text-muted-foreground animate-pulse">Loading chart…</p>
          </div>
        ) : chartData.length === 0 ? (
          <div className="mx-4 h-52 flex flex-col items-center justify-center rounded-2xl border border-dashed border-border gap-2">
            <BarChart3 className="w-8 h-8 text-muted-foreground/40" />
            <p className="text-sm font-semibold text-muted-foreground">No chart data</p>
            <p className="text-xs text-muted-foreground/60">
              Price history has not been recorded yet
            </p>
          </div>
        ) : (
          <StockChart data={chartData} asset={asset} chartStats={chartStats} />
        )}

        {/* ── Key Stats ───────────────────────────────────────────────────── */}
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
          <div className="rounded-2xl border border-border overflow-hidden">
            <StatRow
              items={[
                { label: "Open", value: chartData.length ? `RWF ${chartStats.open}` : "—" },
                { label: "Today High", value: chartData.length ? `RWF ${chartStats.todayHigh}` : "—" },
                { label: "Today Low", value: chartData.length ? `RWF ${chartStats.todayLow}` : "—" },
              ]}
              hasBorder
            />
            <StatRow
              items={[
                { label: "Prev Close", value: chartData.length ? `RWF ${chartStats.open}` : "—" },
                { label: "52W High", value: chartData.length ? `RWF ${chartStats.high52Week}` : "—" },
                { label: "52W Low", value: chartData.length ? `RWF ${chartStats.low52Week}` : "—" },
              ]}
              hasBorder
            />
            <StatRow
              items={[
                { label: "Price", value: `RWF ${formatCurrency(asset.price ?? 0)}` },
                { label: "Mkt Cap", value: (asset.quantity ?? 0).toLocaleString() },
                { label: "User Share", value: String(asset.user_shares ?? 0) },
              ]}
              hasBorder
            />
            <StatRow
              items={[
                { label: "Min Sell", value: asset.min_sell_price ? `RWF ${formatCurrency(asset.min_sell_price)}` : "—" },
                { label: "Max Buy", value: asset.max_buy_price ? `RWF ${formatCurrency(asset.max_buy_price)}` : "—" },
                { label: "Interest", value: `${asset.interest_rate ?? "—"}%` },
              ]}
            />
          </div>
        </motion.div>

        {/* ── Company Profile ──────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="px-4 mt-8"
        >
          <h3 className="text-base font-display font-bold mb-3">Company Profile</h3>
          {asset.description && (
            <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
              {asset.description}
            </p>
          )}
          <div className="rounded-2xl border border-border overflow-hidden">
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
            <InfoRow label="Headquarters" value={asset.location ?? "—"} isLast />
          </div>
        </motion.div>

        {/* ── Buy / Sell Panel ─────────────────────────────────────────────── */}
        <BuySellPanel
          asset={asset}
          disabled={isTransacting}
          onBuy={(price, qty) => handleTransaction("buy", price, qty)}
          onSell={(price, qty) => handleTransaction("sell", price, qty)}
          onCancel={handleCancelRequest}
        />
      </div>

      {/* ── Cancel Confirmation Modal ─────────────────────────────────────── */}
      <CancelModal
        stockName={asset.stock_name}
        isOpen={showCancelModal}
        isCancelling={isCancelling}
        onConfirm={handleCancelConfirm}
        onDismiss={handleCancelDismiss}
      />
    </>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

const StatRow = ({
  items,
  hasBorder = false,
}: {
  items: { label: string; value: string }[];
  hasBorder?: boolean;
}) => (
  <div
    className={`flex justify-between px-4 py-3 bg-secondary/20 ${
      hasBorder ? "border-b border-border" : ""
    }`}
  >
    {items.map((item, i) => (
      <div key={item.label} className={`flex-1 ${i > 0 ? "text-right" : ""}`}>
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">
          {item.label}
        </p>
        <p className="text-xs font-semibold">{item.value}</p>
      </div>
    ))}
  </div>
);

const InfoRow = ({
  label,
  value,
  isLast = false,
}: {
  label: string;
  value: string;
  isLast?: boolean;
}) => (
  <div
    className={`flex justify-between items-center px-4 py-3 ${
      !isLast ? "border-b border-border" : ""
    }`}
  >
    <span className="text-xs text-muted-foreground">{label}</span>
    <span className="text-xs font-semibold text-right max-w-[60%] truncate">{value}</span>
  </div>
);

export default StockDetailPage;