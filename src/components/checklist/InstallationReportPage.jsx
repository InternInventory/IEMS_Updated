import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import moment from "moment";
import { Cpu, ArrowLeft, Download, Printer } from "lucide-react";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const InstallationReportPage = () => {
  const { reportId } = useParams();
  const navigate = useNavigate();
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [pdfProgress, setPdfProgress] = useState('');

  const getAuthToken = () =>
    sessionStorage.getItem("token") || localStorage.getItem("token");

  useEffect(() => {
    const fetchInstallationReport = async () => {
      setLoading(true);
      setError(null);

      try {
        const token = getAuthToken();
        if (!token) {
          throw new Error("No authentication token found");
        }

        const apiURL = import.meta.env.VITE_API_BASE_URL;
        const endpoint = `${apiURL}/api/device-checklist-report/${reportId}`;
        
        console.log("Fetching installation report from:", endpoint);
        
        const response = await fetch(endpoint, {
          headers: {
            Authorization: token,
            "Content-Type": "application/json",
          },
        });

        console.log("Response status:", response.status);

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error("Installation report not found");
          }
          throw new Error(
            `Failed to fetch installation report: ${response.status}`
          );
        }

        const result = await response.json();
        console.log("Installation Report Response:", result);

        if (result.success && result.data) {
          // Store the entire data object which includes both checklist_data and metadata
          setReportData(result.data);
        } else {
          throw new Error("No data received from server");
        }
      } catch (e) {
        console.error("Error fetching installation report:", e);
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };

    if (reportId) {
      fetchInstallationReport();
    }
  }, [reportId]);

  const InfoCard = ({ title, children }) => (
    <div className="bg-[#1E293B] rounded-lg p-4">
      <h4 className="text-sm font-semibold text-blue-400 mb-3 border-b border-gray-700 pb-2">
        {title}
      </h4>
      <div className="space-y-2">{children}</div>
    </div>
  );

  const InfoRow = ({ label, value }) => (
    <div className="flex justify-between text-sm">
      <span className="text-gray-400">{label}:</span>
      <span className="text-white font-medium text-right ml-4">{value || "N/A"}</span>
    </div>
  );

  const StatusBadge = ({ status }) => {
    const isPositive = [
      "Yes",
      "Pass",
      "Good",
      "Proper",
      "Working",
      "Adequate",
    ].includes(status);
    return (
      <span
        className={`px-2 py-1 rounded text-xs font-semibold ${
          isPositive
            ? "bg-green-500/20 text-green-400"
            : "bg-yellow-500/20 text-yellow-400"
        }`}
      >
        {status || "N/A"}
      </span>
    );
  };

  const handlePrint = () => {
    window.print();
  };

  // Helper function to load image and convert to data URL - CORS-proof method
  const loadImageAsDataUrl = async (url) => {
    try {
      console.log('🔄 Loading image:', url);
      
      // Method 1: Fetch as blob, create object URL (bypasses CORS for canvas)
      try {
        console.log('🔄 Fetching image as blob...');
        const response = await fetch(url, { 
          mode: 'cors',
          credentials: 'omit'
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        
        const blob = await response.blob();
        console.log('✅ Blob received, size:', blob.size, 'type:', blob.type);
        
        // Create object URL from blob (this bypasses CORS restrictions)
        const objectUrl = URL.createObjectURL(blob);
        console.log('✅ Object URL created:', objectUrl);
        
        // Load image from object URL
        return await new Promise((resolve, reject) => {
          const img = new Image();
          
          img.onload = () => {
            console.log('✅ Image loaded from object URL:', img.width, 'x', img.height);
            
            try {
              // Create canvas and draw image
              const canvas = document.createElement('canvas');
              canvas.width = img.naturalWidth || img.width;
              canvas.height = img.naturalHeight || img.height;
              
              const ctx = canvas.getContext('2d');
              ctx.drawImage(img, 0, 0);
              
              // Convert to data URL
              const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
              console.log('✅ Converted to data URL, length:', dataUrl.length);
              
              // Clean up object URL
              URL.revokeObjectURL(objectUrl);
              resolve(dataUrl);
            } catch (canvasError) {
              console.error('❌ Canvas error:', canvasError);
              URL.revokeObjectURL(objectUrl);
              reject(canvasError);
            }
          };
          
          img.onerror = (error) => {
            console.error('❌ Image load error:', error);
            URL.revokeObjectURL(objectUrl);
            reject(new Error('Failed to load image from object URL'));
          };
          
          // Load from object URL (no CORS issues)
          img.src = objectUrl;
        });
        
      } catch (fetchError) {
        console.warn('⚠️ Blob fetch failed:', fetchError.message);
        
        // Method 2: Try direct load with crossOrigin
        console.log('🔄 Trying direct image load with crossOrigin...');
        return await new Promise((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          
          img.onload = () => {
            console.log('✅ Direct image loaded:', img.width, 'x', img.height);
            try {
              const canvas = document.createElement('canvas');
              canvas.width = img.naturalWidth || img.width;
              canvas.height = img.naturalHeight || img.height;
              const ctx = canvas.getContext('2d');
              ctx.drawImage(img, 0, 0);
              const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
              console.log('✅ Converted to data URL');
              resolve(dataUrl);
            } catch (canvasError) {
              console.error('❌ Canvas tainted by CORS:', canvasError.message);
              reject(new Error('CORS policy prevents image access'));
            }
          };
          
          img.onerror = (error) => {
            console.error('❌ Direct load failed:', error);
            reject(new Error('All image loading methods failed'));
          };
          
          img.src = url;
        });
      }
      
    } catch (error) {
      console.error('❌ Failed to load image:', url, error);
      throw error;
    }
  };

  const handleDownload = async () => {
    if (!reportData) return;
    
    setGeneratingPdf(true);
    setPdfProgress('Initializing PDF...');
    
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const contentWidth = pageWidth - (margin * 2);
      let yPos = margin;

      const checklistData = reportData.checklist_data || {};
      const devices = checklistData.selected_devices || [];

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
      pdf.text('DEVICE INSTALLATION REPORT', pageWidth / 2, yPos + 6.5, { align: 'center' });
      yPos += 10;

      // Subtitle with version
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(80, 80, 80);
      pdf.text(`Version ${reportData.checklist_version} | ${reportData.device_type || 'Installation Report'}`, pageWidth / 2, yPos + 4, { align: 'center' });
      pdf.setTextColor(0, 0, 0);
      yPos += 6;

      yPos += 3;

      // Report Information Section
      setPdfProgress('Adding report information...');
      drawCell(margin, yPos, contentWidth, 7, 'REPORT INFORMATION', { 
        bold: true, 
        fontSize: 10, 
        bgColor: [220, 220, 220],
        align: 'left'
      });
      yPos += 7;

      const labelWidth = 45;
      const valueWidth = contentWidth - labelWidth;
      
      const reportInfo = [
        ['Report ID', reportData.report_id || 'N/A'],
        ['Report Type', reportData.device_type || 'Device Installation'],
        ['Checklist Name', reportData.checklist_name || 'N/A'],
        ['Version', reportData.checklist_version || 'N/A'],
        ['Status', (reportData.status || '').toUpperCase()],
        ['Created Date', moment(reportData.created_at).format('DD/MM/YYYY HH:mm')],
        ['Completion Date', checklistData.installation_completion_date 
          ? moment(checklistData.installation_completion_date).format('DD/MM/YYYY HH:mm') 
          : 'In Progress']
      ];

      reportInfo.forEach(([label, value]) => {
        const rowHeight = 6;
        checkPageBreak(rowHeight);
        drawCell(margin, yPos, labelWidth, rowHeight, label, { bold: true, fontSize: 8 });
        drawCell(margin + labelWidth, yPos, valueWidth, rowHeight, value, { fontSize: 8 });
        yPos += rowHeight;
      });

      yPos += 4;
      checkPageBreak(30);

      // Organization Details Section
      setPdfProgress('Adding organization details...');
      drawCell(margin, yPos, contentWidth, 7, 'ORGANIZATION DETAILS', { 
        bold: true, 
        fontSize: 10, 
        bgColor: [220, 220, 220],
        align: 'left'
      });
      yPos += 7;

      const orgInfo = [
        ['Organization Name', reportData.org_name || 'N/A'],
        ['Contact Person', reportData.org_contact_person || 'N/A'],
        ['Email', reportData.org_contact_email || 'N/A'],
        ['Mobile', reportData.org_contact_mobile || 'N/A']
      ];

      orgInfo.forEach(([label, value]) => {
        const rowHeight = 6;
        checkPageBreak(rowHeight);
        drawCell(margin, yPos, labelWidth, rowHeight, label, { bold: true, fontSize: 8 });
        drawCell(margin + labelWidth, yPos, valueWidth, rowHeight, value, { fontSize: 8 });
        yPos += rowHeight;
      });

      yPos += 4;
      checkPageBreak(30);

      // Location Details Section
      setPdfProgress('Adding location details...');
      drawCell(margin, yPos, contentWidth, 7, 'LOCATION DETAILS', { 
        bold: true, 
        fontSize: 10, 
        bgColor: [220, 220, 220],
        align: 'left'
      });
      yPos += 7;

      const locInfo = [
        ['Location Name', reportData.loc_name || 'N/A'],
        ['Address', reportData.loc_address || 'N/A'],
        ['Contact Person', reportData.loc_contact_person || 'N/A'],
        ['Email', reportData.loc_contact_email || 'N/A'],
        ['Mobile', reportData.loc_contact_mobile || 'N/A']
      ];

      locInfo.forEach(([label, value]) => {
        const rowHeight = label === 'Address' ? 10 : 6;
        checkPageBreak(rowHeight);
        drawCell(margin, yPos, labelWidth, rowHeight, label, { bold: true, fontSize: 8 });
        drawCell(margin + labelWidth, yPos, valueWidth, rowHeight, value, { fontSize: 8 });
        yPos += rowHeight;
      });

      yPos += 4;
      checkPageBreak(30);

      // Installer Information Section
      setPdfProgress('Adding installer information...');
      drawCell(margin, yPos, contentWidth, 7, 'INSTALLER INFORMATION', { 
        bold: true, 
        fontSize: 10, 
        bgColor: [220, 220, 220],
        align: 'left'
      });
      yPos += 7;

      const installerInfo = [
        ['Installer Name', checklistData.installer_name || reportData.created_by_full_name || 'N/A'],
        ['Installer ID', (checklistData.installer_id || reportData.created_by || 'N/A').toString()],
        ['Email', reportData.created_by_email || 'N/A']
      ];

      installerInfo.forEach(([label, value]) => {
        const rowHeight = 6;
        checkPageBreak(rowHeight);
        drawCell(margin, yPos, labelWidth, rowHeight, label, { bold: true, fontSize: 8 });
        drawCell(margin + labelWidth, yPos, valueWidth, rowHeight, value, { fontSize: 8 });
        yPos += rowHeight;
      });

      yPos += 5;
      checkPageBreak(40);

      // Device Summary Section
      setPdfProgress('Adding device summary...');
      drawCell(margin, yPos, contentWidth, 7, 'DEVICE INSTALLATION SUMMARY', { 
        bold: true, 
        fontSize: 10, 
        bgColor: [220, 220, 220],
        align: 'left'
      });
      yPos += 7;

      // Count devices by type
      const deviceTypeCounts = {};
      devices.forEach(device => {
        const type = device.device_type || 'Unknown';
        deviceTypeCounts[type] = (deviceTypeCounts[type] || 0) + 1;
      });

      // Summary table
      const summaryColWidth = contentWidth / 2;
      drawCell(margin, yPos, summaryColWidth, 7, 'Device Type', { 
        bold: true, 
        fontSize: 9, 
        align: 'center',
        bgColor: [245, 245, 245]
      });
      drawCell(margin + summaryColWidth, yPos, summaryColWidth, 7, 'Quantity', { 
        bold: true, 
        fontSize: 9, 
        align: 'center',
        bgColor: [245, 245, 245]
      });
      yPos += 7;

      Object.entries(deviceTypeCounts).forEach(([type, count]) => {
        checkPageBreak(6);
        drawCell(margin, yPos, summaryColWidth, 6, type.toUpperCase(), { fontSize: 8 });
        drawCell(margin + summaryColWidth, yPos, summaryColWidth, 6, count.toString(), { 
          fontSize: 8, 
          align: 'center' 
        });
        yPos += 6;
      });

      // Total row
      drawCell(margin, yPos, summaryColWidth, 7, 'TOTAL DEVICES', { 
        bold: true, 
        fontSize: 9,
        bgColor: [230, 230, 230]
      });
      drawCell(margin + summaryColWidth, yPos, summaryColWidth, 7, devices.length.toString(), { 
        bold: true,
        fontSize: 9, 
        align: 'center',
        bgColor: [230, 230, 230]
      });
      yPos += 7;

      yPos += 5;
      checkPageBreak(30);

      // Installed Devices Table
      if (devices.length > 0) {
        setPdfProgress('Adding detailed device information...');
        
        // Header row
        drawCell(margin, yPos, contentWidth, 8, 'DETAILED DEVICE INFORMATION', { 
          bold: true, 
          fontSize: 10, 
          bgColor: [220, 220, 220],
          align: 'left'
        });
        yPos += 8;

        // Table headers
        const headers = ['S.No', 'Device Name', 'Type', 'Device ID', 'Impact Area', 'SSID'];
        const colWidths = [12, 35, 22, 35, 32, contentWidth - 136];
        let xPos = margin;

        headers.forEach((header, i) => {
          drawCell(xPos, yPos, colWidths[i], 8, header, { 
            bold: true, 
            fontSize: 7, 
            align: 'center',
            bgColor: [240, 240, 240]
          });
          xPos += colWidths[i];
        });
        yPos += 8;

        // Device data rows
        devices.forEach((device, index) => {
          checkPageBreak(10);
          xPos = margin;
          const rowData = [
            (index + 1).toString(),
            device.device_name || 'N/A',
            device.device_type || 'N/A',
            device.did || device.config_did || 'N/A',
            device.impact_area || 'N/A',
            device.ssid || 'N/A'
          ];

          rowData.forEach((data, i) => {
            drawCell(xPos, yPos, colWidths[i], 10, data, { 
              fontSize: 7, 
              align: i === 0 ? 'center' : 'left',
              padding: 1.5
            });
            xPos += colWidths[i];
          });
          yPos += 10;

          // Add additional device details in a sub-row if available
          if (device.installed_on || device.schedule) {
            checkPageBreak(8);
            const additionalInfo = [];
            if (device.installed_on) {
              additionalInfo.push(`Installed: ${moment(device.installed_on).format('DD/MM/YYYY')}`);
            }
            if (device.device_model) {
              additionalInfo.push(`Model: ${device.device_model}`);
            }
            
            if (additionalInfo.length > 0) {
              pdf.setFontSize(6);
              pdf.setFont('helvetica', 'italic');
              pdf.setTextColor(80, 80, 80);
              pdf.text(additionalInfo.join(' | '), margin + 15, yPos - 2);
              pdf.setTextColor(0, 0, 0);
            }
          }
        });

        yPos += 5;
      }

      // Device Schedule Information (if available)
      const devicesWithSchedule = devices.filter(d => d.schedule);
      if (devicesWithSchedule.length > 0) {
        checkPageBreak(30);
        setPdfProgress('Adding device schedule information...');
        
        drawCell(margin, yPos, contentWidth, 7, 'DEVICE SCHEDULE CONFIGURATION', { 
          bold: true, 
          fontSize: 10, 
          bgColor: [220, 220, 220],
          align: 'left'
        });
        yPos += 7;

        devicesWithSchedule.forEach((device, idx) => {
          checkPageBreak(25);
          
          // Device header
          pdf.setFillColor(245, 245, 245);
          pdf.rect(margin, yPos, contentWidth, 6, 'F');
          pdf.setFontSize(8);
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(0, 0, 0);
          pdf.text(`${device.device_name} (${device.did || device.config_did})`, margin + 2, yPos + 4);
          yPos += 6;

          // Schedule details
          pdf.setFontSize(7);
          pdf.setFont('helvetica', 'normal');
          const scheduleText = device.schedule || 'No schedule configured';
          const scheduleLines = pdf.splitTextToSize(scheduleText, contentWidth - 4);
          
          scheduleLines.forEach(line => {
            checkPageBreak(4);
            pdf.text(line, margin + 2, yPos + 3);
            yPos += 4;
          });
          
          yPos += 2;
        });

        yPos += 5;
      }

      // Add device images if available
      const allImages = [];
      devices.forEach((device, idx) => {
        if (device.images && device.images.length > 0) {
          device.images.forEach(img => {
            allImages.push({
              url: img,
              deviceName: device.device_name,
              deviceId: device.did || device.config_did
            });
          });
        }
      });

      if (allImages.length > 0) {
        setPdfProgress(`Processing ${allImages.length} installation images...`);
        checkPageBreak(20);
        yPos += 5;
        
        // Section title
        pdf.setFillColor(220, 220, 220);
        pdf.rect(margin, yPos, contentWidth, 8, 'F');
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(0, 0, 0);
        pdf.text(`Installation Images (${allImages.length})`, margin + 3, yPos + 5.5);
        yPos += 10;
        
        // Add images in a grid (2 per row)
        const imgWidth = (contentWidth - 5) / 2;
        const imgHeight = 60;
        let xOffset = 0;
        
        for (let i = 0; i < allImages.length; i++) {
          const imgData = allImages[i];
          
          console.log(`📥 Loading image ${i + 1}/${allImages.length}:`, imgData.url);
          setPdfProgress(`Loading image ${i + 1}/${allImages.length}...`);
          
          try {
            // Fetch image as data URL (handles CORS better)
            const imgDataUrl = await loadImageAsDataUrl(imgData.url);
            
            // Create image element from data URL to get dimensions
            const img = await new Promise((resolve, reject) => {
              const image = new Image();
              image.onload = () => resolve(image);
              image.onerror = reject;
              image.src = imgDataUrl;
            });
            
            console.log(`✅ Image ${i + 1} loaded, dimensions: ${img.width}x${img.height}`);
            
            // Check if we need a new row
            if (xOffset >= contentWidth) {
              xOffset = 0;
              yPos += imgHeight + 10;
              checkPageBreak(imgHeight + 10);
            }
            
            // Check if we need a new page
            if (yPos + imgHeight + 10 > pageHeight - margin - 10) {
              pdf.addPage();
              yPos = margin;
              xOffset = 0;
            }
            
            const xPos = margin + xOffset;
            
            // Draw border
            pdf.setDrawColor(200, 200, 200);
            pdf.setLineWidth(0.5);
            pdf.rect(xPos, yPos, imgWidth, imgHeight + 8);
            
            // Add device label
            pdf.setFontSize(7);
            pdf.setFont('helvetica', 'normal');
            pdf.setTextColor(60, 60, 60);
            const labelText = `${imgData.deviceName} (${imgData.deviceId})`;
            const truncatedLabel = labelText.length > 30 ? labelText.substring(0, 27) + '...' : labelText;
            pdf.text(truncatedLabel, xPos + 2, yPos + 4);
            
            // Calculate dimensions to fit in box while maintaining aspect ratio
            const aspectRatio = img.width / img.height;
            let drawWidth = imgWidth - 2;
            let drawHeight = imgHeight - 2;
            
            if (aspectRatio > drawWidth / drawHeight) {
              drawHeight = drawWidth / aspectRatio;
            } else {
              drawWidth = drawHeight * aspectRatio;
            }
            
            const xCenter = xPos + (imgWidth - drawWidth) / 2;
            const yCenter = yPos + 5 + (imgHeight - drawHeight) / 2;
            
            // Add image to PDF
            pdf.addImage(imgDataUrl, 'JPEG', xCenter, yCenter, drawWidth, drawHeight);
            
            xOffset += imgWidth + 5;
            
            console.log(`✅ Image ${i + 1} added to PDF`);
          } catch (error) {
            console.error(`❌ Failed to add image ${i + 1}:`, error);
            // Continue with next image even if this one fails
          }
        }
        
        yPos += imgHeight + 10;
      }

      // Notes and Remarks Section
      checkPageBreak(30);
      setPdfProgress('Finalizing report...');
      
      drawCell(margin, yPos, contentWidth, 7, 'NOTES & REMARKS', { 
        bold: true, 
        fontSize: 10, 
        bgColor: [220, 220, 220],
        align: 'left'
      });
      yPos += 7;

      const notesText = checklistData.notes || checklistData.remarks || 
                       'All devices have been installed successfully and are operational. ' +
                       'Installation was completed as per standard procedures. ' +
                       'All safety guidelines were followed during the installation process.';
      
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(0, 0, 0);
      const notesLines = pdf.splitTextToSize(notesText, contentWidth - 4);
      
      notesLines.forEach(line => {
        checkPageBreak(5);
        pdf.text(line, margin + 2, yPos + 4);
        yPos += 5;
      });

      yPos += 8;

      // Signature Section
      checkPageBreak(35);
      const sigWidth = contentWidth / 2 - 5;
      
      // Installer Signature
      drawCell(margin, yPos, sigWidth, 20, '', { borderColor: [150, 150, 150] });
      pdf.setFontSize(7);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(80, 80, 80);
      pdf.text('Installer Signature', margin + 2, yPos + 17);
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(0, 0, 0);
      pdf.text(checklistData.installer_name || reportData.created_by_full_name || '', margin + 2, yPos + 4);
      
      // Client/Authorized Person Signature
      drawCell(margin + sigWidth + 10, yPos, sigWidth, 20, '', { borderColor: [150, 150, 150] });
      pdf.setFontSize(7);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(80, 80, 80);
      pdf.text('Client/Authorized Person', margin + sigWidth + 12, yPos + 17);
      
      yPos += 25;

      // Footer
      checkPageBreak(20);
      
      // Page numbers
      const pageCount = pdf.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        pdf.setFontSize(7);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(120, 120, 120);
        pdf.text(
          `Page ${i} of ${pageCount}`,
          pageWidth - margin - 20,
          pageHeight - 5
        );
      }
      
      // Set to last page for final footer
      pdf.setPage(pageCount);
      yPos = pageHeight - margin - 15;
      
      // Separator line
      pdf.setDrawColor(200, 200, 200);
      pdf.setLineWidth(0.3);
      pdf.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 3;
      
      // Footer text
      pdf.setFontSize(7);
      pdf.setFont('helvetica', 'italic');
      pdf.setTextColor(100, 100, 100);
      pdf.text(
        'This is an official device installation report generated by BuildINT i-EMS System',
        pageWidth / 2,
        yPos + 2,
        { align: 'center' }
      );
      pdf.text(
        `Generated on: ${moment().format('DD MMM YYYY, hh:mm A')} | Report ID: ${reportData.report_id}`,
        pageWidth / 2,
        yPos + 6,
        { align: 'center' }
      );

      // Save the PDF
      setPdfProgress('Saving PDF...');
      const fileName = `Installation_Report_${reportData.report_id}_${moment().format('YYYYMMDD_HHmmss')}.pdf`;
      pdf.save(fileName);
      
      console.log('✅ PDF generated successfully:', fileName);
      setPdfProgress('');
      setGeneratingPdf(false);
      
    } catch (error) {
      console.error('❌ Error generating PDF:', error);
      alert('Failed to generate PDF: ' + error.message);
      setPdfProgress('');
      setGeneratingPdf(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B1120] p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-[#0F172B] rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <p className="text-gray-400">Loading installation report...</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0B1120] p-6">
        <div className="max-w-7xl mx-auto">
          <button
            onClick={() => navigate(-1)}
            className="mb-6 flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>
          <div className="bg-[#0F172B] rounded-xl p-6 shadow-lg">
            <div className="text-center py-20">
              <div className="text-red-400 mb-4">
                <svg
                  className="w-16 h-16 mx-auto"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-red-400 mb-2">
                Error Loading Report
              </h3>
              <p className="text-gray-400">{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!reportData) {
    return (
      <div className="min-h-screen bg-[#0B1120] p-6">
        <div className="max-w-7xl mx-auto">
          <button
            onClick={() => navigate(-1)}
            className="mb-6 flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>
          <div className="bg-[#0F172B] rounded-xl p-6 shadow-lg">
            <div className="text-center py-20">
              <p className="text-gray-400">No installation report available</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B1120] p-6 text-white">
      {/* PDF Generation Progress Overlay */}
      {generatingPdf && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-[#1E293B] p-8 rounded-xl shadow-2xl max-w-md w-full mx-4">
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
              <h3 className="text-xl font-semibold text-white mb-2">Generating PDF Report</h3>
              <p className="text-gray-400 mb-4">{pdfProgress || 'Please wait...'}</p>
              <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
                <div className="bg-blue-500 h-full animate-pulse" style={{ width: '70%' }}></div>
              </div>
              <p className="text-sm text-gray-500 mt-4">This may take a moment for reports with many images</p>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        {/* Header Actions */}
        <div className="flex justify-between items-center mb-6 print:hidden">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>
          <div className="flex gap-3">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              <Printer className="w-4 h-4" />
              Print
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
            >
              <Download className="w-4 h-4" />
              Download PDF
            </button>
          </div>
        </div>

        {/* Main Report Container */}
        <div className="bg-[#0F172B] rounded-xl p-8 shadow-lg">
          {/* Report Header */}
          <div className="border-b border-gray-700 pb-6 mb-6">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-3xl font-bold mb-2">
                  Device Installation Report
                </h1>
                <p className="text-gray-400">Checklist Version {reportData.checklist_version}</p>
                <p className="text-sm text-gray-500 mt-2">{reportData.checklist_name}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-400">Completion Date</p>
                <p className="text-lg font-semibold">
                  {reportData.checklist_data?.installation_completion_date
                    ? moment(reportData.checklist_data.installation_completion_date).format(
                        "DD MMM YYYY, hh:mm A"
                      )
                    : "N/A"}
                </p>
              </div>
            </div>
          </div>

          {/* Organization & Location Information */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Organization & Location Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InfoCard title="Organization Information">
                <InfoRow label="Organization" value={reportData.org_name} />
                <InfoRow label="Contact Person" value={reportData.org_contact_person} />
                <InfoRow label="Email" value={reportData.org_contact_email} />
                <InfoRow label="Mobile" value={reportData.org_contact_mobile} />
              </InfoCard>
              <InfoCard title="Location Information">
                <InfoRow label="Location" value={reportData.loc_name} />
                <InfoRow label="Address" value={reportData.loc_address} />
                <InfoRow label="Contact Person" value={reportData.loc_contact_person} />
                <InfoRow label="Email" value={reportData.loc_contact_email} />
                <InfoRow label="Mobile" value={reportData.loc_contact_mobile} />
              </InfoCard>
            </div>
          </div>

          {/* Installer Information */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Installer Information</h2>
            <div className="bg-[#1E293B] rounded-lg p-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-2xl">
                    {reportData.checklist_data?.installer_name?.charAt(0) || reportData.created_by_name?.charAt(0) || "I"}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Installed By</p>
                  <p className="text-2xl font-semibold">
                    {reportData.checklist_data?.installer_name || reportData.created_by_full_name}
                  </p>
                  <p className="text-sm text-gray-500">
                    ID: {reportData.checklist_data?.installer_id || reportData.created_by}
                  </p>
                  {reportData.created_by_email && (
                    <p className="text-sm text-gray-500">
                      Email: {reportData.created_by_email}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-2">
                    Created: {moment(reportData.created_at).format("DD MMM YYYY, hh:mm A")}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Installed Devices */}
          {reportData.checklist_data?.selected_devices &&
            reportData.checklist_data.selected_devices.length > 0 && (
              <div className="mb-8">
                <h2 className="text-xl font-semibold mb-4">Installed Devices ({reportData.checklist_data.selected_devices.length})</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {reportData.checklist_data.selected_devices.map((device, idx) => (
                    <div key={idx} className="bg-[#1E293B] rounded-lg p-4">
                      <div className="flex items-start gap-3 mb-3">
                        <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
                          <Cpu className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h5 className="font-semibold text-lg truncate">
                            {device.device_name}
                          </h5>
                          <p className="text-sm text-gray-400">
                            {device.device_type}
                          </p>
                        </div>
                      </div>
                      <div className="space-y-2 text-sm">
                        <InfoRow label="Device ID" value={device.did || device.config_did} />
                        <InfoRow label="Impact Area" value={device.impact_area} />
                        {device.device_model && <InfoRow label="Model" value={device.device_model} />}
                        {device.ssid && <InfoRow label="SSID" value={device.ssid} />}
                        {device.mac_id && <InfoRow label="MAC ID" value={device.mac_id} />}
                        {device.installed_on && (
                          <InfoRow
                            label="Installed On"
                            value={moment(device.installed_on).format(
                              "DD MMM YYYY"
                            )}
                          />
                        )}
                        {device.schedule && (
                          <div className="mt-2 pt-2 border-t border-gray-700">
                            <p className="text-xs text-gray-400 mb-1">Schedule:</p>
                            <p className="text-xs text-gray-300 break-words">
                              {device.schedule}
                            </p>
                          </div>
                        )}
                      </div>
                      {device.images && device.images.length > 0 && (
                        <div className="mt-4">
                          <p className="text-xs text-gray-400 mb-2">
                            Installation Images:
                          </p>
                          <div className="grid grid-cols-3 gap-2">
                            {device.images.map((img, imgIdx) => (
                              <a
                                key={imgIdx}
                                href={img}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="aspect-square bg-gray-700 rounded overflow-hidden hover:opacity-80 transition-opacity"
                              >
                                <img
                                  src={img}
                                  alt={`Device ${imgIdx + 1}`}
                                  className="w-full h-full object-cover"
                                />
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

          {/* Report Status */}
          <div className="mb-8">
            <div className="bg-[#1E293B] rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Report Status</p>
                  <p className="text-lg font-semibold capitalize">{reportData.status}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-400">Report ID</p>
                  <p className="text-lg font-semibold">{reportData.report_id}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-700 pt-6 mt-6 text-center text-gray-400 text-sm">
            <p>
              This is an official installation report generated on{" "}
              {moment().format("DD MMM YYYY, hh:mm A")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InstallationReportPage;
