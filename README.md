# Võ Lâm IDLE — v1

Game nhập vai kiếm hiệp treo máy (idle RPG) chạy hoàn toàn trên trình duyệt, dựng từ dữ liệu gốc Võ Lâm Truyền Kỳ (JX1): bản đồ có dữ liệu va chạm, quái + hoạt ảnh webp, kỹ năng, trang bị, ngũ hành tương sinh tương khắc.

## Chạy game

Cách nhanh nhất trên Windows:

```
Chay_Game.bat
```

Hoặc chạy trực tiếp:

```
npm install              # lần đầu hoặc khi dependency thay đổi
npm start                # http://localhost:8080/play.html
```

`index.html` là trang giới thiệu, nút "Vào game" dẫn tới `play.html`.

## Cấu trúc

```
index.html          trang giới thiệu
play.html           trang chơi game (nạp 4 bundle trong assets/)
js/                 mã nguồn tính năng (ui, combat, roster, roster 4 nhân vật, ...)
src_archive/        dữ liệu game: data.js, world.js, zones2.js, jmo*.js, fx, ...
img/  fx/  snd/  music/  fonts/  ui/   tài nguyên
assets/             bundle đã đóng gói (sinh ra khi build, KHÔNG commit)
build_obfuscate.js  đóng gói + làm rối mã nguồn
checks/             kiểm tra bản đồ / quái / icon
tests/              test logic game
tools/              công cụ build, kiểm tra đầu vào, báo cáo dung lượng, đồng bộ web
tools/sync_skills_web.cjs   đối chiếu định nghĩa kỹ năng với bundle bản web
tools/sync_addskilldamage.cjs  đồng bộ riêng khoá addskilldamageN từ web (chỉ thêm cái còn thiếu)
AGENTS.md           spec làm việc cho AI agent (quy ước, bản đồ file, hard rules)
```

## Build lại sau khi sửa mã nguồn

Game chạy bằng bundle trong `assets/`, **sửa file trong `js/` hoặc `src_archive/` không có tác dụng** cho tới khi build lại:

```
node build_obfuscate.js
```

Lệnh này gộp `js/` + `src_archive/` thành 4 bundle, làm rối bundle engine/features, cập nhật `play.html` và tăng `ver.json`.

Dependency build được khóa trong `package-lock.json`; dùng Node.js 20 trở lên. Trước khi phát hành,
chạy `npm run verify` để build lại và thực hiện toàn bộ kiểm tra bắt buộc theo đúng thứ tự.

## Kiểm tra

```
npm run check:inputs           # file nguồn không bị quên hoặc khai báo trùng trong bundle
npm run check:anim             # metadata animation Vi Sơn khớp đúng kích thước atlas
npm run report:size            # dung lượng JavaScript phải tải khi khởi động
npm run verify                 # build + toàn bộ kiểm tra bên dưới
node check_tdz.cjs             # lỗi TDZ khi nạp bundle (chạy bundle thật trong VM)
node check_fx.cjs              # bộ hiệu ứng: file webp thiếu, khung lệch >8px, pre không phân giải
node checks/check_maps.js             # bản đồ / quái / icon
node test_aura_all.cjs         # vòng sáng: chỉ số, tổ đội, FX, Mộng Điệp
node test_aura_team_runtime.cjs # aura chính/phụ, FX toàn đội, bật/tắt và lấy cấp cao nhất
node tests/test_bestdress.cjs        # mặc đồ tốt cho 4 nhân vật: không trùng món, tôn trọng đồ khoá
node test_boss_priority.cjs    # checkbox ưu tiên boss toàn bản đồ và tự chạy tới mục tiêu
node test_holo.cjs             # cơ chế Hồ Lô Thần Nông
node test_graphics_quality.cjs # sampling, pixel snapping, cache frame và bóng nhân vật JX
node test_ngua.cjs             # ngựa: bậc, Mã Trường, tự rã, cường hoá, tẩy dòng, Kích Duyên
node test_roster_summon.cjs    # thu/gọi đệ tử, nhớ đúng đội hình, không tự thay slot
node test_xp.cjs               # độ khó EXP theo cấp
node tools/sync_skills_web.cjs # so định nghĩa kỹ năng với bản web (chỉ báo cáo)
```

## Thay đổi trong v1

- **Mặc đồ tốt cho cả đội**: nút "Mặc đồ tốt" xét cả 4 nhân vật trong đội, lấy đồ tốt hơn từ **hành trang + kho rèn + kho chung**, không để hai nhân vật mặc trùng một món, tôn trọng đồ khoá 🔒.
- **Đồng bộ bundle**: `play.html` từng trỏ bundle cũ trong khi `assets/` đã có bundle mới — đã build lại cho khớp.
- **Công cụ kiểm tra bản đồ** (`checks/check_maps.js`) và báo cáo đối chiếu với bản online.
