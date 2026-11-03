import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { DashboardTrend } from "../api/types";
import { formatCurrency } from "../utils/format";


export function TrendChart({ trend }: { trend: DashboardTrend }) {
  return (
    <div className="chart-panel">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">Portfolio Trend</span>
          <h3>
            {trend.period === "weekly" ? "Week-on-week movement" : "Month-on-month movement"}
          </h3>
        </div>
      </div>
      <div className="chart-wrap">
        <ResponsiveContainer width="100%" height={320}>
          <AreaChart data={trend.points}>
            <defs>
              <linearGradient id="netWorthFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#1f9d8d" stopOpacity={0.48} />
                <stop offset="95%" stopColor="#1f9d8d" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="investmentsFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f1a84f" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#f1a84f" stopOpacity={0.03} />
              </linearGradient>
              <linearGradient id="cashFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0.03} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(120, 137, 160, 0.16)" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} />
            <YAxis
              tickFormatter={(value: number) =>
                new Intl.NumberFormat("en-IN", {
                  notation: "compact",
                  compactDisplay: "short",
                }).format(value)
              }
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              formatter={(value: number) => formatCurrency(value)}
              contentStyle={{
                borderRadius: 16,
                border: "1px solid rgba(120, 137, 160, 0.18)",
                background: "rgba(8, 15, 24, 0.96)",
                color: "#f6f7fb",
              }}
            />
            <Legend />
            <Area
              type="monotone"
              dataKey="net_worth"
              stroke="#1f9d8d"
              fill="url(#netWorthFill)"
              strokeWidth={3}
              name="Net worth"
            />
            <Area
              type="monotone"
              dataKey="investment_current_total"
              stroke="#f1a84f"
              fill="url(#investmentsFill)"
              strokeWidth={2}
              name="Investments"
            />
            <Area
              type="monotone"
              dataKey="cash_total"
              stroke="#6366f1"
              fill="url(#cashFill)"
              strokeWidth={2}
              name="Bank Account"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

