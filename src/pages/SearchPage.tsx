import { useState } from "react";
import { motion } from "framer-motion";
import { Search, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { mockAssets, formatCurrency } from "@/lib/mockData";

const SearchPage = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  const results = query.length > 0
    ? mockAssets.filter(
        (a) =>
          a.stock_name.toLowerCase().includes(query.toLowerCase()) ||
          a.stock_code.toLowerCase().includes(query.toLowerCase())
      )
    : [];

  return (
    <div className="app-shell min-h-screen bg-background">
      {/* Search header */}
      <div className="flex items-center gap-3 p-4">
        <button onClick={() => navigate(-1)} className="text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            autoFocus
            placeholder="Search assets and symbols"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-10 h-11 bg-secondary border-border"
          />
        </div>
      </div>

      {/* Results */}
      <div className="px-4">
        {query && results.length === 0 && (
          <p className="text-sm text-muted-foreground text-center mt-10">No results found</p>
        )}
        <div className="space-y-2">
          {results.map((asset, i) => (
            <motion.div
              key={asset.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.03 }}
              className="flex items-center justify-between p-3.5 rounded-xl bg-card border border-border"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center text-sm font-bold text-primary">
                  {asset.stock_code.slice(0, 2)}
                </div>
                <div>
                  <p className="text-sm font-semibold">{asset.stock_name}</p>
                  <p className="text-xs text-muted-foreground">{asset.stock_code} · {asset.category}</p>
                </div>
              </div>
              <p className="text-sm font-semibold">RWF {formatCurrency(asset.current_price)}</p>
            </motion.div>
          ))}
        </div>

        {!query && (
          <div className="text-center mt-16">
            <Search className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Search for assets and symbols</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchPage;
