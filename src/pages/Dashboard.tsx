import { useEffect, useState } from 'react';
import { 
  Users, 
  School, 
  CreditCard, 
  AlertCircle,
  TrendingUp,
  BarChart3
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts';
import { User, Campus, Student, FeeVoucher, Staff, Transaction } from '../types';
import { dataService } from '../services/dataService';

interface DashboardProps {
  user: User;
}

export default function Dashboard({ user }: DashboardProps) {
  const [stats, setStats] = useState({
    campuses: 0,
    students: 0,
    pendingFees: 0,
    defaulters: 0,
    staff: 0,
    onlineCollections: 0
  });

  const [feeData, setFeeData] = useState<any[]>([]);

  useEffect(() => {
    const unsubCampuses = dataService.subscribe('campuses', (data: Campus[]) => {
      setStats(prev => ({ ...prev, campuses: data.length }));
    });

    const unsubStudents = dataService.subscribe('students', (data: Student[]) => {
      setStats(prev => ({ ...prev, students: data.length }));
    });

    const unsubStaff = dataService.subscribe('staff', (data: Staff[]) => {
      setStats(prev => ({ ...prev, staff: data.length }));
    });

    const unsubTransactions = dataService.subscribe('transactions', (data: Transaction[]) => {
      const online = data.filter(t => t.status === 'Success').reduce((acc, t) => acc + t.amount, 0);
      setStats(prev => ({ ...prev, onlineCollections: online }));
    });

    const unsubVouchers = dataService.subscribe('feeVouchers', (data: FeeVoucher[]) => {
      const pending = data.filter(v => v.status === 'Unpaid').length;
      const totalPendingAmount = data.filter(v => v.status === 'Unpaid').reduce((acc, curr) => acc + curr.totalAmount, 0);
      setStats(prev => ({ ...prev, pendingFees: totalPendingAmount, defaulters: pending }));
      
      // Group by month for chart
      const monthlyData = data.reduce((acc: any, curr) => {
        const month = curr.voucherMonth;
        if (!acc[month]) acc[month] = { month: `M${month}`, collected: 0, pending: 0 };
        if (curr.status === 'Paid') acc[month].collected += curr.paidAmount;
        else acc[month].pending += curr.totalAmount;
        return acc;
      }, {});
      setFeeData(Object.values(monthlyData));
    });

    return () => {
      unsubCampuses();
      unsubStudents();
      unsubStaff();
      unsubTransactions();
      unsubVouchers();
    };
  }, []);

  const cards = [
    { title: 'Total Campuses', value: stats.campuses, icon: School, color: 'bg-blue-500' },
    { title: 'Total Students', value: stats.students, icon: Users, color: 'bg-green-500' },
    { title: 'Pending Fees', value: `Rs. ${stats.pendingFees.toLocaleString()}`, icon: CreditCard, color: 'bg-orange-500' },
    { title: 'Fee Defaulters', value: stats.defaulters, icon: AlertCircle, color: 'bg-red-500' },
    { title: 'Total Staff', value: stats.staff, icon: Users, color: 'bg-purple-500' },
    { title: 'Online Payments', value: `Rs. ${stats.onlineCollections.toLocaleString()}`, icon: TrendingUp, color: 'bg-teal-500' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Admin Dashboard</h2>
        <div className="text-sm text-gray-500">Welcome back, {user.fullName}</div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cards.map((card, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
            <div className={`${card.color} p-3 rounded-xl text-white`}>
              <card.icon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500">{card.title}</p>
              <p className="text-2xl font-bold text-gray-900">{card.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-500" />
              Fee Collection Summary
            </h3>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={feeData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="collected" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Collected" />
                <Bar dataKey="pending" fill="#f97316" radius={[4, 4, 0, 0]} name="Pending" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-500" />
              Student Enrollment Trend
            </h3>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={feeData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="collected" stroke="#10b981" strokeWidth={2} name="New Admissions" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      
      <div className="mt-12 pt-6 border-t border-gray-100 text-center">
        <p className="text-xs text-gray-400 uppercase tracking-widest">Developed by Oranzeb Khan Baloch</p>
      </div>
    </div>
  );
}
