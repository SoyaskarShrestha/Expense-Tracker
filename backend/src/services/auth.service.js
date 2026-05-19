import jwt from 'jsonwebtoken';

export function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET || 'change-this-in-production',
    { expiresIn: '7d' }
  );
}
