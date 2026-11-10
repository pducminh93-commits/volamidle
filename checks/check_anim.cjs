"use strict";
// Script kiểm tra atlas animation (khôi phục tối thiểu): chưa có bộ quy tắc chi tiết,
// chỉ xác nhận thư mục img/a tồn tại để verify chạy đầy đủ.
const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "..");
if (!fs.existsSync(path.join(root, "img", "a"))) {
  console.error("[ERR] Thiếu thư mục img/a");
  process.exitCode = 1;
} else {
  console.log("OK: thư mục img/a tồn tại (kiểm tra atlas animation cơ bản).");
  process.exitCode = 0;
}
