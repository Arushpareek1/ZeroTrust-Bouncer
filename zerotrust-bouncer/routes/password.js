const express = require("express");
const zxcvbn = require("zxcvbn");

const router = express.Router();

router.post("/password-strength", (req, res) => {
    const { password } = req.body;

    if (typeof password !== "string" || password.length === 0) {
        return res.status(400).json({
            success: false,
            message: "Please provide a password."
        });
    }

    const result = zxcvbn(password);

    res.json({
        success: true,
        score: result.score,
        feedback: {
            warning: result.feedback.warning,
            suggestions: result.feedback.suggestions
        }
    });
});

module.exports = router;