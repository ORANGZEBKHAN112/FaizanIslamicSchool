import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Toaster } from 'sonner';
import { User } from './types';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import CampusManagement from './pages/CampusManagement';
import ClassManagement from './pages/ClassManagement';
import StudentManagement from './pages/StudentManagement';
import FeeManagement from './pages/FeeManagement';
import Attendance from './pages/Attendance';
import Exams from './pages/Exams';
import ActivityLogs from './pages/ActivityLogs';
import Inventory from './pages/Inventory';
import StaffPayroll from './pages/StaffPayroll';
import StaffManagement from './pages/StaffManagement';
import QuickPaySetup from './pages/QuickPaySetup';
import StudentPortal from './pages/StudentPortal';
import Layout from './components/Layout';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    
    if (storedUser && token) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
      }
    }
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-950">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <Router>
      <Toaster position="top-right" richColors closeButton />
      <Routes>
        <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
        
        <Route path="/" element={user ? <Layout user={user} /> : <Navigate to="/login" />}>
          <Route index element={<Dashboard user={user} />} />
          
          {/* Admin Routes */}
          {(user?.role === 'Super Admin' || user?.role === 'Admin') && (
            <>
              <Route path="campuses" element={<CampusManagement />} />
              <Route path="classes" element={<ClassManagement />} />
              <Route path="students" element={<StudentManagement />} />
              <Route path="attendance" element={<Attendance user={user} />} />
              <Route path="fees" element={<FeeManagement />} />
              <Route path="exams" element={<Exams user={user} />} />
              <Route path="staff" element={<StaffManagement />} />
              <Route path="quickpay" element={<QuickPaySetup />} />
              <Route path="activity-logs" element={<ActivityLogs />} />
              <Route path="inventory" element={<Inventory />} />
              <Route path="payroll" element={<StaffPayroll />} />
            </>
          )}

          {/* Student Portal */}
          {user?.role === 'Student' && (
            <Route path="portal" element={<StudentPortal user={user} />} />
          )}
        </Route>

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}
