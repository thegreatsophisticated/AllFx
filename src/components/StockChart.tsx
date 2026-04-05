import { useState, useMemo } from "react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  ResponsiveContainer, Tooltip, Cell,
} from "recharts";
import { TrendingUp, TrendingDown, BarChart3, LineChart, FileText, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";

export type ChartPoint = {
  date: string;
  price: number;
};

const formatCurrency = (value: number) =>
  value.toLocaleString("en-RW", { minimumFractionDigits: 2 });

const periods = ["1D", "1W", "1M", "3M", "1Y"] as const;

type ReportStatus = "idle" | "loading" | "success" | "error";

interface InvestorReport {
  [key: string]: any;
}

interface StockChartProps {
  data: ChartPoint[];
  asset: any;
  chartStats: any;
}

// ── Mobile-safe PDF opener ────────────────────────────────────────────────
const openPdfMobile = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);

  // iOS Safari / Android: window.open is the only reliable method
  const newTab = window.open(url, "_blank");

  if (!newTab) {
    // Fallback: create a visible link the user can tap manually
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  // Revoke after a delay so the new tab has time to load the blob
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
};

const StockChart = ({ data, asset, chartStats }: StockChartProps) => {
  const userId = localStorage.getItem("user_id") ?? "";

  const [period, setPeriod] = useState<(typeof periods)[number]>("3M");
  const [isLine, setIsLine] = useState(true);
  const [hoveredPoint, setHoveredPoint] = useState<ChartPoint | null>(null);

  // Report state
  const [reportStatus, setReportStatus] = useState<ReportStatus>("idle");
  const [reportData, setReportData] = useState<InvestorReport | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);
  const [showReport, setShowReport] = useState(false);

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

  // ── Generate Investor Report ──────────────────────────────────────────────
  const handleGenerateReport = async () => {
    if (!userId) {
      setReportError("User not authenticated. Please log in.");
      setReportStatus("error");
      setShowReport(true);
      return;
    }

    if (!asset?.stock_id && !asset?.id) {
      setReportError("Stock ID is missing.");
      setReportStatus("error");
      setShowReport(true);
      return;
    }

    setReportStatus("loading");
    setReportError(null);
    setReportData(null);
    setShowReport(true);

    try {
      const response = await fetch(
        "https://irebegroup.com/irebe/classes/investor_report.php/getInvestorReport",
        {
          method: "POST",
          body: JSON.stringify({
            user_id: userId,
            stock_id: asset?.stock_id ?? asset?.id,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Server error: ${response.status} ${response.statusText}`);
      }

      // Read as blob first — works for both PDF and JSON
      const blob = await response.blob();

      const contentType = response.headers.get("Content-Type") ?? blob.type ?? "";
      const isPdf =
        contentType.includes("application/pdf") ||
        contentType.includes("octet-stream") ||
        // Fallback: peek at the first bytes for the PDF magic number "%PDF"
        await blob.slice(0, 4).text().then((t) => t.startsWith("%PDF"));

      if (isPdf) {
        // ✅ Mobile-safe PDF open
        const filename = `investor-report-${asset.stock_code ?? "report"}.pdf`;
        openPdfMobile(blob, filename);
        setReportStatus("success");
        setReportData({ message: "Your report is opening in a new tab." });
      } else {
        // JSON response — parse from blob text
        const text = await blob.text();
        const json = JSON.parse(text);
        if (json?.status === "error" || json?.error) {
          throw new Error(json.message ?? json.error ?? "Failed to generate report.");
        }
        setReportData(json);
        setReportStatus("success");
      }
    } catch (err: any) {
      setReportError(err.message ?? "An unexpected error occurred.");
      setReportStatus("error");
    }
  };

  // ── Render report rows from response object ───────────────────────────────
  const renderReportRows = (obj: InvestorReport) => {
    return Object.entries(obj).map(([key, value]) => {
      if (value === null || value === undefined || value === "") return null;
      const label = key
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());

      const displayValue =
        typeof value === "object"
          ? JSON.stringify(value)
          : String(value);

      return (
        <div
          key={key}
          className="flex items-start justify-between gap-3 py-2 border-b border-border/40 last:border-0"
        >
          <span className="text-xs text-muted-foreground flex-shrink-0 w-1/2">{label}</span>
          <span className="text-xs font-medium text-right break-words w-1/2">{displayValue}</span>
        </div>
      );
    });
  };

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

      {/* ── Generate Report Button ─────────────────────────────────────────── */}
      <div className="px-4 mt-4">
        <button
          onClick={handleGenerateReport}
          disabled={reportStatus === "loading"}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
        >
          {reportStatus === "loading" ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Generating Report…
            </>
          ) : (
            <>
              <FileText className="w-4 h-4" />
              Generate Investor Report
            </>
          )}
        </button>
      </div>

      {/* ── Report Panel ───────────────────────────────────────────────────── */}
      {showReport && (
        <div className="mx-4 mt-3 rounded-xl border border-border bg-secondary/40 overflow-hidden">

          {/* Loading */}
          {reportStatus === "loading" && (
            <div className="flex flex-col items-center justify-center gap-2 py-8 text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin" />
              <p className="text-xs">Fetching your investor report…</p>
            </div>
          )}

          {/* Error */}
          {reportStatus === "error" && (
            <div className="flex flex-col items-center gap-2 p-4 text-destructive">
              <AlertCircle className="w-5 h-5" />
              <p className="text-xs text-center">{reportError}</p>
              <button
                onClick={handleGenerateReport}
                className="text-xs underline underline-offset-2 text-muted-foreground hover:text-foreground mt-1"
              >
                Try again
              </button>
            </div>
          )}

          {/* Success */}
          {reportStatus === "success" && reportData && (
            <div>
              <div className="flex items-center gap-2 px-4 py-3 border-b border-border/40">
                <CheckCircle2 className="w-4 h-4 text-accent" />
                <p className="text-xs font-semibold">Investor Report</p>
                <span className="ml-auto text-xs text-muted-foreground">{asset.stock_code}</span>
              </div>
              <div className="px-4 py-2 max-h-72 overflow-y-auto">
                {renderReportRows(reportData)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StockChart;