import React, { useEffect, useState } from 'react';
import { Settings, Edit2, Save, XCircle, Banknote } from 'lucide-react';
import { Class, FeeSetting } from '../types';
import { dataService } from '../services/dataService';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

export default function FeeSettings() {
  const [classes, setClasses] = useState<Class[]>([]);
  const [feeSettings, setFeeSettings] = useState<FeeSetting[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [formData, setFormData] = useState({
    monthlyFee: 0,
    admissionFee: 0,
    securityFee: 0
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        const [classesData, feesData] = await Promise.all([
          dataService.fetchClasses(),
          dataService.fetchFeeSettings()
        ]);
        setClasses(classesData);
        setFeeSettings(feesData);
      } catch (error) {
        console.error('Error loading data:', error);
        toast.error('Failed to load fee settings');
      }
    };
    loadData();
  }, []);

  const handleEdit = (cls: Class) => {
    setSelectedClass(cls);
    const existingFee = feeSettings.find(f => f.classId === cls.id);
    setFormData({
      monthlyFee: existingFee?.monthlyFee || 0,
      admissionFee: existingFee?.admissionFee || 0,
      securityFee: existingFee?.securityFee || 0
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClass) return;

    try {
      await dataService.add('fee-settings', {
        classId: selectedClass.id,
        ...formData
      });
      toast.success('Fee settings updated successfully');
      setIsModalOpen(false);
      // Refresh data
      const feesData = await dataService.fetchFeeSettings();
      setFeeSettings(feesData);
    } catch (error) {
      console.error('Error saving fee settings:', error);
      toast.error('Failed to save fee settings');
    }
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">Fee Settings</h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Configure fee structures for each class.</p>
        </div>
      </div>

      <div className="vibrant-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-800/50 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                <th className="px-8 py-5">Class Name</th>
                <th className="px-8 py-5">Monthly Fee</th>
                <th className="px-8 py-5">Admission Fee</th>
                <th className="px-8 py-5">Security Fee</th>
                <th className="px-8 py-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {classes.map((cls) => {
                const fee = feeSettings.find(f => f.classId === cls.id);
                return (
                  <tr key={cls.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group">
                    <td className="px-8 py-5">
                      <div className="font-bold text-slate-900 dark:text-white group-hover:text-primary transition-colors">{cls.className}</div>
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">{cls.sectionName}</div>
                    </td>
                    <td className="px-8 py-5 font-black text-slate-900 dark:text-white">
                      Rs. {fee?.monthlyFee || 0}
                    </td>
                    <td className="px-8 py-5 font-black text-slate-900 dark:text-white">
                      Rs. {fee?.admissionFee || 0}
                    </td>
                    <td className="px-8 py-5 font-black text-slate-900 dark:text-white">
                      Rs. {fee?.securityFee || 0}
                    </td>
                    <td className="px-8 py-5 text-right">
                      <motion.button 
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleEdit(cls)}
                        className="p-2.5 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-xl transition-all flex items-center gap-2 ml-auto"
                      >
                        <Edit2 className="w-4 h-4" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Edit Fees</span>
                      </motion.button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && selectedClass && (
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
                    <Banknote className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase">
                      Set Fees
                    </h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{selectedClass.className}</p>
                  </div>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                  <XCircle className="w-8 h-8" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-10 space-y-8 bg-white dark:bg-slate-900">
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Monthly Fee (Rs.)</label>
                  <input
                    type="number"
                    required
                    className="vibrant-input"
                    value={formData.monthlyFee}
                    onChange={(e) => setFormData({ ...formData, monthlyFee: parseFloat(e.target.value) })}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Admission Fee (Rs.)</label>
                  <input
                    type="number"
                    required
                    className="vibrant-input"
                    value={formData.admissionFee}
                    onChange={(e) => setFormData({ ...formData, admissionFee: parseFloat(e.target.value) })}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Security Fee (Rs.)</label>
                  <input
                    type="number"
                    required
                    className="vibrant-input"
                    value={formData.securityFee}
                    onChange={(e) => setFormData({ ...formData, securityFee: parseFloat(e.target.value) })}
                    placeholder="0.00"
                  />
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
                    Save Changes
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
