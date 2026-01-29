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
import { useNavigate, useLocation } from "react-router-dom";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { useTheme } from "../../context/ThemeContext";

 
// ──────────────────────────────────────────────────────────────
// Replace axios with your authFetch
// ──────────────────────────────────────────────────────────────
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
 
// ────────────────────── TYPE → CONTROL MAPPING ──────────────────────
const TYPE_TO_CONTROL = {
  IR: "IR",
  RELAY: "RELAY",
  MODBUS: "MODBUS",
};
 
const ScheduleManager = ({ onClose, deviceType: propDeviceType, topic: proptopic, response: propresponse, scheduleData: propScheduleData }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isDark } = useTheme();
 
 
  const deviceType = propDeviceType || location.state?.deviceType;
  const topic = proptopic || location.state?.topic;
  const response = propresponse || location.state?.response;
  const scheduleData = propScheduleData || location.state?.scheduleData;
  const [responseTopic, setResponseTopic] = useState("");
 
  const [schedules, setSchedules] = useState([]);
  const [newSchedule, setNewSchedule] = useState({
    type: "Regular",
    startTime: "08:00:00",
    stopTime: "20:00:00",
    days: [],
    dates: [],
    dayRanges: [],
    MS: "OFF",
    TS: "OFF",
  });
 
  const [activeDialog, setActiveDialog] = useState(null);
  const [isEditingStartTime, setIsEditingStartTime] = useState(true);
  const [currentTime, setCurrentTime] = useState("00:00:00");
  const [editingIndex, setEditingIndex] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);
  const [alert, setAlert] = useState({ open: false, title: "", message: "" });
  const [showRetryPopup, setShowRetryPopup] = useState(false);
  const [retryMessage, setRetryMessage] = useState("");
  const [isRetrying, setIsRetrying] = useState(false);
  const [fetchError, setFetchError] = useState(null);
 
  const showAlert = (title, message) => setAlert({ open: true, title, message });
  const closeAlert = () => setAlert({ open: false, title: "", message: "" });
 
  const daysList = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const types = ["Regular", "Custom", "Holiday"];

  // Manual retry function
  const retryFetchSchedules = async () => {
    setIsRetrying(true);
    setShowRetryPopup(false);
    
    console.log('🔄 Manual retry: Attempting to fetch schedules...');
    
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
        const deviceData = res.responses[1];
        // const msValue = deviceData.MS ?? deviceData.json_data?.MS ?? "OFF";
        // const tsValue = deviceData.TS ?? deviceData.json_data?.TS ?? "OFF";
        // setNewSchedule(prev => ({ ...prev, MS: msValue, TS: tsValue }));

        let raw = deviceData.Schedule;
        const wantedControl = TYPE_TO_CONTROL[deviceType?.toUpperCase()];
        if (wantedControl) {
          raw = raw.filter(s => s.CONTROL === wantedControl);
        }

        const mapped = raw.map(s => ({
          Type: s.TYPE,
          CONTROL: s.CONTROL,
          StartTime: s.STT || "",
          StopTime: s.SFT || "",
          Days: s.DAYS || "",
          Date: s.DATE || "",
          PeriodDate: s.P_DATE || "",
        }));
        setSchedules(mapped);
        console.log('✅ Retry successful - schedules loaded');
        setFetchError(null);
        showAlert('Success', 'Schedules loaded successfully!');
      } else {
        throw new Error('No device response');
      }
    } catch (err) {
      console.error('❌ Retry failed:', err);
      showAlert('Error', 'Failed to fetch schedules. Please check device connectivity.');
    } finally {
      setIsRetrying(false);
    }
  };
 
  // ────────────────────── LOAD SCHEDULES FROM PROP ──────────────────────
  useEffect(() => {
    console.log('📋 Loading schedules from device data:', scheduleData);
    
    if (!scheduleData) {
      console.warn('⚠️ No schedule data provided');
      setSchedules([]);
      return;
    }

    try {
      // Process Schedules from prop
      if (Array.isArray(scheduleData)) {
        let raw = scheduleData;
        const wantedControl = TYPE_TO_CONTROL[deviceType?.toUpperCase()];
        if (wantedControl) {
          raw = raw.filter(s => s.CONTROL === wantedControl);
        }
 
        const mapped = raw.map(s => ({
          Type: s.TYPE,
          CONTROL: s.CONTROL,
          StartTime: s.STT || "",
          StopTime: s.SFT || "",
          Days: s.DAYS || "",
          Date: s.DATE || "",
          PeriodDate: s.P_DATE || "",
        }));
        setSchedules(mapped);
        console.log('✅ Schedules loaded:', mapped);
      } else {
        console.warn('⚠️ Schedule data is not an array');
        setSchedules([]);
      }
    } catch (err) {
      console.error('❌ Error loading schedules:', err);
      setSchedules([]);
      setFetchError('Could not load schedules. You can still add new schedules.');
    }
  }, [scheduleData, deviceType]);
 
  // ────────────────────── HELPERS ──────────────────────
  const parseDays = str => (str ? str.split(",").map(d => d.trim()).filter(Boolean) : []);
  const parseDates = str => (str ? str.split(",").map(d => d.trim()).filter(Boolean) : []);
  const parseDayRanges = str => (str ? str.split(",").map(r => r.trim()).filter(Boolean) : []);
 
  const startEdit = (i) => {
    const s = schedules[i];
    setNewSchedule({
      type: s.Type,
      startTime: s.StartTime || "08:00:00",
      stopTime: s.StopTime || "20:00:00",
      days: parseDays(s.Days),
      dates: parseDates(s.Date),
      dayRanges: parseDayRanges(s.PeriodDate),
      MS: newSchedule.MS,
      TS: newSchedule.TS,
    });
    setEditingIndex(i);
    setActiveDialog(null);
  };
 
  const resetNewSchedule = () => {
    setNewSchedule(prev => ({
      type: "Regular",
      startTime: "08:00:00",
      stopTime: "20:00:00",
      days: [],
      dates: [],
      dayRanges: [],
      MS: prev.MS,
      TS: prev.TS,
    }));
    setEditingIndex(null);
  };
 
  const toggleDay = (day) => {
    setNewSchedule(prev => ({
      ...prev,
      days: prev.days.includes(day) ? prev.days.filter(d => d !== day) : [...prev.days, day],
    }));
  };
 
  const handleTimeChange = (type, val) => setNewSchedule(prev => ({ ...prev, [type]: val }));
  const addDate = (str) => !newSchedule.dates.includes(str) && setNewSchedule(p => ({ ...p, dates: [...p.dates, str] }));
  const addDayRange = (str) => !newSchedule.dayRanges.includes(str) && setNewSchedule(p => ({ ...p, dayRanges: [...p.dayRanges, str] }));
  const removeTag = (type, item) => setNewSchedule(p => ({ ...p, [type]: p[type].filter(i => i !== item) }));
  const deleteSchedule = (i) => setSchedules(p => p.filter((_, idx) => idx !== i));
  const showDialog = (d) => setActiveDialog(d);
  const hideDialog = () => setActiveDialog(null);
 
  // ────────────────────── VALIDATED SAVE ──────────────────────
  const saveEdit = () => {
    if (newSchedule.type !== "Holiday") {
      if (!newSchedule.startTime || !newSchedule.stopTime) {
        showAlert("Missing Time", "Start Time and Stop Time are required.");
        return;
      }
      if (newSchedule.startTime === newSchedule.stopTime) {
        showAlert("Invalid Time", "Start Time and Stop Time cannot be the same!");
        return;
      }
    }
 
    const hasCondition = newSchedule.days.length > 0 || newSchedule.dates.length > 0 || newSchedule.dayRanges.length > 0;
    if (!hasCondition) {
      showAlert("No Days Selected", "You must select at least one: Days, Dates, or Day of Month.");
      return;
    }
 
    const updated = {
      Type: newSchedule.type,
      CONTROL: TYPE_TO_CONTROL[deviceType?.toUpperCase()] || "Unknown",
      StartTime: newSchedule.type === "Holiday" ? "" : newSchedule.startTime,
      StopTime: newSchedule.type === "Holiday" ? "" : newSchedule.stopTime,
      Days: newSchedule.days.join(", "),
      Date: newSchedule.dates.join(", "),
      PeriodDate: newSchedule.dayRanges.join(", "),
    };
 
    if (editingIndex !== null) {
      setSchedules(prev => prev.map((s, i) => (i === editingIndex ? updated : s)));
      setEditingIndex(null);
      showAlert("Success", "Schedule updated successfully!");
    } else {
      setSchedules(prev => [...prev, updated]);
      showAlert("Success", "Schedule added successfully!");
    }
 
    resetNewSchedule();
  };
 
  // ────────────────────── SUBMIT TO DEVICE ──────────────────────
  const submitSchedules = async () => {
    if (!schedules.length) {
      showAlert("No Schedules", "There are no schedules to submit.");
      return;
    }
 
    setIsSubmitting(true);
    setSubmitStatus(null);
 
    try {
      const topicId = topic;
      const deviceSchedules = schedules.map(s => ({
        TYPE: s.Type,
        CONTROL: s.CONTROL,
        STT: s.StartTime || "",
        SFT: s.StopTime || "",
        DAYS: s.Days || "",
        DATE: s.Date || "",
        P_DATE: s.PeriodDate || "",
      }));
 
      const payload = {
        topic:topicId,
        message: {
          SIOT: "GMRALL",
          Schedule: deviceSchedules,
          // MS: newSchedule.MS,  // Commented out Motion Sensor
          // TS: newSchedule.TS,  // Commented out Temperature Sensor
        },
        response: response
      };
 
      console.log("📤 Sending command to API, will wait for WebSocket response...");
      
      // Send command to API but wait for WebSocket response
      const submitRes = await authFetch({
        url: "/devicecommandwithresponse",
        method: "POST",
        data: payload,
      });

      console.log("📥 Submit response received:", submitRes);

      // The device returns updated schedule data in the response
      if (submitRes?.data) {
        let deviceData = null;
        
        // Handle array response format
        if (Array.isArray(submitRes.data.responses)) {
          // Find the device data (skip AcceptedCmd, get actual device response)
          deviceData = submitRes.data.responses.find(r => 
            r.DID || r.Schedule !== undefined
          );
        } else if (submitRes.data.Schedule || submitRes.data.DID) {
          deviceData = submitRes.data;
        }
        
        // Update local schedules with the response from device
        if (deviceData && Array.isArray(deviceData.Schedule)) {
          console.log('✅ Received updated schedules from device:', deviceData.Schedule);
          const wantedControl = TYPE_TO_CONTROL[deviceType?.toUpperCase()];
          let raw = deviceData.Schedule;
          if (wantedControl) {
            raw = raw.filter(s => s.CONTROL === wantedControl);
          }
          
          const mapped = raw.map(s => ({
            Type: s.TYPE,
            CONTROL: s.CONTROL,
            StartTime: s.STT || "",
            StopTime: s.SFT || "",
            Days: s.DAYS || "",
            Date: s.DATE || "",
            PeriodDate: s.P_DATE || "",
          }));
          setSchedules(mapped);
        }
      }
      
      setSubmitStatus("success");
      showAlert("Success", "Schedules submitted and updated!");
      setTimeout(() => {
        setSubmitStatus(null);
        if (onClose) {
          onClose();
        } else {
          navigate(-1);
        }
      }, 1500);
    } catch (err) {
      console.error("Submit error:", err);
      setSubmitStatus("error");
      showAlert("Error", `Submit failed: ${err.message}`);
      setTimeout(() => setSubmitStatus(null), 2000);
    } finally {
      setIsSubmitting(false);
    }
  };
 
  const handleClose = () => navigate(-1);
 
  // ────────────────────── ALERT MODAL COMPONENT ──────────────────────
  const AlertModal = ({ isOpen, title, message, onClose }) => {
    if (!isOpen) return null;
    const isSuccess = title === "Success";
 
    return (
      <div className="fixed inset-0 bg-black/70 flex justify-center items-center z-70">
        <div className={`p-6 rounded-lg shadow-2xl border-2 max-w-sm w-full mx-4 ${isDark ? 'bg-[#1F2537] border-blue-600' : 'bg-white border-blue-400'}
          ${isSuccess ? "border-green-600" : "border-red-600"}`}>
          <h3 className={`text-lg font-bold mb-3 flex items-center gap-2
            ${isSuccess ? "text-green-400" : "text-red-400"}`}>
            {isSuccess ? "✅" : "❌"} {title}
          </h3>
          <p className={`text-sm mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>{message}</p>
          <div className="flex justify-center">
            <button
              onClick={onClose}
              className={`px-6 py-2 font-bold rounded-lg text-white transition
                ${isSuccess ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}`}
            >
              OK
            </button>
          </div>
        </div>
      </div>
    );
  };
 
  // ────────────────────── DIALOGS ──────────────────────
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
        <div className={`p-6 rounded-lg shadow-lg border-2 w-[300px] ${isDark ? 'bg-[#1F2537] border-blue-600' : 'bg-white border-blue-400'}`}>
          <h3 className={`text-lg font-bold text-center mb-4 ${isDark ? 'text-blue-600' : 'text-blue-500'}`}>
            <Clock size={18} className="inline mr-2" />
            {isEditingStartTime ? "Start Time" : "Stop Time"}
          </h3>
          <div className={`text-center text-lg font-mono mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>{currentTime}</div>
          <div className="flex justify-center gap-2 mb-4">
            {["Hours", "Minutes", "Seconds"].map((lbl, i) => (
              <div key={lbl}>
                <label className={`block text-sm font-bold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>{lbl}</label>
                <select
                  value={[h, m, s][i]}
                  onChange={e => [setH, setM, setS][i](e.target.value)}
                  className={`p-2 rounded text-center w-16 border ${isDark ? 'bg-[#0D1117] text-white border-gray-600' : 'bg-gray-100 text-gray-900 border-gray-300'}`}
                >
                  {range(i === 0 ? 0 : 0, i === 0 ? 23 : 59).map(v => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
          <div className="flex justify-center gap-2">
            <button onClick={save} className={`px-4 py-2 rounded font-bold transition ${isDark ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white'}`}>OK</button>
            <button onClick={hideDialog} className={`px-4 py-2 rounded font-bold transition ${isDark ? 'bg-gray-600 hover:bg-gray-700 text-white' : 'bg-gray-300 hover:bg-gray-400 text-gray-900'}`}>Cancel</button>
          </div>
        </div>
      </div>
    );
  };
 
  const DaysDialog = () => (
    <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-60">
      <div className={`p-6 rounded-lg shadow-lg border-2 w-[320px] ${isDark ? 'bg-[#1F2537] border-blue-600' : 'bg-white border-blue-400'}`}>
        <h3 className={`text-lg font-bold text-center mb-4 ${isDark ? 'text-blue-600' : 'text-blue-500'}`}>
          <Calendar size={18} className="inline mr-2" /> Select Days
        </h3>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {daysList.map(day => (
            <label key={day} className="flex items-center">
              <input type="checkbox" checked={newSchedule.days.includes(day)} onChange={() => toggleDay(day)} className={`mr-2 ${isDark ? '' : 'bg-gray-100 border-gray-300'}`} />
              <span className={isDark ? 'text-white' : 'text-gray-900'}>{day}</span>
            </label>
          ))}
        </div>
        <div className="flex justify-center gap-2 mt-6">
          <button onClick={hideDialog} className={`px-4 py-2 rounded font-bold transition ${isDark ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white'}`}>OK</button>
          <button onClick={hideDialog} className={`px-4 py-2 rounded font-bold transition ${isDark ? 'bg-gray-600 hover:bg-gray-700 text-white' : 'bg-gray-300 hover:bg-gray-400 text-gray-900'}`}>Cancel</button>
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
        showAlert("Invalid Range", "End date must be after start date.");
        return;
      }
      hideDialog();
    };
 
    return (
      <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-60">
        <div className={`p-6 rounded-lg shadow-lg border-2 w-[350px] ${isDark ? 'bg-[#1F2537] border-blue-600' : 'bg-white border-blue-400'}`}>
          <h3 className={`text-lg font-bold text-center mb-4 ${isDark ? 'text-blue-600' : 'text-blue-500'}`}>
            <Calendar size={18} className="inline mr-2" /> Date / Range
          </h3>
          <div className="flex justify-center gap-4 mb-4">
            <label className="flex items-center"><input type="radio" checked={single} onChange={() => setSingle(true)} className="mr-2" /><span className={isDark ? 'text-white' : 'text-gray-900'}>Single</span></label>
            <label className="flex items-center"><input type="radio" checked={!single} onChange={() => setSingle(false)} className="mr-2" /><span className={isDark ? 'text-white' : 'text-gray-900'}>Range</span></label>
          </div>
          {single ? (
            <DatePicker selected={date} onChange={setDate} className={`w-full p-2 rounded border ${isDark ? 'bg-[#0D1117] text-white border-gray-600' : 'bg-gray-100 text-gray-900 border-gray-300'}`} dateFormat="yyyy-MM-dd" />
          ) : (
            <div className="flex gap-2">
              <DatePicker selected={start} onChange={setStart} className={`flex-1 p-2 rounded border ${isDark ? 'bg-[#0D1117] text-white border-gray-600' : 'bg-gray-100 text-gray-900 border-gray-300'}`} dateFormat="yyyy-MM-dd" />
              <span className={`self-center ${isDark ? 'text-white' : 'text-gray-900'}`}>to</span>
              <DatePicker selected={end} onChange={setEnd} className={`flex-1 p-2 rounded border ${isDark ? 'bg-[#0D1117] text-white border-gray-600' : 'bg-gray-100 text-gray-900 border-gray-300'}`} dateFormat="yyyy-MM-dd" />
            </div>
          )}
          <div className="flex justify-center gap-2 mt-4">
            <button onClick={save} className={`px-4 py-2 rounded font-bold transition ${isDark ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white'}`}>OK</button>
            <button onClick={hideDialog} className={`px-4 py-2 rounded font-bold transition ${isDark ? 'bg-gray-600 hover:bg-gray-700 text-white' : 'bg-gray-300 hover:bg-gray-400 text-gray-900'}`}>Cancel</button>
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
        <div className={`p-6 rounded-lg shadow-lg border-2 w-[350px] ${isDark ? 'bg-[#1F2537] border-blue-600' : 'bg-white border-blue-400'}`}>
          <h3 className={`text-lg font-bold text-center mb-4 ${isDark ? 'text-blue-600' : 'text-blue-500'}`}>
            <Calendar size={18} className="inline mr-2" /> Day of Month
          </h3>
          <div className="flex justify-center gap-4 mb-4">
            <label className="flex items-center"><input type="radio" checked={single} onChange={() => setSingle(true)} className="mr-2" /><span className={isDark ? 'text-white' : 'text-gray-900'}>Single</span></label>
            <label className="flex items-center"><input type="radio" checked={!single} onChange={() => setSingle(false)} className="mr-2" /><span className={isDark ? 'text-white' : 'text-gray-900'}>Range</span></label>
          </div>
          {single ? (
            <select value={day} onChange={e => setDay(+e.target.value)} className={`w-full p-2 rounded border ${isDark ? 'bg-[#0D1117] text-white border-gray-600' : 'bg-gray-100 text-gray-900 border-gray-300'}`}>
              {range(1, 31).map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          ) : (
            <div className="flex gap-2">
              <select value={from} onChange={e => setFrom(+e.target.value)} className={`flex-1 p-2 rounded border ${isDark ? 'bg-[#0D1117] text-white border-gray-600' : 'bg-gray-100 text-gray-900 border-gray-300'}`}>
                {range(1, 31).map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <span className={`self-center ${isDark ? 'text-white' : 'text-gray-900'}`}>–</span>
              <select value={to} onChange={e => setTo(+e.target.value)} className={`flex-1 p-2 rounded border ${isDark ? 'bg-[#0D1117] text-white border-gray-600' : 'bg-gray-100 text-gray-900 border-gray-300'}`}>
                {range(1, 31).map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          )}
          <button onClick={add} className={`w-full mt-3 mb-2 px-4 py-2 rounded font-bold transition ${isDark ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white'}`}>Add</button>
          <textarea readOnly value={temp.join(", ")} className={`w-full h-20 p-2 rounded border resize-none text-sm ${isDark ? 'bg-[#0D1117] text-white border-gray-600' : 'bg-gray-100 text-gray-900 border-gray-300'}`} />
          <div className="flex justify-center gap-2 mt-3">
            <button onClick={save} className={`px-4 py-2 rounded font-bold transition ${isDark ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white'}`}>OK</button>
            <button onClick={hideDialog} className={`px-4 py-2 rounded font-bold transition ${isDark ? 'bg-gray-600 hover:bg-gray-700 text-white' : 'bg-gray-300 hover:bg-gray-400 text-gray-900'}`}>Cancel</button>
          </div>
        </div>
      </div>
    );
  };
 
  const renderTags = (items, type) => (
    <div className="flex flex-wrap gap-2 mt-2">
      {items.map((it, i) => (
        <div key={i} className={`flex items-center px-2 py-1 rounded-full border text-xs ${isDark ? 'bg-[#0D1117] border-blue-600 text-blue-300' : 'bg-blue-50 border-blue-300 text-blue-600'}`}>
          <span>{it}</span>
          <button onClick={() => removeTag(type, it)} className="ml-1 bg-red-600 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs transition hover:bg-red-700">
            <X size={10} />
          </button>
        </div>
      ))}
    </div>
  );
 
  const RetryPopup = () => (
    <div className="fixed inset-0 bg-black/70 flex justify-center items-center z-70">
      <div className={`p-6 rounded-lg shadow-2xl border-2 max-w-sm w-full mx-4 ${isDark ? 'bg-[#1F2537] border-orange-600' : 'bg-white border-orange-400'}`}>
        <h3 className={`text-lg font-bold mb-3 flex items-center gap-2 ${isDark ? 'text-orange-400' : 'text-orange-500'}`}>
          ⚠️ No Response
        </h3>
        <p className={`text-sm mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>{retryMessage}</p>
        <div className="flex justify-center gap-3">
          <button
            onClick={retryFetchSchedules}
            disabled={isRetrying}
            className={`px-6 py-2 font-bold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed ${isDark ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white'}`}
          >
            {isRetrying ? 'Retrying...' : 'Retry'}
          </button>
          <button
            onClick={() => setShowRetryPopup(false)}
            disabled={isRetrying}
            className={`px-6 py-2 font-bold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed ${isDark ? 'bg-gray-600 hover:bg-gray-700 text-white' : 'bg-gray-300 hover:bg-gray-400 text-gray-900'}`}
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
      <div className={`relative p-6 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl border ${isDark ? 'bg-[#1F2537] border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`}>
        <button onClick={handleClose} className={`absolute top-3 right-3 z-10 transition ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}>
          <X size={20} />
        </button>

        <h2 className={`text-xl font-bold flex items-center gap-2 mb-4 pr-8 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          <Calendar size={20} /> {deviceType?.toUpperCase() || "ALL"} Schedule Manager
        </h2>

        {/* Error Banner */}
        {fetchError && (
          <div className={`mb-4 p-3 rounded-lg flex items-start gap-3 border ${isDark ? 'bg-yellow-500/10 border-yellow-500/30' : 'bg-yellow-50 border-yellow-300'}`}>
            <svg className={`w-5 h-5 flex-shrink-0 mt-0.5 ${isDark ? 'text-yellow-400' : 'text-yellow-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="flex-1">
              <p className={`text-sm ${isDark ? 'text-yellow-300' : 'text-yellow-600'}`}>{fetchError}</p>
            </div>
            <button
              onClick={() => {
                setFetchError(null);
                retryFetchSchedules();
              }}
              disabled={isRetrying}
              className={`px-3 py-1 text-xs rounded transition-colors disabled:opacity-50 ${isDark ? 'bg-yellow-600 hover:bg-yellow-700 text-white' : 'bg-yellow-500 hover:bg-yellow-600 text-white'}`}
            >
              {isRetrying ? 'Retrying...' : 'Retry'}
            </button>
            <button
              onClick={() => setFetchError(null)}
              className={isDark ? 'text-yellow-400 hover:text-yellow-300' : 'text-yellow-500 hover:text-yellow-600'}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
 
        {submitStatus && (
          <div className={`mb-3 p-2 rounded text-center font-medium text-white transition ${submitStatus === "success" ? (isDark ? "bg-green-600" : "bg-green-500") : (isDark ? "bg-red-600" : "bg-red-500")}`}>
            {submitStatus === "success" ? "Submitted!" : "Failed."}
          </div>
        )}
 
        {/* Form */}
        <div className="space-y-4 mb-6">
          <div>
            <label className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Type</label>
            <select value={newSchedule.type} onChange={e => setNewSchedule(p => ({ ...p, type: e.target.value }))} className={`w-full p-2 rounded border ${isDark ? 'bg-[#0D1117] text-white border-gray-600' : 'bg-gray-100 text-gray-900 border-gray-300'}`}>
              {types.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
 
          {newSchedule.type !== "Holiday" && (
            <>
              <div className="grid grid-cols-2 gap-4">
                {["Start", "Stop"].map((lbl, i) => (
                  <div key={lbl}>
                    <label className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{lbl} Time</label>
                    <div className="flex gap-1">
                      <input
                        type="text"
                        value={i ? newSchedule.stopTime : newSchedule.startTime}
                        readOnly
                        className={`flex-1 p-2 rounded border cursor-pointer ${isDark ? 'bg-[#0D1117] text-white border-gray-600' : 'bg-gray-100 text-gray-900 border-gray-300'}`}
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
                        className={`p-2 rounded transition ${isDark ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white'}`}
                      >
                        <Clock size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
 
              {/* Commented out Motion Sensor and Temperature Sensor controls
              <div className="grid grid-cols-2 gap-6 mt-4 border-t border-gray-700 pt-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newSchedule.MS === "ON"}
                    onChange={e => setNewSchedule(prev => ({ ...prev, MS: e.target.checked ? "ON" : "OFF" }))}
                    className="w-5 h-5 text-blue-600 bg-[#0D1117] border-gray-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-white font-medium">Motion Sensor (MS)</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newSchedule.TS === "ON"}
                    onChange={e => setNewSchedule(prev => ({ ...prev, TS: e.target.checked ? "ON" : "OFF" }))}
                    className="w-5 h-5 text-blue-600 bg-[#0D1117] border-gray-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-white font-medium">Temperature Sensor (TS)</span>
                </label>
              </div>
              */}
            </>
          )}
 
          {["days", "dates", "dayRanges"].map(f => (
            <div key={f}>
              <label className={`text-sm capitalize ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{f === "dayRanges" ? "Day of Month" : f}</label>
              <div className="flex gap-2 mt-1">
                <button onClick={() => showDialog(f)} className={`flex items-center gap-1 px-3 py-1.5 text-sm rounded transition ${isDark ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white'}`}>
                  <Calendar size={14} /> Select
                </button>
              </div>
              {renderTags(newSchedule[f], f)}
            </div>
          ))}
 
          <button
            onClick={saveEdit}
            className={`w-full mt-4 px-4 py-2 rounded-lg flex justify-center items-center gap-2 font-medium transition ${isDark ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white'}`}
          >
            <Plus size={16} /> {editingIndex !== null ? "Update" : "Add"} Schedule
          </button>
          {editingIndex !== null && (
            <button onClick={resetNewSchedule} className={`w-full px-4 py-2 rounded-lg transition ${isDark ? 'bg-gray-600 hover:bg-gray-700 text-white' : 'bg-gray-300 hover:bg-gray-400 text-gray-900'}`}>Cancel Edit</button>
          )}
        </div>
 
        {/* Current Schedules */}
        <div className={`border-t pt-4 ${isDark ? 'border-gray-700' : 'border-gray-300'}`}>
          <h3 className={`text-sm font-semibold mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Current Schedules</h3>
          <div className="max-h-64 overflow-y-auto space-y-2">
            {schedules.length === 0 ? (
              <p className={`text-center text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>No schedules</p>
            ) : (
              schedules.map((s, i) => (
                <div key={i} className={`p-3 rounded-lg flex justify-between items-start text-sm border ${isDark ? 'bg-[#0D1117] border-gray-700' : 'bg-gray-50 border-gray-300'}`}>
                  <div>
                    <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{s.Type} ({s.CONTROL})</p>
                    {s.Type !== "Holiday" && <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>{s.StartTime} to {s.StopTime}</p>}
                    {s.Days && <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Days: {s.Days}</p>}
                    {s.Date && <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Dates: {s.Date}</p>}
                    {s.PeriodDate && <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Day: {s.PeriodDate}</p>}
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => startEdit(i)} className={`p-1 rounded transition ${isDark ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-yellow-500 hover:bg-yellow-600'} text-white`}><Edit2 size={14} /></button>
                    <button onClick={() => deleteSchedule(i)} className={`p-1 rounded transition ${isDark ? 'bg-red-600 hover:bg-red-700' : 'bg-red-500 hover:bg-red-600'} text-white`}><Trash2 size={14} /></button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
 
        {/* Submit Button */}
        <button
          onClick={submitSchedules}
          disabled={isSubmitting || !schedules.length}
          className={`w-full mt-6 flex justify-center items-center gap-2 px-4 py-3 rounded-lg font-bold transition ${
            isSubmitting || !schedules.length ? (isDark ? "bg-gray-600 cursor-not-allowed" : "bg-gray-300 cursor-not-allowed") : (isDark ? "bg-green-600 hover:bg-green-700 text-white" : "bg-green-500 hover:bg-green-600 text-white")
          }`}
        >
          {isSubmitting ? "Submitting..." : <><Send size={18} /> Submit to Device</>}
        </button>
      
      {/* Dialogs */}
      {activeDialog === "time" && <TimePickerDialog />}
      {activeDialog === "days" && <DaysDialog />}
      {activeDialog === "dates" && <DatesDialog />}
      {activeDialog === "dayRanges" && <DayRangesDialog />}
 
      {/* Alert Modal */}
      <AlertModal isOpen={alert.open} title={alert.title} message={alert.message} onClose={closeAlert} />
     
      {/* Retry Popup */}
      {showRetryPopup && <RetryPopup />}
    </div>
    </div>
  );
};
 
export default ScheduleManager;
 