import { useState, useEffect, useLayoutEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import apiService, {
  Company,
  Expense,
  ExpenseCategory,
  EXPENSE_CATEGORY_KEYS,
  EXPENSE_CATEGORY_LABELS,
  SaleCompanyInfo,
} from "../../services/api";
import swal from "../../utils/swalHelper";
import { Search, Wallet, Building2, ChevronDown } from "lucide-react";
import { TableSkeleton } from "../../components/common/Skeleton";

function companyLabel(exp: Expense): string {
  const c = exp.companyId;
  if (c && typeof c === "object" && "name" in c) {
    return (c as SaleCompanyInfo).name || "—";
  }
  return "—";
}

function companyEmail(exp: Expense): string | undefined {
  const c = exp.companyId;
  if (c && typeof c === "object" && "email" in c) {
    return (c as SaleCompanyInfo).email;
  }
  return undefined;
}

function formatExpenseDate(iso: string): string {
  const d = new Date(iso);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const CATEGORY_OPTIONS: { value: ExpenseCategory | "all"; label: string }[] = [
  { value: "all", label: "All categories" },
  ...EXPENSE_CATEGORY_KEYS.map((k) => ({ value: k, label: EXPENSE_CATEGORY_LABELS[k] })),
];

export default function AllExpensesAdmin() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [companiesLoading, setCompaniesLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [companyFilter, setCompanyFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<ExpenseCategory | "all">("all");
  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalDocs, setTotalDocs] = useState(0);
  const [limit] = useState(10);
  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        setUser(userData);
        if (userData.role !== "SUPER_ADMIN") {
          navigate("/");
        }
      } catch (e) {
        console.error(e);
      }
    }
  }, [navigate]);

  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedSearch(searchTerm), 400);
    return () => window.clearTimeout(id);
  }, [searchTerm]);

  useLayoutEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch]);

  useEffect(() => {
    const loadCompanies = async () => {
      if (user?.role !== "SUPER_ADMIN") return;
      try {
        setCompaniesLoading(true);
        const res = await apiService.getCompanies({ page: 1, limit: 500 });
        if (res.status === 200 && res.data?.docs) {
          setCompanies(res.data.docs as Company[]);
        }
      } catch (e: unknown) {
        swal.error("Error", e instanceof Error ? e.message : "Failed to load companies");
      } finally {
        setCompaniesLoading(false);
      }
    };
    loadCompanies();
  }, [user]);

  const fetchExpenses = useCallback(async () => {
    if (user?.role !== "SUPER_ADMIN") return;
    try {
      setLoading(true);
      const params: Record<string, unknown> = {
        page: currentPage,
        limit,
        search: debouncedSearch.trim() || undefined,
      };
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;
      if (companyFilter !== "all") params.companyId = companyFilter;
      if (categoryFilter !== "all") params.category = categoryFilter;

      const response = await apiService.adminListExpenses(params);
      if (response.status === 200 && response.data) {
        setExpenses(response.data.docs || []);
        setTotalPages(response.data.totalPages || 1);
        setTotalDocs(response.data.totalDocs || 0);
      } else {
        throw new Error(response.message || "Failed to load expenses");
      }
    } catch (error: unknown) {
      swal.error("Error", error instanceof Error ? error.message : "Failed to load expenses");
    } finally {
      setLoading(false);
    }
  }, [user, currentPage, limit, debouncedSearch, dateFrom, dateTo, companyFilter, categoryFilter]);

  useEffect(() => {
    if (user?.role === "SUPER_ADMIN") {
      void fetchExpenses();
    }
  }, [user, fetchExpenses]);

  const selectedCompanyLabel =
    companyFilter === "all"
      ? "All companies"
      : companies.find((c) => c._id === companyFilter)?.name || "Company";

  if (user?.role !== "SUPER_ADMIN") {
    return null;
  }

  return (
    <>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">All expenses</h2>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Office expenses across all companies — filter by company, category, date range, and search
        </p>
      </div>

      <div className="mb-6 space-y-3">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Search updates shortly after you stop typing. Filters apply when you change them.
        </p>
        <div className="flex flex-col xl:flex-row gap-3">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search title or notes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 py-2.5 pl-10 pr-4 text-sm"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowCompanyDropdown(!showCompanyDropdown)}
                disabled={companiesLoading}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm min-w-[180px]"
              >
                <Building2 className="h-4 w-4 shrink-0" />
                <span className="truncate flex-1 text-left">{selectedCompanyLabel}</span>
                <ChevronDown className="h-4 w-4 shrink-0" />
              </button>
              {showCompanyDropdown && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowCompanyDropdown(false)} />
                  <div className="absolute left-0 mt-2 w-64 max-h-64 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg z-20 py-1">
                    <button
                      type="button"
                      onClick={() => {
                        setCompanyFilter("all");
                        setShowCompanyDropdown(false);
                        setCurrentPage(1);
                      }}
                      className={`w-full text-left px-4 py-2 text-sm ${companyFilter === "all" ? "bg-brand-600/10 text-brand-600" : ""}`}
                    >
                      All companies
                    </button>
                    {companies.map((c) => (
                      <button
                        key={c._id}
                        type="button"
                        onClick={() => {
                          setCompanyFilter(c._id);
                          setShowCompanyDropdown(false);
                          setCurrentPage(1);
                        }}
                        className={`w-full text-left px-4 py-2 text-sm ${companyFilter === c._id ? "bg-brand-600/10 text-brand-600" : ""}`}
                      >
                        <span className="block truncate">{c.name}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value as ExpenseCategory | "all");
                setCurrentPage(1);
              }}
              className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2.5 text-sm min-w-[180px]"
            >
              {CATEGORY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>

            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setCurrentPage(1);
              }}
              className="rounded-lg border border-gray-300 dark:border-gray-700 px-3 py-2.5 text-sm"
            />
            <span className="text-gray-500 text-sm">to</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setCurrentPage(1);
              }}
              className="rounded-lg border border-gray-300 dark:border-gray-700 px-3 py-2.5 text-sm"
            />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 overflow-hidden">
        {loading ? (
          <TableSkeleton rows={5} columns={8} />
        ) : expenses.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px]">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50">
                    <th className="px-3 py-3 text-left text-xs font-semibold uppercase text-gray-700 dark:text-gray-300">
                      Company
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold uppercase text-gray-700 dark:text-gray-300">
                      Date
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold uppercase text-gray-700 dark:text-gray-300">
                      Category
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold uppercase text-gray-700 dark:text-gray-300">
                      Title
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold uppercase text-gray-700 dark:text-gray-300">
                      Notes
                    </th>
                    <th className="px-3 py-3 text-right text-xs font-semibold uppercase text-gray-700 dark:text-gray-300">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {expenses.map((row) => (
                    <tr key={row._id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                      <td className="px-3 py-3 text-sm">
                        <div className="font-medium text-gray-900 dark:text-white">{companyLabel(row)}</div>
                        {companyEmail(row) && (
                          <div className="text-xs text-gray-500 truncate max-w-[140px]">{companyEmail(row)}</div>
                        )}
                      </td>
                      <td className="px-3 py-3 text-sm whitespace-nowrap text-gray-700 dark:text-gray-300">
                        {formatExpenseDate(row.expenseDate)}
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-800 dark:text-gray-200">
                        {EXPENSE_CATEGORY_LABELS[row.category] || row.category}
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-700 dark:text-gray-300">{row.title || "—"}</td>
                      <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-400 max-w-[200px] truncate">
                        {row.notes || "—"}
                      </td>
                      <td className="px-3 py-3 text-sm text-right font-medium tabular-nums text-gray-900 dark:text-white">
                        {Number(row.amount).toLocaleString(undefined, {
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="border-t border-gray-200 dark:border-gray-800 px-4 py-3 flex flex-col sm:flex-row justify-between gap-3 items-center">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Showing {(currentPage - 1) * limit + 1}–{Math.min(currentPage * limit, totalDocs)} of {totalDocs}
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="px-3 py-1.5 text-sm rounded-lg border disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="px-3 py-1.5 text-sm rounded-lg border disabled:opacity-50"
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
          <div className="text-center py-16">
            <Wallet className="h-12 w-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
            <p className="font-medium text-gray-900 dark:text-white">No expenses found</p>
            <p className="text-sm text-gray-500 mt-1">Adjust filters or check back later</p>
          </div>
        )}
      </div>
    </>
  );
}
