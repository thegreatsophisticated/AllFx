// import { useState, useRef, useCallback, useEffect } from "react";
// import { useNavigate } from "react-router-dom";
// import { motion, AnimatePresence } from "framer-motion";
// import {
//   ArrowLeft,
//   Upload,
//   CheckCircle2,
//   XCircle,
//   Loader2,
//   Eye,
//   EyeOff,
//   Lock,
//   X,
//   CreditCard,
//   ImageIcon,
//   User,
//   ArrowRight,
//   ChevronDown,
// } from "lucide-react";
// import { toast } from "sonner";
// import axios from "axios";
// import { getCurrencies } from "@/lib/api-mobile-money";

// const API_URL = import.meta.env.VITE_PUBLIC_API_URL;

// const STEPS = {
//   FORM: "form",
//   CONFIRMING: "confirming",
//   UPLOADING: "uploading",
//   PROCESSING: "processing",
//   SUCCESS: "success",
//   ERROR: "error",
// };

// /* ════════════════════════════════════════════
//    Main Component
// ════════════════════════════════════════════ */
// const UserTopUp = () => {
//   const navigate     = useNavigate();
//   const userId       = sessionStorage.getItem("user_id") ?? "";
//   const userEmail    = sessionStorage.getItem("email") ?? sessionStorage.getItem("userEmail") ?? `User #${userId}`;
//   const fileInputRef = useRef(null);

//   const [step, setStep]                 = useState(STEPS.FORM);
//   const [amount, setAmount]             = useState("");           // raw numeric string, used for API
//   const [amountDisplay, setAmountDisplay] = useState("");         // comma-formatted string, shown in input
//   const [password, setPassword]         = useState("");
//   const [showPassword, setShowPassword] = useState(false);
//   const [proofFile, setProofFile]       = useState(null);
//   const [proofPreview, setProofPreview] = useState(null);
//   const [errorMsg, setErrorMsg]         = useState("");
//   const [dragOver, setDragOver]         = useState(false);

//   // ── Currency state ──
//   const [currencies, setCurrencies]             = useState([]);
//   const [currenciesLoading, setCurrenciesLoading] = useState(true);
//   const [selectedAsset, setSelectedAsset]       = useState("");

//   const selectedCurrency = currencies.find((c) => c.id?.toString() === selectedAsset) ?? null;

//   // ── Amount formatting helpers ──
//   const formatWithCommas = (str) => {
//     const digits = str.replace(/\D/g, "");
//     return digits ? Number(digits).toLocaleString("en-US") : "";
//   };

//   const handleAmountChange = (e) => {
//     const raw = e.target.value.replace(/,/g, "");
//     if (raw === "" || /^\d*$/.test(raw)) {
//       setAmount(raw);
//       setAmountDisplay(formatWithCommas(raw));
//     }
//   };

//   const handleAmountKeyDown = (e) => {
//     if (e.key === "Backspace") {
//       const pos = e.target.selectionStart;
//       // If cursor is right after a comma, skip over it and delete the digit before it
//       if (pos > 0 && e.target.value[pos - 1] === ",") {
//         e.preventDefault();
//         const raw = amountDisplay.replace(/,/g, "");
//         const rawPos = amountDisplay.slice(0, pos).replace(/,/g, "").length;
//         const newRaw = raw.slice(0, rawPos - 1) + raw.slice(rawPos);
//         setAmount(newRaw);
//         setAmountDisplay(formatWithCommas(newRaw));
//       }
//     }
//   };

//   const setQuickAmount = (val) => {
//     setAmount(String(val));
//     setAmountDisplay(val.toLocaleString("en-US"));
//   };

//   // ── Load currencies ──
//   useEffect(() => {
//     setCurrenciesLoading(true);
//     getCurrencies()
//       .then((data) => {
//         setCurrencies(data);
//         if (data.length > 0) setSelectedAsset(data[0].id?.toString());
//       })
//       .catch(() => toast.error("Could not load currencies."))
//       .finally(() => setCurrenciesLoading(false));
//   }, []);

//   // ── File helpers ──
//   const handleFileSelect = (file) => {
//     if (!file) return;
//     if (!file.type.startsWith("image/")) return toast.error("Please select an image file.");
//     if (file.size > 10 * 1024 * 1024)    return toast.error("Image must be under 10MB.");
//     setProofFile(file);
//     const reader = new FileReader();
//     reader.onload = (e) => setProofPreview(e.target.result);
//     reader.readAsDataURL(file);
//   };

//   const handleDrop = useCallback((e) => {
//     e.preventDefault();
//     setDragOver(false);
//     handleFileSelect(e.dataTransfer.files[0]);
//   }, []);

//   // ── Form submit ──
//   const handleFormSubmit = (e) => {
//     e.preventDefault();
//     if (!selectedAsset)                  return toast.error("Please select a currency.");
//     if (!amount || Number(amount) <= 0)  return toast.error("Enter a valid amount.");
//     if (!password)                        return toast.error("Password is required.");
//     if (!proofFile)                       return toast.error("Please upload your payment proof.");
//     setStep(STEPS.CONFIRMING);
//   };

//   // ── Confirm → upload → process ──
//   // const handleConfirm = async () => {
//   //   try {
//   //     setStep(STEPS.UPLOADING);

//   //     const formData = new FormData();
//   //     formData.append("image", proofFile);

//   //     const uploadRes = await axios.post(
//   //       "https://irebegroup.com/irebe/index.php/uploadImage",
//   //       formData,
//   //       { headers: { "Content-Type": "multipart/form-data" } }
//   //     );

//   //     const imageName =
//   //       uploadRes.data?.name       ||
//   //       uploadRes.data?.image_name ||
//   //       uploadRes.data?.filename;

//   //     if (!imageName) throw new Error("Image upload failed — server returned no filename.");

//   //     setStep(STEPS.PROCESSING);

//   //     await axios.post(`${API_URL}/accountTransact`, {
//   //       proof:          imageName,
//   //       amount:         Number(amount),
//   //       password,
//   //       user_id:        userId,
//   //       stock_id:       selectedAsset,
//   //       stock_code:     "RWF",
//   //       direction:      "in",
//   //       reference_code: 1,
//   //     });

//   //     setStep(STEPS.SUCCESS);
//   //   } catch (err) {
//   //     setErrorMsg(err?.response?.data?.message || err?.message || "Something went wrong.");
//   //     setStep(STEPS.ERROR);
//   //   }
//   // };

//   const handleConfirm = async () => {
//   try {
//     setStep(STEPS.UPLOADING);

//     const formData = new FormData();
//     formData.append("image", proofFile);

//     const uploadRes = await axios.post(
//       "https://irebegroup.com/irebe/index.php/uploadImage",
//       formData,
//       { headers: { "Content-Type": "multipart/form-data" } }
//     );

//     const imageName =
//       uploadRes.data?.name       ||
//       uploadRes.data?.image_name ||
//       uploadRes.data?.filename;

//     if (!imageName) throw new Error("Image upload failed — server returned no filename.");

//     setStep(STEPS.PROCESSING);

//     const transactRes = await axios.post(`${API_URL}/accountTransact`, {
//       proof:          imageName,
//       amount:         Number(amount),
//       password,
//       user_id:        userId,
//       stock_id:       selectedAsset,
//       stock_code:     "RWF",
//       direction:      "in",
//       reference_code: 1,
//     });

//     // ✅ ADD THIS: check for application-level error in response body
//     if (transactRes.data?.status === "error") {
//       throw new Error(transactRes.data?.message || "Error processing transaction.");
//     }

//     setStep(STEPS.SUCCESS);
//   } catch (err) {
//     setErrorMsg(err?.response?.data?.message || err?.message || "Something went wrong.");
//     setStep(STEPS.ERROR);
//   }
// };

//   const reset = () => {
//     setStep(STEPS.FORM);
//     setAmount("");
//     setAmountDisplay("");
//     setPassword("");
//     setProofFile(null);
//     setProofPreview(null);
//     setErrorMsg("");
//   };

//   const isLoading = step === STEPS.UPLOADING || step === STEPS.PROCESSING;

//   return (
//     <div className="app-shell bg-background flex flex-col">

//       {/* ── Header ── */}
//       <div className="flex items-center gap-3 px-4 pt-6 pb-2 flex-shrink-0">
//         <button
//           onClick={() => navigate(-1)}
//           className="w-8 h-8 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
//         >
//           <ArrowLeft className="w-4 h-4" />
//         </button>
//         <div>
//           <h2 className="text-lg font-display font-bold leading-tight">Account Top Up</h2>
//           <p className="text-xs text-muted-foreground">Select currency &amp; upload proof</p>
//         </div>
//       </div>

//       {/* ── Body ── */}
//       <div className="flex-1 overflow-y-auto px-4 pb-8 pt-2">
//         <AnimatePresence mode="wait">

//           {/* ════════════════ FORM ════════════════ */}
//           {step === STEPS.FORM && (
//             <motion.form
//               key="form"
//               initial={{ opacity: 0, y: 14 }}
//               animate={{ opacity: 1, y: 0 }}
//               exit={{ opacity: 0, y: -14 }}
//               transition={{ duration: 0.22 }}
//               onSubmit={handleFormSubmit}
//               className="flex flex-col gap-5"
//             >

//               {/* ── Currency Selector ── */}
//               <div className="flex flex-col gap-2">
//                 <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
//                   Select Currency
//                 </label>
//                 <div className="relative">
//                   <select
//                     value={selectedAsset}
//                     onChange={(e) => setSelectedAsset(e.target.value)}
//                     className="w-full appearance-none px-3 py-2.5 rounded-xl bg-secondary border border-border text-sm focus:outline-none focus:border-primary transition-colors pr-9 disabled:opacity-60"
//                     disabled={currenciesLoading}
//                   >
//                     <option value="" disabled>
//                       {currenciesLoading ? "Loading..." : "Choose a currency"}
//                     </option>
//                     {currencies.map((c, i) => (
//                       <option key={`${c.id}-${i}`} value={c.id?.toString()}>
//                         {c.stock_name}
//                       </option>
//                     ))}
//                   </select>
//                   {currenciesLoading ? (
//                     <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin pointer-events-none" />
//                   ) : (
//                     <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
//                   )}
//                 </div>

//                 {/* Selected currency badge */}
//                 <AnimatePresence>
//                   {selectedCurrency && (
//                     <motion.div
//                       initial={{ opacity: 0, height: 0 }}
//                       animate={{ opacity: 1, height: "auto" }}
//                       exit={{ opacity: 0, height: 0 }}
//                       className="overflow-hidden"
//                     >
//                       <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-primary/10 border border-primary/20">
//                         <CreditCard className="w-3.5 h-3.5 text-primary flex-shrink-0" />
//                         <span className="text-xs font-semibold text-primary truncate">
//                           {selectedCurrency.stock_name}
//                         </span>
//                       </div>
//                     </motion.div>
//                   )}
//                 </AnimatePresence>
//               </div>

//               {/* ── Amount ── */}
//               <div className="flex flex-col gap-2">
//                 <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
//                   Amount
//                 </label>
//                 <div className="flex items-center gap-2 bg-secondary rounded-2xl px-4 border border-border focus-within:border-primary transition-colors">
//                   <CreditCard className="w-4 h-4 text-primary flex-shrink-0" />
//                   <input
//                     type="text"
//                     inputMode="numeric"
//                     placeholder="0"
//                     value={amountDisplay}
//                     onChange={handleAmountChange}
//                     onKeyDown={handleAmountKeyDown}
//                     className="flex-1 bg-transparent border-none outline-none text-foreground text-2xl font-bold py-4 w-full placeholder:text-muted-foreground"
//                   />
//                 </div>
//                 <div className="grid grid-cols-4 gap-2">
//                   {[10000, 50000, 100000, 500000].map((v) => (
//                     <button
//                       key={v}
//                       type="button"
//                       onClick={() => setQuickAmount(v)}
//                       className={`py-2 rounded-xl text-xs font-semibold border transition-colors ${
//                         amount === String(v)
//                           ? "bg-primary/20 border-primary/50 text-primary"
//                           : "bg-secondary border-border text-muted-foreground hover:text-foreground"
//                       }`}
//                     >
//                       {v.toLocaleString()}
//                     </button>
//                   ))}
//                 </div>
//               </div>

//               {/* ── Password ── */}
//               <div className="flex flex-col gap-2">
//                 <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
//                   Password
//                 </label>
//                 <div className="flex items-center gap-2 bg-secondary rounded-2xl px-4 border border-border focus-within:border-primary transition-colors">
//                   <Lock className="w-4 h-4 text-primary flex-shrink-0" />
//                   <input
//                     type={showPassword ? "text" : "password"}
//                     placeholder="Your account password"
//                     value={password}
//                     onChange={(e) => setPassword(e.target.value)}
//                     className="flex-1 bg-transparent border-none outline-none text-foreground text-sm py-4 w-full placeholder:text-muted-foreground"
//                   />
//                   <button
//                     type="button"
//                     onClick={() => setShowPassword((p) => !p)}
//                     className="text-muted-foreground hover:text-foreground transition-colors p-1 flex-shrink-0"
//                   >
//                     {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
//                   </button>
//                 </div>
//               </div>

//               {/* ── Payment Proof ── */}
//               <div className="flex flex-col gap-2">
//                 <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
//                   Payment Proof
//                 </label>

//                 {proofPreview ? (
//                   <div className="relative rounded-2xl overflow-hidden border border-primary/30">
//                     <img
//                       src={proofPreview}
//                       alt="Payment proof"
//                       className="w-full max-h-52 object-cover block"
//                     />
//                     <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end justify-between p-3">
//                       <span className="text-xs text-white/80 truncate max-w-[70%]">{proofFile?.name}</span>
//                       <button
//                         type="button"
//                         onClick={() => { setProofFile(null); setProofPreview(null); }}
//                         className="bg-destructive/80 hover:bg-destructive rounded-lg p-1.5 text-white transition-colors flex items-center justify-center"
//                       >
//                         <X className="w-3 h-3" />
//                       </button>
//                     </div>
//                   </div>
//                 ) : (
//                   <div
//                     onClick={() => fileInputRef.current?.click()}
//                     onDrop={handleDrop}
//                     onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
//                     onDragLeave={() => setDragOver(false)}
//                     className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center gap-3 cursor-pointer transition-colors ${
//                       dragOver
//                         ? "border-primary bg-primary/5"
//                         : "border-border bg-secondary/50 hover:border-primary/40"
//                     }`}
//                   >
//                     <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center">
//                       <Upload className="w-5 h-5 text-primary" />
//                     </div>
//                     <div className="text-center">
//                       <p className="text-sm font-semibold text-foreground">Tap to upload proof</p>
//                       <p className="text-xs text-muted-foreground mt-1">PNG, JPG, WEBP · max 10MB</p>
//                     </div>
//                   </div>
//                 )}

//                 <input
//                   ref={fileInputRef}
//                   type="file"
//                   accept="image/*"
//                   className="hidden"
//                   onChange={(e) => handleFileSelect(e.target.files?.[0])}
//                 />
//               </div>

//               <motion.button
//                 type="submit"
//                 whileTap={{ scale: 0.97 }}
//                 className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-bold text-sm tracking-wide mt-1 hover:opacity-90 transition-opacity"
//               >
//                 Review Transfer
//               </motion.button>
//             </motion.form>
//           )}

//           {/* ════════════════ CONFIRM ════════════════ */}
//           {step === STEPS.CONFIRMING && (
//             <motion.div
//               key="confirm"
//               initial={{ opacity: 0, y: 14 }}
//               animate={{ opacity: 1, y: 0 }}
//               exit={{ opacity: 0, y: -14 }}
//               transition={{ duration: 0.22 }}
//               className="flex flex-col gap-4"
//             >
//               {/* Transfer flow */}
//               <div className="bg-secondary rounded-2xl border border-border p-4 flex items-center justify-between gap-2">
//                 <div className="flex flex-col items-center gap-1 flex-1 min-w-0">
//                   <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
//                     <User className="w-5 h-5 text-primary" />
//                   </div>
//                   <p className="text-xs font-semibold text-foreground truncate w-full text-center">{userEmail}</p>
//                   <p className="text-[10px] text-muted-foreground">Sender</p>
//                 </div>
//                 <div className="flex flex-col items-center gap-1 flex-shrink-0">
//                   <ArrowRight className="w-5 h-5 text-muted-foreground" />
//                   <span className="text-xs font-bold text-primary">{Number(amount).toLocaleString()}</span>
//                 </div>
//                 <div className="flex flex-col items-center gap-1 flex-1 min-w-0">
//                   <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
//                     <CreditCard className="w-5 h-5 text-primary" />
//                   </div>
//                   <p className="text-xs font-semibold text-foreground truncate w-full text-center">
//                     {selectedCurrency?.stock_name ?? "Account"}
//                   </p>
//                   <p className="text-[10px] text-muted-foreground">Currency</p>
//                 </div>
//               </div>

//               {/* Details card */}
//               <div className="bg-secondary rounded-2xl border border-border p-5 flex flex-col gap-3">
//                 <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
//                   Transfer Details
//                 </p>

//                 <div className="flex justify-between items-center">
//                   <span className="text-sm text-muted-foreground">Name</span>
//                   <div className="flex items-center gap-1.5">
//                     <User className="w-3.5 h-3.5 text-muted-foreground" />
//                     <span className="text-sm font-semibold text-foreground">{userEmail}</span>
//                   </div>
//                 </div>

//                 <div className="flex justify-between items-center">
//                   <span className="text-sm text-muted-foreground">Currency</span>
//                   <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/10 border border-primary/20">
//                     <CreditCard className="w-3.5 h-3.5 text-primary" />
//                     <span className="text-xs font-semibold text-primary">
//                       {selectedCurrency?.stock_name ?? "N/A"}
//                     </span>
//                   </div>
//                 </div>

//                 <div className="flex justify-between items-center">
//                   <span className="text-sm text-muted-foreground">Amount</span>
//                   <span className="text-sm font-bold text-foreground">{Number(amount).toLocaleString()}</span>
//                 </div>

//                 <div className="flex justify-between items-center">
//                   <span className="text-sm text-muted-foreground">Account ID</span>
//                   <span className="text-sm font-semibold text-foreground">#{userId}</span>
//                 </div>

//                 <div className="border-t border-border" />

//                 <div className="flex justify-between items-start gap-3">
//                   <span className="text-sm text-muted-foreground flex-shrink-0">Proof</span>
//                   <div className="flex items-center gap-1.5 min-w-0">
//                     <ImageIcon className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
//                     <span className="text-xs font-medium text-foreground truncate">
//                       {proofFile?.name?.length > 28 ? proofFile.name.slice(0, 25) + "..." : proofFile?.name}
//                     </span>
//                   </div>
//                 </div>

//                 {proofPreview && (
//                   <img
//                     src={proofPreview}
//                     alt="proof"
//                     className="w-full max-h-40 object-cover rounded-xl border border-border"
//                   />
//                 )}
//               </div>

//               <p className="text-xs text-muted-foreground text-center px-4">
//                 Your proof will be uploaded first, then the transfer will be submitted automatically.
//               </p>

//               <motion.button
//                 whileTap={{ scale: 0.97 }}
//                 onClick={handleConfirm}
//                 className="w-full py-4 rounded-2xl bg-green-600 hover:bg-green-500 text-white font-bold text-sm tracking-wide transition-colors"
//               >
//                 Confirm Transfer
//               </motion.button>

//               <button
//                 onClick={() => setStep(STEPS.FORM)}
//                 className="w-full py-4 rounded-2xl border border-border text-muted-foreground text-sm font-semibold hover:text-foreground transition-colors"
//               >
//                 Edit Details
//               </button>
//             </motion.div>
//           )}

//           {/* ════════════════ LOADING ════════════════ */}
//           {isLoading && (
//             <motion.div
//               key="loading"
//               initial={{ opacity: 0 }}
//               animate={{ opacity: 1 }}
//               exit={{ opacity: 0 }}
//               className="flex flex-col items-center justify-center gap-5 min-h-64 py-16"
//             >
//               <div className="w-16 h-16 rounded-2xl bg-primary/15 flex items-center justify-center">
//                 <Loader2 className="w-8 h-8 text-primary animate-spin" />
//               </div>
//               <div className="text-center">
//                 <p className="text-base font-bold text-foreground">
//                   {step === STEPS.UPLOADING ? "Uploading Proof..." : "Processing Transfer..."}
//                 </p>
//                 <p className="text-sm text-muted-foreground mt-1">
//                   {step === STEPS.UPLOADING
//                     ? "Securely uploading your payment proof"
//                     : "Submitting your top-up request"}
//                 </p>
//               </div>
//               <div className="flex items-center gap-2 mt-2">
//                 <div className={`flex items-center gap-1.5 text-xs font-semibold ${step === STEPS.UPLOADING ? "text-primary" : "text-green-500"}`}>
//                   {step === STEPS.UPLOADING
//                     ? <Loader2 className="w-3 h-3 animate-spin" />
//                     : <CheckCircle2 className="w-3 h-3" />}
//                   Upload proof
//                 </div>
//                 <ArrowRight className="w-3 h-3 text-muted-foreground" />
//                 <div className={`flex items-center gap-1.5 text-xs font-semibold ${step === STEPS.PROCESSING ? "text-primary" : "text-muted-foreground"}`}>
//                   {step === STEPS.PROCESSING && <Loader2 className="w-3 h-3 animate-spin" />}
//                   Submit transfer
//                 </div>
//               </div>
//             </motion.div>
//           )}

//           {/* ════════════════ SUCCESS ════════════════ */}
//           {step === STEPS.SUCCESS && (
//             <motion.div
//               key="success"
//               initial={{ opacity: 0, scale: 0.92 }}
//               animate={{ opacity: 1, scale: 1 }}
//               exit={{ opacity: 0 }}
//               className="flex flex-col items-center justify-center gap-5 min-h-64 py-16 text-center"
//             >
//               <motion.div
//                 initial={{ scale: 0 }}
//                 animate={{ scale: 1 }}
//                 transition={{ type: "spring", stiffness: 200, damping: 14, delay: 0.1 }}
//                 className="w-20 h-20 rounded-2xl bg-green-500/15 border border-green-500/30 flex items-center justify-center"
//               >
//                 <CheckCircle2 className="w-9 h-9 text-green-500" />
//               </motion.div>
//               <div>
//                 <p className="text-xl font-bold text-foreground">Transfer Submitted!</p>
//                 <p className="text-sm text-muted-foreground mt-2 max-w-xs">
//                   Hi <span className="text-foreground font-semibold">{userEmail}</span>, your top-up of{" "}
//                   <span className="text-foreground font-semibold">{Number(amount).toLocaleString()}</span>{" "}
//                   {selectedCurrency && (
//                     <>in <span className="text-foreground font-semibold">{selectedCurrency.stock_name}</span> </>
//                   )}
//                   is under review.
//                 </p>
//               </div>
//               {selectedCurrency && (
//                 <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-primary/10 border border-primary/20">
//                   <CreditCard className="w-3.5 h-3.5 text-primary" />
//                   <span className="text-xs font-semibold text-primary">{selectedCurrency.stock_name}</span>
//                 </div>
//               )}
//               <button
//                 onClick={() => navigate(-1)}
//                 className="px-8 py-3 rounded-xl bg-green-500/15 border border-green-500/30 text-green-500 font-bold text-sm hover:bg-green-500/25 transition-colors"
//               >
//                 Done
//               </button>
//             </motion.div>
//           )}

//           {/* ════════════════ ERROR ════════════════ */}
//           {step === STEPS.ERROR && (
//             <motion.div
//               key="error"
//               initial={{ opacity: 0, scale: 0.92 }}
//               animate={{ opacity: 1, scale: 1 }}
//               exit={{ opacity: 0 }}
//               className="flex flex-col items-center justify-center gap-5 min-h-64 py-16 text-center"
//             >
//               <div className="w-20 h-20 rounded-2xl bg-destructive/15 border border-destructive/25 flex items-center justify-center">
//                 <XCircle className="w-9 h-9 text-destructive" />
//               </div>
//               <div>
//                 <p className="text-xl font-bold text-foreground">Transfer Failed</p>
//                 <p className="text-sm text-muted-foreground mt-2 max-w-xs">{errorMsg}</p>
//               </div>
//               <div className="flex gap-3">
//                 <button
//                   onClick={reset}
//                   className="px-6 py-3 rounded-xl border border-border text-muted-foreground text-sm font-semibold hover:text-foreground transition-colors"
//                 >
//                   Start Over
//                 </button>
//                 <button
//                   onClick={handleConfirm}
//                   className="px-6 py-3 rounded-xl bg-destructive/15 border border-destructive/30 text-destructive text-sm font-semibold hover:bg-destructive/25 transition-colors"
//                 >
//                   Retry
//                 </button>
//               </div>
//             </motion.div>
//           )}

//         </AnimatePresence>
//       </div>
//     </div>
//   );
// };

// export default UserTopUp;




import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import type { ChangeEvent, FormEvent, InputHTMLAttributes, KeyboardEvent } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Loader2,
  Smartphone,
  CreditCard,
  User,
  Mail,
  Phone,
  Lock,
  Copy,
  Check,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  CircleHelp,
  Info,
  X,
  RotateCw,
  Clock,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";

/* ════════════════════════════════════════════
   Config (mirrors SubscriptionProvider in the Flutter app)

   POST /xentripay
     { user_id, amount, type: "account_topup", pmethod: "momo" | "card",
       cname, email, cnumber }
   card → { status, message, transaction_id, checkout_url, xetri_reference_id }
   momo → { status, message, transaction_id }   (NO reference → can't poll)

   POST /checkXentriPayStatus { reference, user_id }
   → PENDING → SUCCESS / FAILED (server credits the account itself)
════════════════════════════════════════════ */
const BASE_URL: string =
  import.meta.env.VITE_PUBLIC_API_URL || "https://irebegroup.com/irebe/index.php";
const PAY_ENDPOINT = `${BASE_URL}/xentripay`;
const STATUS_ENDPOINT = `${BASE_URL}/checkXentriPayStatus`;

const PURPOSE = "account_topup";
const POLL_INTERVAL = 5000;
const MAX_POLLS = 40; // ~3m20s of automatic checking
const MIN_AMOUNT = 100;
const MAX_AMOUNT = 100_000_000;
const QUICK_AMOUNTS = [10000, 50000, 100000, 500000];
const MOMO_USSD = "*182*7*1#";

/** Gateway redirects to a URL containing one of these → payment page is done. */
const RETURN_URL_MARKERS = ["/payment/result"];
/** Show the "taking longer than usual" banner after this long without a load. */
const SLOW_LOAD_MS = 15000;

const REF_PATTERN = /^IREBE-[A-Za-z0-9_-]+$/;
const PAID_WORDS = new Set([
  "success", "successful", "succeeded", "paid", "completed", "complete",
  "approved", "settled",
]);
const FAILED_WORDS = new Set([
  "failed", "failure", "cancelled", "canceled", "rejected", "declined",
  "expired", "error", "timeout",
]);

const PHASE = {
  FORM: "form",
  SUBMITTING: "submitting",
  PENDING: "pending",
  PAID: "paid",
  FAILED: "failed",
} as const;
type Phase = (typeof PHASE)[keyof typeof PHASE];

type Method = "momo" | "card";
type FieldErrors = { name?: string; email?: string; phone?: string };

const fmtMoney = (n: number | string): string => Number(n).toLocaleString("en-US");

/** Read the first non-empty string for any of `keys` from body, then body.data. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const pick = (body: any, keys: string[]): string | null => {
  const data = body?.data && typeof body.data === "object" ? body.data : {};
  for (const k of keys) {
    for (const src of [body, data]) {
      const v = src?.[k];
      if (typeof v === "string" && v.trim()) return v.trim();
    }
  }
  return null;
};

/** Gateway answers { refid, status: "SUCCESS" }; may also be nested. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const extractStatus = (body: any): string | null => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const first = (m: any, keys: string[]): string | null => {
    for (const k of keys) {
      const v = m?.[k];
      if (typeof v === "string" && v.trim()) return v.trim();
    }
    return null;
  };
  for (const nestedKey of ["data", "transaction", "payment"]) {
    const nested = body?.[nestedKey];
    if (nested && typeof nested === "object") {
      const s = first(nested, ["status", "payment_status", "transaction_status", "state"]);
      if (s) return s;
    }
  }
  return (
    first(body, ["payment_status", "transaction_status", "state"]) ??
    first(body, ["status"])
  );
};

const JSON_HEADERS = { "Content-Type": "application/json", Accept: "application/json" };

/* ════════════════════════════════════════════
   Main Component
════════════════════════════════════════════ */
const UserTopUp = () => {
  const navigate = useNavigate();
  const userId = sessionStorage.getItem("user_id") ?? "";

  // ── Form state ──
  const [amount, setAmount] = useState(""); // raw digits, sent to the API
  const [amountDisplay, setAmountDisplay] = useState(""); // comma-formatted
  const [amountError, setAmountError] = useState("");
  const [method, setMethod] = useState<Method>("momo");
  const [name, setName] = useState(
    sessionStorage.getItem("fullName") ?? sessionStorage.getItem("name") ?? ""
  );
  const [email, setEmail] = useState(
    sessionStorage.getItem("email") ?? sessionStorage.getItem("userEmail") ?? ""
  );
  const [phone, setPhone] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  // ── Payment state ──
  const [phase, setPhase] = useState<Phase>(PHASE.FORM);
  const [message, setMessage] = useState("");
  const [reference, setReference] = useState<string | null>(null);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [paidAmount, setPaidAmount] = useState<number | null>(null);
  const [paidMethod, setPaidMethod] = useState<Method | null>(null);
  const [checking, setChecking] = useState(false);
  const [pollTimedOut, setPollTimedOut] = useState(false);
  const [cardOpen, setCardOpen] = useState(false); // in-app card page overlay

  // Refs mirror the state the polling timer needs (avoids stale closures).
  const phaseRef = useRef<Phase>(PHASE.FORM);
  const referenceRef = useRef<string | null>(null);
  const checkingRef = useRef(false);
  const timedOutRef = useRef(false);
  const pollsRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const checkStatusRef = useRef<((opts?: { manual?: boolean }) => Promise<void>) | null>(null);

  const amountInputRef = useRef<HTMLInputElement>(null);
  const amountNumber = amount ? Number(amount) : null;
  const isMomo = method === "momo";
  const canTrack = reference !== null; // card only; MoMo returns no reference

  const goPhase = (p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  };

  /* ── Amount input (comma formatting) ── */
  const formatWithCommas = (str: string): string => {
    const digits = str.replace(/\D/g, "");
    return digits ? Number(digits).toLocaleString("en-US") : "";
  };

  const handleAmountChange = (e: ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/,/g, "");
    if (raw === "" || /^\d*$/.test(raw)) {
      setAmount(raw);
      setAmountDisplay(formatWithCommas(raw));
      setAmountError("");
    }
  };

  const handleAmountKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      const pos = e.currentTarget.selectionStart ?? 0;
      if (pos > 0 && e.currentTarget.value[pos - 1] === ",") {
        e.preventDefault();
        const raw = amountDisplay.replace(/,/g, "");
        const rawPos = amountDisplay.slice(0, pos).replace(/,/g, "").length;
        const newRaw = raw.slice(0, rawPos - 1) + raw.slice(rawPos);
        setAmount(newRaw);
        setAmountDisplay(formatWithCommas(newRaw));
      }
    }
  };

  const setQuickAmount = (val: number) => {
    setAmount(String(val));
    setAmountDisplay(fmtMoney(val));
    setAmountError("");
  };

  /* ── Polling ── */
  const stopPolling = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    pollsRef.current = 0;
  }, []);

  const startPolling = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    pollsRef.current = 0;
    timedOutRef.current = false;
    setPollTimedOut(false);
    timerRef.current = setInterval(() => {
      pollsRef.current += 1;
      if (pollsRef.current > MAX_POLLS) {
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = null;
        timedOutRef.current = true;
        setPollTimedOut(true);
        return;
      }
      void checkStatusRef.current?.();
    }, POLL_INTERVAL);
  }, []);

  /** Safe to call any time; no-ops unless a trackable payment is pending. */
  const checkStatus = useCallback(
    async ({ manual = false }: { manual?: boolean } = {}) => {
      const ref = referenceRef.current;
      if (phaseRef.current !== PHASE.PENDING || !ref || !userId || checkingRef.current) {
        return;
      }

      if (!REF_PATTERN.test(ref)) {
        stopPolling();
        setMessage("The payment reference is invalid.");
        goPhase(PHASE.FAILED);
        return;
      }

      checkingRef.current = true;
      setChecking(true);
      if (manual && timedOutRef.current) startPolling();

      try {
        const { data } = await axios.post(
          STATUS_ENDPOINT,
          { reference: ref, user_id: Number(userId) || userId },
          { headers: JSON_HEADERS, timeout: 20000 }
        );

        if (data && typeof data === "object") {
          const s = extractStatus(data)?.toLowerCase();
          const msg = typeof data.message === "string" ? data.message.trim() : "";

          if (s && PAID_WORDS.has(s)) {
            stopPolling();
            setMessage(msg);
            goPhase(PHASE.PAID);
          } else if (s && FAILED_WORDS.has(s)) {
            stopPolling();
            setMessage(msg || "The payment was not completed.");
            goPhase(PHASE.FAILED);
          }
          // PENDING / unknown → keep waiting
        }
      } catch (err) {
        // Network blip: the next tick tries again.
        console.debug("checkXentriPayStatus failed:", err);
      } finally {
        checkingRef.current = false;
        setChecking(false);
      }
    },
    [userId, stopPolling, startPolling]
  );

  useEffect(() => {
    checkStatusRef.current = checkStatus;
  }, [checkStatus]);

  // Coming back from the card page / MoMo app → check right away.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") void checkStatusRef.current?.();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, []);

  // Cancel polling on unmount.
  useEffect(() => () => stopPolling(), [stopPolling]);

  /* ── Validation ── */
  const validateAmount = (n: number | null): string => {
    if (n == null || Number.isNaN(n)) return "Enter an amount to continue";
    if (n < MIN_AMOUNT) return `Minimum is ${fmtMoney(MIN_AMOUNT)} RWF`;
    if (n > MAX_AMOUNT) return `Maximum is ${fmtMoney(MAX_AMOUNT)} RWF`;
    return "";
  };

  const validateFields = (): boolean => {
    const errs: FieldErrors = {};
    if (name.trim().length < 2) errs.name = "Enter your full name";
    const t = email.trim();
    if (!t.includes("@") || !t.includes(".")) errs.email = "Enter a valid email";
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 9 || digits.length > 15) errs.phone = "Enter a valid phone number";
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  /* ── POST /xentripay ── */
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (phase === PHASE.SUBMITTING) return;

    // 1) Amount first: highlight, focus, tell the user.
    const amtErr = validateAmount(amountNumber);
    if (amtErr || amountNumber == null) {
      setAmountError(amtErr);
      amountInputRef.current?.focus();
      toast.error(amtErr);
      return;
    }
    // 2) Then the rest of the form.
    if (!validateFields()) return;
    if (!userId) {
      toast.error("You need to be signed in to pay.");
      return;
    }

    stopPolling();
    referenceRef.current = null;
    setReference(null);
    setCheckoutUrl(null);
    setTransactionId(null);
    setMessage("");
    setPollTimedOut(false);
    setPaidAmount(amountNumber);
    setPaidMethod(method);
    goPhase(PHASE.SUBMITTING);

    const fail = (msg: string) => {
      setMessage(msg);
      goPhase(PHASE.FAILED);
    };

    try {
      const { data } = await axios.post(
        PAY_ENDPOINT,
        {
          user_id: Number(userId) || userId,
          amount: amountNumber,
          type: PURPOSE, // "account_topup"
          pmethod: method,
          cname: name.trim(),
          email: email.trim(),
          cnumber: phone.replace(/[\s\-+]/g, ""),
        },
        { headers: JSON_HEADERS, timeout: 30000 }
      );

      console.debug("xentripay response:", data);
      if (!data || typeof data !== "object") {
        fail("Unexpected response from the server.");
        return;
      }

      const ref = pick(data, ["reference", "xetri_reference_id", "refid", "refId"]) ?? "";
      const tidRaw = data.transaction_id ?? data.data?.transaction_id;
      const tid: string | null = tidRaw != null ? String(tidRaw) : null;
      const url = pick(data, ["checkout_url", "gatewayUrl", "gateway_url", "checkoutUrl"]);
      const msg = pick(data, ["message"]) ?? "";
      const rawStatus = pick(data, ["status"])?.toLowerCase();

      const explicitFail =
        data.success === false || (rawStatus != null && FAILED_WORDS.has(rawStatus));

      if (explicitFail || (!ref && tid == null)) {
        fail(msg || "Could not start the payment.");
        return;
      }
      if (method === "card" && !url) {
        fail("The card payment page was not returned. Please try again.");
        return;
      }

      referenceRef.current = ref || null;
      setReference(ref || null);
      setCheckoutUrl(url);
      setTransactionId(tid);
      setMessage(msg);
      goPhase(PHASE.PENDING);
      if (ref) startPolling(); // nothing to poll without a reference

      if (url) setCardOpen(true); // card page opens INSIDE the app
    } catch (err) {
      let msg = "Something went wrong.";
      if (axios.isAxiosError(err)) {
        msg =
          err.response?.data?.message ||
          (err.code === "ECONNABORTED" ? "The request timed out. Please try again." : err.message) ||
          msg;
      } else if (err instanceof Error) {
        msg = err.message;
      }
      fail(msg);
    }
  };

  const resetAll = () => {
    stopPolling();
    referenceRef.current = null;
    setReference(null);
    setCheckoutUrl(null);
    setTransactionId(null);
    setMessage("");
    setPollTimedOut(false);
    setPaidAmount(null);
    setPaidMethod(null);
    setAmount("");
    setAmountDisplay("");
    setAmountError("");
    setPhone("");
    setFieldErrors({});
    setCardOpen(false);
    goPhase(PHASE.FORM);
  };

  // Close the card page as soon as the payment reaches a final state
  // (polling keeps running while it's open).
  useEffect(() => {
    if (phase !== PHASE.PENDING) setCardOpen(false);
  }, [phase]);

  /** Card page closed (finished or left): check the status right away. */
  const closeCard = () => {
    setCardOpen(false);
    void checkStatus({ manual: true });
  };

  const showForm =
    phase === PHASE.FORM || phase === PHASE.SUBMITTING || phase === PHASE.FAILED;
  const busy = phase === PHASE.SUBMITTING;

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
          <p className="text-xs text-muted-foreground">Pay with Mobile Money or card</p>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex-1 overflow-y-auto px-4 pb-8 pt-2">
        <AnimatePresence mode="wait">
          {/* ════════════════ FORM ════════════════ */}
          {showForm && (
            <motion.form
              key="form"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14 }}
              transition={{ duration: 0.22 }}
              onSubmit={handleSubmit}
              noValidate
              className="flex flex-col gap-5"
            >
              {phase === PHASE.FAILED && message && (
                <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-destructive/10 border border-destructive/25">
                  <XCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                  <p className="text-xs font-semibold text-destructive">{message}</p>
                </div>
              )}

              {/* ── Amount ── */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Amount (RWF)
                </label>
                <div
                  className={`flex items-center gap-2 bg-secondary rounded-2xl px-4 border transition-colors ${
                    amountError
                      ? "border-destructive"
                      : "border-border focus-within:border-primary"
                  }`}
                >
                  <CreditCard className="w-4 h-4 text-primary flex-shrink-0" />
                  <input
                    ref={amountInputRef}
                    type="text"
                    inputMode="numeric"
                    placeholder="0"
                    value={amountDisplay}
                    onChange={handleAmountChange}
                    onKeyDown={handleAmountKeyDown}
                    disabled={busy}
                    className="flex-1 bg-transparent border-none outline-none text-foreground text-2xl font-bold py-4 w-full placeholder:text-muted-foreground"
                  />
                </div>
                {amountError ? (
                  <p className="text-xs font-semibold text-destructive">{amountError}</p>
                ) : (
                  <p className="text-[11px] text-muted-foreground">
                    Min {fmtMoney(MIN_AMOUNT)} · Max {fmtMoney(MAX_AMOUNT)}
                  </p>
                )}
                <div className="grid grid-cols-4 gap-2">
                  {QUICK_AMOUNTS.map((v) => (
                    <button
                      key={v}
                      type="button"
                      disabled={busy}
                      onClick={() => setQuickAmount(v)}
                      className={`py-2 rounded-xl text-xs font-semibold border transition-colors disabled:opacity-60 ${
                        amount === String(v)
                          ? "bg-primary/20 border-primary/50 text-primary"
                          : "bg-secondary border-border text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {fmtMoney(v)}
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Payment method ── */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Payment method
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <MethodTile
                    icon={Smartphone}
                    title="Mobile Money"
                    subtitle="Approve on your phone"
                    selected={isMomo}
                    disabled={busy}
                    onClick={() => setMethod("momo")}
                  />
                  <MethodTile
                    icon={CreditCard}
                    title="Card"
                    subtitle="Secure card page"
                    selected={!isMomo}
                    disabled={busy}
                    onClick={() => setMethod("card")}
                  />
                </div>
              </div>

              {/* ── Details ── */}
              <div className="flex flex-col gap-3">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Your details
                </label>
                <Field
                  icon={User}
                  label={isMomo ? "Full name" : "Card holder name"}
                  placeholder={isMomo ? "Name on the account" : "Name on the card"}
                  value={name}
                  onChange={setName}
                  error={fieldErrors.name}
                  disabled={busy}
                />
                <Field
                  icon={Mail}
                  type="email"
                  label={isMomo ? "Email" : "Card holder email"}
                  placeholder="you@example.com"
                  value={email}
                  onChange={setEmail}
                  error={fieldErrors.email}
                  disabled={busy}
                />
                <Field
                  icon={Phone}
                  type="tel"
                  inputMode="tel"
                  label={isMomo ? "Mobile Money number" : "Phone number"}
                  placeholder="07XXXXXXXX"
                  value={phone}
                  onChange={(v) => setPhone(v.replace(/[^0-9+\s-]/g, ""))}
                  error={fieldErrors.phone}
                  disabled={busy}
                />
              </div>

              {/* ── Summary ── */}
              <div className="bg-secondary rounded-2xl border border-border p-4 flex flex-col gap-2.5">
                <SummaryRow label="Payment for" value="Account top-up" />
                <SummaryRow label="Method" value={isMomo ? "Mobile Money" : "Card"} />
                <div className="border-t border-border" />
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-foreground">Total</span>
                  <span className="text-lg font-bold text-foreground">
                    {amountNumber == null ? "—" : `RWF ${fmtMoney(amountNumber)}`}
                  </span>
                </div>
                <div className="flex items-start gap-2 rounded-xl bg-background/60 p-2.5">
                  {isMomo ? (
                    <Smartphone className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5" />
                  ) : (
                    <Lock className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5" />
                  )}
                  <p className="text-[11px] text-muted-foreground leading-snug">
                    {isMomo
                      ? `You'll get a prompt on ${phone.trim() || "your phone"} to approve the payment. No prompt? Dial ${MOMO_USSD} to request it.`
                      : "You'll be taken to a secure page to enter your card details. They never touch this app."}
                  </p>
                </div>
              </div>

              <motion.button
                type="submit"
                disabled={busy}
                whileTap={{ scale: 0.97 }}
                className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-bold text-sm tracking-wide hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {busy ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Starting payment...
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    {amountNumber == null ? "Enter amount to pay" : `Pay ${fmtMoney(amountNumber)} RWF`}
                  </>
                )}
              </motion.button>

              <p className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground -mt-2">
                <ShieldCheck className="w-3.5 h-3.5" />
                Payments are processed securely by XentriPay
              </p>
            </motion.form>
          )}

          {/* ════════════════ PENDING ════════════════ */}
          {phase === PHASE.PENDING && (
            <motion.div
              key="pending"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14 }}
              transition={{ duration: 0.22 }}
              className="bg-secondary rounded-2xl border border-border p-5 flex flex-col gap-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Account top-up
                  </p>
                  <p className="text-2xl font-bold text-foreground mt-0.5">
                    RWF {paidAmount != null ? fmtMoney(paidAmount) : "—"}
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-[11px] font-bold text-amber-500">
                  Pending
                </span>
              </div>

              {/* Stepper */}
              <div className="flex flex-col">
                <Step state="done" title="Payment request sent" />
                <Step
                  state="active"
                  title={paidMethod === "momo" ? "Approve on your phone" : "Complete the card payment"}
                  subtitle={
                    paidMethod === "momo"
                      ? "Enter your Mobile Money PIN when the prompt appears."
                      : "Finish on the secure page, then come back here."
                  }
                />
                <Step
                  state="todo"
                  title="Confirmation"
                  subtitle="Your account updates automatically."
                  isLast
                />
              </div>

              {paidMethod === "momo" && <MomoHelp />}

              {message && <p className="text-xs text-foreground">{message}</p>}

              {pollTimedOut && (
                <div className="px-3 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs text-amber-500">
                  Still pending. If you already paid, tap "Check status".
                </div>
              )}

              <ReferenceRow
                label={reference ? "Reference" : "Transaction"}
                value={reference ?? (transactionId ? `#${transactionId}` : "")}
              />

              {!canTrack && (
                <div className="flex items-start gap-2 rounded-xl bg-background/60 p-2.5">
                  <Info className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5" />
                  <p className="text-[11px] text-muted-foreground leading-snug">
                    Approve the request on your phone. This payment can't be confirmed live in
                    the app — your account updates as soon as it goes through.
                  </p>
                </div>
              )}

              {canTrack && (
                <div className="flex gap-2">
                  <button
                    onClick={() => void checkStatus({ manual: true })}
                    disabled={checking}
                    className="flex-1 py-2.5 rounded-xl border border-primary/40 text-primary text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-primary/10 transition-colors disabled:opacity-60"
                  >
                    {checking ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="w-3.5 h-3.5" />
                    )}
                    Check status
                  </button>
                  {checkoutUrl && (
                    <button
                      onClick={() => setCardOpen(true)}
                      className="flex-1 py-2.5 rounded-xl border border-border text-foreground text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-background/60 transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Open card page
                    </button>
                  )}
                </div>
              )}

              <button
                onClick={resetAll}
                className="self-start text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
              >
                {canTrack ? "Start over" : "Done"}
              </button>
            </motion.div>
          )}

          {/* ════════════════ PAID ════════════════ */}
          {phase === PHASE.PAID && (
            <motion.div
              key="paid"
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
                <p className="text-xl font-bold text-foreground">Payment successful</p>
                <p className="text-2xl font-bold text-green-500 mt-1">
                  RWF {paidAmount != null ? fmtMoney(paidAmount) : ""}
                </p>
                <p className="text-sm text-muted-foreground mt-2 max-w-xs">
                  {message || "Thank you! Your account balance will be updated shortly."}
                </p>
              </div>
              <div className="w-full max-w-xs">
                <ReferenceRow
                  label={reference ? "Reference" : "Transaction"}
                  value={reference ?? (transactionId ? `#${transactionId}` : "")}
                />
              </div>
              <button
                onClick={() => navigate(-1)}
                className="px-8 py-3 rounded-xl bg-green-500/15 border border-green-500/30 text-green-500 font-bold text-sm hover:bg-green-500/25 transition-colors"
              >
                Done
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {cardOpen && checkoutUrl && (
          <CardCheckoutOverlay url={checkoutUrl} onClose={closeCard} />
        )}
      </AnimatePresence>
    </div>
  );
};

/* ════════════════════════════════════════════
   Small components
════════════════════════════════════════════ */

type MethodTileProps = {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  selected: boolean;
  disabled?: boolean;
  onClick: () => void;
};

const MethodTile = ({ icon: Icon, title, subtitle, selected, disabled, onClick }: MethodTileProps) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={`text-left p-3 rounded-2xl border transition-colors disabled:opacity-60 ${
      selected
        ? "bg-primary/10 border-primary"
        : "bg-secondary border-border hover:border-primary/40"
    }`}
  >
    <div className="flex items-center justify-between">
      <div
        className={`w-9 h-9 rounded-xl flex items-center justify-center ${
          selected ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground"
        }`}
      >
        <Icon className="w-4 h-4" />
      </div>
      <div
        className={`w-5 h-5 rounded-full border flex items-center justify-center ${
          selected ? "bg-primary border-primary" : "border-border"
        }`}
      >
        {selected && <Check className="w-3 h-3 text-primary-foreground" />}
      </div>
    </div>
    <p className="text-sm font-bold text-foreground mt-2.5">{title}</p>
    <p className="text-[11px] text-muted-foreground">{subtitle}</p>
  </button>
);

type FieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "onChange"> & {
  icon: LucideIcon;
  label: string;
  error?: string;
  onChange: (value: string) => void;
};

const Field = ({ icon: Icon, label, error, onChange, ...props }: FieldProps) => (
  <div className="flex flex-col gap-1.5">
    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
      {label}
    </span>
    <div
      className={`flex items-center gap-2 bg-secondary rounded-xl px-3 border transition-colors ${
        error ? "border-destructive" : "border-border focus-within:border-primary"
      }`}
    >
      <Icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
      <input
        {...props}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 bg-transparent border-none outline-none text-foreground text-sm py-3 w-full placeholder:text-muted-foreground disabled:opacity-60"
      />
    </div>
    {error && <p className="text-[11px] font-semibold text-destructive">{error}</p>}
  </div>
);

const SummaryRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex justify-between items-center">
    <span className="text-xs text-muted-foreground">{label}</span>
    <span className="text-xs font-bold text-foreground">{value}</span>
  </div>
);

type StepProps = {
  state: "done" | "active" | "todo";
  title: string;
  subtitle?: string;
  isLast?: boolean;
};

const Step = ({ state, title, subtitle, isLast = false }: StepProps) => (
  <div className="flex gap-3">
    <div className="flex flex-col items-center w-[22px] flex-shrink-0">
      {state === "done" && (
        <div className="w-[22px] h-[22px] rounded-full bg-green-500 flex items-center justify-center">
          <Check className="w-3.5 h-3.5 text-white" />
        </div>
      )}
      {state === "active" && (
        <div className="w-[22px] h-[22px] rounded-full bg-primary/15 border border-primary flex items-center justify-center">
          <Loader2 className="w-3 h-3 text-primary animate-spin" />
        </div>
      )}
      {state === "todo" && <div className="w-[22px] h-[22px] rounded-full border-2 border-border" />}
      {!isLast && (
        <div className={`w-0.5 flex-1 my-1 ${state === "done" ? "bg-green-500" : "bg-border"}`} />
      )}
    </div>
    <div className={isLast ? "" : "pb-4"}>
      <p className={`text-sm font-bold ${state === "todo" ? "text-muted-foreground" : "text-foreground"}`}>
        {title}
      </p>
      {subtitle && <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{subtitle}</p>}
    </div>
  </div>
);

/* ════════════════════════════════════════════
   Card checkout overlay (web version of PaymentWebViewPage)

   Shows the gateway page INSIDE the app: full-screen, with a loading bar,
   the page's host + lock, reload, "open in new tab" and a close button that
   asks for confirmation. The customer types card details on the gateway
   page — this app never sees them.

   It can't read the gateway's URL (cross-origin), so "finished" is detected
   by (a) the parent's status polling → the overlay unmounts when the payment
   is paid/failed, and (b) the gateway redirecting to our own result page
   inside the frame (same-origin, matched with RETURN_URL_MARKERS).

   If the gateway forbids framing (X-Frame-Options / CSP) the frame stays
   blank; after SLOW_LOAD_MS a banner offers Reload / Open in new tab.
════════════════════════════════════════════ */
type CardCheckoutOverlayProps = {
  url: string;
  onClose: () => void;
};

const CardCheckoutOverlay = ({ url, onClose }: CardCheckoutOverlayProps) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [slow, setSlow] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [confirming, setConfirming] = useState(false);

  const host = useMemo(() => {
    try {
      return new URL(url).host;
    } catch {
      return "";
    }
  }, [url]);

  // (Re)arm the slow-load watchdog on every load attempt.
  useEffect(() => {
    setLoaded(false);
    setSlow(false);
    const t = setTimeout(() => setSlow(true), SLOW_LOAD_MS);
    return () => clearTimeout(t);
  }, [url, reloadKey]);

  const handleLoad = () => {
    setLoaded(true);
    setSlow(false);
    try {
      const href = iframeRef.current?.contentWindow?.location.href ?? "";
      if (RETURN_URL_MARKERS.some((m) => href.includes(m))) onClose();
    } catch {
      // Cross-origin while on the gateway: expected, nothing to read.
    }
  };

  const openInNewTab = () => window.open(url, "_blank", "noopener,noreferrer");

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 24 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 bg-background flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border flex-shrink-0">
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="w-8 h-8 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-foreground leading-tight">Secure card payment</p>
          {host && (
            <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Lock className="w-3 h-3 text-green-500 flex-shrink-0" />
              <span className="truncate">{host}</span>
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => setReloadKey((k) => k + 1)}
          className="w-8 h-8 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors flex-shrink-0"
          aria-label="Reload"
        >
          <RotateCw className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={openInNewTab}
          className="w-8 h-8 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors flex-shrink-0"
          aria-label="Open in new tab"
        >
          <ExternalLink className="w-4 h-4" />
        </button>
      </div>

      {/* Loading bar (until the first load finishes) */}
      <div className="h-0.5 flex-shrink-0 bg-border">
        {!loaded && <div className="h-full w-full bg-primary animate-pulse" />}
      </div>

      {/* Frame */}
      <div className="relative flex-1 bg-white">
        <iframe
          key={reloadKey}
          ref={iframeRef}
          src={url}
          title="Secure card payment"
          onLoad={handleLoad}
          allow="payment"
          sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-popups-to-escape-sandbox"
          className="absolute inset-0 w-full h-full border-0"
        />

        {slow && !loaded && (
          <div className="absolute left-3 right-3 bottom-4 rounded-xl bg-background border border-border shadow-lg p-3 flex flex-col gap-2">
            <div className="flex items-start gap-2">
              <Clock className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
              <p className="text-xs font-semibold text-foreground leading-snug">
                The payment page is taking longer than usual to load.
              </p>
            </div>
            <div className="flex justify-end gap-1">
              <button
                type="button"
                onClick={() => setReloadKey((k) => k + 1)}
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-primary hover:bg-primary/10 transition-colors"
              >
                Reload
              </button>
              <button
                type="button"
                onClick={openInNewTab}
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-primary hover:bg-primary/10 transition-colors"
              >
                Open in new tab
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Leave confirmation */}
      {confirming && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center p-6">
          <div className="w-full max-w-sm rounded-2xl bg-background border border-border p-5 flex flex-col gap-2">
            <p className="text-sm font-bold text-foreground">Leave payment?</p>
            <p className="text-xs text-muted-foreground">
              If you already paid, your payment will still be confirmed automatically.
            </p>
            <div className="flex justify-end gap-2 mt-2">
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-foreground hover:bg-secondary transition-colors"
              >
                Stay
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-bold text-destructive hover:bg-destructive/10 transition-colors"
              >
                Leave
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};

const useCopy = () => {
  const [copied, setCopied] = useState(false);
  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Could not copy.");
    }
  };
  return [copied, copy] as const;
};

const ReferenceRow = ({ label, value }: { label: string; value: string }) => {
  const [copied, copy] = useCopy();
  if (!value) return null;
  return (
    <div className="flex items-center gap-2 bg-background/60 rounded-xl px-3 py-2.5">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <span className="flex-1 text-xs font-bold text-foreground truncate select-all">{value}</span>
      <button
        type="button"
        onClick={() => void copy(value)}
        className="p-1 text-muted-foreground hover:text-foreground transition-colors"
        aria-label={`Copy ${label}`}
      >
        {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
};

/** "Didn't get the prompt? Dial *182*7*1#" */
const MomoHelp = () => {
  const [copied, copy] = useCopy();
  return (
    <div className="rounded-xl bg-amber-500/10 border border-amber-500/25 p-3 flex flex-col gap-2.5">
      <div className="flex items-start gap-2">
        <CircleHelp className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs font-semibold text-amber-500 leading-snug">
          Didn't receive the Mobile Money prompt? Dial {MOMO_USSD} on your phone to request it
          directly.
        </p>
      </div>
      <div className="flex items-center gap-2">
        {/* '#' must be percent-encoded for the dialer to receive the full code */}
        <a
          href={`tel:${MOMO_USSD.replace("#", "%23")}`}
          className="px-3 py-2 rounded-xl border border-amber-500/40 text-amber-500 text-xs font-bold flex items-center gap-1.5 hover:bg-amber-500/10 transition-colors"
        >
          <Phone className="w-3.5 h-3.5" />
          Dial {MOMO_USSD}
        </a>
        <button
          type="button"
          onClick={() => void copy(MOMO_USSD)}
          className="p-2 text-amber-500 hover:bg-amber-500/10 rounded-lg transition-colors"
          aria-label="Copy code"
        >
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
};

export default UserTopUp;
