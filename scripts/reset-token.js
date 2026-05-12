const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const tokenPath = path.join(root, ".phone-token");
const token = crypto.randomBytes(18).toString("base64url");

fs.writeFileSync(tokenPath, `${token}\n`, { mode: 0o600 });

console.log("Rotated Ocdex Lite phone token.");
console.log(`Token file: ${tokenPath}`);
console.log("Restart the bridge, then open the newly printed URL from your phone.");
