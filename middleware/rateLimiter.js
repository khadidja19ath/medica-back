const { rateLimit } = require("express-rate-limit");

// Les valeurs par défaut sont celles de l'énoncé, modifiables via .env
const windowMs = Number(process.env.RATE_LIMIT_WINDOW_MIN || 15) * 60 * 1000;

// Réponse 429 au même format que les autres erreurs de l'API
function handler(message) {
  return (_req, res) => res.status(429).json({ success: false, message });
}

// Limite générale : 100 requêtes / 15 min / IP sur toute l'API
const apiLimiter = rateLimit({
  windowMs,
  limit: Number(process.env.RATE_LIMIT_MAX || 100),
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler: handler("Trop de requêtes. Réessayez dans quelques minutes."),
});

// Limite stricte pour le login : 5 requêtes / 15 min / IP (anti brute-force)
const loginLimiter = rateLimit({
  windowMs,
  limit: Number(process.env.RATE_LIMIT_LOGIN_MAX || 5),
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler: handler("Trop de tentatives de connexion. Réessayez dans 15 minutes."),
});

module.exports = { apiLimiter, loginLimiter };
