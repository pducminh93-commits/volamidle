"use strict";

const fs = require("fs");
const path = require("path");
const { BUNDLE_CONFIGS, BUILD_EXCLUDED_FILES } = require("../build_obfuscate.js");

const root = path.resolve(__dirname, "..");
const normalized = value => value.replace(/\\/g, "/");
const bundled = BUNDLE_CONFIGS.flatMap(bundle => bundle.files.map(normalized));
const excluded = BUILD_EXCLUDED_FILES.map(normalized);
const known = new Set([...bundled, ...excluded]);
const errors = [];

for (const file of bundled) {
  if (!fs.existsSync(path.join(root, file))) errors.push(`Thiếu file đã khai báo: ${file}`);
}

const duplicates = bundled.filter((file, index) => bundled.indexOf(file) !== index);
for (const file of new Set(duplicates)) errors.push(`File nằm trong nhiều bundle: ${file}`);

const jsFiles = fs.readdirSync(path.join(root, "js"), { withFileTypes: true })
  .filter(entry => entry.isFile() && entry.name.endsWith(".js"))
  .map(entry => `js/${entry.name}`)
  .sort();

for (const file of jsFiles) {
  if (!known.has(file)) errors.push(`File nguồn chưa có trong bundle hoặc danh sách loại trừ: ${file}`);
}

for (const file of excluded) {
  if (!fs.existsSync(path.join(root, file))) errors.push(`File loại trừ không còn tồn tại: ${file}`);
  if (bundled.includes(file)) errors.push(`File vừa được bundle vừa bị loại trừ: ${file}`);
}

if (errors.length) {
  console.error("[LỖI] Cấu hình đầu vào build không hợp lệ:");
  for (const error of errors) console.error(` - ${error}`);
  process.exit(1);
}

console.log(`OK: ${bundled.length} file trong ${BUNDLE_CONFIGS.length} bundle; ${excluded.length} file thử nghiệm được loại trừ.`);
