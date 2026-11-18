const mongoose = require("mongoose");

// Catégories utilisées par le frontend (filtre de la boutique)
const CATEGORIES = ["Diagnostic", "Mobilier", "Instruments", "Consommables"];

// Modèle Produit : name, description, price, category, imageUrl, stock
// (+ oldPrice et badge, déjà utilisés par le design du frontend)
const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Le nom du produit est obligatoire"],
      trim: true,
      maxlength: 150,
    },
    description: {
      type: String,
      required: [true, "La description est obligatoire"],
      trim: true,
      maxlength: 1000,
    },
    price: {
      type: Number,
      required: [true, "Le prix est obligatoire"],
      min: [0, "Le prix ne peut pas être négatif"],
    },
    oldPrice: {
      type: Number,
      min: [0, "L'ancien prix ne peut pas être négatif"],
      default: null,
    },
    category: {
      type: String,
      required: [true, "La catégorie est obligatoire"],
      enum: {
        values: CATEGORIES,
        message: `Catégorie invalide (valeurs possibles : ${CATEGORIES.join(", ")})`,
      },
    },
    imageUrl: {
      type: String,
      required: [true, "L'URL de l'image est obligatoire"],
      trim: true,
    },
    stock: {
      type: Number,
      required: [true, "Le stock est obligatoire"],
      min: [0, "Le stock ne peut pas être négatif"],
      validate: {
        validator: Number.isInteger,
        message: "Le stock doit être un nombre entier",
      },
    },
    badge: {
      type: String,
      trim: true,
      default: "",
      maxlength: 30,
    },
  },
  { timestamps: true }
);

productSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model("Product", productSchema);
module.exports.CATEGORIES = CATEGORIES;
