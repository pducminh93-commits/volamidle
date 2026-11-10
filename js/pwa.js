"use strict";

/**
 * MODULE CÀI ĐẶT ỨNG DỤNG PWA (pwa.js)
 * Hỗ trợ lưu trữ sự kiện beforeinstallprompt và hiển thị hướng dẫn / nút cài đặt app ra màn hình chính
 */

let deferredPrompt = null;

// Lắng nghe sự kiện trước khi cài đặt của Chrome/Android
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;
  window.__canInstallPwa = true;
  const pwaBtn = document.getElementById("bPwaInstall");
  if (pwaBtn) pwaBtn.style.display = "inline-block";
  const pwaBox = document.getElementById("pwaInstallBox");
  if (pwaBox) pwaBox.style.display = "block";
});

window.addEventListener("appinstalled", () => {
  deferredPrompt = null;
  window.__canInstallPwa = false;
  if (typeof toast === "function") toast("🎉 Đã cài đặt Võ Lâm Idle ra màn hình chính thành công!");
  const pwaBtn = document.getElementById("bPwaInstall");
  if (pwaBtn) pwaBtn.style.display = "none";
});

/**
 * Kích hoạt popup cài đặt từ Chrome hoặc mở modal hướng dẫn
 */
async function promptPwaInstall() {
  if (deferredPrompt) {
    try {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice && choice.outcome === "accepted") {
        if (typeof toast === "function") toast("Đang tiến hành cài đặt ứng dụng...");
      }
      deferredPrompt = null;
    } catch (err) {
      console.warn("Lỗi gọi prompt:", err);
      pwaGuideModal();
    }
  } else {
    pwaGuideModal();
  }
}

/**
 * Modal hướng dẫn chi tiết cách cài đặt ứng dụng cho Android Chrome và iOS Safari
 */
function pwaGuideModal() {
  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isAndroid = /android/i.test(navigator.userAgent);
  const isStandalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;

  if (isStandalone) {
    modal(`<h3>📱 Ứng Dụng Đã Cài Đặt</h3><p class="desc">Đại Hiệp đã mở Võ Lâm Idle ở chế độ ứng dụng màn hình chính (Standalone)!</p><div class="btnrow"><button class="btn on" onclick="closeModal(true)">Đóng</button></div>`);
    return;
  }

  const content = `
    <div style="color:#e8dcc8;line-height:1.6;font-size:13px">
      <div class="card" style="background:radial-gradient(circle at top,#3d321b 0,#14120c 70%);border:1px solid #d4af37;text-align:center;padding:12px;margin-bottom:12px">
        <h4 style="color:#ffd24a;margin:0 0 4px;font-size:16px">📲 CÀI ĐẶT VÕ LÂM IDLE RA MÀN HÌNH CHÍNH</h4>
        <p class="dim small" style="margin:0">Chơi toàn màn hình không có thanh duyệt web · Khởi động nhanh 1 chạm · Mượt mà & tiết kiệm pin</p>
      </div>

      ${deferredPrompt ? `
      <div style="text-align:center;margin-bottom:14px">
        <button class="btn on" id="btnModalPwaAct" style="padding:8px 24px;font-size:14px;font-weight:bold;background:#8a6414;border-color:#ffd24a;color:#fff">
          ⚡ BẤM ĐỂ CÀI ĐẶT NGAY
        </button>
      </div>` : ''}

      <div class="card" style="background:#151614;border:1px solid #4e4c3c;padding:10px;margin-bottom:10px">
        <h5 style="color:#ffd24a;margin:0 0 6px;border-bottom:1px solid #332d1e;padding-bottom:4px">🤖 Trên Google Chrome (Android):</h5>
        <ol style="margin:0 0 6px 18px;padding:0">
          <li>Nhấn vào biểu tượng <b>3 dấu chấm (⋮)</b> ở góc trên bên phải Chrome.</li>
          <li>Chọn mục <b>"Cài đặt ứng dụng"</b> hoặc <b>"Thêm vào Màn hình chính"</b>.</li>
          <li>Nhấn xác nhận <b>Cài đặt</b> để hoàn tất.</li>
        </ol>
      </div>

      <div class="card" style="background:#151614;border:1px solid #4e4c3c;padding:10px">
        <h5 style="color:#ffd24a;margin:0 0 6px;border-bottom:1px solid #332d1e;padding-bottom:4px">🍏 Trên Safari (iPhone / iPad):</h5>
        <ol style="margin:0 0 6px 18px;padding:0">
          <li>Mở link game bằng trình duyệt <b>Safari</b>.</li>
          <li>Bấm nút <b>Chia sẻ</b> (biểu tượng ô vuông mũi tên <b>↑</b> ở thanh dưới).</li>
          <li>Cuộn xuống chọn <b>"Thêm vào MH chính"</b> (Add to Home Screen ➕).</li>
          <li>Nhấn <b>Thêm</b> (Add) ở góc trên bên phải.</li>
        </ol>
      </div>
    </div>
  `;

  modal(`<h3>📱 Cài Đặt Ra Màn Hình Điện Thoại</h3>` + content, () => {
    const actBtn = document.getElementById("btnModalPwaAct");
    if (actBtn) {
      actBtn.onclick = () => {
        closeModal(true);
        promptPwaInstall();
      };
    }
  });
}
