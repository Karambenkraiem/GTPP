import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import bcrypt from 'bcryptjs';
import prisma from './lib/prisma';

import authRouter from './routes/auth';
import usersRouter from './routes/users';
import journeesRouter from './routes/journees';
import postesRouter from './routes/postes';
import relevesRouter from './routes/releves';
import manouvresRouter from './routes/manouvres';
import alarmesRouter from './routes/alarmes';
import otRouter from './routes/ot';
import defautsRouter from './routes/defauts';
import dashboardRouter from './routes/dashboard';
import rapportRouter from './routes/rapport';
import { startReleveCron } from './cron';

const app = express();
const PORT = process.env.PORT || 3001;

const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim());

app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) callback(null, true);
    else callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/journees', journeesRouter);
app.use('/api/postes', postesRouter);
app.use('/api/releves', relevesRouter);
app.use('/api/manouvres', manouvresRouter);
app.use('/api/alarmes', alarmesRouter);
app.use('/api/ot', otRouter);
app.use('/api/defauts', defautsRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/rapport', rapportRouter);

app.get('/api/health', (_, res) => res.json({ status: 'ok', time: new Date() }));

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: 'Erreur interne du serveur' });
});

async function seedAdmin() {
  const count = await prisma.utilisateur.count();
  if (count === 0) {
    const hash = await bcrypt.hash('Admin@GTpp2024', 10);
    await prisma.utilisateur.create({
      data: {
        nom: 'Admin',
        prenom: 'Système',
        matricule: 'ADMIN001',
        role: 'admin',
        mot_de_passe_hash: hash,
      },
    });
    console.log('✓ Utilisateur admin créé : ADMIN001 / Admin@GTpp2024');
  }
}

app.listen(PORT, async () => {
  console.log(`GTpp backend démarré sur le port ${PORT}`);
  try {
    await seedAdmin();
  } catch (e) {
    console.error('seedAdmin failed (DB pas encore prête ?):', e);
  }
  try {
    startReleveCron();
  } catch (e) {
    console.error('cron failed:', e);
  }
});

export default app;
