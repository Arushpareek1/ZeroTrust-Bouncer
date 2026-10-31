
const express = require("express");

const passwordRoutes = require("./routes/password");
const twoFactorRoutes = require("./routes/twoFactor");
const deviceRoutes = require("./routes/device");
const locationRoutes = require("./routes/location");
const riskRoutes = require("./routes/risk");
const { router: authRoutes } = require("./routes/auth");

const loginLimiter = require("./middleware/rateLimiter");

const app = express();
const PORT = 3000;

const path = require("path");

app.use(express.json());

app.use(express.static(path.join(__dirname, "public")));

// API routes
app.use("/api", passwordRoutes);
app.use("/api", twoFactorRoutes);
app.use("/api", deviceRoutes);
app.use("/api", locationRoutes);
app.use("/api", riskRoutes);
app.use("/api", authRoutes);

app.get("/check-public", (req, res) => {
    const fs = require("fs");

    const publicPath = path.join(__dirname, "public");

    res.json({
        publicFolderExists: fs.existsSync(publicPath),
        indexExists: fs.existsSync(path.join(publicPath, "index.html")),
        publicPath: publicPath
    });
});

// Health check
app.get("/health", (req, res) => {
    res.json({
        status: "OK",
        message: "ZeroTrust Bouncer backend is running!",
        timestamp: new Date()
    });
});

// Rate limiter test route
app.get("/api/limited-test", loginLimiter, (req, res) => {
    res.json({
        success: true,
        message: "Request accepted! Rate limiter is working."
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`ZeroTrust Bouncer running at http://localhost:${PORT}`);
});
