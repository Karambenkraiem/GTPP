import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { manouvresApi, journeesApi } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import { Plus, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { TYPE_MANOUVRE_LABELS } from '../types';
import type { TypeManouvre, Manouvre } from '../types';

const TYPES: TypeManouvre[] = ['exploitation', 'entretien', 'permutation', 'agc', 'incident'];

const TYPE_COLORS: Record<TypeManouvre, string> = {
  exploitation: 'text-blue-400 bg-blue-400/10',
  entretien: 'text-amber-400 bg-amber-400/10',
  permutation: 'text-purple-400 bg-purple-400/10',
  agc: 'text-cyan-400 bg-cyan-400/10',
  incident: 'text-red-400 bg-red-400/10',
};

export default function Manouvres() {
  const { user } = useAuth();
  const canEdit = user?.role !== 'operateur';
  const qc = useQueryClient();
  const today = format(new Date(), 'yyyy-MM-dd');
  const [selectedDate, setSelectedDate] = useState(today);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<any>({ type_manouvre: 'exploitation', feuille_numero: 1, heure_manouvre: format(new Date(), "yyyy-MM-dd'T'HH:mm") });

  const { data: journees } = useQuery({ queryKey: ['journees'], queryFn: () => journeesApi.list({ from: format(new Date(Date.now() - 30 * 86400000), 'yyyy-MM-dd') }) });
  const journee = journees?.find((j: any) => format(new Date(j.jour), 'yyyy-MM-dd') === selectedDate);

  const { data: manouvres, isLoading } = useQuery({
    queryKey: ['manouvres', journee?.id],
    queryFn: () => manouvresApi.list(journee!.id),
    enabled: !!journee?.id,
  });

  const createMut = useMutation({
    mutationFn: (data: any) => manouvresApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['manouvres'] }); setShowModal(false); setForm({ type_manouvre: 'exploitation', feuille_numero: 1, heure_manouvre: format(new Date(), "yyyy-MM-dd'T'HH:mm") }); },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => manouvresApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['manouvres'] }),
  });

  return (
    <div>
      <PageHeader
        title="Manœuvres d'Exploitation"
        subtitle="Journal chronologique des manœuvres"
        actions={
          <div className="flex gap-2">
            <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-amber-500" />
            {journee && canEdit && (
              <button onClick={() => setShowModal(true)}
                className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-slate-900 font-medium px-3 py-1.5 rounded-lg text-sm transition-colors">
                <Plus size={14} /> Ajouter
              </button>
            )}
          </div>
        }
      />

      <div className="p-6">
        {!journee && <div className="bg-slate-900 border border-slate-700 rounded-lg p-8 text-center text-slate-400">Aucune journée pour cette date</div>}
        {journee && isLoading && <div className="text-slate-400 text-sm">Chargement...</div>}
        {journee && !isLoading && (
          <div className="space-y-3">
            {(!manouvres || manouvres.length === 0) && (
              <div className="bg-slate-900 border border-slate-700 rounded-lg p-8 text-center text-slate-400">Aucune manœuvre enregistrée</div>
            )}
            {manouvres?.map((m: Manouvre) => (
              <div key={m.id} className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 flex items-start gap-4">
                <div className="text-amber-400 font-mono text-sm w-12 flex-shrink-0 pt-0.5">
                  {format(new Date(m.heure_manouvre), 'HH:mm')}
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${TYPE_COLORS[m.type_manouvre]}`}>
                  {TYPE_MANOUVRE_LABELS[m.type_manouvre]}
                </span>
                <p className="text-slate-200 text-sm flex-1">{m.description}</p>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs text-slate-500">F{m.feuille_numero}</span>
                  <span className="text-xs text-slate-500">{m.saiseur?.prenom} {m.saiseur?.nom}</span>
                  {canEdit && (
                    <button onClick={() => deleteMut.mutate(m.id)} className="text-slate-600 hover:text-red-400 transition-colors">
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Nouvelle manœuvre">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Date/Heure</label>
              <input type="datetime-local" value={form.heure_manouvre}
                onChange={(e) => setForm({ ...form, heure_manouvre: e.target.value })}
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500" />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Type</label>
              <select value={form.type_manouvre} onChange={(e) => setForm({ ...form, type_manouvre: e.target.value })}
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500">
                {TYPES.map((t) => <option key={t} value={t}>{TYPE_MANOUVRE_LABELS[t]}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Feuille</label>
            <select value={form.feuille_numero} onChange={(e) => setForm({ ...form, feuille_numero: Number(e.target.value) })}
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500">
              <option value={1}>Feuille 1</option>
              <option value={2}>Feuille 2</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Description *</label>
            <textarea value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3} placeholder="Description de la manœuvre..."
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500 resize-none" />
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setShowModal(false)} className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-2 rounded-lg text-sm transition-colors">Annuler</button>
            <button
              onClick={() => createMut.mutate({ ...form, journee_id: journee!.id })}
              disabled={createMut.isPending || !form.description}
              className="flex-1 bg-amber-500 hover:bg-amber-600 text-slate-900 font-medium py-2 rounded-lg text-sm transition-colors disabled:opacity-50">
              {createMut.isPending ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
