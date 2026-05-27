import { useState, useRef, forwardRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { alarmesApi, journeesApi } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import PageHeader from '../components/PageHeader';
import { Trash2 } from 'lucide-react';
import { format, subDays, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

/* ── Champ texte avec ref externe ── */
const TextInput = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function TextInput(props, ref) {
    return <input ref={ref} {...props} />;
  }
);

type RowState = { tag: string; designation: string };
const EMPTY_ROW: RowState = { tag: '', designation: '' };

export default function Alarmes() {
  const { user } = useAuth();
  const canEdit = ['chef_bloc', 'chef_quart', 'chef_exploitation', 'admin'].includes(user?.role ?? '');
  const qc = useQueryClient();
  const today = format(new Date(), 'yyyy-MM-dd');
  const [selectedDate, setSelectedDate] = useState(today);
  const [newRow, setNewRow] = useState<RowState>(EMPTY_ROW);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRow, setEditRow] = useState<RowState>(EMPTY_ROW);

  /* refs — nouvelle ligne */
  const newTagRef  = useRef<HTMLInputElement>(null);
  const newDescRef = useRef<HTMLInputElement>(null);

  /* refs — ligne en édition */
  const editDescRef = useRef<HTMLInputElement>(null);

  /* ref pour éviter la double-copie */
  const hasCopied = useRef<string | null>(null);

  const { data: journees } = useQuery({
    queryKey: ['journees'],
    queryFn: () => journeesApi.list({ from: format(new Date(Date.now() - 30 * 86400000), 'yyyy-MM-dd') }),
  });
  const journee = journees?.find((j: any) => (j.jour as string).slice(0, 10) === selectedDate);

  /* journée précédente */
  const prevDateStr = format(subDays(parseISO(selectedDate), 1), 'yyyy-MM-dd');
  const prevJournee = journees?.find((j: any) => (j.jour as string).slice(0, 10) === prevDateStr);

  const { data: alarmes, isLoading } = useQuery({
    queryKey: ['alarmes', journee?.id],
    queryFn: () => alarmesApi.list(journee!.id),
    enabled: !!journee?.id,
  });

  /* alarmes de la veille */
  const { data: prevAlarmes } = useQuery({
    queryKey: ['alarmes', prevJournee?.id],
    queryFn: () => alarmesApi.list(prevJournee!.id),
    enabled: !!prevJournee?.id,
  });

  /* ── Copie automatique des alarmes de la veille ── */
  useEffect(() => {
    if (!journee?.id || !prevJournee?.id) return;
    if (alarmes === undefined || prevAlarmes === undefined) return;
    if (alarmes.length > 0) return;
    if (prevAlarmes.length === 0) return;
    if (hasCopied.current === journee.id) return;
    hasCopied.current = journee.id;

    (async () => {
      for (const a of prevAlarmes) {
        await alarmesApi.create({
          journee_id: journee.id,
          tag: a.tag,
          designation: a.designation,
          repetitive: true,
          origine: a.origine || 'HMI',
        });
      }
      qc.invalidateQueries({ queryKey: ['alarmes', journee.id] });
    })();
  }, [journee?.id, prevJournee?.id, alarmes, prevAlarmes]);

  const createMut = useMutation({
    mutationFn: (data: any) => alarmesApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['alarmes'] });
      setNewRow(EMPTY_ROW);
      setTimeout(() => newTagRef.current?.focus(), 50);
    },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => alarmesApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['alarmes'] }); setEditingId(null); },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => alarmesApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['alarmes'] }),
  });

  function handleAdd() {
    if (!journee || !newRow.designation.trim()) return;
    createMut.mutate({
      journee_id: journee.id,
      tag: newRow.tag.trim() || null,
      designation: newRow.designation.trim(),
      repetitive: true,
      origine: 'HMI',
    });
  }

  function startEdit(a: any) {
    if (!canEdit) return;
    setEditingId(a.id);
    setEditRow({ tag: a.tag ?? '', designation: a.designation ?? '' });
  }

  function handleUpdate(id: string) {
    if (!editRow.designation.trim()) return;
    const current = (alarmes ?? []).find((a: any) => a.id === id);
    updateMut.mutate({
      id,
      data: {
        tag: editRow.tag.trim() || null,
        designation: editRow.designation.trim(),
        repetitive: current?.repetitive ?? true,
        origine: current?.origine ?? 'HMI',
      },
    });
  }

  const inputCls = 'w-full bg-slate-800 border border-amber-500/60 rounded px-2 py-1 text-white text-sm focus:outline-none focus:border-amber-400';
  const newInputCls = 'w-full bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-white text-sm focus:outline-none focus:border-amber-500 placeholder:text-slate-600';

  return (
    <div>
      <PageHeader
        title="Alarmes Répétitives"
        subtitle="Registre des alarmes répétitives de la journée"
        actions={
          <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
            className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-amber-500" />
        }
      />

      <div className="p-6">
        {!journee && (
          <div className="bg-slate-900 border border-slate-700 rounded-lg p-8 text-center text-slate-400">
            Aucune journée pour le {format(new Date(selectedDate + 'T12:00:00'), 'd MMMM yyyy', { locale: fr })}
          </div>
        )}

        {journee && (
          <div className="bg-slate-900 border border-slate-700 rounded-lg overflow-visible">

            {/* ── En-tête cyan ── */}
            <div className="bg-cyan-500 px-4 py-2.5 rounded-t-lg">
              <h3 className="text-slate-900 font-bold text-sm uppercase tracking-wide italic">
                Alarmes Répétitives
              </h3>
            </div>

            {canEdit && (
              <p className="text-[11px] text-slate-500 px-4 py-1.5 border-b border-slate-800 italic">
                Cliquer sur une ligne pour modifier · Entrée pour naviguer · Entrée sur Désignation pour valider
              </p>
            )}

            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-cyan-500/15 border-b border-cyan-500/30">
                  <th className="text-center px-4 py-2 text-cyan-300 font-semibold w-36">TAG</th>
                  <th className="text-left   px-4 py-2 text-cyan-300 font-semibold">Désignation</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {isLoading && (
                  <tr><td colSpan={3} className="text-center text-slate-500 py-6 text-xs">Chargement...</td></tr>
                )}
                {!isLoading && (!alarmes || alarmes.length === 0) && (
                  <tr>
                    <td colSpan={3} className="text-center text-slate-600 py-8 text-xs italic">
                      Aucune alarme enregistrée pour cette journée
                    </td>
                  </tr>
                )}

                {alarmes?.map((a: any) =>
                  editingId === a.id ? (
                    <tr key={a.id} className="border-b border-amber-500/40 bg-amber-500/5">
                      <td className="px-2 py-1.5 w-36">
                        <input type="text" value={editRow.tag} autoFocus
                          placeholder="TAG"
                          onChange={e => setEditRow(r => ({ ...r, tag: e.target.value }))}
                          onKeyDown={e => {
                            if (e.key === 'Enter')  { e.preventDefault(); editDescRef.current?.focus(); }
                            if (e.key === 'Escape') setEditingId(null);
                          }}
                          className={`${inputCls} font-mono text-center text-amber-400`} />
                      </td>
                      <td className="px-2 py-1.5">
                        <input ref={editDescRef} type="text" value={editRow.designation}
                          placeholder="Désignation..."
                          onChange={e => setEditRow(r => ({ ...r, designation: e.target.value }))}
                          onKeyDown={e => {
                            if (e.key === 'Enter')  { e.preventDefault(); handleUpdate(a.id); }
                            if (e.key === 'Escape') setEditingId(null);
                          }}
                          className={inputCls} />
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        <button onClick={() => setEditingId(null)}
                          className="text-slate-500 hover:text-slate-300 text-xs transition-colors">✕</button>
                      </td>
                    </tr>
                  ) : (
                    <tr key={a.id}
                      onClick={() => startEdit(a)}
                      className={`border-b border-slate-800 transition-colors ${canEdit ? 'cursor-pointer hover:bg-slate-800/50' : ''}`}>
                      <td className="text-center px-4 py-3 font-mono text-amber-400 font-bold text-xs">{a.tag || '—'}</td>
                      <td className="px-4 py-3 text-slate-200">{a.designation}</td>
                      <td className="px-2 py-3 text-center" onClick={e => e.stopPropagation()}>
                        {canEdit && (
                          <button onClick={() => deleteMut.mutate(a.id)} disabled={deleteMut.isPending}
                            className="text-slate-600 hover:text-red-400 transition-colors disabled:opacity-40">
                            <Trash2 size={13} />
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                )}

                {/* ── Nouvelle ligne ── */}
                {canEdit && (
                  <tr className="border-t-2 border-amber-500/30 bg-slate-800/40">
                    <td className="px-2 py-2 w-36">
                      <input ref={newTagRef} type="text" value={newRow.tag}
                        placeholder="TAG"
                        onChange={e => setNewRow(r => ({ ...r, tag: e.target.value }))}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); newDescRef.current?.focus(); } }}
                        className={`${newInputCls} font-mono text-center text-amber-400`} />
                    </td>
                    <td className="px-2 py-2">
                      <input ref={newDescRef} type="text" value={newRow.designation}
                        placeholder="Désignation de l'alarme..."
                        onChange={e => setNewRow(r => ({ ...r, designation: e.target.value }))}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAdd(); } }}
                        className={newInputCls} />
                    </td>
                    <td className="px-2 py-2 text-center">
                      <button onClick={handleAdd}
                        disabled={!newRow.designation.trim() || createMut.isPending}
                        className="bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-slate-900 font-bold px-3 py-1.5 rounded text-xs transition-colors">
                        {createMut.isPending ? '...' : '+'}
                      </button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
