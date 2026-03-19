import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  Droplets, 
  Zap, 
  CheckCircle2, 
  Circle, 
  Trash2, 
  Filter, 
  Calendar,
  AlertCircle,
  TrendingUp,
  Building2,
  X,
  PieChart as PieChartIcon,
  Search,
  ChevronLeft,
  ChevronRight,
  Repeat,
  Activity,
  Edit2,
  Layers,
  SortAsc,
  ArrowDownAz,
  Wifi,
  Flame,
  Building,
  Copy
} from 'lucide-react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip, 
  Legend 
} from 'recharts';
import { format, isPast, parseISO, isToday, addMonths, subMonths, startOfMonth, endOfMonth, isWithinInterval, startOfWeek, endOfWeek, startOfDay, endOfDay, startOfYear, endOfYear } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { motion, AnimatePresence } from 'motion/react';

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Expense {
  id: number;
  condominium: string;
  supplier?: string;
  type: 'água' | 'luz' | 'internet' | 'gás';
  dueDate: string;
  status: 'efetivado' | 'neutro' | 'sem_fatura' | 'zerado';
  classification: 'fixa' | 'variável';
  paidMonths?: string[];
  statusByMonth?: { [month: string]: 'efetivado' | 'sem_fatura' | 'zerado' | 'neutro' };
  description?: string;
}

const COLORS = {
  lançadas: '#1034F2',
  aVencer: '#a1a1aa', // zinc-400
  vencidas: '#f43f5e', // rose-500
};

export default function App() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<'all' | 'efetivado' | 'neutro' | 'sem_fatura' | 'zerado'>('all');
  const [filterType, setFilterType] = useState<'all' | 'água' | 'luz' | 'internet' | 'gás'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [formTab, setFormTab] = useState<'single' | 'multiple'>('single');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'period' | 'monthly' | 'annual'>('monthly');
  const [customRange, setCustomRange] = useState({
    start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    end: format(endOfMonth(new Date()), 'yyyy-MM-dd')
  });
  const [quickFilter, setQuickFilter] = useState<'none' | 'today' | 'week' | 'month'>('none');
  const [sortBy, setSortBy] = useState<'dueDate' | 'alphabetical'>('dueDate');
  
  // Form state
  const [formData, setFormData] = useState({
    condominium: '',
    supplier: '',
    type: 'água' as 'água' | 'luz' | 'internet' | 'gás',
    dueDate: format(new Date(), 'yyyy-MM-dd'),
    status: 'neutro' as 'efetivado' | 'neutro' | 'sem_fatura' | 'zerado',
    classification: 'fixa' as 'fixa' | 'variável',
    description: ''
  });

  const [bulkExpenses, setBulkExpenses] = useState([{
    condominium: '',
    supplier: '',
    type: 'água' as 'água' | 'luz' | 'internet' | 'gás',
    dueDate: format(new Date(), 'yyyy-MM-dd'),
    status: 'neutro' as 'efetivado' | 'neutro' | 'sem_fatura' | 'zerado',
    classification: 'fixa' as 'fixa' | 'variável',
    description: ''
  }]);

  const suggestionRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionRef.current && !suggestionRef.current.contains(event.target as Node)) {
        setActiveSuggestionIdx(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const [activeSuggestionIdx, setActiveSuggestionIdx] = useState<{type: 'single' | 'bulk', field: 'condo' | 'supplier', index?: number} | null>(null);

  const getCondoSuggestions = (input: string) => {
    const uniqueCondos = Array.from(new Set<string>(expenses.map(e => e.condominium))).filter(Boolean);
    if (!input) return uniqueCondos.slice(0, 5);
    return uniqueCondos.filter(c => 
      c.toLowerCase().includes(input.toLowerCase()) &&
      c.toLowerCase() !== input.toLowerCase()
    ).slice(0, 5);
  };

  const getSupplierSuggestions = (input: string) => {
    const uniqueSuppliers = Array.from(new Set<string>(expenses.map(e => e.supplier || ''))).filter(Boolean);
    if (!input) return uniqueSuppliers.slice(0, 5);
    return uniqueSuppliers.filter(s => 
      s.toLowerCase().includes(input.toLowerCase()) &&
      s.toLowerCase() !== input.toLowerCase()
    ).slice(0, 5);
  };

  useEffect(() => {
    const saved = localStorage.getItem('condofinance_expenses');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Migration for old data
        const migrated = parsed.map((e: any) => ({
          ...e,
          classification: e.classification || 'fixa',
          paidMonths: e.paidMonths || (e.status === 'efetivado' ? [format(parseISO(e.dueDate), 'yyyy-MM')] : [])
        }));
        setExpenses(migrated);
      } catch (e) {
        console.error('Failed to parse expenses from localStorage', e);
      }
    }
    setLoading(false);
  }, []);

  const saveToLocalStorage = (newExpenses: Expense[]) => {
    localStorage.setItem('condofinance_expenses', JSON.stringify(newExpenses));
    setExpenses(newExpenses);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingExpense) {
      const updatedExpenses = expenses.map(ex => {
        if (ex.id === editingExpense.id) {
          return { ...ex, ...formData };
        }
        return ex;
      });
      saveToLocalStorage(updatedExpenses);
    } else if (formTab === 'single') {
      const currentMonthStr = format(parseISO(formData.dueDate), 'yyyy-MM');
      const newExpense: Expense = {
        ...formData,
        id: Date.now(),
        paidMonths: formData.status === 'efetivado' ? [currentMonthStr] : []
      };
      saveToLocalStorage([newExpense, ...expenses]);
    } else {
      const newExpenses: Expense[] = bulkExpenses.map((be, index) => {
        const currentMonthStr = format(parseISO(be.dueDate), 'yyyy-MM');
        return {
          ...be,
          id: Date.now() + index,
          paidMonths: be.status === 'efetivado' ? [currentMonthStr] : []
        };
      });
      saveToLocalStorage([...newExpenses, ...expenses]);
    }

    closeForm();
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingExpense(null);
    setFormTab('single');
    setFormData({
      condominium: '',
      supplier: '',
      type: 'água',
      dueDate: format(new Date(), 'yyyy-MM-dd'),
      status: 'neutro',
      classification: 'fixa',
      description: ''
    });
    setBulkExpenses([{
      condominium: '',
      supplier: '',
      type: 'água',
      dueDate: format(new Date(), 'yyyy-MM-dd'),
      status: 'neutro',
      classification: 'fixa',
      description: ''
    }]);
    setActiveSuggestionIdx(null);
  };

  const openEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setFormData({
      condominium: expense.condominium,
      supplier: expense.supplier || '',
      type: expense.type,
      dueDate: expense.dueDate,
      status: expense.status,
      classification: expense.classification,
      description: expense.description || ''
    });
    setFormTab('single');
    setShowForm(true);
  };

  const duplicateToBulk = (expense: Expense) => {
    setBulkExpenses([{
      condominium: expense.condominium,
      supplier: expense.supplier || '',
      type: expense.type,
      dueDate: expense.dueDate,
      status: 'neutro',
      classification: expense.classification,
      description: expense.description || ''
    }]);
    setFormTab('multiple');
    setShowForm(true);
  };

  const toggleStatus = async (expense: Expense) => {
    const currentMonthStr = format(currentDate, 'yyyy-MM');
    
    const updatedExpenses = expenses.map(e => {
      if (e.id !== expense.id) return e;
      
      const getNextStatus = (current: Expense['status'], type: Expense['type']): Expense['status'] => {
        if (current === 'neutro') return 'efetivado';
        if (current === 'efetivado') {
          if (type === 'internet') return 'sem_fatura';
          if (type === 'gás') return 'zerado';
          return 'neutro';
        }
        return 'neutro';
      };

      if (e.classification === 'variável') {
        return { ...e, status: getNextStatus(e.status, e.type) } as Expense;
      } else {
        const statusByMonth = e.statusByMonth || {};
        let currentStatus = statusByMonth[currentMonthStr];
        if (!currentStatus && e.paidMonths?.includes(currentMonthStr)) {
          currentStatus = 'efetivado';
        }
        if (!currentStatus) currentStatus = 'neutro';

        const nextStatus = getNextStatus(currentStatus as any, e.type);
        const newStatusByMonth = { ...statusByMonth, [currentMonthStr]: nextStatus };
        
        let newPaidMonths = e.paidMonths || [];
        if (nextStatus === 'efetivado') {
          if (!newPaidMonths.includes(currentMonthStr)) newPaidMonths = [...newPaidMonths, currentMonthStr];
        } else {
          newPaidMonths = newPaidMonths.filter(m => m !== currentMonthStr);
        }

        return { ...e, statusByMonth: newStatusByMonth, paidMonths: newPaidMonths } as Expense;
      }
    });
    saveToLocalStorage(updatedExpenses);
  };

  const deleteExpense = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir este lançamento?')) return;
    const updatedExpenses = expenses.filter(e => e.id !== id);
    saveToLocalStorage(updatedExpenses);
  };

  const nextMonth = () => setCurrentDate(prev => addMonths(prev, 1));
  const prevMonth = () => setCurrentDate(prev => subMonths(prev, 1));

  const filteredExpenses = useMemo(() => {
    let start: Date;
    let end: Date;

    if (viewMode === 'monthly') {
      start = startOfMonth(currentDate);
      end = endOfMonth(currentDate);
    } else if (viewMode === 'annual') {
      start = startOfYear(currentDate);
      end = endOfYear(currentDate);
    } else {
      start = parseISO(customRange.start);
      end = parseISO(customRange.end);
    }

    const today = new Date();
    if (quickFilter === 'today') {
      start = startOfDay(today);
      end = endOfDay(today);
    } else if (quickFilter === 'week') {
      start = startOfWeek(today, { locale: ptBR });
      end = endOfWeek(today, { locale: ptBR });
    } else if (quickFilter === 'month') {
      start = startOfMonth(today);
      end = endOfMonth(today);
    }

    const currentMonthStr = format(currentDate, 'yyyy-MM');

    return expenses.flatMap(e => {
      const expenseDate = parseISO(e.dueDate);
      
      if (e.classification === 'variável') {
        if (isWithinInterval(expenseDate, { start, end })) {
          return [e];
        }
        return [];
      } else {
        // Fixed expense: Logic to show in the selected range
        // We need to find all occurrences of this fixed expense within [start, end]
        const occurrences: Expense[] = [];
        let tempDate = new Date(expenseDate.getFullYear(), expenseDate.getMonth(), expenseDate.getDate());
        
        // Safety break to prevent infinite loops
        let iterations = 0;
        while (tempDate <= end && iterations < 24) {
          if (tempDate >= start) {
            const monthStr = format(tempDate, 'yyyy-MM');
            const statusByMonth = e.statusByMonth || {};
            let currentStatus = statusByMonth[monthStr];
            if (!currentStatus && e.paidMonths?.includes(monthStr)) {
              currentStatus = 'efetivado';
            }
            if (!currentStatus) currentStatus = 'neutro';

            occurrences.push({
              ...e,
              status: currentStatus as any,
              dueDate: format(tempDate, 'yyyy-MM-dd')
            });
          }
          tempDate = addMonths(tempDate, 1);
          iterations++;
        }
        return occurrences;
      }
    }).filter(e => {
      const matchesStatus = filterStatus === 'all' || e.status === filterStatus;
      const matchesType = filterType === 'all' || e.type === filterType;
      const matchesSearch = e.condominium.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesStatus && matchesType && matchesSearch;
    }).sort((a, b) => {
      if (sortBy === 'dueDate') {
        return parseISO(a.dueDate).getTime() - parseISO(b.dueDate).getTime();
      } else {
        return a.condominium.localeCompare(b.condominium);
      }
    });
  }, [expenses, filterStatus, filterType, searchTerm, currentDate, viewMode, customRange, quickFilter, sortBy]);

  const chartData = useMemo(() => {
    let lançadas = 0;
    let aVencer = 0;
    let vencidas = 0;

    filteredExpenses.forEach(e => {
      if (e.status === 'efetivado' || e.status === 'sem_fatura' || e.status === 'zerado') {
        lançadas++;
      } else {
        const date = parseISO(e.dueDate);
        if (isPast(date) && !isToday(date)) {
          vencidas++;
        } else {
          aVencer++;
        }
      }
    });

    const total = lançadas + aVencer + vencidas;
    if (total === 0) return [];

    return [
      { name: 'Lançadas', value: lançadas, percentage: ((lançadas / total) * 100).toFixed(1), color: COLORS.lançadas },
      { name: 'A Vencer', value: aVencer, percentage: ((aVencer / total) * 100).toFixed(1), color: COLORS.aVencer },
      { name: 'Vencidas', value: vencidas, percentage: ((vencidas / total) * 100).toFixed(1), color: COLORS.vencidas }
    ].filter(d => d.value > 0);
  }, [filteredExpenses]);

  const stats = useMemo(() => {
    const totalCount = filteredExpenses.length;
    const effectiveCount = filteredExpenses.filter(e => e.status === 'efetivado' || e.status === 'sem_fatura' || e.status === 'zerado').length;
    const overdueCount = filteredExpenses.filter(e => e.status === 'neutro' && isPast(parseISO(e.dueDate)) && !isToday(parseISO(e.dueDate))).length;
    const pendingCount = filteredExpenses.filter(e => e.status === 'neutro' && (!isPast(parseISO(e.dueDate)) || isToday(parseISO(e.dueDate)))).length;

    return { 
      total: totalCount, 
      effective: effectiveCount, 
      overdue: overdueCount, 
      pending: pendingCount,
      effectivePerc: totalCount ? ((effectiveCount / totalCount) * 100).toFixed(0) : 0,
      overduePerc: totalCount ? ((overdueCount / totalCount) * 100).toFixed(0) : 0,
      pendingPerc: totalCount ? ((pendingCount / totalCount) * 100).toFixed(0) : 0
    };
  }, [filteredExpenses]);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 font-sans text-zinc-900 pb-20">
      {/* Header */}
      <header className="bg-white border-b border-zinc-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-primary p-2 rounded-lg">
              <Building2 className="text-white w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-primary">CondoFinance</h1>
          </div>
          <button 
            onClick={() => setShowForm(true)}
            className="bg-primary text-white px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 hover:bg-primary-hover transition-colors shadow-lg shadow-primary/20"
          >
            <Plus className="w-4 h-4" />
            Novo Lançamento
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Period Selector Tabs */}
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm mb-8 overflow-hidden">
          <div className="flex border-b border-zinc-100">
            {(['period', 'monthly', 'annual'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => {
                  setViewMode(mode);
                  setQuickFilter('none');
                }}
                className={cn(
                  "px-6 py-4 text-sm font-bold transition-all border-b-2",
                  viewMode === mode 
                    ? "border-primary text-primary bg-primary/5" 
                    : "border-transparent text-zinc-400 hover:text-zinc-600 hover:bg-zinc-50"
                )}
              >
                {mode === 'period' ? 'Periodo' : mode === 'monthly' ? 'Mensal' : 'Anual'}
              </button>
            ))}
          </div>
          
          <div className="p-6 bg-zinc-50/50">
            {viewMode === 'monthly' && (
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <h2 className="text-2xl font-light text-zinc-500">
                    Vencimento em <span className="font-bold text-zinc-900">{format(currentDate, "MMMM 'de' yyyy", { locale: ptBR })}</span>
                  </h2>
                </div>
                <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl border border-zinc-200 shadow-sm">
                  <button onClick={prevMonth} className="flex items-center gap-2 px-4 py-2 rounded-xl hover:bg-zinc-50 text-zinc-600 transition-all font-medium text-sm">
                    <ChevronLeft className="w-4 h-4" />
                    {format(subMonths(currentDate, 1), "MMM/yy", { locale: ptBR })}
                  </button>
                  <div className="w-px h-6 bg-zinc-200 mx-1" />
                  <button onClick={nextMonth} className="flex items-center gap-2 px-4 py-2 rounded-xl hover:bg-zinc-50 text-zinc-600 transition-all font-medium text-sm">
                    {format(addMonths(currentDate, 1), "MMM/yy", { locale: ptBR })}
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {viewMode === 'annual' && (
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <h2 className="text-2xl font-light text-zinc-500">
                    Vencimentos no Ano de <span className="font-bold text-zinc-900">{format(currentDate, "yyyy")}</span>
                  </h2>
                </div>
                <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl border border-zinc-200 shadow-sm">
                  <button onClick={() => setCurrentDate(prev => subMonths(prev, 12))} className="flex items-center gap-2 px-4 py-2 rounded-xl hover:bg-zinc-50 text-zinc-600 transition-all font-medium text-sm">
                    <ChevronLeft className="w-4 h-4" />
                    {currentDate.getFullYear() - 1}
                  </button>
                  <div className="w-px h-6 bg-zinc-200 mx-1" />
                  <button onClick={() => setCurrentDate(prev => addMonths(prev, 12))} className="flex items-center gap-2 px-4 py-2 rounded-xl hover:bg-zinc-50 text-zinc-600 transition-all font-medium text-sm">
                    {currentDate.getFullYear() + 1}
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {viewMode === 'period' && (
              <div className="flex flex-col md:flex-row items-end gap-4">
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5">Data Inicial</label>
                    <input 
                      type="date" 
                      value={customRange.start}
                      onChange={(e) => setCustomRange(prev => ({ ...prev, start: e.target.value }))}
                      className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 bg-white text-sm focus:ring-2 focus:ring-primary outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5">Data Final</label>
                    <input 
                      type="date" 
                      value={customRange.end}
                      onChange={(e) => setCustomRange(prev => ({ ...prev, end: e.target.value }))}
                      className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 bg-white text-sm focus:ring-2 focus:ring-primary outline-none"
                    />
                  </div>
                </div>
                <button className="bg-primary text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-primary-hover transition-all shadow-lg shadow-primary/20">
                  Aplicar
                </button>
              </div>
            )}

            {/* Quick Filters */}
            <div className="flex flex-wrap items-center gap-3 mt-6 pt-6 border-t border-zinc-100">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest mr-2">Vencimentos Próximos:</span>
              {[
                { id: 'today', label: 'Vence hoje' },
                { id: 'week', label: 'Vence essa semana' },
                { id: 'month', label: 'Vence esse mês' }
              ].map((filter) => (
                <button
                  key={filter.id}
                  onClick={() => setQuickFilter(quickFilter === filter.id ? 'none' : filter.id as any)}
                  className={cn(
                    "px-4 py-1.5 rounded-full text-xs font-bold transition-all border",
                    quickFilter === filter.id 
                      ? "bg-primary border-primary text-white shadow-md shadow-primary/20" 
                      : "bg-white border-zinc-200 text-zinc-500 hover:border-zinc-300"
                  )}
                >
                  {filter.label}
                </button>
              ))}
              {quickFilter !== 'none' && (
                <button 
                  onClick={() => setQuickFilter('none')}
                  className="text-xs text-rose-500 font-bold hover:underline ml-2"
                >
                  Limpar Filtro
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard 
            label="Total no Mês" 
            value={`${stats.total}`} 
            icon={<TrendingUp className="w-5 h-5 text-primary" />} 
          />
          <StatCard 
            label="Lançadas (Efetivadas)" 
            value={`${stats.effectivePerc}%`} 
            subValue={`${stats.effective} itens`}
            icon={<CheckCircle2 className="w-5 h-5 text-primary" />} 
            className="border-primary/10"
          />
          <StatCard 
            label="A Vencer (Neutras)" 
            value={`${stats.pendingPerc}%`} 
            subValue={`${stats.pending} itens`}
            icon={<Circle className="w-5 h-5 text-zinc-400" />} 
          />
          <StatCard 
            label="Vencidas (Não Lançadas)" 
            value={`${stats.overduePerc}%`} 
            subValue={`${stats.overdue} itens`}
            icon={<AlertCircle className="w-5 h-5 text-rose-500" />} 
            className="border-rose-100 text-rose-600"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Chart & Filters */}
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-semibold text-lg">Resumo em {format(currentDate, "MMM/yyyy", { locale: ptBR })}</h2>
                <div className="flex items-center gap-2 bg-zinc-100 p-1 rounded-lg">
                  {(['all', 'efetivado', 'neutro'] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => setFilterStatus(s)}
                      className={cn(
                        "px-3 py-1 text-xs font-medium rounded-md transition-all",
                        filterStatus === s ? "bg-white shadow-sm text-primary font-bold" : "text-zinc-500 hover:text-zinc-700"
                      )}
                    >
                      {s === 'all' ? 'Todos' : s === 'efetivado' ? 'Lançadas' : 'Neutras'}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="h-64 w-full">
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: number, name: string, props: any) => [`${props.payload.percentage}%`, name]}
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                      />
                      <Legend verticalAlign="bottom" height={36}/>
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-zinc-400">
                    <PieChartIcon className="w-8 h-8 mb-2 opacity-20" />
                    <p className="text-sm">Sem dados para exibir</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: List */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-zinc-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h2 className="font-semibold text-lg">Lançamentos</h2>
                
                <div className="flex items-center gap-1 bg-zinc-100 p-1 rounded-xl overflow-x-auto no-scrollbar">
                  {[
                    { id: 'all', label: 'Todos', icon: Layers },
                    { id: 'água', label: 'Água', icon: Droplets },
                    { id: 'luz', label: 'Luz', icon: Zap },
                    { id: 'internet', label: 'Internet', icon: Wifi },
                    { id: 'gás', label: 'Gás', icon: Flame },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setFilterType(tab.id as any)}
                      className={cn(
                        "px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap",
                        filterType === tab.id 
                          ? "bg-white text-primary shadow-sm" 
                          : "text-zinc-500 hover:bg-zinc-200/50"
                      )}
                    >
                      <tab.icon className="w-3 h-3" />
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2 bg-zinc-100 p-1 rounded-lg">
                  <button
                    onClick={() => setSortBy('dueDate')}
                    className={cn(
                      "px-2 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1",
                      sortBy === 'dueDate' ? "bg-white shadow-sm text-primary font-bold" : "text-zinc-500 hover:text-zinc-700"
                    )}
                    title="Ordenar por Vencimento"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Vencimento</span>
                  </button>
                  <button
                    onClick={() => setSortBy('alphabetical')}
                    className={cn(
                      "px-2 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1",
                      sortBy === 'alphabetical' ? "bg-white shadow-sm text-primary font-bold" : "text-zinc-500 hover:text-zinc-700"
                    )}
                    title="Ordenar Alfabeticamente"
                  >
                    <ArrowDownAz className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">A-Z</span>
                  </button>
                </div>

                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <input 
                    type="text"
                    placeholder="Pesquisar condomínio..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                  />
                  {searchTerm && (
                    <button 
                      onClick={() => setSearchTerm('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <span className="text-xs text-zinc-400 font-medium uppercase tracking-widest">
                  {filteredExpenses.length} Itens
                </span>
              </div>
              
              <div className="divide-y divide-zinc-100">
                {filteredExpenses.length > 0 ? (
                  filteredExpenses.map((expense) => {
                    const isOverdue = expense.status === 'neutro' && isPast(parseISO(expense.dueDate)) && !isToday(parseISO(expense.dueDate));
                    return (
                      <div key={expense.id} className="p-6 hover:bg-zinc-50 transition-colors group">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-4">
                            <div className={cn(
                              "p-3 rounded-2xl",
                              expense.type === 'água' ? "bg-blue-50 text-blue-600" : 
                              expense.type === 'luz' ? "bg-yellow-50 text-yellow-600" :
                              expense.type === 'internet' ? "bg-indigo-50 text-indigo-600" :
                              "bg-orange-50 text-orange-600"
                            )}>
                              {expense.type === 'água' ? <Droplets className="w-6 h-6" /> : 
                               expense.type === 'luz' ? <Zap className="w-6 h-6" /> :
                               expense.type === 'internet' ? <Wifi className="w-6 h-6" /> :
                               <Flame className="w-6 h-6" />}
                            </div>
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-bold text-zinc-900">{expense.condominium}</h3>
                                {isOverdue && (
                                  <span className="bg-rose-100 text-rose-600 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tighter">
                                    Vencido
                                  </span>
                                )}
                                <span className={cn(
                                  "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tighter flex items-center gap-1",
                                  expense.classification === 'fixa' ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                                )}>
                                  {expense.classification === 'fixa' ? <Repeat className="w-2.5 h-2.5" /> : <Activity className="w-2.5 h-2.5" />}
                                  {expense.classification}
                                </span>
                              </div>
                              <div className="flex items-center gap-4 text-sm text-zinc-500">
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3.5 h-3.5" />
                                  {format(parseISO(expense.dueDate), "dd/MM/yy")}
                                </span>
                                <span className="capitalize">{expense.type}</span>
                                {expense.supplier && (
                                  <span className="flex items-center gap-1">
                                    <Building className="w-3.5 h-3.5" />
                                    {expense.supplier}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex flex-col items-end gap-2">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => toggleStatus(expense)}
                                className={cn(
                                  "flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all",
                                  expense.status === 'efetivado' ? "bg-primary/10 text-primary" : 
                                  expense.status === 'sem_fatura' ? "bg-indigo-100 text-indigo-700" :
                                  expense.status === 'zerado' ? "bg-orange-100 text-orange-700" :
                                  "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                                )}
                              >
                                {expense.status === 'efetivado' ? (
                                  <><CheckCircle2 className="w-3.5 h-3.5" /> Lançada</>
                                ) : expense.status === 'sem_fatura' ? (
                                  <><X className="w-3.5 h-3.5" /> Sem Fatura</>
                                ) : expense.status === 'zerado' ? (
                                  <><Droplets className="w-3.5 h-3.5" /> Zerado</>
                                ) : (
                                  <><Circle className="w-3.5 h-3.5" /> Marcar Lançada</>
                                )}
                              </button>
                                <button 
                                  onClick={() => openEdit(expense)}
                                  className="p-2 text-zinc-400 hover:text-primary hover:bg-primary/5 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                                  title="Editar"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => duplicateToBulk(expense)}
                                  className="p-2 text-zinc-400 hover:text-primary hover:bg-primary/5 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                                  title="Adicionar múltiplos deste fornecedor"
                                >
                                  <Copy className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => deleteExpense(expense.id)}
                                  className="p-2 text-zinc-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                                  title="Excluir"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-20 flex flex-col items-center justify-center text-zinc-400">
                    <div className="bg-zinc-50 p-4 rounded-full mb-4">
                      <Plus className="w-8 h-8 opacity-20" />
                    </div>
                    <p className="font-medium">Nenhum lançamento para este mês</p>
                    <p className="text-sm">Tente mudar o mês ou adicionar uma nova despesa</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Modal Overlay Form */}
      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowForm(false)}
              className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-2xl p-8 rounded-3xl shadow-2xl border border-zinc-200 overflow-y-auto max-h-[90vh]"
            >
              <button 
                onClick={closeForm}
                className="absolute top-6 right-6 p-2 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-full transition-all"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 mb-8">
                <div className="bg-primary/10 p-2.5 rounded-xl">
                  {editingExpense ? <Edit2 className="text-primary w-6 h-6" /> : <Plus className="text-primary w-6 h-6" />}
                </div>
                <div>
                  <h2 className="text-2xl font-bold tracking-tight">
                    {editingExpense ? 'Editar Lançamento' : 'Novo Lançamento'}
                  </h2>
                  <p className="text-zinc-500 text-sm">
                    {editingExpense ? 'Altere os dados da despesa' : 'Preencha os dados abaixo'}
                  </p>
                </div>
              </div>

              {!editingExpense && (
                <div className="flex gap-2 mb-6 p-1 bg-zinc-100 rounded-xl w-fit">
                  <button
                    onClick={() => setFormTab('single')}
                    className={cn(
                      "px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2",
                      formTab === 'single' ? "bg-white shadow-sm text-primary" : "text-zinc-500"
                    )}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Único
                  </button>
                  <button
                    onClick={() => setFormTab('multiple')}
                    className={cn(
                      "px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2",
                      formTab === 'multiple' ? "bg-white shadow-sm text-primary" : "text-zinc-500"
                    )}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    Múltiplos
                  </button>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                {formTab === 'single' && (
                  <>
                    <div className="relative w-full">
                      <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Condomínio</label>
                      <input 
                        required
                        type="text" 
                        value={formData.condominium}
                        onChange={e => {
                          setFormData({...formData, condominium: e.target.value});
                          setActiveSuggestionIdx({ type: 'single', field: 'condo' });
                        }}
                        onFocus={() => setActiveSuggestionIdx({ type: 'single', field: 'condo' })}
                        className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all bg-zinc-50/50"
                        placeholder="Ex: Edifício Solar"
                      />
                      {activeSuggestionIdx?.type === 'single' && activeSuggestionIdx?.field === 'condo' && getCondoSuggestions(formData.condominium).length > 0 && (
                        <div 
                          ref={suggestionRef}
                          className="absolute z-20 w-full mt-1 bg-white border border-zinc-200 rounded-xl shadow-xl overflow-hidden max-h-48 overflow-y-auto"
                        >
                          {getCondoSuggestions(formData.condominium).map((suggestion, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => {
                                setFormData({...formData, condominium: suggestion});
                                setActiveSuggestionIdx(null);
                              }}
                              className="w-full px-4 py-3 text-left text-sm hover:bg-zinc-50 transition-colors border-b border-zinc-100 last:border-0"
                            >
                              {suggestion}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="relative w-full">
                      <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Fornecedor</label>
                      <input 
                        type="text" 
                        value={formData.supplier}
                        onChange={e => {
                          setFormData({...formData, supplier: e.target.value});
                          setActiveSuggestionIdx({ type: 'single', field: 'supplier' });
                        }}
                        onFocus={() => setActiveSuggestionIdx({ type: 'single', field: 'supplier' })}
                        className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all bg-zinc-50/50"
                        placeholder="Ex: Sabesp, Enel, Vivo..."
                      />
                      {activeSuggestionIdx?.type === 'single' && activeSuggestionIdx?.field === 'supplier' && getSupplierSuggestions(formData.supplier).length > 0 && (
                        <div 
                          ref={suggestionRef}
                          className="absolute z-20 w-full mt-1 bg-white border border-zinc-200 rounded-xl shadow-xl overflow-hidden max-h-48 overflow-y-auto"
                        >
                          {getSupplierSuggestions(formData.supplier).map((suggestion, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => {
                                setFormData({...formData, supplier: suggestion});
                                setActiveSuggestionIdx(null);
                              }}
                              className="w-full px-4 py-3 text-left text-sm hover:bg-zinc-50 transition-colors border-b border-zinc-100 last:border-0"
                            >
                              {suggestion}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}
                
                {formTab === 'single' ? (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Tipo</label>
                        <select 
                          value={formData.type}
                          onChange={e => setFormData({...formData, type: e.target.value as any})}
                          className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-primary outline-none bg-zinc-50/50 appearance-none"
                        >
                          <option value="água">Água</option>
                          <option value="luz">Luz</option>
                          <option value="internet">Internet</option>
                          <option value="gás">Gás</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Vencimento</label>
                        <input 
                          required
                          type="date" 
                          value={formData.dueDate}
                          onChange={e => setFormData({...formData, dueDate: e.target.value})}
                          className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-primary outline-none bg-zinc-50/50"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Classificação</label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setFormData({...formData, classification: 'fixa'})}
                          className={cn(
                            "px-4 py-3 rounded-xl border text-sm font-medium transition-all flex items-center justify-center gap-2",
                            formData.classification === 'fixa' 
                              ? "border-emerald-500 bg-emerald-50 text-emerald-700" 
                              : "border-zinc-200 text-zinc-500 hover:border-zinc-300"
                          )}
                        >
                          <Repeat className="w-4 h-4" />
                          Fixa
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormData({...formData, classification: 'variável'})}
                          className={cn(
                            "px-4 py-3 rounded-xl border text-sm font-medium transition-all flex items-center justify-center gap-2",
                            formData.classification === 'variável' 
                              ? "border-amber-500 bg-amber-50 text-amber-700" 
                              : "border-zinc-200 text-zinc-500 hover:border-zinc-300"
                          )}
                        >
                          <Activity className="w-4 h-4" />
                          Variável
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Status Inicial</label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setFormData({...formData, status: 'neutro'})}
                          className={cn(
                            "px-4 py-3 rounded-xl border text-sm font-medium transition-all",
                            formData.status === 'neutro' 
                              ? "border-primary bg-primary/5 text-primary" 
                              : "border-zinc-200 text-zinc-500 hover:border-zinc-300"
                          )}
                        >
                          Pendente
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormData({...formData, status: 'efetivado'})}
                          className={cn(
                            "px-4 py-3 rounded-xl border text-sm font-medium transition-all",
                            formData.status === 'efetivado' 
                              ? "border-primary bg-primary/5 text-primary" 
                              : "border-zinc-200 text-zinc-500 hover:border-zinc-300"
                          )}
                        >
                          Lançada
                        </button>
                        {formData.type === 'internet' && (
                          <button
                            type="button"
                            onClick={() => setFormData({...formData, status: 'sem_fatura'})}
                            className={cn(
                              "px-4 py-3 rounded-xl border text-sm font-medium transition-all col-span-2",
                              formData.status === 'sem_fatura' 
                                ? "border-indigo-500 bg-indigo-50 text-indigo-700" 
                                : "border-zinc-200 text-zinc-500 hover:border-zinc-300"
                            )}
                          >
                            Sem Fatura
                          </button>
                        )}
                        {formData.type === 'gás' && (
                          <button
                            type="button"
                            onClick={() => setFormData({...formData, status: 'zerado'})}
                            className={cn(
                              "px-4 py-3 rounded-xl border text-sm font-medium transition-all col-span-2",
                              formData.status === 'zerado' 
                                ? "border-orange-500 bg-orange-50 text-orange-700" 
                                : "border-zinc-200 text-zinc-500 hover:border-zinc-300"
                            )}
                          >
                            Zerado
                          </button>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Descrição (Opcional)</label>
                      <textarea 
                        value={formData.description}
                        onChange={e => setFormData({...formData, description: e.target.value})}
                        className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-primary outline-none bg-zinc-50/50 resize-none h-20"
                        placeholder="Ex: Referente ao mês de Janeiro"
                      />
                    </div>
                  </>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest">Lista de Despesas</label>
                      <button 
                        type="button"
                        onClick={() => setBulkExpenses([...bulkExpenses, {
                          condominium: '',
                          type: 'água',
                          amount: '',
                          dueDate: format(new Date(), 'yyyy-MM-dd'),
                          status: 'neutro',
                          classification: 'fixa',
                          description: ''
                        }])}
                        className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" /> Adicionar Outra
                      </button>
                    </div>
                    
                    {bulkExpenses.map((be, idx) => (
                      <div key={idx} className="p-4 bg-zinc-50 rounded-2xl border border-zinc-200 relative group/bulk">
                        <div className="relative mb-4">
                          <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Condomínio</label>
                          <input 
                            required
                            type="text" 
                            value={be.condominium}
                            onChange={e => {
                              const newBulk = [...bulkExpenses];
                              newBulk[idx].condominium = e.target.value;
                              setBulkExpenses(newBulk);
                              setActiveSuggestionIdx({ type: 'bulk', field: 'condo', index: idx });
                            }}
                            onFocus={() => setActiveSuggestionIdx({ type: 'bulk', field: 'condo', index: idx })}
                            className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm outline-none bg-white"
                            placeholder="Nome do condomínio"
                          />
                          {activeSuggestionIdx?.type === 'bulk' && activeSuggestionIdx.field === 'condo' && activeSuggestionIdx.index === idx && getCondoSuggestions(be.condominium).length > 0 && (
                            <div 
                              ref={suggestionRef}
                              className="absolute z-20 w-full mt-1 bg-white border border-zinc-200 rounded-xl shadow-xl overflow-hidden max-h-40 overflow-y-auto"
                            >
                              {getCondoSuggestions(be.condominium).map((suggestion, i) => (
                                <button
                                  key={i}
                                  type="button"
                                  onClick={() => {
                                    const newBulk = [...bulkExpenses];
                                    newBulk[idx].condominium = suggestion;
                                    setBulkExpenses(newBulk);
                                    setActiveSuggestionIdx(null);
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm hover:bg-zinc-50 transition-colors border-b border-zinc-100 last:border-0"
                                >
                                  {suggestion}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="relative mb-4">
                          <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Fornecedor</label>
                          <input 
                            type="text" 
                            value={be.supplier}
                            onChange={e => {
                              const newBulk = [...bulkExpenses];
                              newBulk[idx].supplier = e.target.value;
                              setBulkExpenses(newBulk);
                              setActiveSuggestionIdx({ type: 'bulk', field: 'supplier', index: idx });
                            }}
                            onFocus={() => setActiveSuggestionIdx({ type: 'bulk', field: 'supplier', index: idx })}
                            className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm outline-none bg-white"
                            placeholder="Nome do fornecedor"
                          />
                          {activeSuggestionIdx?.type === 'bulk' && activeSuggestionIdx.field === 'supplier' && activeSuggestionIdx.index === idx && getSupplierSuggestions(be.supplier).length > 0 && (
                            <div 
                              ref={suggestionRef}
                              className="absolute z-20 w-full mt-1 bg-white border border-zinc-200 rounded-xl shadow-xl overflow-hidden max-h-40 overflow-y-auto"
                            >
                              {getSupplierSuggestions(be.supplier).map((suggestion, i) => (
                                <button
                                  key={i}
                                  type="button"
                                  onClick={() => {
                                    const newBulk = [...bulkExpenses];
                                    newBulk[idx].supplier = suggestion;
                                    setBulkExpenses(newBulk);
                                    setActiveSuggestionIdx(null);
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm hover:bg-zinc-50 transition-colors border-b border-zinc-100 last:border-0"
                                >
                                  {suggestion}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div>
                            <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Tipo</label>
                            <select 
                              value={be.type}
                              onChange={e => {
                                const newBulk = [...bulkExpenses];
                                newBulk[idx].type = e.target.value as any;
                                setBulkExpenses(newBulk);
                              }}
                              className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm outline-none"
                            >
                              <option value="água">Água</option>
                              <option value="luz">Luz</option>
                              <option value="internet">Internet</option>
                              <option value="gás">Gás</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Vencimento</label>
                            <input 
                              type="date" 
                              value={be.dueDate}
                              onChange={e => {
                                const newBulk = [...bulkExpenses];
                                newBulk[idx].dueDate = e.target.value;
                                setBulkExpenses(newBulk);
                              }}
                              className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm outline-none"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div className="flex-1 flex gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                const newBulk = [...bulkExpenses];
                                newBulk[idx].classification = newBulk[idx].classification === 'fixa' ? 'variável' : 'fixa';
                                setBulkExpenses(newBulk);
                              }}
                              className={cn(
                                "flex-1 py-1.5 rounded-lg border text-[10px] font-bold uppercase transition-all",
                                be.classification === 'fixa' ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-amber-500 bg-amber-50 text-amber-700"
                              )}
                            >
                              {be.classification}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const newBulk = [...bulkExpenses];
                                const getNextStatus = (current: Expense['status'], type: Expense['type']): Expense['status'] => {
                                  if (current === 'neutro') return 'efetivado';
                                  if (current === 'efetivado') {
                                    if (type === 'internet') return 'sem_fatura';
                                    if (type === 'gás') return 'zerado';
                                    return 'neutro';
                                  }
                                  return 'neutro';
                                };
                                newBulk[idx].status = getNextStatus(newBulk[idx].status, newBulk[idx].type);
                                setBulkExpenses(newBulk);
                              }}
                              className={cn(
                                "flex-1 py-1.5 rounded-lg border text-[10px] font-bold uppercase transition-all",
                                be.status === 'efetivado' ? "border-primary bg-primary/5 text-primary" : 
                                be.status === 'sem_fatura' ? "border-indigo-500 bg-indigo-50 text-indigo-700" :
                                be.status === 'zerado' ? "border-orange-500 bg-orange-50 text-orange-700" :
                                "border-zinc-200 text-zinc-500"
                              )}
                            >
                              {be.status === 'efetivado' ? 'Lançada' : 
                               be.status === 'sem_fatura' ? 'Sem Fatura' :
                               be.status === 'zerado' ? 'Zerado' :
                               'Pendente'}
                            </button>
                          </div>
                          <div className="flex items-center gap-2">
                            <input 
                              type="text" 
                              value={be.description}
                              onChange={e => {
                                const newBulk = [...bulkExpenses];
                                newBulk[idx].description = e.target.value;
                                setBulkExpenses(newBulk);
                              }}
                              className="flex-1 px-3 py-1.5 rounded-lg border border-zinc-200 text-[10px] outline-none bg-white"
                              placeholder="Descrição (opcional)"
                            />
                            {bulkExpenses.length > 1 && (
                              <button 
                                type="button"
                                onClick={() => setBulkExpenses(bulkExpenses.filter((_, i) => i !== idx))}
                                className="p-2 text-zinc-400 hover:text-rose-500 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <button 
                  type="submit"
                  className="w-full bg-primary text-white py-4 rounded-2xl font-bold hover:bg-primary-hover transition-all shadow-xl shadow-primary/30 mt-4 active:scale-[0.98]"
                >
                  {editingExpense ? 'Salvar Alterações' : 'Salvar Lançamento(s)'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatCard({ label, value, subValue, icon, className }: { label: string, value: string, subValue?: string, icon: React.ReactNode, className?: string }) {
  return (
    <div className={cn("bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm", className)}>
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">{label}</span>
        {icon}
      </div>
      <div className="flex items-baseline gap-2">
        <div className="text-3xl font-black tracking-tighter">
          {value}
        </div>
        {subValue && (
          <span className="text-xs font-medium text-zinc-400">{subValue}</span>
        )}
      </div>
    </div>
  );
}
