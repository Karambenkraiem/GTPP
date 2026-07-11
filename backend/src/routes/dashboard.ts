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
          generateur: {
            select: {
              puissance_active_mw: true,
              puissance_reactive_mvar: true,
              frequence_hz: true,
              cos_phi: true,
              tension_alt_dvx_kv: true,
              tension_svlx_kv: true,
            },
          },
          echappement: { select: { ttxm_moyenne: true, spread_calcule: true, ttxspl_ecart: true } },
          vibrations: { select: { vibration_maxi: true } },
        },
      }),
    ]);

    const dayOfWeek = today.getUTCDay(); // 0=dimanche .. 6=samedi
    const mondayOffset = (dayOfWeek + 6) % 7;
    const monday = new Date(today.getTime() - mondayOffset * 24 * 3600 * 1000);
    const endOfSunday = new Date(monday.getTime() + 7 * 24 * 3600 * 1000 - 1);

    const puissance7Jours = await prisma.relevesChefBloc.findMany({
      where: { heure_releve: { gte: monday, lte: endOfSunday } },
      select: {
        heure_releve: true,
        generateur: { select: { puissance_active_mw: true } },
      },
      orderBy: { heure_releve: 'asc' },
    });

    const incidentsAujourdhui = journeeAujourdhui
      ? await prisma.manouvre.count({ where: { journee_id: journeeAujourdhui.id, type_manouvre: 'incident' } })
      : 0;

    res.json({
      journeeAujourdhui,
      defautsActifs,
      otsEnCours,
      dernierReleve,
      puissance7Jours,
      incidentsAujourdhui,
    });
  } catch {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;
