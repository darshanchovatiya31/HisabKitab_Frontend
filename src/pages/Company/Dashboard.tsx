import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router";
import apiService, {
  DashboardStats,
  EXPENSE_CATEGORY_LABELS,
  ExpenseCategory,
  PAYMENT_METHOD_LABELS,
  PaymentMethod,
} from "../../services/api";
import swal from "../../utils/swalHelper";
import {
  Building2,
  Users,
  Receipt,
  Wallet,
  Banknote,
  TrendingUp,
  AlertCircle,
  ArrowRight,
  IndianRupee,
  PieChart,
} from "lucide-react";
import { DashboardSkeleton } from "../../components/common/Skeleton";

function formatCurrency(n: number | string | undefined | null): string {
  const v = typeof n === "string" ? parseFloat(n) : Number(n ?? 0);
  if (Number.isNaN(v)) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(v);
}

function formatDate(iso: string | undefined): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return "—";
  }
}

function salePending(s: { amount?: number; paidAmount?: number }): number {
  const amt = Number(s.amount ?? 0);
  const paid = Number(s.paidAmount ?? 0);
  return Math.round((amt - paid) * 100) / 100;
}

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  tone = "default",
}: {
  title: string;
  value: React.ReactNode;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "default" | "emerald" | "amber" | "rose" | "violet";
}) {
  const tones: Record<string, string> = {
    default: "bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300",
    emerald: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400",
    amber: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400",
    rose: "bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400",
    violet: "bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400",
  };
  return (
    <div className="group rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md dark:border-gray-800 dark:bg-gray-900/50">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">{title}</p>
          <p className="mt-2 text-xl font-bold tabular-nums text-gray-900 dark:text-white sm:text-2xl">{value}</p>
          {subtitle && <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{subtitle}</p>}
        </div>
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tones[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function RecentTable({
  title,
  description,
  children,
  empty,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  empty?: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900/50">
      <div className="border-b border-gray-200 px-4 py-3 dark:border-gray-800 sm:px-6">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h3>
        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{description}</p>
      </div>
      {empty ? (
        <p className="px-4 py-10 text-center text-sm text-gray-500 dark:text-gray-400 sm:px-6">No records yet</p>
      ) : (
        <div className="overflow-x-auto">{children}</div>
      )}
    </div>
  );
}

export default function CompanyDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        console.error("Error parsing user:", e);
      }
    }
    void fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      const response = await apiService.getDashboardStats();
      if (response.status === 200 && response.data) {
        setStats(response.data as DashboardStats);
      } else {
        throw new Error(response.message || "Failed to load dashboard data");
      }
    } catch (error: unknown) {
      console.error("Error fetching dashboard stats:", error);
      swal.error("Error", error instanceof Error ? error.message : "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const userRole = user?.role || "";
  const displayName = useMemo(() => {
    if (stats?.company?.name) return stats.company.name;
    if (user?.name) return user.name;
    return "";
  }, [stats?.company?.name, user?.name]);

  if (loading) {
    return <DashboardSkeleton />;
  }

  const s = stats;
  const isAdmin = userRole === "SUPER_ADMIN";
  const isCompany = userRole === "COMPANY";

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {isAdmin && "Overview"}
            {isCompany && "Company dashboard"}
            {!isAdmin && !isCompany && "Dashboard"}
          </h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            {displayName ? (
              <>
                <span className="font-medium text-gray-800 dark:text-gray-200">{displayName}</span>
                {" — "}
              </>
            ) : null}
            Sales, payments, expenses, and parties at a glance.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {isCompany && (
            <>
              <Link
                to="/company/sales"
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
              >
                Sales <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <Link
                to="/company/received-payments"
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
              >
                Payments <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <Link
                to="/company/expenses"
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
              >
                Expenses <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </>
          )}
          {isAdmin && (
            <Link
              to="/company/companies"
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-xs font-medium text-white shadow-sm hover:bg-brand-700"
            >
              Companies <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
      </div>

      {/* Primary KPIs */}
      <div>
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
          <PieChart className="h-4 w-4 text-brand-600" />
          Key counts
        </h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {isAdmin && (
            <>
              <StatCard
                title="Companies"
                value={(s?.totalCompanies ?? 0).toLocaleString("en-IN")}
                subtitle={`${s?.activeCompanies ?? 0} active · ${s?.inactiveCompanies ?? 0} inactive`}
                icon={Building2}
                tone="violet"
              />
              <StatCard
                title="Parties (all)"
                value={(s?.partyCount ?? 0).toLocaleString("en-IN")}
                subtitle="Across all companies"
                icon={Users}
                tone="default"
              />
              <StatCard
                title="Sales (lines)"
                value={(s?.sales?.count ?? 0).toLocaleString("en-IN")}
                subtitle={`${formatCurrency(s?.sales?.totalPending)} pending across system`}
                icon={Receipt}
                tone="amber"
              />
              <StatCard
                title="Pending sale lines"
                value={(s?.pendingSalesCount ?? 0).toLocaleString("en-IN")}
                subtitle="Invoices with balance due"
                icon={AlertCircle}
                tone="rose"
              />
            </>
          )}
          {isCompany && (
            <>
              <StatCard
                title="Parties"
                value={(s?.partyCount ?? 0).toLocaleString("en-IN")}
                subtitle={`${s?.partyActiveCount ?? 0} active`}
                icon={Users}
                tone="violet"
              />
              <StatCard
                title="Sale entries"
                value={(s?.sales?.count ?? 0).toLocaleString("en-IN")}
                subtitle="Total line items recorded"
                icon={Receipt}
                tone="default"
              />
              <StatCard
                title="Open sale lines"
                value={(s?.pendingSalesCount ?? 0).toLocaleString("en-IN")}
                subtitle="Still to collect"
                icon={AlertCircle}
                tone="amber"
              />
              <StatCard
                title="Expense entries"
                value={(s?.expenses?.count ?? 0).toLocaleString("en-IN")}
                subtitle="Office expenses logged"
                icon={Wallet}
                tone="emerald"
              />
            </>
          )}
        </div>
      </div>

      {/* Financial summary */}
      {(isAdmin || isCompany) && (
        <div>
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
            <IndianRupee className="h-4 w-4 text-brand-600" />
            Amounts &amp; position
          </h3>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3">
            <div className="rounded-xl border border-gray-200 bg-gradient-to-br from-white to-slate-50/80 p-5 shadow-sm dark:border-gray-800 dark:from-gray-900 dark:to-gray-900/80 lg:col-span-2 xl:col-span-2">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Sales (billing)
              </p>
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Total billed</p>
                  <p className="mt-1 text-lg font-bold tabular-nums text-gray-900 dark:text-white">
                    {formatCurrency(s?.sales?.totalAmount)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Collected on sales</p>
                  <p className="mt-1 text-lg font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
                    {formatCurrency(s?.sales?.totalPaid)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Outstanding</p>
                  <p className="mt-1 text-lg font-bold tabular-nums text-amber-700 dark:text-amber-400">
                    {formatCurrency(s?.sales?.totalPending)}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900/50">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Received payments
              </p>
              <p className="mt-2 text-2xl font-bold tabular-nums text-gray-900 dark:text-white">
                {formatCurrency(s?.received?.totalAmount)}
              </p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {(s?.received?.count ?? 0).toLocaleString("en-IN")} payment record
                {(s?.received?.count ?? 0) === 1 ? "" : "s"}
              </p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900/50">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Total expenses
              </p>
              <p className="mt-2 text-2xl font-bold tabular-nums text-gray-900 dark:text-white">
                {formatCurrency(s?.expenses?.totalAmount)}
              </p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {(s?.expenses?.count ?? 0).toLocaleString("en-IN")} expense line
                {(s?.expenses?.count ?? 0) === 1 ? "" : "s"}
              </p>
            </div>

            <div className="rounded-xl border border-brand-200 bg-brand-50/80 p-5 shadow-sm dark:border-brand-900/40 dark:bg-brand-950/30 lg:col-span-2 xl:col-span-1">
              <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-brand-800 dark:text-brand-300">
                <TrendingUp className="h-4 w-4" />
                {isAdmin ? "Net (collected − expenses)" : "Net (collected on sales − expenses)"}
              </p>
              <p className="mt-2 text-2xl font-bold tabular-nums text-brand-900 dark:text-brand-100">
                {formatCurrency(isAdmin ? s?.netPosition : s?.netAfterExpenses)}
              </p>
              <p className="mt-2 text-xs text-brand-800/80 dark:text-brand-300/90">
                Uses amounts collected against sales minus total expenses. For accrual vs cash nuances, use your
                reports.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Super admin — extra system row */}
      {isAdmin && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard
            title="Users (all roles)"
            value={(s?.totalUsers ?? 0).toLocaleString("en-IN")}
            icon={Users}
            tone="default"
          />
          <StatCard
            title="Total billed (all cos.)"
            value={formatCurrency(s?.sales?.totalAmount)}
            icon={Receipt}
            tone="violet"
          />
          <StatCard
            title="Total collected (sales)"
            value={formatCurrency(s?.sales?.totalPaid)}
            subtitle="Allocated to sale lines"
            icon={Banknote}
            tone="emerald"
          />
        </div>
      )}

      {/* Recent activity tables */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">Recent activity</h3>
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-1">
          {isAdmin && s?.recentCompanies && s.recentCompanies.length > 0 && (
            <RecentTable
              title="Latest companies"
              description="Most recently registered company accounts"
              empty={false}
            >
              <table className="w-full min-w-[520px] text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50/80 text-left text-xs font-semibold uppercase text-gray-600 dark:border-gray-800 dark:bg-gray-800/50 dark:text-gray-400">
                    <th className="px-4 py-3 sm:px-6">Name</th>
                    <th className="px-4 py-3 sm:px-6">Email</th>
                    <th className="px-4 py-3 sm:px-6">Status</th>
                    <th className="px-4 py-3 sm:px-6">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {s.recentCompanies.map((c: any) => (
                    <tr key={c._id} className="hover:bg-gray-50/80 dark:hover:bg-gray-800/40">
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-white sm:px-6">{c.name}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400 sm:px-6">
                        {c.userEmail || c.email || "—"}
                      </td>
                      <td className="px-4 py-3 sm:px-6">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            c.isActive
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
                              : "bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                          }`}
                        >
                          {c.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400 sm:px-6">
                        {formatDate(c.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </RecentTable>
          )}

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <RecentTable
              title="Recent sales"
              description={isAdmin ? "Latest sale lines across companies" : "Your latest sale entries"}
              empty={!s?.recentSales?.length}
            >
              <table className="w-full min-w-[320px] text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50/80 text-left text-xs font-semibold uppercase text-gray-600 dark:border-gray-800 dark:bg-gray-800/50 dark:text-gray-400">
                    {isAdmin && <th className="px-4 py-3">Company</th>}
                    <th className="px-4 py-3">Party</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3 text-right">Pending</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {(s?.recentSales || []).map((row: any) => {
                    const party =
                      row.partyId && typeof row.partyId === "object" ? row.partyId.name : "—";
                    const company =
                      row.companyId && typeof row.companyId === "object" ? row.companyId.name : "—";
                    return (
                      <tr key={row._id} className="hover:bg-gray-50/80 dark:hover:bg-gray-800/40">
                        {isAdmin && <td className="px-4 py-3 text-gray-800 dark:text-gray-200">{company}</td>}
                        <td className="px-4 py-3 text-gray-800 dark:text-gray-200">{party}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-gray-600 dark:text-gray-400">
                          {formatDate(row.saleDate)}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums font-medium text-gray-900 dark:text-white">
                          {formatCurrency(row.amount)}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-amber-700 dark:text-amber-400">
                          {formatCurrency(salePending(row))}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </RecentTable>

            <RecentTable
              title="Recent expenses"
              description={isAdmin ? "Latest expenses across companies" : "Your latest office expenses"}
              empty={!s?.recentExpenses?.length}
            >
              <table className="w-full min-w-[280px] text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50/80 text-left text-xs font-semibold uppercase text-gray-600 dark:border-gray-800 dark:bg-gray-800/50 dark:text-gray-400">
                    {isAdmin && <th className="px-4 py-3">Company</th>}
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {(s?.recentExpenses || []).map((row: any) => {
                    const co =
                      row.companyId && typeof row.companyId === "object" ? row.companyId.name : "—";
                    return (
                      <tr key={row._id} className="hover:bg-gray-50/80 dark:hover:bg-gray-800/40">
                        {isAdmin && <td className="px-4 py-3 text-gray-800 dark:text-gray-200">{co}</td>}
                        <td className="px-4 py-3 text-gray-800 dark:text-gray-200">
                          {EXPENSE_CATEGORY_LABELS[row.category as ExpenseCategory] || row.category}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-gray-600 dark:text-gray-400">
                          {formatDate(row.expenseDate)}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums font-medium text-gray-900 dark:text-white">
                          {formatCurrency(row.amount)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </RecentTable>

            <RecentTable
              title="Recent received payments"
              description="Payments recorded against parties"
              empty={!s?.recentPayments?.length}
            >
              <table className="w-full min-w-[360px] text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50/80 text-left text-xs font-semibold uppercase text-gray-600 dark:border-gray-800 dark:bg-gray-800/50 dark:text-gray-400">
                    {isAdmin && <th className="px-4 py-3">Company</th>}
                    <th className="px-4 py-3">Party</th>
                    <th className="px-4 py-3">Method</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {(s?.recentPayments || []).map((row: any) => {
                    const party =
                      row.partyId && typeof row.partyId === "object" ? row.partyId.name : "—";
                    const co =
                      row.companyId && typeof row.companyId === "object" ? row.companyId.name : "—";
                    const method =
                      PAYMENT_METHOD_LABELS[row.paymentMethod as PaymentMethod] || row.paymentMethod;
                    return (
                      <tr key={row._id} className="hover:bg-gray-50/80 dark:hover:bg-gray-800/40">
                        {isAdmin && <td className="px-4 py-3 text-gray-800 dark:text-gray-200">{co}</td>}
                        <td className="px-4 py-3 text-gray-800 dark:text-gray-200">{party}</td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{method}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-gray-600 dark:text-gray-400">
                          {formatDate(row.paymentDate)}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums font-medium text-emerald-700 dark:text-emerald-400">
                          {formatCurrency(row.amount)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </RecentTable>
          </div>
        </div>
      </div>
    </div>
  );
}
