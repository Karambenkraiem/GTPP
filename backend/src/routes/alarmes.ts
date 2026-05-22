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
    res.json(alarmes);
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
