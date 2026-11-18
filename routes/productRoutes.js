const express = require("express");
const {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
} = require("../controllers/productController");
const { protect, adminOnly } = require("../middleware/auth");

const router = express.Router();

// Routes publiques
router.get("/", getProducts);
router.get("/:id", getProduct);

// Routes protégées : JWT (ou OAuth2) obligatoire + droits admin (désactivable via REQUIRE_ADMIN)
router.post("/", protect, adminOnly, createProduct);
router.put("/:id", protect, adminOnly, updateProduct);
router.delete("/:id", protect, adminOnly, deleteProduct);

module.exports = router;
