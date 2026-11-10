"use strict";
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
global.window = global;

require(path.join(root, "src_archive/fx.js"));
const fxbsPath = path.join(root, "src_archive/fx_bosung.js");
if (fs.existsSync(fxbsPath)) require(fxbsPath);

const quiet = process.argv.includes("--quiet");
const warnOk = process.argv.includes("--warn-ok");

const JFX = global.JFX || {};
const JFX_BS = global.JFX_BS || {};

const exists = p => fs.existsSync(path.join(root, p));

const files = new Set();
const errors = [];
const warnings = [];

function addErr(msg) { errors.push(msg); }
function addWarn(msg) { warnings.push(msg); }

function collectFiles(table) {
  if (!table || typeof table !== "object") return;
  // m: id -> {fly:{f}, hit:{f}}
  if (table.m) {
    for (const [id, v] of Object.entries(table.m)) {
      for (const part of ["fly", "hit"]) {
        const f = v && v[part] && v[part].f;
        if (f) files.add(f);
      }
    }
  }
  // c: id -> {f}
  if (table.c) {
    for (const [id, v] of Object.entries(table.c)) {
      if (v && v.f) files.add(v.f);
    }
  }
}

collectFiles(JFX);
collectFiles(JFX_BS);

// kiểm tra file tồn tại
for (const f of files) {
  if (!exists(f)) addErr(`File hiệu ứng thiếu: ${f}`);
}

// kiểm tra pre phân giải
function checkPre(table) {
  const c = (table && table.c) || {};
  const f = (table && table.f) || {};
  for (const [id, v] of Object.entries(f)) {
    if (v && v.pre != null && v.pre !== null && !Object.prototype.hasOwnProperty.call(c, String(v.pre))) {
      addErr(`Kỹ năng ${id}: pre=${v.pre} không tồn tại trong bảng c`);
    }
  }
}
checkPre(JFX);
checkPre(JFX_BS);

if (!quiet) {
  for (const e of errors) console.log(`\x1b[31m[ERR]\x1b[0m ${e}`);
  for (const w of warnings) console.log(`\x1b[33m[WARN]\x1b[0m ${w}`);
  console.log(`\nTổng: ${files.size} file tham chiếu · ${errors.length} lỗi, ${warnings.length} cảnh báo.`);
}
process.exitCode = (errors.length > 0 || (!warnOk && warnings.length > 0)) ? 1 : 0;
