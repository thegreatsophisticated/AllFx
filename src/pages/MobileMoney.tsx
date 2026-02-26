import { useState, useEffect } from "react";
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

// ─── Local wrappers — keep internal call sites unchanged, swallow errors ──────
// (mirrors Flutter's try/catch print pattern — returns [] / null on failure)

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
type Provider = "mtn" | "airtel" | "bk";

// ─── Provider Toggle Group — mirrors Flutter ImageToggleGroup ─────────────────

const PROVIDERS: { id: Provider; label: string; color: string; bg: string; abbr: string; logoUrl: string }[] = [
  {
    id: "mtn",
    label: "MTN",
    abbr: "MT",
    color: "text-yellow-600",
    bg: "bg-yellow-400",
    // MTN Rwanda yellow — fallback to styled abbr if logo fails
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
              isSelected
                ? "border-primary bg-primary/5"
                : "border-border bg-card"
            }`}
          >
            {/* Logo circle — same ClipOval pattern from Flutter */}
            <div className={`w-9 h-9 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0 ${p.bg}`}>
              <img
                src={p.logoUrl}
                alt={p.label}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                  (e.target as HTMLImageElement).parentElement!.innerHTML =
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
  const userId = localStorage.getItem("user_id") ?? "";

  const [direction, setDirection] = useState<Direction>("in");
  const [currencies, setCurrencies] = useState<any[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<string>("");
  const [account, setAccount] = useState("");
  const [amount, setAmount] = useState("");

  const [emailToIdMap, setEmailToIdMap] = useState<Record<string, number>>({});
  const [isEmailValid, setIsEmailValid] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [txLoading, setTxLoading] = useState(true);
  const [currenciesLoading, setCurrenciesLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const reloadTransactions = () => {
    setTxLoading(true);
    fetchTransactions(userId).then((txs) => { setTransactions(txs); setTxLoading(false); });
  };

  useEffect(() => {
    fetchCurrencies().then((c) => { setCurrencies(c); setCurrenciesLoading(false); });
    fetchUsers().then((users) => {
      const map: Record<string, number> = {};
      users.forEach((u) => { map[u.email.toLowerCase()] = u.id; });
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
    if (!selectedProvider) { toast.error("Please select a payment provider"); return false; }
    if (!selectedAsset) { toast.error("Please select a currency"); return false; }
    if (!isEmailValid) { toast.error("Invalid email / account"); return false; }
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
    // ✅ Exact same pattern as SearchPage — just app-shell, no flex-col min-h-screen
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

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-5">

        {/* Provider selector — mirrors Flutter ImageToggleGroup, placed above direction toggle */}
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
            Recent Transactions
          </h2>

          {txLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-[68px] rounded-xl bg-card border border-border animate-pulse" />
              ))}
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center mt-10">
              {/* <SendHorizonal className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" /> */}
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
      </div>

      {/* ── Confirm button — sticky bottom, stays inside app-shell width ── */}
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

// ─── Password Dialog — mirrors Flutter _askPassword AlertDialog ───────────────

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
  const [pw, setPw] = useState("");
  const [show, setShow] = useState(false);

  // Reset on open
  useEffect(() => {
    if (open) { setPw(""); setShow(false); }
  }, [open]);

  if (!open) return null;

  return (
    // Backdrop
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
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
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

// ─── Transaction Row — mirrors Flutter TransactionItem exactly ────────────────

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
  const [refName, setRefName] = useState<string | null>(null);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<"approve" | "cancel" | null>(null);
  const [dialogLoading, setDialogLoading] = useState(false);

  // Resolve reference name — mirrors Flutter FutureBuilder(userInfo(...))
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

  // ── Flutter isOut logic (verbatim) ──────────────────────────────────────────
  // direction=="out" && userId==currentUserId  → isOut=true
  // direction=="out" && userId!=currentUserId  → isOut=false
  // direction=="in"  && userId==currentUserId  → isOut=false
  // direction=="in"  && userId!=currentUserId  → isOut=true
  let isOut = false;
  const txUserId   = String(tx.user_id);
  const txDirection = String(tx.direction);
  if (txDirection === "out" && txUserId === String(currentUserId)) isOut = true;
  else if (txDirection === "out" && txUserId !== String(currentUserId)) isOut = false;
  else if (txDirection === "in"  && txUserId === String(currentUserId)) isOut = false;
  else if (txDirection === "in"  && txUserId !== String(currentUserId)) isOut = true;

  // Flutter: amountColor — grey when status=="" (pending), else red/green
  const amountColorClass =
    tx.status === "" ? "text-muted-foreground"
    : isOut           ? "text-destructive"
    : "text-accent";

  // Flutter NumberFormat('#,##0.00')
  const parsedAmount = parseFloat(String(tx.amount).replace(/,/g, "")) || 0;
  const formattedAmount = parsedAmount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const displayAmount = `${isOut ? "-" : "+"}${formattedAmount} ${tx.stock_code}`;

  // ── Flutter _handleAction ───────────────────────────────────────────────────
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

  // ── Flutter status/role action logic ───────────────────────────────────────
  // status==""  && currentUserId != userId  → Approve + Cancel buttons
  // status==""  && currentUserId == userId  → Pending (disabled) + Cancel
  // status=="approve"                       → Verified icon + approveDate
  // status=="cancel"                        → Block icon + approveDate
  const isOwner = String(tx.user_id) === String(currentUserId);
  const status  = tx.status ?? "";

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
        {/* Top row: left info + amount */}
        <div className="flex items-start justify-between gap-3">
          {/* Left */}
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
              isOut ? "bg-destructive/10" : "bg-accent/10"
            }`}>
              {isOut
                ? <ArrowUpRight className="w-4 h-4 text-destructive" />
                : <ArrowDownLeft className="w-4 h-4 text-accent" />}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold truncate">{refName ?? "..."}</p>
              <p className="text-xs text-muted-foreground">
                Date: {tx.start_date?.slice(0, 10)}
              </p>
            </div>
          </div>

          {/* Amount — Flutter Text(displayAmount) with amountColor */}
          <p className={`text-sm font-semibold flex-shrink-0 ${amountColorClass}`}>
            {displayAmount}
          </p>
        </div>

        {/* Action buttons row — mirrors Flutter conditional actions exactly */}
        <div className="mt-2.5 flex items-center justify-end gap-2">

          {/* status=="" && currentUserId != userId → Approve + Cancel */}
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

          {/* status=="" && currentUserId == userId → Pending (disabled) + Cancel */}
          {status === "" && isOwner && (
            <>
              <span className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border text-muted-foreground text-xs font-medium">
                {/* hourglass_empty */}
                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 2h14"/><path d="M5 22h14"/><path d="M17 2v4l-5 5-5-5V2"/><path d="M7 22v-4l5-5 5 5v4"/>
                </svg>
                Pending
              </span>
              <button
                onClick={() => openDialog("cancel")}
                className="px-3 py-1.5 rounded-lg border border-destructive/40 text-destructive text-xs font-semibold hover:bg-destructive/10 transition-colors"
              >
                Cancel
              </button>
            </>
          )}

          {/* status=="approve" → Verified icon + approveDate */}
          {status === "approve" && (
            <span className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-accent/30 bg-accent/5 text-accent text-xs font-medium">
              {/* verified checkmark */}
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
              Approved{approveDate ? ` · ${approveDate}` : ""}
            </span>
          )}

          {/* status=="cancel" → Block icon + approveDate */}
          {status === "cancel" && (
            <span className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-destructive/30 bg-destructive/5 text-destructive text-xs font-medium">
              {/* block icon */}
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
              </svg>
              Cancelled{approveDate ? ` · ${approveDate}` : ""}
            </span>
          )}
        </div>
      </motion.div>
    </>
  );
}

// ─── Confirm Screen — mirrors Flutter MobileMoneyConfirm exactly ─────────────

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
  // ── State ──────────────────────────────────────────────────────────────────
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false); // Flutter _isObscured
  const [passwordError, setPasswordError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Flutter: loadUserInfo() → sender, loadUserInfo2() → receiver
  const [senderInfo, setSenderInfo] = useState<any>(null);
  const [receiverInfo, setReceiverInfo] = useState<any>(null);

  useEffect(() => {
    // Load sender (current user)
    fetchUserById(userId).then((u) => setSenderInfo(u));
    // Load receiver
    fetchUserById(String(receiverId)).then((u) => setReceiverInfo(u));
  }, [userId, receiverId]);

  const senderName = senderInfo
    ? `${senderInfo.first_name ?? ""} ${senderInfo.last_name ?? ""}`.trim() || "N/A"
    : "Loading...";

  const receiverName = receiverInfo
    ? `${receiverInfo.first_name ?? ""} ${receiverInfo.last_name ?? ""}`.trim() || "N/A"
    : "Loading...";

  // Flutter direction logic:
  // direction=="out" → From=sender, To=receiver
  // direction=="in"  → From=receiver, To=sender
  const fromName = direction === "out" ? senderName : receiverName;
  const toName   = direction === "in"  ? senderName : receiverName;

  const providerInfo = PROVIDERS.find((p) => p.id === provider);

  // Flutter _buildRow rows — exact order from Flutter source
  const summaryRows = [
    { label: "Provider",    value: providerInfo?.label ?? provider.toUpperCase() },
    { label: "From A/C",    value: fromName },
    { label: "To",          value: toName },
    { label: "Description", value: "Fund transfer" },
    { label: "Amount",      value: `RWF ${Number(amount).toLocaleString()}` },
    { label: "Currency",    value: currency?.stock_name ?? "N/A" },
    { label: "Fee",         value: "RWF 0.0" },
  ];

  // ── Submit — mirrors Flutter cashout() using accountTransact endpoint ──────
  const handleSubmit = async () => {
    if (!password.trim()) {
      setPasswordError("Password is required");
      return;
    }
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

      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-6 pb-2 flex-shrink-0">
        <button
          onClick={onBack}
          className="w-8 h-8 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h2 className="text-lg font-display font-bold">Confirm Transfer</h2>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 pt-2 space-y-4">

        {/* ── TRANSFER DETAILS card — mirrors Flutter Card + _buildRow ── */}
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
                  // Highlight loading states subtly
                  value === "Loading..." ? "text-muted-foreground animate-pulse" : "text-foreground"
                }`}>
                  {value}
                </p>
              </div>
            ))}
          </motion.div>
        </div>

        {/* ── Password section — mirrors Flutter Titleheader + TextFormField ── */}
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
                {/* Eye toggle — mirrors Flutter visibility_off / visibility IconButton */}
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? (
                    // eye-off
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    // eye
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
              {/* Inline validation error — mirrors Flutter validator return */}
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

      {/* ── Bottom buttons — sticky, respects app-shell width ── */}
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