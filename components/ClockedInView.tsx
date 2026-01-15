
import React, { useState, useEffect } from 'react';
import { db } from '../db';
import { TimesheetEntry, Employee } from '../types';
import { LogOut, Timer, Clock as ClockIcon, AlertCircle, Coffee } from 'lucide-react';

interface Props {
  activeEntries: TimesheetEntry[];
  employees: Employee[];
  onSuccess: () => void;
}

const ClockedInView: React.FC<Props> = ({ activeEntries, employees, onSuccess }) => {
  const [outTimes, setOutTimes] = useState<Record<string, string>>({});
  const [breaks, setBreaks] = useState<Record<string, number>>({});

  useEffect(() => {
    const now = new Date().toTimeString().slice(0, 5);
    const updatedTimes = { ...outTimes };
    const updatedBreaks = { ...breaks };
    
    activeEntries.forEach(entry => {
      if (!updatedTimes[entry.id]) {
        updatedTimes[entry.id] = now;
      }
      if (updatedBreaks[entry.id] === undefined) {
        updatedBreaks[entry.id] = 0;
      }
    });
    setOutTimes(updatedTimes);
    setBreaks(updatedBreaks);
  }, [activeEntries]);

  const validateTime = (entry: TimesheetEntry) => {
    const timeOutStr = outTimes[entry.id];
    if (!timeOutStr) return true;

    const originalIn = new Date(entry.timeIn);
    const [hrs, mins] = timeOutStr.split(':').map(Number);
    const targetOut = new Date(originalIn.getFullYear(), originalIn.getMonth(), originalIn.getDate(), hrs, mins);
    
    return targetOut.getTime() > originalIn.getTime();
  };

  const handleClockOut = (entry: TimesheetEntry) => {
    if (!validateTime(entry)) return;

    const timeString = outTimes[entry.id];
    const breakVal = breaks[entry.id] || 0;
    const originalDate = new Date(entry.timeIn);
    const [hrs, mins] = timeString.split(':').map(Number);
    const customDate = new Date(originalDate.getFullYear(), originalDate.getMonth(), originalDate.getDate(), hrs, mins);
    
    db.clockOut(entry.id, customDate.toISOString(), breakVal);
    onSuccess();
  };

  const handleUpdateInTime = (entry: TimesheetEntry, newTimeValue: string) => {
    const [hrs, mins] = newTimeValue.split(':').map(Number);
    const originalDate = new Date(entry.timeIn);
    const updatedDate = new Date(originalDate.getFullYear(), originalDate.getMonth(), originalDate.getDate(), hrs, mins);
    
    const updatedEntry: TimesheetEntry = {
      ...entry,
      timeIn: updatedDate.toISOString(),
    };
    
    db.updateTimesheetEntry(updatedEntry);
    onSuccess();
  };

  const updateOutTime = (id: string, time: string) => {
    setOutTimes(prev => ({ ...prev, [id]: time }));
  };

  const updateBreak = (id: string, mins: number) => {
    setBreaks(prev => ({ ...prev, [id]: mins }));
  };

  const getDuration = (timeIn: string) => {
    const start = new Date(timeIn).getTime();
    const now = new Date().getTime();
    const diff = now - start;
    if (diff < 0) return "0h 0m";
    const hrs = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hrs}h ${mins}m`;
  };

  if (activeEntries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <div className="bg-slate-50 p-8 rounded-full mb-4 shadow-inner">
          <Timer size={64} className="text-slate-200" />
        </div>
        <p className="font-black text-xl text-slate-800 text-center">No active shifts</p>
        <p className="text-sm font-medium mt-1 text-center">Start by clocking in employees in the first tab.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Desktop Table Header */}
      <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-4 bg-slate-50 rounded-2xl text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">
        <span className="col-span-3">Employee</span>
        <span className="col-span-2">In Time</span>
        <span className="col-span-2">Duration</span>
        <span className="col-span-2">Break</span>
        <span className="col-span-2">Out Time</span>
        <span className="col-span-1">Exit</span>
      </div>

      <div className="space-y-4">
        {activeEntries.map(entry => {
          const inTimeValue = new Date(entry.timeIn).toTimeString().slice(0, 5);
          const isValid = validateTime(entry);
          const employee = employees.find(e => e.employeeId === entry.employeeId);
          
          return (
            <div 
              key={entry.id} 
              className={`flex flex-col md:grid md:grid-cols-12 items-center gap-4 p-6 md:px-6 md:py-4 bg-white border rounded-[2.5rem] md:rounded-2xl shadow-sm transition-all text-center ${
                isValid ? 'border-slate-100 hover:shadow-md' : 'border-rose-200 bg-rose-50/20'
              }`}
            >
              {/* Employee Photo & Info */}
              <div className="w-full col-span-3 flex flex-col md:flex-row items-center gap-3 md:gap-4">
                <div className="w-14 h-14 md:w-11 md:h-11 rounded-2xl bg-indigo-600 overflow-hidden shadow-md shrink-0 flex items-center justify-center border-2 border-white">
                  {employee?.photo ? (
                    <img src={employee.photo} alt={entry.employeeName} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-white font-black text-xl md:text-base">
                      {entry.employeeName.charAt(0)}
                    </span>
                  )}
                </div>
                <div className="overflow-hidden">
                  <p className="font-black text-slate-800 truncate text-lg md:text-sm">{entry.employeeName}</p>
                </div>
              </div>

              {/* Mobile Separator */}
              <div className="md:hidden w-full h-px bg-slate-100 my-2"></div>

              {/* Grid Area */}
              <div className="w-full col-span-8 grid grid-cols-2 md:grid-cols-8 gap-4 items-end">
                
                {/* Editable Clock In */}
                <div className="flex flex-col gap-1.5 items-center col-span-1 md:col-span-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase flex items-center gap-1.5">
                     <ClockIcon size={12} className="text-indigo-400" /> Start
                  </label>
                  <input 
                    type="time"
                    value={inTimeValue}
                    onChange={(e) => handleUpdateInTime(entry, e.target.value)}
                    className={`w-full px-4 py-2.5 md:py-1.5 border rounded-xl text-sm font-black focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all text-center ${
                      isValid ? 'border-slate-200 bg-slate-50' : 'border-rose-400 bg-rose-50 text-rose-700'
                    }`}
                  />
                </div>

                {/* Duration */}
                <div className="flex flex-col gap-1.5 items-center col-span-1 md:col-span-2">
                   <label className="text-[9px] font-black text-slate-400 uppercase flex items-center gap-1.5">
                     <Timer size={12} className="text-emerald-400" /> Live
                  </label>
                  <div className="w-full flex items-center justify-center bg-indigo-50 text-indigo-700 px-4 py-2.5 md:py-1.5 rounded-xl border border-indigo-100">
                    <span className="font-black text-sm md:text-xs tabular-nums whitespace-nowrap">{getDuration(entry.timeIn)}</span>
                  </div>
                </div>

                {/* Break Input */}
                <div className="flex flex-col gap-1.5 items-center col-span-1 md:col-span-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase flex items-center gap-1.5">
                     <Coffee size={12} className="text-amber-400" /> Break
                  </label>
                  <select 
                    value={breaks[entry.id] || 0}
                    onChange={(e) => updateBreak(entry.id, parseInt(e.target.value))}
                    className="w-full px-4 py-2.5 md:py-1.5 border border-slate-200 rounded-xl text-sm font-black focus:ring-4 focus:ring-indigo-500/10 outline-none text-center appearance-none bg-slate-50"
                  >
                    <option value="0">0m</option>
                    <option value="15">15m</option>
                    <option value="30">30m</option>
                    <option value="45">45m</option>
                    <option value="60">60m</option>
                  </select>
                </div>

                {/* Clock Out Selection */}
                <div className="flex flex-col gap-1.5 items-center col-span-1 md:col-span-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase flex items-center gap-1.5">
                     <LogOut size={12} className="text-rose-400" /> End
                  </label>
                  <input 
                    type="time"
                    value={outTimes[entry.id] || ''}
                    onChange={(e) => updateOutTime(entry.id, e.target.value)}
                    className={`w-full px-4 py-2.5 md:py-1.5 border rounded-xl text-sm font-black focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all text-center ${
                      isValid ? 'border-slate-200' : 'border-rose-400 bg-rose-50 text-rose-700'
                    }`}
                  />
                </div>
              </div>

              {/* Action Button */}
              <div className="w-full col-span-1 pt-4 md:pt-0 flex justify-center">
                <button
                  onClick={() => handleClockOut(entry)}
                  disabled={!isValid}
                  title="Clock Out"
                  className={`w-full md:w-11 h-12 md:h-11 rounded-2xl transition-all border shadow-lg flex items-center justify-center ${
                    isValid 
                      ? 'bg-rose-600 text-white border-rose-500 shadow-rose-200 hover:bg-rose-700 active:scale-95' 
                      : 'bg-slate-100 text-slate-300 border-slate-100 cursor-not-allowed shadow-none'
                  }`}
                >
                  <LogOut size={20} className="md:size-4" />
                  <span className="md:hidden ml-2 font-black text-xs uppercase tracking-widest">Clock Out Now</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
      
      {!activeEntries.every(validateTime) && (
        <div className="p-4 bg-rose-600 text-white rounded-2xl flex items-center gap-3 text-xs font-black uppercase tracking-wider shadow-lg shadow-rose-200 animate-pulse justify-center text-center">
           <AlertCircle size={18} className="shrink-0" />
           Time Error: Clock-out must be after clock-in
        </div>
      )}
    </div>
  );
};

export default ClockedInView;
