import { useEffect, useState } from 'react';
import { 
  Users, 
  School, 
  CreditCard, 
  AlertCircle,
  TrendingUp,
  BarChart3,
  Calendar,
  ArrowRight,
  Clock,
  History as HistoryIcon
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
  Line,
  Cell
} from 'recharts';
import { User, Campus, Student, Fee, Transaction } from '../types';
import { dataService } from '../services/dataService';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';

interface DashboardProps {
  user: User;
}

export default function Dashboard({ user }: DashboardProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    campuses: 0,
    students: 0,
    collectedFees: 0,
    outstandingAmount: 0,
    onlineCollections: 0
  });

  const [feeData, setFeeData] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [dbError, setDbError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setDbError(null);
      
      try {
        // Fetch real-time stats from the new endpoint
        const dashboardStats = await dataService.getAll('dashboard-stats');
        const statsData = Array.isArray(dashboardStats) ? dashboardStats[0] : dashboardStats;
        
        if (statsData) {
          setStats(prev => ({
            ...prev,
            students: statsData.activeStudents || 0,
            collectedFees: statsData.totalCollected || 0,
            outstandingAmount: statsData.totalOutstanding || 0
          }));
        }

        const unsubCampuses = dataService.subscribe('campuses', (data: Campus[]) => {
          setStats(prev => ({ ...prev, campuses: data.length }));
        });

        const unsubTransactions = dataService.subscribe('transactions', (data: Transaction[]) => {
          const online = data.filter(t => t.status === 'Success').reduce((acc, t) => acc + t.amount, 0);
          setStats(prev => ({ ...prev, onlineCollections: online }));
          
          const activities = data.slice(-5).reverse().map(t => ({
            id: t.id,
            type: 'Payment',
            title: `Payment of Rs. ${t.amount}`,
            time: new Date(t.transactionDate).toLocaleTimeString(),
            icon: CreditCard,
            color: 'text-green-500'
          }));
          setRecentActivity(activities);
        });

        const unsubVouchers = dataService.subscribe('fees', (data: Fee[]) => {
          const monthlyData = data.reduce((acc: any, curr) => {
            const month = curr.month;
            if (!acc[month]) acc[month] = { month: `Month ${month}`, collected: 0, pending: 0 };
            if (curr.status === 'Paid') acc[month].collected += curr.amount;
            else acc[month].pending += curr.amount;
            return acc;
          }, {});
          setFeeData(Object.values(monthlyData));
        });

        setLoading(false);
        return () => {
          unsubCampuses();
          unsubTransactions();
          unsubVouchers();
        };
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setDbError('Could not connect to SQL Server. Please check your credentials in the Settings menu.');
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const cards = [
    { title: 'Total Campuses', value: stats.campuses, icon: School, color: 'bg-primary', path: '/campuses' },
    { title: 'Active Students', value: stats.students, icon: Users, color: 'bg-success', path: '/students' },
    { title: 'Fees Collected', value: `Rs. ${stats.collectedFees.toLocaleString()}`, icon: CreditCard, color: 'bg-teal-500', path: '/fees' },
    { title: 'Outstanding Amount', value: `Rs. ${stats.outstandingAmount.toLocaleString()}`, icon: AlertCircle, color: 'bg-danger', path: '/fees' },
    { title: 'Online Payments', value: `Rs. ${stats.onlineCollections.toLocaleString()}`, icon: TrendingUp, color: 'bg-accent', path: '/quickpay' },
  ];

  if (loading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="h-12 w-64 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-32 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 h-[500px] bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800"></div>
          <div className="h-[500px] bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {dbError && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 bg-danger/10 border border-danger/20 rounded-3xl flex items-center gap-4 text-danger"
        >
          <AlertCircle className="w-6 h-6 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-black uppercase tracking-widest">Database Connection Error</p>
            <p className="text-xs font-medium opacity-80">{dbError}</p>
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-danger text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-danger/90 transition-colors"
          >
            Retry
          </button>
        </motion.div>
      )}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">Dashboard</h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Welcome back, <span className="text-primary font-bold">{user.fullName}</span></p>
        </div>
        <div className="flex items-center gap-3 text-[10px] font-black text-slate-400 uppercase tracking-widest bg-white dark:bg-slate-900 px-6 py-3 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm transition-colors">
          <Calendar className="w-4 h-4 text-primary" />
          {new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {/* School Highlights */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="vibrant-card overflow-hidden group"
      >
        <div className="flex flex-col md:flex-row">
          <div className="md:w-1/2 h-64 md:h-auto relative overflow-hidden">
            <img 
              src="https://picsum.photos/seed/masjid-faizan-group/1200/800" 
              alt="School Event" 
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-transparent"></div>
          </div>
          <div className="md:w-1/2 p-10 flex flex-col justify-center bg-white dark:bg-slate-900">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-primary/10 rounded-xl text-primary">
                <School className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-black text-primary uppercase tracking-widest">Recent Highlights</span>
            </div>
            <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-tight mb-4">Faizan-e-Madinah Sacramento Event</h3>
            <p className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed mb-8">Celebrating our students' achievements and community milestones at the Faizan-e-Madinah Masjid. A day of learning, growth, and spiritual enrichment.</p>
            <button className="vibrant-btn-primary w-fit flex items-center gap-3">
              <span className="text-[10px] font-black uppercase tracking-widest">View Gallery</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {cards.map((card, i) => (
          <motion.button
            whileHover={{ y: -8, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            key={i}
            onClick={() => navigate(card.path)}
            className="vibrant-card p-8 flex items-center gap-6 text-left group relative overflow-hidden"
          >
            <div className={`absolute top-0 right-0 w-32 h-32 ${card.color} opacity-[0.03] -mr-16 -mt-16 rounded-full group-hover:scale-150 transition-transform duration-700`}></div>
            <div className={`${card.color} p-5 rounded-2xl text-white shadow-xl shadow-current/20 group-hover:rotate-6 transition-transform duration-300`}>
              <card.icon className="w-7 h-7" />
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{card.title}</p>
              <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{card.value}</p>
            </div>
            <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-xl group-hover:bg-primary group-hover:text-white transition-all duration-300">
              <ArrowRight className="w-5 h-5" />
            </div>
          </motion.button>
        ))}
      </div>

      {/* Charts & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 vibrant-card p-8">
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-xl">
                <BarChart3 className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Fee Collection</h3>
            </div>
            <select className="bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl text-[10px] font-black uppercase tracking-widest px-4 py-2 outline-none focus:ring-2 focus:ring-primary/20 transition-all">
              <option>Last 6 Months</option>
              <option>Last Year</option>
            </select>
          </div>
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={feeData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                <XAxis 
                  dataKey="month" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 700 }} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 700 }} 
                  tickFormatter={(value) => `Rs. ${value >= 1000 ? (value / 1000).toFixed(1) + 'k' : value}`}
                />
                <Tooltip 
                  formatter={(value: any) => [`Rs. ${value.toLocaleString()}`, '']}
                  contentStyle={{ 
                    borderRadius: '24px', 
                    border: 'none', 
                    boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    backdropFilter: 'blur(10px)',
                    padding: '16px'
                  }}
                  cursor={{ fill: '#f1f5f9', radius: 12 }}
                />
                <Bar 
                  dataKey="collected" 
                  fill="#00a99d" 
                  radius={[10, 10, 0, 0]} 
                  name="Collected" 
                  barSize={32}
                />
                <Bar 
                  dataKey="pending" 
                  fill="#003b5c" 
                  radius={[10, 10, 0, 0]} 
                  name="Pending" 
                  barSize={32}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="vibrant-card p-8 flex flex-col">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 bg-secondary/10 rounded-xl">
              <HistoryIcon className="w-6 h-6 text-secondary" />
            </div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Activity</h3>
          </div>
          <div className="space-y-8 flex-1">
            {recentActivity.length > 0 ? recentActivity.map((activity, i) => (
              <div key={i} className="flex gap-5 group cursor-pointer">
                <div className={`mt-1 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 ${activity.color} group-hover:scale-110 transition-transform duration-300`}>
                  <activity.icon className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-primary transition-colors">{activity.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{activity.time}</p>
                  </div>
                </div>
              </div>
            )) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 opacity-50">
                <HistoryIcon className="w-12 h-12 mb-4" />
                <p className="text-sm font-bold uppercase tracking-widest">No recent activity</p>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="mt-16 pt-8 border-t border-slate-100 dark:border-slate-800 text-center">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest opacity-50">Developed by Oranzeb Khan Baloch</p>
      </div>
    </div>
  );
}
