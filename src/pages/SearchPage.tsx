import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, ArrowLeft, TrendingUp, TrendingDown, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getStockProducts } from "@/lib/api-stocks"; // ← changed import

// ─── Types ────────────────────────────────────────────────────────────────────

type Stock = Record<string, any>;

// ─── Filter logic (mirrors Flutter filterProducts exactly) ────────────────────

const applyFilters = (stocks: Stock[], selectedValues: string[]): Stock[] => {
  if (selectedValues.length === 0) return stocks;

  const criteriaMap: Record<string, string[]> = {};

  for (const value of selectedValues) {
    const colonIdx = value.indexOf(":");
    if (colonIdx === -1) continue;
    const field = value.slice(0, colonIdx).trim();
    const searchValue = value.slice(colonIdx + 1).trim().toLowerCase();
    if (!criteriaMap[field]) criteriaMap[field] = [];
    criteriaMap[field].push(searchValue);
  }

  return stocks.filter((product) => {
    for (const [field, searchValues] of Object.entries(criteriaMap)) {
      const productValue = product[field]?.toString().toLowerCase() ?? "";

      if (field === "price" || field === "current_price") {
        const filterPrice = parseFloat(searchValues[0]);
        const productPrice = parseFloat(
          product["current_price"]?.toString() ?? product["price"]?.toString() ?? ""
        );
        if (!isNaN(filterPrice) && !isNaN(productPrice) && productPrice > filterPrice) {
          return false;
        }
      } else {
        if (!searchValues.some((val) => productValue.includes(val))) {
          return false;
        }
      }
    }
    return true;
  });
};

// ─── Search Bar ───────────────────────────────────────────────────────────────

const FILTERABLE_FIELDS = ["stock_code", "stock_name", "category", "price"];

const SearchBar = ({
  stocks,
  chips,
  onChipsChange,
}: {
  stocks: Stock[];
  chips: string[];
  onChipsChange: (chips: string[]) => void;
}) => {
  const [inputValue, setInputValue] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!inputValue.trim()) { setSuggestions([]); return; }

    const q = inputValue.toLowerCase();
    const seen = new Set<string>();
    const results: string[] = [];
    const colonIdx = inputValue.indexOf(":");

    if (colonIdx !== -1) {
      const field = inputValue.slice(0, colonIdx).trim();
      const partial = inputValue.slice(colonIdx + 1).trim().toLowerCase();
      for (const stock of stocks) {
        const val = stock[field]?.toString();
        if (val) {
          const suggestion = `${field}:${val}`;
          if (!seen.has(suggestion) && val.toLowerCase().includes(partial)) {
            seen.add(suggestion);
            results.push(suggestion);
          }
        }
      }
    } else {
      for (const stock of stocks) {
        for (const field of ["stock_name", "stock_code", "category"]) {
          const val = stock[field]?.toString();
          if (val && val.toLowerCase().includes(q)) {
            const suggestion = `${field}:${val}`;
            if (!seen.has(suggestion)) { seen.add(suggestion); results.push(suggestion); }
          }
        }
      }
    }

    setSuggestions(results.slice(0, 8));
  }, [inputValue, stocks]);

  const addChip = (value: string) => {
    if (value && !chips.includes(value)) onChipsChange([...chips, value]);
    setInputValue("");
    setSuggestions([]);
    inputRef.current?.focus();
  };

  const removeChip = (chip: string) => onChipsChange(chips.filter((c) => c !== chip));

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && inputValue.trim()) addChip(inputValue.trim());
    if (e.key === "Backspace" && !inputValue && chips.length > 0) removeChip(chips[chips.length - 1]);
  };

  return (
    <div className="relative">
      <div
        className="flex flex-wrap items-center gap-1.5 min-h-[44px] px-3 py-2 rounded-xl bg-secondary border border-border focus-within:border-primary/40 transition-colors cursor-text"
        onClick={() => inputRef.current?.focus()}
      >
        <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />

        {chips.map((chip) => (
          <span key={chip} className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-medium text-primary">
            {chip}
            <button onClick={(e) => { e.stopPropagation(); removeChip(chip); }} className="hover:text-destructive transition-colors">
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}

        <input
          ref={inputRef}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 150)}
          placeholder={chips.length === 0 ? "Search or filter assets…" : "Add filter…"}
          className="flex-1 min-w-[120px] bg-transparent outline-none text-sm placeholder:text-muted-foreground"
          autoFocus
        />

        {(inputValue || chips.length > 0) && (
          <button onClick={() => { setInputValue(""); onChipsChange([]); }} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <AnimatePresence>
        {isFocused && suggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
            className="absolute top-full left-0 right-0 mt-1 z-50 bg-card border border-border rounded-xl shadow-lg overflow-hidden"
          >
            {suggestions.map((s) => (
              <button key={s} onMouseDown={() => addChip(s)} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-secondary transition-colors text-left">
                <Search className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                <span className="font-mono text-xs text-primary/70 flex-shrink-0">{s.split(":")[0]}:</span>
                <span className="truncate">{s.split(":").slice(1).join(":")}</span>
              </button>
            ))}
            {!inputValue.includes(":") && (
              <div className="px-4 py-2 border-t border-border bg-secondary/50">
                <p className="text-[10px] text-muted-foreground mb-1.5">Filter by field</p>
                <div className="flex flex-wrap gap-1">
                  {FILTERABLE_FIELDS.map((f) => (
                    <button key={f} onMouseDown={() => setInputValue(`${f}:`)} className="px-2 py-0.5 rounded-full bg-secondary border border-border text-xs text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors font-mono">
                      {f}:
                    </button>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── Stock Row ────────────────────────────────────────────────────────────────

const StockRow = ({ stock, index }: { stock: Stock; index: number }) => {
  const navigate = useNavigate();
  const isPositive = (stock.finalchange ?? 0) >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      onClick={() => navigate("/stock", { state: { asset: stock } })}
      className="flex items-center justify-between p-3.5 rounded-xl bg-card border border-border cursor-pointer hover:border-primary/20 transition-colors"
    >
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-full bg-secondary overflow-hidden flex items-center justify-center flex-shrink-0">
          {stock.logo ? (
            <img src={stock.logo} alt={stock.stock_name} className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
                (e.target as HTMLImageElement).parentElement!.innerHTML =
                  `<span class="text-sm font-bold text-primary">${stock.stock_code?.slice(0, 2) ?? "?"}</span>`;
              }}
            />
          ) : (
            <span className="text-sm font-bold text-primary">{stock.stock_code?.slice(0, 2) ?? "?"}</span>
          )}
        </div>
        <div>
          <p className="text-sm font-bold">{stock.stock_code}</p>
          <p className="text-xs text-muted-foreground">{stock.stock_name}</p>
          {stock.category && <p className="text-[10px] text-muted-foreground/60 mt-0.5">{stock.category}</p>}
        </div>
      </div>

      <div className="flex flex-col items-end gap-1">
        {stock.current_price != null && (
          <p className="text-sm font-semibold">RWF {Number(stock.current_price).toLocaleString()}</p>
        )}
        <div className={`flex items-center gap-0.5 text-xs font-medium ${isPositive ? "text-accent" : "text-destructive"}`}>
          {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          <span>{isPositive ? "+" : ""}{(stock.finalchange ?? 0).toFixed(2)}%</span>
        </div>
      </div>
    </motion.div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

const SearchPage = () => {
  const navigate = useNavigate();
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [filteredStocks, setFilteredStocks] = useState<Stock[]>([]);
  const [filterChips, setFilterChips] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ↓ Mirrors Flutter: fetchProducts with category "19"
  useEffect(() => {
    const load = async () => {
      try {
        const data = await getStockProducts("19");

        console.log(" filter Fetched stock products:", data);
        setStocks(data);
        setFilteredStocks(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch products");
        setFilteredStocks([]);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const handleChipsChange = (chips: string[]) => {
    setFilterChips(chips);
    setFilteredStocks(applyFilters(stocks, chips));
  };

  return (
    <div className="app-shell min-h-screen bg-background">
      <div className="flex items-center gap-3 p-4">
        <button onClick={() => navigate(-1)} className="text-foreground flex-shrink-0">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <SearchBar stocks={stocks} chips={filterChips} onChipsChange={handleChipsChange} />
        </div>
      </div>

      <div className="px-4 pb-20">
        {isLoading && (
          <div className="space-y-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-[68px] rounded-xl bg-secondary animate-pulse" />
            ))}
          </div>
        )}

        {!isLoading && error && (
          <div className="flex flex-col items-center justify-center mt-16 gap-3">
            <p className="text-sm text-destructive text-center">{error}</p>
            <button onClick={() => window.location.reload()} className="text-xs text-primary underline">
              Try again
            </button>
          </div>
        )}

        {/* Mirrors Flutter: "No asset found" */}
        {!isLoading && !error && filteredStocks.length === 0 && (
          <div className="text-center mt-16">
            <Search className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No asset found</p>
          </div>
        )}

        {!isLoading && !error && filteredStocks.length > 0 && (
          <div className="space-y-2">
            {filteredStocks.map((stock, i) => (
              <StockRow key={stock.id ?? stock.stock_code} stock={stock} index={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchPage;