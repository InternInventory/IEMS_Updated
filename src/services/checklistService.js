import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const getAuthHeaders = () => {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  return {
    'Authorization': token || '',
    'Content-Type': 'application/json'
  };
};

export const checklistService = {
  // Create new report
  createReport: async (reportData) => {
    const response = await axios.post(
      `${API_BASE_URL}/api/device-checklist-report`,
      reportData,
      { headers: getAuthHeaders() }
    );
    return response.data;
  },

  // Get all reports with filters
  getReports: async (filters = {}, page = 1, limit = 10) => {
    const params = new URLSearchParams({ 
      page: page.toString(), 
      limit: limit.toString(), 
      ...Object.fromEntries(
        Object.entries(filters).filter(([_, v]) => v !== '' && v !== null && v !== undefined)
      )
    });
    const response = await axios.get(
      `${API_BASE_URL}/api/device-checklist-reports?${params}`,
      { headers: getAuthHeaders() }
    );
    return response.data;
  },

  // Get report by ID
  getReportById: async (reportId) => {
    const response = await axios.get(
      `${API_BASE_URL}/api/device-checklist-report/${reportId}`,
      { headers: getAuthHeaders() }
    );
    return response.data;
  },

  // Update report
  updateReport: async (reportId, updateData) => {
    const response = await axios.put(
      `${API_BASE_URL}/api/device-checklist-report/${reportId}`,
      updateData,
      { headers: getAuthHeaders() }
    );
    return response.data;
  },

  // Delete report
  deleteReport: async (reportId) => {
    const response = await axios.delete(
      `${API_BASE_URL}/api/device-checklist-report/${reportId}`,
      { headers: getAuthHeaders() }
    );
    return response.data;
  },

  // Get reports by organization
  getReportsByOrg: async (orgId, page = 1, limit = 10) => {
    const response = await axios.get(
      `${API_BASE_URL}/api/device-checklist-reports/org/${orgId}?page=${page}&limit=${limit}`,
      { headers: getAuthHeaders() }
    );
    return response.data;
  },

  // Get reports by location
  getReportsByLocation: async (locId, page = 1, limit = 10) => {
    const response = await axios.get(
      `${API_BASE_URL}/api/device-checklist-reports/location/${locId}?page=${page}&limit=${limit}`,
      { headers: getAuthHeaders() }
    );
    return response.data;
  }
};

export default checklistService;
