const mongoose = require("mongoose");
const Product = require("../models/Product");

// Seuls ces champs peuvent être envoyés par le client (évite l'injection de champs)
const ALLOWED_FIELDS = ["name", "description", "price", "oldPrice", "category", "imageUrl", "stock", "badge"];

function pickFields(body) {
  const data = {};
  for (const field of ALLOWED_FIELDS) {
    if (body && body[field] !== undefined) data[field] = body[field];
  }
  return data;
}

// Vérifie que l'ID est un ObjectId MongoDB valide, sinon 400
function invalidId(id, res) {
  if (!mongoose.isValidObjectId(id)) {
    res.status(400).json({ success: false, message: "Identifiant de produit invalide" });
    return true;
  }
  return false;
}

// GET /api/products : liste de tous les produits (public)
async function getProducts(_req, res) {
  const products = await Product.find().sort({ createdAt: 1 });
  res.status(200).json({ success: true, count: products.length, products });
}

// GET /api/products/:id : un produit (public)
async function getProduct(req, res) {
  if (invalidId(req.params.id, res)) return;

  const product = await Product.findById(req.params.id);
  if (!product) return res.status(404).json({ success: false, message: "Produit introuvable" });

  res.status(200).json({ success: true, product });
}

// POST /api/products : création (JWT requis)
async function createProduct(req, res) {
  const product = await Product.create(pickFields(req.body)); // validation par Mongoose
  res.status(201).json({ success: true, message: "Produit créé", product });
}

// PUT /api/products/:id : modification (JWT requis)
async function updateProduct(req, res) {
  if (invalidId(req.params.id, res)) return;

  const product = await Product.findByIdAndUpdate(req.params.id, pickFields(req.body), {
    returnDocument: "after", // renvoie le document modifié
    runValidators: true, // applique les règles du modèle aussi à la mise à jour
  });
  if (!product) return res.status(404).json({ success: false, message: "Produit introuvable" });

  res.status(200).json({ success: true, message: "Produit mis à jour", product });
}

// DELETE /api/products/:id : suppression (JWT requis)
async function deleteProduct(req, res) {
  if (invalidId(req.params.id, res)) return;

  const product = await Product.findByIdAndDelete(req.params.id);
  if (!product) return res.status(404).json({ success: false, message: "Produit introuvable" });

  res.status(200).json({ success: true, message: "Produit supprimé" });
}

module.exports = { getProducts, getProduct, createProduct, updateProduct, deleteProduct };
