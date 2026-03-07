import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  XCircle,
  ChevronDown,
  Loader2,
  Wallet,
  ImageIcon,
  X,
  ZoomIn,
  RefreshCw,
  ArrowDown,
} from "lucide-react";
import { toast } from "sonner";
import {
  getUsers,
  getCurrencies,
  getAccountRequests,
  getUserData,
  accountTransact,
  transactionApprove,
} from "@/lib/api-mobile-money";

const PROOF_BASE_URL = "https://irebegrp.com/images/";

// ─── Local wrappers ───────────────────────────────────────────────────────────

const fetchUsers = async () => {
  try { return await getUsers(); } catch { return []; }
};

const fetchCurrencies = async () => {
  try { return await getCurrencies(); } catch { return [{ id: "0", stock_name: "RWANDAN FRANCS", category: "currencies" }]; }
};

const fetchTransactions = async (userId: string) => {
  try { return await getAccountRequests(userId); } catch { return []; }
};

const fetchUserById = async (id: string) => {
  try { return await getUserData(id); } catch { return null; }
};

type Direction = "in" | "out";
type Provider  = "mtn" | "airtel" | "bk";

// ─── Proof Image Lightbox ─────────────────────────────────────────────────────

function ProofLightbox({ url, onClose }: { url: string; onClose: () => void }) {
  const [imgError, setImgError] = useState(false);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.88, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.88, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="relative max-w-sm w-full"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onClose}
            className="absolute -top-3 -right-3 z-10 w-8 h-8 rounded-full bg-card border border-border flex items-center justify-center shadow-lg text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="rounded-2xl overflow-hidden border border-border shadow-2xl bg-card">
            {/* Header with open-in-new-tab fallback */}
            <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-primary" />
                <p className="text-xs font-semibold text-muted-foreground">Payment Proof</p>
              </div>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] font-semibold text-primary underline underline-offset-2"
                onClick={(e) => e.stopPropagation()}
              >
                Open ↗
              </a>
            </div>

            {imgError ? (
              <div className="flex flex-col items-center gap-3 py-10 px-4 text-center">
                <ImageIcon className="w-8 h-8 text-muted-foreground/40" />
                <p className="text-xs text-muted-foreground">Image could not be displayed.</p>
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold"
                  onClick={(e) => e.stopPropagation()}
                >
                  Open in browser ↗
                </a>
              </div>
            ) : (
              <img
                src={url}
                alt="Payment proof"
                className="w-full max-h-[70vh] object-contain bg-secondary"
                onError={() => setImgError(true)}
              />
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Proof Thumbnail ──────────────────────────────────────────────────────────

function ProofThumbnail({ proof }: { proof: string }) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [imgLoaded, setImgLoaded]       = useState(false);
  const [imgError, setImgError]         = useState(false);
  // Try https first; if server only serves http the lightbox has a direct-link fallback
  const url = `${PROOF_BASE_URL}${proof}`;

  return (
    <>
      {lightboxOpen && <ProofLightbox url={url} onClose={() => setLightboxOpen(false)} />}

      <button
        onClick={() => setLightboxOpen(true)}
        className="group relative flex-shrink-0 flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-primary/30 bg-primary/5 hover:bg-primary/10 hover:border-primary/60 transition-colors overflow-hidden"
        title={`View proof: ${proof}`}
      >
        {/* Thumbnail preview — small square */}
        <div className="w-6 h-6 rounded-md overflow-hidden bg-secondary flex items-center justify-center flex-shrink-0">
          <img
            src={url}
            alt="proof"
            className={`w-full h-full object-cover transition-opacity ${imgLoaded && !imgError ? "opacity-100" : "opacity-0 absolute"}`}
            onLoad={() => setImgLoaded(true)}
            onError={() => setImgError(true)}
          />
          {(!imgLoaded || imgError) && (
            <ImageIcon className={`w-3.5 h-3.5 ${imgError ? "text-destructive/50" : "text-primary/50"}`} />
          )}
        </div>
        <span className="text-[11px] font-semibold text-primary flex items-center gap-1">
          Proof
          <ZoomIn className="w-3 h-3 opacity-50 group-hover:opacity-100 transition-opacity" />
        </span>
      </button>
    </>
  );
}

// ─── Provider Toggle Group ────────────────────────────────────────────────────

const PROVIDERS: { id: Provider; label: string; color: string; bg: string; abbr: string; logoUrl: string }[] = [
  {
    id: "mtn",
    label: "MTN",
    abbr: "MT",
    color: "text-yellow-600",
    bg: "bg-yellow-400",
    logoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/98/MTN_Logo.svg/120px-MTN_Logo.svg.png",
  },
  {
    id: "airtel",
    label: "Airtel",
    abbr: "AI",
    color: "text-red-600",
    bg: "bg-red-500",
    logoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/69/Airtel_logo.svg/120px-Airtel_logo.svg.png",
  },
  {
    id: "bk",
    label: "BK",
    abbr: "BK",
    color: "text-blue-600",
    bg: "bg-blue-600",
    logoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/02/Bank_of_Kigali_logo.svg/120px-Bank_of_Kigali_logo.svg.png",
  },
];

function ProviderToggleGroup({
  selected,
  onChange,
}: {
  selected: Provider | null;
  onChange: (p: Provider) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {PROVIDERS.map((p) => {
        const isSelected = selected === p.id;
        return (
          <motion.button
            key={p.id}
            whileTap={{ scale: 0.96 }}
            onClick={() => onChange(p.id)}
            className={`flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl border-2 transition-all ${
              isSelected ? "border-primary bg-primary/5" : "border-border bg-card"
            }`}
          >
            <div className={`w-9 h-9 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0 ${p.bg}`}>
              <img
                src={p.logoUrl}
                alt={p.label}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                  e.currentTarget.parentElement!.innerHTML =
                    `<span class="text-xs font-bold text-white">${p.abbr}</span>`;
                }}
              />
            </div>
            <span className={`text-xs font-semibold ${isSelected ? "text-primary" : "text-muted-foreground"}`}>
              {p.label}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MobileMoney() {
  const navigate = useNavigate();
  const userId   = localStorage.getItem("user_id") ?? "";

  const [direction, setDirection]       = useState<Direction>("in");
  const [currencies, setCurrencies]     = useState<any[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<string>("");
  const [account, setAccount]           = useState("");
  const [amount, setAmount]             = useState("");

  const [emailToIdMap, setEmailToIdMap] = useState<Record<string, number>>({});
  const [isEmailValid, setIsEmailValid] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [showConfirm, setShowConfirm]   = useState(false);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [txLoading, setTxLoading]       = useState(true);
  const [currenciesLoading, setCurrenciesLoading] = useState(true);
  const [refreshKey, setRefreshKey]     = useState(0);

  // ── Pull-to-refresh state ──────────────────────────────────────────────────
  const scrollRef         = useRef<HTMLDivElement>(null);
  const touchStartY       = useRef<number | null>(null); // null = not tracking
  const pullDistanceRef   = useRef(0);                   // mirror of state for onTouchEnd closure
  const isRefreshing      = useRef(false);               // ref so handlers always read latest value
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing]     = useState(false);
  const PULL_THRESHOLD = 72;

  const reloadTransactions = () => {
    setTxLoading(true);
    fetchTransactions(userId).then((txs) => {
      setTransactions(txs);
      setTxLoading(false);
    });
  };

  const triggerRefresh = useCallback(async () => {
    if (isRefreshing.current) return;
    isRefreshing.current = true;
    setRefreshing(true);
    setPullDistance(0);
    pullDistanceRef.current = 0;
    try {
      const [txs, curr] = await Promise.all([
        fetchTransactions(userId),
        fetchCurrencies(),
      ]);
      setTransactions(txs);
      setCurrencies(curr);
    } finally {
      setRefreshing(false);
      isRefreshing.current = false;
    }
  }, [userId]);

  const onTouchStart = (e: React.TouchEvent) => {
    // Only begin tracking when scrolled to very top
    const scrollTop = scrollRef.current?.scrollTop ?? 1;
    if (scrollTop <= 0) {
      touchStartY.current = e.touches[0].clientY;
    } else {
      touchStartY.current = null;
    }
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (touchStartY.current === null || isRefreshing.current) return;
    const delta = e.touches[0].clientY - touchStartY.current;
    if (delta > 0) {
      // Prevent native scroll while pulling
      if (scrollRef.current?.scrollTop === 0) e.preventDefault();
      const dist = Math.min(delta * 0.45, PULL_THRESHOLD + 24);
      pullDistanceRef.current = dist;
      setPullDistance(dist);
    } else {
      // Scrolling down — stop tracking
      touchStartY.current = null;
      pullDistanceRef.current = 0;
      setPullDistance(0);
    }
  };

  const onTouchEnd = () => {
    if (pullDistanceRef.current >= PULL_THRESHOLD) {
      triggerRefresh();
    } else {
      setPullDistance(0);
      pullDistanceRef.current = 0;
    }
    touchStartY.current = null;
  };

  // Attach touchmove as non-passive so e.preventDefault() works
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const handler = (e: TouchEvent) => {
      if (touchStartY.current === null || isRefreshing.current) return;
      const delta = e.touches[0].clientY - touchStartY.current;
      if (delta > 0 && el.scrollTop === 0) e.preventDefault();
    };
    el.addEventListener("touchmove", handler, { passive: false });
    return () => el.removeEventListener("touchmove", handler);
  }, []);

  useEffect(() => {
    fetchCurrencies().then((c) => { setCurrencies(c); setCurrenciesLoading(false); });
    fetchUsers().then((users) => {
      const map: Record<string, number> = {};
      users.forEach((u: any) => { map[u.email.toLowerCase()] = u.id; });
      setEmailToIdMap(map);
    });
    reloadTransactions();
  }, [refreshKey]);

  useEffect(() => {
    const input = account.trim().toLowerCase();
    if (emailToIdMap[input]) {
      setIsEmailValid(true);
      setSelectedUserId(emailToIdMap[input]);
    } else {
      setIsEmailValid(false);
      setSelectedUserId(null);
    }
  }, [account, emailToIdMap]);

  const validate = () => {
    if (!selectedProvider)  { toast.error("Please select a payment provider"); return false; }
    if (!selectedAsset)     { toast.error("Please select a currency"); return false; }
    if (!isEmailValid)      { toast.error("Invalid email / account"); return false; }
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      toast.error("Enter a valid amount"); return false;
    }
    return true;
  };

  const handleConfirm = () => { if (validate()) setShowConfirm(true); };
  const selectedCurrency = currencies.find((c) => c.id?.toString() === selectedAsset);

  if (showConfirm) {
    return (
      <ConfirmScreen
        userId={userId}
        currency={selectedCurrency}
        amount={amount}
        receiverId={selectedUserId!}
        receiverEmail={account}
        direction={direction}
        provider={selectedProvider!}
        onBack={() => setShowConfirm(false)}
        onDone={() => navigate("/dashboard")}
      />
    );
  }

  return (
    <div className="app-shell bg-background flex flex-col">

      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-6 pb-2 flex-shrink-0">
        <button
          onClick={() => navigate(-1)}
          className="w-8 h-8 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h2 className="text-lg font-display font-bold">Transfer Funds</h2>
      </div>

      {/* Scrollable body — pull-to-refresh wrapper */}
      <div className="flex-1 overflow-hidden relative">
        {/* Pull indicator */}
        <div
          className="absolute top-0 left-0 right-0 flex items-center justify-center z-10 pointer-events-none overflow-hidden transition-all duration-200"
          style={{ height: refreshing ? 52 : Math.max(0, pullDistance) }}
        >
          <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
            refreshing
              ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
              : pullDistance >= PULL_THRESHOLD
              ? "bg-primary/20 text-primary border border-primary/30"
              : "bg-secondary text-muted-foreground border border-border"
          }`}>
            {refreshing ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Refreshing...</>
            ) : pullDistance >= PULL_THRESHOLD ? (
              <><RefreshCw className="w-3.5 h-3.5" /> Release to refresh</>
            ) : (
              <><ArrowDown className="w-3.5 h-3.5 transition-transform" style={{ transform: `rotate(${Math.min((pullDistance / PULL_THRESHOLD) * 180, 180)}deg)` }} /> Pull to refresh</>
            )}
          </div>
        </div>

        <div
          ref={scrollRef}
          className="h-full overflow-y-auto px-4 pb-4 space-y-5"
          style={{ paddingTop: refreshing ? 60 : Math.max(8, pullDistance) }}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >

        <ProviderToggleGroup selected={selectedProvider} onChange={setSelectedProvider} />

        {/* Direction toggle */}
        <div className="grid grid-cols-2 gap-2 pt-2">
          {(["in", "out"] as Direction[]).map((d) => (
            <motion.button
              key={d}
              whileTap={{ scale: 0.97 }}
              onClick={() => setDirection(d)}
              className={`flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold border transition-colors ${
                direction === d
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-muted-foreground border-border"
              }`}
            >
              {d === "in" ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
              {d === "in" ? "Cash In" : "Cash Out"}
            </motion.button>
          ))}
        </div>

        {/* Form card */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-card border border-border rounded-xl overflow-hidden"
        >
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-secondary/40">
            <Wallet className="w-4 h-4 text-primary" />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Transfer Details
            </p>
          </div>

          <div className="p-4 space-y-4">
            {/* Currency */}
            <div>
              <p className="text-xs text-muted-foreground mb-1.5 font-medium">Select Currency</p>
              <div className="relative">
                <select
                  value={selectedAsset}
                  onChange={(e) => setSelectedAsset(e.target.value)}
                  className="w-full appearance-none px-3 py-2.5 rounded-xl bg-secondary border border-border text-sm focus:outline-none focus:border-primary transition-colors pr-9"
                  disabled={currenciesLoading}
                >
                  <option value="" disabled>
                    {currenciesLoading ? "Loading..." : "Choose a currency"}
                  </option>
                  {currencies.map((c, i) => (
                    <option key={`${c.id}-${i}`} value={c.id?.toString()}>
                      {c.stock_name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>

            {/* Email */}
            <div>
              <p className="text-xs text-muted-foreground mb-1.5 font-medium">
                Recipient (Email / Account no.)
              </p>
              <div className="relative">
                <input
                  value={account}
                  onChange={(e) => setAccount(e.target.value)}
                  placeholder="user@example.com"
                  className="w-full px-3 py-2.5 rounded-xl bg-secondary border border-border text-sm focus:outline-none focus:border-primary transition-colors pr-9"
                  type="email"
                />
                <AnimatePresence>
                  {account.length > 0 && (
                    <motion.span
                      key={isEmailValid ? "valid" : "invalid"}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                    >
                      {isEmailValid
                        ? <CheckCircle2 className="w-4 h-4 text-accent" />
                        : <XCircle className="w-4 h-4 text-destructive" />}
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
              <AnimatePresence>
                {account.length > 0 && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className={`text-[10px] mt-1 ${isEmailValid ? "text-accent" : "text-destructive"}`}
                  >
                    {isEmailValid ? "Account verified ✓" : "No matching account found"}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            {/* Amount */}
            <div>
              <p className="text-xs text-muted-foreground mb-1.5 font-medium">Amount (RWF)</p>
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                type="number"
                min="0"
                className="w-full px-3 py-2.5 rounded-xl bg-secondary border border-border text-sm focus:outline-none focus:border-primary transition-colors"
              />
            </div>
          </div>
        </motion.div>

        {/* Transactions list */}
        <div>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            AllFx
          </h2>

          {txLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-[68px] rounded-xl bg-card border border-border animate-pulse" />
              ))}
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center mt-10">
              <p className="text-sm text-muted-foreground">No transactions yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {transactions.map((tx, i) => (
                <TransactionRow
                  key={tx.transaction_id ?? i}
                  tx={tx}
                  index={i}
                  currentUserId={userId}
                  onRefresh={() => setRefreshKey((k) => k + 1)}
                />
              ))}
            </div>
          )}
        </div>
        </div>{/* end inner scroll div */}
      </div>{/* end ptr wrapper */}

      {/* Confirm button */}
      <div className="sticky bottom-0 px-4 py-3 bg-gradient-to-t from-background via-background to-background/0">
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={handleConfirm}
          disabled={!isEmailValid}
          className={`w-full h-14 rounded-xl text-sm font-semibold transition-colors shadow-lg ${
            isEmailValid
              ? "bg-primary text-primary-foreground shadow-primary/20"
              : "bg-card text-muted-foreground border border-border cursor-not-allowed"
          }`}
        >
          Confirm Transfer
        </motion.button>
      </div>
    </div>
  );
}

// ─── Password Dialog ──────────────────────────────────────────────────────────

function PasswordDialog({
  open,
  onConfirm,
  onCancel,
  isLoading,
}: {
  open: boolean;
  onConfirm: (password: string) => void;
  onCancel: () => void;
  isLoading: boolean;
}) {
  const [pw, setPw]     = useState("");
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (open) { setPw(""); setShow(false); }
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 backdrop-blur-sm px-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-sm bg-card border border-border rounded-2xl overflow-hidden shadow-xl"
      >
        <div className="px-5 pt-5 pb-2">
          <p className="text-base font-display font-bold mb-4">Enter Password</p>
          <div className="relative">
            <input
              autoFocus
              type={show ? "text" : "password"}
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && pw.trim() && onConfirm(pw.trim())}
              placeholder="Password"
              className="w-full px-3 py-2.5 rounded-xl bg-secondary border border-border text-sm focus:outline-none focus:border-primary transition-colors pr-10"
            />
            <button
              type="button"
              onClick={() => setShow((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {show ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                  <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                  <line x1="1" y1="1" x2="23" y2="23"/>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
              )}
            </button>
          </div>
        </div>
        <div className="flex gap-2 px-5 py-4">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 h-10 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => pw.trim() && onConfirm(pw.trim())}
            disabled={isLoading || !pw.trim()}
            className="flex-1 h-10 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            OK
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Transaction Row ──────────────────────────────────────────────────────────

function TransactionRow({
  tx,
  index,
  currentUserId,
  onRefresh,
}: {
  tx: any;
  index: number;
  currentUserId: string;
  onRefresh: () => void;
}) {
  const [refName, setRefName]           = useState<string | null>(null);
  const [dialogOpen, setDialogOpen]     = useState(false);
  const [pendingAction, setPendingAction] = useState<"approve" | "cancel" | null>(null);
  const [dialogLoading, setDialogLoading] = useState(false);

  useEffect(() => {
    const idToFetch =
      String(tx.reference_code) === String(currentUserId)
        ? tx.user_id
        : tx.reference_code;
    fetchUserById(String(idToFetch)).then((u) => {
      if (u) {
        const name = `${u.first_name ?? ""} ${u.last_name ?? ""}`.trim() || "Unnamed";
        setRefName(name);
      } else {
        setRefName("Unknown");
      }
    });
  }, [tx]);

  let isOut = false;
  const txUserId    = String(tx.user_id);
  const txDirection = String(tx.direction);
  if      (txDirection === "out" && txUserId === String(currentUserId)) isOut = true;
  else if (txDirection === "out" && txUserId !== String(currentUserId)) isOut = false;
  else if (txDirection === "in"  && txUserId === String(currentUserId)) isOut = false;
  else if (txDirection === "in"  && txUserId !== String(currentUserId)) isOut = true;

  const amountColorClass =
    tx.status === "" ? "text-muted-foreground"
    : isOut          ? "text-destructive"
    : "text-accent";

  const parsedAmount   = parseFloat(String(tx.amount).replace(/,/g, "")) || 0;
  const formattedAmount = parsedAmount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const displayAmount = `${isOut ? "-" : "+"}${formattedAmount} RWF`;

  const openDialog = (action: "approve" | "cancel") => {
    setPendingAction(action);
    setDialogOpen(true);
  };

  const handleDialogConfirm = async (password: string) => {
    if (!pendingAction) return;
    setDialogLoading(true);
    try {
      const data = await transactionApprove({
        user_id: currentUserId,
        password,
        transaction_id: String(tx.transaction_id),
        status: pendingAction,
      });
      if (data?.status === "success") {
        toast.success(data?.message ?? "Success");
        setDialogOpen(false);
        onRefresh();
      } else {
        toast.error(data?.message ?? "Failed");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setDialogLoading(false);
    }
  };

  const isOwner   = String(tx.user_id) === String(currentUserId);
  const status    = tx.status ?? "";
  const hasProof  = tx.proof && tx.proof.trim() !== "";

  const approveDate = tx.approve_date && tx.approve_date !== "0000-00-00 00:00:00"
    ? tx.approve_date?.slice(0, 10)
    : "";

  return (
    <>
      <PasswordDialog
        open={dialogOpen}
        onConfirm={handleDialogConfirm}
        onCancel={() => setDialogOpen(false)}
        isLoading={dialogLoading}
      />

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.04 }}
        className="p-3.5 rounded-xl bg-card border border-border"
      >
        {/* Top row: icon + name/date + amount */}
        <div className="flex items-start justify-between gap-3">
          {/* Left: direction icon + info */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
              isOut ? "bg-destructive/10" : "bg-accent/10"
            }`}>
              {isOut
                ? <ArrowUpRight className="w-4 h-4 text-destructive" />
                : <ArrowDownLeft className="w-4 h-4 text-accent" />}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold truncate">{refName ?? "..."}</p>
              <p className="text-xs text-muted-foreground">
                {tx.start_date?.slice(0, 10)}
              </p>
              {/* Stock code badge */}
              {tx.stock_code && (
                <span className="inline-block mt-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-primary/10 text-primary">
                  {tx.stock_code}
                </span>
              )}
            </div>
          </div>

          {/* Amount top-right */}
          <p className={`text-xs font-semibold flex-shrink-0 pt-0.5 ${amountColorClass}`}>
            {displayAmount}
          </p>
        </div>

        {/* Action buttons row — proof thumbnail lives here inline with actions */}
        <div className="mt-2.5 flex items-center justify-between gap-2">
          {/* Proof thumbnail on the left of the action row */}
          {hasProof ? (
            <ProofThumbnail proof={tx.proof} />
          ) : (
            <div />
          )}
          <div className="flex items-center gap-2">

          {status === "" && !isOwner && (
            <>
              <button
                onClick={() => openDialog("approve")}
                className="px-3 py-1.5 rounded-lg border border-accent/40 text-accent text-xs font-semibold hover:bg-accent/10 transition-colors"
              >
                Approve
              </button>
              <button
                onClick={() => openDialog("cancel")}
                className="px-3 py-1.5 rounded-lg border border-destructive/40 text-destructive text-xs font-semibold hover:bg-destructive/10 transition-colors"
              >
                Cancel
              </button>
            </>
          )}

          {status === "" && isOwner && (
            <>
              <button
                onClick={() => openDialog("approve")}
                className="px-3 py-1.5 rounded-lg border border-accent/40 text-accent text-xs font-semibold hover:bg-accent/10 transition-colors flex items-center gap-1"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
                Approve
              </button>
              <button
                onClick={() => openDialog("cancel")}
                className="px-3 py-1.5 rounded-lg border border-destructive/40 text-destructive text-xs font-semibold hover:bg-destructive/10 transition-colors"
              >
                Cancel
              </button>
            </>
          )}

          {status === "approve" && (
            <span className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-accent/30 bg-accent/5 text-accent text-xs font-medium">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
              Approved{approveDate ? ` · ${approveDate}` : ""}
            </span>
          )}

          {status === "cancel" && (
            <span className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-destructive/30 bg-destructive/5 text-destructive text-xs font-medium">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
              </svg>
              Cancelled{approveDate ? ` · ${approveDate}` : ""}
            </span>
          )}
          </div>{/* end inner flex */}
        </div>{/* end action row */}
      </motion.div>
    </>
  );
}

// ─── Confirm Screen ───────────────────────────────────────────────────────────

function ConfirmScreen({
  userId,
  currency,
  amount,
  receiverId,
  receiverEmail,
  direction,
  provider,
  onBack,
  onDone,
}: {
  userId: string;
  currency: any;
  amount: string;
  receiverId: number;
  receiverEmail: string;
  direction: Direction;
  provider: Provider;
  onBack: () => void;
  onDone: () => void;
}) {
  const [password, setPassword]         = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [isLoading, setIsLoading]       = useState(false);
  const [senderInfo, setSenderInfo]     = useState<any>(null);
  const [receiverInfo, setReceiverInfo] = useState<any>(null);

  useEffect(() => {
    fetchUserById(userId).then((u) => setSenderInfo(u));
    fetchUserById(String(receiverId)).then((u) => setReceiverInfo(u));
  }, [userId, receiverId]);

  const senderName   = senderInfo
    ? `${senderInfo.first_name ?? ""} ${senderInfo.last_name ?? ""}`.trim() || "N/A"
    : "Loading...";
  const receiverName = receiverInfo
    ? `${receiverInfo.first_name ?? ""} ${receiverInfo.last_name ?? ""}`.trim() || "N/A"
    : "Loading...";

  const fromName = direction === "out" ? senderName : receiverName;
  const toName   = direction === "in"  ? senderName : receiverName;

  const providerInfo = PROVIDERS.find((p) => p.id === provider);

  const summaryRows = [
    { label: "Provider",    value: providerInfo?.label ?? provider.toUpperCase() },
    { label: "From A/C",    value: fromName },
    { label: "To",          value: toName },
    { label: "Description", value: "Fund transfer" },
    { label: "Amount",      value: `RWF ${Number(amount).toLocaleString()}` },
    { label: "Currency",    value: currency?.stock_name ?? "N/A" },
    { label: "Fee",         value: "RWF 0.0" },
  ];

  const handleSubmit = async () => {
    if (!password.trim()) { setPasswordError("Password is required"); return; }
    setPasswordError("");
    setIsLoading(true);
    try {
      const data = await accountTransact({
        user_id: userId,
        stock_id: currency?.id ?? 0,
        reference_code: String(receiverId),
        direction,
        amount,
        password,
      });
      if (data?.message === "success" || data?.status === "success") {
        toast.success("Transfer successful!");
        setTimeout(() => onDone(), 800);
      } else {
        toast.error(data?.message ?? "Transfer failed");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Transfer failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="app-shell bg-background flex flex-col">

      <div className="flex items-center gap-3 px-4 pt-6 pb-2 flex-shrink-0">
        <button
          onClick={onBack}
          className="w-8 h-8 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h2 className="text-lg font-display font-bold">Confirm Transfer</h2>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4 pt-2 space-y-4">

        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 px-0.5">
            Transfer Details
          </p>
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card border border-border rounded-xl overflow-hidden"
          >
            {summaryRows.map(({ label, value }, i) => (
              <div
                key={label}
                className={`flex items-center justify-between px-4 py-3 ${
                  i < summaryRows.length - 1 ? "border-b border-border" : ""
                }`}
              >
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className={`text-sm font-semibold max-w-[55%] text-right truncate ${
                  value === "Loading..." ? "text-muted-foreground animate-pulse" : "text-foreground"
                }`}>
                  {value}
                </p>
              </div>
            ))}
          </motion.div>
        </div>

        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 px-0.5">
            Enter your account password
          </p>
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className="bg-card border border-border rounded-xl overflow-hidden"
          >
            <div className="p-4">
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (e.target.value) setPasswordError("");
                  }}
                  placeholder="Enter password"
                  className={`w-full px-3 py-2.5 rounded-xl bg-secondary border text-sm focus:outline-none transition-colors pr-11 ${
                    passwordError ? "border-destructive" : "border-border focus:border-primary"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
              <AnimatePresence>
                {passwordError && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="text-[11px] text-destructive mt-1.5"
                  >
                    {passwordError}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="sticky bottom-0 px-4 py-3 bg-gradient-to-t from-background via-background to-background/0 space-y-2">
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={handleSubmit}
          disabled={isLoading}
          className="w-full h-14 flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-60 shadow-lg shadow-primary/20 transition-opacity"
        >
          {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
          {isLoading ? "Processing..." : "Confirm Transfer"}
        </motion.button>

        <button
          onClick={onBack}
          disabled={isLoading}
          className="w-full h-12 rounded-xl border border-primary/30 text-primary text-sm font-semibold hover:bg-primary/10 transition-colors bg-background disabled:opacity-40"
        >
          Go Back
        </button>
      </div>
    </div>
  );
}