import React, { useEffect, useState } from 'react';
import { Plus, Search, FileText, Download, CheckCircle, AlertCircle, Filter } from 'lucide-react';
import { FeeVoucher, Student, Campus, Class, FeeStructure } from '../types';
import { dataService } from '../services/dataService';
import { motion, AnimatePresence } from 'motion/react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

export default function FeeManagement() {
  const [vouchers, setVouchers] = useState<FeeVoucher[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [feeStructures, setFeeStructures] = useState<FeeStructure[]>([]);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
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
      alert('No active students found to generate vouchers.');
      return;
    }

    if (feeStructures.length === 0) {
      alert('No fee structures defined. Please set up fee structures first.');
      return;
    }

    let count = 0;
    for (const student of activeStudents) {
      const structure = feeStructures.find(f => f.campusId === student.campusId && f.classId === student.classId);
      if (structure) {
        const totalAmount = structure.tuitionFee + structure.transportFee + structure.miscFee;
        
        // Check if voucher already exists
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
          count++;
        }
      }
    }
    alert(count > 0 ? `${count} vouchers generated for current month!` : 'Vouchers already exist for all students for this month.');
  };

  const markAsPaid = async (voucher: FeeVoucher) => {
    if (window.confirm('Mark this voucher as paid?')) {
      await dataService.update('feeVouchers', voucher.id, {
        status: 'Paid',
        paidAmount: voucher.totalAmount
      });
    }
  };

  const downloadPDF = (voucher: FeeVoucher) => {
    const student = students.find(s => s.id === voucher.studentId);
    const campus = campuses.find(c => c.id === voucher.campusId);
    const cls = classes.find(c => c.id === student?.classId);

    const doc = new jsPDF() as any;
    
    // Header
    doc.setFontSize(20);
    doc.text(campus?.campusName || 'Faizan Islamic School', 105, 20, { align: 'center' });
    doc.setFontSize(12);
    doc.text('FEE VOUCHER', 105, 30, { align: 'center' });
    
    // Student Info
    doc.setFontSize(10);
    doc.text(`Voucher ID: ${voucher.id.substring(0, 8)}`, 20, 45);
    doc.text(`Date: ${new Date(voucher.generatedOn).toLocaleDateString()}`, 150, 45);
    
    doc.line(20, 50, 190, 50);
    
    doc.text(`Student Name: ${student?.firstName} ${student?.lastName}`, 20, 60);
    doc.text(`Roll Number: ${student?.rollNumber}`, 20, 67);
    doc.text(`Class: ${cls?.className} - ${cls?.sectionName}`, 20, 74);
    doc.text(`Month/Year: ${voucher.voucherMonth}/${voucher.voucherYear}`, 150, 60);
    doc.text(`Due Date: ${voucher.dueDate}`, 150, 67);
    
    // Table
    const structure = feeStructures.find(f => f.campusId === student?.campusId && f.classId === student?.classId);
    const tableData = [
      ['Tuition Fee', `$${structure?.tuitionFee || 0}`],
      ['Transport Fee', `$${structure?.transportFee || 0}`],
      ['Misc Charges', `$${structure?.miscFee || 0}`],
      ['Total Amount', `$${voucher.totalAmount}`]
    ];

    doc.autoTable({
      startY: 85,
      head: [['Description', 'Amount']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillStyle: [59, 130, 246] }
    });

    doc.text(`Status: ${voucher.status}`, 20, doc.lastAutoTable.finalY + 15);
    doc.text('Authorized Signature: ____________________', 120, doc.lastAutoTable.finalY + 30);

    doc.save(`Voucher_${student?.rollNumber}_${voucher.voucherMonth}.pdf`);
  };

  const filteredVouchers = vouchers.filter(v => {
    const student = students.find(s => s.id === v.studentId);
    const matchesSearch = student ? `${student.firstName} ${student.lastName} ${student.rollNumber}`.toLowerCase().includes(searchTerm.toLowerCase()) : false;
    const matchesCampus = selectedCampus === 'all' || v.campusId === selectedCampus;
    const matchesStatus = selectedStatus === 'all' || v.status === selectedStatus;
    return matchesSearch && matchesCampus && matchesStatus;
  });

  const [isStructureModalOpen, setIsStructureModalOpen] = useState(false);
  const [structureForm, setStructureForm] = useState({
    campusId: '',
    classId: '',
    tuitionFee: 0,
    transportFee: 0,
    miscFee: 0
  });

  const handleAddStructure = async (e: React.FormEvent) => {
    e.preventDefault();
    await dataService.add('feeStructures', structureForm);
    setIsStructureModalOpen(false);
    setStructureForm({ campusId: '', classId: '', tuitionFee: 0, transportFee: 0, miscFee: 0 });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-gray-900">Fee Management</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setIsStructureModalOpen(true)}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center gap-2"
          >
            <AlertCircle className="w-5 h-5" />
            Fee Structures
          </button>
          <button
            onClick={generateVouchers}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Generate Monthly Vouchers
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isStructureModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900">Manage Fee Structures</h3>
                <button onClick={() => setIsStructureModalOpen(false)} className="text-gray-400 hover:text-gray-600">×</button>
              </div>
              <form onSubmit={handleAddStructure} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Campus</label>
                    <select required className="w-full px-4 py-2 border border-gray-300 rounded-lg" value={structureForm.campusId} onChange={(e) => setStructureForm({ ...structureForm, campusId: e.target.value })}>
                      <option value="">Select Campus</option>
                      {campuses.map(c => <option key={c.id} value={c.id}>{c.campusName}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
                    <select required className="w-full px-4 py-2 border border-gray-300 rounded-lg" value={structureForm.classId} onChange={(e) => setStructureForm({ ...structureForm, classId: e.target.value })}>
                      <option value="">Select Class</option>
                      {classes.map(c => <option key={c.id} value={c.id}>{c.className}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tuition Fee</label>
                  <input type="number" required className="w-full px-4 py-2 border border-gray-300 rounded-lg" value={structureForm.tuitionFee} onChange={(e) => setStructureForm({ ...structureForm, tuitionFee: Number(e.target.value) })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Transport Fee</label>
                  <input type="number" required className="w-full px-4 py-2 border border-gray-300 rounded-lg" value={structureForm.transportFee} onChange={(e) => setStructureForm({ ...structureForm, transportFee: Number(e.target.value) })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Misc Fee</label>
                  <input type="number" required className="w-full px-4 py-2 border border-gray-300 rounded-lg" value={structureForm.miscFee} onChange={(e) => setStructureForm({ ...structureForm, miscFee: Number(e.target.value) })} />
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setIsStructureModalOpen(false)} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">Cancel</button>
                  <button type="submit" className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Save Structure</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by student..."
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select
            className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            value={selectedCampus}
            onChange={(e) => setSelectedCampus(e.target.value)}
          >
            <option value="all">All Campuses</option>
            {campuses.map(c => (
              <option key={c.id} value={c.id}>{c.campusName}</option>
            ))}
          </select>
          <select
            className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
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
              <tr className="bg-gray-50 text-gray-600 text-sm uppercase tracking-wider">
                <th className="px-6 py-4 font-semibold">Voucher ID</th>
                <th className="px-6 py-4 font-semibold">Student</th>
                <th className="px-6 py-4 font-semibold">Month/Year</th>
                <th className="px-6 py-4 font-semibold">Amount</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredVouchers.map((voucher) => {
                const student = students.find(s => s.id === voucher.studentId);
                return (
                  <tr key={voucher.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs text-gray-500">{voucher.id.substring(0, 8)}</td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{student?.firstName} {student?.lastName}</div>
                      <div className="text-xs text-gray-500">{student?.rollNumber}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{voucher.voucherMonth}/{voucher.voucherYear}</td>
                    <td className="px-6 py-4 font-bold text-gray-900">${voucher.totalAmount}</td>
                    <td className="px-6 py-4">
                      {voucher.status === 'Paid' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <CheckCircle className="w-3 h-3" /> Paid
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                          <AlertCircle className="w-3 h-3" /> Unpaid
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {voucher.status === 'Unpaid' && (
                          <button 
                            onClick={() => markAsPaid(voucher)}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Mark as Paid"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}
                        <button 
                          onClick={() => downloadPDF(voucher)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Download PDF"
                        >
                          <Download className="w-4 h-4" />
                        </button>
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
