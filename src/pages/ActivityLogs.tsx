import React, { useEffect, useState } from 'react';
import { Search, Filter, Clock, User as UserIcon, Shield, Activity, Globe, Terminal } from 'lucide-react';
import { ActivityLog, User } from '../types';
import { dataService } from '../services/dataService';
import { motion } from 'motion/react';

export default function ActivityLogs() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const unsub = dataService.subscribe('activitylogs', setLogs);
    return () => unsub();
  }, []);

  const filteredLogs = logs.filter(log => 
    log.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.details.toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase">System Activity Logs</h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">Monitor all system actions and user activities</p>
        </div>
        <div className="relative max-w-md w-full sm:w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search logs..." 
            className="vibrant-input pl-12"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="vibrant-card p-6 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 -mr-12 -mt-12 rounded-full blur-2xl"></div>
          <div className="flex items-center gap-4 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Logs</p>
              <p className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{logs.length}</p>
            </div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="vibrant-card p-6 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-success/5 -mr-12 -mt-12 rounded-full blur-2xl"></div>
          <div className="flex items-center gap-4 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-success/10 flex items-center justify-center text-success">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Security Actions</p>
              <p className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                {logs.filter(l => l.action.toLowerCase().includes('login') || l.action.toLowerCase().includes('auth')).length}
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="vibrant-card p-6 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-warning/5 -mr-12 -mt-12 rounded-full blur-2xl"></div>
          <div className="flex items-center gap-4 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-warning/10 flex items-center justify-center text-warning">
              <Terminal className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Data Updates</p>
              <p className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                {logs.filter(l => l.action.toLowerCase().includes('update') || l.action.toLowerCase().includes('edit')).length}
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="vibrant-card p-6 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-danger/5 -mr-12 -mt-12 rounded-full blur-2xl"></div>
          <div className="flex items-center gap-4 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-danger/10 flex items-center justify-center text-danger">
              <Globe className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Unique IPs</p>
              <p className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                {new Set(logs.map(l => l.ipAddress)).size}
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="vibrant-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-900/50 text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">
                <th className="px-8 py-5">Timestamp</th>
                <th className="px-8 py-5">User</th>
                <th className="px-8 py-5">Action</th>
                <th className="px-8 py-5">Details</th>
                <th className="px-8 py-5">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-3 text-[11px] font-black text-slate-400 uppercase tracking-widest">
                      <Clock className="w-4 h-4 text-primary/50" />
                      {new Date(log.timestamp).toLocaleString()}
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                        <UserIcon className="w-4 h-4" />
                      </div>
                      <span className="font-black text-slate-900 dark:text-white tracking-tight">{log.userName}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-xl text-[9px] font-black uppercase tracking-widest border border-slate-200 dark:border-slate-700">
                      {log.action}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400 max-w-md truncate group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                      {log.details}
                    </p>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2 font-mono text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      <Globe className="w-3 h-3" />
                      {log.ipAddress || '127.0.0.1'}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-400">
                      <Activity className="w-12 h-12 mb-4 opacity-20" />
                      <p className="text-lg font-black tracking-tight uppercase">No activity logs found</p>
                      <p className="text-sm font-medium opacity-60">Try adjusting your search term</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
