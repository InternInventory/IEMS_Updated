import axios from 'axios';
import moment from 'moment';

/**
 * Comprehensive PDF Service
 * Fetches all relevant API data and generates structured PDF reports
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL;

// Helper functions
const safeNumber = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const formatFixed = (value, decimals = 2) => {
  const n = safeNumber(value, NaN);
  return Number.isFinite(n) ? n.toFixed(decimals) : '-';
};

const getAuthToken = () => {
  return sessionStorage.getItem('token') || localStorage.getItem('token');
};

/**
 * Fetch all dashboard APIs for main dashboard
 */
export const fetchDashboardAPIs = async (filters = {}) => {
  const token = getAuthToken();
  if (!token) throw new Error('No authentication token found');

  const {
    timeframe = 'daily',
    date = moment().format('YYYY-MM-DD'),
    month = moment().format('YYYY-MM'),
    year = moment().format('YYYY'),
    customStartDate,
    customEndDate
  } = filters;

  // Build params based on timeframe
  let params = {};
  let carbonUrl, powerUrl;

  if (timeframe === 'daily') {
    params = { date };
    carbonUrl = `${API_BASE}/dashboard-carbon-footprint/daily`;
    powerUrl = `${API_BASE}/dashboard-power-consumption/daily`;
  } else if (timeframe === 'monthly') {
    params = { month };
    carbonUrl = `${API_BASE}/dashboard-carbon-footprint/monthly`;
    powerUrl = `${API_BASE}/dashboard-power-consumption/monthly`;
  } else if (timeframe === 'yearly') {
    params = { year };
    carbonUrl = `${API_BASE}/dashboard-carbon-footprint/yearly`;
    powerUrl = `${API_BASE}/dashboard-power-consumption/yearly`;
  } else if (timeframe === 'custom') {
    params = {
      start_date: customStartDate || moment().subtract(7, 'days').format('YYYY-MM-DD'),
      end_date: customEndDate || moment().format('YYYY-MM-DD')
    };
    carbonUrl = `${API_BASE}/dashboard-carbon-footprint/custom`;
    powerUrl = `${API_BASE}/dashboard-power-consumption/custom`;
  }

  const headers = { authorization: token };

  try {
    const [
      cardsRes,
      carbonRes,
      powerRes,
      devicesRes,
      alertsRes
    ] = await Promise.all([
      axios.get(`${API_BASE}/dashboard-cards`, { headers }).catch(() => ({ data: {} })),
      axios.get(carbonUrl, { params, headers }).catch(() => ({ data: {} })),
      axios.get(powerUrl, { params, headers }).catch(() => ({ data: {} })),
      axios.get(`${API_BASE}/dashboard-devices-list`, { headers }).catch(() => ({ data: {} })),
      axios.get(`${API_BASE}/alerts/statistics`, { 
        params: { timeframe: 'monthly', date: moment().format('YYYY-MM-DD') },
        headers 
      }).catch(() => ({ data: {} }))
    ]);

    // Extract hourly data from carbon footprint API's detailed_carbon_data
    // This matches how Dashboard.jsx processes hourly data
    const hourlyData = carbonRes.data?.detailed_carbon_data || [];

    return {
      cards: cardsRes.data?.summary || {},
      carbon: carbonRes.data || {},
      power: powerRes.data || {},
      hourly: { hourly_data: hourlyData, data: hourlyData },
      devices: devicesRes.data || {},
      alerts: alertsRes.data || {},
      timeframe,
      filters: { date, month, year, customStartDate, customEndDate }
    };
  } catch (error) {
    console.error('Error fetching dashboard APIs:', error);
    throw error;
  }
};

/**
 * Fetch all client dashboard APIs
 */
export const fetchClientDashboardAPIs = async (clientId, filters = {}) => {
  const token = getAuthToken();
  if (!token) throw new Error('No authentication token found');

  const {
    timeframe = 'daily',
    date = moment().format('YYYY-MM-DD'),
    month = moment().format('YYYY-MM'),
    year = moment().format('YYYY'),
    customStartDate,
    customEndDate
  } = filters;

  let params = {};
  let carbonUrl, powerUrl, hourlyUrl;

  if (timeframe === 'daily') {
    params = { date };
    carbonUrl = `${API_BASE}/client/${clientId}/carbonfootprint/daily`;
    powerUrl = `${API_BASE}/client/${clientId}/power-consumption/daily`;
    hourlyUrl = `${API_BASE}/client/${clientId}/hourly-usage/daily`;
  } else if (timeframe === 'monthly') {
    params = { month };
    carbonUrl = `${API_BASE}/client/${clientId}/carbonfootprint/monthly`;
    powerUrl = `${API_BASE}/client/${clientId}/power-consumption/monthly`;
    hourlyUrl = `${API_BASE}/client/${clientId}/hourly-usage/monthly`;
  } else if (timeframe === 'yearly') {
    params = { year };
    carbonUrl = `${API_BASE}/client/${clientId}/carbonfootprint/yearly`;
    powerUrl = `${API_BASE}/client/${clientId}/power-consumption/yearly`;
    hourlyUrl = `${API_BASE}/client/${clientId}/hourly-usage/yearly`;
  } else if (timeframe === 'custom') {
    params = {
      start_date: customStartDate || moment().subtract(7, 'days').format('YYYY-MM-DD'),
      end_date: customEndDate || moment().format('YYYY-MM-DD')
    };
    carbonUrl = `${API_BASE}/client/${clientId}/carbonfootprint/custom`;
    powerUrl = `${API_BASE}/client/${clientId}/power-consumption/custom`;
    hourlyUrl = `${API_BASE}/client/${clientId}/hourly-usage/custom`;
  }

  const headers = { authorization: token };

  try {
    const [
      dashboardRes,
      usersRes,
      carbonRes,
      powerRes,
      hourlyRes,
      devicesRes,
      clientDetailsRes,
      clientLocationsRes
    ] = await Promise.all([
      axios.get(`${API_BASE}/client-dashboard/${clientId}`, { headers }).catch(() => ({ data: {} })),
      axios.get(`${API_BASE}/users-for-that-client/${clientId}`, { headers }).catch(() => ({ data: [] })),
      axios.get(carbonUrl, { params, headers }).catch(() => ({ data: {} })),
      axios.get(powerUrl, { params, headers }).catch(() => ({ data: {} })),
      axios.get(hourlyUrl, { params, headers }).catch(() => ({ data: {} })),
      axios.get(`${API_BASE}/client/${clientId}/devices-listing`, { headers }).catch(() => ({ data: [] })),
      axios.get(`${API_BASE}/client/${clientId}`, { headers }).catch(() => ({ data: {} })),
      axios.get(`${API_BASE}/${clientId}/locations`, { headers }).catch(() => ({ data: [] }))
    ]);

    return {
      dashboard: dashboardRes.data || {},
      users: usersRes.data || [],
      carbon: carbonRes.data || {},
      power: powerRes.data || {},
      hourly: hourlyRes.data || {},
      devices: devicesRes.data || {},
      clientDetails: clientDetailsRes.data || {},
      locations: clientLocationsRes.data || [],
      timeframe,
      filters: { date, month, year, customStartDate, customEndDate }
    };
  } catch (error) {
    console.error('Error fetching client dashboard APIs:', error);
    throw error;
  }
};

/**
 * Fetch all location dashboard APIs
 */
export const fetchLocationDashboardAPIs = async (locationId, filters = {}) => {
  const token = getAuthToken();
  if (!token) throw new Error('No authentication token found');

  const {
    timeframe = 'daily',
    date = moment().format('YYYY-MM-DD'),
    month = moment().format('YYYY-MM'),
    year = moment().format('YYYY'),
    customStartDate,
    customEndDate
  } = filters;

  let params = {};
  let powerUrl, hourlyUrl, energySavedUrl, carbonUrl;

  if (timeframe === 'daily') {
    params = { date };
  } else if (timeframe === 'monthly') {
    params = { month };
  } else if (timeframe === 'yearly') {
    params = { year };
  } else if (timeframe === 'custom') {
    params = {
      start_date: customStartDate || moment().subtract(7, 'days').format('YYYY-MM-DD'),
      end_date: customEndDate || moment().format('YYYY-MM-DD')
    };
  }

  powerUrl = `${API_BASE}/powerconsumption/location/${locationId}/${timeframe}`;
  hourlyUrl = `${API_BASE}/hourly-usage/location/${locationId}/${timeframe}`;
  energySavedUrl = `${API_BASE}/energy-saved/location/${locationId}/${timeframe}`;
  carbonUrl = `${API_BASE}/carbon-footprint/location/${locationId}/${timeframe}`;

  const headers = { authorization: token };

  try {
    const [
      locationRes,
      devicesRes,
      powerRes,
      hourlyRes,
      energySavedRes,
      carbonRes
    ] = await Promise.all([
      axios.get(`${API_BASE}/location-details/${locationId}`, { headers }).catch(() => ({ data: {} })),
      axios.get(`${API_BASE}/device-location/iot/${locationId}`, { headers }).catch(() => ({ data: {} })),
      axios.get(powerUrl, { params, headers }).catch(() => ({ data: {} })),
      axios.get(hourlyUrl, { params, headers }).catch(() => ({ data: {} })),
      axios.get(energySavedUrl, { params, headers }).catch(() => ({ data: {} })),
      axios.get(carbonUrl, { params, headers }).catch(() => ({ data: {} }))
    ]);

    return {
      location: locationRes.data || {},
      devices: devicesRes.data || {},
      power: powerRes.data || {},
      hourly: hourlyRes.data || {},
      energySaved: energySavedRes.data || {},
      carbon: carbonRes.data || {},
      timeframe,
      filters: { date, month, year, customStartDate, customEndDate }
    };
  } catch (error) {
    console.error('Error fetching location dashboard APIs:', error);
    throw error;
  }
};

/**
 * Calculate insights from API data
 */
export const calculateInsights = (apiData, context = 'dashboard') => {
  const insights = [];

  if (context === 'dashboard') {
    const { carbon, power, hourly, alerts, devices } = apiData;
    
    // Carbon insights
    const totalCarbon = safeNumber(carbon?.total_carbon_kg || carbon?.baseline?.total_carbon_kg || 0);
    const savedCarbon = safeNumber(carbon?.savings?.carbon_saved_kg || 0);
    if (savedCarbon > 0) {
      insights.push({
        type: 'success',
        title: 'Carbon Reduction Achievement',
        message: `Successfully reduced ${formatFixed(savedCarbon, 2)} kg CO₂ emissions`,
        value: savedCarbon
      });
    }

    // Power insights
    const totalPower = safeNumber(power?.total_power_consumption || 0);
    const peakPower = safeNumber(power?.peak_demand || 0);
    if (peakPower > 0) {
      insights.push({
        type: 'info',
        title: 'Peak Demand Analysis',
        message: `Peak demand reached ${formatFixed(peakPower, 2)} kWh`,
        value: peakPower
      });
    }

    // Hourly insights
    if (hourly?.data && Array.isArray(hourly.data)) {
      const maxHour = hourly.data.reduce((max, h) => 
        safeNumber(h.usage || h.total_consumption, 0) > safeNumber(max.usage || max.total_consumption, 0) ? h : max,
        hourly.data[0] || {}
      );
      if (maxHour.usage || maxHour.total_consumption) {
        insights.push({
          type: 'warning',
          title: 'Peak Hour Identified',
          message: `Highest consumption at ${maxHour.hour || maxHour.displayHour || 'N/A'}`,
          value: safeNumber(maxHour.usage || maxHour.total_consumption, 0)
        });
      }
    }

    // Alert insights
    if (alerts?.data) {
      const totalAlerts = safeNumber(alerts.data.total_alerts || 0);
      const openAlerts = safeNumber(alerts.data.open_alerts || 0);
      if (openAlerts > 0) {
        insights.push({
          type: 'alert',
          title: 'Active Alerts',
          message: `${openAlerts} open alerts require attention`,
          value: openAlerts
        });
      }
    }

    // Device insights
    if (devices?.device_counts) {
      const deviceTypes = Object.keys(devices.device_counts);
      const totalDevices = deviceTypes.reduce((sum, type) => 
        sum + safeNumber(devices.device_counts[type], 0), 0
      );
      insights.push({
        type: 'info',
        title: 'Device Distribution',
        message: `${totalDevices} total devices across ${deviceTypes.length} device types`,
        value: totalDevices
      });
    }
  }

  return insights.slice(0, 5); // Return top 5 insights
};

/**
 * Format date range title
 */
export const getDateRangeTitle = (timeframe, filters) => {
  const { date, month, year, customStartDate, customEndDate } = filters || {};
  
  switch (timeframe) {
    case 'daily':
      return date ? moment(date).format('DD MMM YYYY') : moment().format('DD MMM YYYY');
    case 'monthly':
      return month ? moment(month + '-01').format('MMM YYYY') : moment().format('MMM YYYY');
    case 'yearly':
      return year || moment().format('YYYY');
    case 'custom':
      return customStartDate && customEndDate
        ? `${moment(customStartDate).format('DD MMM YYYY')} to ${moment(customEndDate).format('DD MMM YYYY')}`
        : moment().format('DD MMM YYYY');
    default:
      return moment().format('DD MMM YYYY');
  }
};

export { safeNumber, formatFixed };

