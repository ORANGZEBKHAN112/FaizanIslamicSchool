import React, { useEffect, useState } from 'react';
import { Plus, Search, FileText, Download, CheckCircle, AlertCircle, Filter, XCircle } from 'lucide-react';
import { FeeVoucher, Student, Campus, Class, FeeStructure } from '../types';
import { dataService } from '../services/dataService';
import { motion, AnimatePresence } from 'motion/react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from 'sonner';

export default function FeeManagement() {
  const [vouchers, setVouchers] = useState<FeeVoucher[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [feeStructures, setFeeStructures] = useState<FeeStructure[]>([]);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isStructureModalOpen, setIsStructureModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedVoucher, setSelectedVoucher] = useState<FeeVoucher | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  
  const [structureForm, setStructureForm] = useState({
    campusId: '',
    classId: '',
    tuitionFee: 0,
    admissionFee: 0,
    examFee: 0,
    transportFee: 0,
    miscFee: 0
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCampus, setSelectedCampus] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  useEffect(() => {
    const unsubVouchers = dataService.subscribe('feeVouchers', setVouchers);
    const unsubStudents = dataService.subscribe('students', setStudents);
    const unsubCampuses = dataService.subscribe('campuses', setCampuses);
    const unsubClasses = dataService.subscribe('classes', setClasses);
    const unsubStructures = dataService.subscribe('feeStructures', setFeeStructures);
    
    return () => {
      unsubVouchers();
      unsubStudents();
      unsubCampuses();
      unsubClasses();
      unsubStructures();
    };
  }, []);

  const generateVouchers = async () => {
    const month = new Date().getMonth() + 1;
    const year = new Date().getFullYear();
    const dueDate = new Date(year, month, 10).toISOString().split('T')[0];

    const activeStudents = students.filter(s => s.status === 'Active');
    
    if (activeStudents.length === 0) {
      toast.error('No active students found to generate vouchers.');
      return;
    }

    if (feeStructures.length === 0) {
      toast.error('No fee structures defined. Please set up fee structures first.');
      return;
    }

    let count = 0;
    try {
      for (const student of activeStudents) {
        const structure = feeStructures.find(f => f.campusId === student.campusId && f.classId === student.classId);
        if (structure) {
          // Monthly voucher typically includes tuition, transport, and misc
          const totalAmount = structure.tuitionFee + structure.transportFee + structure.miscFee;
          
          // Check if voucher already exists for this month/year
          const exists = vouchers.find(v => v.studentId === student.id && v.voucherMonth === month && v.voucherYear === year);
          if (!exists) {
            await dataService.add('feeVouchers', {
              studentId: student.id,
              campusId: student.campusId,
              voucherMonth: month,
              voucherYear: year,
              dueDate,
              totalAmount,
              paidAmount: 0,
              status: 'Unpaid',
              generatedOn: new Date().toISOString()
            });

            // Update student outstanding fees
            const newOutstanding = (student.outstandingFees || 0) + totalAmount;
            await dataService.update('students', student.id, {
              outstandingFees: newOutstanding
            });

            count++;
          }
        }
      }
      if (count > 0) {
        toast.success(`${count} vouchers generated for current month!`);
      } else {
        toast.info('Vouchers already exist for all students for this month.');
      }
    } catch (error) {
      console.error('Error generating vouchers:', error);
      toast.error('Failed to generate vouchers');
    }
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVoucher) return;

    if (paymentAmount <= 0) {
      toast.error('Please enter a valid payment amount');
      return;
    }

    try {
      const newPaidAmount = selectedVoucher.paidAmount + paymentAmount;
      const isFullyPaid = newPaidAmount >= selectedVoucher.totalAmount;
      
      // 1. Update Voucher
      await dataService.update('feeVouchers', selectedVoucher.id, {
        status: isFullyPaid ? 'Paid' : 'Unpaid',
        paidAmount: newPaidAmount
      });

      // 2. Update Student Outstanding Fees
      const student = students.find(s => s.id === selectedVoucher.studentId);
      if (student) {
        const newOutstanding = Math.max(0, (student.outstandingFees || 0) - paymentAmount);
        await dataService.update('students', student.id, {
          outstandingFees: newOutstanding
        });
      }

      // 3. Add Transaction Log
      await dataService.add('transactions', {
        studentId: selectedVoucher.studentId,
        voucherId: selectedVoucher.id,
        amount: paymentAmount,
        status: 'Success',
        transactionDate: new Date().toISOString()
      });
      
      setIsPaymentModalOpen(false);
      setSelectedVoucher(null);
      setPaymentAmount(0);
      toast.success('Payment recorded successfully.');
    } catch (error) {
      console.error('Error recording payment:', error);
      toast.error('Failed to record payment.');
    }
  };

  const openPaymentModal = (voucher: FeeVoucher) => {
    setSelectedVoucher(voucher);
    setPaymentAmount(voucher.totalAmount - voucher.paidAmount);
    setIsPaymentModalOpen(true);
  };

  const downloadPDF = (voucher: FeeVoucher) => {
    const student = students.find(s => s.id === voucher.studentId);
    const campus = campuses.find(c => c.id === voucher.campusId);
    const cls = classes.find(c => c.id === student?.classId);

    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20);
    doc.setTextColor(0, 169, 157);
    doc.text(campus?.campusName || 'Faizan Islamic School', 105, 20, { align: 'center' });
    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text('FEE VOUCHER', 105, 30, { align: 'center' });
    
    // Student Info
    doc.setFontSize(10);
    doc.setTextColor(0);
    doc.text(`Voucher ID: ${voucher.id.substring(0, 8)}`, 20, 45);
    doc.text(`Date: ${new Date(voucher.generatedOn).toLocaleDateString()}`, 150, 45);
    
    doc.setDrawColor(200);
    doc.line(20, 50, 190, 50);
    
    doc.text(`Student Name: ${student?.firstName} ${student?.lastName}`, 20, 60);
    doc.text(`Roll Number: ${student?.rollNumber}`, 20, 67);
    doc.text(`Class: ${cls?.className} - ${cls?.sectionName}`, 20, 74);
    doc.text(`Month/Year: ${voucher.voucherMonth}/${voucher.voucherYear}`, 150, 60);
    doc.text(`Due Date: ${voucher.dueDate}`, 150, 67);
    
    // Table
    const structure = feeStructures.find(f => f.campusId === student?.campusId && f.classId === student?.classId);
    const tableData = [
      ['Tuition Fee', `Rs. ${structure?.tuitionFee?.toLocaleString() || '0'}`],
      ['Admission Fee', `Rs. ${structure?.admissionFee?.toLocaleString() || '0'}`],
      ['Exam Fee', `Rs. ${structure?.examFee?.toLocaleString() || '0'}`],
      ['Transport Fee', `Rs. ${structure?.transportFee?.toLocaleString() || '0'}`],
      ['Misc. Fee', `Rs. ${structure?.miscFee?.toLocaleString() || '0'}`],
      [{ content: 'Total Amount', styles: { fontStyle: 'bold' as const } }, { content: `Rs. ${voucher.totalAmount.toLocaleString()}`, styles: { fontStyle: 'bold' as const } }],
    ];

    autoTable(doc, {
      startY: 85,
      head: [['Description', 'Amount (PKR)']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [0, 169, 157] },
      styles: { fontSize: 10 }
    });

    const finalY = (doc as any).lastAutoTable.finalY;
    doc.setFontSize(11);
    doc.text(`Status: ${voucher.status}`, 20, finalY + 15);
    doc.text('Authorized Signature: ____________________', 120, finalY + 30);

    doc.save(`Voucher_${student?.rollNumber}_${voucher.voucherMonth}.pdf`);
  };

  const downloadAllVouchers = () => {
    if (filteredVouchers.length === 0) {
      toast.error('No vouchers to download.');
      return;
    }
    
    const doc = new jsPDF();
    let currentY = 20;

    filteredVouchers.forEach((voucher, index) => {
      const student = students.find(s => s.id === voucher.studentId);
      const campus = campuses.find(c => c.id === voucher.campusId);
      const cls = classes.find(c => c.id === student?.classId);

      if (index > 0) {
        doc.addPage();
        currentY = 20;
      }

      doc.setFontSize(18);
      doc.setTextColor(59, 130, 246);
      doc.text(campus?.campusName || 'Faizan Islamic School', 105, currentY, { align: 'center' });
      
      doc.setFontSize(10);
      doc.setTextColor(0);
      doc.text(`Voucher: ${voucher.id.substring(0, 8)}`, 20, currentY + 15);
      doc.text(`Student: ${student?.firstName} ${student?.lastName} (${student?.rollNumber})`, 20, currentY + 22);
      doc.text(`Class: ${cls?.className}`, 20, currentY + 29);
      doc.text(`Amount: Rs. ${voucher.totalAmount}`, 150, currentY + 22);
      doc.text(`Due: ${voucher.dueDate}`, 150, currentY + 29);
      
      const structure = feeStructures.find(f => f.campusId === student?.campusId && f.classId === student?.classId);
      const tableData = [
        ['Tuition Fee', `Rs. ${structure?.tuitionFee?.toLocaleString() || '0'}`],
        ['Admission Fee', `Rs. ${structure?.admissionFee?.toLocaleString() || '0'}`],
        ['Exam Fee', `Rs. ${structure?.examFee?.toLocaleString() || '0'}`],
        ['Transport Fee', `Rs. ${structure?.transportFee?.toLocaleString() || '0'}`],
        ['Misc. Fee', `Rs. ${structure?.miscFee?.toLocaleString() || '0'}`],
        [{ content: 'Total Amount', styles: { fontStyle: 'bold' as const } }, { content: `Rs. ${voucher.totalAmount.toLocaleString()}`, styles: { fontStyle: 'bold' as const } }],
      ];

      autoTable(doc, {
        startY: currentY + 35,
        head: [['Description', 'Amount (PKR)']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [0, 169, 157] },
        margin: { left: 20, right: 20 },
        styles: { fontSize: 10 }
      });
    });

    doc.save(`Bulk_Vouchers_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const filteredVouchers = vouchers.filter(v => {
    const student = students.find(s => s.id === v.studentId);
    const matchesSearch = student ? `${student.firstName} ${student.lastName} ${student.rollNumber}`.toLowerCase().includes(searchTerm.toLowerCase()) : false;
    const matchesCampus = selectedCampus === 'all' || v.campusId === selectedCampus;
    const matchesStatus = selectedStatus === 'all' || v.status === selectedStatus;
    return matchesSearch && matchesCampus && matchesStatus;
  });

  const handleAddStructure = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!structureForm.campusId) {
      toast.error('Please select a campus');
      return;
    }
    if (!structureForm.classId) {
      toast.error('Please select a class');
      return;
    }

    try {
      await dataService.add('feeStructures', structureForm);
      toast.success('Fee structure saved successfully');
      setIsStructureModalOpen(false);
      setStructureForm({ campusId: '', classId: '', tuitionFee: 0, admissionFee: 0, examFee: 0, transportFee: 0, miscFee: 0 });
    } catch (error) {
      console.error('Error saving fee structure:', error);
      toast.error('Failed to save fee structure');
    }
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">Fee Management</h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Manage fee structures, generate vouchers, and track collections.</p>
        </div>
        <div className="flex items-center gap-3">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setIsStructureModalOpen(true)}
            className="vibrant-glass text-slate-700 dark:text-slate-300 px-6 py-3 rounded-2xl border border-white dark:border-slate-800 flex items-center gap-2 hover:bg-white dark:hover:bg-slate-800 transition-all shadow-sm text-[10px] font-black uppercase tracking-widest"
          >
            <AlertCircle className="w-4 h-4" />
            Structures
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={downloadAllVouchers}
            className="vibrant-glass text-primary px-6 py-3 rounded-2xl border border-white dark:border-slate-800 flex items-center gap-2 hover:bg-white dark:hover:bg-slate-800 transition-all shadow-sm text-[10px] font-black uppercase tracking-widest"
          >
            <Download className="w-4 h-4" />
            Bulk Download
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={generateVouchers}
            className="vibrant-btn-primary px-6 py-3 rounded-2xl flex items-center gap-2 shadow-xl shadow-primary/20 text-[10px] font-black uppercase tracking-widest"
          >
            <Plus className="w-4 h-4" />
            Generate Vouchers
          </motion.button>
        </div>
      </div>

      <AnimatePresence>
        {isStructureModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/40 backdrop-blur-md">
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="vibrant-card w-full max-w-lg overflow-hidden border-none shadow-2xl">
              <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-primary/10 rounded-2xl">
                    <AlertCircle className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Fee Structures</h3>
                </div>
                <button onClick={() => setIsStructureModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                  <XCircle className="w-8 h-8" />
                </button>
              </div>
              <form onSubmit={handleAddStructure} className="p-10 space-y-8 bg-white dark:bg-slate-900">
                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Campus</label>
                    <select required className="vibrant-input appearance-none" value={structureForm.campusId} onChange={(e) => setStructureForm({ ...structureForm, campusId: e.target.value })}>
                      <option value="">Select Campus</option>
                      {campuses.map(c => <option key={c.id} value={c.id}>{c.campusName}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Class</label>
                    <select required className="vibrant-input appearance-none" value={structureForm.classId} onChange={(e) => setStructureForm({ ...structureForm, classId: e.target.value })}>
                      <option value="">Select Class</option>
                      {classes.map(c => <option key={c.id} value={c.id}>{c.className}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tuition Fee</label>
                    <input type="number" required className="vibrant-input font-black text-primary" value={structureForm.tuitionFee} onChange={(e) => setStructureForm({ ...structureForm, tuitionFee: Number(e.target.value) })} />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Admission Fee</label>
                    <input type="number" required className="vibrant-input font-black text-primary" value={structureForm.admissionFee} onChange={(e) => setStructureForm({ ...structureForm, admissionFee: Number(e.target.value) })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Exam Fee</label>
                    <input type="number" required className="vibrant-input font-black text-primary" value={structureForm.examFee} onChange={(e) => setStructureForm({ ...structureForm, examFee: Number(e.target.value) })} />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Transport Fee</label>
                    <input type="number" required className="vibrant-input font-black text-primary" value={structureForm.transportFee} onChange={(e) => setStructureForm({ ...structureForm, transportFee: Number(e.target.value) })} />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Misc Fee</label>
                  <input type="number" required className="vibrant-input font-black text-primary" value={structureForm.miscFee} onChange={(e) => setStructureForm({ ...structureForm, miscFee: Number(e.target.value) })} />
                </div>
                <div className="flex gap-4 pt-10 border-t border-slate-100 dark:border-slate-800">
                  <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="button" 
                    onClick={() => setIsStructureModalOpen(false)} 
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
                    Save Structure
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {isPaymentModalOpen && selectedVoucher && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/40 backdrop-blur-md">
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="vibrant-card w-full max-w-md overflow-hidden border-none shadow-2xl">
              <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-success/5">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-success/10 rounded-2xl">
                    <CheckCircle className="w-6 h-6 text-success" />
                  </div>
                  <h3 className="text-2xl font-black text-success tracking-tight uppercase">Record Payment</h3>
                </div>
                <button onClick={() => setIsPaymentModalOpen(false)} className="text-success/40 hover:text-success transition-colors">
                  <XCircle className="w-8 h-8" />
                </button>
              </div>
              <form onSubmit={handlePayment} className="p-10 space-y-8 bg-white dark:bg-slate-900">
                <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-700 space-y-4">
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                    <span className="text-slate-400">Total Amount</span>
                    <span className="text-slate-900 dark:text-white">Rs. {selectedVoucher.totalAmount}</span>
                  </div>
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                    <span className="text-slate-400">Already Paid</span>
                    <span className="text-success">Rs. {selectedVoucher.paidAmount}</span>
                  </div>
                  <div className="flex justify-between text-sm font-black border-t border-slate-100 dark:border-slate-700 pt-4">
                    <span className="text-slate-400 uppercase tracking-widest text-[10px]">Remaining</span>
                    <span className="text-primary text-lg">Rs. {selectedVoucher.totalAmount - selectedVoucher.paidAmount}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Payment Amount</label>
                  <input 
                    type="number" 
                    required 
                    max={selectedVoucher.totalAmount - selectedVoucher.paidAmount}
                    className="vibrant-input font-black text-primary text-xl" 
                    value={paymentAmount} 
                    onChange={(e) => setPaymentAmount(Number(e.target.value))} 
                  />
                </div>
                <div className="flex gap-4 pt-6">
                  <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="button" 
                    onClick={() => setIsPaymentModalOpen(false)} 
                    className="flex-1 px-8 py-4 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all hover:bg-slate-200 dark:hover:bg-slate-700"
                  >
                    Cancel
                  </motion.button>
                  <motion.button 
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit" 
                    className="vibrant-btn-primary bg-success hover:bg-success/90 flex-1 px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-success/20"
                  >
                    Confirm Payment
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="vibrant-card overflow-hidden">
        <div className="p-8 border-b border-slate-100 dark:border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-primary transition-colors" />
            <input
              type="text"
              placeholder="Search by student..."
              className="vibrant-input pl-12"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select
            className="vibrant-input appearance-none"
            value={selectedCampus}
            onChange={(e) => setSelectedCampus(e.target.value)}
          >
            <option value="all">All Campuses</option>
            {campuses.map(c => (
              <option key={c.id} value={c.id}>{c.campusName}</option>
            ))}
          </select>
          <select
            className="vibrant-input appearance-none"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="Paid">Paid</option>
            <option value="Unpaid">Unpaid</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-800/50 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                <th className="px-8 py-5">Voucher ID</th>
                <th className="px-8 py-5">Student</th>
                <th className="px-8 py-5">Month/Year</th>
                <th className="px-8 py-5">Amount</th>
                <th className="px-8 py-5">Status</th>
                <th className="px-8 py-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredVouchers.map((voucher) => {
                const student = students.find(s => s.id === voucher.studentId);
                return (
                  <tr key={voucher.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group">
                    <td className="px-8 py-5 font-mono text-[10px] font-black text-slate-400">{voucher.id.substring(0, 8)}</td>
                    <td className="px-8 py-5">
                      <div className="font-bold text-slate-900 dark:text-white group-hover:text-primary transition-colors">{student?.firstName} {student?.lastName}</div>
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">{student?.rollNumber}</div>
                    </td>
                    <td className="px-8 py-5 text-sm font-medium text-slate-500 dark:text-slate-400">{voucher.voucherMonth}/{voucher.voucherYear}</td>
                    <td className="px-8 py-5 font-black text-slate-900 dark:text-white">Rs. {voucher.totalAmount}</td>
                    <td className="px-8 py-5">
                      {voucher.status === 'Paid' ? (
                        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest bg-success/10 text-success">
                          <CheckCircle className="w-3 h-3" /> Paid
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest bg-accent/10 text-accent">
                          <AlertCircle className="w-3 h-3" /> Unpaid
                        </span>
                      )}
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {voucher.status !== 'Paid' && (
                          <motion.button 
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => openPaymentModal(voucher)}
                            className="p-2.5 text-success hover:bg-success/10 rounded-xl transition-all"
                            title="Record Payment"
                          >
                            <CheckCircle className="w-5 h-5" />
                          </motion.button>
                        )}
                        <motion.button 
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => downloadPDF(voucher)}
                          className="p-2.5 text-primary hover:bg-primary/10 rounded-xl transition-all"
                          title="Download PDF"
                        >
                          <Download className="w-5 h-5" />
                        </motion.button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
