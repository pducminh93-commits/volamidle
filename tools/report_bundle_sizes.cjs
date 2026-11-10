"use strict";

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "play.html"), "utf8");
const files = [...html.matchAll(/<script\s+src="(assets\/[^"]+\.bundle\.js)"/g)].map(match => match[1]);

if (!files.length) {
  console.error("[LỖI] play.html không tham chiếu bundle JavaScript nào.");
  process.exit(1);
}

let total = 0;
for (const file of files) {
  const fullPath = path.join(root, file);
  if (!fs.existsSync(fullPath)) {
    console.error(`[LỖI] Thiếu bundle: ${file}`);
    process.exit(1);
  }
  const bytes = fs.statSync(fullPath).size;
  total += bytes;
  console.log(`${file.padEnd(48)} ${(bytes / 1048576).toFixed(2)} MiB`);
}

console.log(`${"Tổng JavaScript khởi động".padEnd(48)} ${(total / 1048576).toFixed(2)} MiB`);
