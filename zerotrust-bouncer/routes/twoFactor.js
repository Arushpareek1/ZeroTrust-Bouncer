const express = require("express");
const QRCode = require("qrcode");
const {
    generateSecret,
    generateURI,
    verify
} = require("otplib");

const router = express.Router();
const { users } = require("./auth");

router.get("/2fa/setup", async (req, res) => {
    try {
        const username = req.query.username;

        const user = users.find(u => u.username === username);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found."
            });
        }

        const secret = generateSecret();

        const otpauth = generateURI({
            issuer: "ZeroTrust Bouncer",
            label: username,
            secret
        });

        const qrCode = await QRCode.toDataURL(otpauth);

        user.twoFactorSecret = secret;

        res.json({
            success: true,
            qrCode,
            message: "Scan the QR code with your authenticator app."
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: "Could not generate 2FA setup."
        });
    }
});

router.post("/2fa/verify", async (req, res) => {
    try {
        const { token } = req.body;

        if (!demoSecret) {
            return res.status(400).json({
                success: false,
                message: "Please complete 2FA setup first."
            });
        }

        if (typeof token !== "string" || !/^\d{6}$/.test(token)) {
            return res.status(400).json({
                success: false,
                message: "Enter a valid 6-digit OTP."
            });
        }

        const result = await verify({
            secret: demoSecret,
            token: token
        });

        res.json({
            success: true,
            verified: result.valid,
            message: result.valid
                ? "2FA verification successful!"
                : "Invalid or expired OTP."
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: "OTP verification failed."
        });
    }
});

router.get("/2fa-demo", async (req, res) => {
    try {
        if (!demoSecret) {
            return res.status(400).send("Generate a 2FA secret first.");
        }

        const otpauth = generateURI({
            issuer: "ZeroTrust Bouncer",
            label: "demo-user",
            secret: demoSecret
        });

        const qrCode = await QRCode.toDataURL(otpauth);

        res.send(`
            <html>
                <body style="font-family: Arial; text-align: center;">
                    <h2>ZeroTrust Bouncer - 2FA Setup</h2>
                    <p>Scan this QR code using a TOTP authenticator app.</p>
                    <img src="${qrCode}" width="250" />
                </body>
            </html>
        `);

    } catch (error) {
        res.status(500).send("Could not display QR code.");
    }
});

module.exports = router;