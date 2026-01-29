import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import checklistService from '../../services/checklistService';
import '../../assets/styles/common.css';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useTheme } from '../../context/ThemeContext';

const ChecklistReportDetail = () => {
  const { reportId } = useParams();
  const navigate = useNavigate();
  const { theme, colors } = useTheme();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  useEffect(() => {
    fetchReportDetail();
  }, [reportId]);

  const fetchReportDetail = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await checklistService.getReportById(reportId);
      if (response.success) {
        setReport(response.data);
      } else {
        setError(response.message || 'Failed to fetch report details');
      }
    } catch (err) {
      console.error('Error fetching report details:', err);
      setError(err.response?.data?.message || err.message || 'Failed to fetch report details');
    } finally {
      setLoading(false);
    }
  };

  const generatePDF = async () => {
    if (!report) return;
    
    setGeneratingPdf(true);
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const contentWidth = pageWidth - (margin * 2);
      let yPos = margin;

      const checklistData = report.checklist_data || {};
      const engineerInfo = checklistData.engineer_info || {};
      const siteInfo = checklistData.site_info || {};
      const deviceSummary = checklistData.device_summary || {};
      const lights = checklistData.lights || [];
      const meters = checklistData.meters || [];
      const acUnits = checklistData.ac_units || [];
      const motionSensors = checklistData.motion_sensors || [];

      // Helper function to safely render values (convert objects to strings)
      const renderValue = (value) => {
        if (value === null || value === undefined) return 'N/A';
        if (typeof value === 'object') {
          // If it's an object with url/filename, render the filename or url
          if (value.url || value.filename) {
            return value.filename || value.url || 'N/A';
          }
          // Otherwise stringify it
          return JSON.stringify(value);
        }
        return String(value);
      };

      // Helper function to add new page if needed
      const checkPageBreak = (requiredSpace = 15) => {
        if (yPos + requiredSpace > pageHeight - margin - 10) {
          pdf.addPage();
          yPos = margin;
          return true;
        }
        return false;
      };

      // Draw table cell
      const drawCell = (x, y, width, height, text, options = {}) => {
        const {
          align = 'left',
          bold = false,
          fontSize = 9,
          bgColor = null,
          borderColor = [0, 0, 0],
          padding = 2
        } = options;

        // Draw border
        pdf.setDrawColor(...borderColor);
        pdf.setLineWidth(0.3);
        pdf.rect(x, y, width, height);

        // Fill background if specified
        if (bgColor) {
          pdf.setFillColor(...bgColor);
          pdf.rect(x, y, width, height, 'F');
          pdf.rect(x, y, width, height); // Redraw border
        }

        // Draw text
        pdf.setFontSize(fontSize);
        pdf.setFont('helvetica', bold ? 'bold' : 'normal');
        pdf.setTextColor(0, 0, 0);

        const lines = pdf.splitTextToSize(text.toString(), width - (padding * 2));
        const textY = y + height / 2 + (fontSize * 0.3) - ((lines.length - 1) * fontSize * 0.15);
        
        lines.forEach((line, index) => {
          const textX = align === 'center' ? x + width / 2 : 
                       align === 'right' ? x + width - padding : 
                       x + padding;
          pdf.text(line, textX, textY + (index * fontSize * 0.4), { align });
        });
      };

      // Header Box with BuildINT Logo
      pdf.setLineWidth(0.4);
      pdf.setDrawColor(0, 0, 0);
      pdf.rect(margin, yPos, contentWidth, 18);
      
      // BuildINT text
      pdf.setFontSize(20);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(0, 0, 0);
      pdf.text('BuildINT', pageWidth / 2, yPos + 11, { align: 'center' });
      
      yPos += 18;

      // Title Section
      pdf.rect(margin, yPos, contentWidth, 10);
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text('ASSET REPORT FOR I-EMS SOLUTION', pageWidth / 2, yPos + 6.5, { align: 'center' });
      yPos += 10;

      yPos += 3;

      // Basic Information Section - Two column layout
      const labelWidth = 35;
      const valueWidth = contentWidth - labelWidth;
      
      const basicInfo = [
        ['City Name -', report.loc_name || siteInfo.city || 'N/A'],
        ['Branch -', siteInfo.branch_name || report.org_name || 'BuildINT'],
        ['Date -', new Date(report.created_at).toLocaleDateString('en-GB')],
        ['Site Address -', report.loc_address || 'N/A'],
        ['MSE Name -', engineerInfo.name || report.created_by_full_name || 'N/A'],
        ['MSE Contact -', engineerInfo.phone || report.loc_contact_mobile || 'N/A'],
        ['Email id -', engineerInfo.email || report.created_by_email || 'N/A']
      ];

      basicInfo.forEach(([label, value]) => {
        const rowHeight = 7;
        checkPageBreak(rowHeight);
        drawCell(margin, yPos, labelWidth, rowHeight, label, { bold: true, fontSize: 9 });
        drawCell(margin + labelWidth, yPos, valueWidth, rowHeight, value, { fontSize: 9 });
        yPos += rowHeight;
      });

      yPos += 2;
      checkPageBreak(30);

      // AC Units Table (if any)
      if (acUnits.length > 0) {
        // Header row with "Details"
        drawCell(margin, yPos, contentWidth, 6, 'Details', { 
          bold: true, 
          fontSize: 9, 
          bgColor: [220, 220, 220],
          align: 'left'
        });
        yPos += 6;

        // Table headers for AC
        const acHeaders = ['Installation\nArea', 'AC Type', 'Impact Area', 'Make', 'Qty', 'Device', 'Capacity(ton)', 'Communication'];
        const acColWidths = [25, 20, 20, 25, 15, 20, 25, contentWidth - 150];
        let xPos = margin;

        acHeaders.forEach((header, i) => {
          drawCell(xPos, yPos, acColWidths[i], 10, header, { 
            bold: true, 
            fontSize: 8, 
            align: 'center',
            bgColor: [240, 240, 240]
          });
          xPos += acColWidths[i];
        });
        yPos += 10;

        // AC data rows
        acUnits.forEach((ac) => {
          checkPageBreak(8);
          xPos = margin;
          const rowData = [
            ac.installation_area || ac.area || 'Server Room &\nElectrical room',
            ac.ac_type || 'DUCT',
            ac.impact_area || 'Front Area',
            ac.make || 'DAIKIN',
            ac.quantity || ac.qty || '1',
            ac.device || 'NEON',
            ac.capacity || '5.5',
            ac.communication || 'Relay'
          ];

          rowData.forEach((data, i) => {
            drawCell(xPos, yPos, acColWidths[i], 8, data, { fontSize: 8, align: 'center' });
            xPos += acColWidths[i];
          });
          yPos += 8;
        });

        yPos += 3;
      }

      checkPageBreak(30);

      // Lights Table (if any)
      if (lights.length > 0) {
        // Header row
        drawCell(margin, yPos, contentWidth, 6, 'Installation Area - Lights', { 
          bold: true, 
          fontSize: 9, 
          bgColor: [220, 220, 220]
        });
        yPos += 6;

        // Table headers for Lights
        const lightHeaders = ['Installation\nArea', 'Light Type', 'Impact Area', 'Make (if\navailable)', 'Light\nQty', 'Device', 'Capacity\n(kWh)', 'Communication'];
        const lightColWidths = [25, 25, 20, 25, 15, 20, 20, contentWidth - 150];
        let xPos = margin;

        lightHeaders.forEach((header, i) => {
          drawCell(xPos, yPos, lightColWidths[i], 10, header, { 
            bold: true, 
            fontSize: 8, 
            align: 'center',
            bgColor: [240, 240, 240]
          });
          xPos += lightColWidths[i];
        });
        yPos += 10;

        // Light data rows
        lights.forEach((light) => {
          checkPageBreak(8);
          xPos = margin;
          const rowData = [
            light.installation_area || 'Server Room &\nElectrical room',
            light.light_type || 'Ceiling Lights',
            light.impact_area || 'Hall Area',
            light.make || 'NA',
            light.light_qty || light.quantity || '26',
            light.device || 'Li-Bi',
            light.capacity || 'NA',
            light.communication || 'Relay'
          ];

          rowData.forEach((data, i) => {
            drawCell(xPos, yPos, lightColWidths[i], 8, data, { fontSize: 8, align: 'center' });
            xPos += lightColWidths[i];
          });
          yPos += 8;
        });

        yPos += 3;
      }

      checkPageBreak(30);

      // Meters Table (if any)
      if (meters.length > 0) {
        drawCell(margin, yPos, contentWidth, 6, 'Installation Area - Meters', { 
          bold: true, 
          fontSize: 9, 
          bgColor: [220, 220, 220]
        });
        yPos += 6;

        const meterHeaders = ['Installation\nArea', 'Total\nSensors', 'Impact Area', 'Meter\nQTY', 'Device'];
        const meterColWidths = [40, 30, 40, 30, contentWidth - 140];
        let xPos = margin;

        meterHeaders.forEach((header, i) => {
          drawCell(xPos, yPos, meterColWidths[i], 10, header, { 
            bold: true, 
            fontSize: 8, 
            align: 'center',
            bgColor: [240, 240, 240]
          });
          xPos += meterColWidths[i];
        });
        yPos += 10;

        meters.forEach((meter) => {
          checkPageBreak(8);
          xPos = margin;
          const rowData = [
            meter.installation_area || 'Server Room &\nElectrical room',
            meter.total_sensors || '12',
            meter.impact_area || 'Whole Office',
            meter.meter_qty || meter.quantity || '1',
            meter.device || 'BIG-IO'
          ];

          rowData.forEach((data, i) => {
            drawCell(xPos, yPos, meterColWidths[i], 8, data, { fontSize: 8, align: 'center' });
            xPos += meterColWidths[i];
          });
          yPos += 8;
        });

        yPos += 3;
      }

      checkPageBreak(30);

      // Motion Sensors Table (if any)
      if (motionSensors.length > 0) {
        drawCell(margin, yPos, contentWidth, 6, 'Installation Area - Motion Sensors', { 
          bold: true, 
          fontSize: 9, 
          bgColor: [220, 220, 220]
        });
        yPos += 6;

        const sensorHeaders = ['Installation\nArea', 'Impact\nArea', 'Motion Based Controlling\nArea\'s', 'QTY', 'Device'];
        const sensorColWidths = [30, 25, 60, 20, contentWidth - 135];
        let xPos = margin;

        sensorHeaders.forEach((header, i) => {
          drawCell(xPos, yPos, sensorColWidths[i], 10, header, { 
            bold: true, 
            fontSize: 8, 
            align: 'center',
            bgColor: [240, 240, 240]
          });
          xPos += sensorColWidths[i];
        });
        yPos += 10;

        motionSensors.forEach((sensor) => {
          checkPageBreak(8);
          xPos = margin;
          const rowData = [
            sensor.installation_area || 'Ref#1',
            sensor.impact_area || 'Ref#1',
            sensor.controlling_areas || 'NA',
            sensor.quantity || sensor.qty || '22',
            sensor.device || 'Bi-Bug'
          ];

          rowData.forEach((data, i) => {
            drawCell(xPos, yPos, sensorColWidths[i], 8, data, { fontSize: 8, align: 'center' });
            xPos += sensorColWidths[i];
          });
          yPos += 8;
        });

        yPos += 3;
      }

      checkPageBreak(40);

      // Device Summary Table
      const deviceColWidth = contentWidth / 2;
      drawCell(margin, yPos, deviceColWidth, 7, 'Device Name', { 
        bold: true, 
        fontSize: 9, 
        align: 'center',
        bgColor: [245, 245, 245]
      });
      drawCell(margin + deviceColWidth, yPos, deviceColWidth, 7, 'QTY', { 
        bold: true, 
        fontSize: 9, 
        align: 'center',
        bgColor: [245, 245, 245]
      });
      yPos += 7;

      // Device summary rows
      const deviceList = [];
      
      // Add NEON
      const neonCount = acUnits.filter(ac => (ac.device || '').toUpperCase() === 'NEON').length;
      deviceList.push(['NEON', neonCount]);
      
      // Add Li-Bi
      const libiCount = lights.filter(l => (l.device || '').toUpperCase().includes('LI-BI')).length || 
                       lights.reduce((sum, l) => sum + (parseInt(l.light_qty) || 0), 0);
      deviceList.push(['Li-Bi', libiCount]);
      
      // Add BIG-IO
      const bigioCount = meters.filter(m => (m.device || '').toUpperCase() === 'BIG-IO').length;
      deviceList.push(['BIG-IO', bigioCount]);
      
      // Add Bi-Bug
      const bibugCount = motionSensors.length;
      deviceList.push(['Bi-Bug', bibugCount]);
      
      // Add Router and Energy Meter
      deviceList.push(['Router', 1]);
      deviceList.push(['Energy Meter', 1]);

      // If deviceSummary exists, use that instead
      if (Object.keys(deviceSummary).length > 0) {
        deviceList.length = 0;
        Object.entries(deviceSummary).forEach(([device, qty]) => {
          deviceList.push([device, qty]);
        });
      }

      deviceList.forEach(([device, qty]) => {
        checkPageBreak(7);
        drawCell(margin, yPos, deviceColWidth, 7, device, { fontSize: 9 });
        drawCell(margin + deviceColWidth, yPos, deviceColWidth, 7, qty.toString(), { 
          fontSize: 9, 
          align: 'center' 
        });
        yPos += 7;
      });

      // Footer with engineer info
      yPos = pageHeight - 18;
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(0, 0, 0);
      pdf.text(`Engineer Name: ${engineerInfo.name || report.created_by_full_name || 'Yuvraj Singh'}`, pageWidth - margin, yPos, { align: 'right' });
      pdf.text(`Phone Number: ${engineerInfo.phone || report.loc_contact_mobile || '9324956528'}`, pageWidth - margin, yPos + 5, { align: 'right' });

      // Save PDF
      const fileName = `Asset_Report_${report.report_id}_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);

    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setGeneratingPdf(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen p-6" style={{ backgroundColor: colors.background }}>
        <div className="flex items-center justify-center py-20">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-t-transparent" style={{ borderColor: colors.primary, borderTopColor: 'transparent' }}></div>
            <span className="text-lg" style={{ color: colors.textSecondary }}>Loading report...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen p-6" style={{ backgroundColor: colors.background }}>
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => navigate(-1)}
            className="mb-4 px-4 py-2 rounded-lg transition-colors"
            style={{ backgroundColor: colors.surface, color: colors.textPrimary }}
            onMouseEnter={(e) => e.target.style.backgroundColor = colors.hover}
            onMouseLeave={(e) => e.target.style.backgroundColor = colors.surface}
          >
            ← Back
          </button>
          <div className="rounded-lg p-6" style={{ backgroundColor: colors.error + '1A', border: `1px solid ${colors.error}4D` }}>
            <h3 className="text-lg font-semibold mb-2" style={{ color: colors.error }}>Error Loading Report</h3>
            <p style={{ color: colors.error }}>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="min-h-screen p-6" style={{ backgroundColor: colors.background }}>
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => navigate(-1)}
            className="mb-4 px-4 py-2 rounded-lg transition-colors"
            style={{ backgroundColor: colors.surface, color: colors.textPrimary }}
            onMouseEnter={(e) => e.target.style.backgroundColor = colors.hover}
            onMouseLeave={(e) => e.target.style.backgroundColor = colors.surface}
          >
            ← Back
          </button>
          <div className="text-center py-20" style={{ color: colors.textSecondary }}>
            <p>Report not found</p>
          </div>
        </div>
      </div>
    );
  }

  const checklistData = report.checklist_data || {};
  const engineerInfo = checklistData.engineer_info || {};
  const siteInfo = checklistData.site_info || {};
  const deviceInfo = checklistData.device_info || {};
  const deviceSummary = checklistData.device_summary || {};
  const lights = checklistData.lights || [];
  const meters = checklistData.meters || [];
  const acUnits = checklistData.ac_units || [];
  const motionSensors = checklistData.motion_sensors || [];
  const checklistItems = checklistData.checklist_items || [];
  const photos = checklistData.photos || [];
  const observations = checklistData.observations || '';
  const recommendations = checklistData.recommendations || '';

  // Helper function to safely render values (convert objects to strings)
  const renderValue = (value) => {
    if (value === null || value === undefined) return 'N/A';
    if (typeof value === 'object') {
      // If it's an object with url/filename, render the filename or url
      if (value.url || value.filename) {
        return value.filename || value.url || 'N/A';
      }
      // Otherwise stringify it
      return JSON.stringify(value);
    }
    return String(value);
  };

  // Helper function to check if value is an image or array of images
  const isImageValue = (value) => {
    // Check if it's a single image object
    if (typeof value === 'object' && (value.url || value.filename)) {
      const url = value.url || value.filename || '';
      const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
      return imageExtensions.some(ext => url.toLowerCase().includes(ext));
    }
    
    // Check if it's an array of images
    if (Array.isArray(value) && value.length > 0) {
      const first = value[0];
      if (typeof first === 'object' && (first.url || first.filename)) {
        const url = first.url || first.filename || '';
        const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
        return imageExtensions.some(ext => url.toLowerCase().includes(ext));
      }
    }
    
    return false;
  };

  // Helper function to render a single field with image support
  const renderField = (key, value) => {
    if (isImageValue(value)) {
      const images = Array.isArray(value) ? value : [value];
      
      return (
        <div key={key} className="col-span-1">
          <div className="text-sm capitalize mb-2" style={{ color: colors.textSecondary }}>{key.replace(/_/g, ' ')}</div>
          <div className="flex gap-2 flex-wrap">
            {images.map((img, idx) => (
              <img 
                key={idx}
                src={img.url || img.filename} 
                alt={`${key}-${idx}`}
                className="h-40 object-cover rounded-lg"
                style={{ border: `1px solid ${colors.border}` }}
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
            ))}
          </div>
        </div>
      );
    }
    return (
      <div key={key}>
        <div className="text-sm capitalize" style={{ color: colors.textSecondary }}>{key.replace(/_/g, ' ')}</div>
        <div style={{ color: colors.textPrimary }}>{renderValue(value)}</div>
      </div>
    );
  };

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: colors.background }}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 rounded-lg transition-colors"
            style={{ backgroundColor: colors.surface, color: colors.textPrimary }}
            onMouseEnter={(e) => e.target.style.backgroundColor = colors.hover}
            onMouseLeave={(e) => e.target.style.backgroundColor = colors.surface}
          >
            ← Back
          </button>
          <h1 className="text-2xl font-bold" style={{ color: colors.textPrimary }}>Checklist Report #{report.report_id}</h1>
          <button
            onClick={generatePDF}
            disabled={generatingPdf}
            className="px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
            style={{ 
              backgroundColor: generatingPdf ? colors.hover : colors.primary, 
              color: colors.textInverse,
              cursor: generatingPdf ? 'not-allowed' : 'pointer',
              opacity: generatingPdf ? 0.6 : 1
            }}
            onMouseEnter={(e) => !generatingPdf && (e.target.style.backgroundColor = colors.primaryDark)}
            onMouseLeave={(e) => !generatingPdf && (e.target.style.backgroundColor = colors.primary)}
          >
            {generatingPdf ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-t-transparent" style={{ borderColor: colors.textInverse, borderTopColor: 'transparent' }}></div>
                Generating...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Download PDF
              </>
            )}
          </button>
        </div>

        {/* Report Info Cards */}
        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <div className="p-4 rounded-lg" style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}` }}>
            <div className="text-sm mb-1" style={{ color: colors.textSecondary }}>Checklist Name</div>
            <div className="font-semibold" style={{ color: colors.textPrimary }}>{report.checklist_name}</div>
            <div className="text-xs mt-1" style={{ color: colors.textTertiary }}>Version {report.checklist_version}</div>
          </div>
          <div className="p-4 rounded-lg" style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}` }}>
            <div className="text-sm mb-1" style={{ color: colors.textSecondary }}>Device Type</div>
            <div className="font-semibold" style={{ color: colors.textPrimary }}>{report.device_type}</div>
          </div>
          <div className="p-4 rounded-lg" style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}` }}>
            <div className="text-sm mb-1" style={{ color: colors.textSecondary }}>Status</div>
            <span className="inline-block px-3 py-1 rounded text-sm font-medium" style={{
              backgroundColor: report.status === 'completed' ? colors.success + '33' :
                report.status === 'pending' ? colors.warning + '33' :
                report.status === 'revised' ? colors.info + '33' :
                colors.textTertiary + '33',
              color: report.status === 'completed' ? colors.success :
                report.status === 'pending' ? colors.warning :
                report.status === 'revised' ? colors.info :
                colors.textTertiary
            }}>
              {report.status}
            </span>
          </div>
        </div>

        {/* Engineer Information */}
        {Object.keys(engineerInfo).length > 0 && (
          <div className="p-6 rounded-lg mb-6" style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}` }}>
            <h2 className="text-xl font-bold mb-4" style={{ color: colors.textPrimary }}>Engineer Information</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {engineerInfo.name && (
                <div>
                  <div className="text-sm" style={{ color: colors.textSecondary }}>Name</div>
                  <div style={{ color: colors.textPrimary }}>{engineerInfo.name}</div>
                </div>
              )}
              {engineerInfo.email && (
                <div>
                  <div className="text-sm" style={{ color: colors.textSecondary }}>Email</div>
                  <div style={{ color: colors.textPrimary }}>{engineerInfo.email}</div>
                </div>
              )}
              {engineerInfo.phone && (
                <div>
                  <div className="text-sm" style={{ color: colors.textSecondary }}>Phone</div>
                  <div style={{ color: colors.textPrimary }}>{engineerInfo.phone}</div>
                </div>
              )}
              {engineerInfo.employee_id && (
                <div>
                  <div className="text-sm" style={{ color: colors.textSecondary }}>Employee ID</div>
                  <div style={{ color: colors.textPrimary }}>{engineerInfo.employee_id}</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Site Information */}
        {Object.keys(siteInfo).length > 0 && (
          <div className="p-6 rounded-lg mb-6" style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}` }}>
            <h2 className="text-xl font-bold mb-4" style={{ color: colors.textPrimary }}>Site Information</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {siteInfo.branch_name && (
                <div>
                  <div className="text-sm" style={{ color: colors.textSecondary }}>Branch Name</div>
                  <div style={{ color: colors.textPrimary }}>{siteInfo.branch_name}</div>
                </div>
              )}
              {siteInfo.survey_date && (
                <div>
                  <div className="text-sm" style={{ color: colors.textSecondary }}>Survey Date</div>
                  <div style={{ color: colors.textPrimary }}>{new Date(siteInfo.survey_date).toLocaleString()}</div>
                </div>
              )}
              {report.loc_name && (
                <div>
                  <div className="text-sm" style={{ color: colors.textSecondary }}>Location</div>
                  <div style={{ color: colors.textPrimary }}>{report.loc_name}</div>
                </div>
              )}
              {report.loc_address && (
                <div>
                  <div className="text-sm" style={{ color: colors.textSecondary }}>Address</div>
                  <div style={{ color: colors.textPrimary }}>{report.loc_address}</div>
                </div>
              )}
              {report.loc_contact_person && (
                <div>
                  <div className="text-sm" style={{ color: colors.textSecondary }}>Contact Person</div>
                  <div style={{ color: colors.textPrimary }}>{report.loc_contact_person}</div>
                </div>
              )}
              {report.loc_contact_mobile && (
                <div>
                  <div className="text-sm" style={{ color: colors.textSecondary }}>Contact Mobile</div>
                  <div style={{ color: colors.textPrimary }}>{report.loc_contact_mobile}</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Device Information */}
        {Object.keys(deviceInfo).length > 0 && (
          <div className="p-6 rounded-lg mb-6" style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}` }}>
            <h2 className="text-xl font-bold mb-4" style={{ color: colors.textPrimary }}>Device Information</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {Object.entries(deviceInfo).map(([key, value]) => renderField(key, value))}
            </div>
          </div>
        )}

        {/* Device Summary */}
        {Object.keys(deviceSummary).length > 0 && (
          <div className="p-6 rounded-lg mb-6" style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}` }}>
            <h2 className="text-xl font-bold mb-4" style={{ color: colors.textPrimary }}>Device Summary</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {Object.entries(deviceSummary).map(([device, count]) => (
                <div key={device} className="p-4 rounded-lg text-center" style={{ backgroundColor: colors.card, border: `1px solid ${colors.border}` }}>
                  <div className="text-2xl font-bold mb-1" style={{ color: colors.textPrimary }}>{count}</div>
                  <div className="text-sm" style={{ color: colors.textSecondary }}>{device}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Lights */}
        {lights.length > 0 && (
          <div className="p-6 rounded-lg mb-6" style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}` }}>
            <h2 className="text-xl font-bold mb-4" style={{ color: colors.textPrimary }}>Lights ({lights.length})</h2>
            <div className="space-y-4">
              {lights.map((light, index) => (
                <div key={index} className="p-4 rounded-lg" style={{ backgroundColor: colors.card, border: `1px solid ${colors.border}` }}>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <div className="text-sm" style={{ color: colors.textSecondary }}>Light Type</div>
                      <div className="font-medium" style={{ color: colors.textPrimary }}>{light.light_type}</div>
                    </div>
                    <div>
                      <div className="text-sm" style={{ color: colors.textSecondary }}>Device</div>
                      <div style={{ color: colors.textPrimary }}>{light.device}</div>
                    </div>
                    <div>
                      <div className="text-sm" style={{ color: colors.textSecondary }}>Quantity</div>
                      <div style={{ color: colors.textPrimary }}>{light.light_qty}</div>
                    </div>
                    <div>
                      <div className="text-sm" style={{ color: colors.textSecondary }}>Installation Area</div>
                      <div style={{ color: colors.textPrimary }}>{light.installation_area}</div>
                    </div>
                    <div>
                      <div className="text-sm" style={{ color: colors.textSecondary }}>Impact Area</div>
                      <div style={{ color: colors.textPrimary }}>{light.impact_area}</div>
                    </div>
                    <div>
                      <div className="text-sm" style={{ color: colors.textSecondary }}>Communication</div>
                      <div style={{ color: colors.textPrimary }}>{light.communication}</div>
                    </div>
                    {light.make && light.make !== 'NA' && (
                      <div>
                        <div className="text-sm" style={{ color: colors.textSecondary }}>Make</div>
                        <div style={{ color: colors.textPrimary }}>{light.make}</div>
                      </div>
                    )}
                    {light.capacity && light.capacity !== 'NA' && (
                      <div>
                        <div className="text-sm" style={{ color: colors.textSecondary }}>Capacity</div>
                        <div style={{ color: colors.textPrimary }}>{light.capacity}</div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Meters */}
        {meters.length > 0 && (
          <div className="p-6 rounded-lg mb-6" style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}` }}>
            <h2 className="text-xl font-bold mb-4" style={{ color: colors.textPrimary }}>Meters ({meters.length})</h2>
            <div className="space-y-4">
              {meters.map((meter, index) => (
                <div key={index} className="p-4 rounded-lg" style={{ backgroundColor: colors.card, border: `1px solid ${colors.border}` }}>
                  <div className="grid md:grid-cols-3 gap-4">
                    {Object.entries(meter).map(([key, value]) => renderField(key, value))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AC Units */}
        {acUnits.length > 0 && (
          <div className="p-6 rounded-lg mb-6" style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}` }}>
            <h2 className="text-xl font-bold mb-4" style={{ color: colors.textPrimary }}>AC Units ({acUnits.length})</h2>
            <div className="space-y-4">
              {acUnits.map((ac, index) => (
                <div key={index} className="p-4 rounded-lg" style={{ backgroundColor: colors.card, border: `1px solid ${colors.border}` }}>
                  <div className="grid md:grid-cols-3 gap-4">
                    {Object.entries(ac).map(([key, value]) => renderField(key, value))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Motion Sensors */}
        {motionSensors.length > 0 && (
          <div className="p-6 rounded-lg mb-6" style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}` }}>
            <h2 className="text-xl font-bold mb-4" style={{ color: colors.textPrimary }}>Motion Sensors ({motionSensors.length})</h2>
            <div className="space-y-4">
              {motionSensors.map((sensor, index) => (
                <div key={index} className="p-4 rounded-lg" style={{ backgroundColor: colors.card, border: `1px solid ${colors.border}` }}>
                  <div className="grid md:grid-cols-3 gap-4">
                    {Object.entries(sensor).map(([key, value]) => renderField(key, value))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Checklist Items */}
        {checklistItems.length > 0 && (
          <div className="p-6 rounded-lg mb-6" style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}` }}>
            <h2 className="text-xl font-bold mb-4" style={{ color: colors.textPrimary }}>Checklist Items</h2>
            <div className="space-y-3">
              {checklistItems.map((item, index) => (
                <div key={index} className="p-4 rounded" style={{ backgroundColor: colors.card, border: `1px solid ${colors.border}` }}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-medium" style={{ color: colors.textPrimary }}>{item.item || item.question}</div>
                      {item.description && (
                        <div className="text-sm mt-1" style={{ color: colors.textSecondary }}>{item.description}</div>
                      )}
                    </div>
                    <div className="ml-4">
                      <span className="px-3 py-1 rounded text-xs font-medium" style={{
                        backgroundColor: (item.status === 'pass' || item.checked) ? colors.success + '33' :
                          (item.status === 'fail' || !item.checked) ? colors.error + '33' :
                          colors.textTertiary + '33',
                        color: (item.status === 'pass' || item.checked) ? colors.success :
                          (item.status === 'fail' || !item.checked) ? colors.error :
                          colors.textTertiary
                      }}>
                        {item.status || (item.checked ? 'Pass' : 'Fail')}
                      </span>
                    </div>
                  </div>
                  {item.notes && (
                    <div className="text-sm mt-2 pt-2" style={{ color: colors.textSecondary, borderTop: `1px solid ${colors.border}` }}>
                      <strong>Notes:</strong> {item.notes}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Observations */}
        {observations && (
          <div className="p-6 rounded-lg mb-6" style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}` }}>
            <h2 className="text-xl font-bold mb-4" style={{ color: colors.textPrimary }}>Observations</h2>
            <div className="whitespace-pre-wrap" style={{ color: colors.textSecondary }}>{observations}</div>
          </div>
        )}

        {/* Recommendations */}
        {recommendations && (
          <div className="p-6 rounded-lg mb-6" style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}` }}>
            <h2 className="text-xl font-bold mb-4" style={{ color: colors.textPrimary }}>Recommendations</h2>
            <div className="whitespace-pre-wrap" style={{ color: colors.textSecondary }}>{recommendations}</div>
          </div>
        )}

        {/* Photos */}
        {photos.length > 0 && (
          <div className="p-6 rounded-lg mb-6" style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}` }}>
            <h2 className="text-xl font-bold mb-4" style={{ color: colors.textPrimary }}>Photos</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {photos.map((photo, index) => (
                <div key={index} className="relative group">
                  <img
                    src={photo.url || photo}
                    alt={photo.caption || `Photo ${index + 1}`}
                    className="w-full h-48 object-cover rounded-lg"
                    style={{ border: `1px solid ${colors.border}` }}
                  />
                  {photo.caption && (
                    <div className="text-sm mt-2" style={{ color: colors.textSecondary }}>{photo.caption}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Report Metadata */}
        <div className="p-6 rounded-lg" style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}` }}>
          <h2 className="text-xl font-bold mb-4" style={{ color: colors.textPrimary }}>Report Details</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <div className="text-sm" style={{ color: colors.textSecondary }}>Created By</div>
              <div style={{ color: colors.textPrimary }}>{report.created_by_full_name || report.created_by_name || 'N/A'}</div>
              {report.created_by_email && (
                <div className="text-xs mt-1" style={{ color: colors.textTertiary }}>{report.created_by_email}</div>
              )}
            </div>
            <div>
              <div className="text-sm" style={{ color: colors.textSecondary }}>Created At</div>
              <div style={{ color: colors.textPrimary }}>{new Date(report.created_at).toLocaleString()}</div>
            </div>
            <div>
              <div className="text-sm" style={{ color: colors.textSecondary }}>Organization</div>
              <div style={{ color: colors.textPrimary }}>{report.org_name || 'N/A'}</div>
              {report.org_contact_person && (
                <div className="text-xs mt-1" style={{ color: colors.textTertiary }}>{report.org_contact_person}</div>
              )}
            </div>
            <div>
              <div className="text-sm" style={{ color: colors.textSecondary }}>Organization Contact</div>
              <div style={{ color: colors.textPrimary }}>{report.org_contact_email || 'N/A'}</div>
              {report.org_contact_mobile && (
                <div className="text-xs mt-1" style={{ color: colors.textTertiary }}>{report.org_contact_mobile}</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChecklistReportDetail;
