import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { defautsApi } from '../lib/api';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import { Plus, CheckCircle, Pencil } from 'lucide-react';
import { format } from 'date-fns';
import { ZONE_LABELS } from '../types';
import type { MaterielDefectueux, ZoneMateriel, StatutDefaut } from '../types';

const STATUT_COLORS: Record<StatutDefaut, string> = {
  ouvert: 'bg-red-400/10 text-red-400',
  en_cours: 'bg-yellow-400/10 text-yellow-400',
  cloture: 'bg-green-400/10 text-green-400',
};

const EMPTY_FORM = { statut: 'ouvert', date_declaration: format(new Date(), 'yyyy-MM-dd') };

export default function MaterielsDefectueux() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<'actif' | 'all'>('actif');
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<MaterielDefectueux | null>(null);
  const [form, setForm] = useState<any>(EMPTY_FORM);

  const { data: defauts, isLoading } = useQuery({
    queryKey: ['defauts', filter],
    queryFn: () => defautsApi.list(filter === 'actif' ? { actif: 'true' } : {}),
  });

  const createMut = useMutation({
    mutationFn: (data: any) => editItem ? defautsApi.update(editItem.id, data) : defautsApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['defauts'] }); setShowModal(false); setEditItem(null); setForm(EMPTY_FORM); },
  });

  const cloturerMut = useMutation({
    mutationFn: (id: string) => defautsApi.cloturer(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['defauts'] }),
  });

  function openEdit(d: MaterielDefectueux) {
    setEditItem(d);
    setForm({ ...d, date_declaration: d.date_declaration.split('T')[0], date_cloture: d.date_cloture?.split('T')[0] });
    setShowModal(true);
  }

  return (
    <div>
      <PageHeader
        title="Matériels Défectueux"
        subtitle="Suivi des équipements en défaut"
        actions={
          <div className="flex gap-2">
            <div className="flex bg-slate-800 border border-slate-600 rounded-lg overflow-hidden">
              <button onClick={() => setFilter('actif')} className={`px-3 py-1.5 text-sm transition-colors ${filter === 'actif' ? 'bg-amber-500 text-slate-900 font-medium' : 'text-slate-400 hover:text-white'}`}>Actifs</button>
              <button onClick={() => setFilter('all')} className={`px-3 py-1.5 text-sm transition-colors ${filter === 'all' ? 'bg-amber-500 text-slate-900 font-medium' : 'text-slate-400 hover:text-white'}`}>Tous</button>
            </div>
            <button onClick={() => { setEditItem(null); setForm(EMPTY_FORM); setShowModal(true); }}
              className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-slate-900 font-medium px-3 py-1.5 rounded-lg text-sm">
              <Plus size={14} /> Nouveau
            </button>
          </div>
        }
      />

      <div className="p-6">
        <div className="bg-slate-900 border border-slate-700 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700">
                {['KKS', 'Description', 'Zone', 'Déclaré le', 'Statut', 'Commentaires', ''].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs text-slate-400 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {isLoading && <tr><td colSpan={7} className="px-4 py-6 text-center text-slate-500">Chargement...</td></tr>}
              {!isLoading && (!defauts || defauts.length === 0) && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-500">Aucun matériel défectueux</td></tr>
              )}
              {defauts?.map((d: MaterielDefectueux) => (
                <tr key={d.id} className="hover:bg-slate-800/50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-amber-400">{d.kks_equipement}</td>
                  <td className="px-4 py-3 text-slate-200 max-w-xs">{d.description}</td>
                  <td className="px-4 py-3 text-xs text-slate-400">{ZONE_LABELS[d.zone]}</td>
                  <td className="px-4 py-3 text-xs text-slate-400">{format(new Date(d.date_declaration), 'dd/MM/yyyy')}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${STATUT_COLORS[d.statut]}`}>{d.statut}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400 max-w-xs truncate">{d.commentaires || '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(d)} className="text-slate-500 hover:text-amber-400 transition-colors"><Pencil size={13} /></button>
                      {d.statut !== 'cloture' && (
                        <button onClick={() => cloturerMut.mutate(d.id)} title="Clôturer" className="text-slate-500 hover:text-green-400 transition-colors"><CheckCircle size={13} /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={showModal} onClose={() => { setShowModal(false); setEditItem(null); }} title={editItem ? 'Modifier défaut' : 'Nouveau défaut'} size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-slate-400 mb-1">KKS Équipement *</label>
              <input value={form.kks_equipement || ''} onChange={(e) => setForm({ ...form, kks_equipement: e.target.value })}
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500" />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Zone *</label>
              <select value={form.zone || ''} onChange={(e) => setForm({ ...form, zone: e.target.value })}
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500">
                <option value="">— Choisir —</option>
                {(['site', 'tg', 'alternateur', 'auxiliaires'] as ZoneMateriel[]).map((z) => (
                  <option key={z} value={z}>{ZONE_LABELS[z]}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Description *</label>
            <textarea value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2} className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500 resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Date déclaration</label>
              <input type="date" value={form.date_declaration || ''} onChange={(e) => setForm({ ...form, date_declaration: e.target.value })}
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500" />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Statut</label>
              <select value={form.statut} onChange={(e) => setForm({ ...form, statut: e.target.value })}
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500">
                <option value="ouvert">Ouvert</option>
                <option value="en_cours">En cours</option>
                <option value="cloture">Clôturé</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Commentaires</label>
            <textarea value={form.commentaires || ''} onChange={(e) => setForm({ ...form, commentaires: e.target.value })}
              rows={2} className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500 resize-none" />
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => { setShowModal(false); setEditItem(null); }} className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-2 rounded-lg text-sm">Annuler</button>
            <button
              onClick={() => createMut.mutate(form)}
              disabled={createMut.isPending || !form.kks_equipement || !form.description || !form.zone}
              className="flex-1 bg-amber-500 hover:bg-amber-600 text-slate-900 font-medium py-2 rounded-lg text-sm disabled:opacity-50">
              {createMut.isPending ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
