import { useState, useEffect, useLayoutEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router";
import apiService, {
  Expense,
  ExpenseCategory,
  EXPENSE_CATEGORY_KEYS,
  EXPENSE_CATEGORY_LABELS,
} from "../../services/api";
import swal from "../../utils/swalHelper";
import { Plus, Search, Edit, Trash2, Wallet } from "lucide-react";
import { TableSkeleton } from "../../components/common/Skeleton";

function expenseDateToInput(iso: string): string {
  const d = new Date(iso);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatExpenseDate(iso: string): string {
  return expenseDateToInput(iso);
}

function localTodayInput(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const CATEGORY_OPTIONS: { value: ExpenseCategory | "all"; label: string }[] = [
  { value: "all", label: "All categories" },
  ...EXPENSE_CATEGORY_KEYS.map((k) => ({ value: k, label: EXPENSE_CATEGORY_LABELS[k] })),
];

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<ExpenseCategory | "all">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalDocs, setTotalDocs] = useState(0);
  const [limit] = useState(10);
  const [showModal, setShowModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [formData, setFormData] = useState({
    expenseDate: localTodayInput(),
    category: "RENT" as ExpenseCategory,
    title: "",
    notes: "",
    amount: "",
  });
  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();
  const location = useLocation();

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
    const id = window.setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 400);
    return () => window.clearTimeout(id);
  }, [searchTerm]);

  useLayoutEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch]);

  const fetchExpenses = useCallback(async () => {
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
      if (categoryFilter !== "all") params.category = categoryFilter;

      const response = await apiService.getExpenses(params);
      if (response.status === 200 && response.data) {
        setExpenses(response.data.docs || []);
        setTotalPages(response.data.totalPages || 1);
        setTotalDocs(response.data.totalDocs || 0);
      } else {
        throw new Error(response.message || "Failed to load expenses");
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to load expenses";
      swal.error("Error", message);
    } finally {
      setLoading(false);
    }
  }, [user, currentPage, limit, debouncedSearch, dateFrom, dateTo, categoryFilter]);

  useEffect(() => {
    if (user?.role === "COMPANY" && location.pathname === "/company/expenses") {
      void fetchExpenses();
    }
  }, [user, location.pathname, fetchExpenses]);

  const openCreate = () => {
    setEditingExpense(null);
    setFormData({
      expenseDate: localTodayInput(),
      category: "RENT",
      title: "",
      notes: "",
      amount: "",
    });
    setShowModal(true);
  };

  const openEdit = async (expense: Expense) => {
    try {
      const res = await apiService.getExpenseById(expense._id);
      const e = res.data?.expense || expense;
      setEditingExpense(e);
      setFormData({
        expenseDate: expenseDateToInput(e.expenseDate),
        category: e.category,
        title: e.title || "",
        notes: e.notes || "",
        amount: String(e.amount ?? ""),
      });
      setShowModal(true);
    } catch (err: unknown) {
      swal.error("Error", err instanceof Error ? err.message : "Failed to load expense");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(formData.amount);
    if (Number.isNaN(amount) || amount < 0) {
      swal.error("Validation", "Enter a valid amount");
      return;
    }

    try {
      const payload = {
        expenseDate: formData.expenseDate,
        category: formData.category,
        title: formData.title.trim(),
        notes: formData.notes.trim(),
        amount,
      };

      if (editingExpense) {
        await apiService.updateExpense({ id: editingExpense._id, ...payload });
        swal.success("Success", "Expense updated successfully");
      } else {
        await apiService.createExpense(payload);
        swal.success("Success", "Expense recorded successfully");
      }
      setShowModal(false);
      setEditingExpense(null);
      void fetchExpenses();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Operation failed";
      swal.error("Error", message);
    }
  };

  const handleDelete = async (id: string) => {
    const result = await swal.confirm(
      "Delete expense",
      "Remove this expense record permanently?",
      "Yes, delete"
    );
    if (!result.isConfirmed) return;
    try {
      await apiService.deleteExpense(id);
      swal.success("Success", "Expense deleted");
      void fetchExpenses();
    } catch (error: unknown) {
      swal.error("Error", error instanceof Error ? error.message : "Failed to delete");
    }
  };

  if (user?.role !== "COMPANY") {
    return null;
  }

  return (
    <>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Expenses</h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Office expenses — salary, utilities, rent, and more. Filters apply automatically.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 shadow-sm"
        >
          <Plus className="h-4 w-4" />
          Add expense
        </button>
      </div>

      <div className="mb-6 space-y-3">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search title or notes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 py-2.5 pl-10 pr-4 text-sm text-gray-900 dark:text-white focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20"
            />
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <label className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">Category</label>
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value as ExpenseCategory | "all");
                setCurrentPage(1);
              }}
              className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white min-w-[180px]"
            >
              {CATEGORY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
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
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900 overflow-hidden">
        {loading ? (
          <TableSkeleton rows={5} columns={7} />
        ) : expenses.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">
                      Category
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">
                      Title
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">
                      Notes
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">
                      Amount
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {expenses.map((row) => (
                    <tr key={row._id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                      <td className="px-4 py-3 text-sm text-gray-800 dark:text-gray-200 whitespace-nowrap">
                        {formatExpenseDate(row.expenseDate)}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                        {EXPENSE_CATEGORY_LABELS[row.category] || row.category}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{row.title || "—"}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 max-w-[220px] truncate">
                        {row.notes || "—"}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-medium tabular-nums text-gray-900 dark:text-white">
                        {Number(row.amount).toLocaleString(undefined, {
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => void openEdit(row)}
                          className="p-1.5 text-brand-600 hover:bg-brand-600/10 rounded-lg inline-flex"
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDelete(row._id)}
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
                {totalDocs} {totalDocs === 1 ? "expense" : "expenses"}
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-16 px-4">
            <Wallet className="h-12 w-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
            <p className="text-gray-900 dark:text-white font-medium">No expenses yet</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Add rent, bills, salary, and other office costs
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
                {editingExpense ? "Edit expense" : "New expense"}
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
                  Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={formData.expenseDate}
                  onChange={(e) => setFormData({ ...formData, expenseDate: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Category <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({ ...formData, category: e.target.value as ExpenseCategory })
                  }
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
                >
                  {EXPENSE_CATEGORY_KEYS.map((k) => (
                    <option key={k} value={k}>
                      {EXPENSE_CATEGORY_LABELS[k]}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  For custom items, choose &quot;Other&quot; and describe in title or notes.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Title <span className="text-gray-400">(optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. March electricity, Office rent Q1"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Notes <span className="text-gray-400">(optional)</span>
                </label>
                <textarea
                  rows={3}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white resize-y"
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
                  {editingExpense ? "Update" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
