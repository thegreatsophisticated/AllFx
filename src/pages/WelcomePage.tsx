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
  SendHorizonal,
  Wallet,
} from "lucide-react";
import axios from "axios";
import { toast } from "sonner";

const API_URL = import.meta.env.VITE_PUBLIC_API_URL;

// ─── API helpers ──────────────────────────────────────────────────────────────

const fetchUsers = async (): Promise<{ id: number; email: string }[]> => {
  const { data } = await axios.post(`${API_URL}/getUsers`, {});
  if (data?.message === "success") return data.users;
  return [];
};

const fetchCurrencies = async () => {
  const { data } = await axios.post(`${API_URL}/getStockProducts`, { category: "currencies" });
  const list = Array.isArray(data) ? data : Array.isArray(data?.stocks) ? data.stocks : [];
  return [{ id: "0", stock_name: "RWANDAN FRANCS", category: "currencies" }, ...list];
};

const fetchTransactions = async (userId: string) => {
  const { data } = await axios.post(`${API_URL}/accountRequests`, { user_id: userId });
  if (data?.status === "success") return data.data as any[];
  return [];
};

const fetchUserById = async (id: string) => {
  const { data } = await axios.post(`${API_URL}/getUserData`, { user_id: id });
  if (data?.message === "success") return data;
  return null;
};

// ─── Types ────────────────────────────────────────────────────────────────────

type Direction = "in" | "out";

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

  const [showConfirm, setShowConfirm] = useState(false);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [txLoading, setTxLoading] = useState(true);
  const [currenciesLoading, setCurrenciesLoading] = useState(true);

  useEffect(() => {
    fetchCurrencies().then((c) => { setCurrencies(c); setCurrenciesLoading(false); });
    fetchUsers().then((users) => {
      const map: Record<string, number> = {};
      users.forEach((u) => { map[u.email.toLowerCase()] = u.id; });
      setEmailToIdMap(map);
    });
    fetchTransactions(userId).then((txs) => { setTransactions(txs); setTxLoading(false); });
  }, []);

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
    if (!selectedAsset) { toast.error("Please select a currency"); return false; }
    if (!isEmailValid) { toast.error("Invalid email / account"); return false; }
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      toast.error("Enter a valid amount"); return false;
    }
    return true;
  };

  const handleConfirm = () => {
    if (validate()) setShowConfirm(true);
  };

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
        onBack={() => setShowConfirm(false)}
        onDone={() => navigate("/dashboard")}
      />
    );
  }

  return (
    <div className="app-shell min-h-screen flex flex-col pb-28">
      {/* Header — matches PortfolioPage style */}
      <div className="px-4 pt-6 pb-2">
        <div className="flex items-center gap-3 mb-1">
          <button
            onClick={() => navigate(-1)}
            className="w-8 h-8 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h2 className="text-lg font-display font-bold flex-1">Transfer Funds</h2>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pt-2 space-y-5">

        {/* ── Direction toggle ── */}
        <div className="grid grid-cols-2 gap-2">
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
              {d === "in"
                ? <ArrowDownLeft className="w-4 h-4" />
                : <ArrowUpRight className="w-4 h-4" />}
              {d === "in" ? "Cash In" : "Cash Out"}
            </motion.button>
          ))}
        </div>

        {/* ── Form card — consistent with PortfolioRow card style ── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-card border border-border rounded-xl overflow-hidden"
        >
          {/* Card header */}
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

            {/* Email / account */}
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

        {/* ── Transactions list — mirrors PortfolioPage list ── */}
        <div>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 px-0.5">
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
              <SendHorizonal className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No transactions yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {transactions.map((tx, i) => (
                <TransactionRow key={tx.transaction_id ?? i} tx={tx} index={i} currentUserId={userId} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Confirm button — fixed bottom, same pattern as WelcomePage CTAs ── */}
      <div className="fixed bottom-0 left-0 right-0 px-4 pb-8 pt-3 bg-gradient-to-t from-background via-background to-background/0">
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={handleConfirm}
          disabled={!isEmailValid}
          className={`w-full h-14 rounded-xl text-sm font-semibold transition-colors ${
            isEmailValid
              ? "bg-primary text-primary-foreground"
              : "bg-card text-muted-foreground border border-border cursor-not-allowed"
          }`}
        >
          Confirm Transfer
        </motion.button>
      </div>
    </div>
  );
}

// ─── Transaction Row — mirrors PortfolioRow exactly ─────────────────────────

function TransactionRow({
  tx,
  index,
  currentUserId,
}: {
  tx: any;
  index: number;
  currentUserId: string;
}) {
  const [refName, setRefName] = useState<string | null>(null);

  useEffect(() => {
    const idToFetch =
      tx.reference_code === currentUserId ? tx.user_id : tx.reference_code;
    fetchUserById(String(idToFetch)).then((u) => {
      if (u) {
        const name = `${u.first_name ?? ""} ${u.last_name ?? ""}`.trim() || "Unnamed";
        setRefName(name);
      } else {
        setRefName("Unknown");
      }
    });
  }, [tx]);

  const isIn = tx.direction === "in";
  const statusColor =
    tx.status === "approved"
      ? "text-accent"
      : tx.status === "pending"
      ? "text-yellow-500"
      : "text-destructive";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="flex items-center justify-between p-3.5 rounded-xl bg-card border border-border"
    >
      {/* Left: icon + info */}
      <div className="flex items-center gap-3">
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
            isIn ? "bg-accent/10" : "bg-destructive/10"
          }`}
        >
          {isIn
            ? <ArrowDownLeft className="w-4 h-4 text-accent" />
            : <ArrowUpRight className="w-4 h-4 text-destructive" />}
        </div>
        <div>
          <p className="text-sm font-bold">{refName ?? "..."}</p>
          <p className="text-xs text-muted-foreground">
            {tx.stock_code} · {tx.start_date?.slice(0, 10)}
          </p>
          <span className={`text-[10px] font-semibold capitalize ${statusColor}`}>
            {tx.status}
          </span>
        </div>
      </div>

      {/* Right: amount badge — same pill as PortfolioRow change badge */}
      <div
        className={`flex items-center gap-1 px-3 py-1.5 rounded-lg border text-xs font-semibold ${
          isIn
            ? "text-accent border-accent/30 bg-accent/10"
            : "text-destructive border-destructive/30 bg-destructive/10"
        }`}
      >
        {isIn
          ? <ArrowDownLeft className="w-3.5 h-3.5" />
          : <ArrowUpRight className="w-3.5 h-3.5" />}
        <span>
          {isIn ? "+" : "-"}RWF {Number(tx.amount).toLocaleString()}
        </span>
      </div>
    </motion.div>
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
  onBack,
  onDone,
}: {
  userId: string;
  currency: any;
  amount: string;
  receiverId: number;
  receiverEmail: string;
  direction: Direction;
  onBack: () => void;
  onDone: () => void;
}) {
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      const { data } = await axios.post(`${API_URL}/transferFunds`, {
        user_id: userId,
        receiver_id: receiverId,
        stock_id: currency?.id ?? 0,
        amount: parseFloat(amount),
        direction,
      });

      if (data?.status === "success" || data?.message?.toLowerCase().includes("success")) {
        toast.success("Transfer successful!");
        onDone();
      } else {
        toast.error(data?.message ?? "Transfer failed");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Transfer failed");
    } finally {
      setIsLoading(false);
    }
  };

  const rows = [
    { label: "Direction", value: direction === "in" ? "Cash In" : "Cash Out" },
    { label: "Currency",  value: currency?.stock_name ?? "—" },
    { label: "Recipient", value: receiverEmail },
    { label: "Amount",    value: `RWF ${Number(amount).toLocaleString()}` },
  ];

  return (
    <div className="app-shell min-h-screen flex flex-col">
      {/* Header */}
      <div className="px-4 pt-6 pb-2">
        <div className="flex items-center gap-3 mb-1">
          <button
            onClick={onBack}
            className="w-8 h-8 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h2 className="text-lg font-display font-bold flex-1">Confirm Transfer</h2>
        </div>
      </div>

      <div className="flex-1 px-4 pt-4 flex flex-col gap-4">
        {/* Summary card */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-border rounded-xl overflow-hidden"
        >
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-secondary/40">
            <SendHorizonal className="w-4 h-4 text-primary" />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Transfer Summary
            </p>
          </div>

          {rows.map(({ label, value }, i) => (
            <div
              key={label}
              className="flex items-center justify-between px-4 py-3 border-b border-border last:border-0"
            >
              <p className="text-sm text-muted-foreground">{label}</p>
              <p className="text-sm font-bold">{value}</p>
            </div>
          ))}
        </motion.div>

        <p className="text-xs text-muted-foreground text-center px-6 leading-relaxed">
          Please review the details above. This transfer cannot be undone once confirmed.
        </p>
      </div>

      {/* Bottom CTAs — mirrors WelcomePage button stack */}
      <div className="px-4 pb-10 pt-4 border-t border-border space-y-3">
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={handleSubmit}
          disabled={isLoading}
          className="w-full h-14 flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-60 transition-opacity"
        >
          {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
          {isLoading ? "Processing..." : "Confirm Transfer"}
        </motion.button>

        <button
          onClick={onBack}
          className="w-full h-14 rounded-xl border border-primary/30 text-primary text-sm font-semibold hover:bg-primary/10 transition-colors"
        >
          Go Back
        </button>
      </div>
    </div>
  );
}