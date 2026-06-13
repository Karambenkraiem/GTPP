import { Router } from 'express';
import prisma from '../lib/prisma';
import { authenticate, requireRole } from '../middleware/auth';

const ALLOWED_ROLES = ['chef_quart', 'chef_exploitation', 'chef_centrale', 'chef_maintenance', 'directeur', 'admin'];
const PIN_ROLES = ['chef_exploitation', 'chef_centrale', 'directeur', 'admin'];
const DELETE_ANY_ROLES = ['admin', 'chef_exploitation'];

const router = Router();
router.use(authenticate);
router.use(requireRole(...ALLOWED_ROLES));

router.get('/', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 150, 300);
    const messages = await prisma.message.findMany({
      take: limit,
      orderBy: { cree_le: 'asc' },
      include: {
        auteur: { select: { nom: true, prenom: true, role: true } },
      },
    });
    res.json(messages);
  } catch (err) {
    console.error('[messages GET /]', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.get('/count', async (req, res) => {
  try {
    const after = req.query.after ? new Date(req.query.after as string) : new Date(0);
    const count = await prisma.message.count({
      where: { cree_le: { gt: after } },
    });
    res.json({ count });
  } catch (err) {
    console.error('[messages GET /count]', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { contenu, type } = req.body as { contenu?: string; type?: string };
    if (!contenu?.trim()) {
      return res.status(400).json({ error: 'Le contenu est requis' });
    }
    const message = await prisma.message.create({
      data: {
        contenu: contenu.trim(),
        type: (type as 'consigne' | 'information' | 'alerte') || 'information',
        auteur_id: req.user!.userId,
      },
      include: {
        auteur: { select: { nom: true, prenom: true, role: true } },
      },
    });
    res.status(201).json(message);
  } catch (err) {
    console.error('[messages POST /]', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.put('/:id/epingle', requireRole(...PIN_ROLES), async (req, res) => {
  try {
    const existing = await prisma.message.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Message non trouvé' });
    const message = await prisma.message.update({
      where: { id: req.params.id },
      data: { is_epingle: !existing.is_epingle },
      include: { auteur: { select: { nom: true, prenom: true, role: true } } },
    });
    res.json(message);
  } catch (err) {
    console.error('[messages PUT /:id/epingle]', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const existing = await prisma.message.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Message non trouvé' });
    const canDelete =
      req.user!.userId === existing.auteur_id ||
      DELETE_ANY_ROLES.includes(req.user!.role);
    if (!canDelete) return res.status(403).json({ error: 'Accès refusé' });
    await prisma.message.delete({ where: { id: req.params.id } });
    res.json({ message: 'Message supprimé' });
  } catch (err) {
    console.error('[messages DELETE /:id]', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;
