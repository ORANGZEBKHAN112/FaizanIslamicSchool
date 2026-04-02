import React, { useEffect, useState } from 'react';
import { Plus, Search, Edit2, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { Campus } from '../types';
import { dataService } from '../services/dataService';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

export default function CampusManagement() {
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    campusCode: '',
    campusName: '',
    address: '',
    phone: '',
    email: '',
    isActive: true
  });
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    return dataService.subscribe('campuses', setCampuses);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.campusCode.trim()) {
      toast.error('Campus code is required');
      return;
    }
    if (!formData.campusName.trim()) {
      toast.error('Campus name is required');
      return;
    }

    try {
      if (editingId) {
        await dataService.update('campuses', editingId, formData);
        toast.success('Campus updated successfully');
      } else {
        await dataService.add('campuses', formData);
        toast.success('Campus added successfully');
      }
      setIsModalOpen(false);
      setEditingId(null);
      setFormData({ campusCode: '', campusName: '', address: '', phone: '', email: '', isActive: true });
    } catch (error) {
      console.error('Error saving campus:', error);
      toast.error('Failed to save campus');
    }
  };

  const handleEdit = (campus: Campus) => {
    setEditingId(campus.id);
    setFormData({
      campusCode: campus.campusCode,
      campusName: campus.campusName,
      address: campus.address || '',
      phone: campus.phone || '',
      email: campus.email || '',
      isActive: campus.isActive
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this campus?')) {
      try {
        await dataService.delete('campuses', id);
        toast.success('Campus deleted successfully');
      } catch (error) {
        console.error('Error deleting campus:', error);
        toast.error('Failed to delete campus');
      }
    }
  };

  const filteredCampuses = campuses.filter(c => 
    c.campusName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.campusCode.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">Campus Management</h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Configure and manage school campus locations.</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            setEditingId(null);
            setFormData({ campusCode: '', campusName: '', address: '', phone: '', email: '', isActive: true });
            setIsModalOpen(true);
          }}
          className="vibrant-btn-primary px-8 py-4 rounded-2xl flex items-center gap-2 shadow-xl shadow-primary/20 text-[10px] font-black uppercase tracking-widest"
        >
          <Plus className="w-5 h-5" />
          Add New Campus
        </motion.button>
      </div>

      <div className="vibrant-card overflow-hidden">
        <div className="p-8 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="relative group max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-primary transition-colors" />
            <input
              type="text"
              placeholder="Search campuses..."
              className="vibrant-input pl-12"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-800/50 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                <th className="px-8 py-5">Code</th>
                <th className="px-8 py-5">Campus Name</th>
                <th className="px-8 py-5">Contact</th>
                <th className="px-8 py-5">Status</th>
                <th className="px-8 py-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredCampuses.map((campus) => (
                <tr key={campus.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group">
                  <td className="px-8 py-5 font-mono text-[10px] font-black text-primary uppercase tracking-widest">{campus.campusCode}</td>
                  <td className="px-8 py-5">
                    <div className="font-bold text-slate-900 dark:text-white group-hover:text-primary transition-colors">{campus.campusName}</div>
                  </td>
                  <td className="px-8 py-5">
                    <div className="text-sm font-medium text-slate-600 dark:text-slate-400">{campus.email}</div>
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">{campus.phone}</div>
                  </td>
                  <td className="px-8 py-5">
                    {campus.isActive ? (
                      <span className="inline-flex items-center gap-2 px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest bg-success/10 text-success">
                        <CheckCircle className="w-3 h-3" /> Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-2 px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest bg-accent/10 text-accent">
                        <XCircle className="w-3 h-3" /> Inactive
                      </span>
                    )}
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <motion.button 
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleEdit(campus)}
                        className="p-2.5 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-xl transition-all"
                      >
                        <Edit2 className="w-4 h-4" />
                      </motion.button>
                      <motion.button 
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleDelete(campus.id)}
                        className="p-2.5 text-slate-400 hover:text-accent hover:bg-accent/10 rounded-xl transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </motion.button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/40 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="vibrant-card w-full max-w-lg overflow-hidden border-none shadow-2xl"
            >
              <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-primary/10 rounded-2xl">
                    <Plus className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase">
                    {editingId ? 'Edit Campus' : 'Add New Campus'}
                  </h3>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                  <XCircle className="w-8 h-8" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-10 space-y-8 bg-white dark:bg-slate-900">
                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Campus Code</label>
                    <input
                      required
                      className="vibrant-input"
                      value={formData.campusCode}
                      onChange={(e) => setFormData({ ...formData, campusCode: e.target.value })}
                      placeholder="e.g. MAIN-01"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Campus Name</label>
                    <input
                      required
                      className="vibrant-input"
                      value={formData.campusName}
                      onChange={(e) => setFormData({ ...formData, campusName: e.target.value })}
                      placeholder="e.g. City Central Campus"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
                  <input
                    type="email"
                    className="vibrant-input"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="campus@school.com"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Phone Number</label>
                  <input
                    className="vibrant-input"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+92 300 1234567"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Address</label>
                  <textarea
                    className="vibrant-input"
                    rows={3}
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Full street address..."
                  />
                </div>
                <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="w-5 h-5 text-primary rounded-lg focus:ring-primary border-slate-300 dark:border-slate-600"
                  />
                  <label htmlFor="isActive" className="text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer">Active Campus</label>
                </div>
                <div className="flex gap-4 pt-6 border-t border-slate-100 dark:border-slate-800">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 px-8 py-4 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all hover:bg-slate-200 dark:hover:bg-slate-700"
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    className="vibrant-btn-primary flex-1 px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-primary/20"
                  >
                    {editingId ? 'Update Campus' : 'Save Campus'}
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
