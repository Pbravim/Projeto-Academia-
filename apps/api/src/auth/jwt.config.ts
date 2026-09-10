/** Boot check que vivia no construtor do JwtStrategy — não pode se perder na remoção do Passport. */
export function assertJwtSecret(): string {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('JWT_ACCESS_SECRET must be set and at least 32 chars');
  }
  return secret;
}
