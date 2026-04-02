import React, { useState, useEffect, useCallback } from 'react';
import { Search, User, School, CreditCard, FileText, Calendar, Settings, X, Command } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Student, Campus, FeeVoucher } from '../types';
import { dataService } from '../services/dataService';

export default function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{ type: string; title: string; subtitle: string; icon: any; action: () => void }[]>([]);
  
  const [students, setStudents] = useState<Student[]>([]);
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubStudents = dataService.subscribe('students', setStudents);
    const unsubCampuses = dataService.subscribe('campuses', setCampuses);
    return () => {
      unsubStudents();
      unsubCampuses();
    };
  }, []);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      setIsOpen(prev => !prev);
    }
    if (e.key === 'Escape') {
      setIsOpen(false);
    }
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    if (query.trim() === '') {
      setResults([]);
      return;
    }

    const searchResults: any[] = [];
    const q = query.toLowerCase();

    // Search Students
    students.filter(s => 
      `${s.firstName} ${s.lastName}`.toLowerCase().includes(q) || 
      s.rollNumber.toLowerCase().includes(q)
    ).slice(0, 5).forEach(s => {
      searchResults.push({
        type: 'Student',
        title: `${s.firstName} ${s.lastName}`,
        subtitle: s.rollNumber,
        icon: User,
        action: () => { navigate(`/students?search=${s.rollNumber}`); setIsOpen(false); }
      });
    });

    // Search Campuses
    campuses.filter(c => 
      c.campusName.toLowerCase().includes(q) || 
      c.campusCode.toLowerCase().includes(q)
    ).slice(0, 3).forEach(c => {
      searchResults.push({
        type: 'Campus',
        title: c.campusName,
        subtitle: c.campusCode,
        icon: School,
        action: () => { navigate(`/campuses`); setIsOpen(false); }
      });
    });

    // Quick Actions
    const actions = [
      { title: 'Fee Management', subtitle: 'Manage vouchers and payments', icon: CreditCard, path: '/fees' },
      { title: 'Attendance', subtitle: 'Mark daily attendance', icon: Calendar, path: '/attendance' },
      { title: 'Exams', subtitle: 'Manage exams and results', icon: FileText, path: '/exams' },
      { title: 'QuickPay Setup', subtitle: 'Configure payment gateway', icon: Settings, path: '/quickpay' },
    ];

    actions.filter(a => a.title.toLowerCase().includes(q)).forEach(a => {
      searchResults.push({
        type: 'Action',
        title: a.title,
        subtitle: a.subtitle,
        icon: a.icon,
        action: () => { navigate(a.path); setIsOpen(false); }
      });
    });

    setResults(searchResults);
  }, [query, students, campuses, navigate]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] p-4 bg-black/40 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            className="bg-white dark:bg-gray-900 w-full max-w-2xl rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden"
          >
            <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center gap-4">
              <Search className="w-6 h-6 text-gray-400" />
              <input 
                autoFocus
                type="text" 
                placeholder="Search students, campuses, or actions... (Ctrl+K)"
                className="w-full bg-transparent text-xl outline-none text-gray-900 dark:text-white placeholder-gray-400"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <div className="flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded-lg text-xs font-bold text-gray-400">
                <Command className="w-3 h-3" /> K
              </div>
              <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto p-2">
              {results.length > 0 ? (
                <div className="space-y-1">
                  {results.map((result, i) => (
                    <button
                      key={i}
                      onClick={result.action}
                      className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-blue-50 dark:hover:bg-blue-900/20 group transition-all text-left"
                    >
                      <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl group-hover:bg-blue-100 dark:group-hover:bg-blue-900/40 text-gray-400 group-hover:text-blue-600 transition-colors">
                        <result.icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="font-bold text-gray-900 dark:text-white">{result.title}</p>
                          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{result.type}</span>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{result.subtitle}</p>
                      </div>
                    </button>
                  ))}
                </div>
              ) : query.trim() !== '' ? (
                <div className="p-12 text-center text-gray-400">
                  <Search className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  <p>No results found for "{query}"</p>
                </div>
              ) : (
                <div className="p-8">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Quick Navigation</p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { title: 'Dashboard', path: '/', icon: Calendar },
                      { title: 'Students', path: '/students', icon: User },
                      { title: 'Fees', path: '/fees', icon: CreditCard },
                      { title: 'Exams', path: '/exams', icon: FileText },
                    ].map((item, i) => (
                      <button
                        key={i}
                        onClick={() => { navigate(item.path); setIsOpen(false); }}
                        className="flex items-center gap-3 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 hover:border-blue-200 dark:hover:border-blue-900/40 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all text-left"
                      >
                        <item.icon className="w-4 h-4 text-blue-500" />
                        <span className="font-bold text-gray-700 dark:text-gray-300">{item.title}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <div className="p-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              <span>↑↓ to navigate</span>
              <span>Enter to select</span>
              <span>Esc to close</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
