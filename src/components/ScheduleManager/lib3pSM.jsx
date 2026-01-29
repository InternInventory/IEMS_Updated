import { useState, useEffect, useCallback } from "react";
import {
  X,
  Calendar,
  Plus,
  Clock,
  Trash2,
  Edit2,
  Send,
} from "lucide-react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

const authFetch = async ({ url, method, data }) => {
  const apiURL = import.meta.env.VITE_API_BASE_URL;
  const response = await fetch(`${apiURL}${url}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: localStorage.getItem("token") || sessionStorage.getItem("token"),
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
};

const Lib3pScheduleManager = ({ onClose, deviceType: propDeviceType, topic: proptopic, response: propResponse }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();

  const deviceType = propDeviceType || location.state?.deviceType;
  const topic = proptopic || location.state?.topic;
  const response = propResponse || location.state?.response;
  const [responseTopic, setResponseTopic] = useState("");

  const [allSchedules, setAllSchedules] = useState([]); // Store ALL schedules
  const [currentSchedules, setCurrentSchedules] = useState([]); // Only schedules for current deviceType
  const [newSchedule, setNewSchedule] = useState({
    type: "Regular",
    startTime: "08:00:00",
    stopTime: "20:00:00",
    days: [],
    dates: [],
    dayRanges: [],
  });
  const [activeDialog, setActiveDialog] = useState(null);
  const [isEditingStartTime, setIsEditingStartTime] = useState(true);
  const [currentTime, setCurrentTime] = useState("00:00:00");
  const [editingIndex, setEditingIndex] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);
  const [showRetryPopup, setShowRetryPopup] = useState(false);
  const [retryMessage, setRetryMessage] = useState("");
  const [isRetrying, setIsRetrying] = useState(false);
  const [fetchError, setFetchError] = useState(null);

  const daysList = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const types = ["Regular", "Custom", "Holiday"];

  // Manual retry function
  const retryFetchSchedules = async () => {
    setIsRetrying(true);
    setShowRetryPopup(false);
    
    console.log('🔄 Manual retry: Attempting to fetch LIB3P schedules...');
    
    try {
      const payload = {
        topic,
        message: { SIOT: "GMRALL" },
        response,
      };

      const res = await authFetch({
        url: "/devicecommandwithresponse",
        method: "POST",
        data: payload,
      });

      if (res?.responses?.[1] && Array.isArray(res.responses[1].Schedule)) {
        const raw = res.responses[1].Schedule;
        const mapped = raw.map(s => ({
          Type: s.TYPE,
          CONTROL: s.CONTROL,
          StartTime: s.STT || "",
          StopTime: s.SFT || "",
          Days: s.DAYS || "",
          Date: s.DATE || "",
          PeriodDate: s.P_DATE || "",
        }));
        
        setAllSchedules(mapped);
        const wantedControl = deviceType?.toUpperCase() || "UNKNOWN";
        const filtered = mapped.filter(s => s.CONTROL === wantedControl);
        setCurrentSchedules(filtered);
        console.log('✅ Retry successful - LIB3P schedules loaded');
        setFetchError(null);
        alert('Schedules loaded successfully!');
      } else {
        throw new Error('No device response');
      }
    } catch (err) {
      console.error('❌ Retry failed:', err);
      alert('Failed to fetch schedules. Please check device connectivity.');
    } finally {
      setIsRetrying(false);
    }
  };

  // ────────────────────── FETCH ALL SCHEDULES ──────────────────────
  // Note: Schedules are only fetched via MQTT, no REST API fallback exists

  useEffect(() => {
    let timeoutId;
    
    const fetchSchedules = async () => {
      if (!topic || !response) {
        console.warn('❌ Missing topic or response topic:', { topic, response });
        return;
      }

      // Add delay to ensure stable communication
      console.log('⏳ Preparing to fetch schedules...');
      timeoutId = setTimeout(async () => {
        console.log('📡 Sending LIB3P schedule fetch command...');
        console.log('📤 Command payload:', { topic, response, message: { SIOT: "GMRALL" } });

        try {
          const apiURL = import.meta.env.VITE_API_BASE_URL;
          if (!apiURL) throw new Error("Missing API base URL");

          const payload = {
            topic: topic,
            message: { SIOT: "GMRALL" },
            response: response,
          };

          const res = await authFetch({
            url: "/devicecommandwithresponse",
            method: "POST",
            data: payload,
          });

          console.log('📥 LIB3P Schedule fetch response:', res);

          if (res?.responses?.[1] && Array.isArray(res.responses[1].Schedule)) {
            const raw = res.responses[1].Schedule;

            const mapped = raw.map(s => ({
              Type: s.TYPE,
              CONTROL: s.CONTROL,
              StartTime: s.STT || "",
              StopTime: s.SFT || "",
              Days: s.DAYS || "",
              Date: s.DATE || "",
              PeriodDate: s.P_DATE || "",
            }));
            
            setAllSchedules(mapped);
            
            // Filter for current device type for display
            const wantedControl = deviceType?.toUpperCase() || "UNKNOWN";
            const filtered = mapped.filter(s => s.CONTROL === wantedControl);
            setCurrentSchedules(filtered);
            console.log('✅ LIB3P Schedules loaded from device:', filtered);
          } else {
            console.warn('⚠️ No schedule data in response');
            throw new Error('No device response');
          }
        } catch (err) {
          console.error('❌ LIB3P Fetch error from device:', err);
          console.error('Error details:', {
            message: err.message,
            status: err.response?.status,
            data: err.response?.data
          });
          
          // No fallback available - schedules only come from device via MQTT
          console.warn('⚠️ Failed to load schedules from device');
          setAllSchedules([]);
          setCurrentSchedules([]);
          
          if (err.message?.includes('500')) {
            setFetchError('Backend API error. The server is having trouble communicating with the device. You can still add new schedules.');
          } else if (err.message?.includes('Network')) {
            setFetchError('Network error. Please check your internet connection.');
          } else {
            setFetchError('Could not load existing schedules. You can still add new schedules.');
          }
        }
      }, 1500); // Wait 1.5 seconds for WebSocket to stabilize
    };
    
    fetchSchedules();
    
    // Cleanup timeout on unmount or when dependencies change
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [deviceType, topic, response]);

  // ────────────────────── HELPERS ──────────────────────
  const parseDays = (str) => (str ? str.split(",").map(d => d.trim()).filter(Boolean) : []);
  const parseDates = (str) => (str ? str.split(",").map(d => d.trim()).filter(Boolean) : []);
  const parseDayRanges = (str) => (str ? str.split(",").map(r => r.trim()).filter(Boolean) : []);

  const startEdit = (i) => {
    const s = currentSchedules[i];
    setNewSchedule({
      type: s.Type,
      startTime: s.StartTime || "08:00:00",
      stopTime: s.StopTime || "20:00:00",
      days: parseDays(s.Days),
      dates: parseDates(s.Date),
      dayRanges: parseDayRanges(s.PeriodDate),
    });
    setEditingIndex(i);
    setActiveDialog(null);
  };

  const saveEdit = () => {
    if (newSchedule.type !== "Holiday" && (!newSchedule.startTime || !newSchedule.stopTime)) {
      alert("Start and Stop times required for non-holiday.");
      return;
    }

    const updatedSchedule = {
      Type: newSchedule.type,
      CONTROL: deviceType?.toUpperCase() || "UNKNOWN",
      StartTime: newSchedule.type === "Holiday" ? "" : newSchedule.startTime,
      StopTime: newSchedule.type === "Holiday" ? "" : newSchedule.stopTime,
      Days: newSchedule.days.join(", "),
      Date: newSchedule.dates.join(", "),
      PeriodDate: newSchedule.dayRanges.join(", "),
    };

    if (editingIndex !== null) {
      // Update existing schedule in both currentSchedules and allSchedules
      const scheduleToUpdate = currentSchedules[editingIndex];
      
      const updatedCurrentSchedules = currentSchedules.map((s, i) => 
        i === editingIndex ? updatedSchedule : s
      );
      
      const updatedAllSchedules = allSchedules.map(s => 
        s === scheduleToUpdate ? updatedSchedule : s
      );
      
      setCurrentSchedules(updatedCurrentSchedules);
      setAllSchedules(updatedAllSchedules);
      setEditingIndex(null);
    } else {
      // Add new schedule to both currentSchedules and allSchedules
      setCurrentSchedules(prev => [...prev, updatedSchedule]);
      setAllSchedules(prev => [...prev, updatedSchedule]);
    }
    resetNewSchedule();
  };

  const resetNewSchedule = () => {
    setNewSchedule({
      type: "Regular",
      startTime: "08:00:00",
      stopTime: "20:00:00",
      days: [], dates: [], dayRanges: [],
    });
    setEditingIndex(null);
  };

  const toggleDay = (day) => {
    setNewSchedule(prev => ({
      ...prev,
      days: prev.days.includes(day)
        ? prev.days.filter(d => d !== day)
        : [...prev.days, day],
    }));
  };

  const handleTimeChange = (type, val) => setNewSchedule(prev => ({ ...prev, [type]: val }));
  const addDate = (str) => !newSchedule.dates.includes(str) && setNewSchedule(p => ({ ...p, dates: [...p.dates, str] }));
  const addDayRange = (str) => !newSchedule.dayRanges.includes(str) && setNewSchedule(p => ({ ...p, dayRanges: [...p.dayRanges, str] }));
  const removeTag = (type, item) => setNewSchedule(p => ({ ...p, [type]: p[type].filter(i => i !== item) }));
  
  const deleteSchedule = (i) => {
    const scheduleToDelete = currentSchedules[i];
    setCurrentSchedules(prev => prev.filter((_, idx) => idx !== i));
    setAllSchedules(prev => prev.filter(s => s !== scheduleToDelete));
  };
  
  const showDialog = (d) => setActiveDialog(d);
  const hideDialog = () => setActiveDialog(null);

  // ────────────────────── SUBMIT ALL SCHEDULES ──────────────────────
  const submitSchedules = async () => {
    if (!allSchedules.length) return alert("No schedules to submit.");

    setIsSubmitting(true);
    setSubmitStatus(null);

    try {
      // Convert ALL schedules back to the exact same format as received
      const deviceSchedules = allSchedules.map(s => ({
        TYPE: s.Type,
        CONTROL: s.CONTROL,
        STT: s.StartTime || "",
        SFT: s.StopTime || "",
        DAYS: s.Days || "",
        DATE: s.Date || "",
        P_DATE: s.PeriodDate || "",
      }));

      const payload = {
        topic: `${topic}`,
        message: { Schedule: deviceSchedules }, // Send ALL schedules
        response: `${response}`
      };

      console.log("📤 Sending LIB3P command to API, will wait for WebSocket response...");

      // Send command to API but wait for WebSocket response
      const submitRes = await authFetch({
        url: "/devicecommandwithresponse",
        method: "POST",
        data: payload,
      });

      console.log("📥 LIB3P Submit response received:", submitRes);

      // Check for AcceptedCmd in the response
      if (submitRes?.responses?.[0]?.AcceptedCmd) {
        console.log("✅ AcceptedCmd received - Schedule saved successfully");
        setSubmitStatus("success");
        alert("Schedule saved successfully!");
        setTimeout(() => setSubmitStatus(null), 3000);
        return;
      }

      // Wait for WebSocket response if no immediate AcceptedCmd
      const responseReceived = await new Promise((resolve) => {
        const timeoutId = setTimeout(() => {
          console.warn("⏰ No WebSocket response received within 30 seconds");
          setRetryMessage("No confirmation received from device. The command may still be processing.");
          setShowRetryPopup(true);
          resolve(false);
        }, 30000); // 30 second timeout
        
        // Store the resolver for the WebSocket message handler
        window.lib3pScheduleResponseResolver = (response) => {
          clearTimeout(timeoutId);
          // Check for AcceptedCmd in WebSocket response
          if (response?.responses?.[0]?.AcceptedCmd) {
            console.log("✅ AcceptedCmd received via WebSocket - Schedule saved");
            resolve("accepted");
          } else {
            resolve(true);
          }
        };
      });
      
      if (responseReceived === "accepted") {
        console.log("✅ Schedule saved confirmation received via WebSocket");
        setSubmitStatus("success");
        alert("Schedule saved successfully!");
        setTimeout(() => setSubmitStatus(null), 3000);
      } else if (responseReceived) {
        console.log("✅ LIB3P schedule confirmation received via WebSocket");
        setSubmitStatus("success");
        setTimeout(() => setSubmitStatus(null), 3000);
      }
    } catch (err) {
      console.error("Submit error:", err);
      setRetryMessage("Failed to submit schedules. Please retry.");
      setShowRetryPopup(true);
    } finally {
      setIsSubmitting(false);
      // Clean up resolver
      if (window.lib3pScheduleResponseResolver) {
        delete window.lib3pScheduleResponseResolver;
      }
    }
  };

  const handleClose = () => {
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    }
  };

  // ────────────────────── DIALOGS (unchanged) ──────────────────────
  const TimePickerDialog = () => {
    const [h, setH] = useState(currentTime.split(":")[0] || "00");
    const [m, setM] = useState(currentTime.split(":")[1] || "00");
    const [s, setS] = useState(currentTime.split(":")[2] || "00");

    useEffect(() => {
      setCurrentTime(`${h.padStart(2, "0")}:${m.padStart(2, "0")}:${s.padStart(2, "0")}`);
    }, [h, m, s]);

    const save = () => {
      handleTimeChange(isEditingStartTime ? "startTime" : "stopTime", currentTime);
      hideDialog();
    };

    const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => String(i + a).padStart(2, "0"));

    return (
      <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-60">
        <div className="bg-[#1F2537] p-6 rounded-lg shadow-lg border-2 border-blue-600 w-[300px]">
          <h3 className="text-lg font-bold text-blue-600 text-center mb-4">
            <Clock size={18} className="inline mr-2" />
            {isEditingStartTime ? "Start Time" : "Stop Time"}
          </h3>
          <div className="text-center text-lg font-mono text-white mb-4">{currentTime}</div>
          <div className="flex justify-center gap-2 mb-4">
            {["Hours", "Minutes", "Seconds"].map((lbl, i) => (
              <div key={lbl}>
                <label className="block text-sm font-bold text-white mb-1">{lbl}</label>
                <select
                  value={[h, m, s][i]}
                  onChange={e => [setH, setM, setS][i](e.target.value)}
                  className="p-2 rounded bg-[#0D1117] text-white border border-gray-600 text-center w-16"
                >
                  {range(i === 0 ? 0 : 0, i === 0 ? 23 : 59).map(v => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
          <div className="flex justify-center gap-2">
            <button onClick={save} className="px-4 py-2 rounded bg-blue-600 text-white font-bold hover:bg-blue-700">
              OK
            </button>
            <button onClick={hideDialog} className="px-4 py-2 rounded bg-gray-600 text-white font-bold hover:bg-gray-700">
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  };

  const DaysDialog = () => (
    <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-60">
      <div className="bg-[#1F2537] p-6 rounded-lg shadow-lg border-2 border-blue-600 w-[320px]">
        <h3 className="text-lg font-bold text-blue-600 text-center mb-4">
          <Calendar size={18} className="inline mr-2" /> Select Days
        </h3>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {daysList.map(day => (
            <label key={day} className="flex items-center">
              <input type="checkbox" checked={newSchedule.days.includes(day)} onChange={() => toggleDay(day)} className="mr-2" />
              <span className="text-white">{day}</span>
            </label>
          ))}
        </div>
        <div className="flex justify-center gap-2 mt-6">
          <button onClick={hideDialog} className="px-4 py-2 rounded bg-blue-600 text-white font-bold hover:bg-blue-700">OK</button>
          <button onClick={hideDialog} className="px-4 py-2 rounded bg-gray-600 text-white font-bold hover:bg-gray-700">Cancel</button>
        </div>
      </div>
    </div>
  );

  const DatesDialog = () => {
    const [single, setSingle] = useState(true);
    const [date, setDate] = useState(new Date());
    const [start, setStart] = useState(new Date());
    const [end, setEnd] = useState(new Date());

    const save = () => {
      if (single) {
        addDate(date.toISOString().split("T")[0]);
      } else if (end >= start) {
        addDate(`${start.toISOString().split("T")[0]}>${end.toISOString().split("T")[0]}`);
      } else {
        alert("End date must be after start.");
        return;
      }
      hideDialog();
    };

    return (
      <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-60">
        <div className="bg-[#1F2537] p-6 rounded-lg shadow-lg border-2 border-blue-600 w-[350px]">
          <h3 className="text-lg font-bold text-blue-600 text-center mb-4">
            <Calendar size={18} className="inline mr-2" /> Date / Range
          </h3>
          <div className="flex justify-center gap-4 mb-4">
            <label className="flex items-center"><input type="radio" checked={single} onChange={() => setSingle(true)} className="mr-2" /><span className="text-white">Single</span></label>
            <label className="flex items-center"><input type="radio" checked={!single} onChange={() => setSingle(false)} className="mr-2" /><span className="text-white">Range</span></label>
          </div>
          {single ? (
            <DatePicker selected={date} onChange={setDate} className="w-full p-2 rounded bg-[#0D1117] text-white border border-gray-600" dateFormat="yyyy-MM-dd" />
          ) : (
            <div className="flex gap-2">
              <DatePicker selected={start} onChange={setStart} className="flex-1 p-2 rounded bg-[#0D1117] text-white border border-gray-600" dateFormat="yyyy-MM-dd" />
              <span className="self-center text-white">to</span>
              <DatePicker selected={end} onChange={setEnd} className="flex-1 p-2 rounded bg-[#0D1117] text-white border border-gray-600" dateFormat="yyyy-MM-dd" />
            </div>
          )}
          <div className="flex justify-center gap-2 mt-4">
            <button onClick={save} className="px-4 py-2 rounded bg-blue-600 text-white font-bold hover:bg-blue-700">OK</button>
            <button onClick={hideDialog} className="px-4 py-2 rounded bg-gray-600 text-white font-bold hover:bg-gray-700">Cancel</button>
          </div>
        </div>
      </div>
    );
  };

  const DayRangesDialog = () => {
    const [single, setSingle] = useState(true);
    const [day, setDay] = useState(1);
    const [from, setFrom] = useState(1);
    const [to, setTo] = useState(1);
    const [temp, setTemp] = useState([]);

    const add = () => {
      const val = single ? String(day) : from <= to ? `${from}-${to}` : null;
      if (val && !temp.includes(val)) setTemp(p => [...p, val]);
      setDay(1); setFrom(1); setTo(1);
    };

    const save = () => { temp.forEach(addDayRange); setTemp([]); hideDialog(); };

    const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => i + a);

    return (
      <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-60">
        <div className="bg-[#1F2537] p-6 rounded-lg shadow-lg border-2 border-blue-600 w-[350px]">
          <h3 className="text-lg font-bold text-blue-600 text-center mb-4">
            <Calendar size={18} className="inline mr-2" /> Day of Month
          </h3>
          <div className="flex justify-center gap-4 mb-4">
            <label className="flex items-center"><input type="radio" checked={single} onChange={() => setSingle(true)} className="mr-2" /><span className="text-white">Single</span></label>
            <label className="flex items-center"><input type="radio" checked={!single} onChange={() => setSingle(false)} className="mr-2" /><span className="text-white">Range</span></label>
          </div>
          {single ? (
            <select value={day} onChange={e => setDay(+e.target.value)} className="w-full p-2 rounded bg-[#0D1117] text-white border border-gray-600">
              {range(1, 31).map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          ) : (
            <div className="flex gap-2">
              <select value={from} onChange={e => setFrom(+e.target.value)} className="flex-1 p-2 rounded bg-[#0D1117] text-white border border-gray-600">
                {range(1, 31).map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <span className="self-center text-white">–</span>
              <select value={to} onChange={e => setTo(+e.target.value)} className="flex-1 p-2 rounded bg-[#0D1117] text-white border border-gray-600">
                {range(1, 31).map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          )}
          <button onClick={add} className="w-full mt-3 mb-2 px-4 py-2 rounded bg-blue-600 text-white font-bold hover:bg-blue-700">Add</button>
          <textarea readOnly value={temp.join(", ")} className="w-full h-20 p-2 rounded bg-[#0D1117] text-white border border-gray-600 resize-none text-sm" />
          <div className="flex justify-center gap-2 mt-3">
            <button onClick={save} className="px-4 py-2 rounded bg-blue-600 text-white font-bold hover:bg-blue-700">OK</button>
            <button onClick={hideDialog} className="px-4 py-2 rounded bg-gray-600 text-white font-bold hover:bg-gray-700">Cancel</button>
          </div>
        </div>
      </div>
    );
  };

  const renderTags = (items, type) => (
    <div className="flex flex-wrap gap-2 mt-2">
      {items.map((it, i) => (
        <div key={i} className="flex items-center px-2 py-1 rounded-full bg-[#0D1117] border border-blue-600 text-xs">
          <span className="text-blue-300">{it}</span>
          <button onClick={() => removeTag(type, it)} className="ml-1 bg-red-600 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs">
            <X size={10} />
          </button>
        </div>
      ))}
    </div>
  );

  const RetryPopup = () => (
    <div className="fixed inset-0 bg-black/70 flex justify-center items-center z-70">
      <div className="bg-[#1F2537] p-6 rounded-lg shadow-2xl border-2 border-orange-600 max-w-sm w-full mx-4">
        <h3 className="text-lg font-bold mb-3 flex items-center gap-2 text-orange-400">
          ⚠️ No Response
        </h3>
        <p className="text-white text-sm mb-6">{retryMessage}</p>
        <div className="flex justify-center gap-3">
          <button
            onClick={retryFetchSchedules}
            disabled={isRetrying}
            className="px-6 py-2 font-bold rounded-lg text-white transition bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isRetrying ? 'Retrying...' : 'Retry'}
          </button>
          <button
            onClick={() => setShowRetryPopup(false)}
            disabled={isRetrying}
            className="px-6 py-2 font-bold rounded-lg text-white transition bg-gray-600 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );

  // ────────────────────── RENDER ──────────────────────
  return (
    <div className="fixed inset-0 flex justify-center items-center z-50 p-4">
      <div className="fixed inset-0 bg-black/50" onClick={handleClose} />
      <div className="relative bg-[#1F2537] p-6 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl border border-gray-700">
        <button onClick={handleClose} className="absolute top-3 right-3 z-10 text-gray-400 hover:text-white">
          <X size={20} />
        </button>

        <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-4 pr-8">
          <Calendar size={20} /> {deviceType?.toUpperCase() || "ALL"} Schedule Manager
        </h2>

        {/* Error Banner */}
        {fetchError && (
          <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg flex items-start gap-3">
            <svg className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="flex-1">
              <p className="text-yellow-300 text-sm">{fetchError}</p>
            </div>
            <button
              onClick={() => {
                setFetchError(null);
                retryFetchSchedules();
              }}
              disabled={isRetrying}
              className="px-3 py-1 bg-yellow-600 hover:bg-yellow-700 text-white text-xs rounded transition-colors disabled:opacity-50"
            >
              {isRetrying ? 'Retrying...' : 'Retry'}
            </button>
            <button
              onClick={() => setFetchError(null)}
              className="text-yellow-400 hover:text-yellow-300"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {submitStatus && (
          <div className={`mb-3 p-2 rounded text-center font-medium ${submitStatus === "success" ? "bg-green-600" : "bg-red-600"} text-white`}>
            {submitStatus === "success" ? "Submitted!" : "Failed."}
          </div>
        )}

        {/* Form */}
        <div className="space-y-4 mb-6">
          <div>
            <label className="text-sm text-gray-300">Type</label>
            <select value={newSchedule.type} onChange={e => setNewSchedule(p => ({ ...p, type: e.target.value }))} className="w-full p-2 rounded bg-[#0D1117] text-white border border-gray-600">
              {types.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          {newSchedule.type !== "Holiday" && (
            <div className="grid grid-cols-2 gap-4">
              {["Start", "Stop"].map((lbl, i) => (
                <div key={lbl}>
                  <label className="text-sm text-gray-300">{lbl} Time</label>
                  <div className="flex gap-1">
                    <input
                      type="text"
                      value={i ? newSchedule.stopTime : newSchedule.startTime}
                      readOnly
                      className="flex-1 p-2 rounded bg-[#0D1117] text-white border border-gray-600 cursor-pointer"
                      onClick={() => {
                        setIsEditingStartTime(!i);
                        setCurrentTime(i ? newSchedule.stopTime : newSchedule.startTime);
                        showDialog("time");
                      }}
                    />
                    <button
                      onClick={() => {
                        setIsEditingStartTime(!i);
                        setCurrentTime(i ? newSchedule.stopTime : newSchedule.startTime);
                        showDialog("time");
                      }}
                      className="p-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      <Clock size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {["days", "dates", "dayRanges"].map(f => (
            <div key={f}>
              <label className="text-sm text-gray-300 capitalize">{f === "dayRanges" ? "Day of Month" : f}</label>
              <div className="flex gap-2 mt-1">
                <button onClick={() => showDialog(f)} className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">
                  <Calendar size={14} /> Select
                </button>
              </div>
              {renderTags(newSchedule[f], f)}
            </div>
          ))}

          <button onClick={saveEdit} className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex justify-center items-center gap-2 font-medium">
            <Plus size={16} /> {editingIndex !== null ? "Update" : "Add"} Schedule
          </button>
          {editingIndex !== null && (
            <button onClick={resetNewSchedule} className="w-full bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg">Cancel Edit</button>
          )}
        </div>

        {/* List */}
        <div className="border-t border-gray-700 pt-4">
          <h3 className="text-sm font-semibold text-gray-300 mb-2">Current Schedules ({deviceType?.toUpperCase()})</h3>
          <div className="max-h-64 overflow-y-auto space-y-2">
            {currentSchedules.length === 0 ? (
              <p className="text-gray-500 text-center text-sm">No schedules</p>
            ) : (
              currentSchedules.map((s, i) => (
                <div key={i} className="bg-[#0D1117] p-3 rounded-lg flex justify-between items-start text-sm">
                  <div>
                    <p className="font-medium text-white">{s.Type} ({s.CONTROL})</p>
                    {s.Type !== "Holiday" && <p className="text-gray-400">{s.StartTime} to {s.StopTime}</p>}
                    {s.Days && <p className="text-xs text-gray-500">Days: {s.Days}</p>}
                    {s.Date && <p className="text-xs text-gray-500">Dates: {s.Date}</p>}
                    {s.PeriodDate && <p className="text-xs text-gray-500">Day: {s.PeriodDate}</p>}
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => startEdit(i)} className="p-1 bg-yellow-600 rounded hover:bg-yellow-700"><Edit2 size={14} /></button>
                    <button onClick={() => deleteSchedule(i)} className="p-1 bg-red-600 rounded hover:bg-red-700"><Trash2 size={14} /></button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Submit */}
        <button
          onClick={submitSchedules}
          disabled={isSubmitting || !allSchedules.length}
          className={`w-full mt-6 flex justify-center items-center gap-2 px-4 py-3 rounded-lg font-bold text-white transition ${
            isSubmitting || !allSchedules.length ? "bg-gray-600 cursor-not-allowed" : "bg-green-600 hover:bg-green-700"
          }`}
        >
          {isSubmitting ? "Submitting..." : <><Send size={18} /> Submit All Schedules to Device</>}
        </button>
      </div>

      {/* Dialogs */}
      {activeDialog === "time" && <TimePickerDialog />}
      {activeDialog === "days" && <DaysDialog />}
      {activeDialog === "dates" && <DatesDialog />}
      {activeDialog === "dayRanges" && <DayRangesDialog />}
      {showRetryPopup && <RetryPopup />}
    </div>
  );
};

export default Lib3pScheduleManager;