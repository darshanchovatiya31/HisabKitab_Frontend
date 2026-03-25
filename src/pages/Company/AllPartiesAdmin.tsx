import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import apiService, { Company, Party, PartyCompanyInfo } from "../../services/api";
import swal from "../../utils/swalHelper";
import { Search, Filter, ChevronDown, Users, Building2 } from "lucide-react";
import { TableSkeleton } from "../../components/common/Skeleton";

function companyLabel(party: Party): string {
  const c = party.companyId;
  if (c && typeof c === "object" && "name" in c) {
    const info = c as PartyCompanyInfo;
    return info.name || info.email || "—";
  }
  return "—";
}

function companyEmail(party: Party): string | undefined {
  const c = party.companyId;
  if (c && typeof c === "object" && "email" in c) {
    return (c as PartyCompanyInfo).email;
  }
  return undefined;
}

export default function AllPartiesAdmin() {
  const [parties, setParties] = useState<Party[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [companiesLoading, setCompaniesLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [companyFilter, setCompanyFilter] = useState<string>("all");
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
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
        console.error("Error parsing user:", e);
      }
    }
  }, [navigate]);

  useEffect(() => {
    const loadCompanies = async () => {
      if (user?.role !== "SUPER_ADMIN") return;
      try {
        setCompaniesLoading(true);
        const response = await apiService.getCompanies({ page: 1, limit: 500, search: undefined });
        if (response.status === 200 && response.data?.docs) {
          setCompanies(response.data.docs as Company[]);
        }
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "Failed to load companies";
        console.error(e);
        swal.error("Error", message);
      } finally {
        setCompaniesLoading(false);
      }
    };
    loadCompanies();
  }, [user]);

  useEffect(() => {
    if (user?.role === "SUPER_ADMIN") {
      fetchParties();
    }
  }, [currentPage, searchTerm, statusFilter, companyFilter, user]);

  const fetchParties = async () => {
    try {
      setLoading(true);
      const params: Record<string, unknown> = {
        page: currentPage,
        limit,
        search: searchTerm || undefined,
      };

      if (statusFilter !== "all") {
        params.isActive = statusFilter;
      }

      if (companyFilter !== "all") {
        params.companyId = companyFilter;
      }

      const response = await apiService.adminListParties(params);

      if (response.status === 200 && response.data) {
        setParties(response.data.docs || []);
        setTotalPages(response.data.totalPages || 1);
        setTotalDocs(response.data.totalDocs || 0);
      } else {
        throw new Error(response.message || "Failed to load parties");
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to load parties";
      console.error("Error fetching parties:", error);
      swal.error("Error", message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchParties();
  };

  const selectedCompanyName =
    companyFilter === "all"
      ? "All companies"
      : companies.find((c) => c._id === companyFilter)?.name || "Company";

  if (user?.role !== "SUPER_ADMIN") {
    return null;
  }

  return (
    <>
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">All parties</h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              View every party across all companies with search and filters
            </p>
          </div>
        </div>
      </div>

      <div className="mb-6 space-y-3">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
            <input
              type="text"
              placeholder="Search by party name or mobile..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 py-2.5 pl-10 pr-4 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20 transition-all"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-[140px] sm:flex-initial">
              <button
                type="button"
                onClick={() => {
                  setShowCompanyDropdown(!showCompanyDropdown);
                  setShowFilterDropdown(false);
                }}
                disabled={companiesLoading}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all disabled:opacity-50"
              >
                <Building2 className="h-4 w-4 shrink-0" />
                <span className="truncate max-w-[160px] sm:max-w-[200px]">{selectedCompanyName}</span>
                <ChevronDown className="h-4 w-4 shrink-0" />
              </button>

              {showCompanyDropdown && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowCompanyDropdown(false)} />
                  <div className="absolute left-0 right-0 sm:right-auto sm:min-w-[240px] mt-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg z-20 max-h-64 overflow-y-auto">
                    <div className="py-1">
                      <button
                        type="button"
                        onClick={() => {
                          setCompanyFilter("all");
                          setShowCompanyDropdown(false);
                          setCurrentPage(1);
                        }}
                        className={`w-full text-left px-4 py-2 text-sm ${
                          companyFilter === "all"
                            ? "bg-brand-600/10 text-brand-600 dark:bg-brand-600/20"
                            : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                        }`}
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
                          className={`w-full text-left px-4 py-2 text-sm ${companyFilter === c._id ? "bg-brand-600/10 text-brand-600 dark:bg-brand-600/20" : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"}`}
                        >
                          <span className="block truncate">{c.name}</span>
                          {c.userEmail && (
                            <span className="block text-xs text-gray-500 truncate">{c.userEmail}</span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="relative flex-1 min-w-[120px] sm:flex-initial">
              <button
                type="button"
                onClick={() => {
                  setShowFilterDropdown(!showFilterDropdown);
                  setShowCompanyDropdown(false);
                }}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
              >
                <Filter className="h-4 w-4" />
                <span className="hidden sm:inline">
                  {statusFilter === "all"
                    ? "All status"
                    : statusFilter === "active"
                      ? "Active"
                      : "Inactive"}
                </span>
                <ChevronDown className="h-4 w-4" />
              </button>

              {showFilterDropdown && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowFilterDropdown(false)} />
                  <div className="absolute right-0 mt-2 w-48 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg z-20">
                    <div className="py-1">
                      {(["all", "active", "inactive"] as const).map((key) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => {
                            setStatusFilter(key);
                            setShowFilterDropdown(false);
                            setCurrentPage(1);
                          }}
                          className={`w-full text-left px-4 py-2 text-sm ${
                            statusFilter === key
                              ? "bg-brand-600/10 text-brand-600 dark:bg-brand-600/20"
                              : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                          }`}
                        >
                          {key === "all" ? "All status" : key === "active" ? "Active" : "Inactive"}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </form>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900 overflow-hidden">
        {loading ? (
          <TableSkeleton rows={5} columns={7} />
        ) : parties.length > 0 ? (
          <>
            <div className="lg:hidden p-3 space-y-3">
              {parties.map((party) => (
                <div
                  key={party._id}
                  className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                        Company
                      </p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                        {companyLabel(party)}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 px-2.5 py-1 rounded-md text-xs font-medium ${
                        party.isActive
                          ? "bg-brand-600/10 text-brand-600 dark:bg-brand-600/20"
                          : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
                      }`}
                    >
                      {party.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Party</p>
                    <p className="text-base font-medium text-gray-900 dark:text-white">{party.name}</p>
                    {party.mobile && (
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{party.mobile}</p>
                    )}
                  </div>
                  {party.address && (
                    <p className="text-sm text-gray-600 dark:text-gray-300 border-t border-gray-100 dark:border-gray-700 pt-2">
                      {party.address}
                    </p>
                  )}
                </div>
              ))}
            </div>

            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50">
                    <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Company
                    </th>
                    <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Party
                    </th>
                    <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Mobile
                    </th>
                    <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Address
                    </th>
                    <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Created
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800 bg-white dark:bg-gray-900">
                  {parties.map((party) => (
                    <tr
                      key={party._id}
                      className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {companyLabel(party)}
                        </div>
                        {companyEmail(party) && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate max-w-[200px]">
                            {companyEmail(party)}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{party.name}</div>
                        {party.description && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2 max-w-xs">
                            {party.description}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                        {party.mobile || "—"}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[180px]">
                          {party.address || "—"}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex px-2.5 py-1 rounded-md text-xs font-medium ${
                            party.isActive
                              ? "bg-brand-600/10 text-brand-600 dark:bg-brand-600/20"
                              : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
                          }`}
                        >
                          {party.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                        {new Date(party.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="border-t border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 px-4 py-3 sm:px-6">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Showing{" "}
                    <span className="font-medium text-gray-900 dark:text-white">
                      {(currentPage - 1) * limit + 1}
                    </span>{" "}
                    to{" "}
                    <span className="font-medium text-gray-900 dark:text-white">
                      {Math.min(currentPage * limit, totalDocs)}
                    </span>{" "}
                    of <span className="font-medium text-gray-900 dark:text-white">{totalDocs}</span>{" "}
                    parties
                  </div>
                  <nav className="flex items-center gap-1" aria-label="Pagination">
                    <button
                      type="button"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Previous
                    </button>
                    <div className="flex items-center gap-1">
                      {[...Array(totalPages)].map((_, i) => {
                        const page = i + 1;
                        if (
                          page === 1 ||
                          page === totalPages ||
                          (page >= currentPage - 1 && page <= currentPage + 1)
                        ) {
                          return (
                            <button
                              key={page}
                              type="button"
                              onClick={() => setCurrentPage(page)}
                              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                                currentPage === page
                                  ? "bg-brand-600 text-white"
                                  : "text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                              }`}
                            >
                              {page}
                            </button>
                          );
                        }
                        if (page === currentPage - 2 || page === currentPage + 2) {
                          return (
                            <span key={page} className="px-2 text-sm text-gray-500">
                              ...
                            </span>
                          );
                        }
                        return null;
                      })}
                    </div>
                    <button
                      type="button"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Next
                    </button>
                  </nav>
                </div>
              </div>
            )}
            {totalPages <= 1 && totalDocs > 0 && (
              <div className="border-t border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 px-4 py-3 sm:px-6">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Showing{" "}
                  <span className="font-medium text-gray-900 dark:text-white">{totalDocs}</span>{" "}
                  {totalDocs === 1 ? "party" : "parties"}
                </p>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-16">
            <div className="mx-auto w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
              <Users className="h-8 w-8 text-gray-400 dark:text-gray-600" />
            </div>
            <p className="text-base font-medium text-gray-900 dark:text-white mb-1">No parties found</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {searchTerm || companyFilter !== "all" || statusFilter !== "all"
                ? "Try adjusting search or filters"
                : "Parties created by companies will appear here"}
            </p>
          </div>
        )}
      </div>
    </>
  );
}
