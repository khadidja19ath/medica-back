const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Génère un JWT signé avec le secret stocké dans .env
function signToken(user) {
  return jwt.sign({ id: user._id.toString(), role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "2h",
  });
}

// POST /api/auth/register : création d'un compte
async function register(req, res) {
  const { name, email, password } = req.body || {};
  const errors = [];

  // Validation des champs obligatoires
  if (typeof name !== "string" || name.trim().length < 2) errors.push("Le nom est obligatoire (2 caractères minimum)");
  if (typeof email !== "string" || !EMAIL_REGEX.test(email.trim())) errors.push("Une adresse e-mail valide est obligatoire");
  if (typeof password !== "string" || password.length < 8) errors.push("Le mot de passe est obligatoire (8 caractères minimum)");

  if (errors.length > 0) {
    return res.status(400).json({ success: false, message: "Données invalides", errors });
  }

  // Un e-mail ne peut servir qu'à un seul compte
  const normalizedEmail = email.trim().toLowerCase();
  if (await User.findOne({ email: normalizedEmail })) {
    return res.status(409).json({ success: false, message: "Un compte existe déjà avec cet e-mail" });
  }

  // Hash du mot de passe (jamais de stockage en clair)
  const passwordHash = await bcrypt.hash(password, 10);

  // Le rôle n'est pas lu depuis la requête : un nouveau compte est toujours "user"
  const user = await User.create({ name, email: normalizedEmail, passwordHash });

  res.status(201).json({ success: true, message: "Compte créé avec succès", user });
}

// POST /api/auth/login : vérifie les identifiants et renvoie un JWT
async function login(req, res) {
  const { email, password } = req.body || {};

  if (typeof email !== "string" || typeof password !== "string" || !email || !password) {
    return res.status(400).json({ success: false, message: "E-mail et mot de passe obligatoires" });
  }

  // passwordHash est en select:false, on le demande explicitement
  const user = await User.findOne({ email: email.trim().toLowerCase() }).select("+passwordHash");
  const valid = user ? await bcrypt.compare(password, user.passwordHash) : false;

  // Même message dans les deux cas pour ne pas révéler si l'e-mail existe
  if (!valid) {
    return res.status(401).json({ success: false, message: "E-mail ou mot de passe incorrect" });
  }

  res.status(200).json({ success: true, token: signToken(user), user });
}

// GET /api/auth/me : renvoie l'utilisateur connecté (route protégée)
async function me(req, res) {
  res.status(200).json({ success: true, user: req.user });
}

module.exports = { register, login, me };
