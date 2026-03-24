import { useState } from "react";
import { TrendingUp, TrendingDown, Delete, Check } from "lucide-react";

const formatCurrency = (value: number) =>
  value.toLocaleString("en-RW", { minimumFractionDigits: 2 });

interface BuySellPanelProps {
  asset: any;
  disabled?: boolean;
  onBuy: (price: number, quantity: number) => void;
  onSell: (price: number, quantity: number) => void;
  onCancel: () => void;
}

const BuySellPanel = ({ asset, disabled = false, onBuy, onSell, onCancel }: BuySellPanelProps) => {
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("");
  const [activeField, setActiveField] = useState<"price" | "quantity" | null>(null);

  const handleKey = (key: string) => {
    const setter = activeField === "quantity" ? setQuantity : setPrice;
    const value = activeField === "quantity" ? quantity : price;

    if (key === "del") {
      setter(value.slice(0, -1));
    } else if (key === "enter") {
      setActiveField(null);
    } else {
      setter(value + key);
    }
  };

  const handleBuy = () => {
    const p = parseFloat(price);
    const q = parseInt(quantity);
    if (!p || !q) return;
    onBuy(p, q);
    setPrice("");
    setQuantity("");
  };

  const handleSell = () => {
    const p = parseFloat(price);
    const q = parseInt(quantity);
    if (!p || !q) return;
    onSell(p, q);
    setPrice("");
    setQuantity("");
  };

  return (
    <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-card border-t border-border z-50">
      <div className="p-3">
        {/* Ask / Bid prices */}
        <div className="flex gap-3 mb-3">
          <div className="flex items-center gap-1 text-xs">
            <TrendingUp className="w-3.5 h-3.5 text-accent" />
            <span className="text-accent font-semibold">
              Ask: RWF {formatCurrency(asset.min_sell_price ?? 0)}
            </span>
          </div>
          <div className="flex items-center gap-1 text-xs">
            <TrendingDown className="w-3.5 h-3.5 text-destructive" />
            <span className="text-destructive font-semibold">
              Bid: RWF {formatCurrency(asset.max_buy_price ?? 0)}
            </span>
          </div>
        </div>

        {/* Price & Quantity inputs */}
        <div className="flex gap-2 mb-3">
          <button
            disabled={disabled}
            onClick={() => setActiveField("price")}
            className={`flex-1 py-2.5 px-3 rounded-lg border text-left text-sm ${
              activeField === "price"
                ? "border-primary bg-primary/10"
                : "border-border bg-secondary"
            } disabled:opacity-50`}
          >
            <span className="text-xs text-muted-foreground block">Price</span>
            <span className="font-semibold">{price ? `RWF ${price}` : "—"}</span>
          </button>
          <button
            disabled={disabled}
            onClick={() => setActiveField("quantity")}
            className={`flex-1 py-2.5 px-3 rounded-lg border text-left text-sm ${
              activeField === "quantity"
                ? "border-primary bg-primary/10"
                : "border-border bg-secondary"
            } disabled:opacity-50`}
          >
            <span className="text-xs text-muted-foreground block">Quantity</span>
            <span className="font-semibold">{quantity || "—"}</span>
          </button>
        </div>

        {/* Action buttons or keyboard */}
        {activeField === null ? (
          <div className="flex gap-2">
            <button
              onClick={handleSell}
              disabled={disabled}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-destructive text-destructive-foreground text-sm font-semibold disabled:opacity-50"
            >
              <TrendingDown className="w-4 h-4" />
              {disabled ? "Processing..." : "Sell"}
            </button>
            <button
              onClick={onCancel}
              disabled={disabled}
              className="flex-1 py-2.5 rounded-lg bg-secondary text-secondary-foreground text-sm font-semibold disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleBuy}
              disabled={disabled}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-accent text-accent-foreground text-sm font-semibold disabled:opacity-50"
            >
              <TrendingUp className="w-4 h-4" />
              {disabled ? "Processing..." : "Buy"}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-6 gap-1">
            {["1", "2", "3", "4", "5"].map((k) => (
              <button
                key={k}
                onClick={() => handleKey(k)}
                className="py-2.5 rounded-lg bg-secondary text-foreground text-sm font-semibold"
              >
                {k}
              </button>
            ))}
            <button
              onClick={() => handleKey("del")}
              className="py-2.5 rounded-lg bg-secondary text-muted-foreground"
            >
              <Delete className="w-4 h-4 mx-auto" />
            </button>
            {["6", "7", "8", "9", "0"].map((k) => (
              <button
                key={k}
                onClick={() => handleKey(k)}
                className="py-2.5 rounded-lg bg-secondary text-foreground text-sm font-semibold"
              >
                {k}
              </button>
            ))}
            <button
              onClick={() => handleKey("enter")}
              className="py-2.5 rounded-lg bg-primary text-primary-foreground"
            >
              <Check className="w-4 h-4 mx-auto" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default BuySellPanel;