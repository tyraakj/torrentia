import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const PROHIBITED_PATTERNS = [
  "@ts-ignore",
  "@ts-expect-error",
  "@ts-nocheck",
  "eslint-disable",
  "as any",
  "--no-verify",
  "SKIP_TESTS",
  "describe.only",
  "it.only",
  "test.only",
  "describe.skip",
  "it.skip",
  "test.skip",
  "xit(",
  "xdescribe(",
];

const TARGET_DIRECTORIES = ["frontend/src", "contracts/src", "contracts/test"];
const TARGET_EXTENSIONS = [".ts", ".tsx", ".js", ".mjs", ".sol"];

const isAllMode = process.argv.includes("--all");
let violations = 0;

console.log(`🛡️ Running Mechanical Suppression Gate (mode: ${isAllMode ? "all" : "staged"})...`);

if (!isAllMode) {
  let stagedFiles = [];
  try {
    const output = execSync("git diff --cached --name-only --diff-filter=ACM", {
      cwd: rootDir,
      encoding: "utf8",
    });
    stagedFiles = output.split("\n").map((f) => f.trim()).filter(Boolean);
  } catch {
    stagedFiles = [];
  }

  if (stagedFiles.length === 0) {
    console.log("✓ No staged files to check.");
    process.exit(0);
  }

  for (const file of stagedFiles) {
    if (
      file.startsWith("scripts/") ||
      file.endsWith(".lock") ||
      file.endsWith(".json") ||
      file.endsWith(".md")
    ) {
      continue;
    }

    try {
      const diffOutput = execSync(`git diff --cached -U0 "${file}"`, {
        cwd: rootDir,
        encoding: "utf8",
      });
      const lines = diffOutput.split("\n");

      for (const line of lines) {
        if (line.startsWith("+") && !line.startsWith("+++")) {
          const addedContent = line.slice(1);
          for (const pattern of PROHIBITED_PATTERNS) {
            if (addedContent.includes(pattern)) {
              if (!/\/\/\s*APPROVED-SUPPRESSION:/.test(addedContent)) {
                console.error(`❌ Prohibited suppression '${pattern}' in ${file}:`);
                console.error(`   --> ${addedContent.trim()}`);
                console.error(
                  `   To approve with explicit authorization, append: // APPROVED-SUPPRESSION: <reason>`
                );
                violations++;
              }
            }
          }
        }
      }
    } catch {
      // ignore
    }
  }
} else {
  function walkDir(dir) {
    let files = [];
    if (!fs.existsSync(dir)) return files;

    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== "node_modules" && entry.name !== "dist" && entry.name !== ".git") {
          files = files.concat(walkDir(fullPath));
        }
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name);
        if (TARGET_EXTENSIONS.includes(ext)) {
          files.push(fullPath);
        }
      }
    }
    return files;
  }

  for (const dir of TARGET_DIRECTORIES) {
    const fullDirPath = path.join(rootDir, dir);
    const files = walkDir(fullDirPath);

    for (const file of files) {
      const content = fs.readFileSync(file, "utf8");
      const lines = content.split("\n");

      lines.forEach((line, index) => {
        const lineNo = index + 1;
        for (const pattern of PROHIBITED_PATTERNS) {
          if (line.includes(pattern)) {
            if (!/\/\/\s*APPROVED-SUPPRESSION:/.test(line)) {
              const relPath = path.relative(rootDir, file).replace(/\\/g, "/");
              console.error(`❌ Prohibited suppression '${pattern}' at ${relPath}:${lineNo}`);
              console.error(`   --> ${line.trim()}`);
              console.error(
                `   To approve with explicit authorization, append: // APPROVED-SUPPRESSION: <reason>`
              );
              violations++;
            }
          }
        }
      });
    }
  }
}

if (violations > 0) {
  console.error(
    `\n🚨 Mechanical Suppression Gate FAILED: ${violations} unapproved suppression(s) detected.`
  );
  console.error(
    `   Per project standards, suppressions are forbidden unless explicitly authorized.`
  );
  process.exit(1);
}

console.log("✓ Mechanical Suppression Gate PASSED: Zero unapproved suppressions detected.");
process.exit(0);
