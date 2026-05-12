const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const root = path.resolve(__dirname, "..");

function argValue(name, fallback = "") {
  const index = process.argv.indexOf(name);
  if (index === -1) return fallback;
  return process.argv[index + 1] || fallback;
}

function hasFlag(name) {
  return process.argv.includes(name);
}

function xmlEscape(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function shellQuote(value) {
  return `'${String(value).replace(/'/g, "'\\''")}'`;
}

const label = argValue("--label", "com.ocdex.lite");
const workdir = path.resolve(argValue("--workdir", process.cwd()));
const port = argValue("--port", process.env.PHONE_UI_PORT || "45214");
const model = argValue("--model", process.env.CODEX_MODEL || "");
const codexHome = path.resolve(argValue("--codex-home", process.env.CODEX_HOME || path.join(os.homedir(), ".codex")));
const tokenPath = path.join(root, ".phone-token");
const token =
  process.env.PHONE_TOKEN ||
  (fs.existsSync(tokenPath) ? fs.readFileSync(tokenPath, "utf8").trim() : crypto.randomBytes(18).toString("base64url"));
const launchAgentsDir = path.join(os.homedir(), "Library", "LaunchAgents");
const supportDir = path.join(os.homedir(), ".ocdex-lite");
const runScript = path.join(supportDir, `${label}.sh`);
const outLog = path.join(supportDir, `${label}.out.log`);
const errLog = path.join(supportDir, `${label}.err.log`);
const plistPath = path.join(launchAgentsDir, `${label}.plist`);

fs.mkdirSync(supportDir, { recursive: true, mode: 0o700 });
fs.mkdirSync(launchAgentsDir, { recursive: true });
if (!fs.existsSync(tokenPath)) fs.writeFileSync(tokenPath, `${token}\n`, { mode: 0o600 });

const envLines = [
  `export CODEX_HOME=${shellQuote(codexHome)}`,
  `export CODEX_WORKDIR=${shellQuote(workdir)}`,
  `export PHONE_UI_PORT=${shellQuote(port)}`,
  `export PHONE_TOKEN=${shellQuote(token)}`,
  "export CODEX_HISTORY_SYNC=${CODEX_HISTORY_SYNC:-0}",
  "export CODEX_THREAD_LIST_LIMIT=${CODEX_THREAD_LIST_LIMIT:-8}",
  "export CODEX_HISTORY_LIMIT=${CODEX_HISTORY_LIMIT:-30}",
  "export CODEX_HISTORY_SYNC_LIMIT=${CODEX_HISTORY_SYNC_LIMIT:-2}",
  "export CODEX_WS_MAX_PAYLOAD_MB=${CODEX_WS_MAX_PAYLOAD_MB:-64}",
  "export CODEX_UPLOAD_MAX_MB=${CODEX_UPLOAD_MAX_MB:-12}",
  'export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"',
];
if (model) envLines.splice(3, 0, `export CODEX_MODEL=${shellQuote(model)}`);

const script = `#!/usr/bin/env bash
set -euo pipefail

cd ${shellQuote(root)}
${envLines.join("\n")}

exec npm run phone
`;

fs.writeFileSync(runScript, script, { mode: 0o700 });

const plist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${xmlEscape(label)}</string>
  <key>ProgramArguments</key>
  <array>
    <string>${xmlEscape(runScript)}</string>
  </array>
  <key>WorkingDirectory</key>
  <string>${xmlEscape(root)}</string>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>StandardOutPath</key>
  <string>${xmlEscape(outLog)}</string>
  <key>StandardErrorPath</key>
  <string>${xmlEscape(errLog)}</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key>
    <string>/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin</string>
  </dict>
</dict>
</plist>
`;

fs.writeFileSync(plistPath, plist, { mode: 0o644 });

if (!hasFlag("--no-load")) {
  spawnSync("launchctl", ["bootout", `gui/${process.getuid()}`, plistPath], { stdio: "ignore" });
  const result = spawnSync("launchctl", ["bootstrap", `gui/${process.getuid()}`, plistPath], { encoding: "utf8" });
  if (result.status !== 0) {
    console.error(result.stderr || result.stdout || "launchctl bootstrap failed");
    process.exit(result.status || 1);
  }
  spawnSync("launchctl", ["kickstart", "-k", `gui/${process.getuid()}/${label}`], { stdio: "ignore" });
}

console.log("Installed Ocdex Lite LaunchAgent.");
console.log(`Label: ${label}`);
console.log(`Project: ${workdir}`);
console.log(`Plist: ${plistPath}`);
console.log(`Run script: ${runScript}`);
console.log(`URL path: /lite.html?token=${token}`);
