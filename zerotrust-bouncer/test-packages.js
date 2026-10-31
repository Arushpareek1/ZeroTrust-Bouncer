const zxcvbn = require("zxcvbn");
const { generateSecret } = require("otplib");
const UAParser = require("ua-parser-js");
const geoip = require("geoip-lite");
const rateLimit = require("express-rate-limit");
const express = require("express");

console.log("All packages imported successfully!");

const passwordResult = zxcvbn("example-password-123");
console.log("Password strength score:", passwordResult.score);

const secret = generateSecret();
console.log("TOTP secret generated:", Boolean(secret));

const parser = new UAParser(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
);

console.log("Browser:", parser.getBrowser().name);
console.log("Operating system:", parser.getOS().name);

console.log("Geolocation module loaded:", typeof geoip.lookup);
console.log("Rate limiter loaded:", typeof rateLimit);
console.log("Express loaded:", typeof express);