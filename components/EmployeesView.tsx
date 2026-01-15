
import React, { useState, useRef } from 'react';
import { db } from '../db';
import { Employee } from '../types';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  X, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Euro, 
  Hourglass,
  AlertTriangle,
  Palmtree,
  Camera,
  Upload
} from 'lucide-react';

interface Props {
  employees: Employee[];
  onUpdate: () => void;
}

const EmployeesView: React.FC<Props> = ({ employees, onUpdate }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<Employee>>({
    nameAndSurname: '',
    phoneNumber: '',
    email: '',
    address: '',
    photo: '',
    grossHourlyWage: 0,
    mandatoryMonthlyHours: 160,
    holidayDays: 22,
  });

  const openAddModal = () => {
    setEditingEmployee(null);
    setFormData({
      nameAndSurname: '',
      phoneNumber: '',
      email: '',
      address: '',
      photo: '',
      grossHourlyWage: 0,
      mandatoryMonthlyHours: 160,
      holidayDays: 22,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (emp: Employee) => {
    setEditingEmployee(emp);
    setFormData(emp);
    setIsModalOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, photo: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const finalPhoto = formData.photo || `https://picsum.photos/seed/${formData.nameAndSurname}/200`;
    
    if (editingEmployee) {
      db.updateEmployee({ ...editingEmployee, ...formData, photo: finalPhoto } as Employee);
    } else {
      const newEmp: Employee = {
        ...formData,
        photo: finalPhoto,
        employeeId: `EMP${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
      } as Employee;
      db.saveEmployee(newEmp);
    }
    setIsModalOpen(false);
    onUpdate();
  };

  const handleDelete = (id: string) => {
    db.deleteEmployee(id);
    setConfirmDelete(null);
    onUpdate();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <p className="text-slate-500 text-sm font-medium">
          {employees.length} total team members
        </p>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all active:scale-95"
        >
          <Plus size={18} />
          Add Employee
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {employees.map(emp => (
          <div key={emp.employeeId} className="bg-white border border-slate-200 rounded-2xl overflow-hidden group hover:shadow-md transition-shadow">
            <div className="h-2 bg-indigo-600"></div>
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  <img 
                    src={emp.photo || 'https://via.placeholder.com/150'} 
                    alt={emp.nameAndSurname} 
                    className="w-16 h-16 rounded-2xl object-cover border-4 border-slate-50 shadow-sm"
                  />
                  <div>
                    <h3 className="font-bold text-slate-800 text-lg leading-tight">{emp.nameAndSurname}</h3>
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => openEditModal(emp)}
                    className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button 
                    onClick={() => setConfirmDelete(emp.employeeId)}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t border-slate-50">
                <div className="flex items-center gap-3 text-slate-500 text-sm">
                  <Mail size={14} className="text-slate-400 shrink-0" />
                  <span className="truncate">{emp.email}</span>
                </div>
                <div className="flex items-center gap-3 text-slate-500 text-sm">
                  <Phone size={14} className="text-slate-400 shrink-0" />
                  <span>{emp.phoneNumber}</span>
                </div>
                <div className="flex items-center gap-3 text-slate-500 text-sm">
                  <MapPin size={14} className="text-slate-400 shrink-0" />
                  <span className="truncate">{emp.address}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-6">
                <div className="bg-slate-50 p-3 rounded-xl">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1 flex items-center gap-1">
                    <Euro size={10} /> Wage
                  </p>
                  <p className="text-sm font-bold text-slate-700">€{emp.grossHourlyWage.toFixed(2)}/h</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1 flex items-center gap-1">
                    <Palmtree size={10} /> Holidays
                  </p>
                  <p className="text-sm font-bold text-slate-700">{emp.holidayDays} d/yr</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl animate-in zoom-in duration-200">
            <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <AlertTriangle size={32} />
            </div>
            <h3 className="text-xl font-bold text-slate-800 text-center mb-2">Are you sure?</h3>
            <p className="text-slate-500 text-center text-sm mb-8">
              This will permanently delete this employee and all their historical timesheet data.
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setConfirmDelete(null)}
                className="flex-1 px-4 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={() => handleDelete(confirmDelete)}
                className="flex-1 px-4 py-3 bg-rose-600 text-white rounded-xl font-bold hover:bg-rose-700 shadow-lg shadow-rose-600/20 transition-all"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="px-8 py-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-800">
                {editingEmployee ? 'Update Profile' : 'New Employee Account'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-8 space-y-6 max-h-[80vh] overflow-y-auto">
              {/* Photo Upload Section */}
              <div className="flex flex-col items-center gap-4 mb-2">
                 <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                   <div className="w-24 h-24 rounded-3xl border-4 border-white shadow-lg overflow-hidden bg-slate-100 flex items-center justify-center">
                     {formData.photo ? (
                       <img src={formData.photo} alt="Preview" className="w-full h-full object-cover" />
                     ) : (
                       <Camera size={32} className="text-slate-300" />
                     )}
                   </div>
                   <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center rounded-3xl transition-opacity">
                     <Upload size={20} className="text-white" />
                   </div>
                 </div>
                 <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/*" 
                  onChange={handleFileChange} 
                 />
                 <p className="text-[10px] font-bold text-slate-500 uppercase">Click to upload photo from device</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-6 gap-6">
                <div className="md:col-span-3 space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input 
                      required
                      type="text" 
                      className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none"
                      value={formData.nameAndSurname}
                      onChange={e => setFormData({...formData, nameAndSurname: e.target.value})}
                    />
                  </div>
                </div>

                <div className="md:col-span-3 space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Phone Number</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input 
                      required
                      type="tel" 
                      className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none"
                      value={formData.phoneNumber}
                      onChange={e => setFormData({...formData, phoneNumber: e.target.value})}
                    />
                  </div>
                </div>

                {/* Resized Layout: Room for Email */}
                <div className="md:col-span-4 space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input 
                      required
                      type="email" 
                      className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none"
                      value={formData.email}
                      onChange={e => setFormData({...formData, email: e.target.value})}
                    />
                  </div>
                </div>

                <div className="md:col-span-2 space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Hourly Wage (€)</label>
                  <div className="relative">
                    <Euro className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input 
                      required
                      type="number" 
                      step="0.01"
                      className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none font-bold"
                      value={formData.grossHourlyWage}
                      onChange={e => setFormData({...formData, grossHourlyWage: parseFloat(e.target.value)})}
                    />
                  </div>
                </div>

                <div className="md:col-span-6 space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Home Address</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input 
                      required
                      type="text" 
                      className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none"
                      value={formData.address}
                      onChange={e => setFormData({...formData, address: e.target.value})}
                    />
                  </div>
                </div>

                <div className="md:col-span-3 space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Mandatory Hours / Month</label>
                  <div className="relative">
                    <Hourglass className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input 
                      required
                      type="number" 
                      className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none"
                      value={formData.mandatoryMonthlyHours}
                      onChange={e => setFormData({...formData, mandatoryMonthlyHours: parseInt(e.target.value)})}
                    />
                  </div>
                </div>

                <div className="md:col-span-3 space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Vacation Days / Year</label>
                  <div className="relative">
                    <Palmtree className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input 
                      required
                      type="number" 
                      className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none"
                      value={formData.holidayDays}
                      onChange={e => setFormData({...formData, holidayDays: parseInt(e.target.value)})}
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-600/20 transition-all"
                >
                  {editingEmployee ? 'Update Account' : 'Confirm Registration'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeesView;
