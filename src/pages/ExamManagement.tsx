import React, { useEffect, useState } from 'react';
import { Plus, Search, FileText, Download, Award, BookOpen, XCircle, Calendar, School, Filter } from 'lucide-react';
import { Exam, StudentResult, Student, Campus, Class } from '../types';
import { dataService } from '../services/dataService';
import { motion, AnimatePresence } from 'motion/react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from 'sonner';

export default function ExamManagement() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [results, setResults] = useState<StudentResult[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedExam, setSelectedExam] = useState<string>('');
  const [selectedClass, setSelectedClass] = useState<string>('');

  useEffect(() => {
    const unsubExams = dataService.subscribe('exams', setExams);
    const unsubResults = dataService.subscribe('studentresults', setResults);
    const unsubStudents = dataService.subscribe('students', setStudents);
    const unsubCampuses = dataService.subscribe('campuses', setCampuses);
    const unsubClasses = dataService.subscribe('classes', setClasses);
    
    return () => {
      unsubExams();
      unsubResults();
      unsubStudents();
      unsubCampuses();
      unsubClasses();
    };
  }, []);

  const downloadResultCard = (studentId: string, examId: string) => {
    const student = students.find(s => s.id === studentId);
    const exam = exams.find(e => e.id === examId);
    const campus = campuses.find(c => c.id === student?.campusId);
    const studentResults = results.filter(r => r.studentId === studentId && r.examId === examId);

    const doc = new jsPDF() as any;
    
    // Header
    doc.setFontSize(22);
    doc.setTextColor(99, 102, 241); // Indigo
    doc.text(campus?.campusName || 'Faizan Islamic School', 105, 20, { align: 'center' });
    doc.setFontSize(14);
    doc.setTextColor(100);
    doc.text(`RESULT CARD - ${exam?.examName}`, 105, 30, { align: 'center' });
    
    // Student Info
    doc.setFontSize(11);
    doc.setTextColor(0);
    doc.text(`Student: ${student?.firstName} ${student?.lastName}`, 20, 45);
    doc.text(`Roll No: ${student?.rollNumber}`, 20, 52);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 150, 45);
    
    doc.setDrawColor(99, 102, 241);
    doc.line(20, 55, 190, 55);
    
    // Results Table
    const tableData = studentResults.map(r => [
      r.subjectName,
      r.totalMarks,
      r.obtainedMarks,
      r.grade,
      r.remarks || ''
    ]);

    const totalObtained = studentResults.reduce((acc, curr) => acc + curr.obtainedMarks, 0);
    const totalPossible = studentResults.reduce((acc, curr) => acc + curr.totalMarks, 0);
    const percentage = (totalObtained / totalPossible) * 100;

    autoTable(doc, {
      startY: 65,
      head: [['Subject', 'Total', 'Obtained', 'Grade', 'Remarks']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [99, 102, 241] }
    });

    const finalY = (doc as any).lastAutoTable.finalY;
    doc.setFontSize(12);
    doc.text(`Total Marks: ${totalObtained} / ${totalPossible}`, 20, finalY + 15);
    doc.text(`Percentage: ${percentage.toFixed(2)}%`, 20, finalY + 22);
    
    let finalGrade = 'F';
    if (percentage >= 90) finalGrade = 'A+';
    else if (percentage >= 80) finalGrade = 'A';
    else if (percentage >= 70) finalGrade = 'B';
    else if (percentage >= 60) finalGrade = 'C';
    else if (percentage >= 50) finalGrade = 'D';
    
    doc.setFontSize(14);
    doc.setTextColor(99, 102, 241);
    doc.text(`Final Grade: ${finalGrade}`, 150, finalY + 15);
    doc.setTextColor(100);
    doc.setFontSize(10);
    doc.text('Principal Signature: ____________________', 120, finalY + 40);

    doc.save(`Result_${student?.rollNumber}_${exam?.examName}.pdf`);
  };

  const [formData, setFormData] = useState({
    examName: '',
    examDate: new Date().toISOString().split('T')[0],
    campusId: '',
    status: 'Active' as const
  });

  const handleAddExam = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.examName.trim()) {
      toast.error('Exam name is required');
      return;
    }
    if (!formData.campusId) {
      toast.error('Please select a campus');
      return;
    }

    try {
      await dataService.add('exams', formData);
      toast.success('Exam created successfully');
      setIsModalOpen(false);
      setFormData({
        examName: '',
        examDate: new Date().toISOString().split('T')[0],
        campusId: '',
        status: 'Active'
      });
    } catch (error) {
      console.error('Error creating exam:', error);
      toast.error('Failed to create exam');
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Examination & Results</h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">Manage academic assessments and student performance</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setIsModalOpen(true)}
          className="vibrant-btn-primary px-6 py-3 rounded-2xl flex items-center gap-3 shadow-xl shadow-primary/20"
        >
          <Plus className="w-5 h-5" />
          <span className="text-[10px] font-black uppercase tracking-widest">Create New Exam</span>
        </motion.button>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/40 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: 20 }} 
              className="vibrant-card w-full max-w-md overflow-hidden border-none shadow-2xl"
            >
              <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-primary text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 -mr-16 -mt-16 rounded-full blur-2xl"></div>
                <h3 className="text-2xl font-black tracking-tight uppercase relative z-10">New Exam</h3>
                <button onClick={() => setIsModalOpen(false)} className="text-white/60 hover:text-white transition-colors relative z-10">
                  <XCircle className="w-8 h-8" />
                </button>
              </div>
              <form onSubmit={handleAddExam} className="p-8 space-y-6 bg-white dark:bg-slate-900">
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Exam Name</label>
                  <input required className="vibrant-input" value={formData.examName} onChange={(e) => setFormData({ ...formData, examName: e.target.value })} placeholder="e.g. Mid Term 2026" />
                </div>
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Exam Date</label>
                  <input type="date" required className="vibrant-input" value={formData.examDate} onChange={(e) => setFormData({ ...formData, examDate: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Campus</label>
                  <select required className="vibrant-input" value={formData.campusId} onChange={(e) => setFormData({ ...formData, campusId: e.target.value })}>
                    <option value="">Select Campus</option>
                    {campuses.map(c => <option key={c.id} value={c.id}>{c.campusName}</option>)}
                  </select>
                </div>
                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-6 py-3 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">Cancel</button>
                  <button type="submit" className="flex-1 vibrant-btn-primary py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-primary/20">Create Exam</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Exam List */}
        <div className="lg:col-span-1 space-y-6">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-3 ml-1">
            <Calendar className="w-4 h-4 text-primary" />
            Active Exams
          </h3>
          <div className="space-y-3">
            {exams.map(exam => (
              <motion.button
                key={exam.id}
                whileHover={{ x: 4 }}
                onClick={() => setSelectedExam(exam.id)}
                className={`w-full text-left p-5 rounded-3xl border transition-all relative overflow-hidden group ${
                  selectedExam === exam.id 
                    ? 'bg-primary border-primary shadow-xl shadow-primary/20' 
                    : 'vibrant-card border-slate-100 dark:border-slate-800 hover:border-primary/30'
                }`}
              >
                {selectedExam === exam.id && (
                  <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 -mr-12 -mt-12 rounded-full blur-xl"></div>
                )}
                <p className={`font-black text-lg tracking-tight ${selectedExam === exam.id ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
                  {exam.examName}
                </p>
                <p className={`text-[10px] font-black uppercase tracking-widest mt-1 ${selectedExam === exam.id ? 'text-white/60' : 'text-slate-400'}`}>
                  {new Date(exam.examDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              </motion.button>
            ))}
            {exams.length === 0 && (
              <div className="p-10 text-center vibrant-card border-dashed border-slate-200 dark:border-slate-800">
                <p className="text-slate-400 font-medium text-sm">No exams found</p>
              </div>
            )}
          </div>
        </div>

        {/* Results View */}
        <div className="lg:col-span-3">
          {selectedExam ? (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="vibrant-card overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-900/50">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-primary/10 rounded-2xl">
                    <Award className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight uppercase">
                      {exams.find(e => e.id === selectedExam)?.examName}
                    </h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Student Performance Records</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Filter className="w-4 h-4 text-slate-400" />
                  <select 
                    className="vibrant-input py-2 px-4 text-xs font-black uppercase tracking-widest min-w-[160px]"
                    value={selectedClass}
                    onChange={(e) => setSelectedClass(e.target.value)}
                  >
                    <option value="">All Classes</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.className}</option>)}
                  </select>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 dark:bg-slate-900/50 text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">
                      <th className="px-8 py-5">Student</th>
                      <th className="px-8 py-5">Subject Performance</th>
                      <th className="px-8 py-5">Aggregate</th>
                      <th className="px-8 py-5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {students
                      .filter(s => !selectedClass || s.classId === selectedClass)
                      .map(student => {
                        const studentResults = results.filter(r => r.studentId === student.id && r.examId === selectedExam);
                        const totalObtained = studentResults.reduce((acc, curr) => acc + curr.obtainedMarks, 0);
                        const totalPossible = studentResults.reduce((acc, curr) => acc + curr.totalMarks, 0);
                        const percentage = totalPossible > 0 ? (totalObtained / totalPossible) * 100 : 0;
                        
                        return (
                          <tr key={student.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group">
                            <td className="px-8 py-6">
                              <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 font-black text-xs group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                                  {student.firstName[0]}{student.lastName[0]}
                                </div>
                                <div>
                                  <div className="font-black text-slate-900 dark:text-white tracking-tight">{student.firstName} {student.lastName}</div>
                                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{student.rollNumber}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-8 py-6">
                              <div className="flex flex-wrap gap-2 max-w-[300px]">
                                {studentResults.map((r, i) => (
                                  <span key={i} className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-[9px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest border border-slate-200/50 dark:border-slate-700/50">
                                    {r.subjectName}: <span className="text-primary">{r.obtainedMarks}</span>
                                  </span>
                                ))}
                                {studentResults.length === 0 && <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">No marks entered</span>}
                              </div>
                            </td>
                            <td className="px-8 py-6">
                              <div className="flex items-center gap-4">
                                <div className="space-y-1">
                                  <div className="font-black text-slate-900 dark:text-white text-lg tracking-tight">{totalObtained} / {totalPossible}</div>
                                  <div className="w-24 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                    <motion.div 
                                      initial={{ width: 0 }}
                                      animate={{ width: `${percentage}%` }}
                                      className={`h-full rounded-full ${percentage >= 50 ? 'bg-success' : 'bg-danger'}`}
                                    />
                                  </div>
                                </div>
                                <span className={`text-sm font-black ${percentage >= 50 ? 'text-success' : 'text-danger'}`}>
                                  {percentage.toFixed(1)}%
                                </span>
                              </div>
                            </td>
                            <td className="px-8 py-6 text-right">
                              <motion.button 
                                whileHover={{ scale: 1.1, y: -2 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => downloadResultCard(student.id, selectedExam)}
                                disabled={studentResults.length === 0}
                                className="p-3 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 text-primary hover:bg-primary hover:text-white transition-all disabled:opacity-20 disabled:cursor-not-allowed"
                              >
                                <Download className="w-5 h-5" />
                              </motion.button>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </motion.div>
          ) : (
            <div className="h-[400px] flex flex-col items-center justify-center vibrant-card border-dashed border-slate-200 dark:border-slate-800 text-slate-400">
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="p-6 bg-slate-50 dark:bg-slate-900 rounded-[2.5rem] mb-6"
              >
                <Award className="w-16 h-16 opacity-20" />
              </motion.div>
              <p className="text-lg font-black tracking-tight uppercase">Select an exam</p>
              <p className="text-sm font-medium opacity-60">Choose an active assessment to view and manage results</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
