import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import apiService, { Company, Party, Sale, SaleCompanyInfo, SalePartyInfo, PaginatedParties } from "../../services/api";
import swal from "../../utils/swalHelper";
import { Search, Receipt, Building2, ChevronDown } from "lucide-react";
import { TableSkeleton } from "../../components/common/Skeleton";

function companyLabel(sale: Sale): string {
  const c = sale.companyId;
  if (c && typeof c === "object" && "name" in c) {
    return (c as SaleCompanyInfo).name || "—";
  }
  return "—";
}

function companyEmail(sale: Sale): string | undefined {
  const c = sale.companyId;
  if (c && typeof c === "object" && "email" in c) {
    return (c as SaleCompanyInfo).email;
  }
  return undefined;
}

function partyLabel(sale: Sale): string {
  const p = sale.partyId;
  if (p && typeof p === "object" && "name" in p) {
    return (p as SalePartyInfo).name || "—";
  }
  return "—";
}

function formatSaleDate(iso: string): string {
  const d = new Date(iso);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function AllSalesAdmin() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [parties, setParties] = useState<Party[]>([]);
  const [loading, setLoading] = useState(true);
  const [companiesLoading, setCompaniesLoading] = useState(true);
  const [partiesLoading, setPartiesLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [companyFilter, setCompanyFilter] = useState<string>("all");
  const [partyFilter, setPartyFilter] = useState<string>("all");
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

  useEffect(() => {
    const loadPartiesForCompany = async () => {
      if (user?.role !== "SUPER_ADMIN" || companyFilter === "all") {
        setParties([]);
        setPartyFilter("all");
        return;
      }
      try {
        setPartiesLoading(true);
        const res = await apiService.adminListParties({
          companyId: companyFilter,
          page: 1,
          limit: 500,
          isActive: "all",
        });
        if (
          res.status === 200 &&
          res.data &&
          typeof res.data === "object" &&
          Array.isArray((res.data as PaginatedParties).docs)
        ) {
          setParties((res.data as PaginatedParties).docs);
        } else {
          setParties([]);
        }
        setPartyFilter("all");
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Could not load parties for this company";
        swal.error("Parties", msg);
        setParties([]);
      } finally {
        setPartiesLoading(false);
      }
    };
    loadPartiesForCompany();
  }, [user, companyFilter]);

  useEffect(() => {
    if (user?.role === "SUPER_ADMIN") {
      fetchSales();
    }
  }, [currentPage, searchTerm, dateFrom, dateTo, companyFilter, partyFilter, user]);

  const fetchSales = async () => {
    try {
      setLoading(true);
      const params: Record<string, unknown> = {
        page: currentPage,
        limit,
        search: searchTerm || undefined,
      };
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;
      if (companyFilter !== "all") params.companyId = companyFilter;
      if (partyFilter !== "all") params.partyId = partyFilter;

      const response = await apiService.adminListSales(params);
      if (response.status === 200 && response.data) {
        setSales(response.data.docs || []);
        setTotalPages(response.data.totalPages || 1);
        setTotalDocs(response.data.totalDocs || 0);
      } else {
        throw new Error(response.message || "Failed to load sales");
      }
    } catch (error: unknown) {
      swal.error("Error", error instanceof Error ? error.message : "Failed to load sales");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchSales();
  };

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
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">All sales</h2>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Sale entries across all companies — filter by company, party, date range, and search
        </p>
      </div>

      <form onSubmit={handleSearch} className="mb-6 space-y-3">
        <div className="flex flex-col xl:flex-row gap-3">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search design, card, work type, hook..."
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
              value={partyFilter}
              onChange={(e) => {
                setPartyFilter(e.target.value);
                setCurrentPage(1);
              }}
              disabled={companyFilter === "all" || partiesLoading}
              className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2.5 text-sm min-w-[160px] disabled:opacity-50"
            >
              <option value="all">All parties</option>
              {parties.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name}
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

            <button
              type="submit"
              className="rounded-lg bg-gray-100 dark:bg-gray-700 px-4 py-2.5 text-sm font-medium"
            >
              Apply
            </button>
          </div>
        </div>
      </form>

      <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 overflow-hidden">
        {loading ? (
          <TableSkeleton rows={5} columns={10} />
        ) : sales.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px]">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50">
                    <th className="px-3 py-3 text-left text-xs font-semibold uppercase text-gray-700 dark:text-gray-300">
                      Company
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold uppercase text-gray-700 dark:text-gray-300">
                      Party
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold uppercase text-gray-700 dark:text-gray-300">
                      Date
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold uppercase text-gray-700 dark:text-gray-300">
                      Design #
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold uppercase text-gray-700 dark:text-gray-300">
                      Card
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold uppercase text-gray-700 dark:text-gray-300">
                      Work type
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold uppercase text-gray-700 dark:text-gray-300">
                      Hook
                    </th>
                    <th className="px-3 py-3 text-right text-xs font-semibold uppercase text-gray-700 dark:text-gray-300">
                      Price/u
                    </th>
                    <th className="px-3 py-3 text-right text-xs font-semibold uppercase text-gray-700 dark:text-gray-300">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {sales.map((sale) => (
                    <tr key={sale._id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                      <td className="px-3 py-3 text-sm">
                        <div className="font-medium text-gray-900 dark:text-white">{companyLabel(sale)}</div>
                        {companyEmail(sale) && (
                          <div className="text-xs text-gray-500 truncate max-w-[140px]">{companyEmail(sale)}</div>
                        )}
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-800 dark:text-gray-200">{partyLabel(sale)}</td>
                      <td className="px-3 py-3 text-sm whitespace-nowrap text-gray-700 dark:text-gray-300">
                        {formatSaleDate(sale.saleDate)}
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-700 dark:text-gray-300">{sale.designNumber || "—"}</td>
                      <td className="px-3 py-3 text-sm text-gray-700 dark:text-gray-300">{sale.card || "—"}</td>
                      <td className="px-3 py-3 text-sm text-gray-700 dark:text-gray-300">{sale.workType || "—"}</td>
                      <td className="px-3 py-3 text-sm text-gray-700 dark:text-gray-300">{sale.hook || "—"}</td>
                      <td className="px-3 py-3 text-sm text-right tabular-nums text-gray-800 dark:text-gray-200">
                        {Number(sale.pricePerUnit ?? 0).toLocaleString(undefined, {
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td className="px-3 py-3 text-sm text-right font-medium tabular-nums text-gray-900 dark:text-white">
                        {Number(sale.amount).toLocaleString(undefined, {
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
                {totalDocs} {totalDocs === 1 ? "sale" : "sales"}
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-16">
            <Receipt className="h-12 w-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
            <p className="font-medium text-gray-900 dark:text-white">No sales found</p>
            <p className="text-sm text-gray-500 mt-1">Adjust filters or check back later</p>
          </div>
        )}
      </div>
    </>
  );
}
