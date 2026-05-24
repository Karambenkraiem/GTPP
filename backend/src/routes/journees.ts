import { Router } from 'express';
import prisma from '../lib/prisma';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/', async (req, res) => {
  try {
    const { from, to } = req.query;
    const where: any = {};
    if (from || to) {
      where.jour = {};
      if (from) where.jour.gte = new Date(from as string);
      if (to) where.jour.lte = new Date(to as string);
    }
    const journees = await prisma.journee.findMany({
      where,
      orderBy: { jour: 'desc' },
      include: {
        postes: { include: { chefQuart: { select: { nom: true, prenom: true } } } },
        _count: { select: { releves_bloc: true, manouvres: true, alarmes: true, ordres_travaux: true } },
      },
      take: 30,
    });
    res.json(journees);
  } catch {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.get('/today', async (req, res) => {
  try {
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
    const today = new Date(todayStr + 'T00:00:00.000Z');
    let journee = await prisma.journee.findUnique({
      where: { jour: today },
      include: {
        postes: {
          include: {
            chefQuart: { select: { nom: true, prenom: true } },
            chefBloc: { select: { nom: true, prenom: true } },
            operateur1: { select: { nom: true, prenom: true } },
            operateur2: { select: { nom: true, prenom: true } },
          },
        },
        compteurs: true,
        _count: { select: { releves_bloc: true, manouvres: true, alarmes: true, ordres_travaux: true } },
      },
    });
    if (!journee) {
      journee = await prisma.journee.create({
        data: { jour: today },
        include: {
          postes: true,
          compteurs: true,
          _count: { select: { releves_bloc: true, manouvres: true, alarmes: true, ordres_travaux: true } },
        },
      });
    }
    res.json(journee);
  } catch {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const journee = await prisma.journee.findUnique({
      where: { id: req.params.id },
      include: {
        postes: {
          include: {
            chefQuart: { select: { id: true, nom: true, prenom: true } },
            chefBloc: { select: { id: true, nom: true, prenom: true } },
            operateur1: { select: { id: true, nom: true, prenom: true } },
            operateur2: { select: { id: true, nom: true, prenom: true } },
          },
        },
        compteurs: true,
        _count: { select: { releves_bloc: true, manouvres: true, alarmes: true, ordres_travaux: true } },
      },
    });
    if (!journee) return res.status(404).json({ error: 'Journée non trouvée' });
    res.json(journee);
  } catch {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { jour, consignes_permanentes } = req.body;
    const journee = await prisma.journee.create({
      data: { jour: new Date(jour), consignes_permanentes },
    });
    res.status(201).json(journee);
  } catch (err: any) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'Journée déjà existante pour cette date' });
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { consignes_permanentes } = req.body;
    const journee = await prisma.journee.update({
      where: { id: req.params.id },
      data: { consignes_permanentes },
    });
    res.json(journee);
  } catch {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.post('/:id/valider-bloc', requireRole('chef_bloc', 'admin'), async (req, res) => {
  try {
    const journee = await prisma.journee.update({
      where: { id: req.params.id },
      data: { statut: 'valide_bloc', valide_bloc_par: req.user!.userId, valide_bloc_le: new Date() },
    });
    res.json(journee);
  } catch {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.post('/:id/valider-quart', requireRole('chef_quart', 'chef_exploitation', 'admin'), async (req, res) => {
  try {
    const journee = await prisma.journee.update({
      where: { id: req.params.id },
      data: { statut: 'valide_quart', valide_quart_par: req.user!.userId, valide_quart_le: new Date() },
    });
    res.json(journee);
  } catch {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.post('/:id/transmettre', requireRole('chef_exploitation', 'admin'), async (req, res) => {
  try {
    const journee = await prisma.journee.update({
      where: { id: req.params.id },
      data: { statut: 'transmis', transmis_le: new Date() },
    });
    res.json(journee);
  } catch {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;
