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
        saiseur: { select: { nom: true, prenom: true } },
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
        saiseur: { select: { nom: true, prenom: true } },
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

    const releve = await prisma.relevesChefBloc.create({
      data: {
        ...main,
        journee_id,
        poste_id,
        saisi_par: req.user!.userId,
        heure_releve: new Date(heure_releve),
        ...(generateur && { generateur: { create: generateur } }),
        ...(huile && { huile: { create: huile } }),
        ...(vibrations && { vibrations: { create: vibrations } }),
        ...(echappement && { echappement: { create: echappement } }),
        ...(metal_blanc && { metal_blanc: { create: metal_blanc } }),
      },
      include: { generateur: true, huile: true, vibrations: true, echappement: true, metal_blanc: true },
    });
    res.status(201).json(releve);
  } catch (err: any) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'Un relevé existe déjà pour cette heure' });
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.put('/bloc/:id', async (req, res) => {
  try {
    const { generateur, huile, vibrations, echappement, metal_blanc, ...main } = req.body;

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

// ===== RELEVES OPERATEUR =====

router.get('/operateur/journee/:journeeId', async (req, res) => {
  try {
    const releves = await prisma.relevesOperateur.findMany({
      where: { journee_id: req.params.journeeId },
      include: { saiseur: { select: { nom: true, prenom: true } } },
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
      include: { saiseur: { select: { nom: true, prenom: true } } },
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
    const releve = await prisma.relevesOperateur.update({
      where: { id: req.params.id },
      data: req.body,
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
    const compteurs = await prisma.compteursJournaliers.upsert({
      where: { journee_id },
      create: { journee_id, ...data },
      update: data,
    });
    res.json(compteurs);
  } catch {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;
