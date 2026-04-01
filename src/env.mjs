import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

function parseEnvLine(line) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) {
    return null;
  }

  const match = trimmed.match(/^([\w.-]+)\s*=\s*(.*)$/);
  if (!match) {
    return null;
  }

  const [, key, rawValue] = match;
  let value = rawValue.trim();

  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }

  return { key, value: value.replace(/\\n/g, "\n") };
}

function applyEnvFile(filePath, protectedKeys) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const content = fs.readFileSync(filePath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const parsed = parseEnvLine(line);
    if (!parsed || protectedKeys.has(parsed.key)) {
      continue;
    }
    process.env[parsed.key] = parsed.value;
  }
}

export function loadEnvFiles() {
  const protectedKeys = new Set(Object.keys(process.env));
  const srcDir = path.dirname(fileURLToPath(import.meta.url));
  const toolRoot = path.resolve(srcDir, "..");

  applyEnvFile(path.join(toolRoot, ".env"), protectedKeys);
}
