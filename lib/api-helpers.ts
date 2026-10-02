// Validation email et rate limiting pour les API routes

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function isValidEmail(email: unknown): email is string {
  return typeof email === "string" && EMAIL_REGEX.test(email) && email.length <= 254;
}

// Rate limiter en mémoire (par IP, réinitialisé au redémarrage du serveur)
// Suffisant pour bloquer les abus sans dépendance externe
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

const RATE_LIMIT_MAX = 10;      // max requêtes par fenêtre
const RATE_LIMIT_WINDOW = 60_000; // fenêtre de 60 secondes

// `key` identifie le compteur (ex. "promo:1.2.3.4") pour que chaque route ait le sien
export function checkRateLimit(key: string, max: number = RATE_LIMIT_MAX): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return { allowed: true, remaining: max - 1 };
  }

  if (entry.count >= max) {
    return { allowed: false, remaining: 0 };
  }

  entry.count++;
  return { allowed: true, remaining: max - entry.count };
}

export function getClientIp(req: Request): string {
  return (
    (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() ||
    "unknown"
  );
}
