import React, { useEffect, useState } from 'react';
import { Search, CheckCircle, XCircle, Clock, FileText, Filter, Save, Calendar as CalendarIcon, Users, GraduationCap, School } from 'lucide-react';
import { Student, Campus, Class, Attendance as AttendanceType, User } from '../types';
import { dataService } from '../services/dataService';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

interface AttendanceProps {
  user: User;
}

export default function Attendance({ user }: AttendanceProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [attendance, setAttendance] = useState<AttendanceType[]>([]);
  
  const [selectedCampus, setSelectedCampus] = useState<string>(user.campusId || '');
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  
  const [markingData, setMarkingData] = useState<Record<string, 'Present' | 'Absent' | 'Late' | 'Leave'>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsubStudents = dataService.subscribe('students', setStudents);
    const unsubCampuses = dataService.subscribe('campuses', setCampuses);
    const unsubClasses = dataService.subscribe('classes', setClasses);
    const unsubAttendance = dataService.subscribe('attendance', setAttendance);
    
    return () => {
      unsubStudents();
      unsubCampuses();
      unsubClasses();
      unsubAttendance();
    };
  }, []);

  // Filter students based on selection
  const filteredStudents = students.filter(s => 
    (selectedCampus === '' || s.campusId === selectedCampus) &&
    (selectedClass === '' || s.classId === selectedClass) &&
    s.status === 'Active'
  );

  // Load existing attendance for selected date/class
  useEffect(() => {
    if (selectedClass && selectedDate) {
      const existing = attendance.filter(a => 
        a.classId === selectedClass && 
        a.date === selectedDate
      );
      
      const newMarkingData: Record<string, 'Present' | 'Absent' | 'Late' | 'Leave'> = {};
      existing.forEach(a => {
        newMarkingData[a.studentId] = a.status;
      });
      
      // Default to Present for those not marked
      filteredStudents.forEach(s => {
        if (!newMarkingData[s.id]) {
          newMarkingData[s.id] = 'Present';
        }
      });
      
      setMarkingData(newMarkingData);
    }
  }, [selectedClass, selectedDate, attendance, filteredStudents.length]);

  const handleStatusChange = (studentId: string, status: 'Present' | 'Absent' | 'Late' | 'Leave') => {
    setMarkingData(prev => ({ ...prev, [studentId]: status }));
  };

  const saveAttendance = async () => {
    if (!selectedClass || !selectedDate) {
      toast.error('Please select class and date');
      return;
    }

    if (filteredStudents.length === 0) {
      toast.error('No students found for the selected class');
      return;
    }

    setLoading(true);
    try {
      for (const student of filteredStudents) {
        const existing = attendance.find(a => 
          a.studentId === student.id && 
          a.date === selectedDate
        );

        const data: Partial<AttendanceType> = {
          studentId: student.id,
          classId: selectedClass,
          campusId: selectedCampus,
          date: selectedDate,
          status: markingData[student.id] || 'Present',
          markedBy: user.id
        };

        if (existing) {
          await dataService.update('attendance', existing.id, data);
        } else {
          await dataService.add('attendance', data);
        }
      }
      toast.success('Attendance saved successfully!');
    } catch (error) {
      console.error('Error saving attendance:', error);
      toast.error('Failed to save attendance');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Present': return 'bg-success/10 text-success border-success/20 ring-success/20';
      case 'Absent': return 'bg-danger/10 text-danger border-danger/20 ring-danger/20';
      case 'Late': return 'bg-warning/10 text-warning border-warning/20 ring-warning/20';
      case 'Leave': return 'bg-primary/10 text-primary border-primary/20 ring-primary/20';
      default: return 'bg-slate-100 text-slate-700 border-slate-200 ring-slate-200';
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Attendance Management</h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">Mark and manage student daily attendance</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={saveAttendance}
          disabled={loading || filteredStudents.length === 0}
          className="vibrant-btn-primary px-8 py-4 rounded-2xl flex items-center gap-3 shadow-xl shadow-primary/20 disabled:opacity-50 disabled:shadow-none w-fit"
        >
          <Save className="w-5 h-5" />
          <span className="text-[10px] font-black uppercase tracking-widest">
            {loading ? 'Saving...' : 'Save Attendance'}
          </span>
        </motion.button>
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

        <div className="space-y-2 relative z-10">
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Date</label>
          <div className="relative">
            <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="date"
              className="vibrant-input pl-12"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Attendance List */}
      <div className="vibrant-card overflow-hidden">
        {filteredStudents.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-slate-900/50 text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">
                  <th className="px-8 py-5">Roll No</th>
                  <th className="px-8 py-5">Student Details</th>
                  <th className="px-8 py-5 text-center">Attendance Status</th>
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
                          <Users className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="font-black text-slate-900 dark:text-white tracking-tight">{student.firstName} {student.lastName}</div>
                          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{student.fatherName}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center justify-center gap-3">
                        {[
                          { id: 'Present', icon: CheckCircle, label: 'P' },
                          { id: 'Absent', icon: XCircle, label: 'A' },
                          { id: 'Late', icon: Clock, label: 'L' },
                          { id: 'Leave', icon: FileText, label: 'LV' }
                        ].map((status) => (
                          <motion.button
                            key={status.id}
                            whileHover={{ scale: 1.1, y: -2 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => handleStatusChange(student.id, status.id as any)}
                            className={`
                              flex flex-col items-center justify-center w-14 h-14 rounded-2xl border transition-all relative
                              ${markingData[student.id] === status.id 
                                ? getStatusColor(status.id) + ' ring-2 ring-offset-2 dark:ring-offset-slate-900'
                                : 'bg-white dark:bg-slate-800 text-slate-400 border-slate-100 dark:border-slate-700 hover:border-primary/30'}
                            `}
                          >
                            <status.icon className="w-5 h-5" />
                            <span className="text-[9px] font-black uppercase tracking-widest mt-1">{status.label}</span>
                            {markingData[student.id] === status.id && (
                              <motion.div
                                layoutId={`active-${student.id}`}
                                className="absolute -top-1 -right-1 w-3 h-3 bg-white dark:bg-slate-900 rounded-full flex items-center justify-center"
                              >
                                <div className={`w-1.5 h-1.5 rounded-full ${
                                  status.id === 'Present' ? 'bg-success' :
                                  status.id === 'Absent' ? 'bg-danger' :
                                  status.id === 'Late' ? 'bg-warning' : 'bg-primary'
                                }`} />
                              </motion.div>
                            )}
                          </motion.button>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-20 text-center">
            <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <Filter className="w-10 h-10 text-slate-300 dark:text-slate-600" />
            </div>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase">No Students Found</h3>
            <p className="text-slate-500 dark:text-slate-400 max-w-xs mx-auto font-medium mt-2">Please select a campus and class to mark attendance.</p>
          </div>
        )}
      </div>
    </div>
  );
}
