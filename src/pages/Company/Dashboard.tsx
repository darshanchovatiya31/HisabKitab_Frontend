import React, { useState, useEffect } from "react";
import apiService, { DashboardStats } from "../../services/api";
import swal from '../../utils/swalHelper';
import {
  Building2,
  Users,
} from 'lucide-react';
import { DashboardSkeleton } from '../../components/common/Skeleton';

export default function CompanyDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        console.error('Error parsing user:', e);
      }
    }
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      const response = await apiService.getDashboardStats();
      if (response.status === 200 && response.data) {
        setStats(response.data);
      } else {
        throw new Error(response.message || 'Failed to load dashboard data');
      }
    } catch (error: any) {
      console.error('Error fetching dashboard stats:', error);
      swal.error('Error', error.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <DashboardSkeleton />;
  }

  const userRole = user?.role || '';

  return (
    <>
      <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
            {userRole === 'SUPER_ADMIN' && 'Super Admin Dashboard'}
            {userRole === 'COMPANY' && 'Company Dashboard'}
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
            Welcome back! Here's what's happening today.
          </p>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="mb-4 sm:mb-6 grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {/* Super Admin Stats */}
        {userRole === 'SUPER_ADMIN' && (
          <>
            <div className="group rounded-xl border border-gray-200 bg-white p-3 sm:p-4 shadow-sm transition-shadow duration-200 hover:shadow-lg dark:border-gray-800 dark:bg-white/[0.03]">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">Total Companies</p>
                  <p className="mt-1 text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                    {stats?.totalCompanies?.toLocaleString() || '0'}
                  </p>
                </div>
                <div className="hidden sm:flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-500/20 ml-2 flex-shrink-0">
                  <Building2 className="h-5 w-5 sm:h-6 sm:w-6 text-brand-600 dark:text-brand-400" />
                </div>
              </div>
            </div>

            <div className="group rounded-xl border border-gray-200 bg-white p-3 sm:p-4 shadow-sm transition-shadow duration-200 hover:shadow-lg dark:border-gray-800 dark:bg-white/[0.03]">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">Total Users</p>
                  <p className="mt-1 text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                    {stats?.totalUsers?.toLocaleString() || '0'}
                  </p>
                </div>
                <div className="hidden sm:flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-500/20 ml-2 flex-shrink-0">
                  <Users className="h-5 w-5 sm:h-6 sm:w-6 text-brand-600 dark:text-brand-400" />
                </div>
              </div>
            </div>
          </>
        )}

        {/* Company Stats */}
        {userRole === 'COMPANY' && (
          <>
            <div className="group rounded-xl border border-gray-200 bg-white p-3 sm:p-4 shadow-sm transition-shadow duration-200 hover:shadow-lg dark:border-gray-800 dark:bg-white/[0.03]">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">Company Status</p>
                  <p className="mt-1 text-xl sm:text-2xl font-bold text-brand-600 dark:text-brand-400">
                    Active
                  </p>
                </div>
                <div className="hidden sm:flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-lg bg-green-100 dark:bg-green-500/20 ml-2 flex-shrink-0">
                  <Building2 className="h-5 w-5 text-brand-600 dark:text-brand-400" />
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Latest Companies - Super Admin Only */}
      {userRole === 'SUPER_ADMIN' && stats?.recentCompanies && stats.recentCompanies.length > 0 && (
        <div className="mb-8 rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-800">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">Recent Companies</h3>
            <p className="mt-1 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
              Last 5 companies added to the system
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Joined Date</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-white/[0.03] divide-y divide-gray-200 dark:divide-gray-800">
                {stats.recentCompanies.map((company: any) => (
                  <tr key={company._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">{company.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{company.userEmail || company.email}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                      {new Date(company.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
