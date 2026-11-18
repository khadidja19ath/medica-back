// Remplit la base avec des produits d'exemple et crée le compte admin.
// Usage : npm run seed
require("dotenv").config();
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const connectDB = require("./config/db");
const Product = require("./models/Product");
const User = require("./models/User");

const img = (id) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=900&q=85`;

const products = [
  { name: "Tensiomètre électronique professionnel", category: "Diagnostic", price: 18500, oldPrice: 22000, badge: "Populaire", imageUrl: img("1585435557343-3b092031a831"), stock: 25, description: "Un tensiomètre électronique conçu pour une mesure simple et fiable de la pression artérielle en milieu médical." },
  { name: "Oxymètre de pouls digital", category: "Diagnostic", price: 6200, badge: "", imageUrl: img("1584982751601-97dcc096659c"), stock: 40, description: "Un appareil compact pour mesurer la saturation en oxygène et la fréquence du pouls." },
  { name: "Stéthoscope double pavillon", category: "Instruments", price: 8900, badge: "Nouveau", imageUrl: img("1612531386530-97286d97c2d2"), stock: 30, description: "Stéthoscope polyvalent destiné à l'auscultation dans les cabinets et établissements de santé." },
  { name: "Lampe d'examen médical LED", category: "Mobilier", price: 34500, badge: "", imageUrl: img("1584515933487-779824d29309"), stock: 12, description: "Lampe d'examen à éclairage LED pour faciliter les examens médicaux." },
  { name: "Thermomètre infrarouge", category: "Diagnostic", price: 7400, oldPrice: 8900, badge: "Offre", imageUrl: img("1583947215259-38e31be8751f"), stock: 50, description: "Thermomètre sans contact pour une prise de température rapide." },
  { name: "Fauteuil d'examen médical", category: "Mobilier", price: 128000, badge: "", imageUrl: img("1629909613654-28e377c37b09"), stock: 5, description: "Fauteuil d'examen adapté à l'aménagement d'un cabinet médical." },
  { name: "Kit d'instruments de diagnostic", category: "Instruments", price: 15600, badge: "", imageUrl: img("1584982751601-97dcc096659c"), stock: 18, description: "Kit de base pour les examens et contrôles médicaux courants." },
  { name: "Masques médicaux - boîte de 50", category: "Consommables", price: 950, badge: "", imageUrl: img("1584634731339-252c581abfc5"), stock: 200, description: "Boîte de masques médicaux à usage unique pour les environnements de soins." },
];

async function seed() {
  await connectDB();

  // Produits : on repart d'une collection propre
  await Product.deleteMany({});
  await Product.insertMany(products);
  console.log(`${products.length} produits insérés`);

  // Compte admin (identifiants lus dans .env, jamais écrits dans le code)
  const email = (process.env.ADMIN_EMAIL || "").toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password || password === "replace_with_a_strong_password") {
    console.log("ADMIN_EMAIL / ADMIN_PASSWORD non définis dans .env : compte admin non créé");
  } else {
    const passwordHash = await bcrypt.hash(password, 10);
    await User.findOneAndUpdate(
      { email },
      { name: process.env.ADMIN_NAME || "Administrateur", email, passwordHash, role: "admin" },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
    );
    console.log(`Compte admin prêt : ${email}`);
  }

  await mongoose.disconnect();
}

seed().catch((error) => {
  console.error("Erreur du seed :", error.message);
  process.exit(1);
});
