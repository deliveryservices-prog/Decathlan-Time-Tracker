
import React, { useState, useMemo } from 'react';
import { db } from '../db';
import { Setting, CompanyInfo } from '../types';
import { Building2, Mail, Link as LinkIcon, CheckCircle2, CloudLightning } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface Props {
  settings: Setting[];
  onUpdate: () => void;
}

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

const SettingsView: React.FC<Props> = ({ settings, onUpdate }) => {
  const [localSettings, setLocalSettings] = useState<Setting[]>(settings);
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>(db.getCompanyInfo());
  const [isSaved, setIsSaved] = useState(false);

  const hasChanges = useMemo(() => {
    const originalCompany = db.getCompanyInfo();
    const companyChanged = companyInfo.name !== originalCompany.name || 
                           companyInfo.email !== originalCompany.email || 
                           companyInfo.appsScriptUrl !== originalCompany.appsScriptUrl;
    return companyChanged || JSON.stringify(localSettings) !== JSON.stringify(settings);
  }, [companyInfo, localSettings, settings]);

  const handleSave = () => {
    db.updateSettings(localSettings);
    db.updateCompanyInfo(companyInfo);
    setIsSaved(true);
    onUpdate();
    setTimeout(() => setIsSaved(false), 3000);
  };

  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, value }: any) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.55;
    const RADIAN = Math.PI / 180;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    return (
      <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" className="text-[10px] font-black">
        {value > 1 ? `${value}%` : ''}
      </text>
    );
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-4">
      <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm">
        <div className="flex items-center gap-3 mb-8">
           <div className="bg-indigo-600 p-2.5 rounded-xl text-white shadow-lg shadow-indigo-100"><Building2 size={20} /></div>
           <div>
             <h4 className="text-lg font-black text-slate-800 uppercase tracking-tight">Company & Connectivity</h4>
             <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Branding and Cloud Integration</p>
           </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Company Name</label>
            <input 
              type="text" 
              className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-slate-700 focus:ring-4 focus:ring-indigo-500/10 focus:bg-white transition-all outline-none" 
              value={companyInfo.name} 
              onChange={(e) => setCompanyInfo({...companyInfo, name: e.target.value})} 
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Company Email</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
              <input 
                type="email" 
                className="w-full pl-12 pr-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-slate-700 focus:ring-4 focus:ring-indigo-500/10 focus:bg-white transition-all outline-none" 
                value={companyInfo.email} 
                onChange={(e) => setCompanyInfo({...companyInfo, email: e.target.value})} 
              />
            </div>
          </div>
          <div className="space-y-2 md:col-span-2 lg:col-span-1">
            <label className="text-[10px] font-black text-indigo-600 uppercase tracking-widest ml-1 flex items-center gap-2">
              <CloudLightning size={12} />
              Cloud Sync URL
            </label>
            <div className="relative">
              <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-300" size={16} />
              <input 
                type="text" 
                className="w-full pl-12 pr-5 py-4 bg-indigo-50/30 border border-indigo-100 rounded-2xl font-bold text-indigo-700 placeholder:text-indigo-200 focus:ring-4 focus:ring-indigo-500/10 focus:bg-white transition-all outline-none" 
                value={companyInfo.appsScriptUrl || ''} 
                placeholder="https://script.google.com/macros/s/..." 
                onChange={(e) => setCompanyInfo({...companyInfo, appsScriptUrl: e.target.value})} 
              />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-2">Taxation & Deductions</h4>
          <div className="space-y-2">
            {localSettings.map(s => (
              <div key={s.taxType} className="flex items-center justify-between p-5 bg-white rounded-3xl border border-slate-100 shadow-sm hover:border-indigo-200 transition-all">
                <span className="text-xs font-black text-slate-600 uppercase">{s.taxType}</span>
                <div className="flex items-center gap-2">
                  <input 
                    type="number" 
                    step="0.01" 
                    className="w-20 px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-right font-black text-indigo-600 outline-none" 
                    value={s.percentage} 
                    onChange={(e) => setLocalSettings(prev => prev.map(item => item.taxType === s.taxType ? {...item, percentage: parseFloat(e.target.value) || 0} : item))} 
                  />
                  <span className="font-black text-slate-300 text-sm">%</span>
                </div>
              </div>
            ))}
          </div>
          <button 
            onClick={handleSave} 
            disabled={!hasChanges || isSaved} 
            className={`w-full py-5 mt-4 rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] shadow-xl transition-all active:scale-[0.98] flex items-center justify-center gap-3 ${
              isSaved ? 'bg-emerald-500 text-white shadow-emerald-100' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-100 disabled:opacity-50 disabled:shadow-none'
            }`}
          >
            {isSaved ? <><CheckCircle2 size={18} /> Settings Locked</> : 'Secure & Save All'}
          </button>
        </div>

        <div className="bg-white border border-slate-100 rounded-[3rem] p-10 flex flex-col items-center shadow-sm">
          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-6 self-start">Salary Distribution</h4>
          <div className="h-[320px] w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie 
                  data={localSettings} 
                  dataKey="percentage" 
                  nameKey="taxType" 
                  cx="50%" 
                  cy="50%" 
                  innerRadius={70} 
                  outerRadius={100} 
                  paddingAngle={8} 
                  stroke="none" 
                  label={renderCustomLabel} 
                  labelLine={false}
                >
                  {localSettings.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} cornerRadius={12} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '1.5rem', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', fontWeight: 'black', fontSize: '10px' }} />
                <Legend 
                  iconType="circle" 
                  layout="horizontal" 
                  verticalAlign="bottom" 
                  align="center" 
                  wrapperStyle={{ fontSize: '9px', fontWeight: 'black', textTransform: 'uppercase', paddingTop: '30px', letterSpacing: '0.05em' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsView;
