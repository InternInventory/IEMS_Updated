import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import checklistService from '../../services/checklistService';
import '../../assets/styles/common.css';
import { useTheme } from '../../context/ThemeContext';

const ChecklistReportsList = ({ orgId }) => {
  const navigate = useNavigate();
  const { isDark: isDarkMode } = useTheme();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });
  const [filters, setFilters] = useState({
    device_type: '',
    status: '',
    start_date: '',
    end_date: ''
  });

  useEffect(() => {
    if (orgId) {
      fetchReports();
    }
  }, [orgId, pagination.page, filters.device_type, filters.status, filters.start_date, filters.end_date]);

  const fetchReports = async () => {
    setLoading(true);
    setError(null);
    try {
      // Use organization-specific endpoint if orgId is provided
      const response = orgId 
        ? await checklistService.getReportsByOrg(orgId, pagination.page, pagination.limit)
        : await checklistService.getReports(
            { ...filters, org_id: orgId }, 
            pagination.page, 
            pagination.limit
          );

      if (response.success) {
        const reportsData = Array.isArray(response.data) ? response.data : [];
        setReports(reportsData);
        
        if (response.pagination) {
          setPagination(prev => ({
            ...prev,
            ...response.pagination
          }));
        }
      } else {
        setError(response.message || 'Failed to fetch reports');
      }
    } catch (err) {
      console.error('Error fetching checklist reports:', err);
      
      // Check if it's a network error or API not found
      if (err.code === 'ERR_NETWORK' || err.message.includes('Network Error')) {
        setError('Backend API is not available. Please ensure the server is running.');
      } else if (err.response?.status === 404) {
        setError('API endpoint not found. Backend may not be implemented yet.');
      } else if (err.response?.status === 401 || err.response?.status === 403) {
        setError('Authentication failed. Please log in again.');
      } else {
        setError(err.response?.data?.message || err.message || 'Failed to fetch reports');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (reportId) => {
    if (!window.confirm('Are you sure you want to delete this report? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await checklistService.deleteReport(reportId);
      if (response.success) {
        alert('Report deleted successfully');
        fetchReports();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete report');
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page on filter change
  };

  const clearFilters = () => {
    setFilters({
      device_type: '',
      status: '',
      start_date: '',
      end_date: ''
    });
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleViewReport = (reportId) => {
    navigate(`/checklist-report/${reportId}`);
  };

  if (!orgId) {
    return (
      <div className={`text-center py-12 ${
        isDarkMode ? "text-gray-400" : "text-gray-600"
      }`}>
        <p>Please select an organization to view reports</p>
      </div>
    );
  }

  return (
    <>
      {/* Filters Section */}
      <div className={`p-4 rounded-lg border mb-6 ${
        isDarkMode
          ? "bg-[#1e293b] border-gray-700"
          : "bg-white border-gray-300"
      }`}>
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className={`block text-sm mb-2 ${
              isDarkMode ? "text-gray-400" : "text-gray-700"
            }`}>Device Type</label>
            <select
              value={filters.device_type}
              onChange={(e) => handleFilterChange('device_type', e.target.value)}
              className={`w-full px-4 py-2 rounded-lg border outline-none ${
                isDarkMode
                  ? "bg-[#1e293b] text-white border-gray-600 focus:border-blue-500"
                  : "bg-white text-gray-900 border-gray-300 focus:border-blue-500"
              }`}
            >
              <option value="">All Devices</option>
              <option value="NEON">NEON (3-Phase)</option>
              <option value="LIB">LIB (Single-Phase)</option>
              <option value="LIB3P">LIB3P (3-Phase)</option>
              <option value="BIGIO">BIGIO (IoT Gateway)</option>
              <option value="IATM">IATM (Testing Module)</option>
            </select>
          </div>

          <div className="flex-1 min-w-[200px]">
            <label className={`block text-sm mb-2 ${
              isDarkMode ? "text-gray-400" : "text-gray-700"
            }`}>Status</label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className={`w-full px-4 py-2 rounded-lg border outline-none ${
                isDarkMode
                  ? "bg-[#1e293b] text-white border-gray-600 focus:border-blue-500"
                  : "bg-white text-gray-900 border-gray-300 focus:border-blue-500"
              }`}
            >
              <option value="">All Status</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="revised">Revised</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div className="flex-1 min-w-[200px]">
            <label className={`block text-sm mb-2 ${
              isDarkMode ? "text-gray-400" : "text-gray-700"
            }`}>Start Date</label>
            <input
              type="date"
              value={filters.start_date}
              onChange={(e) => handleFilterChange('start_date', e.target.value)}
              className={`w-full px-4 py-2 rounded-lg border outline-none ${
                isDarkMode
                  ? "bg-[#1e293b] text-white border-gray-600 focus:border-blue-500"
                  : "bg-white text-gray-900 border-gray-300 focus:border-blue-500"
              }`}
            />
          </div>

          <div className="flex-1 min-w-[200px]">
            <label className={`block text-sm mb-2 ${
              isDarkMode ? "text-gray-400" : "text-gray-700"
            }`}>End Date</label>
            <input
              type="date"
              value={filters.end_date}
              onChange={(e) => handleFilterChange('end_date', e.target.value)}
              className={`w-full px-4 py-2 rounded-lg border outline-none ${
                isDarkMode
                  ? "bg-[#1e293b] text-white border-gray-600 focus:border-blue-500"
                  : "bg-white text-gray-900 border-gray-300 focus:border-blue-500"
              }`}
            />
          </div>

          <button
            onClick={clearFilters}
            className={`px-4 py-2 rounded-lg transition-colors ${
              isDarkMode
                ? "bg-gray-700 hover:bg-gray-600 text-white"
                : "bg-gray-200 hover:bg-gray-300 text-gray-900"
            }`}
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Reports Section Header */}
      <div className="flex justify-between items-center mb-6">
        <h3 className={`text-lg font-semibold ${
          isDarkMode ? "text-white" : "text-gray-900"
        }`}>Reports List</h3>
        <span className={`text-sm ${
          isDarkMode ? "text-gray-400" : "text-gray-600"
        }`}>
          Total: {pagination.total || 0} reports
        </span>
      </div>

      {error && (
          <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <p className="text-red-400 font-medium mb-1">Error Loading Reports</p>
                <p className="text-red-300 text-sm">{error}</p>
                {error.includes('Backend API') || error.includes('not found') || error.includes('Network') ? (
                  <div className="mt-3 text-sm text-gray-400">
                    <p className="font-medium mb-1">Troubleshooting steps:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Ensure the backend server is running</li>
                      <li>Check that VITE_API_BASE_URL is configured correctly</li>
                      <li>Verify the API endpoints are implemented</li>
                    </ul>
                  </div>
                ) : null}
              </div>
              <button
                onClick={fetchReports}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
              <span className={isDarkMode ? "text-gray-300" : "text-gray-700"}>Loading reports...</span>
            </div>
          </div>
        ) : error ? (
          <div className="text-center py-12 text-red-400">
            <p>Error loading reports. Check console for details.</p>
          </div>
        ) : !reports || reports.length === 0 ? (
          <div className="text-center py-12">
            <svg className={`w-16 h-16 mx-auto mb-4 ${
              isDarkMode ? "text-gray-600" : "text-gray-400"
            }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className={`text-lg ${
              isDarkMode ? "text-gray-400" : "text-gray-600"
            }`}>No reports found</p>
            <p className={`text-sm mt-2 ${
              isDarkMode ? "text-gray-500" : "text-gray-500"
            }`}>Try adjusting your filters or create a new report</p>
          </div>
        ) : (
          <>
            {/* Table for larger screens */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className={`text-left ${
                    isDarkMode ? "bg-[#1e293b]" : "bg-[#2c3e50]"
                  }`}>
                    <th className="px-4 py-3 text-sm font-medium text-white">ID</th>
                    <th className="px-4 py-3 text-sm font-medium text-white">Checklist Name</th>
                    <th className="px-4 py-3 text-sm font-medium text-white">Device Type</th>
                    <th className="px-4 py-3 text-sm font-medium text-white">Location</th>
                    <th className="px-4 py-3 text-sm font-medium text-white">Engineer</th>
                    <th className="px-4 py-3 text-sm font-medium text-white">Status</th>
                    <th className="px-4 py-3 text-sm font-medium text-white">Date</th>
                    <th className="px-4 py-3 text-sm font-medium text-white">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((report) => (
                    <tr key={report.report_id} className={`border-b transition ${
                      isDarkMode
                        ? "border-gray-700 hover:bg-[#1e293b]/50"
                        : "border-gray-200 hover:bg-gray-50"
                    }`}>
                      <td className={`px-4 py-3 text-sm ${
                        isDarkMode ? "text-gray-300" : "text-gray-900"
                      }`}>#{report.report_id}</td>
                      <td className={`px-4 py-3 text-sm ${
                        isDarkMode ? "text-gray-300" : "text-gray-900"
                      }`}>
                        <div className={`font-medium ${
                          isDarkMode ? "text-white" : "text-gray-900"
                        }`}>{report.checklist_name}</div>
                        {report.checklist_version && (
                          <div className={`text-xs ${
                            isDarkMode ? "text-gray-500" : "text-gray-500"
                          }`}>v{report.checklist_version}</div>
                        )}
                      </td>
                      <td className={`px-4 py-3 text-sm ${
                        isDarkMode ? "text-gray-300" : "text-gray-900"
                      }`}>
                        <span className="px-2 py-1 bg-purple-500/20 text-purple-300 rounded text-xs font-medium">
                          {report.device_type}
                        </span>
                      </td>
                      <td className={`px-4 py-3 text-sm ${
                        isDarkMode ? "text-gray-300" : "text-gray-900"
                      }`}>{report.loc_name || 'N/A'}</td>
                      <td className={`px-4 py-3 text-sm ${
                        isDarkMode ? "text-gray-300" : "text-gray-900"
                      }`}>
                        {report.checklist_data?.engineer_info?.name || report.created_by_name || 'N/A'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          report.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                          report.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                          report.status === 'revised' ? 'bg-blue-500/20 text-blue-400' :
                          'bg-gray-500/20 text-gray-400'
                        }`}>
                          {report.status}
                        </span>
                      </td>
                      <td className={`px-4 py-3 text-sm ${
                        isDarkMode ? "text-gray-400" : "text-gray-600"
                      }`}>
                        {new Date(report.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleViewReport(report.report_id)}
                            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs transition-colors"
                          >
                            View
                          </button>
                          <button
                            onClick={() => handleDelete(report.report_id)}
                            className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Cards for mobile screens */}
            <div className="md:hidden space-y-4">
              {reports.map((report) => (
                <div key={report.report_id} className={`p-4 rounded-lg border ${
                  isDarkMode
                    ? "bg-[#1e293b] border-gray-700"
                    : "bg-white border-gray-300"
                }`}>
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <span className={`text-xs ${
                        isDarkMode ? "text-gray-500" : "text-gray-500"
                      }`}>Report #{report.report_id}</span>
                      <h4 className={`font-semibold mt-1 ${
                        isDarkMode ? "text-white" : "text-gray-900"
                      }`}>{report.checklist_name}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded text-xs font-medium">
                          {report.device_type}
                        </span>
                        {report.checklist_version && (
                          <span className={`text-xs ${
                            isDarkMode ? "text-gray-500" : "text-gray-500"
                          }`}>v{report.checklist_version}</span>
                        )}
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      report.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                      report.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-blue-500/20 text-blue-400'
                    }`}>
                      {report.status}
                    </span>
                  </div>
                  <div className={`text-sm space-y-1 ${
                    isDarkMode ? "text-gray-400" : "text-gray-600"
                  }`}>
                    <p>Location: {report.loc_name || 'N/A'}</p>
                    <p>Engineer: {report.checklist_data?.engineer_info?.name || report.created_by_name || 'N/A'}</p>
                    <p>Date: {new Date(report.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => handleViewReport(report.report_id)}
                      className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors"
                    >
                      View
                    </button>
                    <button
                      onClick={() => handleDelete(report.report_id)}
                      className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className={`flex items-center justify-between mt-6 pt-4 border-t ${
                isDarkMode ? "border-gray-700" : "border-gray-300"
              }`}>
                <button
                  disabled={pagination.page === 1}
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                  className={`px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
                    isDarkMode
                      ? "bg-gray-700 hover:bg-gray-600 text-white"
                      : "bg-gray-200 hover:bg-gray-300 text-gray-900"
                  }`}
                >
                  Previous
                </button>
                <span className={`text-sm ${
                  isDarkMode ? "text-gray-400" : "text-gray-600"
                }`}>
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <button
                  disabled={pagination.page === pagination.totalPages}
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                  className={`px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
                    isDarkMode
                      ? "bg-gray-700 hover:bg-gray-600 text-white"
                      : "bg-gray-200 hover:bg-gray-300 text-gray-900"
                  }`}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
    </>
  );
};

export default ChecklistReportsList;
