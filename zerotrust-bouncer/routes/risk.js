
const express = require("express");
const geoip = require("geoip-lite");

const router = express.Router();

router.post("/risk-check", (req, res) => {
    const { ip, knownDevice, failedAttempts, twoFactorVerified } = req.body;

    let riskScore = 0;
    const reasons = [];

    // Check device recognition
    if (knownDevice === false) {
        riskScore += 25;
        reasons.push("Unrecognized device");
    }

    // Check failed login attempts
    if (failedAttempts >= 3) {
        riskScore += 30;
        reasons.push("Multiple failed login attempts");
    }

    // Check IP location
    if (typeof ip === "string") {
        const geo = geoip.lookup(ip);

        if (!geo) {
            riskScore += 15;
            reasons.push("IP location unavailable");
        }
    }

    // Check two-factor authentication
    if (twoFactorVerified === false) {
        riskScore += 30;
        reasons.push("Two-factor authentication not completed");
    }

    let decision = "ALLOW";

    if (riskScore >= 50) {
        decision = "BLOCK";
    } else if (riskScore >= 25) {
        decision = "REQUIRE_2FA";
    }

    res.json({
        success: true,
        riskScore,
        decision,
        reasons
    });
});

module.exports = router;
