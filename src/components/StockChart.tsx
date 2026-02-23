import { useState, useMemo } from "react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  ResponsiveContainer, Tooltip, Cell,
} from "recharts";
import { TrendingUp, TrendingDown, BarChart3, LineChart } from "lucide-react";

export type ChartPoint = {
  date: string;
  price: number;
};

const formatCurrency = (value: number) =>
  value.toLocaleString("en-RW", { minimumFractionDigits: 2 });

const periods = ["1D", "1W", "1M", "3M", "1Y"] as const;

interface StockChartProps {
  data: ChartPoint[];
  asset: any;
  chartStats: any;
}

const StockChart = ({ data, asset, chartStats }: StockChartProps) => {
  const [period, setPeriod] = useState<(typeof periods)[number]>("3M");
  const [isLine, setIsLine] = useState(true);
  const [hoveredPoint, setHoveredPoint] = useState<ChartPoint | null>(null);

  const filteredData = useMemo(() => {
    const len = data.length;
    if (period === "1D") return data.slice(Math.max(0, len - 1));
    if (period === "1W") return data.slice(Math.max(0, len - 7));
    if (period === "1M") return data.slice(Math.max(0, len - 30));
    if (period === "3M") return data.slice(Math.max(0, len - 90));
    return data;
  }, [data, period]);

  const prices = filteredData.map((d) => d.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);

  const isUp = (asset.finalchange ?? 0) >= 0;
  const color = isUp ? "hsl(142,71%,45%)" : "hsl(0,72%,51%)";

  const displayPrice = hoveredPoint?.price ?? asset.current_price ?? asset.price;
  const displayDate = hoveredPoint?.date ?? filteredData[filteredData.length - 1]?.date ?? "";

  return (
    <div>
      {/* Detail header */}
      <div className="px-4 flex items-start gap-3 mb-2">
        <div className="w-12 h-12 rounded-full bg-secondary overflow-hidden flex items-center justify-center flex-shrink-0">
          {asset.logo ? (
            <img
              src={asset.logo}
              alt={asset.stock_code}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
                (e.target as HTMLImageElement).parentElement!.innerHTML =
                  `<span class="text-sm font-bold text-primary">${asset.stock_code.slice(0, 2)}</span>`;
              }}
            />
          ) : (
            <span className="text-sm font-bold text-primary">
              {asset.stock_code.slice(0, 2)}
            </span>
          )}
        </div>

        <div className="flex-1">
          <p className="text-sm font-semibold">{asset.stock_name}</p>
          <p className="text-2xl font-display font-bold">
            RWF {formatCurrency(displayPrice)}
          </p>

          <div
            className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-semibold mt-1 ${
              isUp ? "text-accent bg-accent/10" : "text-destructive bg-destructive/10"
            }`}
          >
            {isUp ? (
              <TrendingUp className="w-3.5 h-3.5" />
            ) : (
              <TrendingDown className="w-3.5 h-3.5" />
            )}
            <span>
              {isUp ? "+" : ""}
              {(asset.finalchange ?? 0).toFixed(2)}%
            </span>
          </div>

          {displayDate && (
            <p className="text-xs text-muted-foreground mt-0.5">{displayDate}</p>
          )}
        </div>
      </div>

      {/* Chart */}
      <div className="px-2 h-52">
        <ResponsiveContainer width="100%" height="100%">
          {isLine ? (
            <AreaChart
              data={filteredData}
              margin={{ top: 5, right: 5, left: 5, bottom: 0 }}
              onMouseMove={(e: any) => {
                if (e?.activePayload?.[0]) setHoveredPoint(e.activePayload[0].payload);
              }}
              onMouseLeave={() => setHoveredPoint(null)}
            >
              <defs>
                <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" hide />
              <YAxis domain={[min * 0.98, max * 1.02]} hide />
              <Tooltip
                contentStyle={{
                  background: "hsl(220,18%,10%)",
                  border: "1px solid hsl(220,13%,18%)",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
                labelStyle={{ color: "hsl(215,15%,55%)" }}
                formatter={(value: number) => [`RWF ${value.toFixed(2)}`, "Price"]}
              />
              <Area
                type="stepAfter"
                dataKey="price"
                stroke={color}
                strokeWidth={2}
                fill="url(#chartGrad)"
                dot={false}
              />
            </AreaChart>
          ) : (
            <BarChart
              data={filteredData}
              margin={{ top: 5, right: 5, left: 5, bottom: 0 }}
              onMouseMove={(e: any) => {
                if (e?.activePayload?.[0]) setHoveredPoint(e.activePayload[0].payload);
              }}
              onMouseLeave={() => setHoveredPoint(null)}
            >
              <XAxis dataKey="date" hide />
              <YAxis domain={[min * 0.98, max * 1.02]} hide />
              <Tooltip
                contentStyle={{
                  background: "hsl(220,18%,10%)",
                  border: "1px solid hsl(220,13%,18%)",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
                formatter={(value: number) => [`RWF ${value.toFixed(2)}`, "Price"]}
              />
              <Bar dataKey="price" radius={[4, 4, 0, 0]}>
                {filteredData.map((_, i) => (
                  <Cell key={i} fill={color} fillOpacity={0.7} />
                ))}
              </Bar>
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Period selector + chart type toggle */}
      <div className="flex items-center gap-2 px-4 mt-2">
        <div className="flex gap-1.5 flex-1">
          {periods.map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                period === p
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
        <button
          onClick={() => setIsLine(!isLine)}
          className="p-2 rounded-lg bg-secondary text-muted-foreground hover:text-foreground transition-colors"
        >
          {isLine ? <BarChart3 className="w-4 h-4" /> : <LineChart className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
};

export default StockChart;