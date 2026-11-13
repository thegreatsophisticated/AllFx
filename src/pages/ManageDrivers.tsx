import { useState, useEffect, useMemo, useRef } from "react";
import type { ChangeEvent, FormEvent } from "react";
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
  Search,
  User,
  Radio,
  ImagePlus,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { toast } from "sonner";

const API_BASE = "https://irebegroup.com/irebe/index.php";
const JSON_HEADERS = { "Content-Type": "application/json" };

/**
 * Which driver field the backend expects in `approveDriver.driver_id`.
 * getAllDrivers returns ID (drivers-table row) and user_id (account).
 * The backend answered "Driver does not exist" for ID, so we send user_id.
 * If Postman shows the backend wants the row ID instead, flip this to "id".
 */
const APPROVE_ID_FIELD: "user_id" | "id" = "user_id";

/* ════════════════════════════════════════════
   API (see the Fleets docs)

   POST /addDriver      { userID, national_id, license_id, plate_no, chassis_no,
                          sim_no, api_id, fare_rate, location, status,
                          image1, image2 }   → driver record + car in ONE call
   POST /removeDriver   { userID }             → driver + associated car(s)
   POST /approveDriver  { userID (approver), driver_id, status: valid|reject }
   POST /getAllDrivers  (no body)              → { message, users: [...] }
                          national_id / license_id are uploaded image filenames,
                          served at ${API_BASE}/<filename>
   POST /uploadImage    FormData("image")      → filename used in image1/image2
════════════════════════════════════════════ */

// ── Types ──────────────────────────────────────────────────────────────────
interface Driver {
  id: string; // drivers-table row ID ("ID" in the API)
  user_id: string; // the driver's account ID
  national_id: string;
  license_id: string;
  status: string;
  driver_name: string;
  plate_no: string; // shown when the API includes the car
}

interface CarItem {
  id: string;
  plate_no: string;
  chassis_no: string;
  sim_no: string;
  fare_rate: number;
  api_id: string;
  location: string;
  status: number; // 1 = active
}

interface Transaction {
  id: string;
  amount?: string | number;
  date?: string;
  description?: string;
  type?: string;
}

type DriverForm = {
  userID: string;
  national_id: string;
  license_id: string;
  plate_no: string;
  chassis_no: string;
  sim_no: string;
  api_id: string;
  fare_rate: string;
  location: string;
};

type TabKey = "add" | "drivers" | "cars";
type StatusFilter = "all" | "Pending" | "Approved" | "Rejected";
type AddPhase = "idle" | "uploading" | "saving" | "done";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Raw = Record<string, any>;

// ── Helpers ────────────────────────────────────────────────────────────────
/**
 * Status mapping:
 *   "1" / valid / approved  → Approved
 *   "2" / reject / rejected → Rejected   (confirm with backend what a rejected row stores)
 *   "0" / pending / other   → Pending    (new registrations arrive as "0")
 */
function getStatusMeta(status: string) {
  const s = status.toLowerCase();
  if (s === "1" || s === "valid" || s === "approved") {
    return {
      label: "Approved",
      icon: ShieldCheck,
      color: "text-emerald-400",
      bg: "bg-emerald-400/15 border-emerald-400/30",
    };
  }
  if (s === "2" || s === "reject" || s === "rejected") {
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

/**
 * The mobile app uploads photos of the national ID and driving license and
 * stores the server filename in national_id / license_id. Those files are
 * served from `${API_BASE}/<filename>`.
 */
const isImageName = (v: string) => /\.(png|jpe?g|gif|webp|heic)$/i.test(v);
const imageUrl = (v: string) =>
  /^https?:\/\//i.test(v) ? v : `${API_BASE}/${encodeURIComponent(v)}`;

/** The ID the backend wants for approve/reject */
const approvalId = (d: Driver) => (APPROVE_ID_FIELD === "user_id" ? d.user_id : d.id);

const errMsg = (err: unknown, fallback: string): string => {
  if (axios.isAxiosError(err)) {
    return err.response?.data?.message ?? err.message ?? fallback;
  }
  if (err instanceof Error) return err.message;
  return fallback;
};

/** Upload one image, return the filename the server stored. */
const uploadImage = async (file: File): Promise<string> => {
  const fd = new FormData();
  fd.append("image", file);
  const res = await axios.post(`${API_BASE}/uploadImage`, fd, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  const name = res.data?.name || res.data?.image_name || res.data?.filename;
  if (!name) throw new Error("Image upload failed — server returned no filename.");
  return name as string;
};

const inputCls =
  "w-full px-3 py-2.5 rounded-xl bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary transition-colors";

const EMPTY_FORM = (userID: string): DriverForm => ({
  userID,
  national_id: "",
  license_id: "",
  plate_no: "",
  chassis_no: "",
  sim_no: "",
  api_id: "",
  fare_rate: "",
  location: "",
});

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
      <button
        type="button"
        onClick={onDismiss}
        className="text-destructive/60 hover:text-destructive transition-colors flex-shrink-0"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </motion.div>
  );
}

function Field({
  label,
  icon: Icon,
  children,
}: {
  label: string;
  icon: LucideIcon;
  children: React.ReactNode;
}) {
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

function SectionHeader({ icon: Icon, title }: { icon: LucideIcon; title: string }) {
  return (
    <div className="flex items-center gap-2 pt-1">
      <Icon className="w-4 h-4 text-primary" />
      <p className="text-xs font-bold text-foreground uppercase tracking-wide">{title}</p>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}

function ImagePicker({
  label,
  file,
  onChange,
  disabled,
}: {
  label: string;
  file: File | null;
  onChange: (f: File | null) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const handleSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (!f.type.startsWith("image/")) return void toast.error("Please select an image file.");
    if (f.size > 10 * 1024 * 1024) return void toast.error("Image must be under 10MB.");
    onChange(f);
  };

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
        {label}
      </span>
      {preview ? (
        <div className="relative rounded-xl overflow-hidden border border-primary/30 h-28">
          <img src={preview} alt={label} className="w-full h-full object-cover" />
          <button
            type="button"
            disabled={disabled}
            onClick={() => onChange(null)}
            className="absolute top-1.5 right-1.5 bg-destructive/80 hover:bg-destructive rounded-lg p-1 text-white transition-colors"
            aria-label={`Remove ${label}`}
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          className="h-28 rounded-xl border-2 border-dashed border-border bg-secondary/50 hover:border-primary/40 transition-colors flex flex-col items-center justify-center gap-1.5 text-muted-foreground"
        >
          <ImagePlus className="w-5 h-5 text-primary" />
          <span className="text-[11px] font-semibold">Tap to upload</span>
        </button>
      )}
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleSelect} />
    </div>
  );
}

// ── Document image components ───────────────────────────────────────────────
type OpenImage = (src: string, title: string) => void;

/** Large preview of a document photo (tap anywhere to close). */
function ImageLightbox({ src, title, onClose }: { src: string; title: string; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-black/85 backdrop-blur-sm p-4 gap-3"
    >
      <div className="w-full max-w-lg flex items-center justify-between">
        <p className="text-sm font-semibold text-white">{title}</p>
        <button
          type="button"
          onClick={onClose}
          className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
          aria-label="Close preview"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <img
        src={src}
        alt={title}
        onClick={(e) => e.stopPropagation()}
        className="max-w-full max-h-[80vh] rounded-xl object-contain"
      />
      <a
        href={src}
        target="_blank"
        rel="noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="text-xs text-white/70 underline"
      >
        Open original
      </a>
    </motion.div>
  );
}

/** Shows the stored document as an image; falls back to plain text for real ID numbers. */
function DocImage({ label, value, onOpen }: { label: string; value: string; onOpen: OpenImage }) {
  const [failed, setFailed] = useState(false);
  const showImage = isImageName(value) && !failed;

  return (
    <div className="flex flex-col gap-1.5 min-w-0">
      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
        {label}
      </span>
      {showImage ? (
        <button
          type="button"
          onClick={() => onOpen(imageUrl(value), label)}
          className="h-28 rounded-xl overflow-hidden border border-border bg-secondary hover:border-primary/40 transition-colors"
        >
          <img
            src={imageUrl(value)}
            alt={label}
            loading="lazy"
            onError={() => setFailed(true)}
            className="w-full h-full object-cover"
          />
        </button>
      ) : (
        <div className="px-3 py-2.5 rounded-xl bg-secondary border border-border">
          <p className="text-sm font-bold text-foreground break-all">{value || "—"}</p>
          {failed && <p className="text-[10px] text-destructive mt-1">Image could not be loaded</p>}
        </div>
      )}
    </div>
  );
}

/** Small inline version for list rows. */
function DocThumb({ label, value }: { label: string; value: string }) {
  const [failed, setFailed] = useState(false);
  if (isImageName(value) && !failed) {
    return (
      <span className="flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground">
        <img
          src={imageUrl(value)}
          alt={label}
          loading="lazy"
          onError={() => setFailed(true)}
          className="w-9 h-7 rounded-md object-cover border border-border"
        />
        {label}
      </span>
    );
  }
  return (
    <span className="text-xs text-muted-foreground truncate max-w-[45%]">
      {label}: {value || "—"}
    </span>
  );
}

// ── Approve / Reject Dialog ────────────────────────────────────────────────
function ApproveDialog({
  driver,
  onConfirm,
  onCancel,
  loading,
  action,
  error,
  onDismissError,
  onOpenImage,
}: {
  driver: Driver;
  onConfirm: (status: "valid" | "reject") => void;
  onCancel: () => void;
  loading: boolean;
  action: "valid" | "reject" | null; // which button was clicked
  error: string | null;
  onDismissError: () => void;
  onOpenImage: OpenImage;
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

          <div className="grid grid-cols-2 gap-3">
            <DocImage label="National ID" value={driver.national_id} onOpen={onOpenImage} />
            <DocImage label="License" value={driver.license_id} onOpen={onOpenImage} />
          </div>

          <AnimatePresence>
            {error && <ErrorBanner message={error} onDismiss={onDismissError} />}
          </AnimatePresence>
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
            {loading && action === "reject" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserX className="w-3.5 h-3.5" />}
            Reject
          </button>
          <button
            onClick={() => onConfirm("valid")}
            disabled={loading}
            className="flex-1 h-11 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 text-sm font-semibold disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading && action === "valid" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserCheck className="w-3.5 h-3.5" />}
            Approve
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Delete Confirm Dialog ──────────────────────────────────────────────────
function DeleteDialog({
  name,
  onConfirm,
  onCancel,
  loading,
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
              Remove <span className="font-semibold text-foreground">{name}</span> and their
              associated car(s)? This cannot be undone.
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
  onOpenImage,
}: {
  driver: Driver;
  onClose: () => void;
  onReview: () => void;
  onDelete: () => void;
  onOpenImage: OpenImage;
}) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        // `userID` is the account ID, so use user_id (not the drivers-table row ID)
        const res = await axios.post(
          `${API_BASE}/getDriverTransactions`,
          { userID: driver.user_id },
          { headers: JSON_HEADERS }
        );
        const data = res.data;
        const list: Raw[] = Array.isArray(data)
          ? data
          : Array.isArray(data?.transactions)
          ? data.transactions
          : [];
        setTransactions(
          list.map((t) => ({
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
    void load();
  }, [driver.user_id]);

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
          aria-label="Review driver"
        >
          <BadgeCheck className="w-3.5 h-3.5 text-primary" />
        </button>
        <button
          onClick={onDelete}
          className="w-8 h-8 rounded-lg bg-destructive/10 hover:bg-destructive/20 flex items-center justify-center transition-colors"
          aria-label="Remove driver"
        >
          <Trash2 className="w-3.5 h-3.5 text-destructive" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-8 space-y-5">
        <div className="bg-card border border-border rounded-2xl p-4 flex flex-col gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border ${meta.bg} ${meta.color}`}
            >
              <StatusIcon className="w-3 h-3" />
              {meta.label}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {driver.plate_no && <InfoTile label="Car plate" value={driver.plate_no} />}
            <InfoTile label="Driver ID" value={`#${driver.id}`} />
            <InfoTile label="User ID" value={`#${driver.user_id}`} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <DocImage label="National ID" value={driver.national_id} onOpen={onOpenImage} />
            <DocImage label="License" value={driver.license_id} onOpen={onOpenImage} />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Transactions
            </p>
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
                  key={`${tx.id}-${i}`}
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
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
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

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 px-3 py-2.5 rounded-xl bg-secondary border border-border min-w-0">
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="text-sm font-bold text-foreground truncate" title={value}>
        {value}
      </p>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────
const ManageDrivers = () => {
  const navigate = useNavigate();
  // No silent fallback to admin "1": an empty ID blocks approvals instead
  const userId = sessionStorage.getItem("user_id") ?? "";

  const [activeTab, setActiveTab] = useState<TabKey>("add");

  // Add Driver (+ car) form
  const [form, setForm] = useState<DriverForm>(EMPTY_FORM(userId));
  const [image1, setImage1] = useState<File | null>(null);
  const [image2, setImage2] = useState<File | null>(null);
  const [addPhase, setAddPhase] = useState<AddPhase>("idle");
  const [formError, setFormError] = useState<string | null>(null);

  // Data
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [driversLoading, setDriversLoading] = useState(true);
  const [cars, setCars] = useState<CarItem[]>([]);
  const [carsLoading, setCarsLoading] = useState(true);

  // List filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  // Detail sheet + dialogs
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [approveTarget, setApproveTarget] = useState<Driver | null>(null);
  const [approveLoading, setApproveLoading] = useState(false);
  const [approveAction, setApproveAction] = useState<"valid" | "reject" | null>(null);
  const [approveError, setApproveError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Driver | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [preview, setPreview] = useState<{ src: string; title: string } | null>(null);
  const openPreview: OpenImage = (src, title) => setPreview({ src, title });

  const addBusy = addPhase === "uploading" || addPhase === "saving";

  const bind = (key: keyof DriverForm) => ({
    value: form[key],
    onChange: (e: ChangeEvent<HTMLInputElement>) =>
      setForm((p) => ({ ...p, [key]: e.target.value })),
    disabled: addBusy,
    className: inputCls,
  });

  const openApprove = (driver: Driver) => {
    setApproveError(null);
    setApproveTarget(driver);
  };

  const closeApprove = () => {
    setApproveTarget(null);
    setApproveError(null);
  };

  // ── Load drivers (POST /getAllDrivers, no body) ───────────────────────────
  const loadDrivers = async () => {
    setDriversLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/getAllDrivers`, {}, { headers: JSON_HEADERS });
      const list: unknown = Array.isArray(res.data) ? res.data : res.data?.users ?? res.data?.drivers;
      if (Array.isArray(list)) {
        setDrivers(
          (list as Raw[]).map((d) => {
            const rowId = (d.ID ?? d.id ?? "").toString();
            return {
              id: rowId,
              user_id: (d.user_id ?? "").toString(),
              national_id: (d.national_id ?? "").toString(),
              license_id: (d.license_id ?? "").toString(),
              status: (d.status ?? "0").toString(),
              driver_name: d.driver_name ?? d.name ?? `Driver #${rowId}`,
              plate_no: (d.plate_no ?? d.car?.plate_no ?? "").toString(),
            };
          })
        );
      } else {
        setDrivers([]);
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
      const res = await axios.post(`${API_BASE}/getCars`, { userID: userId }, { headers: JSON_HEADERS });
      const list: unknown = res.data?.cars ?? res.data;
      if (Array.isArray(list)) {
        setCars(
          (list as Raw[]).map((c) => ({
            id: (c.ID ?? c.id ?? "").toString(),
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
    void loadDrivers();
    void loadCars();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Add driver + car (one call) ───────────────────────────────────────────
  const validateForm = (): string | null => {
    if (!form.userID.trim()) return "User ID is required";
    if (!form.national_id.trim() || !form.license_id.trim()) {
      return "National ID and license ID are required";
    }
    const required: (keyof DriverForm)[] = ["plate_no", "chassis_no", "sim_no", "api_id", "location"];
    if (required.some((k) => !form[k].trim())) return "All car fields are required";
    const fare = Number(form.fare_rate);
    if (!form.fare_rate.trim() || Number.isNaN(fare) || fare <= 0) {
      return "Fare rate must be a valid number greater than zero";
    }
    if (!image1 || !image2) return "Please upload both car photos";
    return null;
  };

  const handleAdd = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (addBusy) return;
    setFormError(null);

    const problem = validateForm();
    if (problem || !image1 || !image2) {
      const msg = problem ?? "Please upload both car photos";
      setFormError(msg);
      toast.error(msg);
      return;
    }

    try {
      setAddPhase("uploading");
      const [name1, name2] = await Promise.all([uploadImage(image1), uploadImage(image2)]);

      setAddPhase("saving");
      const res = await axios.post(
        `${API_BASE}/addDriver`,
        {
          userID: Number(form.userID) || form.userID.trim(),
          national_id: form.national_id.trim(),
          license_id: form.license_id.trim(),
          plate_no: form.plate_no.trim().toUpperCase(),
          chassis_no: form.chassis_no.trim(),
          sim_no: form.sim_no.trim(),
          api_id: form.api_id.trim(),
          fare_rate: Number(form.fare_rate),
          location: form.location.trim(),
          status: "1", // car active (matches the car list: 1 = active)
          image1: name1,
          image2: name2,
        },
        { headers: JSON_HEADERS }
      );

      if (res.data?.status === "success") {
        toast.success(res.data?.message ?? "Driver and car registered");
        setAddPhase("done");
        setForm(EMPTY_FORM(userId));
        setImage1(null);
        setImage2(null);
        void loadDrivers();
        void loadCars();
        setTimeout(() => {
          setAddPhase("idle");
          setActiveTab("drivers");
        }, 1200);
      } else {
        throw new Error(res.data?.message ?? "Failed to add driver");
      }
    } catch (err) {
      const msg = errMsg(err, "Network error — please try again");
      setFormError(msg);
      toast.error(msg);
      setAddPhase("idle");
    }
  };

  // ── Approve / Reject ──────────────────────────────────────────────────────
  const handleApprove = async (status: "valid" | "reject") => {
    if (!approveTarget) return;
    setApproveError(null);

    if (!userId) {
      setApproveError("Your session has no user ID. Please log in again.");
      return;
    }
    const targetId = approvalId(approveTarget);
    if (!targetId) {
      setApproveError("This driver record has no ID to approve.");
      return;
    }

    setApproveAction(status);
    setApproveLoading(true);
    try {
      const res = await axios.post(
        `${API_BASE}/approveDriver`,
        {
          userID: userId, // the approver (admin)
          driver_id: targetId,
          status,
        },
        { headers: JSON_HEADERS }
      );

      if (res.data?.status === "success") {
        toast.success(res.data?.message ?? (status === "valid" ? "Driver approved" : "Driver rejected"));
        closeApprove();
        setSelectedDriver(null);
        void loadDrivers(); // server is the source of truth for the status value
      } else {
        setApproveError(res.data?.message ?? "Action failed");
      }
    } catch (err) {
      setApproveError(errMsg(err, "Network error"));
    } finally {
      setApproveLoading(false);
      setApproveAction(null);
    }
  };

  // ── Remove driver (+ their car(s)) ────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteTarget) return;
    if (!deleteTarget.user_id) {
      toast.error("This driver has no user ID to remove.");
      return;
    }
    setDeleteLoading(true);
    try {
      const res = await axios.post(
        `${API_BASE}/removeDriver`,
        { userID: Number(deleteTarget.user_id) || deleteTarget.user_id },
        { headers: JSON_HEADERS }
      );
      if (res.data?.status === "success") {
        toast.success(res.data?.message ?? "Driver removed");
        setDrivers((prev) => prev.filter((d) => d.id !== deleteTarget.id));
        if (selectedDriver?.id === deleteTarget.id) setSelectedDriver(null);
        setDeleteTarget(null);
        void loadCars(); // their car(s) were removed too
      } else {
        toast.error(res.data?.message ?? "Could not remove driver");
      }
    } catch (err) {
      toast.error(errMsg(err, "Network error"));
    } finally {
      setDeleteLoading(false);
    }
  };

  // ── Filtered drivers ──────────────────────────────────────────────────────
  const filteredDrivers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return drivers.filter((d) => {
      if (statusFilter !== "all" && getStatusMeta(d.status).label !== statusFilter) return false;
      if (!q) return true;
      return [d.driver_name, d.national_id, d.license_id, d.plate_no].some((v) =>
        v.toLowerCase().includes(q)
      );
    });
  }, [drivers, search, statusFilter]);

  const pendingCount = useMemo(
    () => drivers.filter((d) => getStatusMeta(d.status).label === "Pending").length,
    [drivers]
  );

  const TABS: { key: TabKey; label: string; icon: LucideIcon }[] = [
    { key: "add", label: "Add", icon: Plus },
    { key: "drivers", label: "Drivers", icon: Users },
    { key: "cars", label: "Cars", icon: Car },
  ];

  const FILTERS: StatusFilter[] = ["all", "Pending", "Approved", "Rejected"];

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
          <p className="text-xs text-muted-foreground">Register, approve &amp; review drivers and their cars</p>
        </div>
      </div>

      {/* ── Tab Bar ── */}
      <div className="flex gap-1 px-4 pt-2 pb-1 flex-shrink-0">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`relative flex-1 flex items-center justify-center gap-1.5 h-9 rounded-xl text-xs font-semibold transition-all ${
              activeTab === key
                ? "bg-primary text-primary-foreground shadow shadow-primary/20"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
            {key === "drivers" && pendingCount > 0 && (
              <span className="min-w-4 h-4 px-1 rounded-full bg-orange-400 text-[9px] font-bold text-white flex items-center justify-center">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Scrollable Body ── */}
      <div className="flex-1 overflow-y-auto px-4 pb-8 pt-3 space-y-6">
        <AnimatePresence mode="wait">
          {/* ══ ADD DRIVER + CAR ════════════════════════════════════════════ */}
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
                  Register Driver &amp; Car
                </p>
              </div>

              <form onSubmit={handleAdd} noValidate className="p-4 flex flex-col gap-4">
                <AnimatePresence>
                  {formError && <ErrorBanner message={formError} onDismiss={() => setFormError(null)} />}
                </AnimatePresence>

                <SectionHeader icon={User} title="Driver" />

                <Field label="User ID" icon={User}>
                  <input inputMode="numeric" placeholder="User account ID" {...bind("userID")} />
                </Field>
                <Field label="National ID" icon={CreditCard}>
                  <input placeholder="e.g. 1199780012345678" {...bind("national_id")} />
                </Field>
                <Field label="License ID" icon={Hash}>
                  <input placeholder="e.g. DL-2024-001" {...bind("license_id")} />
                </Field>

                <SectionHeader icon={Car} title="Car" />

                <Field label="Plate number" icon={Car}>
                  <input placeholder="e.g. RAB123A" autoCapitalize="characters" {...bind("plate_no")} />
                </Field>
                <Field label="Chassis number" icon={Cpu}>
                  <input placeholder="Chassis number" {...bind("chassis_no")} />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="SIM number" icon={Phone}>
                    <input inputMode="tel" placeholder="SIM no." {...bind("sim_no")} />
                  </Field>
                  <Field label="Tracker ID" icon={Radio}>
                    <input placeholder="IoT tracker id" {...bind("api_id")} />
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Fare rate (RWF)" icon={Gauge}>
                    <input inputMode="decimal" placeholder="e.g. 150" {...bind("fare_rate")} />
                  </Field>
                  <Field label="Location" icon={MapPin}>
                    <input placeholder="e.g. Kigali" {...bind("location")} />
                  </Field>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <ImagePicker label="Car photo 1" file={image1} onChange={setImage1} disabled={addBusy} />
                  <ImagePicker label="Car photo 2" file={image2} onChange={setImage2} disabled={addBusy} />
                </div>

                <motion.button
                  type="submit"
                  whileTap={{ scale: 0.98 }}
                  disabled={addBusy}
                  className={`w-full h-12 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-lg ${
                    addPhase === "done"
                      ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-500"
                      : "bg-primary text-primary-foreground shadow-primary/20"
                  } disabled:opacity-60`}
                >
                  {addPhase === "uploading" ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Uploading photos…
                    </>
                  ) : addPhase === "saving" ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Registering…
                    </>
                  ) : addPhase === "done" ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" /> Driver Registered!
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" /> Register Driver &amp; Car
                    </>
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
              className="flex flex-col gap-3"
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Registered Drivers
                </p>
                {!driversLoading && (
                  <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
                    {filteredDrivers.length}
                    {filteredDrivers.length !== drivers.length ? ` / ${drivers.length}` : ""}
                  </span>
                )}
              </div>

              {/* Search */}
              <div className="flex items-center gap-2 bg-secondary rounded-xl px-3 border border-border focus-within:border-primary transition-colors">
                <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search name, ID, license or plate"
                  className="flex-1 bg-transparent border-none outline-none text-sm text-foreground py-2.5 placeholder:text-muted-foreground/60"
                />
                {search && (
                  <button onClick={() => setSearch("")} className="text-muted-foreground hover:text-foreground">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Status filter */}
              <div className="flex gap-1.5 overflow-x-auto">
                {FILTERS.map((f) => (
                  <button
                    key={f}
                    onClick={() => setStatusFilter(f)}
                    className={`px-3 py-1.5 rounded-full text-[11px] font-semibold border whitespace-nowrap transition-colors ${
                      statusFilter === f
                        ? "bg-primary/15 border-primary/40 text-primary"
                        : "bg-secondary border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {f === "all" ? "All" : f}
                  </button>
                ))}
              </div>

              {driversLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-20 rounded-xl bg-card border border-border animate-pulse" />
                  ))}
                </div>
              ) : filteredDrivers.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">
                    {drivers.length === 0 ? "No drivers registered yet" : "No drivers match your filters"}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredDrivers.map((driver, i) => {
                    const meta = getStatusMeta(driver.status);
                    const StatusIcon = meta.icon;
                    return (
                      <motion.div
                        key={driver.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(i, 10) * 0.03 }}
                        className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border cursor-pointer active:scale-[0.99] transition-transform"
                        onClick={() => setSelectedDriver(driver)}
                      >
                        <div className="w-11 h-11 rounded-xl bg-secondary flex-shrink-0 flex items-center justify-center border border-border">
                          <Users className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="text-sm font-bold text-foreground truncate">{driver.driver_name}</p>
                            <span
                              className={`flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md border ${meta.bg} ${meta.color}`}
                            >
                              <StatusIcon className="w-2.5 h-2.5" />
                              {meta.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-1">
                            <DocThumb label="NID" value={driver.national_id} />
                            <DocThumb label="License" value={driver.license_id} />
                          </div>
                          {driver.plate_no && (
                            <p className="flex items-center gap-1 text-[11px] text-muted-foreground mt-0.5">
                              <Car className="w-3 h-3" />
                              {driver.plate_no}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => openApprove(driver)}
                            className="w-8 h-8 rounded-lg bg-primary/10 hover:bg-primary/20 flex items-center justify-center transition-colors"
                            aria-label="Review driver"
                          >
                            <BadgeCheck className="w-3.5 h-3.5 text-primary" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(driver)}
                            className="w-8 h-8 rounded-lg bg-destructive/10 hover:bg-destructive/20 flex items-center justify-center transition-colors"
                            aria-label="Remove driver"
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
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Fleet Cars</p>
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
                      transition={{ delay: Math.min(i, 10) * 0.03 }}
                      className="p-3 rounded-xl bg-card border border-border"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-secondary flex-shrink-0 flex items-center justify-center border border-border">
                          <Car className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-bold text-foreground">{car.plate_no}</p>
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md border ${
                                car.status === 1
                                  ? "bg-emerald-400/15 border-emerald-400/30 text-emerald-400"
                                  : "bg-secondary border-border text-muted-foreground"
                              }`}
                            >
                              {car.status === 1 ? "Active" : "Inactive"}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">
                            {car.api_id} · RWF {car.fare_rate.toLocaleString()}/trip
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-1.5 mt-2.5">
                        <CarPill icon={Cpu} text={car.chassis_no} />
                        <CarPill icon={Phone} text={car.sim_no} />
                        <CarPill icon={MapPin} text={car.location} />
                        <CarPill icon={Gauge} text={`RWF ${car.fare_rate}/trip`} />
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
            onReview={() => openApprove(selectedDriver)}
            onDelete={() => {
              setDeleteTarget(selectedDriver);
              setSelectedDriver(null);
            }}
            onOpenImage={openPreview}
          />
        )}
      </AnimatePresence>

      {/* ── Approve Dialog ── */}
      <AnimatePresence>
        {approveTarget && (
          <ApproveDialog
            driver={approveTarget}
            onConfirm={(s) => void handleApprove(s)}
            onCancel={closeApprove}
            loading={approveLoading}
            action={approveAction}
            error={approveError}
            onDismissError={() => setApproveError(null)}
            onOpenImage={openPreview}
          />
        )}
      </AnimatePresence>

      {/* ── Delete Dialog ── */}
      <AnimatePresence>
        {deleteTarget && (
          <DeleteDialog
            name={deleteTarget.driver_name}
            onConfirm={() => void handleDelete()}
            onCancel={() => setDeleteTarget(null)}
            loading={deleteLoading}
          />
        )}
      </AnimatePresence>

      {/* ── Document image preview ── */}
      <AnimatePresence>
        {preview && <ImageLightbox src={preview.src} title={preview.title} onClose={() => setPreview(null)} />}
      </AnimatePresence>
    </div>
  );
};

function CarPill({ icon: Icon, text }: { icon: LucideIcon; text: string }) {
  if (!text) return null;
  return (
    <span className="flex items-center gap-1 text-[11px] text-muted-foreground px-2 py-1 rounded-lg bg-secondary border border-border">
      <Icon className="w-3 h-3" />
      {text}
    </span>
  );
}

export default ManageDrivers;
