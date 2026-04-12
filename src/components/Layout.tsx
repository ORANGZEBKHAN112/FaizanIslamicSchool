import { ReactNode, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  School, 
  BookOpen, 
  Users, 
  CreditCard, 
  FileText, 
  Banknote,
  LogOut,
  User as UserIcon,
  Menu,
  X,
  Settings,
  ShieldCheck,
  History as HistoryIcon,
  BarChart3,
  Calendar,
  Package,
  Sun,
  Moon,
  Search,
  Command
} from 'lucide-react';
import { useState } from 'react';
import { User } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import CommandPalette from './CommandPalette';

interface LayoutProps {
  user: User;
}

export default function Layout({ user }: LayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      if (saved) return saved === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const root = window.document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    window.location.reload();
  };

  const menuItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard, roles: ['Super Admin', 'Admin', 'Teacher', 'Accountant', 'Student'] },
    { name: 'Campuses', path: '/campuses', icon: School, roles: ['Super Admin'] },
    { name: 'Fee Settings', path: '/fee-settings', icon: Banknote, roles: ['Super Admin'] },
    { name: 'Classes', path: '/classes', icon: BookOpen, roles: ['Super Admin', 'Admin'] },
    { name: 'Students', path: '/students', icon: Users, roles: ['Super Admin', 'Admin', 'Teacher'] },
    { name: 'Fees', path: '/fees', icon: CreditCard, roles: ['Super Admin', 'Admin', 'Accountant'] },
    { name: 'QuickPay Setup', path: '/quickpay', icon: Settings, roles: ['Super Admin', 'Admin'] },
  ].filter(item => item.roles.includes(user.role));

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 font-sans transition-colors duration-500 overflow-hidden">
      <CommandPalette />
      
      {/* Sidebar */}
      <AnimatePresence mode="wait">
        {isSidebarOpen && (
          <motion.aside
            initial={{ x: -280, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -280, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col z-30 transition-colors relative"
          >
            <div className="p-8 border-b border-slate-100 dark:border-slate-800">
              <h1 className="text-xl font-black text-primary flex flex-col gap-1 tracking-tight">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-2xl">
                    <School className="w-6 h-6" />
                  </div>
                  <span>FISS</span>
                </div>
                <span className="text-[10px] text-slate-400 uppercase tracking-widest font-black">Faizan Islamic School System</span>
              </h1>
            </div>
            
            <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto scrollbar-hide">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-300 group ${
                      isActive 
                        ? 'bg-primary text-white font-bold shadow-xl shadow-primary/20' 
                        : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Icon className={`w-5 h-5 transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
                    <span className="text-sm">{item.name}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="p-6 border-t border-slate-100 dark:border-slate-800 space-y-4">
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1">Developer</p>
                <p className="text-xs font-bold text-slate-600 dark:text-slate-300">Oranzeb Khan Baloch</p>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 px-4 py-3.5 w-full rounded-2xl text-danger hover:bg-danger/10 transition-all font-bold group"
              >
                <LogOut className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                <span className="text-sm">Logout</span>
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Header */}
        <header className="h-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-8 z-20 transition-colors">
          <div className="flex items-center gap-6">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl text-slate-600 dark:text-slate-400 transition-all active:scale-90"
            >
              {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            
            <button 
              onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))}
              className="hidden md:flex items-center gap-3 px-5 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-400 hover:border-primary/50 dark:hover:border-primary/50 transition-all group"
            >
              <Search className="w-4 h-4 group-hover:text-primary transition-colors" />
              <span className="text-sm font-medium">Search anything...</span>
              <div className="flex items-center gap-1 px-2 py-1 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-[10px] font-black shadow-sm">
                <Command className="w-2.5 h-2.5" /> K
              </div>
            </button>
          </div>

          <div className="flex items-center gap-6">
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-600 dark:text-slate-400 hover:text-primary transition-all active:scale-90 shadow-sm"
            >
              {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            <div className="flex items-center gap-4 pl-6 border-l border-slate-100 dark:border-slate-800">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-black text-slate-900 dark:text-white tracking-tight">{user.fullName}</p>
                <p className="text-[10px] font-black text-primary uppercase tracking-widest">{user.role}</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-primary text-white flex items-center justify-center font-black text-lg shadow-lg shadow-primary/20 ring-4 ring-primary/5">
                {user.fullName.charAt(0)}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-8 scroll-smooth">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          >
            <Outlet />
          </motion.div>
        </main>
      </div>
    </div>
  );
}
