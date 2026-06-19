import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const stage = (process.argv[2] ?? "").trim();

if (!stage) {
  throw new Error("Usage: node scripts/deploy-cloudflare.mjs <stg|prd>");
}

if (!["stg", "prd"].includes(stage)) {
  throw new Error(`Unsupported stage: ${stage}`);
}

const cloudflareAccountId = process.env.CF_ACCOUNT_ID;
const cloudflareApiToken = process.env.CF_API_TOKEN;

if (!cloudflareAccountId) {
  throw new Error("CF_ACCOUNT_ID is required.");
}

if (!cloudflareApiToken) {
  throw new Error("CF_API_TOKEN is required.");
}

const dateStamp = new Date().toISOString().slice(0, 10);

const wranglerEnv = {
  ...process.env,
  CLOUDFLARE_ACCOUNT_ID: cloudflareAccountId,
  CLOUDFLARE_API_TOKEN: cloudflareApiToken,
  CF_ACCOUNT_ID: cloudflareAccountId,
  CF_API_TOKEN: cloudflareApiToken,
  DEPLOY_STAGE: stage,
};

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: repoRoot,
      env: options.env ?? wranglerEnv,
      stdio: ["ignore", "pipe", "pipe"],
      shell: false,
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
      process.stdout.write(chunk);
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
      process.stderr.write(chunk);
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }

      reject(
        new Error(`${command} ${args.join(" ")} exited with code ${code}`),
      );
    });
  });
}

async function runPnpm(args, options = {}) {
  return run("pnpm", args, options);
}

async function runWrangler(args, options = {}) {
  return run("pnpm", ["dlx", "wrangler@^4.0.0", ...args], options);
}

// ==================== FIXED: Upload Secrets from Doppler (GitHub Actions friendly) ====================
async function uploadSecrets(workerName) {
  console.log(`🔐 Uploading secrets for ${workerName}...`);

  if (!process.env.DOPPLER_TOKEN) {
    throw new Error("DOPPLER_TOKEN environment variable is required but not set.");
  }

  try {
    console.log("📥 Installing Doppler CLI (user-local)...");

    // Install Doppler CLI to current directory (no sudo needed)
    await run("sh", ["-c", `
      (curl -Ls --tlsv1.2 --proto "=https" --retry 3 https://cli.doppler.com/install.sh || wget -t 3 -qO- https://cli.doppler.com/install.sh) | sh -s -- --no-package-manager --no-install
    `], { env: wranglerEnv });

    // Now use the local binary
    const dopplerBin = "./doppler";

    console.log("📤 Fetching secrets from Doppler...");
    const { stdout: secretsJson } = await run(dopplerBin, [
      "secrets", 
      "download", 
      "--no-file", 
      "--format", 
      "json"
    ], {
      env: {
        ...wranglerEnv,
        DOPPLER_TOKEN: process.env.DOPPLER_TOKEN,
      }
    });

    if (!secretsJson || !secretsJson.trim()) {
      throw new Error("No secrets returned from Doppler");
    }

    // Write secrets to temp file
    const tempDir = await mkdtemp(path.join(os.tmpdir(), `draveup-secrets-${stage}-`));
    const secretsPath = path.join(tempDir, "secrets.json");
    await writeFile(secretsPath, secretsJson.trim(), "utf8");

    console.log("🚀 Uploading secrets to Cloudflare...");
    await runWrangler(["secret", "bulk", secretsPath, "--name", workerName], {
      env: wranglerEnv,
    });

    console.log(`✅ Secrets uploaded successfully for ${workerName}`);
  } catch (err) {
    console.error("❌ Failed to upload secrets:", err.message);
    throw err;
  }
}
// =====================================================================

async function runPrismaSetup() {
  const script = stage === "prd" ? "db:sync:force" : "db:sync";
  await runPnpm(["--filter", "@workspace/api-server", "run", script], {
    env: wranglerEnv,
  });
}

async function prepareFrontendWorker(workerSourcePath, apiOrigin) {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), `draveup-${stage}-`));
  const workerTargetPath = path.join(tempDir, path.basename(workerSourcePath));
  const workerSource = await readFile(workerSourcePath, "utf8");
  await writeFile(
    workerTargetPath,
    workerSource.replaceAll("__API_ORIGIN__", apiOrigin),
    "utf8",
  );
  return { tempDir, workerTargetPath };
}

async function writeWranglerConfig({
  name,
  main,
  assetsDirectory,
  compatibilityFlags,
}) {
  const tempDir = await mkdtemp(
    path.join(os.tmpdir(), `draveup-wrangler-${stage}-`),
  );
  const configPath = path.join(tempDir, "wrangler.jsonc");

  const config = {
    name,
    account_id: cloudflareAccountId,
    main,
    compatibility_date: dateStamp,
    compatibility_flags: compatibilityFlags,
    // You can add non-sensitive vars here if needed
    // vars: { NODE_ENV: stage === "prd" ? "production" : "staging" }
  };

  if (assetsDirectory) {
    config.assets = { directory: assetsDirectory, binding: "ASSETS" };
  }

  await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");
  return configPath;
}

async function deployWorker({
  name,
  main,
  assetsDirectory,
  compatibilityFlags = ["nodejs_compat"],
}) {
  const configPath = await writeWranglerConfig({
    name,
    main,
    assetsDirectory,
    compatibilityFlags,
  });

  const result = await runWrangler(["deploy", "--config", configPath], {
    env: wranglerEnv,
  });

  const match = result.stdout.match(/https:\/\/[^\s)]+\.workers\.dev/);
  if (!match) {
    throw new Error(`Unable to determine deployed URL for ${name}.`);
  }

  return match[0];
}

async function main() {
  console.log(`Deploying Cloudflare Workers for ${stage}`);
  await runPrismaSetup();

  await runPnpm(["--filter", "@workspace/api-server", "run", "build"], {
    env: wranglerEnv,
  });
  await runPnpm(["--filter", "@workspace/admin-portal", "run", "build"], {
    env: wranglerEnv,
  });
  await runPnpm(["--filter", "@workspace/drave-registry", "run", "build"], {
    env: wranglerEnv,
  });

  // === Deploy API Worker with Secrets ===
  const apiWorkerName = `draveup-api-server-${stage}`;
  const apiWorkerPath = path.resolve(repoRoot, "artifacts/api-server/worker.mjs");

  await uploadSecrets(apiWorkerName);   // ← Secrets uploaded here

  const apiUrl = await deployWorker({
    name: apiWorkerName,
    main: apiWorkerPath,
    compatibilityFlags: ["nodejs_compat", "enable_nodejs_http_server_modules"],
  });

  console.log(`API deployed at ${apiUrl}`);

  // Frontend workers (no secrets needed)
  const adminWorkerPath = path.resolve(repoRoot, "artifacts/admin-portal/worker.mjs");
  const adminPrepared = await prepareFrontendWorker(adminWorkerPath, apiUrl);
  const adminUrl = await deployWorker({
    name: `draveup-admin-portal-${stage}`,
    main: adminPrepared.workerTargetPath,
    assetsDirectory: path.resolve(repoRoot, "artifacts/admin-portal/dist/public"),
  });
  console.log(`Admin portal deployed at ${adminUrl}`);

  const registryWorkerPath = path.resolve(repoRoot, "artifacts/drave-registry/worker.mjs");
  const registryPrepared = await prepareFrontendWorker(registryWorkerPath, apiUrl);
  const registryUrl = await deployWorker({
    name: `draveup-drave-registry-${stage}`,
    main: registryPrepared.workerTargetPath,
    assetsDirectory: path.resolve(repoRoot, "artifacts/drave-registry/dist/public"),
  });
  console.log(`Registry deployed at ${registryUrl}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});