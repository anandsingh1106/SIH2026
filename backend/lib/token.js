import jwt from 'jsonwebtoken';

const JWT_EXPIRES_IN = '7d';
export const COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export function signToken(user) {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured');
  }
  return jwt.sign({ sub: user.id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
}

export function verifyToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET);
}
