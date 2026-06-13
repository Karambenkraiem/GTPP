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
import messagesRouter from './routes/messages';
import { startReleveCron } from './cron';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173', credentials: true }));
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
app.use('/api/messages', messagesRouter);

app.get('/api/health', (_, res) => res.json({ status: 'ok', time: new Date(), v: 2 }));

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

async function ensureMessagesTable() {
  // Create enum type_message and messages table if they don't exist yet.
  // This is a safety net in case prisma db push didn't run or partially failed.
  try {
    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        CREATE TYPE type_message AS ENUM ('consigne', 'information', 'alerte');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        contenu TEXT NOT NULL,
        type type_message NOT NULL DEFAULT 'information',
        is_epingle BOOLEAN NOT NULL DEFAULT FALSE,
        auteur_id UUID NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
        cree_le TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
      );
    `);
    console.log('✓ Table messages prête');
  } catch (e) {
    console.error('⚠ ensureMessagesTable failed:', e);
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
    await ensureMessagesTable();
  } catch (e) {
    console.error('ensureMessagesTable failed:', e);
  }
  try {
    startReleveCron();
  } catch (e) {
    console.error('cron failed:', e);
  }
});

export default app;
