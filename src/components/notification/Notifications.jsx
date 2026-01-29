import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IoIosArrowForward,
  IoIosArrowBack,
} from "react-icons/io";
import {
  TfiControlSkipForward,
  TfiControlSkipBackward,
} from "react-icons/tfi";
import { IoSearchOutline, IoCheckmarkDone } from "react-icons/io5";
import { FaExclamationTriangle, FaExclamationCircle, FaInfoCircle, FaCheckCircle } from 'react-icons/fa';
import { MdDelete } from 'react-icons/md';
import '../../assets/styles/common.css';
import './notifications.css';
import { useTheme } from '../../context/ThemeContext';

const Notifications = () => {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [filteredNotifications, setFilteredNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionFeedback, setActionFeedback] = useState(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [totalPages, setTotalPages] = useState(1);

  // Statistics
  const [stats, setStats] = useState({
    total: 0,
    unread: 0,
    read: 0,
    dismissed: 0,
    critical: 0,
    high: 0,
    medium: 0,
    low: 0
  });

  const apiURL = import.meta.env.VITE_API_BASE_URL;

  useEffect(() => {
    fetchNotifications();
    fetchStats();
  }, [currentPage, itemsPerPage, selectedStatus, selectedSeverity]);

  useEffect(() => {
    applyFilters();
  }, [searchTerm, notifications]);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      
      const params = new URLSearchParams({
        page: currentPage,
        limit: itemsPerPage,
        ...(selectedStatus && { status: selectedStatus }),
        ...(selectedSeverity && { severity: selectedSeverity })
      });

      const response = await fetch(`${apiURL}/api/notifications?${params}`, {
        headers: {
          'Authorization': token,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      if (data.success) {
        setNotifications(data.notifications || []);
        setFilteredNotifications(data.notifications || []);
        setTotalPages(data.pagination?.totalPages || 1);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
      showFeedback('error', 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      
      const response = await fetch(`${apiURL}/api/notifications/stats?days=30`, {
        headers: {
          'Authorization': token
        }
      });

      const data = await response.json();
      if (data.success) {
  setStats({
    total: data.stats.total_notifications,
    unread: data.stats.unread,
    read: data.stats.read,
    dismissed: data.stats.dismissed,
    critical: data.stats.critical,
    high: data.stats.high,
    medium: data.stats.medium,
    low: data.stats.low
  });
}

    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const applyFilters = () => {
    let filtered = [...notifications];

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(n =>
        n.title?.toLowerCase().includes(term) ||
        n.message?.toLowerCase().includes(term) ||
        n.device_type?.toLowerCase().includes(term) ||
        n.did?.toLowerCase().includes(term) ||
        n.error_code?.toLowerCase().includes(term) ||
        n.loc_name?.toLowerCase().includes(term)
      );
    }

    setFilteredNotifications(filtered);
  };

  const showFeedback = (type, message) => {
    setActionFeedback({ type, message });
    setTimeout(() => setActionFeedback(null), 3000);
  };

  const handleMarkAsRead = async (notificationId, source) => {
    if (source === 'alert_log') {
      showFeedback('info', 'Alert logs are read-only. Use alert management to update status.');
      return;
    }
    
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      
      const response = await fetch(`${apiURL}/api/notifications/${notificationId}/read`, {
        method: 'PUT',
        headers: {
          'Authorization': token,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      if (data.success) {
        showFeedback('success', 'Marked as read');
        fetchNotifications();
        fetchStats();
      }
    } catch (error) {
      console.error('Error marking as read:', error);
      showFeedback('error', 'Failed to update notification');
    }
  };

  const handleDismiss = async (notificationId, source) => {
    if (source === 'alert_log') {
      showFeedback('info', 'Alert logs are read-only. Use alert management to update status.');
      return;
    }
    
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      
      const response = await fetch(`${apiURL}/api/notifications/${notificationId}/dismiss`, {
        method: 'PUT',
        headers: {
          'Authorization': token,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      if (data.success) {
        showFeedback('success', 'Notification dismissed');
        fetchNotifications();
        fetchStats();
      }
    } catch (error) {
      console.error('Error dismissing notification:', error);
      showFeedback('error', 'Failed to dismiss notification');
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!window.confirm('Mark all notifications as read?')) return;

    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      
      const response = await fetch(`${apiURL}/api/notifications/read-all`, {
        method: 'PUT',
        headers: {
          'Authorization': token,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      if (data.success) {
        showFeedback('success', `Marked ${data.updated} notifications as read`);
        fetchNotifications();
        fetchStats();
      }
    } catch (error) {
      console.error('Error marking all as read:', error);
      showFeedback('error', 'Failed to update notifications');
    }
  };

  const handleDismissAll = async () => {
    if (!window.confirm('Dismiss all notifications? This action cannot be undone.')) return;

    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      
      const response = await fetch(`${apiURL}/api/notifications/dismiss-all`, {
        method: 'PUT',
        headers: {
          'Authorization': token,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      if (data.success) {
        showFeedback('success', `Dismissed ${data.dismissed} notifications`);
        fetchNotifications();
        fetchStats();
      }
    } catch (error) {
      console.error('Error dismissing all:', error);
      showFeedback('error', 'Failed to dismiss notifications');
    }
  };

  const getSeverityIcon = (severity) => {
    const iconClasses = "w-5 h-5";
    const lightColors = {
      critical: 'text-red-600',
      high: 'text-orange-600',
      medium: 'text-yellow-600',
      low: 'text-blue-600',
      default: 'text-gray-600'
    };
    
    const darkColors = {
      critical: 'text-red-500',
      high: 'text-orange-500',
      medium: 'text-yellow-500',
      low: 'text-blue-400',
      default: 'text-gray-400'
    };
    
    const color = theme === 'light' ? lightColors[severity] || lightColors.default : darkColors[severity] || darkColors.default;
    
    switch (severity) {
      case 'critical':
        return <FaExclamationTriangle className={`${iconClasses} ${color}`} />;
      case 'high':
        return <FaExclamationCircle className={`${iconClasses} ${color}`} />;
      case 'medium':
        return <FaExclamationCircle className={`${iconClasses} ${color}`} />;
      case 'low':
        return <FaInfoCircle className={`${iconClasses} ${color}`} />;
      default:
        return <FaInfoCircle className={`${iconClasses} ${color}`} />;
    }
  };

  const getSeverityColor = (severity) => {
    const lightColors = {
      critical: 'bg-red-100 text-red-800 border-red-200',
      high: 'bg-orange-100 text-orange-800 border-orange-200',
      medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      low: 'bg-blue-100 text-blue-800 border-blue-200',
      default: 'bg-gray-100 text-gray-800 border-gray-200'
    };
    
    const darkColors = {
      critical: 'bg-red-900/30 text-red-400 border-red-800/50',
      high: 'bg-orange-900/30 text-orange-400 border-orange-800/50',
      medium: 'bg-yellow-900/30 text-yellow-400 border-yellow-800/50',
      low: 'bg-blue-900/30 text-blue-400 border-blue-800/50',
      default: 'bg-gray-800 text-gray-400 border-gray-700'
    };
    
    return theme === 'light' ? lightColors[severity] || lightColors.default : darkColors[severity] || darkColors.default;
  };

  const getStatusColor = (status) => {
    const lightColors = {
      unread: 'bg-red-100 text-red-800 border-red-200',
      read: 'bg-green-100 text-green-800 border-green-200',
      dismissed: 'bg-gray-100 text-gray-800 border-gray-200',
      default: 'bg-gray-100 text-gray-800 border-gray-200'
    };
    
    const darkColors = {
      unread: 'bg-red-900/30 text-red-400 border-red-800/50',
      read: 'bg-green-900/30 text-green-400 border-green-800/50',
      dismissed: 'bg-gray-800 text-gray-400 border-gray-700',
      default: 'bg-gray-800 text-gray-400 border-gray-700'
    };
    
    return theme === 'light' ? lightColors[status] || lightColors.default : darkColors[status] || darkColors.default;
  };

  const getNotificationBorderColor = (severity) => {
    const lightColors = {
      critical: 'border-l-4 border-l-red-500',
      high: 'border-l-4 border-l-orange-500',
      medium: 'border-l-4 border-l-yellow-500',
      low: 'border-l-4 border-l-blue-500',
      default: 'border-l-4 border-l-gray-400'
    };
    
    const darkColors = {
      critical: 'border-l-4 border-l-red-600',
      high: 'border-l-4 border-l-orange-600',
      medium: 'border-l-4 border-l-yellow-600',
      low: 'border-l-4 border-l-blue-500',
      default: 'border-l-4 border-l-gray-600'
    };
    
    return theme === 'light' ? lightColors[severity] || lightColors.default : darkColors[severity] || darkColors.default;
  };

  const getAlertLogBadgeColor = () => {
    return theme === 'light' 
      ? 'bg-purple-100 text-purple-800 border-purple-200'
      : 'bg-purple-900/30 text-purple-400 border-purple-800/50';
  };

  const goFirst = () => setCurrentPage(1);
  const goPrev = () => setCurrentPage(Math.max(1, currentPage - 1));
  const goNext = () => setCurrentPage(Math.min(totalPages, currentPage + 1));
  const goLast = () => setCurrentPage(totalPages);

  return (
    <div className="component-body">
      {/* Action Feedback */}
      {actionFeedback && (
        <div className={`fixed top-20 right-6 z-50 px-6 py-4 rounded-lg shadow-2xl flex items-center gap-3 animate-fade-in ${
          actionFeedback.type === 'success' ? 'bg-green-600 text-white' : 
          actionFeedback.type === 'info' ? 'bg-blue-600 text-white' : 'bg-red-600 text-white'
        }`}>
          {actionFeedback.type === 'success' ? (
            <FaCheckCircle className="w-5 h-5" />
          ) : actionFeedback.type === 'info' ? (
            <FaInfoCircle className="w-5 h-5" />
          ) : (
            <FaExclamationCircle className="w-5 h-5" />
          )}
          <span className="font-medium">{actionFeedback.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center mb-8 w-full p-4">
        <h1 className="page-header select-none">Notifications</h1>

        <div className="flex gap-3 shrink-0">
          <button
            onClick={handleMarkAllAsRead}
            className="flex items-center gap-2 px-4 py-2 bg-[#76df23] hover:bg-[#5fc91f] text-white rounded-lg font-medium transition"

          >
            <IoCheckmarkDone className="w-5 h-5" />
            Mark All Read
          </button>
        <button
  onClick={handleDismissAll}
  className="
    flex items-center gap-2 px-4 py-2
    border border-gray-300 text-gray-700 rounded-lg font-medium
    hover:border-gray-400 hover:text-gray-900 transition
    dark:bg-slate-700 dark:hover:bg-slate-600
    dark:border-gray-600 dark:text-gray-200 dark:hover:text-white
  "
>
  <MdDelete className="w-5 h-5" />
  Dismiss All
</button>

        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4 mb-6 w-full">
        <div className={`stat-card ${theme === 'light' ? 'bg-gray-50 border-gray-200' : 'bg-slate-800/50 border-slate-700'}`}>
          <div className={theme === 'light' ? "text-gray-600 text-sm font-medium" : "text-gray-400 text-sm"}>Total</div>
          <div className={theme === 'light' ? "text-gray-900 text-2xl font-bold" : "text-white text-2xl font-bold"}>{stats.total || 0}</div>
        </div>
        <div className={`stat-card ${theme === 'light' ? 'bg-red-50 border-red-200' : 'bg-red-500/10 border-red-500/30'}`}>
          <div className={theme === 'light' ? "text-red-600 text-sm font-medium" : "text-red-400 text-sm"}>Unread</div>
          <div className={theme === 'light' ? "text-red-700 text-2xl font-bold" : "text-red-400 text-2xl font-bold"}>{stats.unread || 0}</div>
        </div>
        <div className={`stat-card ${theme === 'light' ? 'bg-green-50 border-green-200' : 'bg-green-500/10 border-green-500/30'}`}>
          <div className={theme === 'light' ? "text-green-600 text-sm font-medium" : "text-green-400 text-sm"}>Read</div>
          <div className={theme === 'light' ? "text-green-700 text-2xl font-bold" : "text-green-400 text-2xl font-bold"}>{stats.read || 0}</div>
        </div>
        <div className={`stat-card ${theme === 'light' ? 'bg-gray-50 border-gray-200' : 'bg-gray-500/10 border-gray-500/30'}`}>
          <div className={theme === 'light' ? "text-gray-600 text-sm font-medium" : "text-gray-400 text-sm"}>Dismissed</div>
          <div className={theme === 'light' ? "text-gray-700 text-2xl font-bold" : "text-gray-400 text-2xl font-bold"}>{stats.dismissed || 0}</div>
        </div>
        <div className={`stat-card ${theme === 'light' ? 'bg-red-50 border-red-200' : 'bg-red-600/10 border-red-600/30'}`}>
          <div className={theme === 'light' ? "text-red-700 text-sm font-medium" : "text-red-500 text-sm"}>Critical</div>
          <div className={theme === 'light' ? "text-red-800 text-2xl font-bold" : "text-red-500 text-2xl font-bold"}>{stats.critical || 0}</div>
        </div>
        <div className={`stat-card ${theme === 'light' ? 'bg-orange-50 border-orange-200' : 'bg-orange-500/10 border-orange-500/30'}`}>
          <div className={theme === 'light' ? "text-orange-700 text-sm font-medium" : "text-orange-500 text-sm"}>High</div>
          <div className={theme === 'light' ? "text-orange-800 text-2xl font-bold" : "text-orange-500 text-2xl font-bold"}>{stats.high || 0}</div>
        </div>
        <div className={`stat-card ${theme === 'light' ? 'bg-yellow-50 border-yellow-200' : 'bg-yellow-500/10 border-yellow-500/30'}`}>
          <div className={theme === 'light' ? "text-yellow-700 text-sm font-medium" : "text-yellow-500 text-sm"}>Medium</div>
          <div className={theme === 'light' ? "text-yellow-800 text-2xl font-bold" : "text-yellow-500 text-2xl font-bold"}>{stats.medium || 0}</div>
        </div>
        <div className={`stat-card ${theme === 'light' ? 'bg-blue-50 border-blue-200' : 'bg-blue-500/10 border-blue-500/30'}`}>
          <div className={theme === 'light' ? "text-blue-700 text-sm font-medium" : "text-blue-500 text-sm"}>Low</div>
          <div className={theme === 'light' ? "text-blue-800 text-2xl font-bold" : "text-blue-500 text-2xl font-bold"}>{stats.low || 0}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6">
        <div className="flex flex-wrap gap-4 items-center">
          {/* Search */}
          <div className="relative flex-1 min-w-[260px]">
            <input
              type="text"
              placeholder="Search notifications..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`selection-item pr-10 w-full ${theme === 'light' ? 'bg-white border-gray-300 text-gray-900' : 'bg-slate-800 border-slate-700 text-white'}`}
            />
            <IoSearchOutline className={`absolute w-6 h-6 right-3 top-3 ${theme === 'light' ? 'text-gray-400' : 'text-gray-400'}`} />
          </div>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
           className={`selection-item w-[160px] ${
    theme === 'light'
      ? 'bg-white border-gray-300 text-gray-900'
      : 'bg-slate-800 border-slate-700 text-white'
  }`}
          >
            <option value="">All Status</option>
            <option value="unread">🔴 Unread</option>
<option value="read">🟢 Read</option>
<option value="dismissed">⚪ Dismissed</option>

          </select>

          {/* Severity Filter */}
          <select
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value)}
            className={`selection-item w-[160px] ${
    theme === 'light'
      ? 'bg-white border-gray-300 text-gray-900'
      : 'bg-slate-800 border-slate-700 text-white'
  }`}
          >
            <option value="">All Severity</option>
            <option value="critical">🔴 Critical</option>
            <option value="high">🟠 High</option>
            <option value="medium">🟡 Medium</option>
            <option value="low">🔵 Low</option>

          </select>

          {/* Clear Filters */}
          {(searchTerm || selectedStatus || selectedSeverity) && (
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedStatus('');
                setSelectedSeverity('');
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${theme === 'light' ? 'bg-gray-200 hover:bg-gray-300 text-gray-800' : 'bg-gray-700 hover:bg-gray-600 text-white'}`}
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Notifications List */}
      <div className="alert-table-container">
        {loading ? (
          <div className={`text-center p-10 ${theme === 'light' ? 'text-gray-700' : 'text-white'}`}>Loading notifications...</div>
        ) : filteredNotifications.length === 0 ? (
          <div className={`text-center p-10 ${theme === 'light' ? 'text-gray-500' : 'text-gray-400'}`}>No notifications found</div>
        ) : (
          <div className="space-y-4">
            {filteredNotifications.map((notification) => (
              <div
                key={notification.notification_id}
                className={`notification-card rounded-lg p-5 transition-all ${theme === 'light' ? 'bg-white border border-gray-200' : 'bg-slate-800/50 border border-slate-700'} ${getNotificationBorderColor(notification.severity)} ${notification.status === 'unread' ? (theme === 'light' ? 'bg-blue-50' : 'bg-blue-500/10') : ''}`}
              >
                <div className="flex items-start gap-4">
                  {/* Severity Icon */}
                  <div className="flex-shrink-0 mt-1">
                    {getSeverityIcon(notification.severity)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    {/* <div className="flex items-start justify-between gap-3 mb-3">
                      <h3 className={`text-lg font-semibold ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>
                        {notification.title}
                      </h3>
                      <div className="flex gap-2 flex-wrap">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getSeverityColor(notification.severity)}`}>
                          {notification.severity?.toUpperCase() || 'UNKNOWN'}
                        </span>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(notification.status)}`}>
                          {notification.status?.toUpperCase() || 'UNKNOWN'}
                        </span>
                        {notification.source === 'alert_log' && (
                          <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getAlertLogBadgeColor()}`}>
                            ALERT LOG
                          </span>
                        )}
                      </div>
                    </div> */}

                    <p className={`mb-4 ${theme === 'light' ? 'text-gray-600' : 'text-gray-300'}`}>
                      {notification.message}
                    </p>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex flex-wrap gap-3 text-sm">
                        <span className={`flex items-center gap-1 ${theme === 'light' ? 'text-gray-700' : 'text-gray-400'}`}>
                          <strong className={theme === 'light' ? 'text-gray-800' : 'text-gray-300'}>Device:</strong>
                          <span>{notification.device_type || 'N/A'} ({notification.did || 'N/A'})</span>
                        </span>
                        <span className={`flex items-center gap-1 ${theme === 'light' ? 'text-gray-700' : 'text-gray-400'}`}>
                          <strong className={theme === 'light' ? 'text-gray-800' : 'text-gray-300'}>Error:</strong>
                          <span>{notification.error_code || 'N/A'}</span>
                        </span>
                        <span className={`flex items-center gap-1 ${theme === 'light' ? 'text-gray-700' : 'text-gray-400'}`}>
                          <strong className={theme === 'light' ? 'text-gray-800' : 'text-gray-300'}>Location:</strong>
                          <span>{notification.loc_name || 'N/A'}</span>
                        </span>
                        <span className={`flex items-center gap-1 ${theme === 'light' ? 'text-gray-700' : 'text-gray-400'}`}>
                          <strong className={theme === 'light' ? 'text-gray-800' : 'text-gray-300'}>Time:</strong>
                          <span>{new Date(notification.alert_timestamp || notification.created_at).toLocaleString()}</span>
                        </span>
                      </div>

                      {/* Action Buttons - Removed for alert_log, only show for regular notifications */}
                      {/* {notification.source !== 'alert_log' && (
                        <div className="flex gap-2 shrink-0">
                          {notification.status === 'unread' && (
                            <button
                              onClick={() => handleMarkAsRead(notification.notification_id, notification.source)}
                              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${theme === 'light' ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
                            >
                              Mark Read
                            </button>
                          )}
                          {notification.status !== 'dismissed' && notification.status !== 'read' && (
                            <button
                              onClick={() => handleDismiss(notification.notification_id, notification.source)}
                              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${theme === 'light' ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-red-600 hover:bg-red-700 text-white'}`}
                            >
                              Dismiss
                            </button>
                          )}
                        </div>
                      )} */}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className={`flex justify-between items-center mt-8 px-4 ${theme === 'light' ? 'text-gray-700' : 'text-white'}`}>
            <div className="flex items-center gap-2">
              <label>Items/page:</label>
              <select
                className={`border rounded px-2 py-1 ${theme === 'light' ? 'bg-white border-gray-300 text-gray-900' : 'bg-slate-800 border-slate-700 text-white'}`}
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
              >
                {[10, 20, 50, 100].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>

            <div>
              Page {currentPage} of {totalPages}
            </div>

            <div className="flex gap-2">
              <button 
                onClick={goFirst} 
                disabled={currentPage === 1} 
                className={`pagination-btn ${theme === 'light' ? 'bg-gray-100 hover:bg-gray-200 text-gray-800 border-gray-300' : 'bg-slate-800 hover:bg-slate-700 text-white border-slate-700'}`}
              >
                <TfiControlSkipBackward />
              </button>
              <button 
                onClick={goPrev} 
                disabled={currentPage === 1} 
                className={`pagination-btn ${theme === 'light' ? 'bg-gray-100 hover:bg-gray-200 text-gray-800 border-gray-300' : 'bg-slate-800 hover:bg-slate-700 text-white border-slate-700'}`}
              >
                <IoIosArrowBack />
              </button>
              <button 
                onClick={goNext} 
                disabled={currentPage === totalPages} 
                className={`pagination-btn ${theme === 'light' ? 'bg-gray-100 hover:bg-gray-200 text-gray-800 border-gray-300' : 'bg-slate-800 hover:bg-slate-700 text-white border-slate-700'}`}
              >
                <IoIosArrowForward />
              </button>
              <button 
                onClick={goLast} 
                disabled={currentPage === totalPages} 
                className={`pagination-btn ${theme === 'light' ? 'bg-gray-100 hover:bg-gray-200 text-gray-800 border-gray-300' : 'bg-slate-800 hover:bg-slate-700 text-white border-slate-700'}`}
              >
                <TfiControlSkipForward />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;