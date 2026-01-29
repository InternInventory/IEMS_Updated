import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { FiUpload, FiX } from 'react-icons/fi';
import axios from 'axios';

const BinUploads = () => {
  const navigate = useNavigate();
  const { isDarkMode } = useTheme();
  const apiUrl = import.meta.env.VITE_API_BASE_URL;

  const [activeTab, setActiveTab] = useState('production'); // 'production' or 'test'
  
  // Production firmware state
  const [productionFile, setProductionFile] = useState(null);
  const [productionDevice, setProductionDevice] = useState('');
  const [productionVersion, setProductionVersion] = useState('');
  const [productionDragging, setProductionDragging] = useState(false);
  const [productionUploading, setProductionUploading] = useState(false);
  const [productionSuccess, setProductionSuccess] = useState(false);
  const [productionError, setProductionError] = useState('');

  // Test firmware state
  const [testFile, setTestFile] = useState(null);
  const [testDevice, setTestDevice] = useState('');
  const [testVersion, setTestVersion] = useState('');
  const [testDragging, setTestDragging] = useState(false);
  const [testUploading, setTestUploading] = useState(false);
  const [testSuccess, setTestSuccess] = useState(false);
  const [testError, setTestError] = useState('');

  const deviceOptions = [
    { value: 'neon', label: 'NEON', endpoint: '/otaneonupload', testEndpoint: '/otaneontestupload' },
    { value: 'lib', label: 'LIB', endpoint: '/otalibupload', testEndpoint: '/otalibtestupload' },
    { value: 'iatm', label: 'IATM', endpoint: '/otaiatmupload', testEndpoint: '/otaiatmtestupload' },
  ];

  const handleDragOver = (e, type) => {
    e.preventDefault();
    if (type === 'production') {
      setProductionDragging(true);
    } else {
      setTestDragging(true);
    }
  };

  const handleDragLeave = (e, type) => {
    e.preventDefault();
    if (type === 'production') {
      setProductionDragging(false);
    } else {
      setTestDragging(false);
    }
  };

  const handleDrop = (e, type) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.name.endsWith('.bin')) {
        if (type === 'production') {
          setProductionFile(file);
          setProductionDragging(false);
          setProductionError('');
        } else {
          setTestFile(file);
          setTestDragging(false);
          setTestError('');
        }
      } else {
        if (type === 'production') {
          setProductionError('Please upload a .bin file');
          setProductionDragging(false);
        } else {
          setTestError('Please upload a .bin file');
          setTestDragging(false);
        }
      }
    }
  };

  const handleFileSelect = (e, type) => {
    const file = e.target.files[0];
    if (file) {
      if (file.name.endsWith('.bin')) {
        if (type === 'production') {
          setProductionFile(file);
          setProductionError('');
        } else {
          setTestFile(file);
          setTestError('');
        }
      } else {
        if (type === 'production') {
          setProductionError('Please upload a .bin file');
        } else {
          setTestError('Please upload a .bin file');
        }
      }
    }
  };

  const handleUpload = async (type) => {
    const file = type === 'production' ? productionFile : testFile;
    const device = type === 'production' ? productionDevice : testDevice;
    const version = type === 'production' ? productionVersion : testVersion;

    if (!file || !device || !version) {
      const errorMsg = 'Please fill all fields';
      if (type === 'production') {
        setProductionError(errorMsg);
      } else {
        setTestError(errorMsg);
      }
      return;
    }

    const selectedDevice = deviceOptions.find(d => d.value === device);
    const endpoint = type === 'production' ? selectedDevice.endpoint : selectedDevice.testEndpoint;

    const formData = new FormData();
    formData.append('firmware', file);
    formData.append('versionName', version);

    if (type === 'production') {
      setProductionUploading(true);
      setProductionError('');
      setProductionSuccess(false);
    } else {
      setTestUploading(true);
      setTestError('');
      setTestSuccess(false);
    }

    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const response = await axios.post(`${apiUrl}${endpoint}`, formData, {
        headers: {
          'Authorization': token,
        },
      });

      if (response.status === 200 || response.status === 201) {
        if (type === 'production') {
          setProductionSuccess(true);
          setProductionFile(null);
          setProductionDevice('');
          setProductionVersion('');
          setTimeout(() => setProductionSuccess(false), 3000);
        } else {
          setTestSuccess(true);
          setTestFile(null);
          setTestDevice('');
          setTestVersion('');
          setTimeout(() => setTestSuccess(false), 3000);
        }
      }
    } catch (error) {
      console.error('Upload error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to upload firmware';
      if (type === 'production') {
        setProductionError(errorMessage);
      } else {
        setTestError(errorMessage);
      }
    } finally {
      if (type === 'production') {
        setProductionUploading(false);
      } else {
        setTestUploading(false);
      }
    }
  };

  const renderUploadSection = (type) => {
    const file = type === 'production' ? productionFile : testFile;
    const device = type === 'production' ? productionDevice : testDevice;
    const version = type === 'production' ? productionVersion : testVersion;
    const dragging = type === 'production' ? productionDragging : testDragging;
    const uploading = type === 'production' ? productionUploading : testUploading;
    const success = type === 'production' ? productionSuccess : testSuccess;
    const error = type === 'production' ? productionError : testError;

    const setFile = type === 'production' ? setProductionFile : setTestFile;
    const setDevice = type === 'production' ? setProductionDevice : setTestDevice;
    const setVersion = type === 'production' ? setProductionVersion : setTestVersion;

    return (
      <div className="space-y-6">
        {/* File Upload */}
        <div>
          <label className={`block text-sm font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Firmware File (.bin) <span className="text-red-500">*</span>
          </label>
          <div
            onDragOver={(e) => handleDragOver(e, type)}
            onDragLeave={(e) => handleDragLeave(e, type)}
            onDrop={(e) => handleDrop(e, type)}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-all ${
              dragging
                ? 'border-yellow-400 bg-yellow-50 dark:bg-yellow-900/20'
                : isDarkMode
                ? 'border-gray-600 bg-[#0F172B]'
                : 'border-gray-300 bg-white'
            }`}
          >
            {file ? (
              <div className="space-y-4">
                <div className={`flex items-center justify-center gap-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  <FiUpload size={24} className="text-green-500" />
                  <span className="font-medium">{file.name}</span>
                  <button
                    onClick={() => setFile(null)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <FiX size={20} />
                  </button>
                </div>
                <p className="text-sm text-gray-500">
                  {(file.size / 1024).toFixed(2)} KB
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <FiUpload size={48} className={`mx-auto ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`} />
                <div>
                  <p className={`text-lg font-medium mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    Drag and drop your .bin file here
                  </p>
                  <p className={`text-sm mb-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    or
                  </p>
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept=".bin"
                      onChange={(e) => handleFileSelect(e, type)}
                      className="hidden"
                    />
                    <span className="px-4 py-2 bg-[#D2DE07] text-black rounded-lg font-bold hover:bg-[#c1cd06] transition-colors inline-block">
                      Browse Files
                    </span>
                  </label>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Device Selection */}
        <div>
          <label className={`block text-sm font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Device Type <span className="text-red-500">*</span>
          </label>
          <select
            value={device}
            onChange={(e) => setDevice(e.target.value)}
            className={`w-full px-4 py-3 rounded-lg border ${
              isDarkMode
                ? 'bg-[#0F172B] border-gray-600 text-white'
                : 'bg-white border-gray-300 text-gray-900'
            } focus:outline-none focus:ring-2 focus:ring-yellow-400`}
          >
            <option value="">Select Device Type</option>
            {deviceOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Version Input */}
        <div>
          <label className={`block text-sm font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Version Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={version}
            onChange={(e) => setVersion(e.target.value)}
            placeholder="e.g., v1.2.3"
            className={`w-full px-4 py-3 rounded-lg border ${
              isDarkMode
                ? 'bg-[#0F172B] border-gray-600 text-white'
                : 'bg-white border-gray-300 text-gray-900'
            } focus:outline-none focus:ring-2 focus:ring-yellow-400`}
          />
        </div>

        {/* Success/Error Messages */}
        {success && (
          <div className="p-4 bg-green-500 bg-opacity-20 border border-green-500 rounded-lg text-green-500">
            ✓ Firmware uploaded successfully!
          </div>
        )}
        {error && (
          <div className="p-4 bg-red-500 bg-opacity-20 border border-red-500 rounded-lg text-red-500">
            {error}
          </div>
        )}

        {/* Upload Button */}
        <button
          onClick={() => handleUpload(type)}
          disabled={uploading}
          className={`w-full px-6 py-3 rounded-lg font-bold transition-colors ${
            uploading
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-[#D2DE07] hover:bg-[#c1cd06] text-black'
          }`}
        >
          {uploading ? 'Uploading...' : 'Upload Firmware'}
        </button>
      </div>
    );
  };

  return (
    <div className={`min-h-screen p-6 ${isDarkMode ? 'bg-[#0a0e1a]' : 'bg-gray-50'}`}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Bin Uploads
          </h1>
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            ← Back
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6 border-b border-gray-700">
          <button
            onClick={() => setActiveTab('production')}
            className={`px-6 py-3 font-bold transition-colors ${
              activeTab === 'production'
                ? 'border-b-4 border-[#D2DE07] text-[#D2DE07]'
                : isDarkMode
                ? 'text-gray-400 hover:text-white'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Production Firmware
          </button>
          <button
            onClick={() => setActiveTab('test')}
            className={`px-6 py-3 font-bold transition-colors ${
              activeTab === 'test'
                ? 'border-b-4 border-[#D2DE07] text-[#D2DE07]'
                : isDarkMode
                ? 'text-gray-400 hover:text-white'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Test Firmware
          </button>
        </div>

        {/* Content */}
        <div className={`p-6 rounded-lg ${isDarkMode ? 'bg-[#0F172B]' : 'bg-white border border-gray-200'}`}>
          {activeTab === 'production' ? renderUploadSection('production') : renderUploadSection('test')}
        </div>
      </div>
    </div>
  );
};

export default BinUploads;

// Backend code (Node.js/Express example)
// router.post('/devicedata/otaneonupload', uploadMiddleware, async (req, res) => {
//   // Handle NEON firmware upload
// });
