const mongoose = require("mongoose");

// Connexion à MongoDB via Mongoose
async function connectDB() {
  const uri = process.env.MONGODB_URI;

  if (!uri || uri === "your_mongodb_connection_string") {
    throw new Error("MONGODB_URI manquant : renseignez-le dans le fichier .env");
  }

  await mongoose.connect(uri);
  console.log(`MongoDB connecté : base "${mongoose.connection.name}"`);
}

module.exports = connectDB;
