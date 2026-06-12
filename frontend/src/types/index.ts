export type Role = 'operateur' | 'chef_bloc' | 'chef_quart' | 'chef_exploitation' | 'chef_centrale' | 'chef_maintenance' | 'directeur' | 'admin';
export type TrancheHoraire = 'h00_07h' | 'h07_14h' | 'h14_20h' | 'h20_00h';
export type StatutJournee = 'en_cours' | 'valide_bloc' | 'valide_quart' | 'transmis';
export type StatutPoste = 'en_cours' | 'termine' | 'valide';
export type TypeManouvre = 'exploitation' | 'entretien' | 'permutation' | 'agc' | 'incident';
export type EtatOT = 'en_cours' | 'termine' | 'reporte' | 'annule';
export type DisciplineOT = 'mec' | 'elec' | 'inst' | 'civil' | 'autre';
export type TypeMaintenance = 'curatif' | 'systematique' | 'preventif';
export type ZoneMateriel = 'site' | 'tg' | 'alternateur' | 'auxiliaires';
export type StatutDefaut = 'ouvert' | 'en_cours' | 'cloture';

export interface User {
  id: string;
  nom: string;
  prenom: string;
  matricule: string;
  role: Role;
  actif?: boolean;
}

export interface Journee {
  id: string;
  jour: string;
  statut: StatutJournee;
  consignes_permanentes?: string;
  valide_bloc_par?: string;
  valide_bloc_le?: string;
  valide_quart_par?: string;
  valide_quart_le?: string;
  transmis_le?: string;
  postes?: Poste[];
  compteurs?: CompteursJournaliers;
  _count?: { releves_bloc: number; manouvres: number; alarmes: number; ordres_travaux: number };
}

export interface Poste {
  id: string;
  journee_id: string;
  tranche: TrancheHoraire;
  debut: string;
  fin: string;
  chef_quart_id?: string;
  chef_bloc_id?: string;
  operateur1_id?: string;
  operateur2_id?: string;
  statut: StatutPoste;
  chefQuart?: { nom: string; prenom: string };
  chefBloc?: { nom: string; prenom: string };
  operateur1?: { nom: string; prenom: string };
  operateur2?: { nom: string; prenom: string };
}

export interface RelevesChefBloc {
  id: string;
  journee_id: string;
  poste_id: string;
  saisi_par: string;
  heure_releve: string;
  temp_ambiante_ctim?: number;
  pression_atm_afpap?: number;
  humidite_rhum?: number;
  vitesse_turbine_rpm?: number;
  position_tmgv_deg?: number;
  position_igv_deg?: number;
  tension_ligne_kv?: number;
  temp_gaz_ftg_tkg?: number;
  press_skid_gaz_fpgi?: number;
  press_refoul_cpd?: number;
  synced: boolean;
  saiseur?: { nom: string; prenom: string };
  generateur?: RelevesGenerateur;
  huile?: RelevesHuile;
  vibrations?: RelevesVibrations;
  echappement?: RelevesEchappement;
  metal_blanc?: RelevesMetalBlanc;
}

export interface RelevesGenerateur {
  puissance_active_mw?: number;
  puissance_reactive_mvar?: number;
  frequence_hz?: number;
  cos_phi?: number;
  tension_alt_dvx_kv?: number;
  tension_excitation_v?: number;
  courant_excitation_a?: number;
}

export interface RelevesHuile {
  niveau_bac_huile_mm?: number;
  pression_qap3_bar?: number;
  temp_collecteur_ltth?: number;
  temp_cuve1_ltot1?: number;
}

export interface RelevesVibrations {
  palier1_bb1?: number;
  palier1_bb2?: number;
  palier2_bb3?: number;
  palier2_bb4?: number;
  palier3_bb5?: number;
  palier4_bb10?: number;
  palier4_bb11?: number;
  vibration_maxi?: number;
}

export interface RelevesEchappement {
  ttxm_moyenne?: number;
  ttxspl_ecart?: number;
  spread_calcule?: number;
  [key: string]: number | undefined;
}

export interface RelevesMetalBlanc {
  [key: string]: number | undefined;
}

export interface RelevesOperateur {
  id: string;
  journee_id: string;
  poste_id: string;
  saisi_par: string;
  heure_releve: string;
  pression_refoul_pompe_bar?: number;
  temp_gaz_ftg_tkg?: number;
  pression_gaz_fpgi_bar?: number;
  niveau_huile_reservoir?: number;
  pression_air_comprime_bar?: number;
  saiseur?: { nom: string; prenom: string };
}

export interface CompteursJournaliers {
  id?: string;
  journee_id: string;
  energie_active_00h?: number;
  energie_active_24h?: number;
  puissance_max_mw?: number;
  h_flamme_00h?: number;
  h_flamme_24h?: number;
  gaz_00h_nm3?: number;
  gaz_24h_nm3?: number;
  gasoil_00h_l?: number;
  gasoil_24h_l?: number;
  dem_total_00h?: number;
  dem_total_24h?: number;
  declenchement_00h?: number;
  declenchement_24h?: number;
}

export interface Manouvre {
  id: string;
  journee_id: string;
  poste_id?: string;
  saisi_par: string;
  heure_manouvre: string;
  description: string;
  type_manouvre: TypeManouvre;
  feuille_numero: number;
  saiseur?: { nom: string; prenom: string };
}

export interface Alarme {
  id: string;
  journee_id: string;
  tag?: string;
  designation: string;
  heure?: string;
  origine: string;
  repetitive: boolean;
}

export interface OrdreTravaux {
  id: string;
  journee_id: string;
  numero_ot?: string;
  kks_equipement?: string;
  description: string;
  date_debut?: string;
  date_fin?: string;
  etat: EtatOT;
  discipline?: DisciplineOT;
  type_maintenance: TypeMaintenance;
  cree_le: string;
}

export interface MaterielDefectueux {
  id: string;
  kks_equipement: string;
  description: string;
  zone: ZoneMateriel;
  date_declaration: string;
  date_cloture?: string;
  commentaires?: string;
  statut: StatutDefaut;
  actif?: boolean;
}

export interface SeuilAlarme {
  id: string;
  parametre: string;
  valeur_min?: number;
  valeur_max?: number;
  unite?: string;
  description?: string;
  actif: boolean;
}

export const TRANCHE_LABELS: Record<TrancheHoraire, string> = {
  h00_07h: '00h — 07h',
  h07_14h: '07h — 14h',
  h14_20h: '14h — 20h',
  h20_00h: '20h — 00h',
};

export const ROLE_LABELS: Record<Role, string> = {
  operateur: 'Opérateur',
  chef_bloc: 'Chef de Bloc',
  chef_quart: 'Chef de Quart',
  chef_exploitation: 'Chef d\'Exploitation',
  chef_centrale: 'Chef de Centrale',
  chef_maintenance: 'Chef de Maintenance',
  directeur: 'Directeur',
  admin: 'Administrateur',
};

export const STATUT_JOURNEE_LABELS: Record<StatutJournee, string> = {
  en_cours: 'En cours',
  valide_bloc: 'Validée Bloc',
  valide_quart: 'Validée Quart',
  transmis: 'Transmise',
};

export const ZONE_LABELS: Record<ZoneMateriel, string> = {
  site: 'Site',
  tg: 'Turbine à Gaz',
  alternateur: 'Alternateur',
  auxiliaires: 'Auxiliaires',
};

export const TYPE_MANOUVRE_LABELS: Record<TypeManouvre, string> = {
  exploitation: 'Exploitation',
  entretien: 'Entretien',
  permutation: 'Permutation',
  agc: 'AGC',
  incident: 'Incident',
};

export const ETAT_OT_LABELS: Record<EtatOT, string> = {
  en_cours: 'En cours',
  termine: 'Terminé',
  reporte: 'Reporté',
  annule: 'Annulé',
};

export type TypeMessage = 'consigne' | 'information' | 'alerte';

export interface Message {
  id: string;
  contenu: string;
  type: TypeMessage;
  is_epingle: boolean;
  auteur_id: string;
  auteur: { nom: string; prenom: string; role: string };
  cree_le: string;
}
