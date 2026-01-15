
import React, { useState, useEffect, useMemo } from 'react';
import { db } from './db';
import { AppView, Employee, TimesheetEntry, Setting, HolidayEntry, PublicHoliday } from './types';
import ClockInView from './components/ClockInView';
import ClockedInView from './components/ClockedInView';
import HistoryView from './components/HistoryView';
import AnalyticsView from './components/AnalyticsView';
import SettingsView from './components/SettingsView';
import EmployeesView from './components/EmployeesView';
import HolidayView from './components/HolidayView';
import { 
  Clock, 
  Users, 
  Calendar, 
  BarChart3, 
  Settings as SettingsIcon,
  LogOut,
  UserCog,
  Palmtree,
  Menu as MenuIcon,
  X,
  CloudLightning,
  CloudOff,
  RefreshCw,
  Loader2,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>('CLOCK_IN');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [timesheet, setTimesheet] = useState<TimesheetEntry[]>([]);
  const [settings, setSettings] = useState<Setting[]>([]);
  const [holidays, setHolidays] = useState<HolidayEntry[]>([]);
  const [publicHolidays, setPublicHolidays] = useState<PublicHoliday[]>([]);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'error' | 'success'>('idle');

  const refreshData = () => {
    setEmployees(db.getEmployees());
    setTimesheet(db.getTimesheet());
    setSettings(db.getSettings());
    setHolidays(db.getHolidays());
    setPublicHolidays(db.getPublicHolidays());
  };

  const handleManualSync = async () => {
    setSyncStatus('syncing');
    const success = await db.syncWithCloud();
    if (success) {
      refreshData();
      setSyncStatus('success');
      setTimeout(() => setSyncStatus('idle'), 3000);
    } else {
      setSyncStatus('error');
      setTimeout(() => setSyncStatus('idle'), 5000);
    }
  };

  const handlePushData = async () => {
    setSyncStatus('syncing');
    const success = await db.pushToCloud();
    if (success) {
      setSyncStatus('success');
      setTimeout(() => setSyncStatus('idle'), 3000);
    } else {
      setSyncStatus('error');
      setTimeout(() => setSyncStatus('idle'), 5000);
    }
  };

  useEffect(() => {
    const init = async () => {
      const info = db.getCompanyInfo();
      if (info.appsScriptUrl) {
        setSyncStatus('syncing');
        const success = await db.syncWithCloud();
        setSyncStatus(success ? 'success' : 'error');
        if (success) setTimeout(() => setSyncStatus('idle'), 2000);
      }
      refreshData();
    };
    init();
  }, []);

  const activeEntries = useMemo(() => 
    timesheet.filter(entry => entry.timeOut === null), 
  [timesheet]);

  const navItems = [
    { id: 'CLOCK_IN', label: 'In', icon: <Clock size={20} /> },
    { id: 'CLOCKED_IN', label: 'Active', icon: <Users size={20} />, badge: activeEntries.length },
    { id: 'HISTORY', label: 'History', icon: <Calendar size={20} /> },
    { id: 'HOLIDAYS', label: 'Leave', icon: <Palmtree size={20} /> },
    { id: 'ANALYTICS', label: 'Stats', icon: <BarChart3 size={20} /> },
    { id: 'EMPLOYEES', label: 'Team', icon: <UserCog size={20} /> },
    { id: 'SETTINGS', label: 'Setup', icon: <SettingsIcon size={20} /> },
  ];

  const SyncIndicator = () => (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        <button 
          onClick={handleManualSync}
          disabled={syncStatus === 'syncing'}
          title="Pull from Cloud"
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-tighter transition-all ${
            syncStatus === 'syncing' ? 'bg-indigo-50 text-indigo-400' :
            syncStatus === 'success' ? 'bg-emerald-50 text-emerald-600' :
            syncStatus === 'error' ? 'bg-rose-50 text-rose-600' :
            'bg-slate-50 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600'
          }`}
        >
          {syncStatus === 'syncing' ? <Loader2 size={12} className="animate-spin" /> : 
           syncStatus === 'error' ? <CloudOff size={12} /> : <RefreshCw size={12} />}
          {syncStatus === 'syncing' ? 'Syncing...' : 
           syncStatus === 'success' ? 'Ready' : 
           syncStatus === 'error' ? 'Retry' : 'Fetch'}
        </button>
        <button 
          onClick={handlePushData}
          disabled={syncStatus === 'syncing'}
          title="Push to Cloud"
          className="p-1.5 bg-indigo-50 text-indigo-600 rounded-full hover:bg-indigo-600 hover:text-white transition-all"
        >
          <CloudLightning size={14} />
        </button>
      </div>
      {syncStatus === 'error' && (
        <span className="text-[8px] font-black text-rose-500 uppercase">Check Apps Script URL</span>
      )}
    </div>
  );

  return (
    <div className="min-h-screen pb-24 md:pb-0 md:pl-64 bg-slate-50">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col fixed inset-y-0 left-0 w-64 bg-white border-r border-slate-200 z-50">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-indigo-600 p-2 rounded-xl text-white shadow-lg shadow-indigo-200">
              <Clock size={24} />
            </div>
            <h1 className="text-xl font-black tracking-tight text-slate-800 uppercase italic">Menu</h1>
          </div>
          <SyncIndicator />
        </div>
        <nav className="flex-1 px-4 space-y-1.5 mt-4">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id as AppView)}
              className={`w-full flex items-center justify-between gap-3 px-4 py-3.5 rounded-xl transition-all ${
                currentView === item.id 
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 font-bold' 
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
              }`}
            >
              <div className="flex items-center gap-3">
                {item.icon}
                <span className="text-sm">{item.label === 'In' ? 'Clock In' : item.label === 'Stats' ? 'Dashboard' : item.label === 'Leave' ? 'Holidays' : item.label}</span>
              </div>
              {item.badge ? (
                <span className={`${currentView === item.id ? 'bg-white text-indigo-600' : 'bg-indigo-100 text-indigo-700'} text-[10px] px-2 py-0.5 rounded-full font-black`}>
                  {item.badge}
                </span>
              ) : null}
            </button>
          ))}
        </nav>
      </aside>

      {/* Mobile Sticky Header */}
      <header className="md:hidden sticky top-0 bg-white/80 backdrop-blur-md border-b border-slate-100 z-[40] px-5 py-4 flex items-center justify-between">
         <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-1.5 rounded-lg text-white">
              <Clock size={16} />
            </div>
            <span className="font-black text-slate-800 uppercase text-xs tracking-tighter italic">Menu</span>
         </div>
         <SyncIndicator />
      </header>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex justify-around items-center h-20 px-2 z-[60] shadow-[0_-4px_10px_rgba(0,0,0,0.03)]">
        {navItems.map(item => (
          <button
            key={item.id}
            onClick={() => setCurrentView(item.id as AppView)}
            className={`flex flex-col items-center justify-center gap-1.5 min-w-[50px] transition-all relative ${
              currentView === item.id ? 'text-indigo-600 scale-110' : 'text-slate-400'
            }`}
          >
            <div className={`p-2 rounded-2xl transition-all ${currentView === item.id ? 'bg-indigo-50 shadow-sm' : ''}`}>
              {item.icon}
            </div>
            <span className={`text-[10px] font-bold ${currentView === item.id ? 'text-indigo-600' : 'text-slate-400'}`}>
              {item.label}
            </span>
            {item.badge ? (
              <span className="absolute top-1 right-1 bg-rose-500 text-white text-[8px] min-w-[16px] h-4 flex items-center justify-center rounded-full font-black border-2 border-white">
                {item.badge}
              </span>
            ) : null}
          </button>
        ))}
      </nav>

      <main className="max-w-6xl mx-auto p-4 md:p-8">
        <header className="mb-6 md:mb-10 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <div>
            <h2 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">
              {navItems.find(i => i.id === currentView)?.label === 'In' ? 'Clock In Portal' : 
               navItems.find(i => i.id === currentView)?.label === 'Stats' ? 'Performance Insights' :
               navItems.find(i => i.id === currentView)?.label === 'Leave' ? 'Holiday Management' :
               navItems.find(i => i.id === currentView)?.label}
            </h2>
            <p className="text-slate-500 text-sm font-medium">Cloud Connected & Syncing across devices.</p>
          </div>
          <div className="hidden md:block">
            <span className="text-xs font-bold text-slate-400 bg-slate-100 px-3 py-1.5 rounded-full uppercase tracking-wider">
              {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
            </span>
          </div>
        </header>

        <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-4 md:p-8 overflow-hidden min-h-[60vh] md:min-h-[700px]">
          {currentView === 'CLOCK_IN' && <ClockInView employees={employees} activeEmployeeIds={activeEntries.map(e => e.employeeId)} holidays={holidays} onSuccess={() => { refreshData(); setCurrentView('CLOCKED_IN'); }} />}
          {currentView === 'CLOCKED_IN' && <ClockedInView activeEntries={activeEntries} employees={employees} onSuccess={refreshData} />}
          {currentView === 'HISTORY' && <HistoryView timesheet={timesheet} employees={employees} settings={settings} onUpdate={refreshData} />}
          {currentView === 'HOLIDAYS' && <HolidayView employees={employees} holidays={holidays} publicHolidays={publicHolidays} onUpdate={refreshData} />}
          {currentView === 'EMPLOYEES' && <EmployeesView employees={employees} onUpdate={refreshData} />}
          {currentView === 'ANALYTICS' && <AnalyticsView timesheet={timesheet} employees={employees} settings={settings} holidays={holidays} publicHolidays={publicHolidays} onUpdate={refreshData} />}
          {currentView === 'SETTINGS' && <SettingsView settings={settings} onUpdate={refreshData} />}
        </div>
      </main>
    </div>
  );
};

export default App;
