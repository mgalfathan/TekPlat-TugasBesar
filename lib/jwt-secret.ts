const fallbackSecret = 'the-gaffer-dev-secret-only';

export function getJwtSecret(): Uint8Array {
  const base64Secret = process.env.JWT_SECRET_BASE64;
  if (base64Secret) {
    const decoded = atob(base64Secret);
    return Uint8Array.from(decoded, char => char.charCodeAt(0));
  }

  return new TextEncoder().encode(process.env.JWT_SECRET ?? fallbackSecret);
}

export function hasConfiguredJwtSecret(): boolean {
  return Boolean(process.env.JWT_SECRET_BASE64 || process.env.JWT_SECRET);
}
