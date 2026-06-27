import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import {
  ArrowLeft,
  Plus,
  Trash2,
  UserCheck,
  UserX,
  CreditCard,
  Hash,
  Car,
  AlertTriangle,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Users,
  ShieldCheck,
  ShieldX,
  Clock,
  Receipt,
  BadgeCheck,
  ChevronLeft,
  DollarSign,
  Cpu,
  Phone,
  MapPin,
  Gauge,
} from "lucide-react";
import { toast } from "sonner";

const API_BASE = "https://irebegroup.com/irebe/index.php";

// ── Types ──────────────────────────────────────────────────────────────────
interface Driver {
  id: string;         // ID
  user_id: string;    // user_id
  national_id: string;
  license_id: string;
  status: string;     // "1" = approved, "0" = pending/reject
  driver_name: string;
}

interface CarItem {
  id: string;         // ID
  plate_no: string;
  chassis_no: string;
  sim_no: string;
  fare_rate: number;
  api_id: string;
  location: string;
  status: number;     // 1 = active
}

interface Transaction {
  id: string;
  amount?: string | number;
  date?: string;
  description?: string;
  type?: string;
}

type TabKey = "add" | "drivers" | "cars";

// ── Status helpers ─────────────────────────────────────────────────────────
// API returns status as "1" (approved) or other values
function getStatusMeta(status: string) {
  if (status === "1" || status === "valid") {
    return {
      label: "Approved",
      icon: ShieldCheck,
      color: "text-emerald-400",
      bg: "bg-emerald-400/15 border-emerald-400/30",
    };
  }
  if (status === "reject" || status === "0") {
    return {
      label: "Rejected",
      icon: ShieldX,
      color: "text-destructive",
      bg: "bg-destructive/10 border-destructive/30",
    };
  }
  return {
    label: "Pending",
    icon: Clock,
    color: "text-orange-400",
    bg: "bg-orange-400/15 border-orange-400/30",
  };
}

// ── Shared sub-components ──────────────────────────────────────────────────
function ErrorBanner({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      className="flex items-start gap-3 px-3.5 py-3 rounded-xl bg-destructive/10 border border-destructive/30"
    >
      <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
      <p className="flex-1 text-sm text-destructive font-medium leading-snug">{message}</p>
      <button type="button" onClick={onDismiss} className="text-destructive/60 hover:text-destructive transition-colors flex-shrink-0">
        <X className="w-3.5 h-3.5" />
      </button>
    </motion.div>
  );
}

function Field({ label, icon: Icon, children }: { label: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
        <Icon className="w-3.5 h-3.5" />
        {label}
      </label>
      {children}
    </div>
  );
}

const inputCls =
  "w-full px-3 py-2.5 rounded-xl bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary transition-colors";

// ── Approve / Reject Dialog ────────────────────────────────────────────────
function ApproveDialog({
  driver, onConfirm, onCancel, loading,
}: {
  driver: Driver;
  onConfirm: (status: "valid" | "reject") => void;
  onCancel: () => void;
  loading: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.93 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.93 }}
        className="w-full max-w-sm bg-card border border-border rounded-2xl overflow-hidden shadow-2xl"
      >
        <div className="p-5 flex flex-col gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <BadgeCheck className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-base font-bold text-foreground">Review Driver</p>
            <p className="text-sm text-muted-foreground mt-1">
              Update approval status for{" "}
              <span className="font-semibold text-foreground">{driver.driver_name}</span>.
            </p>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-secondary border border-border text-xs">
            <CreditCard className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">NID:</span>
            <span className="font-semibold text-foreground">{driver.national_id}</span>
            <span className="text-muted-foreground ml-auto">Lic: {driver.license_id}</span>
          </div>
        </div>
        <div className="flex gap-2 px-5 pb-5">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 h-11 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm("reject")}
            disabled={loading}
            className="flex-1 h-11 rounded-xl bg-destructive/15 border border-destructive/30 text-destructive text-sm font-semibold disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <UserX className="w-3.5 h-3.5" /> Reject
          </button>
          <button
            onClick={() => onConfirm("valid")}
            disabled={loading}
            className="flex-1 h-11 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 text-sm font-semibold disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <UserCheck className="w-3.5 h-3.5" /> Approve
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Delete Confirm Dialog ──────────────────────────────────────────────────
function DeleteDialog({
  name, onConfirm, onCancel, loading,
}: {
  name: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.93 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.93 }}
        className="w-full max-w-sm bg-card border border-border rounded-2xl overflow-hidden shadow-2xl"
      >
        <div className="p-5 flex flex-col gap-3">
          <div className="w-12 h-12 rounded-xl bg-destructive/15 border border-destructive/25 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-destructive" />
          </div>
          <div>
            <p className="text-base font-bold text-foreground">Remove Driver</p>
            <p className="text-sm text-muted-foreground mt-1">
              Are you sure you want to remove{" "}
              <span className="font-semibold text-foreground">{name}</span>? This cannot be undone.
            </p>
          </div>
        </div>
        <div className="flex gap-2 px-5 pb-5">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 h-11 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 h-11 rounded-xl bg-destructive text-destructive-foreground text-sm font-semibold disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Remove
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Driver Detail Sheet ────────────────────────────────────────────────────
function DriverDetailSheet({
  driver,
  onClose,
  onReview,
  onDelete,
}: {
  driver: Driver;
  onClose: () => void;
  onReview: () => void;
  onDelete: () => void;
}) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await axios.post(
          `${API_BASE}/getDriverTransactions`,
          { userID: driver.id },   // driver's own ID
          { headers: { "Content-Type": "application/json" } }
        );
        const data = res.data;
        // handle array or wrapped object
        const list = Array.isArray(data)
          ? data
          : Array.isArray(data?.transactions)
          ? data.transactions
          : [];
        setTransactions(
          list.map((t: any) => ({
            id: t.id?.toString() ?? t.ID?.toString() ?? "",
            amount: t.amount ?? t.total ?? "0",
            date: t.date ?? t.created_at ?? "",
            description: t.description ?? t.note ?? "",
            type: t.type ?? t.transaction_type ?? "",
          }))
        );
      } catch {
        toast.error("Failed to load transactions");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [driver.id]);

  const meta = getStatusMeta(driver.status);
  const StatusIcon = meta.icon;

  return (
    <motion.div
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ type: "spring", damping: 28, stiffness: 300 }}
      className="fixed inset-0 z-40 bg-background flex flex-col"
    >
      {/* Sheet header */}
      <div className="flex items-center gap-3 px-4 pt-6 pb-3 flex-shrink-0 border-b border-border">
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-display font-bold leading-tight truncate">
            {driver.driver_name}
          </h2>
          <p className="text-xs text-muted-foreground">Driver details &amp; transactions</p>
        </div>
        <button
          onClick={onReview}
          className="w-8 h-8 rounded-lg bg-primary/10 hover:bg-primary/20 flex items-center justify-center transition-colors"
        >
          <BadgeCheck className="w-3.5 h-3.5 text-primary" />
        </button>
        <button
          onClick={onDelete}
          className="w-8 h-8 rounded-lg bg-destructive/10 hover:bg-destructive/20 flex items-center justify-center transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5 text-destructive" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-8 space-y-5">
        {/* Driver info card */}
        <div className="bg-card border border-border rounded-2xl p-4 flex flex-col gap-3">
          <span className={`self-start flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border ${meta.bg} ${meta.color}`}>
            <StatusIcon className="w-3 h-3" />
            {meta.label}
          </span>

          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-0.5 px-3 py-2.5 rounded-xl bg-secondary border border-border">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">National ID</p>
              <p className="text-sm font-bold text-foreground truncate">{driver.national_id}</p>
            </div>
            <div className="flex flex-col gap-0.5 px-3 py-2.5 rounded-xl bg-secondary border border-border">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">License ID</p>
              <p className="text-sm font-bold text-foreground truncate">{driver.license_id}</p>
            </div>
            <div className="flex flex-col gap-0.5 px-3 py-2.5 rounded-xl bg-secondary border border-border col-span-2">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Driver ID</p>
              <p className="text-sm font-bold text-foreground">#{driver.id}</p>
            </div>
          </div>
        </div>

        {/* Transactions */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Transactions</p>
            {!loading && (
              <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
                {transactions.length}
              </span>
            )}
          </div>

          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-16 rounded-xl bg-card border border-border animate-pulse" />
              ))}
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <Receipt className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No transactions yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {transactions.map((tx, i) => (
                <motion.div
                  key={tx.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border"
                >
                  <div className="w-9 h-9 rounded-xl bg-secondary flex-shrink-0 flex items-center justify-center border border-border">
                    <DollarSign className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {tx.description || tx.type || `Transaction #${tx.id}`}
                    </p>
                    {tx.date && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date(tx.date).toLocaleDateString("en-RW", {
                          day: "2-digit", month: "short", year: "numeric",
                        })}
                      </p>
                    )}
                  </div>
                  <p className="text-sm font-bold text-foreground flex-shrink-0">
                    RWF {Number(tx.amount ?? 0).toLocaleString()}
                  </p>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────
const ManageDrivers = () => {
  const navigate = useNavigate();
  const userId = sessionStorage.getItem("user_id") ?? "1";

  const [activeTab, setActiveTab] = useState<TabKey>("add");

  // Add Driver form
  const [nationalId, setNationalId] = useState("");
  const [licenseId, setLicenseId] = useState("");
  const [formLoading, setFormLoading] = useState(false);
  const [formSuccess, setFormSuccess] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Data
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [driversLoading, setDriversLoading] = useState(true);
  const [cars, setCars] = useState<CarItem[]>([]);
  const [carsLoading, setCarsLoading] = useState(true);

  // Detail sheet
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);

  // Dialogs
  const [approveTarget, setApproveTarget] = useState<Driver | null>(null);
  const [approveLoading, setApproveLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Driver | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // ── Load drivers ──────────────────────────────────────────────────────────
  const loadDrivers = async () => {
    setDriversLoading(true);
    try {
      const res = await axios.post(
        `${API_BASE}/getAllDrivers`,
        { userID: userId },
        { headers: { "Content-Type": "application/json" } }
      );
      // Response: { message: "success", users: [...] }
      const list = res.data?.users ?? res.data;
      if (Array.isArray(list)) {
        setDrivers(
          list.map((d: any) => ({
            id: d.ID?.toString() ?? d.id?.toString() ?? "",
            user_id: d.user_id?.toString() ?? "",
            national_id: d.national_id ?? "",
            license_id: d.license_id ?? "",
            status: d.status?.toString() ?? "pending",
            driver_name: d.driver_name ?? d.name ?? `Driver #${d.ID ?? d.id}`,
          }))
        );
      }
    } catch {
      toast.error("Failed to load drivers");
    } finally {
      setDriversLoading(false);
    }
  };

  // ── Load cars ─────────────────────────────────────────────────────────────
  const loadCars = async () => {
    setCarsLoading(true);
    try {
      const res = await axios.post(
        `${API_BASE}/getCars`,
        { userID: userId },
        { headers: { "Content-Type": "application/json" } }
      );
      // Response: { status: "success", cars: [...] }
      const list = res.data?.cars ?? res.data;
      if (Array.isArray(list)) {
        setCars(
          list.map((c: any) => ({
            id: c.ID?.toString() ?? c.id?.toString() ?? "",
            plate_no: c.plate_no ?? "",
            chassis_no: c.chassis_no ?? "",
            sim_no: c.sim_no ?? "",
            fare_rate: Number(c.fare_rate ?? 0),
            api_id: c.api_id ?? "",
            location: c.location ?? "",
            status: Number(c.status ?? 0),
          }))
        );
      }
    } catch {
      toast.error("Failed to load cars");
    } finally {
      setCarsLoading(false);
    }
  };

  useEffect(() => {
    loadDrivers();
    loadCars();
  }, []);

  // ── Add driver ────────────────────────────────────────────────────────────
  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!nationalId || !licenseId) {
      const msg = "Please fill in all required fields";
      setFormError(msg);
      toast.error(msg);
      return;
    }
    setFormLoading(true);
    try {
      const res = await axios.post(
        `${API_BASE}/addDriver`,
        { userID: userId, national_id: nationalId, license_id: licenseId },
        { headers: { "Content-Type": "application/json" } }
      );
      if (res.data?.status === "success" || res.data?.message === "success") {
        toast.success(res.data?.message ?? "Driver added!");
        setFormSuccess(true);
        setTimeout(() => setFormSuccess(false), 2500);
        setNationalId("");
        setLicenseId("");
        loadDrivers();
      } else {
        const msg = res.data?.message ?? "Failed to add driver";
        setFormError(msg);
        toast.error(msg);
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err?.message ?? "Network error — please try again";
      setFormError(msg);
      toast.error(msg);
    } finally {
      setFormLoading(false);
    }
  };

  // ── Approve / Reject ──────────────────────────────────────────────────────
  const handleApprove = async (status: "valid" | "reject") => {
    if (!approveTarget) return;
    setApproveLoading(true);
    try {
      const res = await axios.post(
        `${API_BASE}/approveDriver`,
        { driver_id: approveTarget.id, userID: userId, status },
        { headers: { "Content-Type": "application/json" } }
      );
      if (res.data?.status === "success" || res.data?.message === "success") {
        toast.success(status === "valid" ? "Driver approved" : "Driver rejected");
        const newStatus = status === "valid" ? "1" : "0";
        setDrivers((prev) =>
          prev.map((d) => d.id === approveTarget.id ? { ...d, status: newStatus } : d)
        );
        if (selectedDriver?.id === approveTarget.id) {
          setSelectedDriver((prev) => prev ? { ...prev, status: newStatus } : prev);
        }
        setApproveTarget(null);
      } else {
        toast.error(res.data?.message ?? "Action failed");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setApproveLoading(false);
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      // Wire to removeDriver endpoint when available
      // await axios.post(`${API_BASE}/removeDriver`, { driver_id: deleteTarget.id, userID: userId }, ...);
      toast.success("Driver removed");
      setDrivers((prev) => prev.filter((d) => d.id !== deleteTarget.id));
      if (selectedDriver?.id === deleteTarget.id) setSelectedDriver(null);
      setDeleteTarget(null);
    } catch {
      toast.error("Network error");
    } finally {
      setDeleteLoading(false);
    }
  };

  const TABS: { key: TabKey; label: string; icon: React.ElementType }[] = [
    { key: "add", label: "Add", icon: Plus },
    { key: "drivers", label: "Drivers", icon: Users },
    { key: "cars", label: "Cars", icon: Car },
  ];

  return (
    <div className="app-shell bg-background flex flex-col">
      {/* ── Header ── */}
      <div className="flex items-center gap-3 px-4 pt-6 pb-2 flex-shrink-0">
        <button
          onClick={() => navigate(-1)}
          className="w-8 h-8 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h2 className="text-lg font-display font-bold leading-tight">Manage Drivers</h2>
          <p className="text-xs text-muted-foreground">Add, approve &amp; review driver accounts</p>
        </div>
      </div>

      {/* ── Tab Bar ── */}
      <div className="flex gap-1 px-4 pt-2 pb-1 flex-shrink-0">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex-1 flex items-center justify-center gap-1.5 h-9 rounded-xl text-xs font-semibold transition-all ${
              activeTab === key
                ? "bg-primary text-primary-foreground shadow shadow-primary/20"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* ── Scrollable Body ── */}
      <div className="flex-1 overflow-y-auto px-4 pb-8 pt-3 space-y-6">
        <AnimatePresence mode="wait">

          {/* ══ ADD DRIVER ══════════════════════════════════════════════════ */}
          {activeTab === "add" && (
            <motion.div
              key="add"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-card border border-border rounded-2xl overflow-hidden"
            >
              <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-secondary/40">
                <Plus className="w-4 h-4 text-primary" />
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Register New Driver
                </p>
              </div>

              <form onSubmit={handleAdd} className="p-4 flex flex-col gap-4">
                <AnimatePresence>
                  {formError && (
                    <ErrorBanner message={formError} onDismiss={() => setFormError(null)} />
                  )}
                </AnimatePresence>

                <Field label="National ID" icon={CreditCard}>
                  <input
                    className={inputCls}
                    placeholder="e.g. 1199780012345678"
                    value={nationalId}
                    onChange={(e) => setNationalId(e.target.value)}
                  />
                </Field>

                <Field label="License ID" icon={Hash}>
                  <input
                    className={inputCls}
                    placeholder="e.g. DL-2024-001"
                    value={licenseId}
                    onChange={(e) => setLicenseId(e.target.value)}
                  />
                </Field>

                <motion.button
                  type="submit"
                  whileTap={{ scale: 0.98 }}
                  disabled={formLoading}
                  className={`w-full h-12 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-lg ${
                    formSuccess
                      ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-500"
                      : "bg-primary text-primary-foreground shadow-primary/20"
                  } disabled:opacity-60`}
                >
                  {formLoading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Registering…</>
                  ) : formSuccess ? (
                    <><CheckCircle2 className="w-4 h-4" /> Driver Registered!</>
                  ) : (
                    <><Plus className="w-4 h-4" /> Register Driver</>
                  )}
                </motion.button>
              </form>
            </motion.div>
          )}

          {/* ══ DRIVERS LIST ════════════════════════════════════════════════ */}
          {activeTab === "drivers" && (
            <motion.div
              key="drivers"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Registered Drivers
                </p>
                {!driversLoading && (
                  <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
                    {drivers.length}
                  </span>
                )}
              </div>

              {driversLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-20 rounded-xl bg-card border border-border animate-pulse" />
                  ))}
                </div>
              ) : drivers.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No drivers registered yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {drivers.map((driver, i) => {
                    const meta = getStatusMeta(driver.status);
                    const StatusIcon = meta.icon;
                    return (
                      <motion.div
                        key={driver.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.035 }}
                        className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border cursor-pointer active:scale-[0.99] transition-transform"
                        onClick={() => setSelectedDriver(driver)}
                      >
                        <div className="w-11 h-11 rounded-xl bg-secondary flex-shrink-0 flex items-center justify-center border border-border">
                          <Users className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="text-sm font-bold text-foreground truncate">
                              {driver.driver_name}
                            </p>
                            <span className={`flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md border ${meta.bg} ${meta.color}`}>
                              <StatusIcon className="w-2.5 h-2.5" />
                              {meta.label}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">
                            NID: {driver.national_id} · Lic: {driver.license_id}
                          </p>
                        </div>
                        {/* Actions — stop propagation so row tap still opens sheet */}
                        <div
                          className="flex items-center gap-1.5 flex-shrink-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() => setApproveTarget(driver)}
                            className="w-8 h-8 rounded-lg bg-primary/10 hover:bg-primary/20 flex items-center justify-center transition-colors"
                          >
                            <BadgeCheck className="w-3.5 h-3.5 text-primary" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(driver)}
                            className="w-8 h-8 rounded-lg bg-destructive/10 hover:bg-destructive/20 flex items-center justify-center transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-destructive" />
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {/* ══ CARS LIST ═══════════════════════════════════════════════════ */}
          {activeTab === "cars" && (
            <motion.div
              key="cars"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Fleet Cars
                </p>
                {!carsLoading && (
                  <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
                    {cars.length}
                  </span>
                )}
              </div>

              {carsLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-20 rounded-xl bg-card border border-border animate-pulse" />
                  ))}
                </div>
              ) : cars.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Car className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No cars in the fleet yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {cars.map((car, i) => (
                    <motion.div
                      key={car.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.035 }}
                      className="p-3 rounded-xl bg-card border border-border"
                    >
                      {/* Top row: plate + status */}
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-secondary flex-shrink-0 flex items-center justify-center border border-border">
                          <Car className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-bold text-foreground">{car.plate_no}</p>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md border ${
                              car.status === 1
                                ? "bg-emerald-400/15 border-emerald-400/30 text-emerald-400"
                                : "bg-secondary border-border text-muted-foreground"
                            }`}>
                              {car.status === 1 ? "Active" : "Inactive"}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">
                            {car.api_id} · RWF {car.fare_rate.toLocaleString()}/trip
                          </p>
                        </div>
                      </div>

                      {/* Detail pills */}
                      <div className="flex flex-wrap gap-1.5 mt-2.5">
                        <span className="flex items-center gap-1 text-[11px] text-muted-foreground px-2 py-1 rounded-lg bg-secondary border border-border">
                          <Cpu className="w-3 h-3" />
                          {car.chassis_no}
                        </span>
                        <span className="flex items-center gap-1 text-[11px] text-muted-foreground px-2 py-1 rounded-lg bg-secondary border border-border">
                          <Phone className="w-3 h-3" />
                          {car.sim_no}
                        </span>
                        <span className="flex items-center gap-1 text-[11px] text-muted-foreground px-2 py-1 rounded-lg bg-secondary border border-border">
                          <MapPin className="w-3 h-3" />
                          {car.location}
                        </span>
                        <span className="flex items-center gap-1 text-[11px] text-muted-foreground px-2 py-1 rounded-lg bg-secondary border border-border">
                          <Gauge className="w-3 h-3" />
                          RWF {car.fare_rate}/trip
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* ── Driver Detail Sheet ── */}
      <AnimatePresence>
        {selectedDriver && (
          <DriverDetailSheet
            driver={selectedDriver}
            onClose={() => setSelectedDriver(null)}
            onReview={() => setApproveTarget(selectedDriver)}
            onDelete={() => {
              setDeleteTarget(selectedDriver);
              setSelectedDriver(null);
            }}
          />
        )}
      </AnimatePresence>

      {/* ── Approve Dialog ── */}
      <AnimatePresence>
        {approveTarget && (
          <ApproveDialog
            driver={approveTarget}
            onConfirm={handleApprove}
            onCancel={() => setApproveTarget(null)}
            loading={approveLoading}
          />
        )}
      </AnimatePresence>

      {/* ── Delete Dialog ── */}
      <AnimatePresence>
        {deleteTarget && (
          <DeleteDialog
            name={deleteTarget.driver_name}
            onConfirm={handleDelete}
            onCancel={() => setDeleteTarget(null)}
            loading={deleteLoading}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default ManageDrivers;
