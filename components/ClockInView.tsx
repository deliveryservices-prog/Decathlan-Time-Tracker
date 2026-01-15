
import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../db';
import { Employee, HolidayEntry } from '../types';
import { Check, UserPlus, Info, Calendar as CalendarIcon, Clock as ClockIcon, Palmtree, ShieldAlert } from 'lucide-react';

interface Props {
  employees: Employee[];
  activeEmployeeIds: string[];
  holidays: HolidayEntry[];
  onSuccess: () => void;
}

const ClockInView: React.FC<Props> = ({ employees, activeEmployeeIds, holidays, onSuccess }) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [manualDate, setManualDate] = useState('');
  const [manualTime, setManualTime] = useState('');
  const [overriddenIds, setOverriddenIds] = useState<string[]>([]);

  // Set defaults to current local time on mount
  useEffect(() => {
    const now = new Date();
    setManualDate(now.toISOString().split('T')[0]);
    setManualTime(now.toTimeString().slice(0, 5));
  }, []);

  const getHolidayForEmployee = (empId: string, dateStr: string) => {
    if (!dateStr) return null;
    const targetDate = new Date(dateStr);
    targetDate.setHours(0, 0, 0, 0);

    return holidays.find(h => {
      if (h.employeeId !== empId) return false;
      const start = new Date(h.startDate);
      const end = new Date(h.endDate);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      return targetDate >= start && targetDate <= end;
    });
  };

  const toggleSelect = (id: string) => {
    if (activeEmployeeIds.includes(id)) return;
    
    const isOnHoliday = !!getHolidayForEmployee(id, manualDate);
    const isOverridden = overriddenIds.includes(id);

    if (isOnHoliday && !isOverridden) {
      // Don't toggle, let the card show the override UI instead
      return;
    }

    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleOverride = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setOverriddenIds(prev => [...prev, id]);
    setSelectedIds(prev => [...prev, id]);
  };

  const handleClockIn = () => {
    if (selectedIds.length === 0) return;
    
    const customTimestamp = `${manualDate}T${manualTime}:00`;
    db.clockIn(selectedIds, customTimestamp);
    
    setSelectedIds([]);
    setOverriddenIds([]);
    onSuccess();
  };

  return (
    <div className="space-y-6">
      <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex gap-3 text-indigo-800 text-sm">
        <Info className="shrink-0" size={18} />
        <div>
          <p className="font-bold">Clock In System</p>
          <p>Employees on leave are blocked by default. Use "Special Request" if clock-in is required during holiday.</p>
        </div>
      </div>

      {/* Manual Time Selection */}
      <div className="flex flex-col sm:flex-row gap-4 p-4 bg-slate-50 border border-slate-200 rounded-xl">
        <div className="flex-1 space-y-1">
          <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
            <CalendarIcon size={12} /> Date of Entry
          </label>
          <input 
            type="date" 
            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 outline-none"
            value={manualDate}
            onChange={(e) => {
              setManualDate(e.target.value);
              setSelectedIds([]); // Clear selection as holiday status might change
              setOverriddenIds([]);
            }}
          />
        </div>
        <div className="flex-1 space-y-1">
          <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
            <ClockIcon size={12} /> Start Time
          </label>
          <input 
            type="time" 
            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 outline-none"
            value={manualTime}
            onChange={(e) => setManualTime(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {employees.map(emp => {
          const isActive = activeEmployeeIds.includes(emp.employeeId);
          const isSelected = selectedIds.includes(emp.employeeId);
          const holidayRecord = getHolidayForEmployee(emp.employeeId, manualDate);
          const isOverridden = overriddenIds.includes(emp.employeeId);
          const blockSelection = !!holidayRecord && !isOverridden;

          return (
            <div
              key={emp.employeeId}
              onClick={() => !isActive && toggleSelect(emp.employeeId)}
              className={`flex flex-col p-4 rounded-xl border transition-all text-left relative overflow-hidden cursor-pointer ${
                isActive 
                  ? 'bg-slate-50 border-slate-100 opacity-60 cursor-not-allowed' 
                  : blockSelection
                    ? 'bg-amber-50 border-amber-200'
                    : isSelected
                      ? 'bg-indigo-50 border-indigo-200 ring-2 ring-indigo-500/20'
                      : 'bg-white border-slate-200 hover:border-indigo-300'
              }`}
            >
              <div className="flex items-center gap-4">
                <img 
                  src={emp.photo} 
                  alt={emp.nameAndSurname} 
                  className="w-12 h-12 rounded-full object-cover border-2 border-slate-100"
                />
                <div className="flex-1 overflow-hidden">
                  <p className="font-bold text-slate-800 truncate">{emp.nameAndSurname}</p>
                </div>
                
                <div className={`w-6 h-6 rounded-full border flex items-center justify-center transition-colors ${
                  isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300'
                }`}>
                  {isSelected && <Check size={14} strokeWidth={3} />}
                  {isActive && <span className="text-[8px] font-bold text-slate-400">IN</span>}
                  {blockSelection && <Palmtree size={14} className="text-amber-600" />}
                </div>
              </div>

              {/* Holiday Overlay UI */}
              {blockSelection && (
                <div className="mt-3 pt-3 border-t border-amber-200/50 flex flex-col gap-2">
                   <div className="flex items-center gap-2 text-[10px] font-bold text-amber-700 uppercase">
                      <ShieldAlert size={12} />
                      On Holiday until {new Date(holidayRecord.endDate).toLocaleDateString()}
                   </div>
                   <button
                    onClick={(e) => handleOverride(e, emp.employeeId)}
                    className="w-full py-1.5 bg-amber-600 text-white text-[10px] font-bold rounded-lg hover:bg-amber-700 transition-colors shadow-sm"
                   >
                     ALLOW AS SPECIAL REQUEST
                   </button>
                </div>
              )}

              {isOverridden && (
                <div className="mt-2 flex items-center gap-1.5 text-[9px] font-bold text-indigo-600 uppercase">
                  <ShieldAlert size={10} />
                  Special Request Approved
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="sticky bottom-0 bg-white pt-4 border-t border-slate-100 flex items-center justify-between">
        <div className="flex flex-col">
          <p className="text-sm text-slate-500 font-medium">
            {selectedIds.length} employee{selectedIds.length !== 1 && 's'} selected
          </p>
          {overriddenIds.length > 0 && (
            <p className="text-[10px] text-amber-600 font-bold uppercase">
              Includes {overriddenIds.length} special request{overriddenIds.length !== 1 && 's'}
            </p>
          )}
        </div>
        <button
          onClick={handleClockIn}
          disabled={selectedIds.length === 0}
          className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-600/20 disabled:opacity-50 disabled:shadow-none hover:bg-indigo-700 active:scale-95 transition-all"
        >
          <UserPlus size={20} />
          Confirm Clock In
        </button>
      </div>
    </div>
  );
};

export default ClockInView;
