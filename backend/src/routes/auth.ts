import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/login', async (req, res) => {
  try {
    const { matricule, password } = req.body;
    if (!matricule || !password) {
      return res.status(400).json({ error: 'Matricule et mot de passe requis' });
    }

    const user = await prisma.utilisateur.findUnique({ where: { matricule } });
    if (!user || !user.actif) {
      return res.status(401).json({ error: 'Identifiants incorrects' });
    }

    const valid = await bcrypt.compare(password, user.mot_de_passe_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Identifiants incorrects' });
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role, matricule: user.matricule, nom: user.nom, prenom: user.prenom },
      process.env.JWT_SECRET!,
      { expiresIn: '12h' }
    );

    res.json({
      token,
      user: { id: user.id, nom: user.nom, prenom: user.prenom, matricule: user.matricule, role: user.role },
    });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await prisma.utilisateur.findUnique({
      where: { id: req.user!.userId },
      select: { id: true, nom: true, prenom: true, matricule: true, role: true, actif: true },
    });
    if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' });
    res.json(user);
  } catch {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.put('/change-password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await prisma.utilisateur.findUnique({ where: { id: req.user!.userId } });
    if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' });

    const valid = await bcrypt.compare(currentPassword, user.mot_de_passe_hash);
    if (!valid) return res.status(400).json({ error: 'Mot de passe actuel incorrect' });

    if (newPassword.length < 6) return res.status(400).json({ error: 'Mot de passe trop court (min 6 caractères)' });

    const hash = await bcrypt.hash(newPassword, 10);
    await prisma.utilisateur.update({
      where: { id: req.user!.userId },
      data: { mot_de_passe_hash: hash, modifie_le: new Date() },
    });
    res.json({ message: 'Mot de passe modifié' });
  } catch {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;
