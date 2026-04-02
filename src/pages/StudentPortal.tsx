import { useEffect, useState } from 'react';
import { User, Student, FeeVoucher, StudentResult, Exam, Campus, Class } from '../types';
import { dataService } from '../services/dataService';
import { 
  User as UserIcon, 
  CreditCard, 
  FileText, 
  Download, 
  Calendar,
  CheckCircle,
  AlertCircle,
  ShieldCheck,
  School,
  BookOpen,
  TrendingUp,
  XCircle
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { motion, AnimatePresence } from 'motion/react';

interface StudentPortalProps {
  user: User;
}

export default function StudentPortal({ user }: StudentPortalProps) {
  const [student, setStudent] = useState<Student | null>(null);
  const [vouchers, setVouchers] = useState<FeeVoucher[]>([]);
  const [results, setResults] = useState<StudentResult[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [campus, setCampus] = useState<Campus | null>(null);
  const [cls, setCls] = useState<Class | null>(null);

  const [isQuickPayModalOpen, setIsQuickPayModalOpen] = useState(false);
  const [selectedVoucher, setSelectedVoucher] = useState<FeeVoucher | null>(null);
  const [paymentStep, setPaymentStep] = useState<'details' | 'processing' | 'success'>('details');

  useEffect(() => {
    const unsubStudents = dataService.subscribe('students', (data: Student[]) => {
      const found = data.find(s => s.rollNumber === user.username || s.firstName.toLowerCase() === user.fullName.split(' ')[0].toLowerCase());
      if (found) {
        setStudent(found);
        
        dataService.subscribe('feevouchers', (vData: FeeVoucher[]) => {
          setVouchers(vData.filter(v => v.studentId === found.id));
        }, [{ field: 'studentId', operator: '==', value: found.id }]);

        dataService.subscribe('studentresults', (rData: StudentResult[]) => {
          setResults(rData.filter(r => r.studentId === found.id));
        }, [{ field: 'studentId', operator: '==', value: found.id }]);

        dataService.subscribe('campuses', (cData: Campus[]) => {
          setCampus(cData.find(c => c.id === found.campusId) || null);
        });

        dataService.subscribe('classes', (clData: Class[]) => {
          setCls(clData.find(c => c.id === found.classId) || null);
        });
      }
    });

    dataService.subscribe('exams', setExams);

    return () => unsubStudents();
  }, [user]);

  const downloadVoucher = (voucher: FeeVoucher) => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.setTextColor(0, 169, 157); // FISS Teal
    doc.text(campus?.campusName || 'Faizan Islamic School', 105, 20, { align: 'center' });
    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text('FEE VOUCHER', 105, 30, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setTextColor(0);
    doc.text(`Voucher ID: ${voucher.id.substring(0, 8)}`, 20, 45);
    doc.text(`Student: ${student?.firstName} ${student?.lastName}`, 20, 60);
    doc.text(`Roll No: ${student?.rollNumber}`, 20, 67);
    doc.text(`Amount: Rs. ${voucher.totalAmount}`, 20, 74);
    doc.text(`Status: ${voucher.status}`, 20, 81);
    
    const tableData = [
      ['Tuition Fee', 'Included'],
      ['Total Amount', `Rs. ${voucher.totalAmount}`]
    ];

    autoTable(doc, {
      startY: 90,
      head: [['Description', 'Amount']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [0, 169, 157] }
    });

    doc.save(`Voucher_${voucher.voucherMonth}_${voucher.voucherYear}.pdf`);
  };

  const startQuickPay = (voucher: FeeVoucher) => {
    setSelectedVoucher(voucher);
    setPaymentStep('details');
    setIsQuickPayModalOpen(true);
  };

  const handleQuickPayConfirm = async () => {
    if (!student || !selectedVoucher) return;
    
    setPaymentStep('processing');
    await new Promise(resolve => setTimeout(resolve, 2000));

    try {
      await dataService.add('transactions', {
        studentId: student.id,
        voucherId: selectedVoucher.id,
        amount: selectedVoucher.totalAmount - selectedVoucher.paidAmount,
        status: 'Success',
        transactionDate: new Date().toISOString(),
        paymentMethod: 'QuickPay'
      });

      await dataService.update('feevouchers', selectedVoucher.id, {
        status: 'Paid',
        paidAmount: selectedVoucher.totalAmount
      });

      const newOutstanding = Math.max(0, (student.outstandingFees || 0) - (selectedVoucher.totalAmount - selectedVoucher.paidAmount));
      await dataService.update('students', student.id, {
        outstandingFees: newOutstanding
      });

      setPaymentStep('success');
    } catch (error) {
      console.error('Payment error:', error);
      alert('Payment failed. Please try again.');
      setPaymentStep('details');
    }
  };

  if (!student) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-slate-500 dark:text-slate-400">
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-24 h-24 rounded-3xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-6"
        >
          <UserIcon className="w-12 h-12 opacity-20" />
        </motion.div>
        <p className="text-lg font-bold">Student profile not found.</p>
        <p className="text-sm opacity-60">Please contact administration for assistance.</p>
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-12">
      {/* Profile Header */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="vibrant-card p-10 flex flex-col md:flex-row items-center gap-10 relative overflow-hidden group"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 -mr-20 -mt-20 rounded-full blur-3xl group-hover:bg-primary/10 transition-colors duration-500"></div>
        <div className="w-32 h-32 rounded-[2.5rem] bg-primary/10 flex items-center justify-center text-primary shadow-2xl shadow-primary/10 relative z-10">
          <UserIcon className="w-16 h-16" />
        </div>
        <div className="flex-1 text-center md:text-left relative z-10">
          <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">{student.firstName} {student.lastName}</h2>
          <p className="text-xl text-slate-500 dark:text-slate-400 font-medium mt-1">
            Roll Number: <span className="font-mono font-black text-primary">{student.rollNumber}</span>
          </p>
          <div className="mt-6 flex flex-wrap justify-center md:justify-start gap-4">
            <div className="px-5 py-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl text-xs font-black uppercase tracking-widest border border-slate-100 dark:border-slate-700 text-slate-600 dark:text-slate-300">
              <span className="opacity-60 mr-2">Class:</span> {cls?.className}
            </div>
            <div className="px-5 py-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl text-xs font-black uppercase tracking-widest border border-slate-100 dark:border-slate-700 text-slate-600 dark:text-slate-300">
              <span className="opacity-60 mr-2">Campus:</span> {campus?.campusName}
            </div>
            <div className="px-5 py-2.5 bg-danger/10 rounded-2xl text-xs font-black uppercase tracking-widest border border-danger/10 text-danger shadow-lg shadow-danger/5">
              <span className="opacity-60 mr-2">Outstanding:</span> Rs. {student.outstandingFees || 0}
            </div>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Fee Section */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="vibrant-card p-8"
        >
          <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-8 flex items-center gap-4 uppercase tracking-tight">
            <div className="p-3 bg-orange-500/10 rounded-2xl">
              <CreditCard className="w-6 h-6 text-orange-500" />
            </div>
            Fee Vouchers
          </h3>
          <div className="space-y-6">
            {vouchers.length === 0 && (
              <div className="py-12 text-center text-slate-400 italic font-medium">No vouchers found.</div>
            )}
            {vouchers.map(voucher => (
              <div key={voucher.id} className="p-6 bg-slate-50/50 dark:bg-slate-900/50 rounded-3xl border border-slate-100 dark:border-slate-800 flex items-center justify-between group hover:border-primary/30 transition-all">
                <div className="space-y-1">
                  <p className="font-black text-slate-900 dark:text-white text-lg">{voucher.voucherMonth}/{voucher.voucherYear}</p>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Due: {voucher.dueDate}</p>
                </div>
                <div className="text-right flex items-center gap-6">
                  <div>
                    <p className="font-black text-slate-900 dark:text-white text-lg">Rs. {voucher.totalAmount}</p>
                    <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-xl ${
                      voucher.status === 'Paid' ? 'bg-success/10 text-success' : 'bg-orange-500/10 text-orange-500'
                    }`}>
                      {voucher.status}
                    </span>
                  </div>
                  <div className="flex gap-3">
                    {voucher.status === 'Unpaid' && (
                      <motion.button 
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="px-5 py-2.5 bg-primary text-white text-[10px] font-black uppercase tracking-widest rounded-2xl shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all"
                        onClick={() => startQuickPay(voucher)}
                      >
                        Pay Online
                      </motion.button>
                    )}
                    <motion.button 
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => downloadVoucher(voucher)}
                      className="p-3 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 text-primary hover:bg-primary hover:text-white transition-all"
                    >
                      <Download className="w-5 h-5" />
                    </motion.button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Results Section */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="vibrant-card p-8"
        >
          <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-8 flex items-center gap-4 uppercase tracking-tight">
            <div className="p-3 bg-blue-500/10 rounded-2xl">
              <FileText className="w-6 h-6 text-blue-500" />
            </div>
            Exam Results
          </h3>
          <div className="space-y-8">
            {exams.map(exam => {
              const examResults = results.filter(r => r.examId === exam.id);
              if (examResults.length === 0) return null;
              
              const totalObtained = examResults.reduce((acc, curr) => acc + curr.obtainedMarks, 0);
              const totalPossible = examResults.reduce((acc, curr) => acc + curr.totalMarks, 0);
              const percentage = (totalObtained / totalPossible) * 100;

              return (
                <div key={exam.id} className="p-6 bg-slate-50/50 dark:bg-slate-900/50 rounded-3xl border border-slate-100 dark:border-slate-800 group hover:border-primary/30 transition-all">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <p className="font-black text-slate-900 dark:text-white text-lg">{exam.examName}</p>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{new Date(exam.examDate).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-black text-primary tracking-tight">{percentage.toFixed(1)}%</p>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{totalObtained} / {totalPossible}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {examResults.map((r, i) => (
                      <div key={i} className="flex justify-between items-center p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 group-hover:border-primary/10 transition-all">
                        <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">{r.subjectName}</span>
                        <span className="font-black text-slate-900 dark:text-white">{r.obtainedMarks}/{r.totalMarks}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
            {exams.length === 0 && <p className="text-slate-400 dark:text-slate-500 italic text-center py-12">No exam results available.</p>}
          </div>
        </motion.div>
      </div>

      {/* QuickPay Modal */}
      <AnimatePresence>
        {isQuickPayModalOpen && selectedVoucher && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/40 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="vibrant-card w-full max-w-md overflow-hidden border-none shadow-2xl"
            >
              <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-primary text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 -mr-16 -mt-16 rounded-full blur-2xl"></div>
                <div className="flex items-center gap-4 relative z-10">
                  <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-xl">
                    <CreditCard className="w-6 h-6" />
                  </div>
                  <h3 className="text-2xl font-black tracking-tight uppercase">QuickPay Checkout</h3>
                </div>
                <button onClick={() => setIsQuickPayModalOpen(false)} className="text-white/60 hover:text-white transition-colors relative z-10">
                  <XCircle className="w-8 h-8" />
                </button>
              </div>
              
              <div className="p-10 bg-white dark:bg-slate-900">
                {paymentStep === 'details' && (
                  <div className="space-y-8">
                    <div className="p-6 bg-primary/5 dark:bg-primary/10 rounded-3xl border border-primary/10">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Voucher Month</span>
                        <span className="font-black text-slate-900 dark:text-white">{selectedVoucher.voucherMonth}/{selectedVoucher.voucherYear}</span>
                      </div>
                      <div className="flex justify-between items-center pt-4 border-t border-primary/10">
                        <span className="text-sm font-bold text-slate-600 dark:text-slate-300">Amount to Pay</span>
                        <span className="text-3xl font-black text-primary tracking-tight">Rs. {selectedVoucher.totalAmount - selectedVoucher.paidAmount}</span>
                      </div>
                    </div>
                    
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Card Number</label>
                        <input type="text" placeholder="xxxx xxxx xxxx xxxx" className="vibrant-input" />
                      </div>
                      <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Expiry</label>
                          <input type="text" placeholder="MM/YY" className="vibrant-input" />
                        </div>
                        <div className="space-y-2">
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">CVV</label>
                          <input type="password" placeholder="***" className="vibrant-input" />
                        </div>
                      </div>
                    </div>

                    <motion.button 
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleQuickPayConfirm}
                      className="w-full vibrant-btn-primary py-5 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-primary/20"
                    >
                      Pay Securely Now
                    </motion.button>
                    <p className="text-center text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center justify-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-success" /> Secure 256-bit SSL Encrypted Payment
                    </p>
                  </div>
                )}

                {paymentStep === 'processing' && (
                  <div className="py-16 text-center space-y-6">
                    <div className="w-20 h-20 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto shadow-xl shadow-primary/10"></div>
                    <div>
                      <p className="text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Processing Payment</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-2">Please do not close this window</p>
                    </div>
                  </div>
                )}

                {paymentStep === 'success' && (
                  <div className="py-16 text-center space-y-8">
                    <motion.div 
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="w-24 h-24 bg-success/10 text-success rounded-[2rem] flex items-center justify-center mx-auto shadow-xl shadow-success/10"
                    >
                      <CheckCircle className="w-14 h-14" />
                    </motion.div>
                    <div>
                      <h4 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Payment Successful</h4>
                      <p className="text-slate-500 dark:text-slate-400 font-medium mt-3">Your fee records have been updated instantly.</p>
                    </div>
                    <motion.button 
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setIsQuickPayModalOpen(false)}
                      className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-5 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-xl shadow-slate-900/10 dark:shadow-white/10"
                    >
                      Back to Portal
                    </motion.button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
