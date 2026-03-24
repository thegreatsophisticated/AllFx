// Mock chart data generator
export interface ChartPoint {
  date: string;
  price: number;
}

export interface ChartStats {
  open: number | null;
  todayHigh: number | null;
  todayLow: number | null;
  high52Week: number | null;
  low52Week: number | null;
  finalChange: number | null;
  percentChange: number | null;
}

export function mockChartData(stockId: string): ChartPoint[] {
  const seed = parseInt(stockId, 10) || 1;
  const points: ChartPoint[] = [];
  const now = new Date();
  let price = 100 + seed * 30;

  for (let i = 90; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    price += (Math.sin(seed + i * 0.3) * 5) + (Math.random() - 0.48) * 8;
    price = Math.max(10, price);
    points.push({
      date: date.toISOString().split("T")[0],
      price: Math.round(price * 100) / 100,
    });
  }

  return points;
}

export function extractChartStats(data: ChartPoint[]): ChartStats {
  if (!data.length) {
    return { open: null, todayHigh: null, todayLow: null, high52Week: null, low52Week: null, finalChange: null, percentChange: null };
  }

  const prices = data.map((d) => d.price);
  const lastPrice = prices[prices.length - 1];
  const prevPrice = prices.length > 1 ? prices[prices.length - 2] : lastPrice;

  // "Today" = last entry, simplified
  const todayHigh = Math.max(...prices.slice(-5));
  const todayLow = Math.min(...prices.slice(-5));

  return {
    open: prices.length > 1 ? prices[prices.length - 2] : prices[0],
    todayHigh: Math.round(todayHigh * 100) / 100,
    todayLow: Math.round(todayLow * 100) / 100,
    high52Week: Math.round(Math.max(...prices) * 100) / 100,
    low52Week: Math.round(Math.min(...prices) * 100) / 100,
    finalChange: Math.round((lastPrice - prevPrice) * 100) / 100,
    percentChange: prevPrice ? Math.round(((lastPrice - prevPrice) / prevPrice) * 10000) / 100 : 0,
  };
}
