import React, { useEffect, useState } from 'react';
import { Plus, Search, Edit2, Trash2, ShieldCheck, UserCircle, Filter, Mail, Phone, Calendar, CreditCard, XCircle, Briefcase, GraduationCap, DollarSign, CheckCircle2, School } from 'lucide-react';
import { Staff, Campus, UserRole } from '../types';
import { dataService } from '../services/dataService';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

export default function StaffManagement() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCampus, setSelectedCampus] = useState<string>('all');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  
  const [formData, setFormData] = useState({
    fullName: '',
    cnic: '',
    qualification: '',
    salary: 0,
    joiningDate: new Date().toISOString().split('T')[0],
    campusId: '',
    role: 'Teacher' as UserRole,
    email: '',
    isActive: true
  });
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    const unsubStaff = dataService.subscribe('staff', setStaff);
    const unsubCampuses = dataService.subscribe('campuses', setCampuses);
    return () => {
      unsubStaff();
      unsubCampuses();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.fullName.trim()) {
      toast.error('Full name is required');
      return;
    }
    if (!formData.email.trim()) {
      toast.error('Email is required');
      return;
    }
    if (!formData.cnic.trim()) {
      toast.error('CNIC is required');
      return;
    }
    if (!formData.campusId) {
      toast.error('Please select a campus');
      return;
    }

    try {
      if (editingId) {
        await dataService.update('staff', editingId, formData);
        toast.success('Staff member updated successfully');
      } else {
        await dataService.add('staff', formData);
        toast.success('Staff member added successfully');
      }
      setIsModalOpen(false);
      setEditingId(null);
      setFormData({
        fullName: '', cnic: '', qualification: '', salary: 0,
        joiningDate: new Date().toISOString().split('T')[0],
        campusId: '', role: 'Teacher', email: '', isActive: true
      });
    } catch (error) {
      console.error('Error saving staff:', error);
      toast.error('Failed to save staff member');
    }
  };

  const handleEdit = (s: Staff) => {
    setEditingId(s.id);
    setFormData({
      fullName: s.fullName,
      cnic: s.cnic,
      qualification: s.qualification,
      salary: s.salary,
      joiningDate: s.joiningDate,
      campusId: s.campusId,
      role: s.role,
      email: s.email,
      isActive: s.isActive
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this staff member?')) {
      try {
        await dataService.delete('staff', id);
        toast.success('Staff member deleted successfully');
      } catch (error) {
        console.error('Error deleting staff:', error);
        toast.error('Failed to delete staff member');
      }
    }
  };

  const filteredStaff = staff.filter(s => {
    const matchesSearch = `${s.fullName} ${s.email} ${s.cnic}`.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCampus = selectedCampus === 'all' || s.campusId === selectedCampus;
    const matchesRole = selectedRole === 'all' || s.role === selectedRole;
    return matchesSearch && matchesCampus && matchesRole;
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Staff Management</h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">Manage faculty and administrative personnel</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            setEditingId(null);
            setIsModalOpen(true);
          }}
          className="vibrant-btn-primary px-6 py-3 rounded-2xl flex items-center gap-3 shadow-xl shadow-primary/20 w-fit"
        >
          <Plus className="w-5 h-5" />
          <span className="text-[10px] font-black uppercase tracking-widest">Add Staff Member</span>
        </motion.button>
      </div>

      <div className="vibrant-card overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, email, CNIC..."
              className="vibrant-input pl-12"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select
            className="vibrant-input px-4 text-xs font-black uppercase tracking-widest"
            value={selectedCampus}
            onChange={(e) => setSelectedCampus(e.target.value)}
          >
            <option value="all">All Campuses</option>
            {campuses.map(c => (
              <option key={c.id} value={c.id}>{c.campusName}</option>
            ))}
          </select>
          <select
            className="vibrant-input px-4 text-xs font-black uppercase tracking-widest"
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
          >
            <option value="all">All Roles</option>
            <option value="Admin">Admin</option>
            <option value="Teacher">Teacher</option>
            <option value="Accountant">Accountant</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-900/50 text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">
                <th className="px-8 py-5">Staff Member</th>
                <th className="px-8 py-5">Role & Campus</th>
                <th className="px-8 py-5">Financials</th>
                <th className="px-8 py-5">Status</th>
                <th className="px-8 py-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredStaff.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-black text-lg group-hover:scale-110 transition-transform">
                        {s.fullName.charAt(0)}
                      </div>
                      <div>
                        <div className="font-black text-slate-900 dark:text-white tracking-tight">{s.fullName}</div>
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{s.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="space-y-1">
                      <span className="px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest bg-primary/10 text-primary border border-primary/10">
                        {s.role}
                      </span>
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2 flex items-center gap-2">
                        <School className="w-3 h-3" />
                        {campuses.find(c => c.id === s.campusId)?.campusName || 'N/A'}
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2 text-slate-900 dark:text-white font-black">
                      <DollarSign className="w-4 h-4 text-success" />
                      Rs. {s.salary.toLocaleString()}
                    </div>
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Monthly Salary</div>
                  </td>
                  <td className="px-8 py-6">
                    <span className={`px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-2 w-fit ${
                      s.isActive ? 'bg-success/10 text-success border border-success/10' : 'bg-danger/10 text-danger border border-danger/10'
                    }`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${s.isActive ? 'bg-success' : 'bg-danger'}`} />
                      {s.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <motion.button 
                        whileHover={{ scale: 1.1, y: -2 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleEdit(s)} 
                        className="p-3 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 text-primary hover:bg-primary hover:text-white transition-all"
                      >
                        <Edit2 className="w-4 h-4" />
                      </motion.button>
                      <motion.button 
                        whileHover={{ scale: 1.1, y: -2 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleDelete(s.id)} 
                        className="p-3 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 text-danger hover:bg-danger hover:text-white transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </motion.button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredStaff.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-400">
                      <Search className="w-12 h-12 mb-4 opacity-20" />
                      <p className="text-lg font-black tracking-tight uppercase">No staff members found</p>
                      <p className="text-sm font-medium opacity-60">Try adjusting your search or filters</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/40 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="vibrant-card w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col border-none shadow-2xl"
            >
              <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-primary text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 -mr-16 -mt-16 rounded-full blur-2xl"></div>
                <h3 className="text-2xl font-black tracking-tight uppercase relative z-10">
                  {editingId ? 'Edit Staff Member' : 'Add New Staff'}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="text-white/60 hover:text-white transition-colors relative z-10">
                  <XCircle className="w-8 h-8" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto bg-white dark:bg-slate-900">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                    <div className="relative">
                      <UserCircle className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input required className="vibrant-input pl-12" value={formData.fullName} onChange={(e) => setFormData({ ...formData, fullName: e.target.value })} placeholder="Enter full name" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input type="email" required className="vibrant-input pl-12" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="email@example.com" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">CNIC</label>
                    <div className="relative">
                      <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input required className="vibrant-input pl-12" value={formData.cnic} onChange={(e) => setFormData({ ...formData, cnic: e.target.value })} placeholder="00000-0000000-0" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Qualification</label>
                    <div className="relative">
                      <GraduationCap className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input required className="vibrant-input pl-12" value={formData.qualification} onChange={(e) => setFormData({ ...formData, qualification: e.target.value })} placeholder="e.g. Masters in Education" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Role</label>
                    <div className="relative">
                      <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <select required className="vibrant-input pl-12" value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}>
                        <option value="Admin">Admin</option>
                        <option value="Teacher">Teacher</option>
                        <option value="Accountant">Accountant</option>
                      </select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Campus</label>
                    <div className="relative">
                      <School className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <select required className="vibrant-input pl-12" value={formData.campusId} onChange={(e) => setFormData({ ...formData, campusId: e.target.value })}>
                        <option value="">Select Campus</option>
                        {campuses.map(c => <option key={c.id} value={c.id}>{c.campusName}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Salary (Rs.)</label>
                    <div className="relative">
                      <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input type="number" required className="vibrant-input pl-12" value={formData.salary} onChange={(e) => setFormData({ ...formData, salary: Number(e.target.value) })} placeholder="0" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Joining Date</label>
                    <div className="relative">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input type="date" required className="vibrant-input pl-12" value={formData.joiningDate} onChange={(e) => setFormData({ ...formData, joiningDate: e.target.value })} />
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700">
                  <input 
                    type="checkbox" 
                    id="isActive" 
                    className="w-5 h-5 rounded-lg border-slate-300 text-primary focus:ring-primary"
                    checked={formData.isActive} 
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })} 
                  />
                  <label htmlFor="isActive" className="text-sm font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">Active Staff Member</label>
                </div>
                <div className="flex gap-4 pt-6 border-t border-slate-100 dark:border-slate-800">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-6 py-4 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">Cancel</button>
                  <button type="submit" className="flex-1 vibrant-btn-primary py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-primary/20">Save Staff Member</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
