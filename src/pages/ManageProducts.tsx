import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Package,
  Tag,
  DollarSign,
  Hash,
  Mail,
  FileText,
  Image as ImageIcon,
  Calendar,
  Percent,
  ChevronDown,
  Loader2,
  TrendingUp,
  BarChart2,
  Coins,
  AlertTriangle,
  X,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";

// const API_BASE = "https://irebegrp.com/irebe/index.php";
const API_BASE = import.meta.env.VITE_PUBLIC_API_URL;
const CATEGORIES = ["stocks", "currencies", "futures"] as const;
type Category = (typeof CATEGORIES)[number];

// ── Category meta ──────────────────────────────────────────────────────────
const CAT_META: Record<Category, { icon: React.ElementType; color: string; bg: string }> = {
  stocks:     { icon: BarChart2,   color: "text-blue-400",   bg: "bg-blue-400/15 border-blue-400/30"   },
  currencies: { icon: Coins,       color: "text-emerald-400", bg: "bg-emerald-400/15 border-emerald-400/30" },
  futures:    { icon: TrendingUp,  color: "text-orange-400", bg: "bg-orange-400/15 border-orange-400/30" },
};

interface Asset {
  id: string;
  stock_name: string;
  stock_code: string;
  category: string;
  quantity: string;
  price: string;
  image: string;
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
            <p className="text-base font-bold text-foreground">Delete Product</p>
            <p className="text-sm text-muted-foreground mt-1">
              Are you sure you want to delete <span className="font-semibold text-foreground">{name}</span>? This cannot be undone.
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
            Delete
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Field wrapper ──────────────────────────────────────────────────────────
function Field({
  label,
  icon: Icon,
  children,
}: {
  label: string;
  icon: React.ElementType;
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

const inputCls =
  "w-full px-3 py-2.5 rounded-xl bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary transition-colors";

// ── Main Component ─────────────────────────────────────────────────────────
const ManageProducts = () => {
  const navigate = useNavigate();
  const userId   = localStorage.getItem("user_id") ?? "";

  // form state
  const [stockName, setStockName]         = useState("");
  const [stockCode, setStockCode]         = useState("");
  const [category, setCategory]           = useState<Category | "">("");
  const [price, setPrice]                 = useState("");
  const [quantity, setQuantity]           = useState("");
  const [ownerEmail, setOwnerEmail]       = useState("");
  const [description, setDescription]     = useState("");
  const [imageUrl, setImageUrl]           = useState("");
  const [paybackDate, setPaybackDate]     = useState("");
  const [rate, setRate]                   = useState("");
  const [formLoading, setFormLoading]     = useState(false);
  const [formSuccess, setFormSuccess]     = useState(false);

  // assets list state
  const [assets, setAssets]               = useState<Asset[]>([]);
  const [assetsLoading, setAssetsLoading] = useState(true);

  // delete dialog
  const [deleteTarget, setDeleteTarget]   = useState<Asset | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // ── Load assets ────────────────────────────────────────────────────────
  const loadAssets = async () => {
    setAssetsLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/getAllStocks`, { user_id: userId });
      const data = res.data;
      if (Array.isArray(data)) {
        setAssets(
          data.map((a: any) => ({
            id:         a.id?.toString() ?? "",
            stock_name: a.stock_name ?? "",
            stock_code: a.stock_code ?? "",
            category:   a.category ?? "",
            quantity:   a.quantity?.toString() ?? "0",
            price:      a.price?.toString() ?? "0",
            image:      a.logo ?? a.image ?? "",
          }))
        );
      }
    } catch {
      toast.error("Failed to load products");
    } finally {
      setAssetsLoading(false);
    }
  };

  useEffect(() => { loadAssets(); }, []);

  // ── Add product ────────────────────────────────────────────────────────
  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stockName || !stockCode || !category || !price || !quantity || !ownerEmail || !description || !imageUrl) {
      toast.error("Please fill all fields");
      return;
    }
    if (category === "futures" && (!paybackDate || !rate)) {
      toast.error("Please fill payback date and rate for futures");
      return;
    }
    setFormLoading(true);
    try {
      const res = await axios.post(
        `${API_BASE}/addISEProduct`,
        {
          stockName,
          stockCode,
          category,
          quantity,
          price,
          paybackDate,
          rate,
          ownerEmail,
          description,
          image:  imageUrl,
          userID: Number(userId),
        },
        { headers: { "Content-Type": "application/json" } }
      );
      if (res.data?.status === "success") {
        toast.success(res.data?.message ?? "Product added!");
        setFormSuccess(true);
        setTimeout(() => setFormSuccess(false), 2500);
        // reset form
        setStockName(""); setStockCode(""); setCategory("");
        setPrice(""); setQuantity(""); setOwnerEmail("");
        setDescription(""); setImageUrl(""); setPaybackDate(""); setRate("");
        loadAssets();
      } else {
        toast.error(res.data?.message ?? "Failed to add product");
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Network error");
    } finally {
      setFormLoading(false);
    }
  };

  // ── Delete product ─────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      const res = await axios.post(
        `${API_BASE}/removeMallProduct`,
        { stockId: deleteTarget.id },
        { headers: { "Content-Type": "application/json" } }
      );
      if (res.data?.status === "success") {
        toast.success("Product deleted");
        setAssets((prev) => prev.filter((a) => a.id !== deleteTarget.id));
        setDeleteTarget(null);
      } else {
        toast.error(res.data?.message ?? "Delete failed");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setDeleteLoading(false);
    }
  };

  const catMeta = category ? CAT_META[category as Category] : null;

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
          <h2 className="text-lg font-display font-bold leading-tight">Manage Products</h2>
          <p className="text-xs text-muted-foreground">Add &amp; remove AllFx products</p>
        </div>
      </div>

      {/* ── Scrollable Body ── */}
      <div className="flex-1 overflow-y-auto px-4 pb-8 pt-3 space-y-6">

        {/* ══ ADD FORM ══════════════════════════════════════════════════════ */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-border rounded-2xl overflow-hidden"
        >
          {/* Card header */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-secondary/40">
            <Plus className="w-4 h-4 text-primary" />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Add New Product
            </p>
          </div>

          <form onSubmit={handleAdd} className="p-4 flex flex-col gap-4">

            {/* Stock Name */}
            <Field label="Stock Name" icon={Package}>
              <input
                className={inputCls}
                placeholder="e.g. Bank of Kigali"
                value={stockName}
                onChange={(e) => setStockName(e.target.value)}
              />
            </Field>

            {/* Stock Code */}
            <Field label="Stock Code" icon={Hash}>
              <input
                className={inputCls}
                placeholder="e.g. BK"
                value={stockCode}
                onChange={(e) => setStockCode(e.target.value.toUpperCase())}
              />
            </Field>

            {/* Category */}
            <Field label="Category" icon={Tag}>
              <div className="relative">
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as Category)}
                  className={`${inputCls} appearance-none pr-9`}
                >
                  <option value="" disabled>Select a category</option>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              </div>

              {/* Category badge */}
              <AnimatePresence>
                {catMeta && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold ${catMeta.bg}`}>
                      <catMeta.icon className={`w-3.5 h-3.5 ${catMeta.color}`} />
                      <span className={catMeta.color}>{category}</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </Field>

            {/* Futures-only fields */}
            <AnimatePresence>
              {category === "futures" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden flex flex-col gap-4"
                >
                  <Field label="Payback Date" icon={Calendar}>
                    <input
                      type="date"
                      className={inputCls}
                      value={paybackDate}
                      onChange={(e) => setPaybackDate(e.target.value)}
                    />
                  </Field>
                  <Field label="Rate / Month (%)" icon={Percent}>
                    <input
                      type="number"
                      className={inputCls}
                      placeholder="e.g. 5"
                      value={rate}
                      onChange={(e) => setRate(e.target.value)}
                    />
                  </Field>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Price */}
            <Field label="Price (RWF)" icon={DollarSign}>
              <input
                type="number"
                className={inputCls}
                placeholder="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </Field>

            {/* Quantity */}
            <Field label="Quantity / Shares" icon={Hash}>
              <input
                type="number"
                className={inputCls}
                placeholder="0"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </Field>

            {/* Owner Email */}
            <Field label="Owner Email" icon={Mail}>
              <input
                type="email"
                className={inputCls}
                placeholder="owner@example.com"
                value={ownerEmail}
                onChange={(e) => setOwnerEmail(e.target.value)}
              />
            </Field>

            {/* Description */}
            <Field label="Description" icon={FileText}>
              <textarea
                className={`${inputCls} resize-none`}
                rows={3}
                placeholder="Short description of this product…"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </Field>

            {/* Image URL */}
            <Field label="Image URL" icon={ImageIcon}>
              <input
                className={inputCls}
                placeholder="https://…"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
              />
              <AnimatePresence>
                {imageUrl && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="relative rounded-xl overflow-hidden border border-border mt-1 bg-secondary">
                      <img
                        src={imageUrl}
                        alt="preview"
                        className="w-full max-h-36 object-cover"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display = "none";
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setImageUrl("")}
                        className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/80 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </Field>

            {/* Submit */}
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
                <><Loader2 className="w-4 h-4 animate-spin" /> Adding…</>
              ) : formSuccess ? (
                <><CheckCircle2 className="w-4 h-4" /> Product Added!</>
              ) : (
                <><Plus className="w-4 h-4" /> Add Product</>
              )}
            </motion.button>
          </form>
        </motion.div>

        {/* ══ EXISTING PRODUCTS ═════════════════════════════════════════════ */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Existing Products
            </p>
            {!assetsLoading && (
              <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
                {assets.length}
              </span>
            )}
          </div>

          {assetsLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-20 rounded-xl bg-card border border-border animate-pulse" />
              ))}
            </div>
          ) : assets.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No products yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {assets.map((asset, i) => {
                const meta = CAT_META[asset.category as Category] ?? CAT_META.stocks;
                const Icon = meta.icon;
                return (
                  <motion.div
                    key={asset.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.035 }}
                    className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border"
                  >
                    {/* Logo */}
                    <div className="w-11 h-11 rounded-xl overflow-hidden bg-secondary flex-shrink-0 flex items-center justify-center border border-border">
                      {asset.image ? (
                        <img
                          src={asset.image}
                          alt={asset.stock_name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).style.display = "none";
                          }}
                        />
                      ) : (
                        <Icon className={`w-5 h-5 ${meta.color}`} />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-sm font-bold text-foreground truncate">
                          {asset.stock_name}
                        </p>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md border ${meta.bg} ${meta.color}`}>
                          {asset.stock_code}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {Number(asset.quantity).toLocaleString()} shares · RWF {Number(asset.price).toLocaleString()}
                      </p>
                    </div>

                    {/* Delete */}
                    <button
                      onClick={() => setDeleteTarget(asset)}
                      className="flex-shrink-0 w-8 h-8 rounded-lg bg-destructive/10 hover:bg-destructive/20 flex items-center justify-center transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </button>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Delete Dialog ── */}
      <AnimatePresence>
        {deleteTarget && (
          <DeleteDialog
            name={deleteTarget.stock_name}
            onConfirm={handleDelete}
            onCancel={() => setDeleteTarget(null)}
            loading={deleteLoading}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default ManageProducts;