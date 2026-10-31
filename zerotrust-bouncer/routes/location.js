const express = require("express");
const geoip = require("geoip-lite");

const router = express.Router();

router.get("/location", (req, res) => {
    const ip = req.query.ip || req.ip;

    const geo = geoip.lookup(ip);

    if (!geo) {
        return res.json({
            success: true,
            found: false,
            message: "Location information unavailable for this IP."
        });
    }

    res.json({
        success: true,
        found: true,
        ip: ip,
        country: geo.country,
        region: geo.region,
        city: geo.city,
        timezone: geo.timezone,
        coordinates: {
            latitude: geo.ll[0],
            longitude: geo.ll[1]
        }
    });
});

module.exports = router;