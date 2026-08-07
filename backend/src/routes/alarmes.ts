import { Router } from 'express';
import prisma from '../lib/prisma';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/journee/:journeeId', async (req, res) => {
  try {
    const alarmes = await prisma.alarme.findMany({
      where: { journee_id: req.params.journeeId },
      orderBy: { heure: 'asc' },
    });

    // Date de première apparition : la même alarme répétitive est recopiée chaque
    // jour (nouvelle ligne), donc on cherche la plus ancienne occurrence partageant
    // le même tag (ou la même désignation si pas de tag), tous journées confondues.
    const tags = alarmes.filter(a => a.tag).map(a => a.tag as string);
    const designationsSansTag = alarmes.filter(a => !a.tag).map(a => a.designation);

    const candidats = (tags.length || designationsSansTag.length)
      ? await prisma.alarme.findMany({
          where: {
            OR: [
              ...(tags.length ? [{ tag: { in: tags } }] : []),
              ...(designationsSansTag.length ? [{ tag: null, designation: { in: designationsSansTag } }] : []),
            ],
          },
          select: { tag: true, designation: true, journee: { select: { jour: true } } },
          orderBy: { journee: { jour: 'asc' as const } },
        })
      : [];

    const premiereApparition = new Map<string, Date>();
    for (const c of candidats) {
      const cle = c.tag || c.designation;
      if (!premiereApparition.has(cle)) premiereApparition.set(cle, c.journee.jour);
    }

    const result = alarmes.map(a => ({
      ...a,
      premiere_apparition: premiereApparition.get(a.tag || a.designation) ?? null,
    }));

    res.json(result);
  } catch {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { journee_id, poste_id, tag, designation, heure, origine, repetitive } = req.body;
    const alarme = await prisma.alarme.create({
      data: {
        journee_id,
        poste_id,
        tag,
        designation,
        heure: heure ? new Date(heure) : undefined,
        origine: origine || 'HMI',
        repetitive: repetitive || false,
      },
    });
    res.status(201).json(alarme);
  } catch {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { tag, designation, heure, origine, repetitive } = req.body;
    const alarme = await prisma.alarme.update({
      where: { id: req.params.id },
      data: {
        tag,
        designation,
        heure: heure ? new Date(heure) : undefined,
        origine,
        repetitive,
      },
    });
    res.json(alarme);
  } catch {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await prisma.alarme.delete({ where: { id: req.params.id } });
    res.json({ message: 'Alarme supprimée' });
  } catch {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;
