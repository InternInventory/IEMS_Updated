import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUpload, faChevronDown } from "@fortawesome/free-solid-svg-icons";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { useTheme } from "../../context/ThemeContext";

// Normalize CH code tokens to canonical form: CH{n}_P{m}_{r|y|b} with lowercase phase letter
const normalizeCode = (token) => {
  if (!token && token !== '') return token;
  const s = String(token).trim();
  const m = s.match(/^CH(\d+)_P(\d+)_([A-Za-z])$/i);
  if (m) return `CH${m[1]}_P${m[2]}_${m[3].toLowerCase()}`;
  return s;
};

// ---------------- Phase Combination Builder ----------------
const PhaseCombinationBuilder = ({ phaseNames, phaseType, onCombinedChange, initialCombined }) => {
  const { isDark } = useTheme();
  const isDarkMode = isDark;
  
  const [availablePhases, setAvailablePhases] = useState([]);
  const [selectedPhase, setSelectedPhase] = useState("");
  const [operation, setOperation] = useState("");
  const [combinedElements, setCombinedElements] = useState([]);

  useEffect(() => {
    // Build an array of available phases with a generated code used in payloads.
    // Code format: CH{n}_P{idx}_{R|Y|B}  e.g. CH1_P1_R or CH1_P3_R when channel is three-phase
    const allPhases = [];
    Object.keys(phaseNames).forEach((ch) => {
      const channelPhases = phaseNames[ch];
      Object.keys(channelPhases).forEach((p) => {
        const phaseName = channelPhases[p]?.trim();
        if (phaseName) {
          // Determine P index from channel's phaseType: if channel is three-phase use P3, otherwise P1
          const isThreePhase = phaseType && String(phaseType[ch]) === "3";
          const idx = isThreePhase ? 3 : 1;
          const chUpper = ch.toUpperCase(); // e.g., CH1
          const pLower = p.toLowerCase(); // r/y/b (use lowercase for payload)
          const code = `${chUpper}_P${idx}_${pLower}`;

          allPhases.push({
            key: `${chUpper}_${pLower}`,
            code,
            displayName: `${phaseName} (${code})`,
            name: phaseName,
            channel: ch,
            phase: p
          });
        }
      });
    });
    setAvailablePhases(allPhases);
  }, [phaseNames, phaseType]);

  useEffect(() => {
    // Build combined string using the phase codes and operators. Example:
    // CH1_P1_R + CH2_P1_Y - CH3_P1_R
    const combinedText = combinedElements.map(element => {
      if (element.type === 'operation') return element.value;
      if (element.type === 'phase') return element.code || element.value;
      return element.value;
    }).join(' ');
    if (onCombinedChange) onCombinedChange(combinedText);
  }, [combinedElements, onCombinedChange]);

  // If an initial combined string is provided (from existing device data), parse it
  // into combinedElements so the visual builder shows the chips on edit.
  useEffect(() => {
    if (!initialCombined) return;
    if (combinedElements.length > 0) return; // don't overwrite if user already edited

    // Split keeping '+' and '-' as separate tokens
    const parts = initialCombined.split(/(\s*\+\s*|\s*\-\s*)/).map(p => p.trim()).filter(p => p !== '');
    if (parts.length === 0) return;

    const newElements = [];
    const removedKeys = [];

    for (const part of parts) {
      if (part === '+' || part === '-') {
        newElements.push({ type: 'operation', value: part });
      } else {
        // First try exact match by friendly name to handle incoming display names
        let match = availablePhases.find(ap => ap.name === part);
        // Normalize part for code matching (case-insensitive incoming)
        const normalizedPart = normalizeCode(part);
        // Then try by normalized code for cases where we're loading stored codes
        if (!match) {
          match = availablePhases.find(ap => ap.code === normalizedPart);
        }
        // Finally try by key or displayName
        if (!match) {
          match = availablePhases.find(ap => ap.key === normalizedPart || ap.displayName === part || ap.key === part);
        }
        if (match) {
          newElements.push({ type: 'phase', code: match.code, display: match.name, key: match.key, originalData: match });
          removedKeys.push(match.key);
        } else {
          // fallback: create a phase element without originalData; store raw token as code/value
          newElements.push({ type: 'phase', code: part, display: undefined, originalData: undefined });
        }
      }
    }

    // Remove matched phases from availablePhases
    if (removedKeys.length > 0) {
      setAvailablePhases(prev => prev.filter(p => !removedKeys.includes(p.key)));
    }

    setCombinedElements(newElements);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCombined, availablePhases]);

  const handlePhaseSelect = (e) => {
    const value = e.target.value;
    if (!value) return;
    // value is the generated phase code (e.g. CH1_P1_R)
    const phaseObj = availablePhases.find((p) => p.code === value || p.key === value);
    if (!phaseObj) return;

    // Immediately add phase to combined elements
    const newElements = [...combinedElements];
    
    // If there are existing elements and the last one is a phase, add an operation first
    if (newElements.length > 0 && newElements[newElements.length - 1].type === 'phase') {
      // Auto-select '+' operation when adding consecutive phases
      newElements.push({
        type: 'operation',
        value: '+'
      });
    }
    
    // Add the phase
    newElements.push({
      type: 'phase',
      code: phaseObj.code,
      display: phaseObj.name,
      key: phaseObj.key,
      originalData: phaseObj
    });

    setCombinedElements(newElements);

  // Remove from available phases (match by key)
  setAvailablePhases((prev) => prev.filter((p) => p.key !== phaseObj.key));

    // Reset dropdown
    setSelectedPhase("");
    setOperation("");
  };

  const handleOperationSelect = (e) => {
    const op = e.target.value;
    if (!op) return;

    setOperation(op);

    // If we have elements and the last one is a phase, add the operation
    if (combinedElements.length > 0 && combinedElements[combinedElements.length - 1].type === 'phase') {
      const newElements = [...combinedElements];
      newElements.push({ type: 'operation', value: op });
      setCombinedElements(newElements);
    }

    setTimeout(() => {
      setOperation("");
    }, 300);
  };

  const handleRemoveElement = (index) => {
    const newElements = [...combinedElements];
    const removedElement = newElements[index];
    
    // If removing a phase, add it back to available phases
    if (removedElement.type === 'phase') {
      if (removedElement.originalData) {
        setAvailablePhases((prev) => [...prev, removedElement.originalData]);
      }
    }

    // Remove the element and check if we need to remove adjacent operations
    newElements.splice(index, 1);
    
    // If we removed a phase and there's an operation before it, remove that too
    if (removedElement.type === 'phase' && index > 0 && newElements[index - 1].type === 'operation') {
      newElements.splice(index - 1, 1);
    }
    // If we removed an operation and there's an operation after a phase, it's fine
    else if (removedElement.type === 'operation') {
      // Check if we have consecutive operations and remove the extra one
      for (let i = 0; i < newElements.length - 1; i++) {
        if (newElements[i].type === 'operation' && newElements[i + 1].type === 'operation') {
          newElements.splice(i, 1);
          break;
        }
      }
    }

    setCombinedElements(newElements);
  };

  const handleClearAll = () => {
    // Return all phases to available phases
    const phasesToRestore = combinedElements
      .filter(element => element.type === 'phase')
      .map(element => element.originalData);
    
    setAvailablePhases((prev) => [...prev, ...phasesToRestore]);
    setCombinedElements([]);
    setSelectedPhase("");
    setOperation("");
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
      <div className="mb-4">
        <label className={`block text-sm font-bold mb-2 ${
          isDarkMode ? "text-white" : "text-gray-900"
        }`}>
          Select Phase
        </label>
        <select
          className={`w-full py-2 px-3 rounded-lg border ${
            isDarkMode ? "bg-[#1a253f] text-white border-white" : "bg-white text-gray-900 border-gray-300"
          }`}
          value={selectedPhase}
          onChange={handlePhaseSelect}
          disabled={availablePhases.length === 0}
        >
          <option value="" style={{ backgroundColor: isDarkMode ? "#1a253f" : "#ffffff", color: isDarkMode ? "white" : "#111827" }}>Select a Phase</option>
          {availablePhases.map((p, idx) => (
            <option key={idx} value={p.code} style={{ backgroundColor: isDarkMode ? "#1a253f" : "#ffffff", color: isDarkMode ? "white" : "#111827" }}>
              {p.displayName}
            </option>
          ))}
        </select>
        <p className="text-xs text-gray-400 mt-1">
          Select a phase to add it directly to combination
        </p>
      </div>

      <div className="mb-4">
        <label className={`block text-sm font-bold mb-2 ${
          isDarkMode ? "text-white" : "text-gray-900"
        }`}>
          Add Operation
        </label>
        <select
          className={`w-full py-2 px-3 rounded-lg border ${
            isDarkMode ? "bg-[#1a253f] text-white border-white" : "bg-white text-gray-900 border-gray-300"
          }`}
          value={operation}
          onChange={handleOperationSelect}
          disabled={combinedElements.length === 0 || availablePhases.length === 0}
        >
          <option value="" style={{ backgroundColor: isDarkMode ? "#1a253f" : "#ffffff", color: isDarkMode ? "white" : "#111827" }}>Select + or -</option>
          <option value="+" style={{ backgroundColor: isDarkMode ? "#1a253f" : "#ffffff", color: isDarkMode ? "white" : "#111827" }}>+</option>
          <option value="-" style={{ backgroundColor: isDarkMode ? "#1a253f" : "#ffffff", color: isDarkMode ? "white" : "#111827" }}>-</option>
        </select>
        <p className="text-xs text-gray-400 mt-1">
          Add operation between phases
        </p>
      </div>

      <div className="mb-4 w-full">
        <div className="flex justify-between items-center mb-2">
          <label className={`block text-sm font-bold ${
            isDarkMode ? "text-white" : "text-gray-900"
          }`}>
            Combined Result
          </label>
          <button
            type="button"
            onClick={handleClearAll}
            className="text-xs bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-full shadow"
            disabled={combinedElements.length === 0}
          >
            Clear All
          </button>
        </div>

        <div 
          className={`border rounded-lg w-full py-3 px-4 min-h-[100px] max-h-[150px] overflow-y-auto flex flex-wrap gap-2 items-center ${
            isDarkMode ? "bg-[#1a253f] border-white" : "bg-white border-gray-300"
          }`}
        >
          {combinedElements.length === 0 ? (
            <span className={`italic ${
              isDarkMode ? "text-gray-400" : "text-gray-500"
            }`}>No phases combined yet. Select phases to begin.</span>
          ) : (
            combinedElements.map((element, index) => (
              <div
                key={index}
                className={`flex items-center gap-2 px-3 py-1 rounded-full text-white font-medium ${
                  element.type === 'phase' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-600'
                }`}
              >
                <span>{element.display || element.code || element.value}</span>
                {element.type === 'phase' && (
                  <button
                    type="button"
                    onClick={() => handleRemoveElement(index)}
                    className="text-white hover:text-red-400 font-bold ml-1"
                    title="Remove Phase"
                  >
                    ×
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

// ---------------- Big IO Device Form ----------------
const BigIODeviceForm = () => {
  const { dev_id } = useParams();
  const isEdit = !!dev_id;
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const isDarkMode = isDark;

  const apiURL = import.meta.env.VITE_API_BASE_URL;
  const token = localStorage.getItem("token") || sessionStorage.getItem("token");

  // Form state
  const [deviceName, setDeviceName] = useState("");
  const [deviceId, setDeviceId] = useState(""); // editable only in add
  const [serialNo, setSerialNo] = useState("");
  const [simNo, setSimNo] = useState("");
  const [status, setStatus] = useState("true");
  const [locations, setLocations] = useState([]);
  const [locationId, setLocationId] = useState("");
  const [combinedPhaseResult, setCombinedPhaseResult] = useState("");
  const [initialCombinedRaw, setInitialCombinedRaw] = useState("");

  const [phaseType, setPhaseType] = useState({ ch1: "", ch2: "", ch3: "", ch4: "" });
  const [phaseNames, setPhaseNames] = useState({
    ch1: { r: "", y: "", b: "" },
    ch2: { r: "", y: "", b: "" },
    ch3: { r: "", y: "", b: "" },
    ch4: { r: "", y: "", b: "" },
  });

  const [existingDeviceIds, setExistingDeviceIds] = useState([]);

  // Popup
  const [showPopup, setShowPopup] = useState(false);
  const [popupMessage, setPopupMessage] = useState("");
  const [popupType, setPopupType] = useState("success");

  // Validation errors
  const [deviceNameError, setDeviceNameError] = useState("");
  const [deviceIdError, setDeviceIdError] = useState("");
  const [locationIdError, setLocationIdError] = useState("");

  // ------------------- Fetch Data -------------------
  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const res = await axios.get(`${apiURL}/device-location`, {
          headers: { Authorization: token },
        });
        setLocations(res.data);
      } catch (err) {
        console.error("Error fetching locations:", err);
      }
    };
    fetchLocations();
  }, []);

  useEffect(() => {
    if (!isEdit) {
      const fetchDeviceIds = async () => {
        try {
          const res = await axios.get(`${apiURL}/deviceManagement`, {
            headers: { Authorization: token },
          });
          setExistingDeviceIds(res.data.map(d => d.device_id));
        } catch (err) {
          console.error("Error fetching device IDs:", err);
        }
      };
      fetchDeviceIds();
      return;
    }

    const fetchDevice = async () => {
      try {
        console.log("Fetching BigIO device with dev_id:", dev_id);
        const res = await axios.get(`${apiURL}/getBigIODeviceById/${dev_id}`, {
          headers: { Authorization: token },
        });

        const device = res.data;
        if (!device) throw new Error("Device not found");

        setDeviceName(device.device_name || "");
        setLocationId(device.loc_id || "");
        setDeviceId(device.device_id || "");
        setSerialNo(device.serial_no || "");
        setSimNo(device.sim_no || "");
        setStatus(String(device.is_active ?? true)); // ← Fixed: is_active, not status

        // Parse channel_config if it's a JSON string
        let channelConfig = device.channel_config;
        if (typeof channelConfig === "string") {
          try {
            channelConfig = JSON.parse(channelConfig);
          } catch (e) {
            console.error("Failed to parse channel_config:", e);
            channelConfig = {};
          }
        }

        if (channelConfig && Object.keys(channelConfig).length > 0) {
          const newPhaseType = {};
          const newPhaseNames = {};
          Object.keys(channelConfig).forEach(ch => {
            const chData = channelConfig[ch] || {};
            newPhaseType[ch] = chData.phaseType?.toString() || "";
            const { r = "", y = "", b = "" } = chData;
            newPhaseNames[ch] = { r, y, b };
          });
          setPhaseType(newPhaseType);
          setPhaseNames(newPhaseNames);

          // Build initial combined string from codes to names
          let combined = device.combined_phases || device.channel_calculation || "";
          if (combined) {
            const codeToName = {};
            Object.keys(newPhaseNames).forEach(ch => {
              const chNum = ch.replace('ch', '');
              const isThree = String(newPhaseType[ch]) === "3";
              const idx = isThree ? 3 : 1;
              const names = newPhaseNames[ch];
              if (names.r) codeToName[`CH${chNum}_P${idx}_r`] = names.r;
              if (names.y) codeToName[`CH${chNum}_P${idx}_y`] = names.y;
              if (names.b) codeToName[`CH${chNum}_P${idx}_b`] = names.b;
            });

            combined = combined.split(/(\s*\+\s*|\s*\-\s*)/)
              .map(t => t.trim())
              .filter(Boolean)
              .map(token => {
                if (token === '+' || token === '-') return token;
                const normalized = normalizeCode(token);
                return codeToName[normalized] || token;
              })
              .join(' ');
          }
          setInitialCombinedRaw(combined);
        }

      } catch (err) {
        console.error("Error fetching device:", err);
        setShowPopup(true);
        setPopupType("error");
        setPopupMessage("Failed to fetch device data");
      }
    };
    fetchDevice();
  }, [dev_id, isEdit, apiURL, token]);

  // ------------------- Validation -------------------
  const validateForm = () => {
    let valid = true;
    if (!deviceName.trim()) { setDeviceNameError("Device Name is required"); valid = false; } else setDeviceNameError("");
    if (!isEdit && !deviceId.trim()) { setDeviceIdError("Device ID is required"); valid = false; } else setDeviceIdError("");
    if (!locationId) { setLocationIdError("Location is required"); valid = false; } else setLocationIdError("");
    return valid;
  };

  // ------------------- Submit -------------------
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    if (!isEdit && existingDeviceIds.includes(deviceId.trim())) {
      setDeviceIdError("Device ID already exists");
      return;
    }

    const mergedChannels = {};
    [1, 2, 3, 4].forEach(ch => {
      mergedChannels[`ch${ch}`] = { phaseType: Number(phaseType[`ch${ch}`]), ...phaseNames[`ch${ch}`] };
    });
    // Build a human-readable channel_calculation by joining non-empty R phase names
    const channelCalculation = [1,2,3,4]
      .map(ch => mergedChannels[`ch${ch}`]?.r)
      .filter(name => name && String(name).trim() !== "")
      .join(' + ');

    // Convert any friendly-named combinedPhaseResult into code format (CHx_Py_R/Y/B)
  const nameToCode = {};
    [1, 2, 3, 4].forEach(ch => {
      const chKey = `ch${ch}`;
      const names = phaseNames[chKey] || {};
      const isThreePhase = String(phaseType[chKey]) === "3";
      const idxForChannel = isThreePhase ? 3 : 1;
      Object.keys(names).forEach(p => {
        const nm = names[p]?.trim();
        if (nm) {
          const code = `CH${ch}_P${idxForChannel}_${p.toLowerCase()}`;
          nameToCode[nm] = code;
        }
      });
    });

  const mappedTokens = (combinedPhaseResult || '')
  .split(/(\s*\+\s*|\s*\-\s*)/)
  .map(t => t.trim())
  .filter(t => t !== '')
  .map(token => {
    if (token === '+' || token === '-') return token;

    // If token already looks like a code (CHx_Py_Z), recompute P index from current phaseType
    const codeMatch = token.match(/^CH(\d+)_P\d+_([A-Za-z])$/i);
    if (codeMatch) {
      const chNum = codeMatch[1];
      const phaseLetter = codeMatch[2].toLowerCase(); // ensure lowercase
      const chKey = `ch${chNum}`;
      const isThreePhase = String(phaseType[chKey]) === "3";
      const idxForChannel = isThreePhase ? 3 : 1;
      return `CH${chNum}_P${idxForChannel}_${phaseLetter}`;
    }

    // exact name match (case-sensitive), then try case-insensitive
    if (nameToCode[token]) return nameToCode[token];
    const lowerToken = token.toLowerCase();
    const ciMatchKey = Object.keys(nameToCode).find(k => k.toLowerCase() === lowerToken);
    if (ciMatchKey) return nameToCode[ciMatchKey];

    // try to extract code from display like "Name (CH1_P1_R)"
    const m = token.match(/\((CH\d+_P\d+_[A-Za-z])\)$/i);
    if (m) {
      // recompute using current phaseType as above
      const mm = m[1].match(/^CH(\d+)_P\d+_([A-Za-z])$/i);
      if (mm) {
        const chNum = mm[1];
        const phaseLetter = mm[2].toLowerCase(); // ensure lowercase
        const chKey = `ch${chNum}`;
        const isThreePhase = String(phaseType[chKey]) === "3";
        const idxForChannel = isThreePhase ? 3 : 1;
        return `CH${chNum}_P${idxForChannel}_${phaseLetter}`;
      }
      return normalizeCode(m[1]);
    }

    // fallback: return original token
    return token;
  });

    const combinedForPayload = mappedTokens.join(' ');

    const payload = {
      device: "bigio",
      device_name: deviceName,
      device_id: deviceId,
      serial_no: serialNo,
      sim_no: simNo,
      is_active: status === "true",
      loc_id: locationId,
      channels: mergedChannels,
      combined_phases: combinedForPayload, // Send converted code-format combined phases
      channel_calculation: channelCalculation,
      created_by: 255,
      ...(isEdit ? {} : { device_id: deviceId }),
    };

    console.log("Submitting payload:", payload); // For debugging

    try {
      const url = isEdit ? `${apiURL}/updateBigIODevice/${dev_id}` : `${apiURL}/createDeviceManagement`;
      const method = isEdit ? axios.put : axios.post;
      const res = await method(url, payload, { headers: { "Content-Type": "application/json", Authorization: token } });

      setShowPopup(true);
      setPopupType("success");
      setPopupMessage(res.data.message || (isEdit ? "Device updated successfully!" : "Device created successfully!"));
      setTimeout(() => navigate("/device-list"), 2000);
    } catch (err) {
      console.error("Error submitting device:", err);
      setShowPopup(true);
      setPopupType("error");
      setPopupMessage("Failed to submit device.");
    }
  };

  // ------------------- Render Channels -------------------
  const renderChannel = (ch) => (
    <div key={ch} className="grid grid-cols-1 md:grid-cols-5 gap-4">
      <div className="mb-4 flex items-center justify-center">
        <div className={`w-full flex items-center justify-center py-2 px-3 text-center font-bold ${
          isDarkMode ? "text-white" : "text-gray-900"
        }`}>Channel {ch}</div>
      </div>

      <div className="mb-4">
        <label className={`block text-sm font-bold mb-2 ${
          isDarkMode ? "text-white" : "text-gray-900"
        }`}>Phase Type</label>
        <select 
          value={phaseType[`ch${ch}`]} 
          className={`w-full py-2 px-3 rounded-lg border ${
            isDarkMode ? "bg-[#1a253f] text-white border-white" : "bg-white text-gray-900 border-gray-300"
          }`}
          onChange={e => setPhaseType(prev => ({ ...prev, [`ch${ch}`]: e.target.value }))}
        >
          <option value="" style={{ backgroundColor: isDarkMode ? "#1a253f" : "#ffffff", color: isDarkMode ? "white" : "#111827" }}>Select Phase</option>
          <option value="1" style={{ backgroundColor: isDarkMode ? "#1a253f" : "#ffffff", color: isDarkMode ? "white" : "#111827" }}>Single Phase</option>
          <option value="3" style={{ backgroundColor: isDarkMode ? "#1a253f" : "#ffffff", color: isDarkMode ? "white" : "#111827" }}>Three Phase</option>
        </select>
      </div>

      <div className={`mb-4 ${phaseType[`ch${ch}`] === "3" ? "md:col-span-2" : ""}`}>
        <label className={`block text-sm font-bold mb-2 ${
          isDarkMode ? "text-white" : "text-gray-900"
        }`}>
          {phaseType[`ch${ch}`] === "3" ? "Load Name" : "R Phase Name"}
        </label>
        <input 
          type="text" 
          className={`border rounded w-full py-2 px-3 ${
            isDarkMode ? "bg-transparent text-white border-white" : "bg-white text-gray-900 border-gray-300"
          }`}
          value={phaseNames[`ch${ch}`].r} 
          onChange={e => setPhaseNames(prev => ({ ...prev, [`ch${ch}`]: { ...prev[`ch${ch}`], r: e.target.value } }))} 
        />
      </div>

      {phaseType[`ch${ch}`] !== "3" && (
        <>
          <div className="mb-4">
            <label className={`block text-sm font-bold mb-2 ${
              isDarkMode ? "text-white" : "text-gray-900"
            }`}>Y Phase Name</label>
            <input 
              type="text" 
              className={`border rounded w-full py-2 px-3 ${
                isDarkMode ? "bg-transparent text-white border-white" : "bg-white text-gray-900 border-gray-300"
              }`}
              value={phaseNames[`ch${ch}`].y} 
              onChange={e => setPhaseNames(prev => ({ ...prev, [`ch${ch}`]: { ...prev[`ch${ch}`], y: e.target.value } }))} 
            />
          </div>
          <div className="mb-4">
            <label className={`block text-sm font-bold mb-2 ${
              isDarkMode ? "text-white" : "text-gray-900"
            }`}>B Phase Name</label>
            <input 
              type="text" 
              className={`border rounded w-full py-2 px-3 ${
                isDarkMode ? "bg-transparent text-white border-white" : "bg-white text-gray-900 border-gray-300"
              }`}
              value={phaseNames[`ch${ch}`].b} 
              onChange={e => setPhaseNames(prev => ({ ...prev, [`ch${ch}`]: { ...prev[`ch${ch}`], b: e.target.value } }))} 
            />
          </div>
        </>
      )}
    </div>
  );

  // ------------------- Render -------------------
  return (
    <div className={`flex flex-col items-start justify-start pt-4 pl-1 ${
      !isDarkMode ? 'bg-[#f8f9fa] min-h-screen' : ''
    }`}>
      {showPopup && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
          <div className={`px-10 py-10 rounded-2xl shadow-2xl w-[500px] relative text-center ${
            isDarkMode ? "bg-[#0c1220] text-white" : "bg-white text-gray-900"
          }`}>
            <span
              className={`absolute top-4 right-6 text-2xl cursor-pointer ${
                isDarkMode ? "text-gray-400" : "text-gray-600"
              }`}
              onClick={() => setShowPopup(false)}
            >
              ×
            </span>
            <div className={`w-14 h-14 mx-auto rounded-full flex items-center justify-center text-white text-2xl mb-6 ${popupType === "success" ? "bg-green-500" : "bg-red-500"}`}>
              {popupType === "success" ? "✓" : "!"}
            </div>
            <h2 className="text-2xl font-semibold mb-2">{popupMessage}</h2>
          </div>
        </div>
      )}

      <div className={`font-bold text-2xl pb-2 pl-5 ${
        isDarkMode ? "text-white" : "text-gray-900"
      }`}>
        <h1>{isEdit ? "Edit BigIO Device" : "Create BigIO Device"}</h1>
      </div>

      <form className="w-full p-5" onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* Device Name */}
          <div className="mb-4">
            <label className={`block text-sm font-bold mb-2 ${
              isDarkMode ? "text-white" : "text-gray-900"
            }`}>Device Name *</label>
            <input 
              type="text" 
              className={`border rounded w-full py-2 px-3 ${
                isDarkMode ? "bg-transparent text-white border-white" : "bg-white text-gray-900 border-gray-300"
              }`}
              value={deviceName} 
              onChange={e => { setDeviceName(e.target.value); if (e.target.value.trim()) setDeviceNameError(""); }} 
            />
            {deviceNameError && <p className="text-red-500 text-xs">{deviceNameError}</p>}
          </div>

          {/* Device ID */}
          <div className="mb-4">
            <label className={`block text-sm font-bold mb-2 ${
              isDarkMode ? "text-white" : "text-gray-900"
            }`}>Device ID *</label>
            <input 
              type="text"
              className={`border rounded w-full py-2 px-3 ${
                isDarkMode 
                  ? `text-white ${isEdit ? "bg-gray-700 cursor-not-allowed" : "bg-transparent border-white"}` 
                  : `text-gray-900 border-gray-300 ${isEdit ? "bg-gray-200 cursor-not-allowed" : "bg-white"}`
              }`}
              value={deviceId} 
              readOnly={isEdit}
              onChange={e => setDeviceId(e.target.value)} 
            />
            {deviceIdError && <p className="text-red-500 text-xs">{deviceIdError}</p>}
          </div>

          {/* Serial & Sim */}
          <div className="mb-4">
            <label className={`block text-sm font-bold mb-2 ${
              isDarkMode ? "text-white" : "text-gray-900"
            }`}>Serial No.</label>
            <input 
              type="text" 
              className={`border rounded w-full py-2 px-3 ${
                isDarkMode ? "bg-transparent text-white border-white" : "bg-white text-gray-900 border-gray-300"
              }`}
              value={serialNo} 
              onChange={e => setSerialNo(e.target.value)} 
            />
          </div>
          <div className="mb-4">
            <label className={`block text-sm font-bold mb-2 ${
              isDarkMode ? "text-white" : "text-gray-900"
            }`}>Sim No.</label>
            <input 
              type="text" 
              className={`border rounded w-full py-2 px-3 ${
                isDarkMode ? "bg-transparent text-white border-white" : "bg-white text-gray-900 border-gray-300"
              }`}
              value={simNo} 
              onChange={e => setSimNo(e.target.value)} 
            />
          </div>

          {/* Location */}
          <div className="mb-4">
            <label className={`block text-sm font-bold mb-2 ${
              isDarkMode ? "text-white" : "text-gray-900"
            }`}>Location *</label>
            <select 
              className={`w-full py-2 px-3 rounded-lg border ${
                isDarkMode ? "bg-[#1a253f] text-white border-white" : "bg-white text-gray-900 border-gray-300"
              }`}
              value={locationId} 
              onChange={e => { setLocationId(e.target.value); if (e.target.value) setLocationIdError(""); }}
            >
              <option value="" style={{ backgroundColor: isDarkMode ? "#1a253f" : "#ffffff", color: isDarkMode ? "white" : "#111827" }}>Select a location</option>
              {locations.map(loc => <option key={loc.loc_id} value={loc.loc_id} style={{ backgroundColor: isDarkMode ? "#1a253f" : "#ffffff", color: isDarkMode ? "white" : "#111827" }}>{loc.loc_name}</option>)}
            </select>
            {locationIdError && <p className="text-red-500 text-xs">{locationIdError}</p>}
          </div>

          {/* Status (Edit mode only) */}
          {isEdit && (
            <div className="mb-4">
              <label className={`block text-sm font-bold mb-2 ${
                isDarkMode ? "text-white" : "text-gray-900"
              }`}>Status</label>
              <select
                className={`w-full py-2 px-3 rounded-lg border ${
                  isDarkMode ? "bg-[#1a253f] text-white border-white" : "bg-white text-gray-900 border-gray-300"
                }`}
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="true" style={{ backgroundColor: isDarkMode ? "#1a253f" : "#ffffff", color: isDarkMode ? "white" : "#111827" }}>Active</option>
                <option value="false" style={{ backgroundColor: isDarkMode ? "#1a253f" : "#ffffff", color: isDarkMode ? "white" : "#111827" }}>Inactive</option>
              </select>
            </div>
          )}
        </div>

        {[1, 2, 3, 4].map(ch => renderChannel(ch))}

        {/* ---------------- Phase Combination Section ---------------- */}
        <h2 className={`text-xl font-bold mt-6 mb-2 ${
          isDarkMode ? "text-white" : "text-gray-900"
        }`}>
          Phase Combination
        </h2>
        <PhaseCombinationBuilder 
          phaseNames={phaseNames} 
          phaseType={phaseType}
          onCombinedChange={setCombinedPhaseResult}
          initialCombined={initialCombinedRaw}
        />

        <div className="flex items-center justify-end mt-4 gap-4">
          <button 
            type="button" 
            className="font-bold px-4 py-2 border text-white rounded-lg hover:opacity-90" style={{backgroundColor:"#ffffff31"}}
            onClick={() => navigate("/device-list")}
          >
            Cancel
          </button>
          <button 
            type="submit" 
            className="font-bold px-4 py-2 text-white rounded-lg hover:opacity-90" 
            style={{ backgroundColor: "#76df23" }}
          >
            {isEdit ? "Update" : "Submit"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default BigIODeviceForm;