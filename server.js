require("dotenv").config();
const connectDB = require("./config/db");
const createApp = require("./app");

const PORT = process.env.PORT || 3000;

async function start() {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET === "replace_with_a_local_secret") {
    throw new Error("JWT_SECRET manquant ou non modifié : renseignez-le dans le fichier .env");
  }

  await connectDB();
  createApp().listen(PORT, "0.0.0.0", () => {
  console.log(`API MediEquip démarrée sur le port ${PORT}`);
});
}

start().catch((error) => {
  console.error("Échec du démarrage :", error.message);
  process.exit(1);
});
