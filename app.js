const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const authRoutes = require("./routes/authRoutes");
const productRoutes = require("./routes/productRoutes");
const { apiLimiter } = require("./middleware/rateLimiter");
const { notFound, errorHandler } = require("./middleware/errorHandler");

// Fonction qui construit l'application Express (séparée de server.js pour faciliter les tests)
function createApp() {
  const app = express();

  app.use(helmet());

  // CORS : autorise l'origine du frontend React (Vite : http://localhost:5173)
  const origins = (process.env.CLIENT_URL || "http://localhost:5173").split(",").map((o) => o.trim());
  app.use(cors({ origin: origins }));

  app.use(express.json({ limit: "1mb" }));

  // Route de santé (hors rate limit) pour vérifier que l'API tourne
  app.get("/api/health", (_req, res) => res.json({ success: true, message: "API MediEquip opérationnelle" }));

  // Limite générale appliquée à toutes les routes /api
  app.use("/api", apiLimiter);

  app.use("/api/auth", authRoutes);
  app.use("/api/products", productRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

module.exports = createApp;
