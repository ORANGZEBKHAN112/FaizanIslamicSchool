import React, { useEffect, useState } from 'react';
import { Plus, Search, Edit2, Trash2, UserCircle, Filter, Eye, XCircle, CreditCard, FileText, Download, Share2 } from 'lucide-react';
import { Student, Campus, Class, FeeVoucher } from '../types';
import { dataService } from '../services/dataService';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

export default function StudentManagement() {
  const [students, setStudents] = useState<Student[]>([]);
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [vouchers, setVouchers] = useState<FeeVoucher[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [activeTab, setActiveTab] = useState<'profile' | 'fees'>('profile');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCampus, setSelectedCampus] = useState<string>('all');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  
  const [formData, setFormData] = useState({
    campusId: '',
    classId: '',
    rollNumber: '',
    firstName: '',
    lastName: '',
    fatherName: '',
    dateOfBirth: '',
    gender: 'Male',
    mobile: '',
    address: '',
    admissionDate: new Date().toISOString().split('T')[0],
    status: 'Active' as const,
    outstandingFees: 0
  });
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    const unsubStudents = dataService.subscribe('students', setStudents);
    const unsubCampuses = dataService.subscribe('campuses', setCampuses);
    const unsubClasses = dataService.subscribe('classes', setClasses);
    const unsubVouchers = dataService.subscribe('feevouchers', setVouchers);
    return () => {
      unsubStudents();
      unsubCampuses();
      unsubClasses();
      unsubVouchers();
    };
  }, []);

  const exportToCSV = () => {
    const headers = ['Roll Number', 'First Name', 'Last Name', 'Father Name', 'Class', 'Campus', 'Mobile', 'Status', 'Outstanding Fees'];
    const csvData = filteredStudents.map(s => [
      s.rollNumber,
      s.firstName,
      s.lastName,
      s.fatherName,
      classes.find(c => c.id === s.classId)?.className || 'N/A',
      campuses.find(c => c.id === s.campusId)?.campusName || 'N/A',
      s.mobile,
      s.status,
      s.outstandingFees
    ]);

    const csvContent = [headers, ...csvData].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `Students_Export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.campusId) {
      toast.error('Please select a campus');
      return;
    }
    if (!formData.classId) {
      toast.error('Please select a class');
      return;
    }
    if (!formData.firstName.trim()) {
      toast.error('First name is required');
      return;
    }
    if (!formData.fatherName.trim()) {
      toast.error('Father\'s name is required');
      return;
    }
    if (!formData.mobile.trim()) {
      toast.error('Mobile number is required');
      return;
    }

    try {
      let finalRollNumber = formData.rollNumber;
      if (!editingId && !finalRollNumber) {
        const year = new Date().getFullYear();
        const random = Math.floor(1000 + Math.random() * 9000);
        finalRollNumber = `STU-${year}-${random}`;
      }

      const studentData = { 
        ...formData, 
        rollNumber: finalRollNumber,
        outstandingFees: Number(formData.outstandingFees) || 0
      };

      if (editingId) {
        await dataService.update('students', editingId, studentData);
        toast.success('Student record updated successfully');
      } else {
        const studentId = await dataService.add('students', studentData);
        if (studentId) {
          await dataService.add('users', {
            fullName: `${formData.firstName} ${formData.lastName}`,
            username: finalRollNumber,
            email: `${finalRollNumber.toLowerCase()}@faizan.com`,
            role: 'Student',
            campusId: formData.campusId,
            isActive: true,
            createdOn: new Date().toISOString()
          });
          toast.success('Student registered successfully');
        }
      }
      setIsModalOpen(false);
      setEditingId(null);
      setFormData({
        campusId: '', classId: '', rollNumber: '', firstName: '', lastName: '',
        fatherName: '', dateOfBirth: '', gender: 'Male', mobile: '',
        address: '', admissionDate: new Date().toISOString().split('T')[0], status: 'Active', outstandingFees: 0
      });
    } catch (error) {
      console.error('Error saving student:', error);
      toast.error('Failed to save student record');
    }
  };

  const handleEdit = (student: Student) => {
    setEditingId(student.id);
    setFormData({
      campusId: student.campusId,
      classId: student.classId,
      rollNumber: student.rollNumber,
      firstName: student.firstName,
      lastName: student.lastName || '',
      fatherName: student.fatherName || '',
      dateOfBirth: student.dateOfBirth || '',
      gender: student.gender || 'Male',
      mobile: student.mobile || '',
      address: student.address || '',
      admissionDate: student.admissionDate || '',
      status: student.status,
      outstandingFees: student.outstandingFees || 0
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this student?')) {
      try {
        await dataService.delete('students', id);
        toast.success('Student deleted successfully');
      } catch (error) {
        console.error('Error deleting student:', error);
        toast.error('Failed to delete student');
      }
    }
  };

  const filteredStudents = students.filter(s => {
    const matchesSearch = `${s.firstName} ${s.lastName} ${s.rollNumber}`.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCampus = selectedCampus === 'all' || s.campusId === selectedCampus;
    const matchesClass = selectedClass === 'all' || s.classId === selectedClass;
    return matchesSearch && matchesCampus && matchesClass;
  });

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">Students</h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Manage student records, profiles, and fee history.</p>
        </div>
        <div className="flex items-center gap-3">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={exportToCSV}
            className="vibrant-glass text-slate-700 dark:text-slate-300 px-6 py-3 rounded-2xl border border-white dark:border-slate-800 flex items-center gap-2 hover:bg-white dark:hover:bg-slate-800 transition-all shadow-sm text-[10px] font-black uppercase tracking-widest"
          >
            <Download className="w-4 h-4" />
            Export
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              setEditingId(null);
              setIsModalOpen(true);
            }}
            className="vibrant-btn-primary px-6 py-3 rounded-2xl flex items-center gap-2 shadow-xl shadow-primary/20 text-[10px] font-black uppercase tracking-widest"
          >
            <Plus className="w-4 h-4" />
            Register Student
          </motion.button>
        </div>
      </div>

      <div className="vibrant-card overflow-hidden">
        <div className="p-8 border-b border-slate-100 dark:border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-primary transition-colors" />
            <input
              type="text"
              placeholder="Search by name or roll..."
              className="vibrant-input pl-12"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-4">
            <select
              className="vibrant-input flex-1 appearance-none"
              value={selectedCampus}
              onChange={(e) => setSelectedCampus(e.target.value)}
            >
              <option value="all">All Campuses</option>
              {campuses.map(c => (
                <option key={c.id} value={c.id}>{c.campusName}</option>
              ))}
            </select>
            <select
              className="vibrant-input flex-1 appearance-none"
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
            >
              <option value="all">All Classes</option>
              {classes.filter(c => selectedCampus === 'all' || c.campusId === selectedCampus).map(c => (
                <option key={c.id} value={c.id}>{c.className} - {c.sectionName}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-800/50 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                <th className="px-8 py-5">Roll #</th>
                <th className="px-8 py-5">Student Name</th>
                <th className="px-8 py-5">Class</th>
                <th className="px-8 py-5">Father Name</th>
                <th className="px-8 py-5">Outstanding</th>
                <th className="px-8 py-5">Status</th>
                <th className="px-8 py-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredStudents.map((student) => (
                <tr key={student.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group">
                  <td className="px-8 py-5 font-mono text-sm text-primary font-black">{student.rollNumber}</td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 group-hover:scale-110 transition-transform duration-300">
                        <UserCircle className="w-7 h-7" />
                      </div>
                      <span className="font-bold text-slate-900 dark:text-white">{student.firstName} {student.lastName}</span>
                    </div>
                  </td>
                  <td className="px-8 py-5 text-sm font-medium text-slate-500 dark:text-slate-400">
                    {classes.find(c => c.id === student.classId)?.className || 'N/A'}
                  </td>
                  <td className="px-8 py-5 text-sm font-medium text-slate-500 dark:text-slate-400">{student.fatherName}</td>
                  <td className="px-8 py-5 text-sm font-black text-danger">Rs. {student.outstandingFees || 0}</td>
                  <td className="px-8 py-5">
                    <span className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest ${
                      student.status === 'Active' ? 'bg-success/10 text-success' : 
                      student.status === 'Left' ? 'bg-danger/10 text-danger' : 'bg-primary/10 text-primary'
                    }`}>
                      {student.status}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <motion.button 
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => {
                          setSelectedStudent(student);
                          setIsProfileModalOpen(true);
                        }} 
                        className="p-2.5 text-slate-400 hover:text-success hover:bg-success/10 rounded-xl transition-all"
                        title="View Profile"
                      >
                        <Eye className="w-5 h-5" />
                      </motion.button>
                      <motion.button 
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleEdit(student)} 
                        className="p-2.5 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-xl transition-all"
                      >
                        <Edit2 className="w-5 h-5" />
                      </motion.button>
                      <motion.button 
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleDelete(student.id)} 
                        className="p-2.5 text-slate-400 hover:text-danger hover:bg-danger/10 rounded-xl transition-all"
                      >
                        <Trash2 className="w-5 h-5" />
                      </motion.button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Profile Modal */}
      <AnimatePresence>
        {isProfileModalOpen && selectedStudent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/40 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="vibrant-card w-full max-w-4xl overflow-hidden max-h-[90vh] flex flex-col border-none shadow-2xl"
            >
              <div className="p-10 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-primary text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 -mr-20 -mt-20 rounded-full blur-3xl"></div>
                <div className="flex items-center gap-8 relative z-10">
                  <div className="w-24 h-24 rounded-3xl bg-white/20 backdrop-blur-xl flex items-center justify-center text-white shadow-2xl">
                    <UserCircle className="w-16 h-16" />
                  </div>
                  <div>
                    <h3 className="text-4xl font-black tracking-tight">{selectedStudent.firstName} {selectedStudent.lastName}</h3>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="px-3 py-1 bg-white/20 rounded-lg text-[10px] font-black uppercase tracking-widest">{selectedStudent.rollNumber}</span>
                      <span className="px-3 py-1 bg-white/20 rounded-lg text-[10px] font-black uppercase tracking-widest">{selectedStudent.status}</span>
                    </div>
                  </div>
                </div>
                <button onClick={() => setIsProfileModalOpen(false)} className="text-white/60 hover:text-white transition-colors relative z-10">
                  <XCircle className="w-10 h-10" />
                </button>
              </div>

              <div className="flex border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 px-10">
                <button
                  onClick={() => setActiveTab('profile')}
                  className={`px-8 py-6 text-[10px] font-black uppercase tracking-widest transition-all border-b-4 ${
                    activeTab === 'profile' ? 'border-primary text-primary' : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  Student Profile
                </button>
                <button
                  onClick={() => setActiveTab('fees')}
                  className={`px-8 py-6 text-[10px] font-black uppercase tracking-widest transition-all border-b-4 ${
                    activeTab === 'fees' ? 'border-primary text-primary' : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  Fees & Vouchers
                </button>
              </div>

              <div className="p-10 overflow-y-auto flex-1 bg-white dark:bg-slate-900">
                {activeTab === 'profile' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="space-y-8">
                      <div className="group">
                        <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-2 ml-1">Father's Name</p>
                        <div className="p-5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700 group-hover:border-primary/30 transition-colors">
                          <p className="font-bold text-slate-900 dark:text-white text-lg">{selectedStudent.fatherName}</p>
                        </div>
                      </div>
                      <div className="group">
                        <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-2 ml-1">Date of Birth</p>
                        <div className="p-5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700 group-hover:border-primary/30 transition-colors">
                          <p className="font-bold text-slate-900 dark:text-white text-lg">{selectedStudent.dateOfBirth}</p>
                        </div>
                      </div>
                      <div className="group">
                        <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-2 ml-1">Gender</p>
                        <div className="p-5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700 group-hover:border-primary/30 transition-colors">
                          <p className="font-bold text-slate-900 dark:text-white text-lg">{selectedStudent.gender}</p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-8">
                      <div className="group">
                        <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-2 ml-1">Mobile</p>
                        <div className="p-5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700 group-hover:border-primary/30 transition-colors">
                          <p className="font-bold text-slate-900 dark:text-white text-lg">{selectedStudent.mobile}</p>
                        </div>
                      </div>
                      <div className="group">
                        <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-2 ml-1">Admission Date</p>
                        <div className="p-5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700 group-hover:border-primary/30 transition-colors">
                          <p className="font-bold text-slate-900 dark:text-white text-lg">{selectedStudent.admissionDate}</p>
                        </div>
                      </div>
                      <div className="group">
                        <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-2 ml-1">Address</p>
                        <div className="p-5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700 group-hover:border-primary/30 transition-colors">
                          <p className="font-bold text-slate-900 dark:text-white text-lg leading-relaxed">{selectedStudent.address}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-10">
                    <div className="p-8 bg-danger/5 border border-danger/10 rounded-3xl flex items-center justify-between relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-danger/5 -mr-16 -mt-16 rounded-full blur-2xl"></div>
                      <div className="flex items-center gap-6 text-danger relative z-10">
                        <div className="w-16 h-16 rounded-2xl bg-danger/10 flex items-center justify-center shadow-xl shadow-danger/10">
                          <CreditCard className="w-8 h-8" />
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">Total Outstanding</p>
                          <p className="text-4xl font-black tracking-tight">Rs. {selectedStudent.outstandingFees || 0}</p>
                        </div>
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="vibrant-btn-primary bg-danger hover:bg-danger/90 px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-danger/20 relative z-10"
                      >
                        Collect Fee
                      </motion.button>
                    </div>

                    <div className="space-y-6">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-black text-slate-900 dark:text-white flex items-center gap-3 uppercase tracking-widest text-xs">
                          <div className="p-2 bg-primary/10 rounded-lg">
                            <FileText className="w-4 h-4 text-primary" />
                          </div>
                          Fee Vouchers History
                        </h4>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{vouchers.filter(v => v.studentId === selectedStudent.id).length} Records</span>
                      </div>
                      <div className="border border-slate-100 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
                        <table className="w-full text-left border-collapse">
                          <thead className="bg-slate-50 dark:bg-slate-800/50 text-[10px] text-slate-400 uppercase font-black tracking-widest">
                            <tr>
                              <th className="px-8 py-4">Month/Year</th>
                              <th className="px-8 py-4">Amount</th>
                              <th className="px-8 py-4">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {vouchers.filter(v => v.studentId === selectedStudent.id).length === 0 && (
                              <tr>
                                <td colSpan={3} className="px-8 py-12 text-center text-sm text-slate-400 font-medium italic">No vouchers found.</td>
                              </tr>
                            )}
                            {vouchers.filter(v => v.studentId === selectedStudent.id).map(v => (
                              <tr key={v.id} className="text-sm hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group">
                                <td className="px-8 py-5 font-bold text-slate-700 dark:text-slate-300">{v.voucherMonth}/{v.voucherYear}</td>
                                <td className="px-8 py-5 font-black text-slate-900 dark:text-white">Rs. {v.totalAmount}</td>
                                <td className="px-8 py-5">
                                  <span className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest ${
                                    v.status === 'Paid' ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'
                                  }`}>
                                    {v.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/40 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="vibrant-card w-full max-w-3xl overflow-hidden max-h-[90vh] flex flex-col border-none shadow-2xl"
            >
              <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-primary/10 rounded-2xl">
                    <UserCircle className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase">{editingId ? 'Edit Student' : 'Register Student'}</h3>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                  <XCircle className="w-8 h-8" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-10 space-y-8 overflow-y-auto bg-white dark:bg-slate-900">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Campus</label>
                    <select required className="vibrant-input appearance-none" value={formData.campusId} onChange={(e) => setFormData({ ...formData, campusId: e.target.value })}>
                      <option value="">Select Campus</option>
                      {campuses.map(c => <option key={c.id} value={c.id}>{c.campusName}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Class</label>
                    <select required className="vibrant-input appearance-none" value={formData.classId} onChange={(e) => setFormData({ ...formData, classId: e.target.value })}>
                      <option value="">Select Class</option>
                      {classes.filter(c => c.campusId === formData.campusId).map(c => <option key={c.id} value={c.id}>{c.className} - {c.sectionName}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Roll Number (Optional)</label>
                    <input className="vibrant-input" value={formData.rollNumber} onChange={(e) => setFormData({ ...formData, rollNumber: e.target.value })} placeholder="Auto-generated if empty" />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">First Name</label>
                    <input required className="vibrant-input" value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Last Name</label>
                    <input className="vibrant-input" value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Father's Name</label>
                    <input className="vibrant-input" value={formData.fatherName} onChange={(e) => setFormData({ ...formData, fatherName: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Date of Birth</label>
                    <input type="date" className="vibrant-input" value={formData.dateOfBirth} onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Gender</label>
                    <select className="vibrant-input appearance-none" value={formData.gender} onChange={(e) => setFormData({ ...formData, gender: e.target.value })}>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mobile</label>
                    <input className="vibrant-input" value={formData.mobile} onChange={(e) => setFormData({ ...formData, mobile: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Status</label>
                    <select className="vibrant-input appearance-none" value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}>
                      <option value="Active">Active</option>
                      <option value="Left">Left</option>
                      <option value="Graduated">Graduated</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Outstanding Fees (Rs.)</label>
                    <input type="number" className="vibrant-input font-black text-primary" value={formData.outstandingFees} onChange={(e) => setFormData({ ...formData, outstandingFees: Number(e.target.value) })} />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Address</label>
                  <textarea className="vibrant-input" rows={3} value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
                </div>
                <div className="flex gap-4 pt-10 border-t border-slate-100 dark:border-slate-800">
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
                    {editingId ? 'Update Record' : 'Register Student'}
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
