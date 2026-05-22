import { Router } from 'express';
import prisma from '../lib/prisma';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [journeeAujourdhui, defautsActifs, otsEnCours, dernierReleve] = await Promise.all([
      prisma.journee.findUnique({
        where: { jour: today },
        include: {
          postes: {
            include: {
              chefQuart: { select: { nom: true, prenom: true } },
              chefBloc: { select: { nom: true, prenom: true } },
            },
          },
          compteurs: true,
          _count: { select: { releves_bloc: true, manouvres: true, alarmes: true } },
        },
      }),
      prisma.materielDefectueux.count({ where: { date_cloture: null } }),
      prisma.ordreTravaux.count({ where: { etat: 'en_cours' } }),
      prisma.relevesChefBloc.findFirst({
        orderBy: { heure_releve: 'desc' },
        include: {
          generateur: { select: { puissance_active_mw: true, frequence_hz: true } },
          echappement: { select: { ttxm_moyenne: true, spread_calcule: true } },
          vibrations: { select: { vibration_maxi: true } },
        },
      }),
    ]);

    const derniers7Jours = await prisma.journee.findMany({
      where: { jour: { gte: new Date(Date.now() - 7 * 24 * 3600 * 1000) } },
      include: { compteurs: true },
      orderBy: { jour: 'asc' },
    });

    res.json({
      journeeAujourdhui,
      defautsActifs,
      otsEnCours,
      dernierReleve,
      derniers7Jours,
    });
  } catch {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;
