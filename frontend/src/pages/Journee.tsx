import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { journeesApi, postesApi, usersApi } from '../lib/api';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import { Plus, CheckCircle, ChevronDown, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { STATUT_JOURNEE_LABELS, TRANCHE_LABELS } from '../types';
import type { TrancheHoraire } from '../types';
import { useAuth } from '../contexts/AuthContext';

const TRANCHES: TrancheHoraire[] = ['h00_07h', 'h07_14h', 'h14_20h', 'h20_00h'];

const TRANCHE_TIMES: Record<TrancheHoraire, { debut: string; fin: string }> = {
  h00_07h: { debut: '00:00', fin: '07:00' },
  h07_14h: { debut: '07:00', fin: '14:00' },
  h14_20h: { debut: '14:00', fin: '20:00' },
  h20_00h: { debut: '20:00', fin: '00:00' },
};

export default function Journee() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [showPosteModal, setShowPosteModal] = useState(false);
  const [posteForm, setPosteForm] = useState<any>({ tranche: 'h07_14h' });

  const { data: journees } = useQuery({ queryKey: ['journees'], queryFn: () => journeesApi.list({ from: format(new Date(Date.now() - 30 * 86400000), 'yyyy-MM-dd') }) });
  const { data: users } = useQuery({ queryKey: ['users'], queryFn: usersApi.list });

  const selectedJournee = journees?.find((j: any) => format(new Date(j.jour), 'yyyy-MM-dd') === selectedDate);

  const { data: journeeDetail, isLoading } = useQuery({
    queryKey: ['journee', selectedJournee?.id],
    queryFn: () => journeesApi.get(selectedJournee!.id),
    enabled: !!selectedJournee?.id,
  });

  const createJourneeMut = useMutation({
    mutationFn: () => journeesApi.create({ jour: selectedDate }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['journees'] }),
  });

  const addPosteMut = useMutation({
    mutationFn: (data: any) => postesApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['journee'] }); setShowPosteModal(false); },
  });

  const validerBlocMut = useMutation({
    mutationFn: (id: string) => journeesApi.validerBloc(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['journee'] }),
  });
  const validerQuartMut = useMutation({
    mutationFn: (id: string) => journeesApi.validerQuart(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['journee'] }),
  });

  const canValiderBloc = ['chef_bloc', 'admin'].includes(user?.role || '');
  const canValiderQuart = ['chef_quart', 'chef_exploitation', 'admin'].includes(user?.role || '');

  function handleAddPoste() {
    if (!journeeDetail) return;
    const dateStr = format(new Date(journeeDetail.jour), 'yyyy-MM-dd');
    const { debut: debutTime, fin: finTime } = TRANCHE_TIMES[posteForm.tranche as TrancheHoraire];
    const debut = new Date(`${dateStr}T${debutTime}:00`);
    let fin = new Date(`${dateStr}T${finTime}:00`);
    if (posteForm.tranche === 'h20_00h') fin = new Date(`${dateStr}T23:59:59`);
    addPosteMut.mutate({ ...posteForm, journee_id: journeeDetail.id, debut, fin });
  }

  return (
    <div>
      <PageHeader title="Gestion de la Journée" subtitle="Journal d'exploitation quotidien" />

      <div className="p-6">
        <div className="flex gap-4 mb-6">
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-slate-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500"
            />
          </div>
          {!selectedJournee && (
            <button
              onClick={() => createJourneeMut.mutate()}
              className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-slate-900 font-medium px-4 py-2 rounded-lg text-sm transition-colors"
            >
              <Plus size={15} /> Créer la journée
            </button>
          )}
        </div>

        {!selectedJournee && (
          <div className="bg-slate-900 border border-slate-700 rounded-lg p-8 text-center">
            <p className="text-slate-400">Aucune journée pour le {format(new Date(selectedDate + 'T12:00:00'), 'd MMMM yyyy', { locale: fr })}</p>
          </div>
        )}

        {selectedJournee && (
          <div className="space-y-4">
            {/* En-tête journée */}
            <div className="bg-slate-900 border border-slate-700 rounded-lg p-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h2 className="text-white font-semibold">
                    {format(new Date(selectedJournee.jour.split('T')[0] + 'T12:00:00'), "EEEE d MMMM yyyy", { locale: fr })}
                  </h2>
                  <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full mt-1 ${
                    selectedJournee.statut === 'transmis' ? 'bg-green-500/10 text-green-400' :
                    selectedJournee.statut === 'valide_quart' ? 'bg-blue-500/10 text-blue-400' :
                    selectedJournee.statut === 'valide_bloc' ? 'bg-amber-500/10 text-amber-400' :
                    'bg-slate-700 text-slate-300'
                  }`}>
                    {STATUT_JOURNEE_LABELS[selectedJournee.statut]}
                  </span>
                </div>
                <div className="flex gap-2">
                  {canValiderBloc && selectedJournee.statut === 'en_cours' && (
                    <button
                      onClick={() => validerBlocMut.mutate(selectedJournee.id)}
                      className="flex items-center gap-1.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 text-sm px-3 py-1.5 rounded-lg transition-colors"
                    >
                      <CheckCircle size={14} /> Valider Bloc
                    </button>
                  )}
                  {canValiderQuart && selectedJournee.statut === 'valide_bloc' && (
                    <button
                      onClick={() => validerQuartMut.mutate(selectedJournee.id)}
                      className="flex items-center gap-1.5 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-400 text-sm px-3 py-1.5 rounded-lg transition-colors"
                    >
                      <CheckCircle size={14} /> Valider Quart
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Postes */}
            <div className="bg-slate-900 border border-slate-700 rounded-lg">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
                <h3 className="text-sm font-medium text-white">Postes (4 tranches)</h3>
                <button
                  onClick={() => setShowPosteModal(true)}
                  className="flex items-center gap-1.5 text-amber-400 hover:text-amber-300 text-xs transition-colors"
                >
                  <Plus size={13} /> Ajouter
                </button>
              </div>
              <div className="divide-y divide-slate-800">
                {TRANCHES.map((tranche) => {
                  const poste = journeeDetail?.postes?.find((p: any) => p.tranche === tranche);
                  return (
                    <div key={tranche} className="flex items-center justify-between px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className={`w-2 h-2 rounded-full ${poste ? 'bg-green-400' : 'bg-slate-600'}`} />
                        <span className="text-sm text-slate-300">{TRANCHE_LABELS[tranche]}</span>
                      </div>
                      {poste ? (
                        <div className="flex gap-4 text-xs text-slate-400">
                          <span>CQ: {poste.chefQuart ? `${poste.chefQuart.prenom} ${poste.chefQuart.nom}` : '—'}</span>
                          <span>CB: {poste.chefBloc ? `${poste.chefBloc.prenom} ${poste.chefBloc.nom}` : '—'}</span>
                          <span>Op1: {poste.operateur1 ? `${poste.operateur1.prenom}` : '—'}</span>
                          <span>Op2: {poste.operateur2 ? `${poste.operateur2.prenom}` : '—'}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-600">Non configuré</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Stats */}
            {selectedJournee._count && (
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: 'Relevés Bloc', value: selectedJournee._count.releves_bloc },
                  { label: 'Manœuvres', value: selectedJournee._count.manouvres },
                  { label: 'Alarmes', value: selectedJournee._count.alarmes },
                  { label: 'OT', value: selectedJournee._count.ordres_travaux },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-slate-900 border border-slate-700 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-amber-400">{value}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{label}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal Poste */}
      <Modal open={showPosteModal} onClose={() => setShowPosteModal(false)} title="Ajouter un poste">
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1">Tranche</label>
            <select
              value={posteForm.tranche}
              onChange={(e) => setPosteForm({ ...posteForm, tranche: e.target.value })}
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500"
            >
              {TRANCHES.map((t) => <option key={t} value={t}>{TRANCHE_LABELS[t]}</option>)}
            </select>
          </div>
          {(['chef_quart_id', 'chef_bloc_id', 'operateur1_id', 'operateur2_id'] as const).map((field) => (
            <div key={field}>
              <label className="block text-sm text-slate-400 mb-1">
                {field === 'chef_quart_id' ? 'Chef de Quart' : field === 'chef_bloc_id' ? 'Chef de Bloc' : field === 'operateur1_id' ? 'Opérateur 1' : 'Opérateur 2'}
              </label>
              <select
                value={posteForm[field] || ''}
                onChange={(e) => setPosteForm({ ...posteForm, [field]: e.target.value || null })}
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500"
              >
                <option value="">— Non assigné —</option>
                {users?.map((u: any) => (
                  <option key={u.id} value={u.id}>{u.prenom} {u.nom} ({u.matricule})</option>
                ))}
              </select>
            </div>
          ))}
          <div className="flex gap-3 pt-2">
            <button onClick={() => setShowPosteModal(false)} className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-2 rounded-lg text-sm transition-colors">Annuler</button>
            <button
              onClick={handleAddPoste}
              disabled={addPosteMut.isPending}
              className="flex-1 bg-amber-500 hover:bg-amber-600 text-slate-900 font-medium py-2 rounded-lg text-sm transition-colors"
            >
              {addPosteMut.isPending ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
