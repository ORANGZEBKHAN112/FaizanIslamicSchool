import React, { useEffect, useState } from 'react';
import { Plus, Search, Edit2, Trash2, UserCircle, Filter, Eye, XCircle, CreditCard, FileText } from 'lucide-react';
import { Student, Campus, Class, FeeVoucher } from '../types';
import { dataService } from '../services/dataService';
import { motion, AnimatePresence } from 'motion/react';

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
    const unsubVouchers = dataService.subscribe('feeVouchers', setVouchers);
    return () => {
      unsubStudents();
      unsubCampuses();
      unsubClasses();
      unsubVouchers();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let finalRollNumber = formData.rollNumber;
    if (!editingId && !finalRollNumber) {
      // Auto-generate roll number: STU-YYYY-RANDOM
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
    } else {
      const studentId = await dataService.add('students', studentData);
      
      // Create a user record for the student so they can login
      // We use the roll number as the username and a default password (or they use Google)
      if (studentId) {
        await dataService.add('users', {
          fullName: `${formData.firstName} ${formData.lastName}`,
          username: finalRollNumber,
          email: `${finalRollNumber.toLowerCase()}@faizan.com`, // Placeholder email
          role: 'Student',
          campusId: formData.campusId,
          isActive: true,
          createdOn: new Date().toISOString()
        });
      }
    }
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({
      campusId: '', classId: '', rollNumber: '', firstName: '', lastName: '',
      fatherName: '', dateOfBirth: '', gender: 'Male', mobile: '',
      address: '', admissionDate: new Date().toISOString().split('T')[0], status: 'Active'
    });
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
      await dataService.delete('students', id);
    }
  };

  const filteredStudents = students.filter(s => {
    const matchesSearch = `${s.firstName} ${s.lastName} ${s.rollNumber}`.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCampus = selectedCampus === 'all' || s.campusId === selectedCampus;
    const matchesClass = selectedClass === 'all' || s.classId === selectedClass;
    return matchesSearch && matchesCampus && matchesClass;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-gray-900">Student Management</h2>
        <button
          onClick={() => {
            setEditingId(null);
            setIsModalOpen(true);
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors w-fit"
        >
          <Plus className="w-5 h-5" />
          Register Student
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name or roll..."
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
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
          >
            <option value="all">All Classes</option>
            {classes.filter(c => selectedCampus === 'all' || c.campusId === selectedCampus).map(c => (
              <option key={c.id} value={c.id}>{c.className} - {c.sectionName}</option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-600 text-sm uppercase tracking-wider">
                <th className="px-6 py-4 font-semibold">Roll #</th>
                <th className="px-6 py-4 font-semibold">Student Name</th>
                <th className="px-6 py-4 font-semibold">Class</th>
                <th className="px-6 py-4 font-semibold">Father Name</th>
                <th className="px-6 py-4 font-semibold">Outstanding</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredStudents.map((student) => (
                <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-mono text-sm text-blue-600">{student.rollNumber}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
                        <UserCircle className="w-6 h-6" />
                      </div>
                      <span className="font-medium text-gray-900">{student.firstName} {student.lastName}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {classes.find(c => c.id === student.classId)?.className || 'N/A'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{student.fatherName}</td>
                  <td className="px-6 py-4 text-sm font-bold text-red-600">Rs. {student.outstandingFees || 0}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      student.status === 'Active' ? 'bg-green-100 text-green-800' : 
                      student.status === 'Left' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {student.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => {
                          setSelectedStudent(student);
                          setIsProfileModalOpen(true);
                        }} 
                        className="p-2 text-gray-400 hover:text-green-600 rounded-lg"
                        title="View Profile"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleEdit(student)} className="p-2 text-gray-400 hover:text-blue-600 rounded-lg"><Edit2 className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(student.id)} className="p-2 text-gray-400 hover:text-red-600 rounded-lg"><Trash2 className="w-4 h-4" /></button>
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-blue-600 text-white">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-white">
                    <UserCircle className="w-12 h-12" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold">{selectedStudent.firstName} {selectedStudent.lastName}</h3>
                    <p className="text-blue-100">Roll Number: {selectedStudent.rollNumber}</p>
                  </div>
                </div>
                <button onClick={() => setIsProfileModalOpen(false)} className="text-white/80 hover:text-white">
                  <XCircle className="w-8 h-8" />
                </button>
              </div>

              <div className="flex border-b border-gray-100">
                <button
                  onClick={() => setActiveTab('profile')}
                  className={`px-6 py-4 text-sm font-bold transition-colors border-b-2 ${
                    activeTab === 'profile' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Student Profile
                </button>
                <button
                  onClick={() => setActiveTab('fees')}
                  className={`px-6 py-4 text-sm font-bold transition-colors border-b-2 ${
                    activeTab === 'fees' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Fees & Vouchers
                </button>
              </div>

              <div className="p-6 overflow-y-auto flex-1">
                {activeTab === 'profile' ? (
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <p className="text-xs text-gray-500 uppercase font-bold">Father's Name</p>
                        <p className="font-medium text-gray-900">{selectedStudent.fatherName}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase font-bold">Date of Birth</p>
                        <p className="font-medium text-gray-900">{selectedStudent.dateOfBirth}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase font-bold">Gender</p>
                        <p className="font-medium text-gray-900">{selectedStudent.gender}</p>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <p className="text-xs text-gray-500 uppercase font-bold">Mobile</p>
                        <p className="font-medium text-gray-900">{selectedStudent.mobile}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase font-bold">Address</p>
                        <p className="font-medium text-gray-900">{selectedStudent.address}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase font-bold">Admission Date</p>
                        <p className="font-medium text-gray-900">{selectedStudent.admissionDate}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-3 text-red-700">
                        <CreditCard className="w-6 h-6" />
                        <div>
                          <p className="text-sm font-bold">Total Outstanding Fees</p>
                          <p className="text-2xl font-black">Rs. {selectedStudent.outstandingFees || 0}</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h4 className="font-bold text-gray-900 flex items-center gap-2">
                        <FileText className="w-5 h-5 text-blue-600" />
                        Fee Vouchers
                      </h4>
                      <div className="border border-gray-100 rounded-xl overflow-hidden">
                        <table className="w-full text-left border-collapse">
                          <thead className="bg-gray-50 text-[10px] text-gray-500 uppercase">
                            <tr>
                              <th className="px-4 py-2">Month</th>
                              <th className="px-4 py-2">Amount</th>
                              <th className="px-4 py-2">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {vouchers.filter(v => v.studentId === selectedStudent.id).length === 0 && (
                              <tr>
                                <td colSpan={3} className="px-4 py-4 text-center text-sm text-gray-400 italic">No vouchers found.</td>
                              </tr>
                            )}
                            {vouchers.filter(v => v.studentId === selectedStudent.id).map(v => (
                              <tr key={v.id} className="text-sm">
                                <td className="px-4 py-2">{v.voucherMonth}/{v.voucherYear}</td>
                                <td className="px-4 py-2 font-bold">Rs. {v.totalAmount}</td>
                                <td className="px-4 py-2">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    v.status === 'Paid' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900">{editingId ? 'Edit Student' : 'Register New Student'}</h3>
                <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><XCircle className="w-6 h-6" /></button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Campus</label>
                    <select required className="w-full px-4 py-2 border border-gray-300 rounded-lg" value={formData.campusId} onChange={(e) => setFormData({ ...formData, campusId: e.target.value })}>
                      <option value="">Select Campus</option>
                      {campuses.map(c => <option key={c.id} value={c.id}>{c.campusName}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
                    <select required className="w-full px-4 py-2 border border-gray-300 rounded-lg" value={formData.classId} onChange={(e) => setFormData({ ...formData, classId: e.target.value })}>
                      <option value="">Select Class</option>
                      {classes.filter(c => c.campusId === formData.campusId).map(c => <option key={c.id} value={c.id}>{c.className} - {c.sectionName}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Roll Number (Optional)</label>
                    <input className="w-full px-4 py-2 border border-gray-300 rounded-lg" value={formData.rollNumber} onChange={(e) => setFormData({ ...formData, rollNumber: e.target.value })} placeholder="Auto-generated if empty" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                    <input required className="w-full px-4 py-2 border border-gray-300 rounded-lg" value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                    <input className="w-full px-4 py-2 border border-gray-300 rounded-lg" value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Father's Name</label>
                    <input className="w-full px-4 py-2 border border-gray-300 rounded-lg" value={formData.fatherName} onChange={(e) => setFormData({ ...formData, fatherName: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                    <input type="date" className="w-full px-4 py-2 border border-gray-300 rounded-lg" value={formData.dateOfBirth} onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                    <select className="w-full px-4 py-2 border border-gray-300 rounded-lg" value={formData.gender} onChange={(e) => setFormData({ ...formData, gender: e.target.value })}>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mobile</label>
                    <input className="w-full px-4 py-2 border border-gray-300 rounded-lg" value={formData.mobile} onChange={(e) => setFormData({ ...formData, mobile: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select className="w-full px-4 py-2 border border-gray-300 rounded-lg" value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}>
                      <option value="Active">Active</option>
                      <option value="Left">Left</option>
                      <option value="Graduated">Graduated</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Outstanding Fees (Rs.)</label>
                    <input type="number" className="w-full px-4 py-2 border border-gray-300 rounded-lg" value={formData.outstandingFees} onChange={(e) => setFormData({ ...formData, outstandingFees: Number(e.target.value) })} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                  <textarea className="w-full px-4 py-2 border border-gray-300 rounded-lg" rows={2} value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
                </div>
                <div className="flex gap-3 pt-4 border-t border-gray-100">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-medium">Cancel</button>
                  <button type="submit" className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700">Save Student</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
