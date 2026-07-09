import { Router } from 'express';
import prisma from '../lib/prisma';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// ===== RELEVES CHEF DE BLOC =====

router.get('/bloc/journee/:journeeId', async (req, res) => {
  try {
    const releves = await prisma.relevesChefBloc.findMany({
      where: { journee_id: req.params.journeeId },
      include: {
        saiseur: { select: { nom: true, prenom: true, matricule: true } },
        generateur: true,
        huile: true,
        vibrations: true,
        echappement: true,
        metal_blanc: true,
      },
      orderBy: { heure_releve: 'asc' },
    });
    res.json(releves);
  } catch {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.get('/bloc/:id', async (req, res) => {
  try {
    const releve = await prisma.relevesChefBloc.findUnique({
      where: { id: req.params.id },
      include: {
        saiseur: { select: { nom: true, prenom: true, matricule: true } },
        generateur: true,
        huile: true,
        vibrations: true,
        echappement: true,
        metal_blanc: true,
      },
    });
    if (!releve) return res.status(404).json({ error: 'Relevé non trouvé' });
    res.json(releve);
  } catch {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.post('/bloc', async (req, res) => {
  try {
    const { journee_id, poste_id, heure_releve, generateur, huile, vibrations, echappement, metal_blanc, ...main } = req.body;

    // Strip empty sub-objects to avoid creating useless DB rows
    const hasValues = (obj: any) => obj && typeof obj === 'object' && Object.values(obj).some(v => v !== null && v !== undefined && v !== '');

    const releve = await prisma.relevesChefBloc.create({
      data: {
        ...main,
        journee_id,
        poste_id,
        saisi_par: req.user!.userId,
        heure_releve: new Date(heure_releve),
        ...(hasValues(generateur) && { generateur: { create: generateur } }),
        ...(hasValues(huile) && { huile: { create: huile } }),
        ...(hasValues(vibrations) && { vibrations: { create: vibrations } }),
        ...(hasValues(echappement) && { echappement: { create: echappement } }),
        ...(hasValues(metal_blanc) && { metal_blanc: { create: metal_blanc } }),
      },
      include: { generateur: true, huile: true, vibrations: true, echappement: true, metal_blanc: true },
    });
    res.status(201).json(releve);
  } catch (err: any) {
    console.error('[POST /bloc]', err);
    if (err.code === 'P2002') return res.status(409).json({ error: 'Un relevé existe déjà pour cette heure' });
    res.status(500).json({ error: err.message ?? 'Erreur serveur' });
  }
});

router.put('/bloc/:id', async (req, res) => {
  try {
    const { id, journee_id, cree_le, synced, saiseur, journee, poste, heure_releve,
            generateur, huile, vibrations, echappement, metal_blanc, ...rest } = req.body;
    const main = { ...rest, saisi_par: req.user!.userId, heure_releve: new Date(heure_releve) };

    const releve = await prisma.relevesChefBloc.update({
      where: { id: req.params.id },
      data: {
        ...main,
        ...(generateur && {
          generateur: {
            upsert: { create: generateur, update: generateur },
          },
        }),
        ...(huile && { huile: { upsert: { create: huile, update: huile } } }),
        ...(vibrations && { vibrations: { upsert: { create: vibrations, update: vibrations } } }),
        ...(echappement && { echappement: { upsert: { create: echappement, update: echappement } } }),
        ...(metal_blanc && { metal_blanc: { upsert: { create: metal_blanc, update: metal_blanc } } }),
      },
      include: { generateur: true, huile: true, vibrations: true, echappement: true, metal_blanc: true },
    });
    res.json(releve);
  } catch {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.delete('/bloc/:id', async (req, res) => {
  try {
    await prisma.relevesChefBloc.delete({ where: { id: req.params.id } });
    res.json({ message: 'Relevé supprimé' });
  } catch {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ===== VUE COMBINÉE DU JOUR =====

router.get('/jour/:date', async (req, res) => {
  try {
    const jourDate = new Date(`${req.params.date}T00:00:00.000Z`);

    const journee = await prisma.journee.findUnique({ where: { jour: jourDate } });
    if (!journee) return res.json({ bloc: [], operateur: [] });

    const [bloc, operateur] = await Promise.all([
      prisma.relevesChefBloc.findMany({
        where: { journee_id: journee.id },
        include: {
          saiseur: { select: { nom: true, prenom: true, matricule: true } },
          generateur: true,
          echappement: true,
          vibrations: true,
          huile: true,
          metal_blanc: true,
        },
        orderBy: { heure_releve: 'asc' },
      }),
      prisma.relevesOperateur.findMany({
        where: { journee_id: journee.id },
        include: { saiseur: { select: { nom: true, prenom: true, matricule: true } } },
        orderBy: { heure_releve: 'asc' },
      }),
    ]);

    res.json({ bloc, operateur });
  } catch {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ===== RELEVES OPERATEUR =====

router.get('/operateur/journee/:journeeId', async (req, res) => {
  try {
    const releves = await prisma.relevesOperateur.findMany({
      where: { journee_id: req.params.journeeId },
      include: { saiseur: { select: { nom: true, prenom: true, matricule: true } } },
      orderBy: { heure_releve: 'asc' },
    });
    res.json(releves);
  } catch {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.get('/operateur/:id', async (req, res) => {
  try {
    const releve = await prisma.relevesOperateur.findUnique({
      where: { id: req.params.id },
      include: { saiseur: { select: { nom: true, prenom: true, matricule: true } } },
    });
    if (!releve) return res.status(404).json({ error: 'Relevé non trouvé' });
    res.json(releve);
  } catch {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.post('/operateur', async (req, res) => {
  try {
    const { journee_id, poste_id, heure_releve, ...rest } = req.body;
    const releve = await prisma.relevesOperateur.create({
      data: {
        ...rest,
        journee_id,
        poste_id,
        saisi_par: req.user!.userId,
        heure_releve: new Date(heure_releve),
      },
    });
    res.status(201).json(releve);
  } catch (err: any) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'Un relevé existe déjà pour cette heure' });
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.put('/operateur/:id', async (req, res) => {
  try {
    // Strip non-updatable fields and Prisma relation objects sent by the frontend
    const { id, journee_id, cree_le, synced, saiseur, journee, poste, heure_releve, ...rest } = req.body;
    const releve = await prisma.relevesOperateur.update({
      where: { id: req.params.id },
      data: {
        ...rest,
        saisi_par: req.user!.userId,
        heure_releve: new Date(heure_releve),
      },
      include: { saiseur: { select: { nom: true, prenom: true, matricule: true } } },
    });
    res.json(releve);
  } catch {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.delete('/operateur/:id', async (req, res) => {
  try {
    await prisma.relevesOperateur.delete({ where: { id: req.params.id } });
    res.json({ message: 'Relevé supprimé' });
  } catch {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ===== COMPTEURS JOURNALIERS =====

// Chaque compteur cumulatif est relevé à des heures fixes dans la journée ; la valeur
// ne doit jamais reculer d'un relevé au suivant (un compteur ne fait qu'avancer).
const COUNTER_SEQUENCES: string[][] = [
  ['energie_active_00h', 'energie_active_07h', 'energie_active_18h', 'energie_active_22h', 'energie_active_24h'],
  ['reactif_fourni_00h', 'reactif_fourni_07h', 'reactif_fourni_18h', 'reactif_fourni_22h', 'reactif_fourni_24h'],
  ['reactif_absorbe_00h', 'reactif_absorbe_07h', 'reactif_absorbe_18h', 'reactif_absorbe_22h', 'reactif_absorbe_24h'],
  ['auxiliaires_00h', 'auxiliaires_07h', 'auxiliaires_18h', 'auxiliaires_22h', 'auxiliaires_24h'],
  ['gasoil_00h_l', 'gasoil_07h_l', 'gasoil_18h_l', 'gasoil_22h_l', 'gasoil_24h_l'],
  ['gaz_00h_nm3', 'gaz_24h_nm3'],
  ['h_flamme_00h', 'h_flamme_24h'],
  ['h_pms_00h', 'h_pms_24h'],
  ['h_gaz_00h', 'h_gaz_24h'],
  ['h_gasoil_00h', 'h_gasoil_24h'],
  ['dem_manuel_00h', 'dem_manuel_24h'],
  ['dem_total_00h', 'dem_total_24h'],
  ['dem_rapide_00h', 'dem_rapide_24h'],
  ['allumage_00h', 'allumage_24h'],
  ['declenchement_00h', 'declenchement_24h'],
];

// [champ 24h du jour, champ 00h du lendemain] — sert au report automatique et à la
// vérification de continuité (le 00h du jour ne doit pas reculer par rapport au 24h de la veille).
const CARRY: [string, string][] = COUNTER_SEQUENCES.map(seq => [seq[seq.length - 1], seq[0]]);

function toNum(v: any): number {
  return typeof v === 'object' && v !== null && typeof v.toString === 'function' ? Number(v.toString()) : Number(v);
}

/** Retourne un message d'erreur pour le premier recul détecté parmi les champs touchés par cette saisie, sinon null. */
function findCounterRegression(merged: Record<string, any>, touchedFields: Set<string>): string | null {
  for (const seq of COUNTER_SEQUENCES) {
    let prevField: string | null = null;
    let prevVal: number | null = null;
    for (const field of seq) {
      const raw = merged[field];
      if (raw == null) continue;
      const val = toNum(raw);
      if (prevVal != null && val < prevVal && (touchedFields.has(field) || (prevField && touchedFields.has(prevField)))) {
        return `Le compteur "${field}" (${val}) ne peut pas être inférieur à "${prevField}" (${prevVal}) : un compteur ne peut pas reculer.`;
      }
      prevVal = val;
      prevField = field;
    }
  }
  return null;
}

router.get('/compteurs/:journeeId', async (req, res) => {
  try {
    const compteurs = await prisma.compteursJournaliers.findUnique({
      where: { journee_id: req.params.journeeId },
    });
    res.json(compteurs);
  } catch {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.post('/compteurs', async (req, res) => {
  try {
    const { journee_id, ...data } = req.body;
    const touchedFields = new Set(Object.keys(data));

    const existing = await prisma.compteursJournaliers.findUnique({ where: { journee_id } });
    const merged = { ...(existing || {}), ...data };

    const regression = findCounterRegression(merged, touchedFields);
    if (regression) {
      return res.status(400).json({ error: regression });
    }

    const journee = await prisma.journee.findUnique({ where: { id: journee_id } });

    // Continuité avec la veille : le 00h du jour ne doit pas être inférieur au 24h précédent.
    if (journee) {
      const prevDay = new Date(journee.jour);
      prevDay.setUTCDate(prevDay.getUTCDate() - 1);
      const prevJournee = await prisma.journee.findUnique({ where: { jour: prevDay } });
      if (prevJournee) {
        const prevCompteurs = await prisma.compteursJournaliers.findUnique({ where: { journee_id: prevJournee.id } });
        if (prevCompteurs) {
          for (const [from24h, to00h] of CARRY) {
            if (!touchedFields.has(to00h)) continue;
            const prevVal = (prevCompteurs as any)[from24h];
            const curVal = merged[to00h];
            if (prevVal != null && curVal != null && toNum(curVal) < toNum(prevVal)) {
              return res.status(400).json({
                error: `Le compteur "${to00h}" (${toNum(curVal)}) ne peut pas être inférieur au "${from24h}" de la veille (${toNum(prevVal)}).`,
              });
            }
          }
        }
      }
    }

    const compteurs = await prisma.compteursJournaliers.upsert({
      where: { journee_id },
      create: { journee_id, ...data },
      update: data,
    });

    // Reporter les valeurs 24h → 00h de la journée suivante
    if (journee) {
      const nextDay = new Date(journee.jour);
      nextDay.setUTCDate(nextDay.getUTCDate() + 1);
      const nextJournee = await prisma.journee.findUnique({ where: { jour: nextDay } });
      if (nextJournee) {
        const carry: Record<string, any> = {};
        for (const [from, to] of CARRY) {
          if (data[from] != null) carry[to] = data[from];
        }
        if (Object.keys(carry).length > 0) {
          await prisma.compteursJournaliers.upsert({
            where: { journee_id: nextJournee.id },
            create: { journee_id: nextJournee.id, ...carry },
            update: carry,
          });
        }
      }
    }

    res.json(compteurs);
  } catch (err: any) {
    console.error('[POST /compteurs]', err);
    res.status(500).json({ error: err.message ?? 'Erreur serveur' });
  }
});

export default router;
