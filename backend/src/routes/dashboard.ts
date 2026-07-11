import { Router } from 'express';
import prisma from '../lib/prisma';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/', async (req, res) => {
  try {
    const { date } = req.query;
    let todayStr: string;
    if (date && typeof date === 'string') {
      todayStr = date;
    } else {
      const now = new Date();
      todayStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
    }
    const today = new Date(todayStr + 'T00:00:00.000Z');

    const [journeeAujourdhui, defautsActifs, otsEnCours, dernierReleve] = await Promise.all([
      prisma.journee.findUnique({
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
      where: { jour: { gte: new Date(today.getTime() - 6 * 24 * 3600 * 1000), lte: today } },
      include: { compteurs: true },
      orderBy: { jour: 'asc' },
    });

    const incidentsAujourdhui = journeeAujourdhui
      ? await prisma.manouvre.count({ where: { journee_id: journeeAujourdhui.id, type_manouvre: 'incident' } })
      : 0;

    res.json({
      journeeAujourdhui,
      defautsActifs,
      otsEnCours,
      dernierReleve,
      derniers7Jours,
      incidentsAujourdhui,
    });
  } catch {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;
