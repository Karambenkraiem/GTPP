import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const JOUR = '2026-07-04';
const CHEF_QUART = '28248953-9fde-48dc-af75-273babe26ff3'; // BEN KRAIEM Karam
const CHEF_BLOC = 'edc8edf3-e539-435d-98c3-8ccb601c7ff0'; // CHERNI Maher
const OPERATEUR = '0130f7c7-fc2c-4b01-b0ca-d7c95af492f2'; // OUERTATENI Walid

function at(hour: number, minute = 0) {
  return new Date(`${JOUR}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00+01:00`);
}

async function main() {
  const jourDate = new Date(`${JOUR}T00:00:00.000Z`);
  const journee = await prisma.journee.upsert({
    where: { jour: jourDate },
    update: { consignes_permanentes: 'RAS. Maintenir puissance selon programme de charge. Vigilance vibrations palier 3.' },
    create: { jour: jourDate, consignes_permanentes: 'RAS. Maintenir puissance selon programme de charge. Vigilance vibrations palier 3.' },
  });

  const tranches: { tranche: any; debut: number; fin: number }[] = [
    { tranche: 'h00_07h', debut: 0, fin: 7 },
    { tranche: 'h07_14h', debut: 7, fin: 14 },
    { tranche: 'h14_20h', debut: 14, fin: 20 },
    { tranche: 'h20_00h', debut: 20, fin: 24 },
  ];
  const postes = [];
  for (const t of tranches) {
    const p = await prisma.poste.upsert({
      where: { journee_id_tranche: { journee_id: journee.id, tranche: t.tranche } },
      update: {},
      create: {
        journee_id: journee.id,
        tranche: t.tranche,
        debut: at(t.debut % 24),
        fin: at(t.fin % 24 === 0 ? 23 : t.fin % 24, t.fin % 24 === 0 ? 59 : 0),
        chef_quart_id: CHEF_QUART,
        chef_bloc_id: CHEF_BLOC,
        operateur1_id: OPERATEUR,
        statut: t.debut < 14 ? 'valide' : 'en_cours',
      },
    });
    postes.push(p);
  }

  const relevesBlocData = [
    { heure: 6, temp_ambiante_ctim: 24.5, pression_atm_afpap: 1013.2, humidite_rhum: 62, vitesse_turbine_rpm: 3000.4, tension_ligne_kv: 225.3, temp_gaz_ftg_tkg: 540.2, press_skid_gaz_fpgi: 24.1, puissance_active_mw: 112.4, cos_phi: 0.92, freq: 50.02, vib_max: 3.8, ttxm: 512.4 },
    { heure: 14, temp_ambiante_ctim: 31.8, pression_atm_afpap: 1011.6, humidite_rhum: 48, vitesse_turbine_rpm: 3000.1, tension_ligne_kv: 226.0, temp_gaz_ftg_tkg: 545.6, press_skid_gaz_fpgi: 23.8, puissance_active_mw: 118.9, cos_phi: 0.90, freq: 49.98, vib_max: 4.1, ttxm: 519.8 },
  ];

  for (const r of relevesBlocData) {
    const poste = postes.find(p => (r.heure < 7 ? p.tranche === 'h00_07h' : r.heure < 14 ? p.tranche === 'h07_14h' : p.tranche === 'h14_20h'));
    const releve = await prisma.relevesChefBloc.upsert({
      where: { journee_id_heure_releve: { journee_id: journee.id, heure_releve: at(r.heure) } },
      update: {},
      create: {
        journee_id: journee.id,
        poste_id: poste?.id,
        saisi_par: CHEF_BLOC,
        heure_releve: at(r.heure),
        temp_ambiante_ctim: r.temp_ambiante_ctim,
        pression_atm_afpap: r.pression_atm_afpap,
        humidite_rhum: r.humidite_rhum,
        dp_filtre_totale_tfdp: 4.2,
        vitesse_turbine_rpm: r.vitesse_turbine_rpm,
        position_igv_deg: 78.5,
        tension_ligne_kv: r.tension_ligne_kv,
        temp_gaz_ftg_tkg: r.temp_gaz_ftg_tkg,
        press_skid_gaz_fpgi: r.press_skid_gaz_fpgi,
        press_refoul_cpd: 11.2,
        temp_entree_comp_ctifr: r.temp_ambiante_ctim,
      },
    });
    await prisma.relevesGenerateur.upsert({
      where: { releve_id: releve.id },
      update: {},
      create: {
        releve_id: releve.id,
        puissance_active_mw: r.puissance_active_mw,
        puissance_reactive_mvar: 22.5,
        frequence_hz: r.freq,
        cos_phi: r.cos_phi,
        tension_alt_dvx_kv: 11.5,
        temp_stator_e_gst1: 78.2,
        temp_stator_f_gst2: 79.1,
      },
    });
    await prisma.relevesVibrations.upsert({
      where: { releve_id: releve.id },
      update: {},
      create: {
        releve_id: releve.id,
        palier1_bb1: 2.1,
        palier1_bb2: 2.4,
        palier2_bb3: 2.8,
        palier3_bb5: 3.2,
        vibration_maxi: r.vib_max,
      },
    });
    await prisma.relevesEchappement.upsert({
      where: { releve_id: releve.id },
      update: {},
      create: {
        releve_id: releve.id,
        ttxm_moyenne: r.ttxm,
        ttxsp1: r.ttxm + 8,
        ttxsp2: r.ttxm - 5,
        ttxsp3: r.ttxm + 2,
        ttxd_01: r.ttxm + 10,
        ttxd_02: r.ttxm - 12,
      },
    });
  }

  const relevesOpData = [
    { heure: 8, pression: 6.2, ventilos: 3, gasoil_stock: 8400 },
    { heure: 16, pression: 6.4, ventilos: 4, gasoil_stock: 8210 },
  ];
  for (const r of relevesOpData) {
    const poste = postes.find(p => (r.heure < 14 ? p.tranche === 'h07_14h' : p.tranche === 'h14_20h'));
    await prisma.relevesOperateur.upsert({
      where: { journee_id_heure_releve: { journee_id: journee.id, heure_releve: at(r.heure) } },
      update: {},
      create: {
        journee_id: journee.id,
        poste_id: poste?.id,
        saisi_par: OPERATEUR,
        heure_releve: at(r.heure),
        choix_pompe: 'P1',
        pression_refoul_pompe_bar: r.pression,
        nb_ventilateurs_service: r.ventilos,
        temp_gaz_ftg_tkg: 542.1,
        pression_gaz_fpgi_bar: 24.0,
        stock_gasoil_l: r.gasoil_stock,
        detecteurs_gaz: { zone_tg: 'normal', zone_aux: 'normal' },
      },
    });
  }

  await prisma.compteursJournaliers.upsert({
    where: { journee_id: journee.id },
    update: {},
    create: {
      journee_id: journee.id,
      energie_active_00h: 458210.500,
      energie_active_24h: 461175.900,
      auxiliaires_00h: 12040.200,
      auxiliaires_24h: 12098.700,
      gaz_00h_nm3: 980210.00,
      gaz_24h_nm3: 987340.00,
      h_flamme_00h: 45210.5,
      h_flamme_24h: 45224.5,
      dem_total_00h: 812,
      dem_total_24h: 813,
      energie_jour_mwh: 2965.400,
      puissance_max_mw: 118.9,
      heure_puissance_max: '14:32',
      nature_puissance_max: 'BASE',
    },
  });

  await prisma.manouvre.createMany({
    data: [
      { journee_id: journee.id, poste_id: postes[1].id, saisi_par: CHEF_QUART, heure_manouvre: at(9, 15), description: "Démarrage ventilateur auxiliaire n°2 suite à montée en charge.", type_manouvre: 'exploitation' },
      { journee_id: journee.id, poste_id: postes[2].id, saisi_par: CHEF_QUART, heure_manouvre: at(15, 40), description: "Permutation pompe de graissage principale/secours pour essai périodique.", type_manouvre: 'permutation' },
    ],
    skipDuplicates: true,
  });

  await prisma.alarme.createMany({
    data: [
      { journee_id: journee.id, poste_id: postes[1].id, tag: 'VIB-BB3-HH', designation: 'Vibration palier 3 seuil haut', heure: at(10, 5), origine: 'HMI', repetitive: false },
      { journee_id: journee.id, poste_id: postes[2].id, tag: 'GAZ-FPGI-L', designation: 'Pression gaz skid basse', heure: at(16, 20), origine: 'HMI', repetitive: true },
    ],
    skipDuplicates: true,
  });

  await prisma.ordreTravaux.createMany({
    data: [
      { journee_id: journee.id, numero_ot: 'OT-2026-0341', kks_equipement: '10MBA20AA101', description: 'Contrôle vibratoire approfondi palier 3 + graissage', date_debut: new Date('2026-07-05'), etat: 'en_cours', discipline: 'mec', type_maintenance: 'curatif' },
      { journee_id: journee.id, numero_ot: 'OT-2026-0298', kks_equipement: '10MBL10AA001', description: 'Remplacement filtre gaz skid', date_debut: new Date('2026-07-02'), date_fin: new Date('2026-07-03'), etat: 'termine', discipline: 'mec', type_maintenance: 'systematique' },
    ],
    skipDuplicates: true,
  });

  await prisma.demandeService.createMany({
    data: [
      { journee_id: journee.id, numero_ds: 'DS-2026-0117', urgence: 2, description: "Intervention électricité — vérification armoire d'excitation alternateur." },
    ],
    skipDuplicates: true,
  });

  await prisma.materielDefectueux.createMany({
    data: [
      { kks_equipement: '10MBA30CP002', description: 'Fuite mineure huile de graissage palier 4', zone: 'tg', date_declaration: new Date('2026-07-01'), statut: 'ouvert' },
      { kks_equipement: '10MKA10AA010', description: 'Ventilateur auxiliaire n°1 bruit anormal au démarrage', zone: 'auxiliaires', date_declaration: new Date('2026-06-20'), date_cloture: new Date('2026-06-28'), statut: 'cloture' },
    ],
    skipDuplicates: true,
  });

  console.log('Données de démonstration créées pour le', JOUR);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
