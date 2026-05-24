import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { alarmesApi, journeesApi } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import { Plus, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import type { Alarme } from '../types';

export default function Alarmes() {
  const { user } = useAuth();
  const canEdit = user?.role !== 'operateur';
  const qc = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<any>({ origine: 'HMI', repetitive: false, heure: format(new Date(), "yyyy-MM-dd'T'HH:mm") });

  const { data: journees } = useQuery({ queryKey: ['journees'], queryFn: () => journeesApi.list({ from: format(new Date(Date.now() - 30 * 86400000), 'yyyy-MM-dd') }) });
  const journee = journees?.find((j: any) => format(new Date(j.jour), 'yyyy-MM-dd') === selectedDate);

  const { data: alarmes, isLoading } = useQuery({
    queryKey: ['alarmes', journee?.id],
    queryFn: () => alarmesApi.list(journee!.id),
    enabled: !!journee?.id,
  });

  const createMut = useMutation({
    mutationFn: (data: any) => alarmesApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['alarmes'] }); setShowModal(false); setForm({ origine: 'HMI', repetitive: false, heure: format(new Date(), "yyyy-MM-dd'T'HH:mm") }); },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => alarmesApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['alarmes'] }),
  });

  return (
    <div>
      <PageHeader
        title="Alarmes HMI / DCS"
        subtitle="Registre des alarmes de la journée"
        actions={
          <div className="flex gap-2">
            <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-amber-500" />
            {journee && canEdit && (
              <button onClick={() => setShowModal(true)}
                className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-slate-900 font-medium px-3 py-1.5 rounded-lg text-sm">
                <Plus size={14} /> Ajouter
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
                  <th className="px-4 py-3 text-left text-xs text-slate-400 font-medium">Heure</th>
                  <th className="px-4 py-3 text-left text-xs text-slate-400 font-medium">TAG</th>
                  <th className="px-4 py-3 text-left text-xs text-slate-400 font-medium">Désignation</th>
                  <th className="px-4 py-3 text-left text-xs text-slate-400 font-medium">Origine</th>
                  <th className="px-4 py-3 text-left text-xs text-slate-400 font-medium">Rép.</th>
                  <th className="px-4 py-3 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {(!alarmes || alarmes.length === 0) && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">Aucune alarme</td></tr>
                )}
                {alarmes?.map((a: Alarme) => (
                  <tr key={a.id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="px-4 py-2.5 font-mono text-amber-400 text-xs">{a.heure ? format(new Date(a.heure), 'HH:mm') : '—'}</td>
                    <td className="px-4 py-2.5 text-slate-300 font-mono text-xs">{a.tag || '—'}</td>
                    <td className="px-4 py-2.5 text-slate-200">{a.designation}</td>
                    <td className="px-4 py-2.5">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${a.origine === 'DCS' ? 'bg-blue-400/10 text-blue-400' : 'bg-slate-700 text-slate-300'}`}>{a.origine}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      {a.repetitive && <span className="text-xs text-yellow-400">Oui</span>}
                    </td>
                    <td className="px-4 py-2.5">
                      {canEdit && <button onClick={() => deleteMut.mutate(a.id)} className="text-slate-600 hover:text-red-400 transition-colors"><Trash2 size={13} /></button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Nouvelle alarme">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Heure</label>
              <input type="datetime-local" value={form.heure}
                onChange={(e) => setForm({ ...form, heure: e.target.value })}
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500" />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">TAG</label>
              <input type="text" value={form.tag || ''} onChange={(e) => setForm({ ...form, tag: e.target.value })}
                placeholder="ex: TTXD-01"
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500" />
            </div>
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Désignation *</label>
            <input type="text" value={form.designation || ''} onChange={(e) => setForm({ ...form, designation: e.target.value })}
              placeholder="Description de l'alarme..."
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Origine</label>
              <select value={form.origine} onChange={(e) => setForm({ ...form, origine: e.target.value })}
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500">
                <option>HMI</option>
                <option>DCS</option>
                <option>SCADA</option>
              </select>
            </div>
            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                <input type="checkbox" checked={form.repetitive} onChange={(e) => setForm({ ...form, repetitive: e.target.checked })}
                  className="accent-amber-500" />
                Répétitive
              </label>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setShowModal(false)} className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-2 rounded-lg text-sm">Annuler</button>
            <button
              onClick={() => createMut.mutate({ ...form, journee_id: journee!.id })}
              disabled={createMut.isPending || !form.designation}
              className="flex-1 bg-amber-500 hover:bg-amber-600 text-slate-900 font-medium py-2 rounded-lg text-sm disabled:opacity-50">
              {createMut.isPending ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
