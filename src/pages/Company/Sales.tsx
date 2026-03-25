import React, { useState, useEffect, useLayoutEffect, useCallback, useMemo } from "react";
import { useNavigate, useLocation } from "react-router";
import apiService, { Party, Sale, SalePartyInfo, PaginatedParties } from "../../services/api";
import swal from "../../utils/swalHelper";
import { Plus, Search, Edit, Trash2, Receipt } from "lucide-react";
import { TableSkeleton } from "../../components/common/Skeleton";

function partyLabel(sale: Sale): string {
  const p = sale.partyId;
  if (p && typeof p === "object" && "name" in p) {
    return (p as SalePartyInfo).name || "—";
  }
  return "—";
}

function saleDateToInput(iso: string): string {
  const d = new Date(iso);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatSaleDate(iso: string): string {
  return saleDateToInput(iso);
}

function localTodayInput(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function salePaid(sale: Sale): number {
  const p = sale.paidAmount != null ? Number(sale.paidAmount) : 0;
  return Math.round(p * 100) / 100;
}

function salePending(sale: Sale): number {
  const total = Number(sale.amount);
  return Math.round((total - salePaid(sale)) * 100) / 100;
}

export default function SalesPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [parties, setParties] = useState<Party[]>([]);
  const [loading, setLoading] = useState(true);
  const [partiesLoading, setPartiesLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [partyFilter, setPartyFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalDocs, setTotalDocs] = useState(0);
  const [limit] = useState(10);
  const [showModal, setShowModal] = useState(false);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [formData, setFormData] = useState({
    partyId: "",
    saleDate: localTodayInput(),
    designNumber: "",
    card: "",
    workType: "",
    hook: "",
    pricePerUnit: "",
    amount: "",
  });
  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();
  const location = useLocation();

  const loadParties = useCallback(async (): Promise<Party[]> => {
    if (user?.role !== "COMPANY") return [];
    try {
      setPartiesLoading(true);
      const res = await apiService.getParties({ page: 1, limit: 500, isActive: "all" });
      if (
        res.status === 200 &&
        res.data &&
        typeof res.data === "object" &&
        Array.isArray((res.data as PaginatedParties).docs)
      ) {
        const docs = (res.data as PaginatedParties).docs;
        setParties(docs);
        return docs;
      }
      setParties([]);
      return [];
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Could not load parties";
      swal.error("Parties", msg);
      setParties([]);
      return [];
    } finally {
      setPartiesLoading(false);
    }
  }, [user]);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        setUser(userData);
        if (userData.role !== "COMPANY") {
          navigate("/");
        }
      } catch (e) {
        console.error("Error parsing user:", e);
      }
    }
  }, [navigate]);

  useEffect(() => {
    if (user?.role === "COMPANY" && location.pathname === "/company/sales") {
      void loadParties();
    }
  }, [user, location.pathname, loadParties]);

  const activeParties = useMemo(
    () => parties.filter((p) => p.isActive !== false),
    [parties]
  );

  /** Debounce text search so the API is not called on every keystroke */
  useEffect(() => {
    const id = window.setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 400);
    return () => window.clearTimeout(id);
  }, [searchTerm]);

  /** Reset page when debounced search changes — layout effect so page is 1 before fetch runs */
  useLayoutEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch]);

  const fetchSales = useCallback(async () => {
    if (user?.role !== "COMPANY") return;
    try {
      setLoading(true);
      const params: Record<string, unknown> = {
        page: currentPage,
        limit,
        search: debouncedSearch.trim() || undefined,
      };
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;
      if (partyFilter !== "all") params.partyId = partyFilter;

      const response = await apiService.getSales(params);
      if (response.status === 200 && response.data) {
        setSales(response.data.docs || []);
        setTotalPages(response.data.totalPages || 1);
        setTotalDocs(response.data.totalDocs || 0);
      } else {
        throw new Error(response.message || "Failed to load sales");
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to load sales";
      swal.error("Error", message);
    } finally {
      setLoading(false);
    }
  }, [user, currentPage, limit, debouncedSearch, dateFrom, dateTo, partyFilter]);

  useEffect(() => {
    if (user?.role === "COMPANY") {
      void fetchSales();
    }
  }, [user, fetchSales]);

  const openCreate = async () => {
    const list = await loadParties();
    const active = list.filter((p) => p.isActive !== false);
    setEditingSale(null);
    setFormData({
      partyId: active[0]?._id || "",
      saleDate: localTodayInput(),
      designNumber: "",
      card: "",
      workType: "",
      hook: "",
      pricePerUnit: "",
      amount: "",
    });
    setShowModal(true);
  };

  const openEdit = async (sale: Sale) => {
    try {
      await loadParties();
      const res = await apiService.getSaleById(sale._id);
      const s = res.data?.sale || sale;
      setEditingSale(s);
      setFormData({
        partyId: typeof s.partyId === "object" ? (s.partyId as SalePartyInfo)._id : s.partyId,
        saleDate: saleDateToInput(s.saleDate),
        designNumber: s.designNumber || "",
        card: s.card || "",
        workType: s.workType || "",
        hook: s.hook || "",
        pricePerUnit: s.pricePerUnit != null ? String(s.pricePerUnit) : "",
        amount: String(s.amount ?? ""),
      });
      setShowModal(true);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to load sale";
      swal.error("Error", message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.partyId) {
      swal.error("Validation", "Please select a party");
      return;
    }
    const amount = parseFloat(formData.amount);
    if (Number.isNaN(amount) || amount < 0) {
      swal.error("Validation", "Enter a valid amount");
      return;
    }
    const pricePerUnit =
      formData.pricePerUnit.trim() === "" ? 0 : parseFloat(formData.pricePerUnit);
    if (Number.isNaN(pricePerUnit) || pricePerUnit < 0) {
      swal.error("Validation", "Enter a valid price per unit");
      return;
    }

    try {
      const payload = {
        partyId: formData.partyId,
        saleDate: formData.saleDate,
        designNumber: formData.designNumber,
        card: formData.card,
        workType: formData.workType,
        hook: formData.hook,
        pricePerUnit,
        amount,
      };

      if (editingSale) {
        await apiService.updateSale({ id: editingSale._id, ...payload });
        swal.success("Success", "Sale updated successfully");
      } else {
        await apiService.createSale(payload);
        swal.success("Success", "Sale recorded successfully");
      }
      setShowModal(false);
      setEditingSale(null);
      void fetchSales();
      void loadParties();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Operation failed";
      swal.error("Error", message);
    }
  };

  const handleDelete = async (id: string) => {
    const result = await swal.confirm(
      "Delete sale",
      "Remove this sale record permanently?",
      "Yes, delete"
    );
    if (!result.isConfirmed) return;
    try {
      await apiService.deleteSale(id);
      swal.success("Success", "Sale deleted");
      void fetchSales();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to delete";
      swal.error("Error", message);
    }
  };

  if (user?.role !== "COMPANY") {
    return null;
  }

  return (
    <>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Sales</h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Daily sale entries by party — design number, card, work type, hook, price/unit, and amount
          </p>
        </div>
        <button
          type="button"
          onClick={() => void openCreate()}
          disabled={partiesLoading || activeParties.length === 0}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="h-4 w-4" />
          Add sale
        </button>
      </div>

      {activeParties.length === 0 && !partiesLoading && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800 px-4 py-3 text-sm text-amber-900 dark:text-amber-200">
          Add at least one <strong className="font-semibold">active</strong> party on the Parties page, then open Sales again or click &quot;Add sale&quot; to refresh the list.
        </div>
      )}

      <div className="mb-6 space-y-3">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search design, card, work type, hook..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 py-2.5 pl-10 pr-4 text-sm text-gray-900 dark:text-white focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20"
            />
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <label className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setCurrentPage(1);
              }}
              className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white"
            />
            <label className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">To</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setCurrentPage(1);
              }}
              className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white"
            />
            <select
              value={partyFilter}
              onChange={(e) => {
                setPartyFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white min-w-[160px]"
            >
              <option value="all">All parties</option>
              {parties.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900 overflow-hidden">
        {loading ? (
          <TableSkeleton rows={5} columns={10} />
        ) : sales.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1020px]">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">
                      Party
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">
                      Design #
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">
                      Card
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">
                      Work type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">
                      Hook
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">
                      Price/unit
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">
                      Amount
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">
                      Paid
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">
                      Pending
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {sales.map((sale) => (
                    <tr key={sale._id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                      <td className="px-4 py-3 text-sm text-gray-800 dark:text-gray-200 whitespace-nowrap">
                        {formatSaleDate(sale.saleDate)}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                        {partyLabel(sale)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{sale.designNumber || "—"}</td>
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{sale.card || "—"}</td>
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{sale.workType || "—"}</td>
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{sale.hook || "—"}</td>
                      <td className="px-4 py-3 text-sm text-right tabular-nums text-gray-800 dark:text-gray-200">
                        {Number(sale.pricePerUnit ?? 0).toLocaleString(undefined, {
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-medium tabular-nums text-gray-900 dark:text-white">
                        {Number(sale.amount).toLocaleString(undefined, {
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td className="px-4 py-3 text-sm text-right tabular-nums text-gray-600 dark:text-gray-400">
                        {salePaid(sale).toLocaleString(undefined, {
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-medium tabular-nums text-amber-700 dark:text-amber-400">
                        {salePending(sale).toLocaleString(undefined, {
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => openEdit(sale)}
                          className="p-1.5 text-brand-600 hover:bg-brand-600/10 rounded-lg inline-flex"
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(sale._id)}
                          className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg inline-flex"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="border-t border-gray-200 dark:border-gray-800 px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Showing {(currentPage - 1) * limit + 1}–{Math.min(currentPage * limit, totalDocs)} of{" "}
                  {totalDocs}
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
            {totalPages <= 1 && totalDocs > 0 && (
              <div className="border-t border-gray-200 dark:border-gray-800 px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                {totalDocs} {totalDocs === 1 ? "sale" : "sales"}
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-16 px-4">
            <Receipt className="h-12 w-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
            <p className="text-gray-900 dark:text-white font-medium">No sales yet</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Create a sale entry with party and line details
            </p>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {editingSale ? "Edit sale" : "New sale entry"}
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Sale date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={formData.saleDate}
                  onChange={(e) => setFormData({ ...formData, saleDate: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Party <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={formData.partyId}
                  onChange={(e) => setFormData({ ...formData, partyId: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
                >
                  <option value="">Select party</option>
                  {activeParties.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Design number
                  </label>
                  <input
                    type="text"
                    value={formData.designNumber}
                    onChange={(e) => setFormData({ ...formData, designNumber: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Card</label>
                  <input
                    type="text"
                    value={formData.card}
                    onChange={(e) => setFormData({ ...formData, card: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Work type
                  </label>
                  <input
                    type="text"
                    value={formData.workType}
                    onChange={(e) => setFormData({ ...formData, workType: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Hook</label>
                  <input
                    type="text"
                    value={formData.hook}
                    onChange={(e) => setFormData({ ...formData, hook: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Price / unit
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={formData.pricePerUnit}
                    onChange={(e) => setFormData({ ...formData, pricePerUnit: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Amount <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    step="any"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-lg bg-brand-600 py-2.5 text-sm font-medium text-white hover:bg-brand-700"
                >
                  {editingSale ? "Update" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
