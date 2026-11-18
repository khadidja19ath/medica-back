const mongoose = require("mongoose");

// Modèle Utilisateur : le mot de passe n'est JAMAIS stocké en clair (seulement le hash bcrypt)
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Le nom est obligatoire"],
      trim: true,
      minlength: [2, "Le nom doit contenir au moins 2 caractères"],
      maxlength: 80,
    },
    email: {
      type: String,
      required: [true, "L'e-mail est obligatoire"],
      unique: true, // empêche les doublons (erreur 11000 => 409)
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false, // jamais renvoyé par défaut dans les requêtes
    },
    // Rôle simple : "user" (client) ou "admin" (gestion des produits)
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
  },
  { timestamps: true }
);

// Nettoyage de la réponse JSON : on retire les champs techniques
userSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.passwordHash;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model("User", userSchema);
