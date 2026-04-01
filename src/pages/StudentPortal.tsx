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
  AlertCircle
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

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

  useEffect(() => {
    // In a real app, the user.id would link to a student record
    // For demo, we'll find the student by username or email
    const unsubStudents = dataService.subscribe('students', (data: Student[]) => {
      const found = data.find(s => s.rollNumber === user.username || s.firstName.toLowerCase() === user.fullName.split(' ')[0].toLowerCase());
      if (found) {
        setStudent(found);
        
        // Load related data
        dataService.subscribe('feeVouchers', (vData: FeeVoucher[]) => {
          setVouchers(vData.filter(v => v.studentId === found.id));
        }, [{ field: 'studentId', operator: '==', value: found.id }]);

        dataService.subscribe('studentResults', (rData: StudentResult[]) => {
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
    doc.setTextColor(59, 130, 246);
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

    (doc as any).autoTable({
      startY: 90,
      head: [['Description', 'Amount']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246] }
    });

    doc.save(`Voucher_${voucher.voucherMonth}_${voucher.voucherYear}.pdf`);
  };

  const handlePayOnline = async (voucher: FeeVoucher) => {
    if (!student) return;
    
    if (window.confirm(`Proceed to pay Rs. ${voucher.totalAmount} via QuickPay?`)) {
      try {
        // 1. Add Transaction
        await dataService.add('transactions', {
          studentId: student.id,
          amount: voucher.totalAmount,
          status: 'Success',
          transactionDate: new Date().toISOString(),
          paymentMethod: 'QuickPay'
        });

        // 2. Update Voucher
        await dataService.update('feeVouchers', voucher.id, {
          status: 'Paid',
          paidAmount: voucher.totalAmount
        });

        // 3. Update Student Outstanding Fees
        const newOutstanding = Math.max(0, (student.outstandingFees || 0) - voucher.totalAmount);
        await dataService.update('students', student.id, {
          outstandingFees: newOutstanding
        });

        alert('Payment successful! Your records have been updated.');
      } catch (error) {
        console.error('Payment error:', error);
        alert('Payment failed. Please try again.');
      }
    }
  };

  if (!student) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
        <UserIcon className="w-12 h-12 mb-2 opacity-20" />
        <p>Student profile not found. Please contact administration.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Profile Header */}
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 flex flex-col md:flex-row items-center gap-8">
        <div className="w-32 h-32 rounded-3xl bg-blue-100 flex items-center justify-center text-blue-600">
          <UserIcon className="w-16 h-16" />
        </div>
        <div className="flex-1 text-center md:text-left">
          <h2 className="text-3xl font-bold text-gray-900">{student.firstName} {student.lastName}</h2>
          <p className="text-lg text-gray-500">Roll Number: <span className="font-mono font-bold text-blue-600">{student.rollNumber}</span></p>
          <div className="mt-4 flex flex-wrap justify-center md:justify-start gap-4">
            <div className="px-4 py-2 bg-gray-50 rounded-xl text-sm border border-gray-100">
              <span className="text-gray-500">Class:</span> <span className="font-bold">{cls?.className}</span>
            </div>
            <div className="px-4 py-2 bg-gray-50 rounded-xl text-sm border border-gray-100">
              <span className="text-gray-500">Campus:</span> <span className="font-bold">{campus?.campusName}</span>
            </div>
            <div className="px-4 py-2 bg-red-50 rounded-xl text-sm border border-red-100">
              <span className="text-red-500">Outstanding Fees:</span> <span className="font-bold text-red-600">Rs. {student.outstandingFees || 0}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Fee Section */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
          <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-orange-500" />
            Fee Vouchers
          </h3>
          <div className="space-y-4">
            {vouchers.length === 0 && <p className="text-gray-400 italic">No vouchers found.</p>}
            {vouchers.map(voucher => (
              <div key={voucher.id} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-between">
                <div>
                  <p className="font-bold text-gray-900">{voucher.voucherMonth}/{voucher.voucherYear}</p>
                  <p className="text-xs text-gray-500">Due: {voucher.dueDate}</p>
                </div>
                <div className="text-right flex items-center gap-4">
                  <div>
                    <p className="font-bold text-gray-900">Rs. {voucher.totalAmount}</p>
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${voucher.status === 'Paid' ? 'text-green-600' : 'text-orange-600'}`}>
                      {voucher.status}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    {voucher.status === 'Unpaid' && (
                      <button 
                        className="px-3 py-1 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition-colors"
                        onClick={() => handlePayOnline(voucher)}
                      >
                        Pay Online
                      </button>
                    )}
                    <button 
                      onClick={() => downloadVoucher(voucher)}
                      className="p-2 bg-white rounded-xl shadow-sm border border-gray-200 text-blue-600 hover:bg-blue-50 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Results Section */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
          <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <FileText className="w-6 h-6 text-blue-500" />
            Examination Results
          </h3>
          <div className="space-y-4">
            {exams.map(exam => {
              const examResults = results.filter(r => r.examId === exam.id);
              if (examResults.length === 0) return null;
              
              const totalObtained = examResults.reduce((acc, curr) => acc + curr.obtainedMarks, 0);
              const totalPossible = examResults.reduce((acc, curr) => acc + curr.totalMarks, 0);
              const percentage = (totalObtained / totalPossible) * 100;

              return (
                <div key={exam.id} className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="font-bold text-gray-900">{exam.examName}</p>
                      <p className="text-xs text-gray-500">{new Date(exam.examDate).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-blue-600">{percentage.toFixed(1)}%</p>
                      <p className="text-xs text-gray-500">{totalObtained} / {totalPossible}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {examResults.map((r, i) => (
                      <div key={i} className="flex justify-between text-xs p-2 bg-white rounded-lg border border-gray-100">
                        <span className="text-gray-500">{r.subjectName}</span>
                        <span className="font-bold">{r.obtainedMarks}/{r.totalMarks}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
            {exams.length === 0 && <p className="text-gray-400 italic">No exam results available.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
