# Dọn dẹp & tối ưu dung lượng — VolamIDLE

Ngày: 2026-11-09. Đã build lại + chạy toàn bộ kiểm tra sau mỗi bước.

## 1. Đã xoá hẳn (không cần cho game)

| Mục | Dung lượng | Ghi chú |
| :--- | ---: | :--- |
| `test_aura.cjs`, `test_aura_team.cjs`, `test_aura_fx.cjs`, `test_mongdiep.cjs` | 18 KB | Gộp thành **`test_aura_all.cjs`** — 55 mục kiểm tra, đúng bằng tổng 4 file gốc (12+20+15+7) |
| `preview_pad.html` | 3 KB | Không file nào tham chiếu |
| `BAO_CAO_BAN_DO.html` | 12 KB | Báo cáo cũ, đã có trong `.gitignore` |
| `src_archive/data.js.bak_*` (3 bản) | 9.2 MB | Bản sao lưu do `tools/sync_*.cjs` sinh ra |
| `.tmp_web/`, `tools/.tmp_web/` | 12 MB | Cache bundle web — `tools/sync_skills_web.cjs` tải lại khi cần |

`.gitignore` bổ sung: `.tmp_web/`, `src_archive/data.js.bak_*`, `.abacusai-bot/`, `_cleanup/`.

## 2. Đã chuyển sang `_cleanup/` (có thể xoá hẳn nếu không cần)

Tài nguyên **không được mã nguồn tham chiếu** — đã đối chiếu với mọi file `.js` và bảng `W.anim`:

| Mục | Dung lượng |
| :--- | ---: |
| `img/a/` — 160 file hoạt ảnh quái (bộ `gt_boss*`, `gt_enemy*`, một số `enemy*` không có trong bảng anim) | 26.3 MB |
| `img/z/397.jpg`, `img/z/pbtodoi.png` — ảnh bãi chưa gắn bãi nào | 2.8 MB |
| **Tổng** | **29.4 MB** |

Có `_cleanup/README.txt` ghi cách khôi phục (chuyển về chỗ cũ → `node build_obfuscate.js`).

## 3. Hiện trạng dung lượng

| Thư mục | Dung lượng | Ghi chú |
| :--- | ---: | :--- |
| `.git` | 716 MB | Lịch sử repo — **chỉ giảm được bằng cách viết lại lịch sử** (xem mục 4) |
| `img/` | 620 MB | `look/doll` 346 MB (lossless, cần cho tạo hình), `z/` 65 MB (17 ảnh bãi 3584×3584 + 24 ảnh lát gạch 1536×1536), `a/` 130 MB |
| `node_modules/` | 65 MB | Chỉ dùng `javascript-obfuscator` cho build; cài lại bằng `npm install` |
| `fx/` | 47.4 MB | 486 webp — 299 file đang dùng, **251 file mồ côi (11.9 MB)** |
| `_cleanup/` | 29.4 MB | Chờ bạn quyết định xoá |
| `assets/` | 18 MB | Bundle build ra (không commit) |
| `music/` | 11.8 MB | |
| `ui/`, `src_archive/`, `js/`, `snd/` | 16.1 MB | |

## 4. Việc còn lại — cần bạn quyết

1. **Xoá hẳn `_cleanup/`** → −29.4 MB.
2. **`.git` 716 MB**: repo đã commit cả `img/`, `fx/`, `music/` từ đầu nên lịch sử rất nặng. Giảm được
   rất nhiều nhưng phải **viết lại lịch sử** (`git filter-repo`) → đổi hash mọi commit; chỉ nên làm khi
   bạn không cần giữ lịch sử cũ. Cách an toàn: tạo repo mới, commit một lần.
3. **Ảnh nền bãi** (`img/z`): từng bị hạ 1536² để tiết kiệm ~100 MB, nhưng 17 map có dữ liệu vật cản
   (`OBS.g`) được vẽ **1:1 với world 3584²**, nên bản 1536² bị phóng to và mờ hơn hẳn web. Ngày
   2026-11-10 đã tải lại bản gốc 3584² từ web cho 16 bãi + `town.jpg` (65 MB) và sửa `drawTiledBg()`
   chỉ vẽ vùng nguồn đang hiển thị (~1,5 ms/lần làm mới cache). 24 ảnh còn lại là map phó bản dùng
   chế độ lát gạch 1536² nên giữ nguyên. Bản 1536² cũ đang ở `.tmp_map1536/` (24 MB, có thể xoá).
4. **`fx/` 251 file mồ côi (11.9 MB)**: không bảng `m/c/f` nào tham chiếu. Có thể chuyển sang `_cleanup/` tương tự — chờ bạn đồng ý.
5. **`node_modules`**: chỉ `javascript-obfuscator` là cần cho build; xoá rồi `npm install` khi build lại.

## 5. Kiểm tra sau dọn dẹp

```
node build_obfuscate.js   → OK (4.features…, ver.json tăng)
node checks/check_maps.js        → 11 lỗi icon cũ, 1 cảnh báo (không đổi so với trước)
node check_fx.cjs         → 0 cảnh báo
node check_tdz.cjs        → 0 lỗi TDZ
node test_aura_all.cjs    → ✔ 55 mục đạt
test_bestdress / holo / ngua / xp → OK
```
