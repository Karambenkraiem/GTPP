import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { dashboardApi } from '../lib/api';
import StatCard from '../components/StatCard';
import PageHeader from '../components/PageHeader';
import { Activity, AlertTriangle, Wrench, Zap, Thermometer, Gauge } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { STATUT_JOURNEE_LABELS } from '../types';
import { formatTunisHM } from '../lib/tz';

export default function Dashboard() {
  const { data, isLoading } = useQuery({ queryKey: ['dashboard'], queryFn: dashboardApi.get, refetchInterval: 60000 });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  const journee = data?.journeeAujourdhui;
  const dernierReleve = data?.dernierReleve;
  const puissance = dernierReleve?.generateur?.puissance_active_mw;
  const frequence = dernierReleve?.generateur?.frequence_hz;
  const ttxm = dernierReleve?.echappement?.ttxm_moyenne;
  const spread = dernierReleve?.echappement?.spread_calcule;
  const vibraMaxi = dernierReleve?.vibrations?.vibration_maxi;

  const chartData = (data?.derniers7Jours || []).map((j: any) => ({
    date: format(new Date(j.jour), 'dd/MM', { locale: fr }),
    production: j.compteurs
      ? ((j.compteurs.energie_active_24h || 0) - (j.compteurs.energie_active_00h || 0)).toFixed(0)
      : 0,
  }));

  return (
    <div>
      <PageHeader
        title="Tableau de Bord"
        subtitle={`${format(new Date(), "EEEE d MMMM yyyy", { locale: fr })} — Journée ${journee ? STATUT_JOURNEE_LABELS[journee.statut as keyof typeof STATUT_JOURNEE_LABELS] : 'non créée'}`}
      />

      <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
        {/* Mesures temps réel */}
        <div>
          <h2 className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">Mesures temps réel</h2>
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
            <StatCard label="Puissance Active" value={puissance ?? '—'} unit="MW" icon={<Zap size={20} />} color={puissance ? 'amber' : 'slate'} />
            <StatCard label="Fréquence" value={frequence ?? '—'} unit="Hz" icon={<Activity size={20} />} color={frequence ? 'green' : 'slate'} />
            <StatCard label="Temp. Échappement" value={ttxm ?? '—'} unit="°C" icon={<Thermometer size={20} />} color={ttxm ? 'amber' : 'slate'} />
            <StatCard label="Spread" value={spread ?? '—'} unit="°C" color={spread && spread > 40 ? 'red' : 'green'} sub={spread && spread > 40 ? '⚠ Seuil dépassé' : 'Normal'} />
            <StatCard label="Vibration Maxi" value={vibraMaxi ?? '—'} unit="mm/s" icon={<Gauge size={20} />} color={vibraMaxi && vibraMaxi > 20 ? 'red' : 'green'} />
            <StatCard label="Dernier Relevé" value={dernierReleve ? formatTunisHM(dernierReleve.heure_releve) : '—'} color="slate" sub={dernierReleve ? format(new Date(dernierReleve.heure_releve), 'dd/MM/yyyy') : 'Aucun'} />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Alertes */}
          <div className="bg-slate-900 border border-slate-700 rounded-lg p-4">
            <h2 className="text-sm font-medium text-white mb-3">État des alertes</h2>
            <div className="space-y-2">
              <Link to="/defauts" className="flex items-center justify-between py-2 border-b border-slate-800 -mx-2 px-2 rounded hover:bg-slate-800/50 transition-colors">
                <div className="flex items-center gap-2 text-sm text-slate-300">
                  <AlertTriangle size={14} className="text-red-400" />
                  Matériels défectueux actifs
                </div>
                <span className={`text-sm font-bold ${data?.defautsActifs > 0 ? 'text-red-400' : 'text-green-400'}`}>
                  {data?.defautsActifs ?? 0}
                </span>
              </Link>
              <Link to="/ordres-travaux" className="flex items-center justify-between py-2 border-b border-slate-800 -mx-2 px-2 rounded hover:bg-slate-800/50 transition-colors">
                <div className="flex items-center gap-2 text-sm text-slate-300">
                  <Wrench size={14} className="text-amber-400" />
                  OT en cours
                </div>
                <span className="text-sm font-bold text-amber-400">{data?.otsEnCours ?? 0}</span>
              </Link>
              <Link to="/releves-jour" className="flex items-center justify-between py-2 -mx-2 px-2 rounded hover:bg-slate-800/50 transition-colors">
                <div className="flex items-center gap-2 text-sm text-slate-300">
                  <Activity size={14} className="text-blue-400" />
                  Relevés aujourd'hui
                </div>
                <span className="text-sm font-bold text-blue-400">{journee?._count?.releves_bloc ?? 0}</span>
              </Link>
            </div>
          </div>

          {/* Postes du jour */}
          <div className="bg-slate-900 border border-slate-700 rounded-lg p-4">
            <h2 className="text-sm font-medium text-white mb-3">Postes du jour</h2>
            {journee?.postes?.length > 0 ? (
              <div className="space-y-2">
                {journee.postes.map((poste: any) => (
                  <div key={poste.id} className="flex items-center justify-between text-xs py-1.5 border-b border-slate-800 last:border-0">
                    <span className="text-slate-400">{poste.tranche.replace('h', 'h ').replace('_', '— ')}</span>
                    <span className="text-slate-300">{poste.chefQuart ? `${poste.chefQuart.prenom} ${poste.chefQuart.nom}` : '—'}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-500 text-sm">Aucun poste configuré</p>
            )}
          </div>

          {/* Activité journée */}
          <div className="bg-slate-900 border border-slate-700 rounded-lg p-4">
            <h2 className="text-sm font-medium text-white mb-3">Activité aujourd'hui</h2>
            <div className="space-y-2">
              {[
                { label: 'Manœuvres', value: journee?._count?.manouvres ?? 0, to: '/manouvres' },
                { label: 'Alarmes', value: journee?._count?.alarmes ?? 0, to: '/alarmes' },
                { label: 'OT', value: journee?._count?.ordres_travaux ?? 0, to: '/ordres-travaux' },
              ].map(({ label, value, to }) => (
                <Link key={label} to={to} className="flex items-center justify-between py-2 border-b border-slate-800 last:border-0 -mx-2 px-2 rounded hover:bg-slate-800/50 transition-colors">
                  <span className="text-sm text-slate-300">{label}</span>
                  <span className="text-sm font-bold text-slate-100">{value}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Graphique production 7 jours */}
        {chartData.length > 0 && (
          <div className="bg-slate-900 border border-slate-700 rounded-lg p-4">
            <h2 className="text-sm font-medium text-white mb-4">Production 7 derniers jours (MWh)</h2>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
                  labelStyle={{ color: '#f1f5f9' }}
                  itemStyle={{ color: '#f59e0b' }}
                />
                <Line type="monotone" dataKey="production" stroke="#f59e0b" strokeWidth={2} dot={{ fill: '#f59e0b', r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
