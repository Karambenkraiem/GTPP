import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const SEUILS_ALARME = [
  { parametre: 'spread_echappement', valeur_min: null, valeur_max: 50, unite: '°C', description: 'Ecart max entre thermocouples echappement' },
  { parametre: 'vibration_maxi', valeur_min: null, valeur_max: 25, unite: 'mm/s', description: 'Vibration maximale admissible paliers' },
  { parametre: 'temp_metal_blanc_max', valeur_min: null, valeur_max: 110, unite: '°C', description: 'Temperature metal blanc paliers' },
  { parametre: 'temp_inter_roue_ecart', valeur_min: null, valeur_max: 30, unite: '°C', description: 'Ecart temperature inter-roues' },
  { parametre: 'pression_gaz_min', valeur_min: 10, valeur_max: null, unite: 'bar', description: 'Pression gaz minimale skid' },
  { parametre: 'puissance_max_tg', valeur_min: null, valeur_max: 130, unite: 'MW', description: 'Puissance maximale turbine' },
];

const DEFAULT_PASSWORD = process.env.SEED_DEFAULT_PASSWORD || '123456';

const UTILISATEURS: { nom: string; prenom: string; matricule: string; role: string }[] = [
  { nom: 'Admin', prenom: 'Système', matricule: 'ADMIN001', role: 'admin' },
  { nom: 'MADDAR', prenom: 'Mourad', matricule: '60124', role: 'chef_quart' },
  { nom: 'CHERNI', prenom: 'Maher', matricule: '65666', role: 'chef_bloc' },
  { nom: 'OUERTATENI', prenom: 'Walid', matricule: '65789', role: 'operateur' },
  { nom: 'BEN KRAIEM', prenom: 'Karam', matricule: '62762', role: 'chef_quart' },
  { nom: 'ATTIYA', prenom: 'Nejmeddine', matricule: '59848', role: 'chef_bloc' },
  { nom: 'BOURAS', prenom: 'Slim', matricule: '71872', role: 'operateur' },
  { nom: 'OUNIS', prenom: 'Ismail', matricule: '60297', role: 'chef_quart' },
  { nom: 'KAROUI', prenom: 'Mohamed Beyram', matricule: '68388', role: 'chef_bloc' },
  { nom: 'RAJHI', prenom: 'Lamjed', matricule: '65764', role: 'operateur' },
  { nom: 'NEFZI', prenom: 'Oussama', matricule: '69504', role: 'chef_quart' },
  { nom: 'AYARI', prenom: 'Hassen', matricule: '70723', role: 'operateur' },
  { nom: 'DARGHOUTHI', prenom: 'Abdelghani', matricule: '60023', role: 'directeur' },
  { nom: 'FEKIH', prenom: 'Zied', matricule: '60111', role: 'chef_centrale' },
  { nom: 'BEN MANSOUR', prenom: 'Ali', matricule: '63164', role: 'chef_exploitation' },
  { nom: 'KHAMMASSI', prenom: 'Maher', matricule: '60999', role: 'operateur' },
  { nom: 'Center', prenom: 'MD Assistant', matricule: '60500', role: 'md_center_assistant' },
  { nom: 'JELASSI', prenom: 'Sami', matricule: '60600', role: 'chef_maintenance' },
];

async function main() {
  for (const seuil of SEUILS_ALARME) {
    await prisma.seuilAlarme.upsert({
      where: { parametre: seuil.parametre },
      update: {},
      create: seuil,
    });
  }
  console.log(`Seuils d'alarme: ${SEUILS_ALARME.length} vérifiés/créés.`);

  const hash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  for (const u of UTILISATEURS) {
    await prisma.utilisateur.upsert({
      where: { matricule: u.matricule },
      update: { nom: u.nom, prenom: u.prenom, role: u.role as any, mot_de_passe_hash: hash, modifie_le: new Date() },
      create: { ...u, role: u.role as any, mot_de_passe_hash: hash },
    });
  }
  console.log(`Utilisateurs: ${UTILISATEURS.length} créés/mis à jour. Mot de passe réinitialisé à: ${DEFAULT_PASSWORD}`);

  // Compte invité à accès rapide — toujours disponible, matricule/mot de passe fixes (00000/00000).
  const guestHash = await bcrypt.hash('00000', 10);
  await prisma.utilisateur.upsert({
    where: { matricule: '00000' },
    update: { nom: 'Invité', prenom: 'Accès rapide', role: 'guest', mot_de_passe_hash: guestHash, actif: true, modifie_le: new Date() },
    create: { nom: 'Invité', prenom: 'Accès rapide', matricule: '00000', role: 'guest', mot_de_passe_hash: guestHash },
  });
  console.log('Compte invité 00000/00000 vérifié/créé.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
