import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { relevesApi, journeesApi, postesApi } from '../lib/api';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import { Plus, Eye, Trash2, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import type { RelevesChefBloc, Poste } from '../types';

function NumInput({ label, name, value, onChange, unit }: { label: string; name: string; value: any; onChange: (n: string, v: any) => void; unit?: string }) {
  return (
    <div>
      <label className="block text-xs text-slate-400 mb-1">{label}{unit && <span className="text-slate-500 ml-1">({unit})</span>}</label>
      <input
        type="number" step="any"
        value={value ?? ''}
        onChange={(e) => onChange(name, e.target.value === '' ? null : parseFloat(e.target.value))}
        className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-white text-sm focus:outline-none focus:border-amber-500"
      />
    </div>
  );
}

const INITIAL_FORM = { generateur: {}, huile: {}, vibrations: {}, echappement: {}, metal_blanc: {} };

export default function RelevesChefBloc() {
  const qc = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [showModal, setShowModal] = useState(false);
  const [viewItem, setViewItem] = useState<RelevesChefBloc | null>(null);
  const [tab, setTab] = useState(0);
  const [form, setForm] = useState<any>({ ...INITIAL_FORM, heure_releve: format(new Date(), "yyyy-MM-dd'T'HH:mm") });

  const { data: journees } = useQuery({ queryKey: ['journees'], queryFn: () => journeesApi.list({ from: format(new Date(Date.now() - 30 * 86400000), 'yyyy-MM-dd') }) });
  const journee = journees?.find((j: any) => format(new Date(j.jour), 'yyyy-MM-dd') === selectedDate);

  const { data: postes } = useQuery({
    queryKey: ['postes', journee?.id],
    queryFn: () => postesApi.listByJournee(journee!.id),
    enabled: !!journee?.id,
  });

  const { data: releves, isLoading } = useQuery({
    queryKey: ['releves-bloc', journee?.id],
    queryFn: () => relevesApi.listBloc(journee!.id),
    enabled: !!journee?.id,
  });

  const createMut = useMutation({
    mutationFn: (data: any) => relevesApi.createBloc(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['releves-bloc'] }); setShowModal(false); setForm({ ...INITIAL_FORM, heure_releve: format(new Date(), "yyyy-MM-dd'T'HH:mm") }); setTab(0); },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => relevesApi.deleteBloc(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['releves-bloc'] }),
  });

  function setMain(name: string, value: any) { setForm((f: any) => ({ ...f, [name]: value })); }
  function setSub(sub: string, name: string, value: any) { setForm((f: any) => ({ ...f, [sub]: { ...f[sub], [name]: value } })); }

  const TABS = ['Ambiant & TG', 'Générateur', 'Huile', 'Vibrations', 'Échappement', 'Métal Blanc'];

  return (
    <div>
      <PageHeader
        title="Relevés Chef de Bloc"
        subtitle="Saisie des paramètres toutes les 2 heures"
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
              <div className="bg-slate-900 border border-slate-700 rounded-lg p-8 text-center text-slate-400">Aucun relevé pour cette journée</div>
            )}
            {releves?.map((r: RelevesChefBloc) => (
              <div key={r.id} className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 flex items-center gap-4">
                <span className="font-mono text-amber-400 text-sm w-14 flex-shrink-0">{format(new Date(r.heure_releve), 'HH:mm')}</span>
                <div className="flex-1 grid grid-cols-4 gap-4 text-xs">
                  <span className="text-slate-400">T amb: <span className="text-white">{r.temp_ambiante_ctim ?? '—'}°C</span></span>
                  <span className="text-slate-400">RPM: <span className="text-white">{r.vitesse_turbine_rpm ?? '—'}</span></span>
                  <span className="text-slate-400">MW: <span className="text-white">{r.generateur?.puissance_active_mw ?? '—'}</span></span>
                  <span className="text-slate-400">Spread: <span className={`font-medium ${r.echappement?.spread_calcule && r.echappement.spread_calcule > 40 ? 'text-red-400' : 'text-white'}`}>
                    {r.echappement?.spread_calcule ?? '—'}
                    {r.echappement?.spread_calcule && r.echappement.spread_calcule > 40 && <AlertTriangle size={10} className="inline ml-1" />}
                  </span></span>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0 text-xs text-slate-500">
                  {r.saiseur?.prenom} {r.saiseur?.nom}
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button onClick={() => setViewItem(r)} className="text-slate-500 hover:text-amber-400 transition-colors"><Eye size={14} /></button>
                  <button onClick={() => deleteMut.mutate(r.id)} className="text-slate-500 hover:text-red-400 transition-colors"><Trash2 size={14} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Saisie */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="Nouveau relevé Chef de Bloc" size="xl">
        <div className="space-y-4">
          {/* Heure + Poste */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Heure du relevé</label>
              <input type="datetime-local" value={form.heure_releve}
                onChange={(e) => setMain('heure_releve', e.target.value)}
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500" />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Poste</label>
              <select value={form.poste_id || ''} onChange={(e) => setMain('poste_id', e.target.value)}
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500">
                <option value="">— Sélectionner —</option>
                {postes?.map((p: Poste) => <option key={p.id} value={p.id}>{p.tranche.replace('h', 'h').replace('_', '—')}</option>)}
              </select>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 border-b border-slate-700">
            {TABS.map((t, i) => (
              <button key={t} onClick={() => setTab(i)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors border-b-2 -mb-px ${tab === i ? 'border-amber-500 text-amber-400' : 'border-transparent text-slate-400 hover:text-white'}`}>
                {t}
              </button>
            ))}
          </div>

          {tab === 0 && (
            <div className="grid grid-cols-3 gap-3">
              <NumInput label="Temp. ambiante CTIM" name="temp_ambiante_ctim" value={form.temp_ambiante_ctim} onChange={setMain} unit="°C" />
              <NumInput label="Pression atm. AFPAP" name="pression_atm_afpap" value={form.pression_atm_afpap} onChange={setMain} unit="mmHg" />
              <NumInput label="Humidité RHUM" name="humidite_rhum" value={form.humidite_rhum} onChange={setMain} unit="%" />
              <NumInput label="ΔP Filtre total TFDP" name="dp_filtre_totale_tfdp" value={form.dp_filtre_totale_tfdp} onChange={setMain} unit="mmH2O" />
              <NumInput label="ΔP Admis. comp. CSDP" name="dp_admis_comp_csdp" value={form.dp_admis_comp_csdp} onChange={setMain} unit="mmH2O" />
              <NumInput label="Vitesse turbine" name="vitesse_turbine_rpm" value={form.vitesse_turbine_rpm} onChange={setMain} unit="RPM" />
              <NumInput label="Position TMGV" name="position_tmgv_deg" value={form.position_tmgv_deg} onChange={setMain} unit="°" />
              <NumInput label="Position IGV" name="position_igv_deg" value={form.position_igv_deg} onChange={setMain} unit="°" />
              <NumInput label="Tension ligne" name="tension_ligne_kv" value={form.tension_ligne_kv} onChange={setMain} unit="kV" />
              <NumInput label="Temp. gaz FTG TKG" name="temp_gaz_ftg_tkg" value={form.temp_gaz_ftg_tkg} onChange={setMain} unit="°C" />
              <NumInput label="Press. skid gaz FPGI" name="press_skid_gaz_fpgi" value={form.press_skid_gaz_fpgi} onChange={setMain} unit="bar" />
              <NumInput label="Signal référence FSR" name="signal_reference_fsr" value={form.signal_reference_fsr} onChange={setMain} unit="%" />
            </div>
          )}

          {tab === 1 && (
            <div className="grid grid-cols-3 gap-3">
              <NumInput label="Puissance active" name="puissance_active_mw" value={form.generateur.puissance_active_mw} onChange={(n, v) => setSub('generateur', n, v)} unit="MW" />
              <NumInput label="Puissance réactive" name="puissance_reactive_mvar" value={form.generateur.puissance_reactive_mvar} onChange={(n, v) => setSub('generateur', n, v)} unit="MVAr" />
              <NumInput label="Fréquence" name="frequence_hz" value={form.generateur.frequence_hz} onChange={(n, v) => setSub('generateur', n, v)} unit="Hz" />
              <NumInput label="Cos φ" name="cos_phi" value={form.generateur.cos_phi} onChange={(n, v) => setSub('generateur', n, v)} />
              <NumInput label="Tension DVX" name="tension_alt_dvx_kv" value={form.generateur.tension_alt_dvx_kv} onChange={(n, v) => setSub('generateur', n, v)} unit="kV" />
              <NumInput label="Tension SVLX" name="tension_svlx_kv" value={form.generateur.tension_svlx_kv} onChange={(n, v) => setSub('generateur', n, v)} unit="kV" />
              <NumInput label="Tension excitation" name="tension_excitation_v" value={form.generateur.tension_excitation_v} onChange={(n, v) => setSub('generateur', n, v)} unit="V" />
              <NumInput label="Courant excitation" name="courant_excitation_a" value={form.generateur.courant_excitation_a} onChange={(n, v) => setSub('generateur', n, v)} unit="A" />
            </div>
          )}

          {tab === 2 && (
            <div className="grid grid-cols-3 gap-3">
              <NumInput label="Niveau bac huile" name="niveau_bac_huile_mm" value={form.huile.niveau_bac_huile_mm} onChange={(n, v) => setSub('huile', n, v)} unit="mm" />
              <NumInput label="Pression QAP3" name="pression_qap3_bar" value={form.huile.pression_qap3_bar} onChange={(n, v) => setSub('huile', n, v)} unit="bar" />
              <NumInput label="Pression palier 5" name="pression_palier5_qgp" value={form.huile.pression_palier5_qgp} onChange={(n, v) => setSub('huile', n, v)} unit="bar" />
              <NumInput label="Temp. collecteur LTTH" name="temp_collecteur_ltth" value={form.huile.temp_collecteur_ltth} onChange={(n, v) => setSub('huile', n, v)} unit="°C" />
              <NumInput label="Temp. cuve 1 LTOT1" name="temp_cuve1_ltot1" value={form.huile.temp_cuve1_ltot1} onChange={(n, v) => setSub('huile', n, v)} unit="°C" />
              <NumInput label="Temp. cuve 2 LTOT2" name="temp_cuve2_ltot2" value={form.huile.temp_cuve2_ltot2} onChange={(n, v) => setSub('huile', n, v)} unit="°C" />
              <NumInput label="Temp. butée LTBT1D" name="temp_butee_ltbt1d" value={form.huile.temp_butee_ltbt1d} onChange={(n, v) => setSub('huile', n, v)} unit="°C" />
              <NumInput label="Temp. palier 1 LTB1D" name="temp_palier1_ltb1d" value={form.huile.temp_palier1_ltb1d} onChange={(n, v) => setSub('huile', n, v)} unit="°C" />
              <NumInput label="Temp. palier 2 LTB2D" name="temp_palier2_ltb2d" value={form.huile.temp_palier2_ltb2d} onChange={(n, v) => setSub('huile', n, v)} unit="°C" />
            </div>
          )}

          {tab === 3 && (
            <div className="grid grid-cols-3 gap-3">
              {['bb1', 'bb2', 'bb3', 'bb4', 'bb5', 'bb10', 'bb11', 'bb12'].map((bb, i) => (
                <NumInput key={bb}
                  label={`Palier ${i < 2 ? 1 : i < 4 ? 2 : i < 5 ? 3 : 4} — ${bb.toUpperCase()}`}
                  name={`palier${i < 2 ? 1 : i < 4 ? 2 : i < 5 ? 3 : 4}_${bb}`}
                  value={form.vibrations[`palier${i < 2 ? 1 : i < 4 ? 2 : i < 5 ? 3 : 4}_${bb}`]}
                  onChange={(n, v) => setSub('vibrations', n, v)}
                  unit="mm/s" />
              ))}
              <NumInput label="Vibration maxi" name="vibration_maxi" value={form.vibrations.vibration_maxi} onChange={(n, v) => setSub('vibrations', n, v)} unit="mm/s" />
            </div>
          )}

          {tab === 4 && (
            <div className="grid grid-cols-4 gap-3">
              <NumInput label="TTXM moyenne" name="ttxm_moyenne" value={form.echappement.ttxm_moyenne} onChange={(n, v) => setSub('echappement', n, v)} unit="°C" />
              <NumInput label="TTXSPL écart" name="ttxspl_ecart" value={form.echappement.ttxspl_ecart} onChange={(n, v) => setSub('echappement', n, v)} unit="°C" />
              {Array.from({ length: 24 }, (_, i) => i + 1).map((n) => (
                <NumInput key={n} label={`TTXD-${String(n).padStart(2, '0')}`}
                  name={`ttxd_${String(n).padStart(2, '0')}`}
                  value={form.echappement[`ttxd_${String(n).padStart(2, '0')}`]}
                  onChange={(n2, v) => setSub('echappement', n2, v)} unit="°C" />
              ))}
            </div>
          )}

          {tab === 5 && (
            <div className="grid grid-cols-3 gap-3">
              {['btta1_2', 'btta1_5', 'btta1_8', 'btti1_2', 'btti1_5', 'btti1_9',
                'btj1_1', 'btj1_2', 'btj2_1', 'btj2_2', 'btj3_1', 'btj3_2', 'btgj1_1_p4', 'btgj1_1_p5'].map((k) => (
                <NumInput key={k} label={k.toUpperCase()} name={k}
                  value={form.metal_blanc[k]} onChange={(n, v) => setSub('metal_blanc', n, v)} unit="°C" />
              ))}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button onClick={() => setShowModal(false)} className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-2 rounded-lg text-sm">Annuler</button>
            <button
              onClick={() => createMut.mutate({ ...form, journee_id: journee!.id })}
              disabled={createMut.isPending || !form.poste_id}
              className="flex-1 bg-amber-500 hover:bg-amber-600 text-slate-900 font-medium py-2 rounded-lg text-sm disabled:opacity-50">
              {createMut.isPending ? 'Enregistrement...' : 'Enregistrer le relevé'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal Vue détail */}
      <Modal open={!!viewItem} onClose={() => setViewItem(null)} title={`Relevé ${viewItem ? format(new Date(viewItem.heure_releve), 'HH:mm dd/MM/yyyy') : ''}`} size="xl">
        {viewItem && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-3 gap-3">
              {[
                ['Temp. ambiante', viewItem.temp_ambiante_ctim, '°C'],
                ['Vitesse turbine', viewItem.vitesse_turbine_rpm, 'RPM'],
                ['Press. skid gaz', viewItem.press_skid_gaz_fpgi, 'bar'],
                ['MW', viewItem.generateur?.puissance_active_mw, 'MW'],
                ['Fréquence', viewItem.generateur?.frequence_hz, 'Hz'],
                ['Cos φ', viewItem.generateur?.cos_phi, ''],
                ['Spread', viewItem.echappement?.spread_calcule, '°C'],
                ['TTXM', viewItem.echappement?.ttxm_moyenne, '°C'],
                ['Vibration maxi', viewItem.vibrations?.vibration_maxi, 'mm/s'],
              ].map(([label, value, unit]) => (
                <div key={label as string} className="bg-slate-800 rounded-lg p-3">
                  <p className="text-xs text-slate-400">{label}</p>
                  <p className="text-lg font-bold text-amber-400">{value ?? '—'}<span className="text-xs text-slate-400 ml-1">{unit}</span></p>
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
