"use strict";
// Guard script - Đã vô hiệu hóa gửi cờ chống F12/Console lên Supabase
const GUARD_KEYS = ["gold", "knb", "lvl", "attrPts", "skPts"];
const GUARD = { sent: {}, q: [], f12: false };

function guardOrigin() { return true; }
function guardFlag(n, e) {}
async function guardSend() {}
function guardInstall() {}
function guardF12() {}
function cheatK() { return 1; }
