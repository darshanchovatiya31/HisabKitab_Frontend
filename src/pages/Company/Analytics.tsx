import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router";
import Chart from "react-apexcharts";
import type { ApexOptions } from "apexcharts";
import apiService, {
  AnalyticsRange,
  CompanyAnalyticsData,
  AnalyticsBucketRow,
} from "../../services/api";
import swal from "../../utils/swalHelper";
import {
  BarChart3,
  TrendingUp,
  Receipt,
  Wallet,
  Banknote,
  Loader2,
  AlertCircle,
} from "lucide-react";

const RANGES: { id: AnalyticsRange; label: string; hint: string }[] = [
  { id: "week", label: "Weekly", hint: "Last 7 days (daily)" },
  { id: "month", label: "Monthly", hint: "This calendar month (daily)" },
  { id: "year", label: "Yearly", hint: "This year (monthly)" },
  { id: "all", label: "All time", hint: "From first record (monthly)" },
];

function num(v: unknown): number {
  const n = typeof v === "string" ? parseFloat(v) : Number(v);
  return Number.isNaN(n) ? 0 : n;
}

function formatInr(n: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n);
}

function StatTile({
  title,
  value,
  sub,
  icon: Icon,
  accent,
}: {
  title: string;
  value: string;
  sub?: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: "slate" | "emerald" | "amber" | "rose" | "violet";
}) {
  const ring: Record<string, string> = {
    slate: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    emerald: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    amber: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
    rose: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300",
    violet: "bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300",
  };
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900/60">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">{title}</p>
          <p className="mt-2 text-lg font-bold tabular-nums text-gray-900 dark:text-white sm:text-xl">{value}</p>
          {sub && <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{sub}</p>}
        </div>
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${ring[accent]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

/** Match chart colors to light/dark without relying on React context (avoids issues if React is duplicated). */
function useDocumentDarkClass(): boolean {
  const [isDark, setIsDark] = useState(() =>
    typeof document !== "undefined" ? document.documentElement.classList.contains("dark") : false
  );
  useEffect(() => {
    const el = document.documentElement;
    const sync = () => setIsDark(el.classList.contains("dark"));
    sync();
    const obs = new MutationObserver(sync);
    obs.observe(el, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);
  return isDark;
}

export default function AnalyticsPage() {
  const navigate = useNavigate();
  const isDark = useDocumentDarkClass();

  const [user, setUser] = useState<any>(null);
  const [range, setRange] = useState<AnalyticsRange>("month");
  const [data, setData] = useState<CompanyAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const s = localStorage.getItem("user");
    if (s) {
      try {
        const u = JSON.parse(s);
        setUser(u);
        if (u.role !== "COMPANY") navigate("/");
      } catch {
        /* ignore */
      }
    }
  }, [navigate]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiService.getCompanyAnalytics(range);
      if (res.status === 200 && res.data && typeof res.data === "object") {
        setData(res.data as CompanyAnalyticsData);
      } else {
        throw new Error(res.message || "Failed to load analytics");
      }
    } catch (e: unknown) {
      swal.error("Analytics", e instanceof Error ? e.message : "Failed to load");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    if (user?.role === "COMPANY") void load();
  }, [user, load]);

  const series = data?.series ?? [];
  const summary = data?.summary;

  const categories = useMemo(() => series.map((r) => r.label), [series]);

  const mainChartOptions: ApexOptions = useMemo(() => {
    const border = isDark ? "#374151" : "#e5e7eb";
    const fore = isDark ? "#d1d5db" : "#4b5563";
    return {
      chart: {
        type: "area",
        toolbar: { show: true },
        fontFamily: "Inter, system-ui, sans-serif",
        foreColor: fore,
        zoom: { enabled: false },
      },
      stroke: { curve: "smooth", width: 2 },
      dataLabels: { enabled: false },
      fill: {
        type: "gradient",
        gradient: {
          shadeIntensity: 1,
          opacityFrom: 0.35,
          opacityTo: 0.05,
        },
      },
      xaxis: {
        categories,
        labels: { rotate: -45, rotateAlways: series.length > 10 },
        axisBorder: { color: border },
        axisTicks: { color: border },
      },
      yaxis: {
        labels: {
          formatter: (val: number) =>
            new Intl.NumberFormat("en-IN", { notation: "compact", compactDisplay: "short" }).format(val),
        },
      },
      grid: { borderColor: border, strokeDashArray: 4 },
      legend: { position: "top", horizontalAlign: "left",
        labels: { colors: fore },
      },
      tooltip: {
        shared: true,
        y: {
          formatter: (val: number) => formatInr(val),
        },
      },
      colors: ["#4f46e5", "#059669", "#d97706"],
    };
  }, [categories, isDark, series.length]);

  const mainChartSeries = useMemo(
    () => [
      {
        name: "Sales billed",
        data: series.map((r) => num(r.salesBilled)),
      },
      {
        name: "Payments received",
        data: series.map((r) => num(r.paymentsReceived)),
      },
      {
        name: "Expenses",
        data: series.map((r) => num(r.expenses)),
      },
    ],
    [series]
  );

  const barChartOptions: ApexOptions = useMemo(() => {
    const border = isDark ? "#374151" : "#e5e7eb";
    const fore = isDark ? "#d1d5db" : "#4b5563";
    return {
      chart: {
        type: "bar",
        toolbar: { show: false },
        foreColor: fore,
      },
      plotOptions: {
        bar: {
          borderRadius: 6,
          columnWidth: "55%",
        },
      },
      dataLabels: { enabled: false },
      xaxis: {
        categories,
        labels: { rotate: -45, rotateAlways: series.length > 10 },
        axisBorder: { color: border },
      },
      yaxis: {
        labels: {
          formatter: (val: number) =>
            new Intl.NumberFormat("en-IN", { notation: "compact", compactDisplay: "short" }).format(val),
        },
      },
      grid: { borderColor: border },
      colors: ["#0891b2"],
      tooltip: {
        y: { formatter: (val: number) => formatInr(val) },
      },
    };
  }, [categories, isDark, series.length]);

  const barChartSeries = useMemo(
    () => [
      {
        name: "Net (payments − expenses)",
        data: series.map((r) => num(r.netInflow)),
      },
    ],
    [series]
  );

  if (user?.role !== "COMPANY") {
    return null;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold text-gray-900 dark:text-white">
            <BarChart3 className="h-8 w-8 text-brand-600" />
            Analytics
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-gray-600 dark:text-gray-400">
            Compare sales billed, money received, and expenses over time. Switch between weekly, monthly, yearly, and
            full history.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Time range</p>
          <div className="mt-2 inline-flex flex-wrap rounded-xl border border-gray-200 bg-gray-50 p-1 dark:border-gray-700 dark:bg-gray-800/80">
            {RANGES.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setRange(r.id)}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  range === r.id
                    ? "bg-white text-brand-700 shadow-sm dark:bg-gray-900 dark:text-brand-400"
                    : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            {RANGES.find((x) => x.id === range)?.hint}
          </p>
        </div>
        {data?.periodLabel && (
          <div className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm dark:border-gray-700 dark:bg-gray-900/50">
            <span className="text-gray-500 dark:text-gray-400">View: </span>
            <span className="font-medium text-gray-900 dark:text-white">{data.periodLabel}</span>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-gray-500">
          <Loader2 className="h-6 w-6 animate-spin" />
          Loading analytics…
        </div>
      ) : (
        <>
          {summary && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <StatTile
                title="Sales billed (period)"
                value={formatInr(num(summary.salesBilled))}
                sub={`${num(summary.saleLines)} sale lines`}
                icon={Receipt}
                accent="violet"
              />
              <StatTile
                title="Payments received"
                value={formatInr(num(summary.paymentsReceived))}
                sub={`${num(summary.paymentRecords)} payment records`}
                icon={Banknote}
                accent="emerald"
              />
              <StatTile
                title="Expenses"
                value={formatInr(num(summary.expenses))}
                sub={`${num(summary.expenseLines)} expense lines`}
                icon={Wallet}
                accent="amber"
              />
              <StatTile
                title="Outstanding (all sales)"
                value={formatInr(num(summary.outstanding))}
                sub="Still to collect on open lines"
                icon={AlertCircle}
                accent="rose"
              />
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900/50 lg:col-span-2">
              <h3 className="mb-1 text-sm font-semibold text-gray-900 dark:text-white">Trends</h3>
              <p className="mb-4 text-xs text-gray-500 dark:text-gray-400">
                Billed sales vs payments received vs expenses (by period bucket)
              </p>
              {series.length > 0 ? (
                <Chart
                  key={`main-${range}-${isDark ? "d" : "l"}`}
                  options={mainChartOptions}
                  series={mainChartSeries}
                  type="area"
                  height={360}
                />
              ) : (
                <p className="py-12 text-center text-sm text-gray-500">No data in this range.</p>
              )}
            </div>
            <div className="rounded-xl border border-gray-200 bg-gradient-to-br from-brand-50/90 to-white p-4 shadow-sm dark:border-gray-800 dark:from-brand-950/40 dark:to-gray-900/50">
              <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
                <TrendingUp className="h-4 w-4 text-brand-600" />
                Period summary
              </h3>
              <p className="mb-4 text-xs text-gray-500 dark:text-gray-400">Cash-style net for the selected range</p>
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Net inflow (payments − expenses)</p>
                  <p className="mt-1 text-2xl font-bold tabular-nums text-gray-900 dark:text-white">
                    {formatInr(num(summary?.netInflow))}
                  </p>
                </div>
                <div className="border-t border-gray-200 pt-4 dark:border-gray-700">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Total billed in range</p>
                  <p className="mt-1 text-lg font-semibold tabular-nums text-gray-800 dark:text-gray-200">
                    {formatInr(num(summary?.salesBilled))}
                  </p>
                </div>
                <div className="border-t border-gray-200 pt-4 dark:border-gray-700">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Total expenses in range</p>
                  <p className="mt-1 text-lg font-semibold tabular-nums text-gray-800 dark:text-gray-200">
                    {formatInr(num(summary?.expenses))}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900/50">
            <h3 className="mb-1 text-sm font-semibold text-gray-900 dark:text-white">Net per period</h3>
            <p className="mb-4 text-xs text-gray-500 dark:text-gray-400">
              Payments received minus expenses in each bucket (can be negative)
            </p>
            {series.length > 0 ? (
              <Chart
                key={`bar-${range}-${isDark ? "d" : "l"}`}
                options={barChartOptions}
                series={barChartSeries}
                type="bar"
                height={280}
              />
            ) : (
              <p className="py-8 text-center text-sm text-gray-500">No data.</p>
            )}
          </div>

          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900/50">
            <div className="border-b border-gray-200 px-4 py-3 dark:border-gray-800 sm:px-6">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Detailed breakdown</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Same numbers as the charts, per bucket</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50/90 text-left text-xs font-semibold uppercase text-gray-600 dark:border-gray-800 dark:bg-gray-800/50 dark:text-gray-400">
                    <th className="px-4 py-3">Period</th>
                    <th className="px-4 py-3 text-right">Sales billed</th>
                    <th className="px-4 py-3 text-right">Payments</th>
                    <th className="px-4 py-3 text-right">Expenses</th>
                    <th className="px-4 py-3 text-right">Net</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {series.map((row: AnalyticsBucketRow) => (
                    <tr key={row.key} className="hover:bg-gray-50/80 dark:hover:bg-gray-800/40">
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{row.label}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-gray-800 dark:text-gray-200">
                        {formatInr(num(row.salesBilled))}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-emerald-700 dark:text-emerald-400">
                        {formatInr(num(row.paymentsReceived))}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-amber-800 dark:text-amber-300">
                        {formatInr(num(row.expenses))}
                      </td>
                      <td
                        className={`px-4 py-3 text-right font-medium tabular-nums ${
                          num(row.netInflow) >= 0
                            ? "text-emerald-700 dark:text-emerald-400"
                            : "text-rose-700 dark:text-rose-400"
                        }`}
                      >
                        {formatInr(num(row.netInflow))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {series.length === 0 && (
                <p className="py-10 text-center text-sm text-gray-500">No rows for this range.</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
