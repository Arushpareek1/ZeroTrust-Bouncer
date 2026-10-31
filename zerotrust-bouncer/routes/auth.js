
const express = require("express");
const crypto = require("crypto");
const geoip = require("geoip-lite");
const loginLimiter = require("../middleware/rateLimiter");
const { verify } = require("otplib");

const router = express.Router();

const users = [];
const challenges = new Map();

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
    const hash = crypto.scryptSync(password, salt, 64).toString("hex");
    return { salt, hash };
}

// REGISTER
router.post("/register", (req, res) => {
    const { username, password } = req.body;

    if (
        typeof username !== "string" ||
        !username.trim() ||
        typeof password !== "string" ||
        password.length < 8
    ) {
        return res.status(400).json({
            success: false,
            message: "Valid username and password of at least 8 characters required."
        });
    }

    if (users.some(u => u.username === username)) {
        return res.status(409).json({
            success: false,
            message: "Username already exists."
        });
    }

    const credentials = hashPassword(password);

    users.push({
        id: users.length + 1,
        username,
        ...credentials
    });

    res.status(201).json({
        success: true,
        message: "Registration successful!"
    });
});

// LOGIN
router.post("/login", loginLimiter, (req, res) => {
    const { username, password } = req.body;

    if (typeof username !== "string" || typeof password !== "string") {
        return res.status(400).json({
            success: false,
            message: "Username and password required."
        });
    }

    const user = users.find(u => u.username === username);

    if (!user) {
        return res.status(401).json({
            success: false,
            message: "Invalid username or password."
        });
    }

    const attemptedHash = crypto.scryptSync(password, user.salt, 64);
    const storedHash = Buffer.from(user.hash, "hex");

    if (!crypto.timingSafeEqual(attemptedHash, storedHash)) {
        return res.status(401).json({
            success: false,
            message: "Invalid username or password."
        });
    }

    // DEMO RISK ENGINE
    let riskScore = 0;
    const reasons = [];

    const userAgent = req.headers["user-agent"] || "";

    if (!userAgent) {
        riskScore += 15;
        reasons.push("Browser information unavailable");
    }

    const geo = geoip.lookup(req.ip);

    if (!geo) {
        riskScore += 15;
        reasons.push("IP location unavailable");
    }

    let decision = "ALLOW";

    if (riskScore >= 50) {
        decision = "BLOCK";
    } else if (riskScore >= 25) {
        decision = "REQUIRE_2FA";
    }

    if (decision === "BLOCK") {
        return res.status(403).json({
            success: false,
            message: "Access denied by risk engine.",
            security: { riskScore, decision, reasons }
        });
    }

    if (decision === "REQUIRE_2FA") {
        const challengeId = crypto.randomBytes(24).toString("hex");

        challenges.set(challengeId, {
            userId: user.id,
            expiresAt: Date.now() + 5 * 60 * 1000
        });

        return res.status(200).json({
            success: false,
            requires2FA: true,
            challengeId,
            message: "Additional verification required.",
            security: { riskScore, decision, reasons }
        });
    }

    res.json({
        success: true,
        message: "Login successful!",
        security: { riskScore, decision, reasons },
        user: { id: user.id, username: user.username }
    });
});

// COMPLETE LOGIN WITH OTP
router.post("/login/verify-2fa", async (req, res) => {
    try {
        const { challengeId, token } = req.body;

        if (
            typeof challengeId !== "string" ||
            typeof token !== "string" ||
            !/^\d{6}$/.test(token)
        ) {
            return res.status(400).json({
                success: false,
                message: "Valid challenge and six-digit OTP required."
            });
        }

        const challenge = challenges.get(challengeId);

        if (!challenge || challenge.expiresAt < Date.now()) {
            challenges.delete(challengeId);

            return res.status(401).json({
                success: false,
                message: "Challenge expired or invalid. Please log in again."
            });
        }

        const user = users.find(u => u.id === challenge.userId);

        if (!user || !user.twoFactorSecret) {
            return res.status(400).json({
                success: false,
                message: "Set up 2FA before completing this challenge."
            });
        }

        const result = await verify({
            secret: user.twoFactorSecret,
            token
        });

        if (!result.valid) {
            return res.status(401).json({
                success: false,
                message: "Invalid or expired OTP."
            });
        }

        challenges.delete(challengeId);

        res.json({
            success: true,
            message: "Login and 2FA verification successful!",
            user: {
                id: user.id,
                username: user.username
            }
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: "2FA login verification failed."
        });
    }
});

module.exports = {
    router,
    users
};
