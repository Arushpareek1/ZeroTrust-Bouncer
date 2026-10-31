const express = require("express");
const { UAParser } = require("ua-parser-js");

const router = express.Router();

router.get("/device-info", (req, res) => {
    const userAgent = req.headers["user-agent"];

    const parser = new UAParser(userAgent);
    const result = parser.getResult();

    res.json({
        success: true,
        browser: {
            name: result.browser.name,
            version: result.browser.version
        },
        operatingSystem: {
            name: result.os.name,
            version: result.os.version
        },
        device: {
            type: result.device.type || "Desktop",
            vendor: result.device.vendor || "Unknown",
            model: result.device.model || "Unknown"
        }
    });
});

module.exports = router;