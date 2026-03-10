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
  Search
} from 'lucide-react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip, 
  Legend 
} from 'recharts';
import { format, isPast, parseISO, isToday } from 'date-fns';
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
  type: 'água' | 'luz';
  amount: number;
  dueDate: string;
  status: 'efetivado' | 'neutro';
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
  const [filterStatus, setFilterStatus] = useState<'all' | 'efetivado' | 'neutro'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    condominium: '',
    type: 'água' as 'água' | 'luz',
    dueDate: format(new Date(), 'yyyy-MM-dd'),
    status: 'neutro' as 'efetivado' | 'neutro',
    description: ''
  });

  useEffect(() => {
    const saved = localStorage.getItem('condofinance_expenses');
    if (saved) {
      try {
        setExpenses(JSON.parse(saved));
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
    const newExpense: Expense = {
      ...formData,
      id: Date.now(),
      amount: 0
    };
    const updatedExpenses = [newExpense, ...expenses];
    saveToLocalStorage(updatedExpenses);
    setShowForm(false);
    setFormData({
      condominium: '',
      type: 'água',
      dueDate: format(new Date(), 'yyyy-MM-dd'),
      status: 'neutro',
      description: ''
    });
  };

  const toggleStatus = async (expense: Expense) => {
    const updatedExpenses = expenses.map(e => 
      e.id === expense.id 
        ? { ...e, status: e.status === 'efetivado' ? 'neutro' : 'efetivado' } as Expense
        : e
    );
    saveToLocalStorage(updatedExpenses);
  };

  const deleteExpense = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir este lançamento?')) return;
    const updatedExpenses = expenses.filter(e => e.id !== id);
    saveToLocalStorage(updatedExpenses);
  };

  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => {
      const matchesStatus = filterStatus === 'all' || e.status === filterStatus;
      const matchesSearch = e.condominium.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [expenses, filterStatus, searchTerm]);

  const chartData = useMemo(() => {
    let lançadas = 0;
    let aVencer = 0;
    let vencidas = 0;

    expenses.forEach(e => {
      if (e.status === 'efetivado') {
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
  }, [expenses]);

  const stats = useMemo(() => {
    const totalCount = expenses.length;
    const effectiveCount = expenses.filter(e => e.status === 'efetivado').length;
    const overdueCount = expenses.filter(e => e.status === 'neutro' && isPast(parseISO(e.dueDate)) && !isToday(parseISO(e.dueDate))).length;
    const pendingCount = expenses.filter(e => e.status === 'neutro' && (!isPast(parseISO(e.dueDate)) || isToday(parseISO(e.dueDate)))).length;

    return { 
      total: totalCount, 
      effective: effectiveCount, 
      overdue: overdueCount, 
      pending: pendingCount,
      effectivePerc: totalCount ? ((effectiveCount / totalCount) * 100).toFixed(0) : 0,
      overduePerc: totalCount ? ((overdueCount / totalCount) * 100).toFixed(0) : 0,
      pendingPerc: totalCount ? ((pendingCount / totalCount) * 100).toFixed(0) : 0
    };
  }, [expenses]);

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
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard 
            label="Total de Lançamentos" 
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
                <h2 className="font-semibold text-lg">Visão Geral (%)</h2>
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
                              expense.type === 'água' ? "bg-blue-50 text-blue-600" : "bg-yellow-50 text-yellow-600"
                            )}>
                              {expense.type === 'água' ? <Droplets className="w-6 h-6" /> : <Zap className="w-6 h-6" />}
                            </div>
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-bold text-zinc-900">{expense.condominium}</h3>
                                {isOverdue && (
                                  <span className="bg-rose-100 text-rose-600 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tighter">
                                    Vencido
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-4 text-sm text-zinc-500">
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3.5 h-3.5" />
                                  {format(parseISO(expense.dueDate), "dd 'de' MMMM", { locale: ptBR })}
                                </span>
                                <span className="capitalize">{expense.type}</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex flex-col items-end gap-2">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => toggleStatus(expense)}
                                className={cn(
                                  "flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all",
                                  expense.status === 'efetivado' 
                                    ? "bg-primary/10 text-primary" 
                                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                                )}
                              >
                                {expense.status === 'efetivado' ? (
                                  <><CheckCircle2 className="w-3.5 h-3.5" /> Lançada</>
                                ) : (
                                  <><Circle className="w-3.5 h-3.5" /> Marcar Lançada</>
                                )}
                              </button>
                              <button 
                                onClick={() => deleteExpense(expense.id)}
                                className="p-2 text-zinc-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
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
                    <p className="font-medium">Nenhum lançamento encontrado</p>
                    <p className="text-sm">Comece adicionando uma nova despesa</p>
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
              className="relative bg-white w-full max-w-md p-8 rounded-3xl shadow-2xl border border-zinc-200"
            >
              <button 
                onClick={() => setShowForm(false)}
                className="absolute top-6 right-6 p-2 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-full transition-all"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 mb-8">
                <div className="bg-primary/10 p-2.5 rounded-xl">
                  <Plus className="text-primary w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold tracking-tight">Novo Lançamento</h2>
                  <p className="text-zinc-500 text-sm">Preencha os dados abaixo</p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Condomínio</label>
                  <input 
                    required
                    type="text" 
                    value={formData.condominium}
                    onChange={e => setFormData({...formData, condominium: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all bg-zinc-50/50"
                    placeholder="Ex: Edifício Solar"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Tipo</label>
                    <select 
                      value={formData.type}
                      onChange={e => setFormData({...formData, type: e.target.value as 'água' | 'luz'})}
                      className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-primary outline-none bg-zinc-50/50 appearance-none"
                    >
                      <option value="água">Água</option>
                      <option value="luz">Luz</option>
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
                  </div>
                </div>

                <button 
                  type="submit"
                  className="w-full bg-primary text-white py-4 rounded-2xl font-bold hover:bg-primary-hover transition-all shadow-xl shadow-primary/30 mt-4 active:scale-[0.98]"
                >
                  Salvar Lançamento
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
