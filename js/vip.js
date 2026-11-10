"use strict";

/**
 * MODULE ĐÃI NGỘ & VIP (vip.js)
 * Đã vô hiệu hóa toàn bộ hệ thống VIP theo định hướng Võ Lâm Truyền Kỳ Công Thành Chiến / Sơn Hà Xã Tắc.
 */

function isVip() {
  return false;
}

function vipDaysLeft() {
  return 0;
}

function vipActivate() {
  if (typeof toast === "function") toast("Chức năng VIP đã được gỡ bỏ khỏi giang hồ!");
}

function vipClaimDaily() {
  if (typeof toast === "function") toast("Chức năng VIP đã được gỡ bỏ khỏi giang hồ!");
}

function vipModal() {
  if (typeof toast === "function") toast("Chức năng VIP đã được gỡ bỏ khỏi giang hồ!");
}

function vbossLeft() {
  return 0;
}

function vbossPending() {
  return false;
}

function vbossStart() {
  if (typeof toast === "function") toast("Boss VIP đã được gỡ bỏ khỏi giang hồ!");
}

function vbossFinish() {
  if (typeof dgExit === "function") dgExit();
}

function vbossClaim() {
  return;
}

function vbossBody() {
  return "<p class='dim'>Hoạt động Boss VIP đã được gỡ bỏ.</p>";
}
