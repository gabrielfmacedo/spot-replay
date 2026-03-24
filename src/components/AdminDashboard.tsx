
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, Activity, Database, TrendingUp, Clock, ShieldCheck, 
  Image as ImageIcon, Bell, MessageSquare, Plus, Trash2, Save, 
  CheckCircle2, AlertTriangle, Info
} from 'lucide-react';
import { getSupabase } from '../services/supabase';

interface SystemMetrics {
  totalUsers: number;
  onlineUsers: number;
  totalHandsImported: number;
  recentEvents: any[];
}

interface Banner {
  id: string;
  title: string;
  image_url: string;
  link_url: string;
  is_active: boolean;
  position: string;
}

interface GlobalNotification {
  id: string;
  title: string;
  content: string;
  type: string;
  is_active: boolean;
}

const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'metrics' | 'banners' | 'notifications'>('metrics');
  const [metrics, setMetrics] = useState<SystemMetrics>({
    totalUsers: 0,
    onlineUsers: 0,
    totalHandsImported: 0,
    recentEvents: []
  });
  const [banners, setBanners] = useState<Banner[]>([]);
  const [notifications, setNotifications] = useState<GlobalNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const supabase = getSupabase();
      if (!supabase) return;

      try {
        if (activeTab === 'metrics') {
          // Metrics logic
          const { count: userCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
          const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
          const { count: onlineCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).gt('last_seen', fiveMinutesAgo);
          const { data: events } = await supabase.from('system_events').select('metadata').eq('event_type', 'hand_import');
          const totalHands = events?.reduce((acc, curr) => acc + (curr.metadata?.count || 0), 0) || 0;
          const { data: recent } = await supabase.from('system_events').select('*, profiles(email)').order('created_at', { ascending: false }).limit(10);

          setMetrics({
            totalUsers: userCount || 0,
            onlineUsers: onlineCount || 0,
            totalHandsImported: totalHands,
            recentEvents: recent || []
          });
        } else if (activeTab === 'banners') {
          const { data } = await supabase.from('banners').select('*').order('created_at', { ascending: false });
          setBanners(data || []);
        } else if (activeTab === 'notifications') {
          const { data } = await supabase.from('global_notifications').select('*').order('created_at', { ascending: false });
          setNotifications(data || []);
        }
      } catch (error) {
        console.error('Error fetching admin data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [activeTab]);

  const handleAddBanner = async () => {
    const supabase = getSupabase();
    if (!supabase) return;
    setSaving(true);
    try {
      const { data, error } = await supabase.from('banners').insert({
        title: 'Novo Banner',
        image_url: 'https://picsum.photos/seed/poker/800/400',
        link_url: '#',
        is_active: true,
        position: 'sidebar'
      }).select();
      if (error) throw error;
      setBanners([data[0], ...banners]);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleAddNotification = async () => {
    const supabase = getSupabase();
    if (!supabase) return;
    setSaving(true);
    try {
      const { data, error } = await supabase.from('global_notifications').insert({
        title: 'Nova Notificação',
        content: 'Conteúdo da mensagem aqui...',
        type: 'info',
        is_active: true
      }).select();
      if (error) throw error;
      setNotifications([data[0], ...notifications]);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (table: string, id: string) => {
    const supabase = getSupabase();
    if (!supabase) return;
    if (!confirm('Tem certeza?')) return;
    try {
      await supabase.from(table).delete().eq('id', id);
      if (table === 'banners') setBanners(banners.filter(b => b.id !== id));
      else setNotifications(notifications.filter(n => n.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#02040a]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Carregando Dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar p-8 bg-[#02040a]">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h2 className="text-3xl font-black italic tracking-tighter text-white uppercase">Admin <span className="text-blue-500">Dashboard</span></h2>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">Gestão e Métricas do SPOT REPLAY</p>
          </div>
          
          <div className="flex bg-white/5 p-1 rounded-2xl border border-white/5">
            {[
              { id: 'metrics', label: 'Métricas', icon: <TrendingUp size={14} /> },
              { id: 'banners', label: 'Banners', icon: <ImageIcon size={14} /> },
              { id: 'notifications', label: 'Notificações', icon: <Bell size={14} /> }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  activeTab === tab.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-500 hover:text-white'
                }`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'metrics' && (
            <motion.div 
              key="metrics"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard icon={<Users className="text-blue-400" />} label="Usuários Cadastrados" value={metrics.totalUsers} subValue={`${metrics.onlineUsers} Online agora`} color="blue" />
                <StatCard icon={<Database className="text-purple-400" />} label="Mãos Processadas" value={metrics.totalHandsImported.toLocaleString()} subValue="Total Global" color="purple" />
                <StatCard icon={<Activity className="text-emerald-400" />} label="Atividade Recente" value={metrics.recentEvents.length} subValue="Eventos nas últimas 24h" color="emerald" />
              </div>

              {/* Recent Activity Table */}
              <div className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] overflow-hidden backdrop-blur-3xl shadow-2xl">
                <div className="p-6 border-b border-white/5 bg-white/[0.01] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Clock size={18} className="text-slate-500" />
                    <span className="text-xs font-black uppercase tracking-widest text-white">Log de Atividades Recentes</span>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-white/5">
                        <th className="px-8 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Evento</th>
                        <th className="px-8 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Usuário</th>
                        <th className="px-8 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Detalhes</th>
                        <th className="px-8 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Data/Hora</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {metrics.recentEvents.map((event) => (
                        <tr key={event.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="px-8 py-4">
                            <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                              event.event_type === 'hand_import' ? 'bg-blue-500/10 text-blue-400' : 'bg-slate-500/10 text-slate-400'
                            }`}>
                              {event.event_type}
                            </span>
                          </td>
                          <td className="px-8 py-4 text-xs font-bold text-slate-300">{event.profiles?.email || 'Sistema'}</td>
                          <td className="px-8 py-4 text-xs font-mono text-slate-500">{event.metadata?.count ? `${event.metadata.count} mãos` : '-'}</td>
                          <td className="px-8 py-4 text-[10px] font-bold text-slate-500 uppercase">{new Date(event.created_at).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'banners' && (
            <motion.div 
              key="banners"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-black italic text-white uppercase">Gestão de Banners</h3>
                <button 
                  onClick={handleAddBanner}
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white transition-all shadow-lg shadow-blue-600/20"
                >
                  <Plus size={16} /> Adicionar Banner
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {banners.map(banner => (
                  <div key={banner.id} className="bg-white/[0.02] border border-white/5 rounded-[2rem] p-6 space-y-4 backdrop-blur-3xl">
                    <div className="aspect-video w-full rounded-xl overflow-hidden bg-black/40 border border-white/5 relative group">
                      <img src={banner.image_url} alt={banner.title} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
                      <div className="absolute top-4 right-4 flex gap-2">
                        <button onClick={() => handleDelete('banners', banner.id)} className="p-2 bg-red-500/20 hover:bg-red-500 text-red-500 hover:text-white rounded-lg transition-all">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <input 
                        type="text" 
                        defaultValue={banner.title} 
                        className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-2 text-xs text-white outline-none focus:border-blue-500/50"
                        placeholder="Título do Banner"
                      />
                      <input 
                        type="text" 
                        defaultValue={banner.image_url} 
                        className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-2 text-[10px] font-mono text-slate-500 outline-none focus:border-blue-500/50"
                        placeholder="URL da Imagem"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'notifications' && (
            <motion.div 
              key="notifications"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-black italic text-white uppercase">Mensagens e Notificações</h3>
                <button 
                  onClick={handleAddNotification}
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white transition-all shadow-lg shadow-emerald-600/20"
                >
                  <Plus size={16} /> Nova Notificação
                </button>
              </div>

              <div className="space-y-4">
                {notifications.map(notif => (
                  <div key={notif.id} className="bg-white/[0.02] border border-white/5 rounded-3xl p-6 flex items-start justify-between gap-6 backdrop-blur-3xl">
                    <div className="flex items-start gap-4 flex-1">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        notif.type === 'alert' ? 'bg-red-500/10 text-red-500' : 'bg-blue-500/10 text-blue-500'
                      }`}>
                        {notif.type === 'alert' ? <AlertTriangle size={20} /> : <Info size={20} />}
                      </div>
                      <div className="space-y-2 flex-1">
                        <input 
                          type="text" 
                          defaultValue={notif.title} 
                          className="w-full bg-transparent border-none p-0 text-sm font-black text-white outline-none placeholder:text-slate-700"
                          placeholder="Título da Mensagem"
                        />
                        <textarea 
                          defaultValue={notif.content} 
                          className="w-full bg-transparent border-none p-0 text-xs text-slate-500 outline-none resize-none placeholder:text-slate-800"
                          rows={2}
                          placeholder="Conteúdo da notificação..."
                        />
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <button onClick={() => handleDelete('global_notifications', notif.id)} className="p-3 bg-white/5 hover:bg-red-500/20 text-slate-500 hover:text-red-500 rounded-xl transition-all">
                        <Trash2 size={16} />
                      </button>
                      <button className="p-3 bg-blue-600/10 text-blue-500 rounded-xl hover:bg-blue-600 hover:text-white transition-all">
                        <Save size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

const StatCard: React.FC<{ icon: React.ReactNode, label: string, value: string | number, subValue: string, color: string }> = ({ icon, label, value, subValue, color }) => (
  <motion.div 
    whileHover={{ y: -5 }}
    className="bg-white/[0.02] border border-white/5 p-8 rounded-[2.5rem] backdrop-blur-3xl relative overflow-hidden group shadow-2xl"
  >
    <div className={`absolute top-0 right-0 w-32 h-32 bg-${color}-500/5 blur-[60px] rounded-full -mr-16 -mt-16 group-hover:bg-${color}-500/10 transition-all`} />
    <div className="flex flex-col gap-4 relative z-10">
      <div className={`w-12 h-12 rounded-2xl bg-${color}-500/10 flex items-center justify-center border border-${color}-500/20`}>
        {icon}
      </div>
      <div>
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{label}</p>
        <h3 className="text-4xl font-black text-white tracking-tighter">{value}</h3>
        <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mt-2">{subValue}</p>
      </div>
    </div>
  </motion.div>
);

export default AdminDashboard;
