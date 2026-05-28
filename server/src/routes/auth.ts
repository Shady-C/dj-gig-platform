import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { env } from '../config/env';
import User from '../models/User';
import { parseBody } from '../utils/validation';

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

async function ensureBootstrapAdmin() {
  const email = env.ADMIN_EMAIL.toLowerCase();
  const existing = await User.findOne({ email });
  if (existing) return existing;

  const passwordHash = await bcrypt.hash(env.ADMIN_PASSWORD, 12);
  return User.create({
    email,
    passwordHash,
    displayName: email.split('@')[0],
    role: 'admin',
  });
}

router.post('/login', async (req: Request, res: Response) => {
  const body = parseBody(loginSchema, req.body, res);
  if (!body) return;
  const { email, password } = body;

  const user =
    email.toLowerCase() === env.ADMIN_EMAIL.toLowerCase()
      ? await ensureBootstrapAdmin()
      : await User.findOne({ email: email.toLowerCase() });

  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  const token = jwt.sign(
    { sub: user._id.toString(), email: user.email, role: user.role },
    env.JWT_SECRET,
    {
      expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
    }
  );

  res.json({ token });
});

router.get('/me', async (req: Request, res: Response) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid Authorization header' });
    return;
  }

  try {
    const payload = jwt.verify(header.slice(7), env.JWT_SECRET) as {
      sub: string;
      email: string;
      role: string;
    };
    const user = await User.findById(payload.sub).select('email displayName role');
    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }
    res.json(user);
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
});

export default router;
