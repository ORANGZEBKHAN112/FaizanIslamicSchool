import React, { useEffect, useState } from 'react';
import { Banknote, Plus, Search, Download, FileText, CheckCircle, Clock, XCircle, User as UserIcon, Calendar, Briefcase, TrendingUp, Filter } from 'lucide-react';
import { SalarySlip, User } from '../types';
import { dataService } from '../services/dataService';
import { motion, AnimatePresence } from 'motion/react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from 'sonner';

export default function StaffPayroll() {
  const [slips, setSlips] = useState<SalarySlip[]>([]);
  const [staff, setStaff] = useState<User[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    staffId: '',
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    basicSalary: 0,
    allowances: 0,
    deductions: 0,
    netSalary: 0,
    status: 'Pending' as const,
    paymentDate: ''
  });

  useEffect(() => {
    const unsubSlips = dataService.subscribe('salaryslips', setSlips);
    const unsubStaff = dataService.subscribe('users', (users) => {
      setStaff(users.filter(u => u.role !== 'Student'));
    });
    return () => {
      unsubSlips();
      unsubStaff();
    };
  }, []);

  const calculateNet = (basic: number, allow: number, ded: number) => {
    return basic + allow - ded;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.staffId) {
      toast.error('Please select a staff member');
      return;
    }
    if (formData.basicSalary <= 0) {
      toast.error('Basic salary must be greater than 0');
      return;
    }

    try {
      const net = calculateNet(formData.basicSalary, formData.allowances, formData.deductions);
      const slipData = {
        ...formData,
        netSalary: net,
        createdOn: new Date().toISOString()
      };

      await dataService.add('salaryslips', slipData);
      toast.success('Salary slip generated successfully');
      setIsModalOpen(false);
      setFormData({ staffId: '', month: new Date().getMonth() + 1, year: new Date().getFullYear(), basicSalary: 0, allowances: 0, deductions: 0, netSalary: 0, status: 'Pending', paymentDate: '' });
    } catch (error) {
      console.error('Error generating salary slip:', error);
      toast.error('Failed to generate salary slip');
    }
  };

  const generatePDF = (slip: SalarySlip) => {
    const doc = new jsPDF();
    const staffMember = staff.find(s => s.id === slip.staffId);
    
    doc.setFontSize(22);
    doc.setTextColor(0, 59, 92); // FISS Navy
    doc.text('FAIZAN ISLAMIC SCHOOL', 105, 20, { align: 'center' });
    
    doc.setFontSize(14);
    doc.setTextColor(100);
    doc.text('Salary Slip', 105, 30, { align: 'center' });
    doc.text(`${new Date(slip.year, slip.month - 1).toLocaleString('default', { month: 'long' })} ${slip.year}`, 105, 38, { align: 'center' });

    doc.setFontSize(10);
    doc.setTextColor(0);
    doc.text(`Staff Name: ${staffMember?.fullName || 'N/A'}`, 20, 55);
    doc.text(`Role: ${staffMember?.role || 'N/A'}`, 20, 62);
    doc.text(`Slip ID: ${slip.id.substring(0, 8).toUpperCase()}`, 150, 55);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 150, 62);

    autoTable(doc, {
      startY: 75,
      head: [['Description', 'Amount (PKR)']],
      body: [
        ['Basic Salary', `Rs. ${slip.basicSalary.toLocaleString()}`],
        ['Allowances', `Rs. ${slip.allowances.toLocaleString()}`],
        ['Deductions', `Rs. -${slip.deductions.toLocaleString()}`],
        [{ content: 'Net Salary', styles: { fontStyle: 'bold' as const } }, { content: `Rs. ${slip.netSalary.toLocaleString()}`, styles: { fontStyle: 'bold' as const } }],
      ],
      theme: 'striped',
      headStyles: { fillColor: [0, 169, 157] },
    });

    doc.text('Authorized Signature', 150, (doc as any).lastAutoTable.finalY + 30);
    doc.line(140, (doc as any).lastAutoTable.finalY + 25, 190, (doc as any).lastAutoTable.finalY + 25);

    doc.save(`Salary_Slip_${staffMember?.fullName}_${slip.month}_${slip.year}.pdf`);
  };

  const filteredSlips = slips.filter(slip => {
    const staffMember = staff.find(s => s.id === slip.staffId);
    return staffMember?.fullName.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Staff Payroll</h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">Generate and manage staff salary disbursements</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setIsModalOpen(true)}
          className="vibrant-btn-primary px-6 py-3 rounded-2xl flex items-center gap-3 shadow-xl shadow-primary/20"
        >
          <Plus className="w-5 h-5" />
          <span className="text-[10px] font-black uppercase tracking-widest">Generate Salary Slip</span>
        </motion.button>
      </div>

      <div className="vibrant-card overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="relative max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search staff payroll records..."
              className="vibrant-input pl-12"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-900/50 text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">
                <th className="px-8 py-5">Staff Member</th>
                <th className="px-8 py-5">Period</th>
                <th className="px-8 py-5">Net Disbursement</th>
                <th className="px-8 py-5">Status</th>
                <th className="px-8 py-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredSlips.map((slip) => {
                const staffMember = staff.find(s => s.id === slip.staffId);
                return (
                  <tr key={slip.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-black text-lg group-hover:scale-110 transition-transform">
                          {staffMember?.fullName.charAt(0) || 'S'}
                        </div>
                        <div>
                          <p className="font-black text-slate-900 dark:text-white tracking-tight">{staffMember?.fullName || 'N/A'}</p>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{staffMember?.role}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-black text-sm uppercase tracking-tight">
                        <Calendar className="w-4 h-4 text-primary" />
                        {new Date(slip.year, slip.month - 1).toLocaleString('default', { month: 'long' })} {slip.year}
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2 text-slate-900 dark:text-white font-black text-lg tracking-tight">
                        <Banknote className="w-4 h-4 text-success" />
                        Rs. {slip.netSalary.toLocaleString()}
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className={`px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-2 w-fit ${
                        slip.status === 'Paid' ? 'bg-success/10 text-success border border-success/10' : 'bg-orange-500/10 text-orange-500 border border-orange-500/10'
                      }`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${slip.status === 'Paid' ? 'bg-success' : 'bg-orange-500'}`} />
                        {slip.status}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <motion.button 
                        whileHover={{ scale: 1.1, y: -2 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => generatePDF(slip)}
                        className="p-3 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 text-primary hover:bg-primary hover:text-white transition-all"
                        title="Download Slip"
                      >
                        <Download className="w-5 h-5" />
                      </motion.button>
                    </td>
                  </tr>
                );
              })}
              {filteredSlips.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-400">
                      <Search className="w-12 h-12 mb-4 opacity-20" />
                      <p className="text-lg font-black tracking-tight uppercase">No payroll records found</p>
                      <p className="text-sm font-medium opacity-60">Try adjusting your search term</p>
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
              className="vibrant-card w-full max-w-lg overflow-hidden border-none shadow-2xl"
            >
              <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-primary text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 -mr-16 -mt-16 rounded-full blur-2xl"></div>
                <h3 className="text-2xl font-black tracking-tight uppercase relative z-10">Generate Salary Slip</h3>
                <button onClick={() => setIsModalOpen(false)} className="text-white/60 hover:text-white transition-colors relative z-10">
                  <XCircle className="w-8 h-8" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-8 space-y-6 bg-white dark:bg-slate-900">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Staff Member</label>
                    <div className="relative">
                      <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <select required className="vibrant-input pl-12" value={formData.staffId} onChange={(e) => setFormData({ ...formData, staffId: e.target.value })}>
                        <option value="">Select Staff</option>
                        {staff.map(s => <option key={s.id} value={s.id}>{s.fullName} ({s.role})</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Month</label>
                      <select className="vibrant-input" value={formData.month} onChange={(e) => setFormData({ ...formData, month: Number(e.target.value) })}>
                        {Array.from({ length: 12 }, (_, i) => (
                          <option key={i + 1} value={i + 1}>{new Date(0, i).toLocaleString('default', { month: 'long' })}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Year</label>
                      <input type="number" className="vibrant-input" value={formData.year} onChange={(e) => setFormData({ ...formData, year: Number(e.target.value) })} />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Basic</label>
                      <input type="number" required className="vibrant-input" value={formData.basicSalary} onChange={(e) => setFormData({ ...formData, basicSalary: Number(e.target.value) })} />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Allowances</label>
                      <input type="number" className="vibrant-input" value={formData.allowances} onChange={(e) => setFormData({ ...formData, allowances: Number(e.target.value) })} />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Deductions</label>
                      <input type="number" className="vibrant-input" value={formData.deductions} onChange={(e) => setFormData({ ...formData, deductions: Number(e.target.value) })} />
                    </div>
                  </div>
                  <div className="p-6 bg-primary/5 dark:bg-primary/10 rounded-3xl border border-primary/10 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 -mr-12 -mt-12 rounded-full blur-xl group-hover:bg-primary/10 transition-colors"></div>
                    <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1 relative z-10">Estimated Net Salary</p>
                    <p className="text-3xl font-black text-primary tracking-tight relative z-10">Rs. {calculateNet(formData.basicSalary, formData.allowances, formData.deductions).toLocaleString()}</p>
                  </div>
                </div>
                <div className="flex gap-4 pt-6 border-t border-slate-100 dark:border-slate-800">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-6 py-4 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">Cancel</button>
                  <button type="submit" className="flex-1 vibrant-btn-primary py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-primary/20">Generate Slip</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
