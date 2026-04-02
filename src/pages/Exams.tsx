import React, { useEffect, useState } from 'react';
import { Plus, Search, FileText, Download, CheckCircle, AlertCircle, Filter, Save, Calendar as CalendarIcon, Award, User as UserIcon, School, GraduationCap, XCircle, BookOpen, BarChart3 } from 'lucide-react';
import { Student, Campus, Class, Exam, StudentResult, User, ExamTerm } from '../types';
import { dataService } from '../services/dataService';
import { motion, AnimatePresence } from 'motion/react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from 'sonner';

interface ExamsProps {
  user: User;
}

export default function Exams({ user }: ExamsProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [results, setResults] = useState<StudentResult[]>([]);
  const [examTerms, setExamTerms] = useState<ExamTerm[]>([]);
  
  const [selectedCampus, setSelectedCampus] = useState<string>(user.campusId || '');
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedExam, setSelectedExam] = useState<string>('');
  
  const [isExamModalOpen, setIsExamModalOpen] = useState(false);
  const [isResultModalOpen, setIsResultModalOpen] = useState(false);
  const [newExam, setNewExam] = useState<Partial<Exam>>({
    examName: '',
    examDate: new Date().toISOString().split('T')[0],
    totalMarks: 100,
    campusId: user.campusId || ''
  });

  const [markingResults, setMarkingResults] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsubStudents = dataService.subscribe('students', setStudents);
    const unsubCampuses = dataService.subscribe('campuses', setCampuses);
    const unsubClasses = dataService.subscribe('classes', setClasses);
    const unsubExams = dataService.subscribe('exams', setExams);
    const unsubResults = dataService.subscribe('studentresults', setResults);
    const unsubTerms = dataService.subscribe('examterms', setExamTerms);
    
    return () => {
      unsubStudents();
      unsubCampuses();
      unsubClasses();
      unsubExams();
      unsubResults();
      unsubTerms();
    };
  }, []);

  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!newExam.examName?.trim()) {
      toast.error('Exam name is required');
      return;
    }
    if (!newExam.campusId) {
      toast.error('Please select a campus');
      return;
    }
    if ((newExam.totalMarks || 0) <= 0) {
      toast.error('Total marks must be greater than 0');
      return;
    }

    try {
      await dataService.add('exams', newExam);
      toast.success('Exam scheduled successfully');
      setIsExamModalOpen(false);
      setNewExam({ examName: '', examDate: new Date().toISOString().split('T')[0], totalMarks: 100, campusId: user.campusId || '' });
    } catch (error) {
      console.error('Error scheduling exam:', error);
      toast.error('Failed to schedule exam');
    }
  };

  const filteredStudents = students.filter(s => 
    (selectedCampus === '' || s.campusId === selectedCampus) &&
    (selectedClass === '' || s.classId === selectedClass) &&
    s.status === 'Active'
  );

  const currentExam = exams.find(e => e.id === selectedExam);

  useEffect(() => {
    if (selectedExam && selectedClass) {
      const existing = results.filter(r => 
        r.examId === selectedExam && 
        filteredStudents.some(s => s.id === r.studentId)
      );
      
      const newMarkingResults: Record<string, number> = {};
      existing.forEach(r => {
        newMarkingResults[r.studentId] = r.obtainedMarks;
      });
      
      setMarkingResults(newMarkingResults);
    }
  }, [selectedExam, selectedClass, results, filteredStudents.length]);

  const saveResults = async () => {
    if (!selectedExam || !selectedClass) {
      toast.error('Please select exam and class');
      return;
    }

    if (filteredStudents.length === 0) {
      toast.error('No students found for the selected class');
      return;
    }

    setLoading(true);
    try {
      for (const student of filteredStudents) {
        const existing = results.find(r => 
          r.examId === selectedExam && 
          r.studentId === student.id
        );

        const obtainedMarks = markingResults[student.id] || 0;
        const totalMarks = currentExam?.totalMarks || 100;
        
        if (obtainedMarks > totalMarks) {
          toast.error(`Obtained marks for ${student.firstName} cannot exceed total marks (${totalMarks})`);
          setLoading(false);
          return;
        }

        const percentage = (obtainedMarks / totalMarks) * 100;
        
        let grade = 'F';
        if (percentage >= 90) grade = 'A+';
        else if (percentage >= 80) grade = 'A';
        else if (percentage >= 70) grade = 'B';
        else if (percentage >= 60) grade = 'C';
        else if (percentage >= 50) grade = 'D';

        const data: Partial<StudentResult> = {
          examId: selectedExam,
          studentId: student.id,
          subjectName: currentExam?.examName || 'General',
          obtainedMarks,
          totalMarks,
          grade,
          status: 'Present',
          isDraft: false
        };

        if (existing) {
          await dataService.update('studentresults', existing.id, data);
        } else {
          await dataService.add('studentresults', data);
        }
      }
      toast.success('Results saved successfully!');
    } catch (error) {
      console.error('Error saving results:', error);
      toast.error('Failed to save results');
    } finally {
      setLoading(false);
    }
  };

  const generateReportCard = (student: Student) => {
    const studentResults = results.filter(r => r.studentId === student.id);
    const campus = campuses.find(c => c.id === student.campusId);
    const cls = classes.find(c => c.id === student.classId);

    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(22);
    doc.setTextColor(99, 102, 241); // Indigo primary
    doc.text(campus?.campusName || 'Faizan Islamic School', 105, 20, { align: 'center' });
    doc.setFontSize(14);
    doc.setTextColor(100);
    doc.text('STUDENT PROGRESS REPORT', 105, 30, { align: 'center' });
    
    // Student Info
    doc.setFontSize(10);
    doc.setTextColor(0);
    doc.text(`Student Name: ${student.firstName} ${student.lastName}`, 20, 45);
    doc.text(`Roll Number: ${student.rollNumber}`, 20, 52);
    doc.text(`Class: ${cls?.className} - ${cls?.sectionName}`, 20, 59);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 150, 45);
    
    doc.setDrawColor(99, 102, 241);
    doc.setLineWidth(0.5);
    doc.line(20, 65, 190, 65);
    
    // Results Table
    const tableData = studentResults.map(r => {
      const exam = exams.find(e => e.id === r.examId);
      return [
        exam?.examName || r.subjectName,
        r.totalMarks,
        r.obtainedMarks,
        r.grade,
        r.remarks || '-'
      ];
    });

    autoTable(doc, {
      startY: 75,
      head: [['Subject/Exam', 'Total Marks', 'Obtained', 'Grade', 'Remarks']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [99, 102, 241] },
      styles: { fontSize: 10 }
    });

    const finalY = (doc as any).lastAutoTable.finalY;
    
    // Summary
    const totalObtained = studentResults.reduce((acc, curr) => acc + curr.obtainedMarks, 0);
    const totalPossible = studentResults.reduce((acc, curr) => acc + curr.totalMarks, 0);
    const percentage = totalPossible > 0 ? (totalObtained / totalPossible) * 100 : 0;

    doc.setFontSize(12);
    doc.text(`Total Marks: ${totalObtained} / ${totalPossible}`, 20, finalY + 15);
    doc.text(`Percentage: ${percentage.toFixed(1)}%`, 20, finalY + 22);
    
    doc.text('Principal Signature: ____________________', 120, finalY + 40);

    doc.save(`ReportCard_${student.rollNumber}.pdf`);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Examination Management</h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">Schedule exams and manage student results</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <motion.button
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setIsExamModalOpen(true)}
            className="vibrant-btn-primary px-6 py-3 rounded-2xl flex items-center gap-3 shadow-xl shadow-primary/20"
          >
            <Plus className="w-5 h-5" />
            <span className="text-[10px] font-black uppercase tracking-widest">Schedule Exam</span>
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={saveResults}
            disabled={loading || !selectedExam || !selectedClass}
            className="px-6 py-3 rounded-2xl flex items-center gap-3 bg-success text-white font-black text-[10px] uppercase tracking-widest shadow-xl shadow-success/20 hover:bg-success/90 transition-all disabled:opacity-50 disabled:shadow-none"
          >
            <Save className="w-5 h-5" />
            {loading ? 'Saving...' : 'Save Results'}
          </motion.button>
        </div>
      </div>

      {/* Filters */}
      <div className="vibrant-card p-8 grid grid-cols-1 md:grid-cols-3 gap-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 -mr-16 -mt-16 rounded-full blur-3xl"></div>
        
        <div className="space-y-2 relative z-10">
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Campus</label>
          <div className="relative">
            <School className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <select
              className="vibrant-input pl-12"
              value={selectedCampus}
              onChange={(e) => setSelectedCampus(e.target.value)}
              disabled={!!user.campusId}
            >
              <option value="">Select Campus</option>
              {campuses.map(c => <option key={c.id} value={c.id}>{c.campusName}</option>)}
            </select>
          </div>
        </div>

        <div className="space-y-2 relative z-10">
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Exam</label>
          <div className="relative">
            <Award className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <select
              className="vibrant-input pl-12"
              value={selectedExam}
              onChange={(e) => setSelectedExam(e.target.value)}
            >
              <option value="">Select Exam</option>
              {exams.filter(e => selectedCampus === '' || e.campusId === selectedCampus).map(e => (
                <option key={e.id} value={e.id}>{e.examName} ({new Date(e.examDate).toLocaleDateString()})</option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-2 relative z-10">
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Class</label>
          <div className="relative">
            <GraduationCap className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <select
              className="vibrant-input pl-12"
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
            >
              <option value="">Select Class</option>
              {classes.filter(c => selectedCampus === '' || c.campusId === selectedCampus).map(c => (
                <option key={c.id} value={c.id}>{c.className} - {c.sectionName}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Results Entry */}
      <div className="vibrant-card overflow-hidden">
        {filteredStudents.length > 0 && selectedExam ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-slate-900/50 text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">
                  <th className="px-8 py-5">Roll No</th>
                  <th className="px-8 py-5">Student Details</th>
                  <th className="px-8 py-5 text-center">Obtained Marks / {currentExam?.totalMarks}</th>
                  <th className="px-8 py-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group">
                    <td className="px-8 py-6">
                      <span className="font-mono text-sm font-black text-slate-400 group-hover:text-primary transition-colors">
                        {student.rollNumber}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                          <UserIcon className="w-5 h-5" />
                        </div>
                        <span className="font-black text-slate-900 dark:text-white tracking-tight">{student.firstName} {student.lastName}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex justify-center">
                        <input
                          type="number"
                          max={currentExam?.totalMarks}
                          className="w-24 px-4 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl text-center font-black text-primary outline-none focus:border-primary transition-all"
                          value={markingResults[student.id] || ''}
                          onChange={(e) => setMarkingResults(prev => ({ ...prev, [student.id]: Number(e.target.value) }))}
                        />
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <motion.button
                        whileHover={{ scale: 1.1, y: -2 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => generateReportCard(student)}
                        className="p-3 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 text-primary hover:bg-primary hover:text-white transition-all"
                        title="Download Report Card"
                      >
                        <Download className="w-4 h-4" />
                      </motion.button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-20 text-center">
            <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <BarChart3 className="w-10 h-10 text-slate-300 dark:text-slate-600" />
            </div>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase">No Data Selected</h3>
            <p className="text-slate-500 dark:text-slate-400 max-w-xs mx-auto font-medium mt-2">Please select an exam and class to manage results.</p>
          </div>
        )}
      </div>

      {/* Exam Modal */}
      <AnimatePresence>
        {isExamModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/40 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="vibrant-card w-full max-w-md overflow-hidden border-none shadow-2xl"
            >
              <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-primary text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 -mr-16 -mt-16 rounded-full blur-2xl"></div>
                <h3 className="text-2xl font-black tracking-tight uppercase relative z-10">Schedule New Exam</h3>
                <button onClick={() => setIsExamModalOpen(false)} className="text-white/60 hover:text-white transition-colors relative z-10">
                  <XCircle className="w-8 h-8" />
                </button>
              </div>
              <form onSubmit={handleCreateExam} className="p-8 space-y-6 bg-white dark:bg-slate-900">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Exam Name</label>
                    <div className="relative">
                      <BookOpen className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input
                        type="text"
                        required
                        className="vibrant-input pl-12"
                        placeholder="e.g. Mid Term 2024"
                        value={newExam.examName}
                        onChange={(e) => setNewExam({ ...newExam, examName: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Exam Date</label>
                      <div className="relative">
                        <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                          type="date"
                          required
                          className="vibrant-input pl-12"
                          value={newExam.examDate}
                          onChange={(e) => setNewExam({ ...newExam, examDate: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Total Marks</label>
                      <input
                        type="number"
                        required
                        className="vibrant-input"
                        value={newExam.totalMarks}
                        onChange={(e) => setNewExam({ ...newExam, totalMarks: Number(e.target.value) })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Campus</label>
                    <div className="relative">
                      <School className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <select
                        required
                        className="vibrant-input pl-12"
                        value={newExam.campusId}
                        onChange={(e) => setNewExam({ ...newExam, campusId: e.target.value })}
                        disabled={!!user.campusId}
                      >
                        <option value="">Select Campus</option>
                        {campuses.map(c => <option key={c.id} value={c.id}>{c.campusName}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
                <div className="flex gap-4 pt-6 border-t border-slate-100 dark:border-slate-800">
                  <button type="button" onClick={() => setIsExamModalOpen(false)} className="flex-1 px-6 py-4 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">Cancel</button>
                  <button type="submit" className="flex-1 vibrant-btn-primary py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-primary/20">Schedule</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
