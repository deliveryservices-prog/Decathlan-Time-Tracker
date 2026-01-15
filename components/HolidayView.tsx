
import React, { useState, useMemo } from 'react';
import { db } from '../db';
import { Employee, HolidayEntry, PublicHoliday } from '../types';
import { Calendar, Users, Trash2, Plus, Info, Sun, Flag, Edit2, X, CheckCircle } from 'lucide-react';

interface Props {
  employees: Employee[];
  holidays: HolidayEntry[];
  publicHolidays: PublicHoliday[];
  onUpdate: () => void;
}

const HolidayView: React.FC<Props> = ({ employees, holidays, publicHolidays, onUpdate }) => {
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [phName, setPhName] = useState('');
  const [phDate, setPhDate] = useState('');
  const [editingHoliday, setEditingHoliday] = useState<HolidayEntry | null>(null);
  const [editingPH, setEditingPH] = useState<PublicHoliday | null>(null);

  const handleAddHoliday = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmpId || !startDate || !endDate) return;

    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    const employee = employees.find(emp => emp.employeeId === selectedEmpId);
    
    const newHoliday: HolidayEntry = {
      id: crypto.randomUUID(),
      employeeId: selectedEmpId,
      employeeName: employee?.nameAndSurname || 'Unknown',
      startDate,
      endDate,
      totalDays: diffDays
    };

    db.saveHoliday(newHoliday);
    setStartDate('');
    setEndDate('');
    onUpdate();
  };

  const handleUpdateHoliday = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingHoliday) return;

    const start = new Date(editingHoliday.startDate);
    const end = new Date(editingHoliday.endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    const employee = employees.find(emp => emp.employeeId === editingHoliday.employeeId);
    const updated: HolidayEntry = {
      ...editingHoliday,
      employeeName: employee?.nameAndSurname || 'Unknown',
      totalDays: diffDays
    };

    db.updateHoliday(updated);
    setEditingHoliday(null);
    onUpdate();
  };

  const handleAddPublicHoliday = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phName || !phDate) return;

    const newPH: PublicHoliday = {
      id: crypto.randomUUID(),
      name: phName,
      date: phDate
    };

    db.savePublicHoliday(newPH);
    setPhName('');
    setPhDate('');
    onUpdate();
  };

  const handleUpdatePH = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPH) return;

    db.updatePublicHoliday(editingPH);
    setEditingPH(null);
    onUpdate();
  };

  const employeeHolidays = useMemo(() => {
    const map: Record<string, number> = {};
    holidays.forEach(h => {
      map[h.employeeId] = (map[h.employeeId] || 0) + h.totalDays;
    });
    return map;
  }, [holidays]);

  return (
    <div className="space-y-12 pb-10">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 bg-slate-50 border border-slate-100 p-6 rounded-2xl h-fit">
          <div className="flex items-center gap-2 mb-6">
            <Plus className="text-indigo-600" size={20} />
            <h3 className="font-black text-slate-800 uppercase text-xs tracking-wider">Book Vacation</h3>
          </div>
          <form onSubmit={handleAddHoliday} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-1">
                <Users size={12} /> Employee
              </label>
              <select 
                required
                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:ring-4 focus:ring-indigo-500/10 outline-none"
                value={selectedEmpId}
                onChange={e => setSelectedEmpId(e.target.value)}
              >
                <option value="">Select Employee</option>
                {employees.map(emp => (
                  <option key={emp.employeeId} value={emp.employeeId}>{emp.nameAndSurname}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-1">
                <Calendar size={12} /> Start Date
              </label>
              <input 
                required
                type="date" 
                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:ring-4 focus:ring-indigo-500/10 outline-none"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-1">
                <Calendar size={12} /> End Date
              </label>
              <input 
                required
                type="date" 
                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:ring-4 focus:ring-indigo-500/10 outline-none"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
              />
            </div>

            <button
              type="submit"
              className="w-full px-4 py-3 bg-indigo-600 text-white rounded-xl font-black shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 active:scale-95 transition-all text-xs uppercase tracking-widest"
            >
              Confirm Log
            </button>
          </form>
        </div>

        <div className="lg:col-span-2 space-y-8">
           <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
             <div className="flex items-center justify-between mb-6">
               <h3 className="font-black text-slate-800 flex items-center gap-2 uppercase text-xs tracking-wider">
                 <Flag className="text-rose-500" size={20} />
                 Public Holidays
               </h3>
             </div>
             
             <form onSubmit={handleAddPublicHoliday} className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 bg-slate-50 p-4 rounded-xl border border-slate-100">
               <div className="space-y-1">
                 <label className="text-[10px] font-black text-slate-500 uppercase">Holiday Name</label>
                 <input 
                  required
                  type="text" 
                  placeholder="e.g. Christmas"
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm font-bold"
                  value={phName}
                  onChange={e => setPhName(e.target.value)}
                 />
               </div>
               <div className="space-y-1">
                 <label className="text-[10px] font-black text-slate-500 uppercase">Date</label>
                 <input 
                  required
                  type="date" 
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm font-bold"
                  value={phDate}
                  onChange={e => setPhDate(e.target.value)}
                 />
               </div>
               <div className="flex items-end">
                 <button 
                  type="submit"
                  className="w-full py-2 bg-rose-600 text-white rounded-xl font-black text-xs uppercase hover:bg-rose-700 transition-colors tracking-widest"
                 >
                   Register
                 </button>
               </div>
             </form>

             <div className="overflow-x-auto">
               <table className="w-full text-center text-sm">
                 <thead>
                   <tr className="text-slate-400 uppercase text-[10px] font-black border-b border-slate-50">
                     <th className="pb-3 px-2">Holiday Name</th>
                     <th className="pb-3 px-2">Observed Date</th>
                     <th className="pb-3 px-2 text-right">Actions</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-50">
                   {publicHolidays.length === 0 ? (
                     <tr><td colSpan={3} className="py-8 text-center text-slate-400 font-bold italic">No public holidays registered.</td></tr>
                   ) : (
                     publicHolidays.sort((a,b) => a.date.localeCompare(b.date)).map(ph => (
                       <tr key={ph.id} className="group hover:bg-slate-50 transition-colors">
                         <td className="py-4 px-2 font-black text-slate-700">{ph.name}</td>
                         <td className="py-4 px-2 text-slate-500 font-bold">{new Date(ph.date).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}</td>
                         <td className="py-4 px-2 text-right">
                           <div className="flex justify-end gap-1">
                             <button 
                              onClick={() => setEditingPH(ph)}
                              className="p-2 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"
                             >
                               <Edit2 size={14} />
                             </button>
                             <button 
                              onClick={() => { db.deletePublicHoliday(ph.id); onUpdate(); }}
                              className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                             >
                               <Trash2 size={14} />
                             </button>
                           </div>
                         </td>
                       </tr>
                     ))
                   )}
                 </tbody>
               </table>
             </div>
          </div>

          <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
             <div className="flex items-center justify-between mb-6">
               <h3 className="font-black text-slate-800 flex items-center gap-2 uppercase text-xs tracking-wider">
                 <Calendar className="text-indigo-600" size={20} />
                 Vacation Records
               </h3>
             </div>
             
             <div className="overflow-x-auto">
               <table className="w-full text-center text-sm">
                 <thead>
                   <tr className="text-slate-400 uppercase text-[10px] font-black border-b border-slate-50">
                     <th className="pb-3 px-2 text-left">Team Member</th>
                     <th className="pb-3 px-2">Period</th>
                     <th className="pb-3 px-2">Days</th>
                     <th className="pb-3 px-2 text-right">Actions</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-50">
                   {holidays.length === 0 ? (
                     <tr><td colSpan={4} className="py-8 text-center text-slate-400 font-bold italic">No vacations logged yet.</td></tr>
                   ) : (
                     holidays.sort((a,b) => b.startDate.localeCompare(a.startDate)).map(h => (
                       <tr key={h.id} className="group hover:bg-slate-50 transition-colors">
                         <td className="py-4 px-2 font-black text-slate-700 text-left">{h.employeeName}</td>
                         <td className="py-4 px-2 text-slate-500 font-bold">
                           {new Date(h.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} - {new Date(h.endDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                         </td>
                         <td className="py-4 px-2">
                           <span className="bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-lg font-black text-xs">
                             {h.totalDays}
                           </span>
                         </td>
                         <td className="py-4 px-2 text-right">
                           <div className="flex justify-end gap-1">
                             <button 
                              onClick={() => setEditingHoliday(h)}
                              className="p-2 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"
                             >
                               <Edit2 size={14} />
                             </button>
                             <button 
                              onClick={() => { db.deleteHoliday(h.id); onUpdate(); }}
                              className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                             >
                               <Trash2 size={14} />
                             </button>
                           </div>
                         </td>
                       </tr>
                     ))
                   )}
                 </tbody>
               </table>
             </div>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <h3 className="font-black text-slate-800 flex items-center gap-2 uppercase text-xs tracking-[0.2em]">
          <Sun className="text-amber-500" size={20} />
          Annual Leave Quota
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {employees.map(emp => {
            const taken = employeeHolidays[emp.employeeId] || 0;
            const allowed = emp.holidayDays;
            const remaining = allowed - taken;
            const pct = Math.min(100, (taken / allowed) * 100);

            return (
              <div key={emp.employeeId} className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm hover:border-indigo-200 transition-all text-center">
                <div className="flex items-center justify-between mb-4">
                  <p className="font-black text-slate-800 text-sm truncate pr-2 text-left">{emp.nameAndSurname}</p>
                  <span className={`text-[9px] font-black px-2.5 py-1 rounded-full uppercase ${remaining <= 2 ? 'bg-rose-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
                    {remaining} Days Left
                  </span>
                </div>
                <div className="flex justify-between text-[10px] mb-2 text-slate-400 font-black uppercase tracking-tighter">
                  <span>Used: {taken}d</span>
                  <span>Cap: {allowed}d</span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-1000 ease-out ${pct > 90 ? 'bg-rose-500' : pct > 70 ? 'bg-amber-500' : 'bg-indigo-600'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {editingHoliday && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in duration-200">
            <div className="px-8 py-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-black text-slate-800 uppercase tracking-wider">Update Vacation</h3>
              <button onClick={() => setEditingHoliday(null)} className="p-2 text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleUpdateHoliday} className="p-8 space-y-6">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase">Team Member</label>
                <select 
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl font-bold"
                  value={editingHoliday.employeeId}
                  onChange={e => setEditingHoliday({...editingHoliday, employeeId: e.target.value})}
                >
                  {employees.map(emp => <option key={emp.employeeId} value={emp.employeeId}>{emp.nameAndSurname}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase">Start</label>
                  <input 
                    type="date" 
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl font-bold"
                    value={editingHoliday.startDate}
                    onChange={e => setEditingHoliday({...editingHoliday, startDate: e.target.value})}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase">End</label>
                  <input 
                    type="date" 
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl font-bold"
                    value={editingHoliday.endDate}
                    onChange={e => setEditingHoliday({...editingHoliday, endDate: e.target.value})}
                  />
                </div>
              </div>
              <div className="flex gap-4 pt-2">
                <button type="button" onClick={() => setEditingHoliday(null)} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-xl font-black text-xs uppercase tracking-widest">Cancel</button>
                <button type="submit" className="flex-1 py-4 bg-indigo-600 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-indigo-100">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingPH && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in duration-200">
            <div className="px-8 py-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-black text-slate-800 uppercase tracking-wider">Edit Public Holiday</h3>
              <button onClick={() => setEditingPH(null)} className="p-2 text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleUpdatePH} className="p-8 space-y-6">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase">Holiday Name</label>
                <input 
                  type="text" 
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl font-bold"
                  value={editingPH.name}
                  onChange={e => setEditingPH({...editingPH, name: e.target.value})}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase">Observed Date</label>
                <input 
                  type="date" 
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl font-bold"
                  value={editingPH.date}
                  onChange={e => setEditingPH({...editingPH, date: e.target.value})}
                />
              </div>
              <div className="flex gap-4 pt-2">
                <button type="button" onClick={() => setEditingPH(null)} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-xl font-black text-xs uppercase tracking-widest">Cancel</button>
                <button type="submit" className="flex-1 py-4 bg-rose-600 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-rose-100">Update</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default HolidayView;
