const express = require("express");
const { register, login, me } = require("../controllers/authController");
const { protect } = require("../middleware/auth");
const { loginLimiter } = require("../middleware/rateLimiter");

const router = express.Router();

router.post("/register", register);
router.post("/login", loginLimiter, login); // limite stricte : 5 requêtes / 15 min
router.get("/me", protect, me);

module.exports = router;
