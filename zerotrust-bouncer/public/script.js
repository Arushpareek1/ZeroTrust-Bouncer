
const authForm = document.getElementById("auth-form");
const loginTab = document.getElementById("login-tab");
const registerTab = document.getElementById("register-tab");

let currentMode = "login";

function showMessage(elementId, message, isError = false) {
    const element = document.getElementById(elementId);
    element.textContent = message;
    element.style.color = isError ? "#ff647c" : "#48e0d0";
}

function setMode(mode) {
    currentMode = mode;

    loginTab.classList.toggle("active", mode === "login");
    registerTab.classList.toggle("active", mode === "register");

    document.getElementById("auth-title").textContent =
        mode === "login" ? "Welcome back" : "Create your account";

    document.getElementById("auth-subtitle").textContent =
        mode === "login"
            ? "Authenticate to access your dashboard."
            : "Register to get started with ZeroTrust.";

    document.getElementById("auth-submit").textContent =
        mode === "login" ? "SECURE LOGIN →" : "CREATE ACCOUNT →";

    document.getElementById("password-meter").classList.toggle(
        "hidden", mode === "login"
    );

    showMessage("auth-message", "");
}

loginTab.addEventListener("click", () => setMode("login"));
registerTab.addEventListener("click", () => setMode("register"));

const passwordInput = document.getElementById("password");

passwordInput.addEventListener("input", async () => {
    if (currentMode !== "register") return;

    const password = passwordInput.value;

    if (!password) {
        document.getElementById("meter-fill").style.width = "0%";
        document.getElementById("meter-label").textContent = "Password strength";
        return;
    }

    try {
        const response = await fetch("/api/password-strength", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ password })
        });

        const data = await response.json();

        if (response.ok) {
            const score = Number(data.score ?? data.strength ?? 0);
            const percentage = Math.min(100, Math.max(0, score * 25));

            document.getElementById("meter-fill").style.width =
                percentage + "%";

            document.getElementById("meter-label").textContent =
                data.feedback?.warning ||
                data.message ||
                "Password strength checked";
        }
    } catch {
        document.getElementById("meter-label").textContent =
            "Strength check unavailable";
    }
});

authForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const username = document.getElementById("username").value.trim();
    const password = passwordInput.value;

    const endpoint = currentMode === "login"
        ? "/api/login"
        : "/api/register";

    const button = document.getElementById("auth-submit");
    button.disabled = true;
    button.textContent = "PLEASE WAIT...";

    try {
        const response = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

if (!response.ok || !data.success) {
    if (data.security) {
        const decision = data.security.decision;

        showMessage(
            "auth-message",
            `${data.message} Risk score: ${data.security.riskScore}/100 | Decision: ${decision}`,
            true
        );
    } else {
        showMessage("auth-message", data.message || "Request failed.", true);
    }

    return;
}

        if (currentMode === "register") {
            showMessage("auth-message", "Registration successful! You can now log in.");
            setMode("login");
            return;
        }

        showDashboard(username, data.security || {});
    } catch (error) {
        showMessage("auth-message", "Cannot connect to server. Check that it is running.", true);
    } finally {
        button.disabled = false;
        button.textContent =
            currentMode === "login" ? "SECURE LOGIN →" : "CREATE ACCOUNT →";
    }
});

function showDashboard(username, security) {
    document.getElementById("auth-section").classList.add("hidden");
    document.getElementById("dashboard").classList.remove("hidden");

    document.getElementById("display-user").textContent = username;

    const score = Number(security.riskScore ?? 0);
    const decision = security.decision || "ALLOW";

    document.getElementById("risk-score").innerHTML =
        `${score}<small>/100</small>`;

    const decisionElement = document.getElementById("decision");
    decisionElement.textContent = decision;

    decisionElement.style.color =
        decision === "BLOCK" ? "#ff647c" :
        decision === "REQUIRE_2FA" ? "#ffc56a" : "#54e6a5";

    const reasons = security.reasons || [];
    const reasonsContainer = document.getElementById("risk-reasons");
    reasonsContainer.replaceChildren();

    if (reasons.length === 0) {
        const item = document.createElement("p");
        item.className = "muted";
        item.textContent = "No risk factors reported.";
        reasonsContainer.appendChild(item);
    } else {
        reasons.forEach(reason => {
            const item = document.createElement("div");
            item.className = "reason-item";
            item.textContent = "⚠ " + reason;
            reasonsContainer.appendChild(item);
        });
    }

    loadDeviceInfo();
    loadLocationInfo();

    if (decision === "BLOCK") {
        showMessage("twofa-message", "Your demo risk result is BLOCK. Do not treat this dashboard as an authorization grant.", true);
    }
}

async function loadDeviceInfo() {
    try {
        const response = await fetch("/api/device-info");
        const data = await response.json();

        document.getElementById("browser-info").textContent =
            data.browser || data.browserName || "Available in browser";

        document.getElementById("os-info").textContent =
            data.os || data.osName || navigator.platform || "Unknown";

        document.getElementById("device-info").textContent =
            data.device || data.deviceType || "Desktop / Unknown";
    } catch {
        document.getElementById("browser-info").textContent = "Unavailable";
        document.getElementById("os-info").textContent = navigator.platform;
        document.getElementById("device-info").textContent = "Unknown";
    }
}

async function loadLocationInfo() {
    try {
        const response = await fetch("/api/location");
        const data = await response.json();

        document.getElementById("ip-info").textContent =
            data.ip || "Unavailable";

        document.getElementById("location-info").textContent =
            data.city
                ? `${data.city}, ${data.country || ""}`
                : "Location unavailable";
    } catch {
        document.getElementById("ip-info").textContent = "Unavailable";
        document.getElementById("location-info").textContent = "Unavailable";
    }
}

document.getElementById("setup-2fa").addEventListener("click", async () => {
    try {
        const response = await fetch("/api/2fa/setup");
        const data = await response.json();

        if (!response.ok || !data.success) {
            showMessage("twofa-message", data.message || "2FA setup failed.", true);
            return;
        }

        document.getElementById("twofa-area").classList.remove("hidden");

        const qr = data.qrCode || data.qr;
        if (qr) {
            document.getElementById("qr-image").src = qr;
        } else {
            document.getElementById("qr-image").classList.add("hidden");
        }

        document.getElementById("twofa-secret").textContent =
            data.secret ? "Demo secret: " + data.secret : "";

        showMessage("twofa-message", "Scan the QR code with an authenticator app.");
    } catch {
        showMessage("twofa-message", "Could not connect to the 2FA endpoint.", true);
    }
});

document.getElementById("verify-form").addEventListener("submit", async (event) => {
    event.preventDefault();

    const token = document.getElementById("otp").value.trim();

    try {
        const response = await fetch("/api/2fa/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token })
        });

        const data = await response.json();

        showMessage(
            "twofa-message",
            data.message || (data.verified ? "2FA verified!" : "Invalid code."),
            !response.ok || !data.success || data.verified === false
        );
    } catch {
        showMessage("twofa-message", "Verification request failed.", true);
    }
});

document.getElementById("logout-btn").addEventListener("click", () => {
    document.getElementById("dashboard").classList.add("hidden");
    document.getElementById("auth-section").classList.remove("hidden");

    authForm.reset();
    setMode("login");
    showMessage("auth-message", "You have left the demo dashboard.");
});
