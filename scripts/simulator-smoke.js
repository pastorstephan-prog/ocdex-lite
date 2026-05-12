const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const tokenPath = path.join(root, ".phone-token");
const port = process.env.PHONE_UI_PORT || "45214";
const token = process.env.PHONE_TOKEN || (fs.existsSync(tokenPath) ? fs.readFileSync(tokenPath, "utf8").trim() : "");
const outputDir = process.env.SIMULATOR_SCREENSHOT_DIR || "/tmp";

function run(command, args, options = {}) {
  return execFileSync(command, args, { encoding: "utf8", stdio: options.stdio || ["ignore", "pipe", "pipe"] });
}

function simctl(args, options) {
  return run("xcrun", ["simctl", ...args], options);
}

function availableDevices() {
  const raw = simctl(["list", "devices", "available", "--json"]);
  const data = JSON.parse(raw);
  return Object.values(data.devices || {}).flat();
}

function chooseDevice(devices, family, envName) {
  const requested = process.env[envName];
  if (requested) {
    const found = devices.find((device) => device.udid === requested);
    if (!found) throw new Error(`${envName}=${requested} was not found in available simulators`);
    return found;
  }
  return devices.find((device) => device.isAvailable && device.name.includes(family));
}

function boot(device) {
  if (!device) return;
  if (device.state !== "Booted") simctl(["boot", device.udid], { stdio: "ignore" });
  simctl(["bootstatus", device.udid, "-b"], { stdio: "ignore" });
}

function openUrl(device, url) {
  simctl(["openurl", device.udid, url], { stdio: "ignore" });
}

function screenshot(device, name) {
  const file = path.join(outputDir, `ocdex-${name}-${Date.now()}.png`);
  simctl(["io", device.udid, "screenshot", file], { stdio: "ignore" });
  return file;
}

function httpJson(url) {
  return JSON.parse(run("curl", ["-fsS", url]));
}

async function main() {
  if (!token) throw new Error("No PHONE_TOKEN or .phone-token found. Start Ocdex Lite once first.");
  const devices = availableDevices();
  const iphone = chooseDevice(devices, "iPhone", "IPHONE_SIMULATOR_UDID");
  const ipad = chooseDevice(devices, "iPad", "IPAD_SIMULATOR_UDID");
  if (!iphone && !ipad) throw new Error("No available iPhone or iPad simulator found.");

  const targets = [iphone, ipad].filter(Boolean);
  const url = `http://127.0.0.1:${port}/lite.html?token=${encodeURIComponent(token)}&light=1`;
  for (const device of targets) boot(device);
  for (const device of targets) openUrl(device, url);
  await new Promise((resolve) => setTimeout(resolve, 8000));

  const shots = targets.map((device) => ({ device: device.name, file: screenshot(device, device.name.replace(/\s+/g, "-").toLowerCase()) }));
  const status = httpJson(`http://127.0.0.1:${port}/api/status?token=${encodeURIComponent(token)}`);

  console.log(JSON.stringify({ url, devices: targets.map((device) => device.name), screenshots: shots, bridges: status.bridges || [] }, null, 2));
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
