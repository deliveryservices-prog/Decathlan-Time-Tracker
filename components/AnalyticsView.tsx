import React, { useMemo, useState } from 'react';
import { TimesheetEntry, Employee, Setting, HolidayEntry, PublicHoliday } from '../types';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  Cell, ComposedChart, Line, Bar
} from 'recharts';
import { TrendingUp, Calendar, FileDown, Mail, CheckCircle, Loader2, AlertCircle, User, Briefcase, Calculator, Euro, Timer, Palmtree } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { db } from '../db';

interface Props {
  timesheet: TimesheetEntry[];
  employees: Employee[];
  settings: Setting[];
  holidays: HolidayEntry[];
  publicHolidays: PublicHoliday[];
  onUpdate?: () => void;
}

const AnalyticsView: React.FC<Props> = ({ timesheet, employees, settings, holidays, publicHolidays }) => {
  const [selectedEmpId, setSelectedEmpId] = useState<string>('all');
  const [isSending, setIsSending] = useState(false);
  const [showToast, setShowToast] = useState<{message: string, type: 'success' | 'error' | 'info'} | null>(null);
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(`${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`);

  const monthOptions = useMemo(() => {
    const options = [];
    const date = new Date();
    for (let i = -12; i <= 1; i++) {
      const d = new Date(date.getFullYear(), date.getMonth() + i, 1);
      const val = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
      const label = d.toLocaleString('default', { month: 'long', year: 'numeric' });
      options.push({ value: val, label });
    }
    return options.sort((a, b) => b.value.localeCompare(a.value));
  }, []);

  const formattedMonthYear = useMemo(() => {
    const [year, month] = selectedMonth.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleString('default', { month: 'long', year: 'numeric' });
  }, [selectedMonth]);

  const stats = useMemo(() => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0);

    // Ensure we handle potential null/undefined and normalize dates for comparison
    const safeTimesheet = (timesheet || []).filter(e => e && e.date);
    const filteredByMonth = safeTimesheet.filter(e => e.timeOut !== null && e.date.includes(selectedMonth));
    
    const publicHolidaysInMonth = (publicHolidays || []).filter(ph => ph && ph.date && ph.date.includes(selectedMonth));
    const phHoursPerEmp = publicHolidaysInMonth.length * 8;

    const employeeDeductionPct = (settings || [])
      .filter(s => s.taxType.includes('Employee'))
      .reduce((acc, curr) => acc + curr.percentage, 0);

    const relevantEmployees = selectedEmpId === 'all' 
      ? (employees || []) 
      : (employees || []).filter(e => e.employeeId === selectedEmpId);

    const perEmployeeStats = relevantEmployees.map(emp => {
      const workedEntries = filteredByMonth.filter(e => e.employeeId === emp.employeeId);
      const workedHours = workedEntries.reduce((a, c) => a + (Number(c.totalHours) || 0), 0);
      
      const vacationDays: string[] = [];
      (holidays || [])
        .filter(h => h && h.employeeId === emp.employeeId)
        .forEach(h => {
          const hs = new Date(h.startDate);
          const he = new Date(h.endDate);
          const is = new Date(Math.max(monthStart.getTime(), hs.getTime()));
          const ie = new Date(Math.min(monthEnd.getTime(), he.getTime()));
          let curr = new Date(is);
          while (curr <= ie) {
            const dateStr = curr.toISOString().split('T')[0];
            if (dateStr.startsWith(selectedMonth)) {
              vacationDays.push(dateStr);
            }
            curr.setDate(curr.getDate() + 1);
          }
        });

      const vacationHours = vacationDays.length * 8;
      const phHours = phHoursPerEmp;
      const totalPayable = workedHours + vacationHours + phHours;
      const gross = totalPayable * (Number(emp.grossHourlyWage) || 0);
      const net = gross * (1 - (employeeDeductionPct / 100));
      const deductions = gross - net;

      // Log construction for PDF/Table
      const logs: any[] = workedEntries.map(entry => {
        const entryGross = (Number(entry.totalHours) || 0) * emp.grossHourlyWage;
        const entryNet = entryGross * (1 - (employeeDeductionPct / 100));
        return {
          date: entry.date,
          start: entry.timeIn ? new Date(entry.timeIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : '-',
          end: entry.timeOut ? new Date(entry.timeOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : '-',
          isHoliday: 'No',
          isPH: 'No',
          break: entry.breakMinutes || 0,
          hours: Number(entry.totalHours) || 0,
          amount: entryGross,
          netAmount: entryNet
        };
      });

      vacationDays.forEach(vDate => {
        if (!logs.find(l => l.date === vDate)) {
          const vGross = 8 * emp.grossHourlyWage;
          const vNet = vGross * (1 - (employeeDeductionPct / 100));
          logs.push({ date: vDate, start: 'LEAVE', end: 'LEAVE', isHoliday: 'Yes', isPH: 'No', break: 0, hours: 8, amount: vGross, netAmount: vNet });
        }
      });

      publicHolidaysInMonth.forEach(ph => {
        if (!logs.find(l => l.date === ph.date)) {
          const phGross = 8 * emp.grossHourlyWage;
          const phNet = phGross * (1 - (employeeDeductionPct / 100));
          logs.push({ date: ph.date, start: 'PUB.HOL', end: 'PUB.HOL', isHoliday: 'No', isPH: 'Yes', break: 0, hours: 8, amount: phGross, netAmount: phNet });
        }
      });

      logs.sort((a, b) => a.date.localeCompare(b.date));

      return {
        id: emp.employeeId,
        email: emp.email,
        name: emp.nameAndSurname.split(' ')[0],
        fullName: emp.nameAndSurname,
        photo: emp.photo,
        worked: workedHours,
        vacation: vacationHours,
        ph: phHours,
        totalPayable,
        gross,
        deductions,
        net,
        target: emp.mandatoryMonthlyHours,
        logs 
      };
    });

    const aggregate = perEmployeeStats.reduce((acc, curr) => ({
      worked: acc.worked + curr.worked,
      vacation: acc.vacation + curr.vacation,
      ph: acc.ph + curr.ph,
      totalPayable: acc.totalPayable + curr.totalPayable,
      gross: acc.gross + curr.gross,
      deductions: acc.deductions + curr.deductions,
      net: acc.net + curr.net
    }), { worked: 0, vacation: 0, ph: 0, totalPayable: 0, gross: 0, deductions: 0, net: 0 });

    return { aggregate, perEmployeeStats };
  }, [timesheet, employees, settings, selectedEmpId, selectedMonth, holidays, publicHolidays]);

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const generateReportDoc = () => {
    const doc = new jsPDF();
    const company = db.getCompanyInfo();
    
    if (stats.perEmployeeStats.length === 0) {
      doc.text("No data available for the selected period.", 14, 20);
      return { doc, filename: "Report_Empty.pdf" };
    }

    const drawPageUI = (d: jsPDF, pageNum: number) => {
      d.setFontSize(20);
      d.setTextColor(79, 70, 229);
      d.text(company.name.toUpperCase(), 14, 20);
      d.setFontSize(8);
      d.setTextColor(148, 163, 184);
      d.text(`${company.email} | Page ${pageNum}`, 14, 25);
      d.setDrawColor(241, 245, 249);
      d.line(14, 28, 196, 28);
    };

    stats.perEmployeeStats.forEach((empStat, idx) => {
      if (idx > 0) doc.addPage();
      const currentPage = doc.getNumberOfPages();
      drawPageUI(doc, currentPage);

      doc.setFontSize(14);
      doc.setTextColor(30, 41, 59);
      doc.text(`STATEMENT: ${empStat.fullName.toUpperCase()}`, 105, 38, { align: 'center' });
      doc.setFontSize(9);
      doc.text(`Period: ${formattedMonthYear} | ID: ${empStat.id}`, 105, 43, { align: 'center' });

      autoTable(doc, {
        startY: 50,
        head: [['Summary Metric', 'Total Value']],
        body: [
          ['Total Worked Hours', `${empStat.worked.toFixed(1)} h`],
          ['Paid Leave (Vacation/PH)', `${(empStat.vacation + empStat.ph).toFixed(1)} h`],
          ['Gross Earnings', `€ ${formatCurrency(empStat.gross)}`],
          ['Net Payout', `€ ${formatCurrency(empStat.net)}`],
        ],
        theme: 'grid',
        headStyles: { fillColor: [79, 70, 229], halign: 'center' },
        styles: { halign: 'center' },
        columnStyles: { 
          0: { halign: 'center' }, 
          1: { halign: 'center', fontStyle: 'bold' } 
        }
      });

      const lastY = (doc as any).lastAutoTable.finalY || 100;
      const nextY = lastY + 12;
      doc.setFontSize(10);
      doc.text("DAILY BREAKDOWN", 105, nextY, { align: 'center' });

      autoTable(doc, {
        startY: nextY + 5,
        head: [['Date', 'In', 'Out', 'Break', 'Hrs', 'Gross', 'Net']],
        body: empStat.logs.map(l => [
          l.date, 
          l.start, 
          l.end, 
          `${l.break}m`, 
          l.hours.toFixed(2), 
          `€${l.amount.toFixed(2)}`,
          `€${l.netAmount.toFixed(2)}`
        ]),
        theme: 'striped',
        headStyles: { fillColor: [51, 65, 85], halign: 'center' },
        styles: { fontSize: 7, halign: 'center' },
        columnStyles: { 
          6: { fontStyle: 'bold', textColor: [79, 70, 229] }
        },
        didDrawPage: (data) => {
           if (data.pageNumber > currentPage) {
             drawPageUI(doc, data.pageNumber);
           }
        }
      });
    });

    const isMulti = selectedEmpId === 'all';
    const filename = isMulti ? `Team_Payroll_${selectedMonth}.pdf` : `Payroll_${stats.perEmployeeStats[0].fullName.replace(/\s+/g, '_')}_${selectedMonth}.pdf`;
    return { doc, filename };
  };

  const handleDownloadPDF = () => {
    const { doc, filename } = generateReportDoc();
    doc.save(filename);
  };

  const handleSendEmail = async () => {
    if (selectedEmpId === 'all') {
      setShowToast({ message: 'Select an individual to email.', type: 'info' });
      return;
    }
    const emp = stats.perEmployeeStats[0];
    const company = db.getCompanyInfo();
    const url = company.appsScriptUrl?.trim();
    if (!url) {
      setShowToast({ message: 'Cloud URL missing in Settings.', type: 'error' });
      return;
    }

    setIsSending(true);
    try {
      const { doc, filename } = generateReportDoc();
      const pdfBase64 = doc.output('datauristring').split(',')[1];
      
      const emailPayload = {
        recipient: emp.email,
        subject: `Payroll Statement - ${formattedMonthYear}`,
        body: `Dear ${emp.fullName},\n\nPlease find your payroll statement for ${formattedMonthYear} attached.\n\nBest Regards,\n${company.name}`,
        pdfBase64: pdfBase64,
        filename: filename
      };

      await fetch(url, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(emailPayload)
      });

      setShowToast({ message: 'Email published to delivery queue!', type: 'success' });
    } catch (e) {
      setShowToast({ message: 'Communication error.', type: 'error' });
    } finally {
      setIsSending(false);
      setTimeout(() => setShowToast(null), 4000);
    }
  };

  return (
    <div className="space-y-8 relative">
      {showToast && (
        <div className={`fixed top-4 right-4 z-[100] flex items-center gap-3 px-6 py-4 rounded-2xl shadow-xl animate-in fade-in slide-in-from-top-4 ${showToast.type === 'success' ? 'bg-emerald-600 text-white' : showToast.type === 'error' ? 'bg-rose-600 text-white' : 'bg-slate-800 text-white'}`}>
          {showToast.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
          <p className="font-black text-sm uppercase tracking-wider">{showToast.message}</p>
        </div>
      )}

      {/* Filters & Actions */}
      <div className="flex flex-col xl:flex-row items-stretch xl:items-center gap-4 bg-slate-50 p-4 rounded-[2.5rem] border border-slate-100 shadow-inner">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
          <div className="flex items-center gap-4 bg-white px-5 py-3 rounded-2xl border border-slate-200 shadow-sm">
            <Calendar size={18} className="text-indigo-600 shrink-0" />
            <select className="w-full bg-transparent text-sm font-black focus:outline-none" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}>
              {monthOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-4 bg-white px-5 py-3 rounded-2xl border border-slate-200 shadow-sm">
            <User size={18} className="text-indigo-600 shrink-0" />
            <select className="w-full bg-transparent text-sm font-black focus:outline-none" value={selectedEmpId} onChange={(e) => setSelectedEmpId(e.target.value)}>
              <option value="all">Full Team Aggregate</option>
              {employees.map(e => <option key={e.employeeId} value={e.employeeId}>{e.nameAndSurname}</option>)}
            </select>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <button onClick={handleDownloadPDF} className="flex-1 px-8 py-3.5 bg-indigo-600 text-white rounded-2xl font-black hover:bg-indigo-700 transition-all flex items-center justify-center gap-3 shadow-lg shadow-indigo-100 text-xs uppercase">
            <FileDown size={18} /> GENERATE REPORT
          </button>
          <button 
            onClick={handleSendEmail} 
            disabled={selectedEmpId === 'all' || isSending || stats.perEmployeeStats.length === 0} 
            className="flex-1 px-8 py-3.5 bg-emerald-600 text-white rounded-2xl font-black hover:bg-emerald-700 disabled:opacity-50 transition-all shadow-lg shadow-emerald-100 flex items-center justify-center gap-3 text-xs uppercase"
          >
            {isSending ? <Loader2 size={18} className="animate-spin" /> : <Mail size={18} />} EMAIL REPORT
          </button>
        </div>
      </div>

      {/* Dynamic Summary for Single Employee */}
      {selectedEmpId !== 'all' && stats.perEmployeeStats.length > 0 && (
        <div className="bg-white border border-slate-200 p-8 rounded-[3rem] shadow-sm animate-in fade-in slide-in-from-bottom-2">
          <div className="flex flex-col md:flex-row items-center gap-6 mb-8 pb-8 border-b border-slate-50">
            <div className="w-24 h-24 rounded-3xl overflow-hidden shadow-lg border-4 border-white bg-indigo-600 flex items-center justify-center text-white font-black text-4xl italic">
              {stats.perEmployeeStats[0].photo ? (
                <img src={stats.perEmployeeStats[0].photo} className="w-full h-full object-cover" />
              ) : stats.perEmployeeStats[0].name.charAt(0)}
            </div>
            <div className="text-center md:text-left">
               <h3 className="text-2xl font-black text-slate-800 tracking-tighter uppercase italic">{stats.perEmployeeStats[0].fullName}</h3>
               <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">{stats.perEmployeeStats[0].email} • ID: {stats.perEmployeeStats[0].id}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
             <div className="bg-slate-50 p-6 rounded-[2rem] text-center border border-slate-100">
               <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center mx-auto mb-3"><Timer size={20}/></div>
               <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Worked</p>
               <p className="text-xl font-black text-slate-800">{stats.perEmployeeStats[0].worked.toFixed(1)}h</p>
             </div>
             <div className="bg-slate-50 p-6 rounded-[2rem] text-center border border-slate-100">
               <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center mx-auto mb-3"><Palmtree size={20}/></div>
               <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Leave/Pub.Hol</p>
               <p className="text-xl font-black text-slate-800">{(stats.perEmployeeStats[0].vacation + stats.perEmployeeStats[0].ph).toFixed(1)}h</p>
             </div>
             <div className="bg-slate-50 p-6 rounded-[2rem] text-center border border-slate-100">
               <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center mx-auto mb-3"><Calculator size={20}/></div>
               <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Gross Wage</p>
               <p className="text-xl font-black text-slate-800">€{formatCurrency(stats.perEmployeeStats[0].gross)}</p>
             </div>
             <div className="bg-indigo-600 p-6 rounded-[2rem] text-center text-white shadow-xl shadow-indigo-100">
               <div className="w-10 h-10 bg-white/20 text-white rounded-xl flex items-center justify-center mx-auto mb-3"><Euro size={20}/></div>
               <p className="text-[9px] font-black text-indigo-100 uppercase tracking-widest mb-1">Net Payout</p>
               <p className="text-xl font-black">€{formatCurrency(stats.perEmployeeStats[0].net)}</p>
             </div>
          </div>
        </div>
      )}

      {/* Aggregate Stats Cards */}
      {selectedEmpId === 'all' && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          <div className="bg-white border border-slate-100 p-6 rounded-[2.5rem] shadow-sm text-center">
            <p className="text-[10px] font-black text-slate-400 uppercase mb-1 tracking-widest">Team Active Hours</p>
            <h3 className="text-2xl font-black text-slate-800">{stats.aggregate.worked.toFixed(1)}h</h3>
          </div>
          <div className="bg-white border border-slate-100 p-6 rounded-[2.5rem] shadow-sm text-center">
            <p className="text-[10px] font-black text-slate-400 uppercase mb-1 tracking-widest">Team Leave Hours</p>
            <h3 className="text-2xl font-black text-amber-500">+{ (stats.aggregate.vacation + stats.aggregate.ph).toFixed(1) }h</h3>
          </div>
          <div className="bg-white border border-slate-100 p-6 rounded-[2.5rem] shadow-sm border-l-4 border-l-indigo-600 text-center">
            <p className="text-[10px] font-black text-slate-400 uppercase mb-1 tracking-widest">Gross Expenditure</p>
            <h3 className="text-2xl font-black text-slate-800">€{formatCurrency(stats.aggregate.gross)}</h3>
          </div>
          <div className="bg-indigo-600 p-6 rounded-[2.5rem] shadow-xl text-white text-center">
            <p className="text-[10px] font-black text-indigo-100 uppercase mb-1 tracking-widest">Net Team Payout</p>
            <h3 className="text-2xl font-black">€{formatCurrency(stats.aggregate.net)}</h3>
          </div>
        </div>
      )}

      {/* Charts Section */}
      <div className="bg-white border border-slate-200 rounded-[3rem] p-10 shadow-sm overflow-hidden">
        <h4 className="text-xs font-black text-slate-400 mb-10 uppercase tracking-[0.3em] text-center">
          Performance & Target Tracking
        </h4>
        <div className="h-[350px] w-full">
          {stats.perEmployeeStats.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={stats.perEmployeeStats} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                <Tooltip contentStyle={{ borderRadius: '1.5rem', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontWeight: 'bold' }} />
                <Legend verticalAlign="top" height={50} iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'black', textTransform: 'uppercase' }} />
                <Bar dataKey="worked" name="Worked" stackId="a" fill="#4f46e5" barSize={35} />
                <Bar dataKey="vacation" name="Vacation" stackId="a" fill="#f59e0b" />
                <Bar dataKey="ph" name="Pub.Hol." stackId="a" fill="#e11d48" radius={[10, 10, 0, 0]} />
                <Line type="monotone" dataKey="target" name="Target" stroke="#334155" strokeWidth={3} strokeDasharray="6 6" dot={{ r: 4 }} />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-300">
               <AlertCircle size={48} className="mb-4 opacity-20" />
               <p className="font-black text-[10px] uppercase tracking-widest">No visual data for this month</p>
            </div>
          )}
        </div>
      </div>

      {/* Daily Records Table */}
      {selectedEmpId !== 'all' && stats.perEmployeeStats.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-[2.5rem] shadow-sm overflow-hidden">
          <div className="p-8 border-b border-slate-50 flex items-center justify-between">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Briefcase size={14} className="text-indigo-600"/> Detailed Activity Log
            </h4>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-center">
              <thead>
                <tr className="bg-slate-50/50 text-[9px] font-black text-slate-500 uppercase tracking-widest">
                  <th className="py-4 px-6 border-b border-slate-100">Date</th>
                  <th className="py-4 px-6 border-b border-slate-100">Timeline</th>
                  <th className="py-4 px-6 border-b border-slate-100">Break</th>
                  <th className="py-4 px-6 border-b border-slate-100">Hours</th>
                  <th className="py-4 px-6 border-b border-slate-100">Gross</th>
                  <th className="py-4 px-6 border-b border-slate-100">Net Payable</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {stats.perEmployeeStats[0].logs.map((log: any, i: number) => (
                  <tr key={i} className="hover:bg-slate-50/30 transition-colors">
                    <td className="py-4 px-6 font-bold text-slate-800 text-xs">{log.date}</td>
                    <td className="py-4 px-6">
                      <div className="flex items-center justify-center gap-2">
                         <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${log.isHoliday === 'Yes' ? 'bg-amber-100 text-amber-700' : log.isPH === 'Yes' ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                           {log.start}
                         </span>
                         <span className="text-slate-300">→</span>
                         <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${log.isHoliday === 'Yes' ? 'bg-amber-100 text-amber-700' : log.isPH === 'Yes' ? 'bg-rose-100 text-rose-700' : 'bg-rose-100 text-rose-700'}`}>
                           {log.end}
                         </span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-[10px] font-bold text-slate-400">{log.break}m</td>
                    <td className="py-4 px-6 font-black text-slate-800 text-xs">{log.hours.toFixed(2)}h</td>
                    <td className="py-4 px-6 text-[10px] font-bold text-slate-500">€{log.amount.toFixed(2)}</td>
                    <td className="py-4 px-6">
                       <span className="bg-indigo-50 text-indigo-700 px-4 py-1.5 rounded-xl font-black text-[11px]">
                         €{log.netAmount.toFixed(2)}
                       </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalyticsView;