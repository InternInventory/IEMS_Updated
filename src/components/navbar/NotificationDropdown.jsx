import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { IoClose, IoCheckmarkDone } from 'react-icons/io5';
import { FaExclamationTriangle, FaExclamationCircle, FaInfoCircle } from 'react-icons/fa';
import useClickAway from '../hooks/useClickAway';
import { useTheme } from '../../context/ThemeContext';
import './navbar.css';

const NotificationDropdown = ({ isOpen, onClose, unreadCount, onUpdateCount }) => {
  const { isDark } = useTheme();
  const isDarkMode = isDark;
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const dropdownRef = useRef(null);

  const apiURL = import.meta.env.VITE_API_BASE_URL;

  useClickAway(dropdownRef, onClose);

  useEffect(() => {
    if (isOpen) {
      fetchRecentNotifications();
    }
  }, [isOpen]);

  const fetchRecentNotifications = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const response = await fetch(`${apiURL}/api/notifications?page=1&limit=10`, {
        headers: {
          'Authorization': token,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      if (data.success) {
        // Filter only unread/unseen notifications for the dropdown
        const unreadNotifications = (data.notifications || []).filter(n => !n.is_seen);
        setNotifications(unreadNotifications);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (notificationId, source, event) => {
    event.stopPropagation();
    
    // Show info message for read-only alert_log notifications
    if (source === 'alert_log') {
      console.info('Alert log notifications are read-only. Use alert log management to update status.');
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
        // Remove from local state
        setNotifications(notifications.filter(n => n.notification_id !== notificationId));
        // Update badge count
        onUpdateCount();
      }
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
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
        setNotifications([]);
        onUpdateCount();
      }
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const handleNotificationClick = (notification) => {
    // Mark as seen first (only for device alerts)
    if (notification.source !== 'alert_log') {
      markAsSeen(notification.notification_id);
    }
    
    // Navigate based on source
    if (notification.source === 'alert_log') {
      // Navigate to alert log management
      navigate(`/alerts-log`);
    } else if (notification.source === 'device_alert' || notification.alert_id) {
      // Navigate to device alerts
      navigate(`/alerts`);
    }
    onClose();
  };

  const markAsSeen = async (notificationId) => {
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const response = await fetch(`${apiURL}/api/notifications/${notificationId}/seen`, {
        method: 'PUT',
        headers: {
          'Authorization': token,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      // Backend handles read-only alert_log gracefully, just log if needed
      if (data.message && data.message.includes('read-only')) {
        console.info(data.message);
      }
    } catch (error) {
      console.error('Error marking as seen:', error);
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'critical':
        return <FaExclamationTriangle className="w-4 h-4 text-red-500" />;
      case 'high':
        return <FaExclamationCircle className="w-4 h-4 text-orange-500" />;
      case 'medium':
        return <FaExclamationCircle className="w-4 h-4 text-yellow-500" />;
      case 'low':
        return <FaInfoCircle className="w-4 h-4 text-blue-500" />;
      default:
        return <FaInfoCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getSeverityColor = (severity) => {
    const colors = {
      critical: 'border-l-4 border-red-500 bg-red-500/10',
      high: 'border-l-4 border-orange-500 bg-orange-500/10',
      medium: 'border-l-4 border-yellow-500 bg-yellow-500/10',
      low: 'border-l-4 border-blue-500 bg-blue-500/10'
    };
    return colors[severity] || 'border-l-4 border-gray-500 bg-gray-500/10';
  };

  const getTimeAgo = (timestamp) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now - time;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return time.toLocaleDateString();
  };

  if (!isOpen) return null;

  return (
    <div
      ref={dropdownRef}
      className={`notification-dropdown-container absolute right-0 top-12 w-96 max-h-[600px] ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-gray-200'} border rounded-xl shadow-2xl overflow-hidden z-50 animate-fade-in`}
    >
      {/* Header */}
      <div className={`notification-dropdown-header flex justify-between items-center px-5 py-4 ${isDarkMode ? 'bg-gradient-to-r from-slate-800 to-slate-900 border-slate-700' : 'bg-gradient-to-r from-gray-50 to-gray-100 border-gray-200'} border-b`}>
        <div>
          <h3 className={`${isDarkMode ? 'text-white' : 'text-gray-900'} font-bold text-lg`}>Notifications</h3>
          {unreadCount > 0 && (
            <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'} text-xs mt-0.5`}>{unreadCount} unread</p>
          )}
        </div>
        {notifications.length > 0 && (
          <button
            onClick={handleMarkAllAsRead}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors"
            title="Mark all as read"
          >
            <IoCheckmarkDone className="w-4 h-4" />
            Mark all read
          </button>
        )}
      </div>

      {/* Notification List */}
      <div className="notification-list overflow-y-auto max-h-[450px] custom-scrollbar">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
            <div className={`w-16 h-16 ${isDarkMode ? 'bg-slate-800' : 'bg-gray-100'} rounded-full flex items-center justify-center mb-3`}>
              <svg className={`w-8 h-8 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
            <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'} font-medium`}>No new notifications</p>
            <p className={`${isDarkMode ? 'text-gray-500' : 'text-gray-500'} text-sm mt-1`}>You're all caught up!</p>
          </div>
        ) : (
          notifications.map((notification) => (
            <div
              key={notification.notification_id}
              className={`notification-item cursor-pointer ${isDarkMode ? 'hover:bg-slate-800/50' : 'hover:bg-gray-50'} transition-all ${getSeverityColor(notification.severity)}`}
              onClick={() => handleNotificationClick(notification)}
            >
              <div className="flex items-start gap-3 px-5 py-4">
                {/* Severity Icon */}
                <div className="flex-shrink-0 mt-1">
                  {getSeverityIcon(notification.severity)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h4 className={`${isDarkMode ? 'text-white' : 'text-gray-900'} font-semibold text-sm line-clamp-1`}>
                      {notification.title}
                    </h4>
                    {/* Only show Mark as Read for device alerts, not alert_logs */}
                    {notification.source !== 'alert_log' && (
                      <button
                        onClick={(e) => handleMarkAsRead(notification.notification_id, notification.source, e)}
                        className={`flex-shrink-0 p-1 ${isDarkMode ? 'hover:bg-slate-700' : 'hover:bg-gray-200'} rounded-full transition-colors`}
                        title="Mark as read"
                      >
                        <IoClose className={`w-4 h-4 ${isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-700'}`} />
                      </button>
                    )}
                  </div>
                  <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'} text-xs line-clamp-2 mb-2`}>
                    {notification.message}
                  </p>
                  <div className="flex items-center justify-between text-xs flex-wrap gap-1">
                    <div className="flex items-center gap-2">
                      <span className={`${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                        {notification.device_type?.toUpperCase()} • {notification.did}
                      </span>
                      {notification.source === 'alert_log' && (
                        <span className="px-1.5 py-0.5 bg-purple-500/20 text-purple-300 rounded text-[10px] font-medium">
                          Alert Log
                        </span>
                      )}
                    </div>
                    <span className="text-gray-500">
                      {getTimeAgo(notification.alert_timestamp || notification.created_at)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div className={`notification-dropdown-footer px-5 py-3 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-gray-50 border-gray-200'} border-t`}>
          <button
            onClick={() => {
              navigate('/notifications');
              onClose();
            }}
            className={`w-full text-center ${isDarkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'} text-sm font-medium transition-colors`}
          >
            View all notifications →
          </button>
        </div>
      )}
    </div>
  );
};

export default NotificationDropdown;
