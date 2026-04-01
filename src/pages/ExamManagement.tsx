import React, { useEffect, useState } from 'react';
import { Plus, Search, FileText, Download, Award, BookOpen } from 'lucide-react';
import { Exam, StudentResult, Student, Campus, Class } from '../types';
import { dataService } from '../services/dataService';
import { motion, AnimatePresence } from 'motion/react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

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
    const unsubResults = dataService.subscribe('studentResults', setResults);
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
    doc.setFontSize(20);
    doc.text(campus?.campusName || 'Faizan Islamic School', 105, 20, { align: 'center' });
    doc.setFontSize(12);
    doc.text(`RESULT CARD - ${exam?.examName}`, 105, 30, { align: 'center' });
    
    // Student Info
    doc.setFontSize(10);
    doc.text(`Student: ${student?.firstName} ${student?.lastName}`, 20, 45);
    doc.text(`Roll No: ${student?.rollNumber}`, 20, 52);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 150, 45);
    
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

    doc.autoTable({
      startY: 65,
      head: [['Subject', 'Total', 'Obtained', 'Grade', 'Remarks']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillStyle: [59, 130, 246] }
    });

    const finalY = doc.lastAutoTable.finalY;
    doc.setFontSize(12);
    doc.text(`Total Marks: ${totalObtained} / ${totalPossible}`, 20, finalY + 15);
    doc.text(`Percentage: ${percentage.toFixed(2)}%`, 20, finalY + 22);
    
    let finalGrade = 'F';
    if (percentage >= 90) finalGrade = 'A+';
    else if (percentage >= 80) finalGrade = 'A';
    else if (percentage >= 70) finalGrade = 'B';
    else if (percentage >= 60) finalGrade = 'C';
    else if (percentage >= 50) finalGrade = 'D';
    
    doc.text(`Final Grade: ${finalGrade}`, 150, finalY + 15);
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
    await dataService.add('exams', formData);
    setIsModalOpen(false);
    setFormData({
      examName: '',
      examDate: new Date().toISOString().split('T')[0],
      campusId: '',
      status: 'Active'
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-gray-900">Examination & Results</h2>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Create New Exam
        </button>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900">Create New Exam</h3>
                <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">×</button>
              </div>
              <form onSubmit={handleAddExam} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Exam Name</label>
                  <input required className="w-full px-4 py-2 border border-gray-300 rounded-lg" value={formData.examName} onChange={(e) => setFormData({ ...formData, examName: e.target.value })} placeholder="e.g. Mid Term 2026" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Exam Date</label>
                  <input type="date" required className="w-full px-4 py-2 border border-gray-300 rounded-lg" value={formData.examDate} onChange={(e) => setFormData({ ...formData, examDate: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Campus</label>
                  <select required className="w-full px-4 py-2 border border-gray-300 rounded-lg" value={formData.campusId} onChange={(e) => setFormData({ ...formData, campusId: e.target.value })}>
                    <option value="">Select Campus</option>
                    {campuses.map(c => <option key={c.id} value={c.id}>{c.campusName}</option>)}
                  </select>
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">Cancel</button>
                  <button type="submit" className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Create Exam</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Exam List */}
        <div className="md:col-span-1 space-y-4">
          <h3 className="font-bold text-gray-700 flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-500" />
            Active Exams
          </h3>
          <div className="space-y-2">
            {exams.map(exam => (
              <button
                key={exam.id}
                onClick={() => setSelectedExam(exam.id)}
                className={`w-full text-left p-4 rounded-xl border transition-all ${
                  selectedExam === exam.id 
                    ? 'bg-blue-50 border-blue-200 shadow-sm' 
                    : 'bg-white border-gray-100 hover:border-gray-200'
                }`}
              >
                <p className="font-bold text-gray-900">{exam.examName}</p>
                <p className="text-xs text-gray-500">{new Date(exam.examDate).toLocaleDateString()}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Results View */}
        <div className="md:col-span-3">
          {selectedExam ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-bold text-gray-900">Results for {exams.find(e => e.id === selectedExam)?.examName}</h3>
                <select 
                  className="px-4 py-2 border border-gray-200 rounded-lg text-sm"
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                >
                  <option value="">Select Class</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.className}</option>)}
                </select>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider">
                      <th className="px-6 py-4 font-semibold">Student</th>
                      <th className="px-6 py-4 font-semibold">Subjects</th>
                      <th className="px-6 py-4 font-semibold">Total Marks</th>
                      <th className="px-6 py-4 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {students
                      .filter(s => !selectedClass || s.classId === selectedClass)
                      .map(student => {
                        const studentResults = results.filter(r => r.studentId === student.id && r.examId === selectedExam);
                        const totalObtained = studentResults.reduce((acc, curr) => acc + curr.obtainedMarks, 0);
                        const totalPossible = studentResults.reduce((acc, curr) => acc + curr.totalMarks, 0);
                        
                        return (
                          <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4">
                              <div className="font-medium text-gray-900">{student.firstName} {student.lastName}</div>
                              <div className="text-xs text-gray-500">{student.rollNumber}</div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-wrap gap-1">
                                {studentResults.map((r, i) => (
                                  <span key={i} className="px-2 py-0.5 bg-gray-100 rounded text-[10px] text-gray-600">
                                    {r.subjectName}: {r.obtainedMarks}
                                  </span>
                                ))}
                                {studentResults.length === 0 && <span className="text-xs text-gray-400 italic">No marks entered</span>}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="font-bold text-gray-900">{totalObtained} / {totalPossible}</div>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <button 
                                onClick={() => downloadResultCard(student.id, selectedExam)}
                                disabled={studentResults.length === 0}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg disabled:opacity-30"
                              >
                                <Download className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center bg-white rounded-2xl border border-dashed border-gray-200 text-gray-400">
              <Award className="w-12 h-12 mb-2 opacity-20" />
              <p>Select an exam to view results</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
