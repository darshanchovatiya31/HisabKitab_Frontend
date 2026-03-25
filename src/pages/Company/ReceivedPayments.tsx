import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router";
import apiService, {
  Party,
  PaginatedParties,
  PendingSaleRow,
  ReceivedPayment,
  SalePartyInfo,
  PAYMENT_METHOD_KEYS,
  PAYMENT_METHOD_LABELS,
} from "../../services/api";
import swal from "../../utils/swalHelper";
import { Banknote, Loader2 } from "lucide-react";
import { TableSkeleton } from "../../components/common/Skeleton";

function localTodayInput(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatMoney(n: number): string {
  return Number(n).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function roundMoney(n: number): number {
  return Math.round(Number(n) * 100) / 100;
}

function formatSaleDate(iso: string): string {
  const d = new Date(iso);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function partyName(p: Party | string | SalePartyInfo): string {
  if (p && typeof p === "object" && "name" in p) {
    return (p as SalePartyInfo).name || "—";
  }
  return "—";
}

/**
 * FIFO allocation (oldest first) — mirrors backend receivedPayment.controller.js
 */
function computeFifoPreview(
  pendingSales: PendingSaleRow[],
  selectedIds: Set<string>,
  paymentAmountRaw: number
): {
  allocations: { saleId: string; amount: number }[];
  error?: string;
  totalPending: number;
} {
  const selected = pendingSales.filter((s) => selectedIds.has(s._id));
  selected.sort((a, b) => {
    const da = new Date(a.saleDate).getTime();
    const db = new Date(b.saleDate).getTime();
    if (da !== db) return da - db;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });

  const rows = selected.map((s) => {
    const paid = roundMoney(s.paidAmount ?? 0);
    const total = roundMoney(s.amount);
    const pending =
      s.pendingAmount != null ? roundMoney(s.pendingAmount) : roundMoney(total - paid);
    return { sale: s, pending };
  });

  for (const r of rows) {
    if (r.pending <= 0) {
      return { allocations: [], error: "One or more selected sales have no pending balance.", totalPending: 0 };
    }
  }

  const totalPending = roundMoney(rows.reduce((sum, r) => sum + r.pending, 0));

  if (selectedIds.size === 0) {
    return { allocations: [], totalPending };
  }

  if (Number.isNaN(paymentAmountRaw)) {
    return { allocations: [], error: "Enter a valid payment amount.", totalPending };
  }

  const target = roundMoney(paymentAmountRaw);
  if (target <= 0) {
    return { allocations: [], error: "Enter a payment amount greater than zero.", totalPending };
  }

  if (target > totalPending + 0.005) {
    return {
      allocations: [],
      error: `Payment cannot exceed total pending (${formatMoney(totalPending)}) for selected sales.`,
      totalPending,
    };
  }

  let remaining = target;
  const allocations: { saleId: string; amount: number }[] = [];
  for (const r of rows) {
    if (remaining <= 0) break;
    const alloc = roundMoney(Math.min(remaining, r.pending));
    if (alloc > 0) {
      allocations.push({ saleId: r.sale._id, amount: alloc });
      remaining = roundMoney(remaining - alloc);
    }
  }

  const sumAlloc = roundMoney(allocations.reduce((s, a) => s + a.amount, 0));
  if (Math.abs(sumAlloc - target) > 0.02) {
    return { allocations: [], error: "Allocation mismatch.", totalPending };
  }

  return { allocations, totalPending };
}

export default function ReceivedPaymentsPage() {
  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();

  const [parties, setParties] = useState<Party[]>([]);
  const [partiesLoading, setPartiesLoading] = useState(true);
  const [partyId, setPartyId] = useState("");
  const [pendingSales, setPendingSales] = useState<PendingSaleRow[]>([]);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<(typeof PAYMENT_METHOD_KEYS)[number]>("CASH");
  const [paymentDate, setPaymentDate] = useState(localTodayInput());
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [history, setHistory] = useState<ReceivedPayment[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);
  const [historyTotalDocs, setHistoryTotalDocs] = useState(0);
  const [historyPartyFilter, setHistoryPartyFilter] = useState<string>("all");
  const historyLimit = 10;

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) {
      try {
        const u = JSON.parse(stored);
        setUser(u);
        if (u.role !== "COMPANY") navigate("/");
      } catch {
        /* ignore */
      }
    }
  }, [navigate]);

  const loadParties = useCallback(async () => {
    if (user?.role !== "COMPANY") return;
    try {
      setPartiesLoading(true);
      const res = await apiService.getParties({ page: 1, limit: 500, isActive: "all" });
      if (res.status === 200 && res.data && typeof res.data === "object" && "docs" in res.data) {
        setParties((res.data as PaginatedParties).docs);
      }
    } catch (e: unknown) {
      swal.error("Parties", e instanceof Error ? e.message : "Failed to load parties");
    } finally {
      setPartiesLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void loadParties();
  }, [loadParties]);

  const loadPending = useCallback(async (pid: string) => {
    if (!pid) {
      setPendingSales([]);
      setSelectedIds(new Set());
      return;
    }
    try {
      setPendingLoading(true);
      const res = await apiService.getPendingSalesByParty(pid);
      if (res.status === 200 && res.data && typeof res.data === "object" && res.data !== null) {
        const data = res.data as { sales?: PendingSaleRow[] };
        setPendingSales(Array.isArray(data.sales) ? data.sales : []);
      } else {
        setPendingSales([]);
      }
      setSelectedIds(new Set());
    } catch (e: unknown) {
      swal.error("Pending sales", e instanceof Error ? e.message : "Failed to load");
      setPendingSales([]);
    } finally {
      setPendingLoading(false);
    }
  }, []);

  useEffect(() => {
    if (partyId) void loadPending(partyId);
    else {
      setPendingSales([]);
      setSelectedIds(new Set());
    }
  }, [partyId, loadPending]);

  const loadHistory = useCallback(async () => {
    if (user?.role !== "COMPANY") return;
    try {
      setHistoryLoading(true);
      const params: Record<string, unknown> = { page: historyPage, limit: historyLimit };
      if (historyPartyFilter !== "all") params.partyId = historyPartyFilter;
      const res = await apiService.listReceivedPayments(params);
      if (res.status === 200 && res.data) {
        setHistory(res.data.docs || []);
        setHistoryTotalPages(res.data.totalPages || 1);
        setHistoryTotalDocs(res.data.totalDocs || 0);
      }
    } catch (e: unknown) {
      swal.error("History", e instanceof Error ? e.message : "Failed to load payments");
    } finally {
      setHistoryLoading(false);
    }
  }, [user, historyPage, historyPartyFilter]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  const paymentNum = parseFloat(paymentAmount);
  const preview = useMemo(() => {
    return computeFifoPreview(pendingSales, selectedIds, paymentNum);
  }, [pendingSales, selectedIds, paymentAmount, paymentNum]);

  const toggleSale = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllPending = () => {
    if (selectedIds.size === pendingSales.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pendingSales.map((s) => s._id)));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partyId) {
      swal.error("Validation", "Select a party");
      return;
    }
    if (selectedIds.size === 0) {
      swal.error("Validation", "Select at least one sale");
      return;
    }
    if (preview.error || !preview.allocations.length) {
      swal.error("Validation", preview.error || "Check payment amount and selection");
      return;
    }

    try {
      setSubmitting(true);
      await apiService.createReceivedPayment({
        partyId,
        saleIds: Array.from(selectedIds),
        paymentAmount: roundMoney(paymentNum),
        paymentMethod,
        paymentDate,
        notes: notes.trim() || undefined,
      });
      swal.success("Success", "Payment recorded successfully");
      setPaymentAmount("");
      setNotes("");
      await loadPending(partyId);
      await loadHistory();
    } catch (err: unknown) {
      swal.error("Error", err instanceof Error ? err.message : "Failed to record payment");
    } finally {
      setSubmitting(false);
    }
  };

  if (user?.role !== "COMPANY") {
    return null;
  }

  return (
    <div className="space-y-10">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Banknote className="h-7 w-7 text-brand-600" />
            Received payments
          </h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 max-w-2xl">
            Record money received from parties. Select pending sales (oldest are settled first). Payment cannot exceed
            the total pending on the selected lines.
          </p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 shadow-sm p-4 sm:p-6 space-y-6"
      >
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Record payment</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Party <span className="text-red-500">*</span>
            </label>
            <select
              value={partyId}
              onChange={(e) => setPartyId(e.target.value)}
              disabled={partiesLoading}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2.5 text-sm"
            >
              <option value="">Select party</option>
              {parties
                .filter((p) => p.isActive !== false)
                .map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name}
                  </option>
                ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Payment date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              required
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Amount received <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min={0}
              step="any"
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              placeholder="0.00"
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Payment method <span className="text-red-500">*</span>
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as (typeof PAYMENT_METHOD_KEYS)[number])}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2.5 text-sm"
            >
              {PAYMENT_METHOD_KEYS.map((k) => (
                <option key={k} value={k}>
                  {PAYMENT_METHOD_LABELS[k]}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes (optional)</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Reference no., remarks…"
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2.5 text-sm"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Pending sales</h4>
            {pendingSales.length > 0 && (
              <button
                type="button"
                onClick={selectAllPending}
                className="text-sm text-brand-600 hover:underline"
              >
                {selectedIds.size === pendingSales.length ? "Clear selection" : "Select all"}
              </button>
            )}
          </div>

          {pendingLoading ? (
            <div className="flex items-center gap-2 text-sm text-gray-500 py-8">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading pending sales…
            </div>
          ) : !partyId ? (
            <p className="text-sm text-gray-500 py-6">Choose a party to see unpaid sales.</p>
          ) : pendingSales.length === 0 ? (
            <p className="text-sm text-gray-500 py-6">No pending sales for this party — all caught up.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
              <table className="w-full min-w-[800px] text-sm">
                <thead>
                  <tr className="bg-gray-50/80 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
                    <th className="w-10 px-2 py-2 text-left">
                      <input
                        type="checkbox"
                        checked={selectedIds.size === pendingSales.length && pendingSales.length > 0}
                        onChange={selectAllPending}
                        className="rounded border-gray-300"
                        aria-label="Select all"
                      />
                    </th>
                    <th className="px-2 py-2 text-left text-xs font-semibold uppercase text-gray-600 dark:text-gray-400">
                      Date
                    </th>
                    <th className="px-2 py-2 text-left text-xs font-semibold uppercase text-gray-600 dark:text-gray-400">
                      Design / card
                    </th>
                    <th className="px-2 py-2 text-right text-xs font-semibold uppercase text-gray-600 dark:text-gray-400">
                      Total
                    </th>
                    <th className="px-2 py-2 text-right text-xs font-semibold uppercase text-gray-600 dark:text-gray-400">
                      Paid
                    </th>
                    <th className="px-2 py-2 text-right text-xs font-semibold uppercase text-gray-600 dark:text-gray-400">
                      Pending
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {pendingSales.map((row) => (
                    <tr key={row._id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                      <td className="px-2 py-2">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(row._id)}
                          onChange={() => toggleSale(row._id)}
                          className="rounded border-gray-300"
                        />
                      </td>
                      <td className="px-2 py-2 whitespace-nowrap text-gray-800 dark:text-gray-200">
                        {formatSaleDate(row.saleDate)}
                      </td>
                      <td className="px-2 py-2 text-gray-700 dark:text-gray-300">
                        {[row.designNumber, row.card].filter(Boolean).join(" · ") || "—"}
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums">{formatMoney(row.amount)}</td>
                      <td className="px-2 py-2 text-right tabular-nums text-gray-600 dark:text-gray-400">
                        {formatMoney(row.paidAmount ?? 0)}
                      </td>
                      <td className="px-2 py-2 text-right font-medium tabular-nums text-amber-700 dark:text-amber-400">
                        {formatMoney(row.pendingAmount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {selectedIds.size > 0 && (
          <div className="rounded-lg bg-brand-50/80 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800 px-4 py-3 space-y-2">
            <p className="text-sm font-medium text-gray-900 dark:text-white">Allocation preview (oldest first)</p>
            {preview.error && <p className="text-sm text-red-600 dark:text-red-400">{preview.error}</p>}
            {!preview.error && preview.allocations.length > 0 && (
              <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                {preview.allocations.map((a) => {
                  const sale = pendingSales.find((s) => s._id === a.saleId);
                  return (
                    <li key={a.saleId} className="flex justify-between gap-4">
                      <span>
                        {sale ? formatSaleDate(sale.saleDate) : a.saleId} —{" "}
                        {[sale?.designNumber, sale?.card].filter(Boolean).join(" · ") || "Sale"}
                      </span>
                      <span className="tabular-nums font-medium">{formatMoney(a.amount)}</span>
                    </li>
                  );
                })}
              </ul>
            )}
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Selected pending total: {formatMoney(preview.totalPending)}
            </p>
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={
              submitting ||
              !partyId ||
              selectedIds.size === 0 ||
              !!preview.error ||
              !preview.allocations.length
            }
            className="inline-flex items-center justify-center rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? "Saving…" : "Record payment"}
          </button>
        </div>
      </form>

      <div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent received payments</h3>
          <select
            value={historyPartyFilter}
            onChange={(e) => {
              setHistoryPartyFilter(e.target.value);
              setHistoryPage(1);
            }}
            className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm max-w-xs"
          >
            <option value="all">All parties</option>
            {parties.map((p) => (
              <option key={p._id} value={p._id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 overflow-hidden">
          {historyLoading ? (
            <TableSkeleton rows={4} columns={6} />
          ) : history.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50">
                      <th className="px-3 py-3 text-left text-xs font-semibold uppercase">Date</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold uppercase">Party</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold uppercase">Method</th>
                      <th className="px-3 py-3 text-right text-xs font-semibold uppercase">Amount</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold uppercase">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                    {history.map((hp) => (
                      <tr key={hp._id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                        <td className="px-3 py-3 whitespace-nowrap text-gray-800 dark:text-gray-200">
                          {formatSaleDate(hp.paymentDate)}
                        </td>
                        <td className="px-3 py-3 font-medium text-gray-900 dark:text-white">
                          {partyName(hp.partyId)}
                        </td>
                        <td className="px-3 py-3 text-gray-700 dark:text-gray-300">
                          {PAYMENT_METHOD_LABELS[hp.paymentMethod] || hp.paymentMethod}
                        </td>
                        <td className="px-3 py-3 text-right font-medium tabular-nums">{formatMoney(hp.amount)}</td>
                        <td className="px-3 py-3 text-gray-600 dark:text-gray-400 max-w-[200px] truncate">
                          {hp.notes || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {historyTotalPages > 1 && (
                <div className="border-t border-gray-200 dark:border-gray-800 px-4 py-3 flex justify-between items-center">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Page {historyPage} of {historyTotalPages} ({historyTotalDocs} total)
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={historyPage <= 1}
                      onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                      className="px-3 py-1.5 text-sm rounded-lg border disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      disabled={historyPage >= historyTotalPages}
                      onClick={() => setHistoryPage((p) => Math.min(historyTotalPages, p + 1))}
                      className="px-3 py-1.5 text-sm rounded-lg border disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <p className="text-center text-sm text-gray-500 py-12">No payments recorded yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
