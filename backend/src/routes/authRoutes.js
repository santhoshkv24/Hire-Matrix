const express = require("express");
const {
	login,
	registerApplicant,
	me,
	refresh,
} = require("../controllers/authController");
const { authenticate } = require("../middlewares/auth");

const router = express.Router();

router.post("/login", login);
router.post("/register-applicant", registerApplicant);
router.post("/refresh", refresh);
router.get("/me", authenticate, me);

module.exports = router;