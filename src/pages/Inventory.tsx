import React, { useEffect, useState } from 'react';
import { Package, Plus, Search, Edit2, Trash2, AlertTriangle, CheckCircle, Clock, Filter, XCircle, Tag, Layers, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { InventoryItem } from '../types';
import { dataService } from '../services/dataService';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

export default function Inventory() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    itemName: '',
    category: 'Stationery',
    quantity: 0,
    unit: 'Units',
    minThreshold: 5,
    lastUpdated: new Date().toISOString()
  });

  useEffect(() => {
    const unsub = dataService.subscribe('inventory', setItems);
    return () => unsub();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.itemName.trim()) {
      toast.error('Item name is required');
      return;
    }
    if (formData.quantity < 0) {
      toast.error('Quantity cannot be negative');
      return;
    }

    try {
      const itemData = {
        ...formData,
        lastUpdated: new Date().toISOString()
      };

      if (editingId) {
        await dataService.update('inventory', editingId, itemData);
        toast.success('Inventory item updated successfully');
      } else {
        await dataService.add('inventory', itemData);
        toast.success('Inventory item added successfully');
      }
      setIsModalOpen(false);
      setEditingId(null);
      setFormData({ itemName: '', category: 'Stationery', quantity: 0, unit: 'Units', minThreshold: 5, lastUpdated: '' });
    } catch (error) {
      console.error('Error saving inventory item:', error);
      toast.error('Failed to save inventory item');
    }
  };

  const handleEdit = (item: InventoryItem) => {
    setEditingId(item.id);
    setFormData({
      itemName: item.itemName,
      category: item.category,
      quantity: item.quantity,
      unit: item.unit,
      minThreshold: item.minThreshold,
      lastUpdated: item.lastUpdated
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      try {
        await dataService.delete('inventory', id);
        toast.success('Inventory item deleted successfully');
      } catch (error) {
        console.error('Error deleting inventory item:', error);
        toast.error('Failed to delete inventory item');
      }
    }
  };

  const filteredItems = items.filter(item => 
    item.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Inventory Management</h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">Track school supplies, furniture, and equipment</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            setEditingId(null);
            setIsModalOpen(true);
          }}
          className="vibrant-btn-primary px-6 py-3 rounded-2xl flex items-center gap-3 shadow-xl shadow-primary/20 w-fit"
        >
          <Plus className="w-5 h-5" />
          <span className="text-[10px] font-black uppercase tracking-widest">Add New Item</span>
        </motion.button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="vibrant-card p-6 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 -mr-12 -mt-12 rounded-full blur-2xl"></div>
          <div className="flex items-center gap-4 relative z-10">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
              <Package className="w-7 h-7" />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Inventory</p>
              <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{items.length}</p>
            </div>
          </div>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="vibrant-card p-6 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-danger/5 -mr-12 -mt-12 rounded-full blur-2xl"></div>
          <div className="flex items-center gap-4 relative z-10">
            <div className="w-14 h-14 rounded-2xl bg-danger/10 flex items-center justify-center text-danger">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Low Stock Alerts</p>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                  {items.filter(i => i.quantity <= i.minThreshold).length}
                </p>
                <span className="text-[10px] font-black text-danger uppercase tracking-widest flex items-center gap-1">
                  <ArrowDownRight className="w-3 h-3" />
                  Critical
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="vibrant-card p-6 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-success/5 -mr-12 -mt-12 rounded-full blur-2xl"></div>
          <div className="flex items-center gap-4 relative z-10">
            <div className="w-14 h-14 rounded-2xl bg-success/10 flex items-center justify-center text-success">
              <CheckCircle className="w-7 h-7" />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Healthy Stock</p>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                  {items.filter(i => i.quantity > i.minThreshold).length}
                </p>
                <span className="text-[10px] font-black text-success uppercase tracking-widest flex items-center gap-1">
                  <ArrowUpRight className="w-3 h-3" />
                  Stable
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="vibrant-card overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="relative max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search inventory items or categories..."
              className="vibrant-input pl-12"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-900/50 text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">
                <th className="px-8 py-5">Item Details</th>
                <th className="px-8 py-5">Category</th>
                <th className="px-8 py-5">Current Stock</th>
                <th className="px-8 py-5">Status</th>
                <th className="px-8 py-5">Last Activity</th>
                <th className="px-8 py-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredItems.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                        <Package className="w-5 h-5" />
                      </div>
                      <span className="font-black text-slate-900 dark:text-white tracking-tight">{item.itemName}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-xl text-[9px] font-black uppercase tracking-widest border border-slate-200 dark:border-slate-700">
                      {item.category}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2 font-black text-slate-900 dark:text-white">
                      <Layers className="w-4 h-4 text-primary" />
                      {item.quantity} <span className="text-[10px] text-slate-400 uppercase">{item.unit}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    {item.quantity <= item.minThreshold ? (
                      <span className="px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-2 w-fit bg-danger/10 text-danger border border-danger/10">
                        <div className="w-1.5 h-1.5 rounded-full bg-danger animate-pulse" />
                        Low Stock
                      </span>
                    ) : (
                      <span className="px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-2 w-fit bg-success/10 text-success border border-success/10">
                        <div className="w-1.5 h-1.5 rounded-full bg-success" />
                        In Stock
                      </span>
                    )}
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      <Clock className="w-3 h-3" />
                      {new Date(item.lastUpdated).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <motion.button 
                        whileHover={{ scale: 1.1, y: -2 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleEdit(item)} 
                        className="p-3 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 text-primary hover:bg-primary hover:text-white transition-all"
                      >
                        <Edit2 className="w-4 h-4" />
                      </motion.button>
                      <motion.button 
                        whileHover={{ scale: 1.1, y: -2 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleDelete(item.id)} 
                        className="p-3 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 text-danger hover:bg-danger hover:text-white transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </motion.button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredItems.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-400">
                      <Search className="w-12 h-12 mb-4 opacity-20" />
                      <p className="text-lg font-black tracking-tight uppercase">No inventory items found</p>
                      <p className="text-sm font-medium opacity-60">Try adjusting your search term</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/40 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="vibrant-card w-full max-w-md overflow-hidden border-none shadow-2xl"
            >
              <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-primary text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 -mr-16 -mt-16 rounded-full blur-2xl"></div>
                <h3 className="text-2xl font-black tracking-tight uppercase relative z-10">
                  {editingId ? 'Edit Inventory Item' : 'Add New Item'}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="text-white/60 hover:text-white transition-colors relative z-10">
                  <XCircle className="w-8 h-8" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-8 space-y-6 bg-white dark:bg-slate-900">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Item Name</label>
                    <div className="relative">
                      <Tag className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input required className="vibrant-input pl-12" value={formData.itemName} onChange={(e) => setFormData({ ...formData, itemName: e.target.value })} placeholder="e.g. Whiteboard Markers" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Category</label>
                    <select className="vibrant-input" value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })}>
                      <option value="Stationery">Stationery</option>
                      <option value="Furniture">Furniture</option>
                      <option value="Electronics">Electronics</option>
                      <option value="Sports">Sports</option>
                      <option value="Lab Equipment">Lab Equipment</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Quantity</label>
                      <input type="number" required className="vibrant-input" value={formData.quantity} onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })} />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Unit</label>
                      <input required className="vibrant-input" value={formData.unit} onChange={(e) => setFormData({ ...formData, unit: e.target.value })} placeholder="e.g. Units, Boxes" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Min Threshold (Alert Level)</label>
                    <div className="relative">
                      <AlertTriangle className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input type="number" required className="vibrant-input pl-12" value={formData.minThreshold} onChange={(e) => setFormData({ ...formData, minThreshold: Number(e.target.value) })} />
                    </div>
                  </div>
                </div>
                <div className="flex gap-4 pt-6 border-t border-slate-100 dark:border-slate-800">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-6 py-4 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">Cancel</button>
                  <button type="submit" className="flex-1 vibrant-btn-primary py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-primary/20">Save Item</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
