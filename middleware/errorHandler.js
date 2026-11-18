// Route inconnue => 404 au format JSON
function notFound(req, res) {
  res.status(404).json({ success: false, message: `Route introuvable : ${req.method} ${req.originalUrl}` });
}

// Gestion centralisée des erreurs : format toujours { success:false, message, errors? }
function errorHandler(err, _req, res, _next) {
  // JSON invalide dans le corps de la requête
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ success: false, message: "JSON invalide dans le corps de la requête" });
  }

  // Erreurs de validation Mongoose (champ manquant, valeur invalide...)
  if (err.name === "ValidationError") {
    const errors = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ success: false, message: "Données invalides", errors });
  }

  // ID MongoDB mal formé
  if (err.name === "CastError") {
    return res.status(400).json({ success: false, message: "Valeur ou identifiant invalide" });
  }

  // Doublon (index unique) => 409
  if (err.code === 11000) {
    return res.status(409).json({ success: false, message: "Cette valeur existe déjà (doublon)" });
  }

  console.error(err);
  res.status(500).json({ success: false, message: "Erreur interne du serveur" });
}

module.exports = { notFound, errorHandler };
