const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");
const TARGET_DIRS = ["config", "controllers", "middleware", "models", "routes", "utils"];
const TARGET_FILES = [path.join(ROOT, "server.js")];

const collectFiles = (dirPath) => {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      files.push(...collectFiles(fullPath));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith(".js")) {
      files.push(fullPath);
    }
  }

  return files;
};

const filesToCheck = [
  ...TARGET_FILES,
  ...TARGET_DIRS.flatMap((dir) => collectFiles(path.join(ROOT, dir))),
];

const uniqueFiles = [...new Set(filesToCheck)];
const failures = [];

for (const file of uniqueFiles) {
  try {
    const source = fs.readFileSync(file, "utf8");
    new vm.Script(source, { filename: file });
  } catch (error) {
    failures.push({
      file,
      stderr: String(error && error.message ? error.message : error).trim(),
    });
  }
}

if (failures.length) {
  console.error("Validation failed:");
  for (const failure of failures) {
    console.error(`- ${path.relative(ROOT, failure.file)}`);
    if (failure.stderr) {
      console.error(failure.stderr);
    }
  }
  process.exit(1);
}

console.log(`Validated ${uniqueFiles.length} JavaScript files.`);
