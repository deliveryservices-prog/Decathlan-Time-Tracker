
import React, { useState, useMemo } from 'react';
import { TimesheetEntry, Employee, Setting } from '../types';
import { Search, Calendar, Edit2, Trash2, X, CheckCircle, Clock, Coffee, ArrowRight } from 'lucide-react';
import { db } from '../db';

interface Props {
  timesheet: TimesheetEntry[];
  employees: Employee[];
  settings: Setting[];
  onUpdate?: () => void;
}

const HistoryView: React.FC<Props> = ({ timesheet, employees, settings, onUpdate }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [editingEntry, setEditingEntry] = useState<TimesheetEntry | null>(null);
  const [confirmDeleteEntryId, setConfirmDeleteEntryId] = useState<string | null>(null);
  const [showToast, setShowToast] = useState<{message: string, type: 'success' | 'error' | 'info'} | null>(null);

  const employeeDeductionPct = useMemo(() => {
    return settings
      .filter(s => s.taxType.includes('Employee'))
      .reduce((acc, curr) => acc + curr.percentage, 0);
  }, [settings]);

  const filteredHistory = useMemo(() => {
    return timesheet
      .filter(entry => entry.timeOut !== null) 
      .filter(entry => {
        const matchesSearch = entry.employeeName.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesDate = !dateFilter || entry.date === dateFilter;
        return matchesSearch && matchesDate;
      })
      .sort((a, b) => new Date(b.timeIn).getTime() - new Date(a.timeIn).getTime());
  }, [timesheet, searchTerm, dateFilter]);

  const toLocalISO = (isoStr: string | null | undefined): string => {
    if (!isoStr) return '';
    const date = new Date(isoStr);
    if (isNaN(date.getTime())) return '';
    const offset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 16);
  };

  const calculateFinancials = (entry: TimesheetEntry) => {
    const emp = employees.find(e => e.employeeId === entry.employeeId);
    if (!emp) return { gross: 0, net: 0, photo: '' };
    const gross = entry.totalHours * emp.grossHourlyWage;
    const net = gross * (1 - employeeDeductionPct / 100);
    return { gross, net, photo: emp.photo };
  };

  const handleUpdateEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEntry) return;

    const timeIn = new Date(editingEntry.timeIn);
    const timeOut = editingEntry.timeOut ? new Date(editingEntry.timeOut) : null;
    
    if (timeOut) {
      const diffMs = timeOut.getTime() - timeIn.getTime();
      const breakMs = (editingEntry.breakMinutes || 0) * 60 * 1000;
      const netMs = diffMs - breakMs;
      const diffHrs = parseFloat((netMs / (1000 * 60 * 60)).toFixed(2));
      
      const updatedEntry = {
        ...editingEntry,
        date: timeIn.toISOString().split('T')[0],
        totalHours: Math.max(0, diffHrs)
      };
      
      db.updateTimesheetEntry(updatedEntry);
      setEditingEntry(null);
      setShowToast({ message: 'Record updated successfully!', type: 'success' });
      setTimeout(() => setShowToast(null), 3000);
      if (onUpdate) onUpdate();
    }
  };

  const handleDeleteEntry = (id: string) => {
    db.deleteTimesheetEntry(id);
    setConfirmDeleteEntryId(null);
    setShowToast({ message: 'Record deleted.', type: 'info' });
    setTimeout(() => setShowToast(null), 3000);
    if (onUpdate) onUpdate();
  };

  return (
    <div className="space-y-6 relative">
      {showToast && (
        <div className={`fixed top-4 right-4 z-[100] flex items-center gap-3 px-6 py-4 rounded-2xl shadow-xl animate-in slide-in-from-top-4 ${
          showToast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-white'
        }`}>
          <CheckCircle size={20} />
          <p className="font-black text-sm uppercase tracking-wider">{showToast.message}</p>
        </div>
      )}

      {/* Search & Filter */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Search team member..."
            className="w-full pl-12 pr-4 py-4 md:py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 outline-none font-bold"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="md:w-64 relative">
          <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="date"
            className="w-full pl-12 pr-4 py-4 md:py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 outline-none font-bold"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-4">
        {/* Desktop Header */}
        <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 bg-slate-50 rounded-xl text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">
           <span className="col-span-3">Employee</span>
           <span className="col-span-2">Date</span>
           <span className="col-span-2">Timeline</span>
           <span className="col-span-1">Break</span>
           <span className="col-span-1">Net Hrs</span>
           <span className="col-span-1">Gross €</span>
           <span className="col-span-1">Net €</span>
           <span className="col-span-1">Actions</span>
        </div>

        {filteredHistory.length > 0 ? (
          filteredHistory.map(entry => {
            const { gross, net, photo } = calculateFinancials(entry);
            return (
              <div 
                key={entry.id} 
                className="group bg-white flex flex-col md:grid md:grid-cols-12 items-center gap-4 p-6 md:px-6 md:py-3 border border-slate-100 rounded-[2.5rem] md:rounded-xl hover:shadow-lg transition-all text-center"
              >
                {/* Employee Info - Top on Mobile, Left on Desktop */}
                <div className="w-full md:col-span-3 flex flex-col md:flex-row items-center md:justify-start gap-3 md:gap-4 text-center md:text-left">
                  <div className="w-16 h-16 md:w-10 md:h-10 rounded-2xl bg-indigo-50 overflow-hidden shadow-sm shrink-0 border-2 border-white">
                    {photo ? (
                      <img src={photo} alt={entry.employeeName} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-indigo-600 text-white font-black text-xl md:text-sm uppercase italic">
                        {entry.employeeName.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-black text-slate-800 truncate text-lg md:text-sm">{entry.employeeName}</h4>
                  </div>
                </div>

                {/* Mobile Separator */}
                <div className="md:hidden w-full h-px bg-slate-50"></div>

                {/* Date & Timeline Group */}
                <div className="w-full md:col-span-2 flex flex-col items-center gap-1">
                   <span className="md:hidden text-[9px] font-black text-slate-400 uppercase tracking-tighter">Shift Date</span>
                   <span className="text-sm md:text-[11px] font-black text-slate-600 bg-slate-100 px-4 py-1.5 rounded-xl uppercase">
                    {new Date(entry.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>

                <div className="w-full md:col-span-2 flex flex-col items-center gap-1">
                   <span className="md:hidden text-[9px] font-black text-slate-400 uppercase tracking-tighter">Clock Timeline</span>
                   <div className="flex items-center justify-center gap-3">
                    <span className="text-xs font-black text-emerald-600">
                      {new Date(entry.timeIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <ArrowRight size={12} className="text-slate-200" />
                    <span className="text-xs font-black text-rose-600">
                      {entry.timeOut && new Date(entry.timeOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>

                {/* Grid for values on Mobile */}
                <div className="w-full grid grid-cols-3 md:contents gap-4">
                  <div className="flex flex-col items-center gap-1 md:col-span-1">
                    <span className="md:hidden text-[9px] font-black text-slate-400 uppercase">Break</span>
                    <span className="text-xs font-bold text-slate-500 bg-amber-50 md:bg-transparent px-3 py-1 rounded-lg md:p-0">{entry.breakMinutes || 0}m</span>
                  </div>

                  <div className="flex flex-col items-center gap-1 md:col-span-1">
                    <span className="md:hidden text-[9px] font-black text-slate-400 uppercase">Net Hrs</span>
                    <span className="text-sm font-black text-slate-800">{entry.totalHours.toFixed(2)}h</span>
                  </div>

                  <div className="flex flex-col items-center gap-1 md:col-span-1">
                    <span className="md:hidden text-[9px] font-black text-slate-400 uppercase">Gross</span>
                    <span className="text-xs font-bold text-slate-500">€{gross.toFixed(2)}</span>
                  </div>
                </div>

                {/* Net Total - Highlighted */}
                <div className="w-full md:col-span-1 flex flex-col items-center gap-1 pt-4 md:pt-0">
                  <span className="md:hidden text-[9px] font-black text-slate-400 uppercase">Net Payable</span>
                  <span className="text-lg md:text-sm font-black text-indigo-600 bg-indigo-50 md:bg-transparent w-full md:w-auto py-2 md:py-0 rounded-2xl">€{net.toFixed(2)}</span>
                </div>

                {/* Actions */}
                <div className="w-full md:col-span-1 flex justify-center gap-4 pt-4 md:pt-0">
                  <button 
                    onClick={() => setEditingEntry(entry)} 
                    className="flex-1 md:flex-none p-3 md:p-2 bg-indigo-50 text-indigo-600 rounded-2xl md:rounded-xl hover:bg-indigo-600 hover:text-white transition-all flex items-center justify-center gap-2"
                  >
                    <Edit2 size={16} />
                    <span className="md:hidden font-black text-xs uppercase">Edit</span>
                  </button>
                  <button 
                    onClick={() => setConfirmDeleteEntryId(entry.id)} 
                    className="flex-1 md:flex-none p-3 md:p-2 bg-rose-50 text-rose-600 rounded-2xl md:rounded-xl hover:bg-rose-600 hover:text-white transition-all flex items-center justify-center gap-2"
                  >
                    <Trash2 size={16} />
                    <span className="md:hidden font-black text-xs uppercase">Delete</span>
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="flex flex-col items-center justify-center py-16 bg-slate-50/50 rounded-[2rem] border border-dashed border-slate-200 text-slate-400 text-center">
             <Calendar size={48} className="opacity-20 mb-4" />
             <p className="font-black text-lg text-slate-600">No matching records found</p>
             <p className="text-sm">Try adjusting your filters or search term.</p>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingEntry && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[110] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in duration-200">
            <div className="px-8 py-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xl font-black text-slate-800">Edit Log</h3>
              <button onClick={() => setEditingEntry(null)} className="p-2 text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleUpdateEntry} className="p-8 space-y-6 text-center">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-2 justify-center"><Clock size={12} /> Shift Start</label>
                <input type="datetime-local" className="w-full px-5 py-3 border border-slate-200 rounded-2xl font-bold text-center bg-slate-50" value={toLocalISO(editingEntry.timeIn)} onChange={e => setEditingEntry({...editingEntry, timeIn: new Date(e.target.value).toISOString()})} />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-2 justify-center"><Clock size={12} /> Shift End</label>
                <input type="datetime-local" className="w-full px-5 py-3 border border-slate-200 rounded-2xl font-bold text-center bg-slate-50" value={toLocalISO(editingEntry.timeOut)} onChange={e => setEditingEntry({...editingEntry, timeOut: new Date(e.target.value).toISOString()})} />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-2 justify-center"><Coffee size={12} /> Break Minutes</label>
                <input type="number" className="w-full px-5 py-3 border border-slate-200 rounded-2xl font-bold text-center bg-slate-50" value={editingEntry.breakMinutes || 0} onChange={e => setEditingEntry({...editingEntry, breakMinutes: parseInt(e.target.value) || 0})} />
              </div>
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setEditingEntry(null)} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black">Cancel</button>
                <button type="submit" className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-lg shadow-indigo-100">Update</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {confirmDeleteEntryId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[110] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] p-8 max-sm w-full shadow-2xl text-center">
            <h3 className="text-xl font-bold text-slate-800 mb-6 uppercase tracking-tighter italic">Delete Entry?</h3>
            <p className="text-slate-500 text-sm mb-8 font-medium italic">This action cannot be undone. The financial record for this shift will be permanently removed.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDeleteEntryId(null)} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase text-xs tracking-widest">Cancel</button>
              <button onClick={() => handleDeleteEntry(confirmDeleteEntryId)} className="flex-1 py-4 bg-rose-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg shadow-rose-100">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HistoryView;
