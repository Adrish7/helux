const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const projectRoot = path.resolve(__dirname, "..");
const builtApp = path.join(projectRoot, "release", "mac-universal", "Helux.app");
const installedApp = "/Applications/Helux.app";
const expectedBundleId = "com.adrish.helux";
const launchServices =
  "/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister";

function run(command, args, { allowFailure = false, capture = false } = {}) {
  const result = spawnSync(command, args, {
    encoding: capture ? "utf8" : undefined,
    stdio: capture ? ["ignore", "pipe", "pipe"] : "inherit"
  });

  if (!allowFailure && result.status !== 0) {
    const detail = capture ? result.stderr?.trim() : "";
    throw new Error(`${command} failed${detail ? `: ${detail}` : ""}`);
  }

  return result;
}

function sleep(milliseconds) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, milliseconds);
}

function isHeluxRunning() {
  return run("pgrep", ["-x", "Helux"], { allowFailure: true, capture: true }).status === 0;
}

function waitForHelux(expectedRunning, timeoutMilliseconds = 5000) {
  const deadline = Date.now() + timeoutMilliseconds;
  while (Date.now() < deadline) {
    if (isHeluxRunning() === expectedRunning) return true;
    sleep(200);
  }
  return isHeluxRunning() === expectedRunning;
}

function getBundleId(appPath) {
  const result = run(
    "plutil",
    ["-extract", "CFBundleIdentifier", "raw", path.join(appPath, "Contents", "Info.plist")],
    { capture: true }
  );
  return result.stdout.trim();
}

function getAsarHash(appPath) {
  const asarPath = path.join(appPath, "Contents", "Resources", "app.asar");
  return crypto.createHash("sha256").update(fs.readFileSync(asarPath)).digest("hex");
}

function verifyApp(appPath) {
  if (!fs.existsSync(appPath)) throw new Error(`App bundle not found: ${appPath}`);
  if (getBundleId(appPath) !== expectedBundleId) {
    throw new Error(`Unexpected bundle identifier in ${appPath}`);
  }
  run("codesign", ["--verify", "--deep", "--strict", appPath]);
  return getAsarHash(appPath);
}

function removeExactAppBundle(appPath) {
  const isSafeInstalledPath = appPath === installedApp;
  const isSafeBackupPath =
    path.dirname(appPath) === "/Applications" && path.basename(appPath).startsWith(".Helux.app.backup-");

  if (!isSafeInstalledPath && !isSafeBackupPath) {
    throw new Error(`Refusing to remove unexpected path: ${appPath}`);
  }

  fs.rmSync(appPath, { recursive: true, force: true });
}

function install() {
  if (process.platform !== "darwin") throw new Error("Helux local installation is only supported on macOS.");

  console.log("Verifying packaged Helux app…");
  const builtHash = verifyApp(builtApp);
  const backupApp = `/Applications/.Helux.app.backup-${process.pid}-${Date.now()}`;
  let hasBackup = false;

  console.log("Closing the currently installed Helux app…");
  run("osascript", ["-e", `tell application id "${expectedBundleId}" to quit`], { allowFailure: true });
  if (!waitForHelux(false)) {
    run("pkill", ["-TERM", "-x", "Helux"], { allowFailure: true });
    if (!waitForHelux(false)) throw new Error("Helux did not quit, so the installed app was left unchanged.");
  }

  try {
    if (fs.existsSync(installedApp)) {
      fs.renameSync(installedApp, backupApp);
      hasBackup = true;
    }

    console.log("Installing Helux in /Applications…");
    run("ditto", [builtApp, installedApp]);

    const installedHash = verifyApp(installedApp);
    if (installedHash !== builtHash) throw new Error("The installed app does not match the packaged build.");

    run("touch", [installedApp]);
    run(launchServices, ["-f", installedApp], { allowFailure: true });
    run("mdimport", [installedApp], { allowFailure: true });
    run("open", [installedApp]);
    if (!waitForHelux(true)) throw new Error("The updated Helux app did not reopen successfully.");

    if (hasBackup) removeExactAppBundle(backupApp);
    console.log(`Helux updated successfully (${installedHash.slice(0, 12)}).`);
    console.log("Spotlight now points to /Applications/Helux.app.");
  } catch (error) {
    console.error("Install failed; restoring the previous Helux app…");
    if (fs.existsSync(installedApp)) removeExactAppBundle(installedApp);
    if (hasBackup && fs.existsSync(backupApp)) fs.renameSync(backupApp, installedApp);
    if (fs.existsSync(installedApp)) run("open", [installedApp], { allowFailure: true });
    throw error;
  }
}

try {
  install();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
