import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { otApi, journeesApi } from '../lib/api';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ETAT_OT_LABELS } from '../types';
import type { OrdreTravaux, EtatOT, DisciplineOT, TypeMaintenance } from '../types';

const ETAT_COLORS: Record<EtatOT, string> = {
  en_cours: 'bg-blue-400/10 text-blue-400',
  termine: 'bg-green-400/10 text-green-400',
  reporte: 'bg-yellow-400/10 text-yellow-400',
  annule: 'bg-slate-600 text-slate-400',
};

const EMPTY_FORM = { type_maintenance: 'curatif', etat: 'en_cours', discipline: '' };

export default function OrdresTravaux() {
  const qc = useQueryClient();
  const today = format(new Date(), 'yyyy-MM-dd');
  const [selectedDate, setSelectedDate] = useState(today);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<OrdreTravaux | null>(null);
  const [form, setForm] = useState<any>(EMPTY_FORM);

  const { data: journees } = useQuery({ queryKey: ['journees'], queryFn: () => journeesApi.list({ from: format(new Date(Date.now() - 30 * 86400000), 'yyyy-MM-dd') }) });
  const journee = journees?.find((j: any) => format(new Date(j.jour), 'yyyy-MM-dd') === selectedDate);

  const { data: ots, isLoading } = useQuery({
    queryKey: ['ots', journee?.id],
    queryFn: () => otApi.list(journee!.id),
    enabled: !!journee?.id,
  });

  const createMut = useMutation({
    mutationFn: (data: any) => editItem ? otApi.update(editItem.id, data) : otApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ots'] }); setShowModal(false); setEditItem(null); setForm(EMPTY_FORM); },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => otApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ots'] }),
  });

  function openEdit(ot: OrdreTravaux) {
    setEditItem(ot);
    setForm({ ...ot, date_debut: ot.date_debut?.split('T')[0], date_fin: ot.date_fin?.split('T')[0] });
    setShowModal(true);
  }

  return (
    <div>
      <PageHeader
        title="Ordres de Travaux"
        subtitle="Suivi des interventions de maintenance"
        actions={
          <div className="flex gap-2">
            <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-amber-500" />
            {journee && (
              <button onClick={() => { setEditItem(null); setForm(EMPTY_FORM); setShowModal(true); }}
                className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-slate-900 font-medium px-3 py-1.5 rounded-lg text-sm">
                <Plus size={14} /> Créer OT
              </button>
            )}
          </div>
        }
      />

      <div className="p-6">
        {!journee && <div className="bg-slate-900 border border-slate-700 rounded-lg p-8 text-center text-slate-400">Aucune journée pour cette date</div>}
        {journee && (
          <div className="bg-slate-900 border border-slate-700 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  {['N° OT', 'KKS', 'Description', 'Discipline', 'Type', 'Période', 'État', ''].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs text-slate-400 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {(!ots || ots.length === 0) && (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-500">Aucun OT</td></tr>
                )}
                {ots?.map((ot: OrdreTravaux) => (
                  <tr key={ot.id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-amber-400">{ot.numero_ot || '—'}</td>
                    <td className="px-4 py-3 text-xs text-slate-300">{ot.kks_equipement || '—'}</td>
                    <td className="px-4 py-3 text-slate-200 max-w-xs truncate">{ot.description}</td>
                    <td className="px-4 py-3 text-xs text-slate-400 uppercase">{ot.discipline || '—'}</td>
                    <td className="px-4 py-3 text-xs text-slate-400">{ot.type_maintenance}</td>
                    <td className="px-4 py-3 text-xs text-slate-400">
                      {ot.date_debut ? format(new Date(ot.date_debut), 'dd/MM') : '—'}
                      {ot.date_fin ? ` → ${format(new Date(ot.date_fin), 'dd/MM')}` : ''}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${ETAT_COLORS[ot.etat]}`}>{ETAT_OT_LABELS[ot.etat]}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => openEdit(ot)} className="text-slate-500 hover:text-amber-400 transition-colors"><Pencil size={13} /></button>
                        <button onClick={() => deleteMut.mutate(ot.id)} className="text-slate-500 hover:text-red-400 transition-colors"><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={showModal} onClose={() => { setShowModal(false); setEditItem(null); }} title={editItem ? 'Modifier OT' : 'Créer OT'} size="lg">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1">N° OT</label>
            <input value={form.numero_ot || ''} onChange={(e) => setForm({ ...form, numero_ot: e.target.value })}
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500" />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">KKS Équipement</label>
            <input value={form.kks_equipement || ''} onChange={(e) => setForm({ ...form, kks_equipement: e.target.value })}
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500" />
          </div>
          <div className="col-span-2">
            <label className="block text-sm text-slate-400 mb-1">Description *</label>
            <textarea value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2} className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500 resize-none" />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Discipline</label>
            <select value={form.discipline || ''} onChange={(e) => setForm({ ...form, discipline: e.target.value })}
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500">
              <option value="">— Aucune —</option>
              {(['mec', 'elec', 'inst', 'civil', 'autre'] as DisciplineOT[]).map((d) => <option key={d} value={d}>{d.toUpperCase()}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Type maintenance *</label>
            <select value={form.type_maintenance} onChange={(e) => setForm({ ...form, type_maintenance: e.target.value })}
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500">
              {(['curatif', 'systematique', 'preventif'] as TypeMaintenance[]).map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Date début</label>
            <input type="date" value={form.date_debut || ''} onChange={(e) => setForm({ ...form, date_debut: e.target.value })}
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500" />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Date fin</label>
            <input type="date" value={form.date_fin || ''} onChange={(e) => setForm({ ...form, date_fin: e.target.value })}
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500" />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">État</label>
            <select value={form.etat} onChange={(e) => setForm({ ...form, etat: e.target.value })}
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500">
              {(['en_cours', 'termine', 'reporte', 'annule'] as EtatOT[]).map((e) => <option key={e} value={e}>{ETAT_OT_LABELS[e]}</option>)}
            </select>
          </div>
        </div>
        <div className="flex gap-3 pt-4">
          <button onClick={() => { setShowModal(false); setEditItem(null); }} className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-2 rounded-lg text-sm">Annuler</button>
          <button
            onClick={() => createMut.mutate({ ...form, journee_id: journee!.id })}
            disabled={createMut.isPending || !form.description}
            className="flex-1 bg-amber-500 hover:bg-amber-600 text-slate-900 font-medium py-2 rounded-lg text-sm disabled:opacity-50">
            {createMut.isPending ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
