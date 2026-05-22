import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { relevesApi, journeesApi, postesApi } from '../lib/api';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import { Plus, Eye, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import type { RelevesOperateur, Poste } from '../types';

function Field({ label, name, value, onChange, unit, type = 'number' }: { label: string; name: string; value: any; onChange: (n: string, v: any) => void; unit?: string; type?: string }) {
  return (
    <div>
      <label className="block text-xs text-slate-400 mb-1">{label}{unit && <span className="text-slate-500 ml-1">({unit})</span>}</label>
      <input
        type={type} step={type === 'number' ? 'any' : undefined}
        value={value ?? ''}
        onChange={(e) => onChange(name, type === 'number' ? (e.target.value === '' ? null : parseFloat(e.target.value)) : e.target.value)}
        className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-white text-sm focus:outline-none focus:border-amber-500"
      />
    </div>
  );
}

export default function RelevesOperateur() {
  const qc = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [showModal, setShowModal] = useState(false);
  const [viewItem, setViewItem] = useState<RelevesOperateur | null>(null);
  const [tab, setTab] = useState(0);
  const [form, setForm] = useState<any>({ heure_releve: format(new Date(), "yyyy-MM-dd'T'HH:mm") });

  const { data: journees } = useQuery({ queryKey: ['journees'], queryFn: () => journeesApi.list({ from: format(new Date(Date.now() - 30 * 86400000), 'yyyy-MM-dd') }) });
  const journee = journees?.find((j: any) => format(new Date(j.jour), 'yyyy-MM-dd') === selectedDate);

  const { data: postes } = useQuery({
    queryKey: ['postes', journee?.id],
    queryFn: () => postesApi.listByJournee(journee!.id),
    enabled: !!journee?.id,
  });

  const { data: releves } = useQuery({
    queryKey: ['releves-op', journee?.id],
    queryFn: () => relevesApi.listOp(journee!.id),
    enabled: !!journee?.id,
  });

  const createMut = useMutation({
    mutationFn: (data: any) => relevesApi.createOp(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['releves-op'] }); setShowModal(false); setForm({ heure_releve: format(new Date(), "yyyy-MM-dd'T'HH:mm") }); setTab(0); },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => relevesApi.deleteOp(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['releves-op'] }),
  });

  function setF(n: string, v: any) { setForm((f: any) => ({ ...f, [n]: v })); }

  const TABS = ['Eau Refroid.', 'Skid Gaz/Gasoil', 'Huile/Air', 'Transformateurs', 'Groupe Élect.', 'Compteurs'];

  return (
    <div>
      <PageHeader
        title="Relevés Opérateur"
        subtitle="Feuille opérateur — relevés toutes les 2 heures"
        actions={
          <div className="flex gap-2">
            <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-amber-500" />
            {journee && (
              <button onClick={() => setShowModal(true)}
                className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-slate-900 font-medium px-3 py-1.5 rounded-lg text-sm">
                <Plus size={14} /> Nouveau relevé
              </button>
            )}
          </div>
        }
      />

      <div className="p-6">
        {!journee && <div className="bg-slate-900 border border-slate-700 rounded-lg p-8 text-center text-slate-400">Aucune journée pour cette date</div>}
        {journee && (
          <div className="space-y-3">
            {(!releves || releves.length === 0) && (
              <div className="bg-slate-900 border border-slate-700 rounded-lg p-8 text-center text-slate-400">Aucun relevé opérateur pour cette journée</div>
            )}
            {releves?.map((r: RelevesOperateur) => (
              <div key={r.id} className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 flex items-center gap-4">
                <span className="font-mono text-amber-400 text-sm w-14 flex-shrink-0">{format(new Date(r.heure_releve), 'HH:mm')}</span>
                <div className="flex-1 grid grid-cols-4 gap-4 text-xs">
                  <span className="text-slate-400">P refoul.: <span className="text-white">{r.pression_refoul_pompe_bar ?? '—'} bar</span></span>
                  <span className="text-slate-400">P gaz: <span className="text-white">{r.pression_gaz_fpgi_bar ?? '—'} bar</span></span>
                  <span className="text-slate-400">N. huile: <span className="text-white">{r.niveau_huile_reservoir ?? '—'}</span></span>
                  <span className="text-slate-400">Air: <span className="text-white">{r.pression_air_comprime_bar ?? '—'} bar</span></span>
                </div>
                <span className="text-xs text-slate-500">{r.saiseur?.prenom} {r.saiseur?.nom}</span>
                <div className="flex gap-2">
                  <button onClick={() => setViewItem(r)} className="text-slate-500 hover:text-amber-400"><Eye size={14} /></button>
                  <button onClick={() => deleteMut.mutate(r.id)} className="text-slate-500 hover:text-red-400"><Trash2 size={14} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Nouveau relevé Opérateur" size="xl">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Heure du relevé</label>
              <input type="datetime-local" value={form.heure_releve} onChange={(e) => setF('heure_releve', e.target.value)}
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500" />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Poste</label>
              <select value={form.poste_id || ''} onChange={(e) => setF('poste_id', e.target.value)}
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500">
                <option value="">— Sélectionner —</option>
                {postes?.map((p: Poste) => <option key={p.id} value={p.id}>{p.tranche}</option>)}
              </select>
            </div>
          </div>

          <div className="flex gap-1 border-b border-slate-700 flex-wrap">
            {TABS.map((t, i) => (
              <button key={t} onClick={() => setTab(i)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors border-b-2 -mb-px ${tab === i ? 'border-amber-500 text-amber-400' : 'border-transparent text-slate-400 hover:text-white'}`}>
                {t}
              </button>
            ))}
          </div>

          {tab === 0 && (
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Choix pompe</label>
                <select value={form.choix_pompe || ''} onChange={(e) => setF('choix_pompe', e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-white text-sm focus:outline-none focus:border-amber-500">
                  <option value="">—</option><option>P1</option><option>P2</option><option>P1+P2</option>
                </select>
              </div>
              <Field label="Pression refoulement pompe" name="pression_refoul_pompe_bar" value={form.pression_refoul_pompe_bar} onChange={setF} unit="bar" />
              <Field label="Nb ventilateurs en service" name="nb_ventilateurs_service" value={form.nb_ventilateurs_service} onChange={setF} />
              <Field label="Temp. entrée réfrigération WTAD1" name="temp_entree_ref_wtad1" value={form.temp_entree_ref_wtad1} onChange={setF} unit="°C" />
              <Field label="Temp. sortie réfrigération WTAD2" name="temp_sortie_ref_wtad2" value={form.temp_sortie_ref_wtad2} onChange={setF} unit="°C" />
              <Field label="Pression retour eau réf." name="pression_retour_eau_ref" value={form.pression_retour_eau_ref} onChange={setF} unit="bar" />
              <Field label="Niveau réservoir expansion" name="niveau_reservoir_expansion" value={form.niveau_reservoir_expansion} onChange={setF} />
            </div>
          )}

          {tab === 1 && (
            <div className="grid grid-cols-3 gap-3">
              <Field label="Temp. gaz FTG TKG" name="temp_gaz_ftg_tkg" value={form.temp_gaz_ftg_tkg} onChange={setF} unit="°C" />
              <Field label="Pression gaz FPGI" name="pression_gaz_fpgi_bar" value={form.pression_gaz_fpgi_bar} onChange={setF} unit="bar" />
              <Field label="ΔP filtre gaz" name="dp_filtre_gaz_bar" value={form.dp_filtre_gaz_bar} onChange={setF} unit="bar" />
              <Field label="Pression entrée skid gasoil" name="pression_entree_skid" value={form.pression_entree_skid} onChange={setF} unit="bar" />
              <Field label="ΔP filtre gasoil" name="dp_filtre_gasoil_bar" value={form.dp_filtre_gasoil_bar} onChange={setF} unit="bar" />
            </div>
          )}

          {tab === 2 && (
            <div className="grid grid-cols-3 gap-3">
              <Field label="Niveau huile réservoir" name="niveau_huile_reservoir" value={form.niveau_huile_reservoir} onChange={setF} />
              <div>
                <label className="block text-xs text-slate-400 mb-1">Choix filtre huile</label>
                <select value={form.choix_filtre_huile || ''} onChange={(e) => setF('choix_filtre_huile', e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-white text-sm">
                  <option value="">—</option><option>F1</option><option>F2</option>
                </select>
              </div>
              <Field label="Pression air atomisation" name="pression_air_atomisation" value={form.pression_air_atomisation} onChange={setF} unit="bar" />
              <Field label="ΔP totale filtre air" name="dp_totale_filtre_kpa" value={form.dp_totale_filtre_kpa} onChange={setF} unit="kPa" />
              <Field label="ΔP filtre" name="dp_filtre_kpa" value={form.dp_filtre_kpa} onChange={setF} unit="kPa" />
              <Field label="Pression air comprimé" name="pression_air_comprime_bar" value={form.pression_air_comprime_bar} onChange={setF} unit="bar" />
            </div>
          )}

          {tab === 3 && (
            <div className="grid grid-cols-3 gap-3">
              <Field label="Temp. huile TP" name="temp_huile_tp" value={form.temp_huile_tp} onChange={setF} unit="°C" />
              <Field label="Temp. enroulement TP" name="temp_enroulement_tp" value={form.temp_enroulement_tp} onChange={setF} unit="°C" />
              <Field label="Niv. conservateur TP" name="niv_conservateur_tp" value={form.niv_conservateur_tp} onChange={setF} />
              <Field label="Temp. huile TS" name="temp_huile_ts" value={form.temp_huile_ts} onChange={setF} unit="°C" />
              <Field label="Temp. enroulement TS" name="temp_enroulement_ts" value={form.temp_enroulement_ts} onChange={setF} unit="°C" />
              <Field label="Niv. conservateur TS" name="niv_conservateur_ts" value={form.niv_conservateur_ts} onChange={setF} />
              <Field label="Pression circuit incendie" name="pression_circuit_incendie" value={form.pression_circuit_incendie} onChange={setF} unit="bar" />
              <Field label="Niveau gasoil PPE" name="niveau_gasoil_ppe_pct" value={form.niveau_gasoil_ppe_pct} onChange={setF} unit="%" />
            </div>
          )}

          {tab === 4 && (
            <div className="grid grid-cols-3 gap-3">
              <Field label="Compteur gasoil GE" name="compteur_gasoil_ge_l" value={form.compteur_gasoil_ge_l} onChange={setF} unit="L" />
              <Field label="Compteur énergie GE" name="compteur_energie_ge_kwh" value={form.compteur_energie_ge_kwh} onChange={setF} unit="kWh" />
              <Field label="Stock gasoil" name="stock_gasoil_l" value={form.stock_gasoil_l} onChange={setF} unit="L" />
              <Field label="Temp. huile graissage GE" name="temp_huile_graissage_ge" value={form.temp_huile_graissage_ge} onChange={setF} unit="°C" />
              <Field label="Pression huile graissage GE" name="pression_huile_graissage_ge" value={form.pression_huile_graissage_ge} onChange={setF} unit="bar" />
              <Field label="Temp. eau primaire GE" name="temp_eau_primaire_ge" value={form.temp_eau_primaire_ge} onChange={setF} unit="°C" />
              <Field label="Nb heures marche GE" name="nb_heures_marche_ge" value={form.nb_heures_marche_ge} onChange={setF} unit="h" />
            </div>
          )}

          {tab === 5 && (
            <div className="grid grid-cols-3 gap-3">
              <Field label="Énergie active index 0h" name="energie_active_index_0h" value={form.energie_active_index_0h} onChange={setF} unit="MWh" />
              <Field label="Énergie active index 24h" name="energie_active_index_24h" value={form.energie_active_index_24h} onChange={setF} unit="MWh" />
              <Field label="Réactif absorbé 0h" name="reactif_absorbe_0h" value={form.reactif_absorbe_0h} onChange={setF} unit="MVArh" />
              <Field label="Réactif absorbé 24h" name="reactif_absorbe_24h" value={form.reactif_absorbe_24h} onChange={setF} unit="MVArh" />
              <Field label="Gasoil 0h" name="gasoil_0h_l" value={form.gasoil_0h_l} onChange={setF} unit="L" />
              <Field label="Gasoil 24h" name="gasoil_24h_l" value={form.gasoil_24h_l} onChange={setF} unit="L" />
              <div className="col-span-3">
                <label className="block text-xs text-slate-400 mb-1">Consignes particulières</label>
                <textarea value={form.consignes_particulieres || ''} onChange={(e) => setF('consignes_particulieres', e.target.value)}
                  rows={2} className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-white text-sm focus:outline-none focus:border-amber-500 resize-none" />
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button onClick={() => setShowModal(false)} className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-2 rounded-lg text-sm">Annuler</button>
            <button
              onClick={() => createMut.mutate({ ...form, journee_id: journee!.id })}
              disabled={createMut.isPending || !form.poste_id}
              className="flex-1 bg-amber-500 hover:bg-amber-600 text-slate-900 font-medium py-2 rounded-lg text-sm disabled:opacity-50">
              {createMut.isPending ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={!!viewItem} onClose={() => setViewItem(null)} title={`Relevé Opérateur ${viewItem ? format(new Date(viewItem.heure_releve), 'HH:mm') : ''}`} size="lg">
        {viewItem && (
          <div className="grid grid-cols-2 gap-3 text-sm">
            {[
              ['Pression refoulement', viewItem.pression_refoul_pompe_bar, 'bar'],
              ['Pression gaz', viewItem.pression_gaz_fpgi_bar, 'bar'],
              ['Niveau huile', viewItem.niveau_huile_reservoir, ''],
              ['Pression air comprimé', viewItem.pression_air_comprime_bar, 'bar'],
            ].map(([l, v, u]) => (
              <div key={l as string} className="bg-slate-800 rounded-lg p-3">
                <p className="text-xs text-slate-400">{l}</p>
                <p className="text-lg font-bold text-amber-400">{v ?? '—'}<span className="text-xs text-slate-400 ml-1">{u}</span></p>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}
