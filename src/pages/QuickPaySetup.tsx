import React, { useEffect, useState } from 'react';
import { Settings, Save, ShieldCheck, History, BarChart3, AlertCircle } from 'lucide-react';
import { QuickPayConfig, Transaction } from '../types';
import { dataService } from '../services/dataService';
import { motion } from 'motion/react';

export default function QuickPaySetup() {
  const [config, setConfig] = useState<QuickPayConfig | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const unsubConfig = dataService.subscribe('quickPayConfig', (data: QuickPayConfig[]) => {
      if (data.length > 0) setConfig(data[0]);
    });
    const unsubTransactions = dataService.subscribe('transactions', setTransactions);
    return () => {
      unsubConfig();
      unsubTransactions();
    };
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!config) return;
    setLoading(true);
    try {
      if (config.id) {
        await dataService.update('quickPayConfig', config.id, config);
      } else {
        await dataService.add('quickPayConfig', config);
      }
      setMessage('Configuration saved successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage('Error saving configuration.');
    } finally {
      setLoading(false);
    }
  };

  const stats = {
    today: transactions.filter(t => t.transactionDate.startsWith(new Date().toISOString().split('T')[0]) && t.status === 'Success').reduce((acc, t) => acc + t.amount, 0),
    online: transactions.filter(t => t.status === 'Success').reduce((acc, t) => acc + t.amount, 0),
    failed: transactions.filter(t => t.status === 'Failed').length,
    pending: transactions.filter(t => t.status === 'Pending').length
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">QuickPay Integration</h2>
        {message && <span className="text-sm font-medium text-green-600 bg-green-50 px-4 py-2 rounded-lg border border-green-100">{message}</span>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Today Collections</p>
          <p className="text-2xl font-bold text-gray-900">Rs. {stats.today}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Online Collections</p>
          <p className="text-2xl font-bold text-blue-600">Rs. {stats.online}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Failed Payments</p>
          <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Pending Callbacks</p>
          <p className="text-2xl font-bold text-orange-600">{stats.pending}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100 bg-gray-50">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <Settings className="w-5 h-5 text-blue-600" />
                Configuration
              </h3>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Merchant ID</label>
                <input 
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  value={config?.merchantId || ''}
                  onChange={(e) => setConfig(prev => ({ ...prev!, merchantId: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
                <input 
                  type="password"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  value={config?.apiKey || ''}
                  onChange={(e) => setConfig(prev => ({ ...prev!, apiKey: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Callback URL</label>
                <input 
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                  value={config?.callbackUrl || `${window.location.origin}/api/quickpay/callback`}
                  readOnly
                />
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                <span className="text-sm font-medium text-gray-700">Payment Mode</span>
                <select 
                  className="bg-transparent text-sm font-bold text-blue-600 outline-none"
                  value={config?.mode || 'Sandbox'}
                  onChange={(e) => setConfig(prev => ({ ...prev!, mode: e.target.value as any }))}
                >
                  <option value="Sandbox">Sandbox</option>
                  <option value="Live">Live</option>
                </select>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                <span className="text-sm font-medium text-gray-700">Enable QuickPay</span>
                <button 
                  type="button"
                  onClick={() => setConfig(prev => ({ ...prev!, isEnabled: !prev?.isEnabled }))}
                  className={`w-12 h-6 rounded-full transition-colors relative ${config?.isEnabled ? 'bg-green-500' : 'bg-gray-300'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${config?.isEnabled ? 'left-7' : 'left-1'}`} />
                </button>
              </div>
              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-blue-600 text-white py-2 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {loading ? 'Saving...' : 'Save Configuration'}
              </button>
            </form>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <History className="w-5 h-5 text-orange-500" />
                Transaction Logs
              </h3>
              <button className="text-xs font-bold text-blue-600 hover:underline">Reconcile All</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-gray-600 text-[10px] uppercase tracking-wider">
                    <th className="px-6 py-4 font-semibold">Date</th>
                    <th className="px-6 py-4 font-semibold">Student ID</th>
                    <th className="px-6 py-4 font-semibold">Amount</th>
                    <th className="px-6 py-4 font-semibold">Status</th>
                    <th className="px-6 py-4 font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {transactions.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-gray-400 italic">No transactions recorded yet.</td>
                    </tr>
                  )}
                  {transactions.map(t => (
                    <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-xs text-gray-500">{new Date(t.transactionDate).toLocaleString()}</td>
                      <td className="px-6 py-4 text-xs font-mono text-gray-900">{t.studentId.substring(0, 8)}...</td>
                      <td className="px-6 py-4 text-sm font-bold text-gray-900">Rs. {t.amount}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          t.status === 'Success' ? 'bg-green-100 text-green-800' : 
                          t.status === 'Failed' ? 'bg-red-100 text-red-800' : 'bg-orange-100 text-orange-800'
                        }`}>
                          {t.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button className="p-2 text-gray-400 hover:text-blue-600 rounded-lg">
                          <AlertCircle className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
