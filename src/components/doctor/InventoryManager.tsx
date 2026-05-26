import { useState, useEffect } from 'react';
import { db } from '../../lib/db';
import { logAction } from '../../lib/audit';
import { collection, onSnapshot, addDoc, updateDoc, doc, deleteDoc, query, orderBy, where } from 'firebase/firestore';
import { toast } from 'sonner';
import { InventoryItem, UserProfile } from '../../types';
import { Package, Plus, Search, AlertTriangle, ArrowUpRight, ArrowDownRight, Edit3, Trash2, X, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { auth, handleFirestoreError, OperationType } from '../../lib/db';

import { useLanguage } from '../../lib/i18n';

interface InventoryManagerProps {
  profile: UserProfile | null;
}

export default function InventoryManager({ profile }: InventoryManagerProps) {
  const { t } = useLanguage();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [search, setSearch] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [categoryFilter, setCategoryFilter] = useState('All');

  const categories = ['All', 'Remedy', 'Tincture', 'Bio-Comb', 'Supplements'];

  const [formData, setFormData] = useState<Partial<InventoryItem>>({
    name: '',
    category: 'Remedy',
    stockLevel: 0,
    unit: 'Bottles',
    price: 0
  });

  useEffect(() => {
    if (!profile?.clinicId) return;

    setLoading(true);
    const q = query(
      collection(db, 'inventory'), 
      where('clinicId', '==', profile.clinicId),
      orderBy('name', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      setItems(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as InventoryItem)));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'inventory');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [profile?.clinicId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.clinicId) {
      toast.error('Clinic identification missing');
      return;
    }

    try {
      // Data Sanitization: Remove internal fields if they exist in formData
      const { id: _, clinicId: __, ...updateData } = formData as any;
      
      const payload = {
        ...updateData,
        lastUpdated: new Date().toISOString()
      };

      if (editingItem && editingItem.id) {
        await updateDoc(doc(db, 'inventory', editingItem.id), payload);
        await logAction({
          action: 'Update Inventory Item',
          entityType: 'Inventory',
          entityId: editingItem.id,
          clinicId: profile.clinicId,
          details: `Updated ${formData.name} details`
        });
        toast.success('Stock updated');
      } else {
        const docRef = await addDoc(collection(db, 'inventory'), {
          ...payload,
          clinicId: profile.clinicId
        });
        await logAction({
          action: 'Add Inventory Item',
          entityType: 'Inventory',
          entityId: docRef.id,
          clinicId: profile.clinicId,
          details: `Added ${formData.name} to pharmacy`
        });
        toast.success('Item added to inventory');
      }
      setIsAdding(false);
      setEditingItem(null);
      setFormData({ name: '', category: 'Remedy', stockLevel: 0, unit: 'Bottles', price: 0 });
    } catch (error) {
      handleFirestoreError(error, editingItem ? OperationType.UPDATE : OperationType.CREATE, 'inventory');
      toast.error('Save failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const updateStock = async (id: string, current: number, delta: number) => {
    if (!profile?.clinicId) return;
    try {
      const newStock = Math.max(0, current + delta);
      await updateDoc(doc(db, 'inventory', id), id ? {
        stockLevel: newStock,
        lastUpdated: new Date().toISOString()
      } : {});
      await logAction({
        action: 'Update Stock Level',
        entityType: 'Inventory',
        entityId: id,
        clinicId: profile.clinicId,
        details: `Stock level changed from ${current} to ${newStock}`
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'inventory');
      toast.error('Failed to update stock');
    }
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase()) || 
                         item.category.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === 'All' || item.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const lowStockCount = items.filter(i => i.stockLevel < 5).length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row gap-3 flex-1">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Search medicines..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-10 py-3 sm:py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 text-sm"
              />
              {search && (
                <button 
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-full"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            <select 
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-4 py-3 sm:py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 text-sm font-bold text-slate-600"
            >
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <button 
            onClick={() => setIsAdding(true)}
            className="flex items-center justify-center gap-2 px-6 py-3 sm:py-2 bg-slate-900 text-white rounded-xl text-sm font-bold shadow-lg shadow-slate-200 transition-transform active:scale-95"
          >
            <Plus size={16} /> <span className="sm:hidden lg:inline">New Item</span>
          </button>
        </div>
        <div className={`p-4 sm:p-6 rounded-2xl border flex items-center gap-4 transition-colors ${lowStockCount > 0 ? 'bg-red-50 border-red-100 text-red-600' : 'bg-emerald-50 border-emerald-100 text-emerald-600'}`}>
          <div className={`p-3 rounded-xl ${lowStockCount > 0 ? 'bg-red-100' : 'bg-emerald-100'}`}>
            <AlertTriangle size={24} />
          </div>
          <div>
            <p className="text-sm font-bold uppercase tracking-wider">{lowStockCount > 0 ? 'Action Required' : 'Inventory Healthy'}</p>
            <p className="text-xl font-bold">{lowStockCount} items low in stock</p>
          </div>
        </div>
      </div>

      <div className="bg-white sm:bg-transparent rounded-2xl border border-slate-200 sm:border-none shadow-sm sm:shadow-none overflow-hidden touch-scroll">
        {/* Mobile View: Cards */}
        <div className="grid grid-cols-1 gap-4 sm:hidden p-4 pb-20">
          {filteredItems.map((item) => (
            <div key={item.id} className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm space-y-4 active:scale-[0.98] transition-all">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-xs shrink-0 ${item.stockLevel < 5 ? 'bg-red-50 text-red-600' : 'bg-slate-50 text-slate-600'}`}>
                    <Package size={24} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-slate-900 text-base leading-tight truncate">{item.name}</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest truncate">{item.category}</p>
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button 
                    onClick={() => { setEditingItem(item); setFormData(item); setIsAdding(true); }}
                    className="tap-target text-slate-400 hover:text-indigo-600 active:bg-indigo-50 rounded-xl"
                  >
                    <Edit3 size={18} />
                  </button>
                  <button 
                    onClick={async () => {
                      if(confirm('Delete from inventory?')) {
                        try {
                          await deleteDoc(doc(db, 'inventory', item.id!));
                          await logAction({
                            action: 'Delete Inventory Item',
                            entityType: 'Inventory',
                            entityId: item.id,
                            clinicId: profile?.clinicId,
                            details: `Removed ${item.name}`
                          });
                        } catch (error) {
                          handleFirestoreError(error, OperationType.DELETE, 'inventory');
                        }
                      }
                    }}
                    className="tap-target text-slate-400 hover:text-red-600 active:bg-red-50 rounded-xl"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 py-4 px-1 bg-slate-50 rounded-2xl items-center">
                <div className="pl-3 min-w-0">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 truncate">Current Stock</p>
                  <div className="flex flex-col gap-2">
                    <span className={`text-base font-bold truncate ${item.stockLevel < 5 ? 'text-red-600' : 'text-slate-900'}`}>
                      {item.stockLevel} {item.unit}
                    </span>
                    <div className="flex gap-2">
                      <button onClick={() => updateStock(item.id!, item.stockLevel, 1)} className="tap-target bg-white border border-slate-200 text-emerald-600 rounded-lg shadow-sm active:scale-95 min-w-[44px]">
                        <Plus size={16} />
                      </button>
                      <button onClick={() => updateStock(item.id!, item.stockLevel, -1)} className="tap-target bg-white border border-slate-200 text-red-600 rounded-lg shadow-sm active:scale-95 min-w-[44px]">
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                </div>
                <div className="text-right pr-4 border-l border-slate-200 min-w-0">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 truncate">Unit Price</p>
                  <p className="text-2xl font-bold text-slate-900 truncate">₹{item.price}</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 truncate">Per {item.unit.slice(0, -1)}</p>
                </div>
              </div>
            </div>
          ))}
          {filteredItems.length === 0 && (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 bg-white rounded-2xl border border-slate-100 italic">
              <Package size={48} className="opacity-10 mb-4" />
              <p className="text-sm">No items found</p>
            </div>
          )}
        </div>

        {/* Desktop View: Table */}
        <div className="hidden sm:block">
          <table className="w-full text-left">
          <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-100">
            <tr>
              <th className="px-8 py-4">Item Details</th>
              <th className="px-8 py-4">Category</th>
              <th className="px-8 py-4">Current Stock</th>
              <th className="px-8 py-4">Unit Price</th>
              <th className="px-8 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filteredItems.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                <td className="px-8 py-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${item.stockLevel < 5 ? 'bg-red-50 text-red-600' : 'bg-slate-50 text-slate-600'}`}>
                      <Package size={16} />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">{item.name}</p>
                      <p className="text-[10px] text-slate-400 uppercase font-bold">Last Restock: {item.lastUpdated ? format(new Date(item.lastUpdated), 'dd MMM') : 'Never'}</p>
                    </div>
                  </div>
                </td>
                <td className="px-8 py-4 text-sm font-medium text-slate-600">{item.category}</td>
                <td className="px-8 py-4">
                  <div className="flex items-center gap-4">
                    <span className={`text-sm font-bold ${item.stockLevel < 5 ? 'text-red-600' : 'text-slate-900'}`}>
                      {item.stockLevel} {item.unit}
                    </span>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => updateStock(item.id!, item.stockLevel, 1)} className="p-1 hover:bg-emerald-50 text-emerald-600 rounded">
                        <Plus size={14} />
                      </button>
                      <button onClick={() => updateStock(item.id!, item.stockLevel, -1)} className="p-1 hover:bg-red-50 text-red-600 rounded">
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                </td>
                <td className="px-8 py-4 text-sm font-bold text-slate-900">₹{item.price}</td>
                <td className="px-8 py-4 text-right">
                   <div className="flex justify-end gap-2">
                     <button 
                       onClick={() => { setEditingItem(item); setFormData(item); setIsAdding(true); }}
                       className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                     >
                       <Edit3 size={18} />
                     </button>
                     <button 
                       onClick={async () => {
                         if(confirm('Delete from inventory?')) {
                           try {
                             await deleteDoc(doc(db, 'inventory', item.id!));
                             await logAction({
                               action: 'Delete Inventory Item',
                               entityType: 'Inventory',
                               entityId: item.id,
                               clinicId: profile?.clinicId,
                               details: `Removed ${item.name}`
                             });
                           } catch (error) {
                             handleFirestoreError(error, OperationType.DELETE, 'inventory');
                           }
                         }
                       }}
                       className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                     >
                       <Trash2 size={18} />
                     </button>
                   </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      </div>

      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <h2 className="text-lg font-bold text-slate-800">{editingItem ? 'Edit Stock Item' : 'New Pharmacy Entry'}</h2>
                <button onClick={() => { setIsAdding(false); setEditingItem(null); }} className="text-slate-400 hover:text-slate-600">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Item Name</label>
                  <input 
                    required
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Aconite 200C"
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Category</label>
                    <select 
                      value={formData.category}
                      onChange={e => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-indigo-500"
                    >
                      <option>Remedy</option>
                      <option>Tincture</option>
                      <option>Bio-Comb</option>
                      <option>Supplements</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Stock Unit</label>
                    <input 
                      value={formData.unit}
                      onChange={e => setFormData({ ...formData, unit: e.target.value })}
                      placeholder="Bottles"
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Current Quantity</label>
                    <input 
                      type="number"
                      required
                      value={formData.stockLevel}
                      onChange={e => setFormData({ ...formData, stockLevel: parseInt(e.target.value) || 0 })}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Unit Price (₹)</label>
                    <input 
                      type="number"
                      required
                      value={formData.price}
                      onChange={e => setFormData({ ...formData, price: parseInt(e.target.value) || 0 })}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
                <button className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 shadow-xl transition-all mt-4 uppercase tracking-wider">
                  Update Pharmacy Store
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
