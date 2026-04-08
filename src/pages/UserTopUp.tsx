import { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Upload,
  CheckCircle2,
  XCircle,
  Loader2,
  Eye,
  EyeOff,
  Lock,
  X,
  CreditCard,
  ImageIcon,
  User,
  ArrowRight,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
import { getCurrencies } from "@/lib/api-mobile-money";

const API_URL = import.meta.env.VITE_PUBLIC_API_URL;

const STEPS = {
  FORM: "form",
  CONFIRMING: "confirming",
  UPLOADING: "uploading",
  PROCESSING: "processing",
  SUCCESS: "success",
  ERROR: "error",
};

/* ════════════════════════════════════════════
   Main Component
════════════════════════════════════════════ */
const UserTopUp = () => {
  const navigate     = useNavigate();
  const userId       = sessionStorage.getItem("user_id") ?? "";
  const userEmail    = sessionStorage.getItem("email") ?? sessionStorage.getItem("userEmail") ?? `User #${userId}`;
  const fileInputRef = useRef(null);

  const [step, setStep]                 = useState(STEPS.FORM);
  const [amount, setAmount]             = useState("");           // raw numeric string, used for API
  const [amountDisplay, setAmountDisplay] = useState("");         // comma-formatted string, shown in input
  const [password, setPassword]         = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [proofFile, setProofFile]       = useState(null);
  const [proofPreview, setProofPreview] = useState(null);
  const [errorMsg, setErrorMsg]         = useState("");
  const [dragOver, setDragOver]         = useState(false);

  // ── Currency state ──
  const [currencies, setCurrencies]             = useState([]);
  const [currenciesLoading, setCurrenciesLoading] = useState(true);
  const [selectedAsset, setSelectedAsset]       = useState("");

  const selectedCurrency = currencies.find((c) => c.id?.toString() === selectedAsset) ?? null;

  // ── Amount formatting helpers ──
  const formatWithCommas = (str) => {
    const digits = str.replace(/\D/g, "");
    return digits ? Number(digits).toLocaleString("en-US") : "";
  };

  const handleAmountChange = (e) => {
    const raw = e.target.value.replace(/,/g, "");
    if (raw === "" || /^\d*$/.test(raw)) {
      setAmount(raw);
      setAmountDisplay(formatWithCommas(raw));
    }
  };

  const handleAmountKeyDown = (e) => {
    if (e.key === "Backspace") {
      const pos = e.target.selectionStart;
      // If cursor is right after a comma, skip over it and delete the digit before it
      if (pos > 0 && e.target.value[pos - 1] === ",") {
        e.preventDefault();
        const raw = amountDisplay.replace(/,/g, "");
        const rawPos = amountDisplay.slice(0, pos).replace(/,/g, "").length;
        const newRaw = raw.slice(0, rawPos - 1) + raw.slice(rawPos);
        setAmount(newRaw);
        setAmountDisplay(formatWithCommas(newRaw));
      }
    }
  };

  const setQuickAmount = (val) => {
    setAmount(String(val));
    setAmountDisplay(val.toLocaleString("en-US"));
  };

  // ── Load currencies ──
  useEffect(() => {
    setCurrenciesLoading(true);
    getCurrencies()
      .then((data) => {
        setCurrencies(data);
        if (data.length > 0) setSelectedAsset(data[0].id?.toString());
      })
      .catch(() => toast.error("Could not load currencies."))
      .finally(() => setCurrenciesLoading(false));
  }, []);

  // ── File helpers ──
  const handleFileSelect = (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast.error("Please select an image file.");
    if (file.size > 10 * 1024 * 1024)    return toast.error("Image must be under 10MB.");
    setProofFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setProofPreview(e.target.result);
    reader.readAsDataURL(file);
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    handleFileSelect(e.dataTransfer.files[0]);
  }, []);

  // ── Form submit ──
  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (!selectedAsset)                  return toast.error("Please select a currency.");
    if (!amount || Number(amount) <= 0)  return toast.error("Enter a valid amount.");
    if (!password)                        return toast.error("Password is required.");
    if (!proofFile)                       return toast.error("Please upload your payment proof.");
    setStep(STEPS.CONFIRMING);
  };

  // ── Confirm → upload → process ──
  const handleConfirm = async () => {
    try {
      setStep(STEPS.UPLOADING);

      const formData = new FormData();
      formData.append("image", proofFile);

      const uploadRes = await axios.post(
        "https://irebegroup.com/irebe/index.php/uploadImage",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      const imageName =
        uploadRes.data?.name       ||
        uploadRes.data?.image_name ||
        uploadRes.data?.filename;

      if (!imageName) throw new Error("Image upload failed — server returned no filename.");

      setStep(STEPS.PROCESSING);

      await axios.post(`${API_URL}/accountTransact`, {
        proof:          imageName,
        amount:         Number(amount),
        password,
        user_id:        userId,
        stock_id:       selectedAsset,
        stock_code:     "RWF",
        direction:      "in",
        reference_code: 1,
      });

      setStep(STEPS.SUCCESS);
    } catch (err) {
      setErrorMsg(err?.response?.data?.message || err?.message || "Something went wrong.");
      setStep(STEPS.ERROR);
    }
  };

  const reset = () => {
    setStep(STEPS.FORM);
    setAmount("");
    setAmountDisplay("");
    setPassword("");
    setProofFile(null);
    setProofPreview(null);
    setErrorMsg("");
  };

  const isLoading = step === STEPS.UPLOADING || step === STEPS.PROCESSING;

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
          <h2 className="text-lg font-display font-bold leading-tight">Account Top Up</h2>
          <p className="text-xs text-muted-foreground">Select currency &amp; upload proof</p>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex-1 overflow-y-auto px-4 pb-8 pt-2">
        <AnimatePresence mode="wait">

          {/* ════════════════ FORM ════════════════ */}
          {step === STEPS.FORM && (
            <motion.form
              key="form"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14 }}
              transition={{ duration: 0.22 }}
              onSubmit={handleFormSubmit}
              className="flex flex-col gap-5"
            >

              {/* ── Currency Selector ── */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Select Currency
                </label>
                <div className="relative">
                  <select
                    value={selectedAsset}
                    onChange={(e) => setSelectedAsset(e.target.value)}
                    className="w-full appearance-none px-3 py-2.5 rounded-xl bg-secondary border border-border text-sm focus:outline-none focus:border-primary transition-colors pr-9 disabled:opacity-60"
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
                  {currenciesLoading ? (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin pointer-events-none" />
                  ) : (
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  )}
                </div>

                {/* Selected currency badge */}
                <AnimatePresence>
                  {selectedCurrency && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-primary/10 border border-primary/20">
                        <CreditCard className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                        <span className="text-xs font-semibold text-primary truncate">
                          {selectedCurrency.stock_name}
                        </span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* ── Amount ── */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Amount
                </label>
                <div className="flex items-center gap-2 bg-secondary rounded-2xl px-4 border border-border focus-within:border-primary transition-colors">
                  <CreditCard className="w-4 h-4 text-primary flex-shrink-0" />
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="0"
                    value={amountDisplay}
                    onChange={handleAmountChange}
                    onKeyDown={handleAmountKeyDown}
                    className="flex-1 bg-transparent border-none outline-none text-foreground text-2xl font-bold py-4 w-full placeholder:text-muted-foreground"
                  />
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {[10000, 50000, 100000, 500000].map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setQuickAmount(v)}
                      className={`py-2 rounded-xl text-xs font-semibold border transition-colors ${
                        amount === String(v)
                          ? "bg-primary/20 border-primary/50 text-primary"
                          : "bg-secondary border-border text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {v.toLocaleString()}
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Password ── */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Password
                </label>
                <div className="flex items-center gap-2 bg-secondary rounded-2xl px-4 border border-border focus-within:border-primary transition-colors">
                  <Lock className="w-4 h-4 text-primary flex-shrink-0" />
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Your account password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="flex-1 bg-transparent border-none outline-none text-foreground text-sm py-4 w-full placeholder:text-muted-foreground"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((p) => !p)}
                    className="text-muted-foreground hover:text-foreground transition-colors p-1 flex-shrink-0"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* ── Payment Proof ── */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Payment Proof
                </label>

                {proofPreview ? (
                  <div className="relative rounded-2xl overflow-hidden border border-primary/30">
                    <img
                      src={proofPreview}
                      alt="Payment proof"
                      className="w-full max-h-52 object-cover block"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end justify-between p-3">
                      <span className="text-xs text-white/80 truncate max-w-[70%]">{proofFile?.name}</span>
                      <button
                        type="button"
                        onClick={() => { setProofFile(null); setProofPreview(null); }}
                        className="bg-destructive/80 hover:bg-destructive rounded-lg p-1.5 text-white transition-colors flex items-center justify-center"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    onDrop={handleDrop}
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center gap-3 cursor-pointer transition-colors ${
                      dragOver
                        ? "border-primary bg-primary/5"
                        : "border-border bg-secondary/50 hover:border-primary/40"
                    }`}
                  >
                    <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center">
                      <Upload className="w-5 h-5 text-primary" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-semibold text-foreground">Tap to upload proof</p>
                      <p className="text-xs text-muted-foreground mt-1">PNG, JPG, WEBP · max 10MB</p>
                    </div>
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleFileSelect(e.target.files?.[0])}
                />
              </div>

              <motion.button
                type="submit"
                whileTap={{ scale: 0.97 }}
                className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-bold text-sm tracking-wide mt-1 hover:opacity-90 transition-opacity"
              >
                Review Transfer
              </motion.button>
            </motion.form>
          )}

          {/* ════════════════ CONFIRM ════════════════ */}
          {step === STEPS.CONFIRMING && (
            <motion.div
              key="confirm"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14 }}
              transition={{ duration: 0.22 }}
              className="flex flex-col gap-4"
            >
              {/* Transfer flow */}
              <div className="bg-secondary rounded-2xl border border-border p-4 flex items-center justify-between gap-2">
                <div className="flex flex-col items-center gap-1 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                  <p className="text-xs font-semibold text-foreground truncate w-full text-center">{userEmail}</p>
                  <p className="text-[10px] text-muted-foreground">Sender</p>
                </div>
                <div className="flex flex-col items-center gap-1 flex-shrink-0">
                  <ArrowRight className="w-5 h-5 text-muted-foreground" />
                  <span className="text-xs font-bold text-primary">{Number(amount).toLocaleString()}</span>
                </div>
                <div className="flex flex-col items-center gap-1 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
                    <CreditCard className="w-5 h-5 text-primary" />
                  </div>
                  <p className="text-xs font-semibold text-foreground truncate w-full text-center">
                    {selectedCurrency?.stock_name ?? "Account"}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Currency</p>
                </div>
              </div>

              {/* Details card */}
              <div className="bg-secondary rounded-2xl border border-border p-5 flex flex-col gap-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Transfer Details
                </p>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Name</span>
                  <div className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-sm font-semibold text-foreground">{userEmail}</span>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Currency</span>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/10 border border-primary/20">
                    <CreditCard className="w-3.5 h-3.5 text-primary" />
                    <span className="text-xs font-semibold text-primary">
                      {selectedCurrency?.stock_name ?? "N/A"}
                    </span>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Amount</span>
                  <span className="text-sm font-bold text-foreground">{Number(amount).toLocaleString()}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Account ID</span>
                  <span className="text-sm font-semibold text-foreground">#{userId}</span>
                </div>

                <div className="border-t border-border" />

                <div className="flex justify-between items-start gap-3">
                  <span className="text-sm text-muted-foreground flex-shrink-0">Proof</span>
                  <div className="flex items-center gap-1.5 min-w-0">
                    <ImageIcon className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                    <span className="text-xs font-medium text-foreground truncate">
                      {proofFile?.name?.length > 28 ? proofFile.name.slice(0, 25) + "..." : proofFile?.name}
                    </span>
                  </div>
                </div>

                {proofPreview && (
                  <img
                    src={proofPreview}
                    alt="proof"
                    className="w-full max-h-40 object-cover rounded-xl border border-border"
                  />
                )}
              </div>

              <p className="text-xs text-muted-foreground text-center px-4">
                Your proof will be uploaded first, then the transfer will be submitted automatically.
              </p>

              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleConfirm}
                className="w-full py-4 rounded-2xl bg-green-600 hover:bg-green-500 text-white font-bold text-sm tracking-wide transition-colors"
              >
                Confirm Transfer
              </motion.button>

              <button
                onClick={() => setStep(STEPS.FORM)}
                className="w-full py-4 rounded-2xl border border-border text-muted-foreground text-sm font-semibold hover:text-foreground transition-colors"
              >
                Edit Details
              </button>
            </motion.div>
          )}

          {/* ════════════════ LOADING ════════════════ */}
          {isLoading && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center gap-5 min-h-64 py-16"
            >
              <div className="w-16 h-16 rounded-2xl bg-primary/15 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
              </div>
              <div className="text-center">
                <p className="text-base font-bold text-foreground">
                  {step === STEPS.UPLOADING ? "Uploading Proof..." : "Processing Transfer..."}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {step === STEPS.UPLOADING
                    ? "Securely uploading your payment proof"
                    : "Submitting your top-up request"}
                </p>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <div className={`flex items-center gap-1.5 text-xs font-semibold ${step === STEPS.UPLOADING ? "text-primary" : "text-green-500"}`}>
                  {step === STEPS.UPLOADING
                    ? <Loader2 className="w-3 h-3 animate-spin" />
                    : <CheckCircle2 className="w-3 h-3" />}
                  Upload proof
                </div>
                <ArrowRight className="w-3 h-3 text-muted-foreground" />
                <div className={`flex items-center gap-1.5 text-xs font-semibold ${step === STEPS.PROCESSING ? "text-primary" : "text-muted-foreground"}`}>
                  {step === STEPS.PROCESSING && <Loader2 className="w-3 h-3 animate-spin" />}
                  Submit transfer
                </div>
              </div>
            </motion.div>
          )}

          {/* ════════════════ SUCCESS ════════════════ */}
          {step === STEPS.SUCCESS && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center gap-5 min-h-64 py-16 text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 14, delay: 0.1 }}
                className="w-20 h-20 rounded-2xl bg-green-500/15 border border-green-500/30 flex items-center justify-center"
              >
                <CheckCircle2 className="w-9 h-9 text-green-500" />
              </motion.div>
              <div>
                <p className="text-xl font-bold text-foreground">Transfer Submitted!</p>
                <p className="text-sm text-muted-foreground mt-2 max-w-xs">
                  Hi <span className="text-foreground font-semibold">{userEmail}</span>, your top-up of{" "}
                  <span className="text-foreground font-semibold">{Number(amount).toLocaleString()}</span>{" "}
                  {selectedCurrency && (
                    <>in <span className="text-foreground font-semibold">{selectedCurrency.stock_name}</span> </>
                  )}
                  is under review.
                </p>
              </div>
              {selectedCurrency && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-primary/10 border border-primary/20">
                  <CreditCard className="w-3.5 h-3.5 text-primary" />
                  <span className="text-xs font-semibold text-primary">{selectedCurrency.stock_name}</span>
                </div>
              )}
              <button
                onClick={() => navigate(-1)}
                className="px-8 py-3 rounded-xl bg-green-500/15 border border-green-500/30 text-green-500 font-bold text-sm hover:bg-green-500/25 transition-colors"
              >
                Done
              </button>
            </motion.div>
          )}

          {/* ════════════════ ERROR ════════════════ */}
          {step === STEPS.ERROR && (
            <motion.div
              key="error"
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center gap-5 min-h-64 py-16 text-center"
            >
              <div className="w-20 h-20 rounded-2xl bg-destructive/15 border border-destructive/25 flex items-center justify-center">
                <XCircle className="w-9 h-9 text-destructive" />
              </div>
              <div>
                <p className="text-xl font-bold text-foreground">Transfer Failed</p>
                <p className="text-sm text-muted-foreground mt-2 max-w-xs">{errorMsg}</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={reset}
                  className="px-6 py-3 rounded-xl border border-border text-muted-foreground text-sm font-semibold hover:text-foreground transition-colors"
                >
                  Start Over
                </button>
                <button
                  onClick={handleConfirm}
                  className="px-6 py-3 rounded-xl bg-destructive/15 border border-destructive/30 text-destructive text-sm font-semibold hover:bg-destructive/25 transition-colors"
                >
                  Retry
                </button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
};

export default UserTopUp;