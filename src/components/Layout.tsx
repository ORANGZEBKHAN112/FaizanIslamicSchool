import { ReactNode } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  School, 
  BookOpen, 
  Users, 
  CreditCard, 
  FileText, 
  LogOut,
  User as UserIcon,
  Menu,
  X,
  Settings,
  ShieldCheck,
  History,
  BarChart3
} from 'lucide-react';
import { useState } from 'react';
import { auth } from '../firebase';
import { User } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface LayoutProps {
  user: User;
}

export default function Layout({ user }: LayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await auth.signOut();
    navigate('/login');
  };

  const menuItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard, roles: ['Super Admin', 'Admin', 'Teacher', 'Accountant', 'Student'] },
    { name: 'Campuses', path: '/campuses', icon: School, roles: ['Super Admin'] },
    { name: 'Classes', path: '/classes', icon: BookOpen, roles: ['Super Admin', 'Admin'] },
    { name: 'Students', path: '/students', icon: Users, roles: ['Super Admin', 'Admin', 'Teacher'] },
    { name: 'Staff', path: '/staff', icon: ShieldCheck, roles: ['Super Admin', 'Admin'] },
    { name: 'Fees', path: '/fees', icon: CreditCard, roles: ['Super Admin', 'Admin', 'Accountant'] },
    { name: 'QuickPay Setup', path: '/quickpay-setup', icon: Settings, roles: ['Super Admin', 'Admin'] },
    { name: 'Exams', path: '/exams', icon: FileText, roles: ['Super Admin', 'Admin', 'Teacher'] },
    { name: 'My Portal', path: '/portal', icon: UserIcon, roles: ['Student'] },
  ].filter(item => item.roles.includes(user.role));

  return (
    <div className="flex h-screen bg-gray-100 font-sans">
      {/* Sidebar */}
      <AnimatePresence mode="wait">
        {isSidebarOpen && (
          <motion.aside
            initial={{ x: -250 }}
            animate={{ x: 0 }}
            exit={{ x: -250 }}
            className="w-64 bg-white border-r border-gray-200 flex flex-col z-30"
          >
            <div className="p-6 border-b border-gray-100">
              <h1 className="text-xl font-bold text-blue-600 flex items-center gap-2">
                <School className="w-6 h-6" />
                Faizan Islamic School
              </h1>
            </div>
            
            <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      isActive 
                        ? 'bg-blue-50 text-blue-600 font-medium' 
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>

            <div className="p-4 border-t border-gray-100 text-center">
              <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-2">Developed by Oranzeb Khan Baloch</p>
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 px-4 py-3 w-full rounded-lg text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut className="w-5 h-5" />
                Logout
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 z-20">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 hover:bg-gray-100 rounded-lg text-gray-600"
          >
            {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-gray-900">{user.fullName}</p>
              <p className="text-xs text-gray-500">{user.role}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
              {user.fullName.charAt(0)}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
