import { Router } from 'express';
import prisma from '../lib/prisma';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/journee/:journeeId', async (req, res) => {
  try {
    const manouvres = await prisma.manouvre.findMany({
      where: { journee_id: req.params.journeeId },
      include: { saiseur: { select: { nom: true, prenom: true } } },
      orderBy: { heure_manouvre: 'asc' },
    });
    res.json(manouvres);
  } catch {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { journee_id, poste_id, heure_manouvre, description, type_manouvre, feuille_numero } = req.body;
    const manouvre = await prisma.manouvre.create({
      data: {
        journee_id,
        poste_id,
        saisi_par: req.user!.userId,
        heure_manouvre: new Date(heure_manouvre),
        description,
        type_manouvre,
        feuille_numero: feuille_numero || 1,
      },
      include: { saiseur: { select: { nom: true, prenom: true } } },
    });
    res.status(201).json(manouvre);
  } catch {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { heure_manouvre, description, type_manouvre, feuille_numero } = req.body;
    const manouvre = await prisma.manouvre.update({
      where: { id: req.params.id },
      data: {
        heure_manouvre: heure_manouvre ? new Date(heure_manouvre) : undefined,
        description,
        type_manouvre,
        feuille_numero,
      },
    });
    res.json(manouvre);
  } catch {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await prisma.manouvre.delete({ where: { id: req.params.id } });
    res.json({ message: 'Manœuvre supprimée' });
  } catch {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;
