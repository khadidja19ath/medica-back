const jwt = require("jsonwebtoken");
const User = require("../models/User");
const verifyGoogleToken = require("../utils/googleOAuth");

// Extrait le jeton de l'en-tête  Authorization: Bearer <TOKEN>
function extractToken(req) {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");
  return scheme === "Bearer" && token ? token : null;
}

// Middleware "protect" : accepte un JWT de l'application OU un jeton OAuth2 Google.
// Sans jeton valide => 401.
async function protect(req, res, next) {
  const token = extractToken(req);

  if (!token) {
    return res.status(401).json({ success: false, message: "Authentification requise : jeton manquant" });
  }

  // 1) JWT émis par notre API (login)
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.id);
    if (!user) {
      return res.status(401).json({ success: false, message: "Utilisateur introuvable : jeton invalide" });
    }
    req.user = { id: user._id.toString(), email: user.email, role: user.role, provider: "jwt" };
    return next();
  } catch {
    // jeton non valide pour notre secret : on essaie OAuth2 ci-dessous
  }

  // 2) Jeton OAuth2 Google (si GOOGLE_CLIENT_ID est configuré)
  const googleUser = await verifyGoogleToken(token);
  if (googleUser) {
    // Si l'e-mail correspond à un compte existant, on reprend son rôle
    const existing = await User.findOne({ email: googleUser.email });
    req.user = {
      id: existing ? existing._id.toString() : null,
      email: googleUser.email,
      role: existing ? existing.role : "user",
      provider: "google",
    };
    return next();
  }

  return res.status(401).json({ success: false, message: "Jeton invalide ou expiré" });
}

// Middleware "adminOnly" : à placer APRÈS protect.
// Désactivable avec REQUIRE_ADMIN=false (comportement strict de l'énoncé : JWT suffit).
function adminOnly(req, res, next) {
  if (process.env.REQUIRE_ADMIN === "false") return next();

  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ success: false, message: "Accès refusé : droits administrateur requis" });
  }
  next();
}

module.exports = { protect, adminOnly };
