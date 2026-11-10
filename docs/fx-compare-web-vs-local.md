# So sánh bộ hiệu ứng kỹ năng — bản web (s1volam.esport9.com) vs bản local (VolamIDLE)

Đo ngày: 2026-11-09. Nguồn web: `dist/game.8fe12808fa5c.js?v=408` (bundle công khai) — bảng hiệu ứng
`i0 = {m, s, c, f}`, scale mặc định `do0 = 1.4`. Nguồn local: `src_archive/fx.js` (`window.JFX`),
`src_archive/fx_bosung.js` (`JFX_BS`), `src_archive/fx_native_motion.js`, `js/skills-150-all.js`,
`js/render.js` (`FX_SCALE = 1.4`). Công cụ: script Node tạm (đọc bảng từ bundle, không sửa gì trong repo).

## 1. Kết luận nhanh

**Bộ hiệu ứng của local là bản web + phần mở rộng**, không phải bản thiếu: 100% mục của web có mặt ở
local với giá trị giống; local có thêm 77 mục `m`, 63 mục `s`, 261 mục `f` (cho kỹ năng 120/150 và
hiệu ứng native). Chỉ **2 mục lệch giá trị**. Vấn đề thật nằm ở chỗ khác: **file webp thiếu** và
**hiệu ứng native không phân giải được**.

## 2. Bảng hiệu ứng

| Bảng | local | web | chỉ local | chỉ web |
| :--- | ---: | ---: | ---: | ---: |
| `m` (đạn bay / nổ) | 200 | 123 | 77 | 0 |
| `s` (kỹ năng → mục đạn) | 199 | 136 | 63 | 0 |
| `c` (hiệu ứng thi triển tại chỗ) | 7 | 7 | 0 | 0 |
| `f` (kỹ năng → hình thức) | 402 | 141 | 261 | 0 |

## 3. Hai mục lệch giá trị (lỗi thật, cần sửa)

| Mục | Local | Web | Ảnh hưởng |
| :--- | :--- | :--- | :--- |
| `m[165]` | `fly 166×108 ax82 ay94`, `hit 81×80 ax41 ay74` | `fly 100×65 ax49 ay56`, `hit 49×48 ax25 ay44` | dùng cho **skill 355** (cả hai bên đều trỏ tới 165). Bảng local sai hệ số so với chính file `fx/m165_fly.webp` (123 540 byte, giống hệt file của web) → chiêu 355 vẽ sai kích thước/tâm, lệch **−531×−691 px** trên khung đạn |
| `f[179]` | `{form:6,num:1,c:17,impact:221}` | `{form:6,num:1,pre:4,c:17}` | `impact:221` là khoá riêng của local; `render.js` đọc `l.impact` nên **vẫn chạy đúng** — khác biệt có chủ ý, không phải lỗi |

## 4. File hiệu ứng

- local tham chiếu **299** file webp (toàn bộ nằm trong `fx/`, đều tồn tại: 486 file trên đĩa, dùng 299).
- web tham chiếu **201** file; **cả 201 đều có trong `fx/` của local** (0 file thiếu).
- **64 file được bảng local tham chiếu nhưng KHÔNG có trên đĩa** — và cũng **404 trên chính server web**
  (`fx/m412_fly.webp`, `fx/m649_hit.webp`, `fx/m580_fly.webp` → 404). Đây là dữ liệu "ảo" có từ trước,
  không phải thiếu khi copy.

### 4.1 Mức độ hỏng

| Mức | Số mục | Danh sách |
| :--- | ---: | :--- |
| `m` thiếu **cả** fly + hit (hiệu ứng chết hoàn toàn) | 27 | 412,413,415,416,417,418,426,427,523,527,528,529,531,577,578,579,580,637,639,640,642,644,645,646,647,648,649 |
| `m` thiếu 1 trong 2 khung | 10 | 414.fly, 419.fly, 420.fly, 421.fly, 422.fly, 424.fly, 526.fly, 574.fly, 576.hit, 638.fly |
| **Kỹ năng bị ảnh hưởng (không vẽ được gì)** | **31** | 1347,1351,1360,1361,1362,1363,1368,1372,1382,1383,1733,1963,1967,1969,1970,1972,1979,1981,1983,1985,2114,2120,2125,2126,2129,2136,2138,2140,2141,2142,2143 |

Toàn bộ 31 kỹ năng này **chỉ có ở local** (không có trong danh sách kỹ năng của web) — nhóm skill mở
rộng của dự án. Cùng một danh sách còn xuất hiện ở bảng `JFX_BS` (bản copy trùng của `fx_bosung.js`),
nên khi sửa phải sửa cả hai chỗ.

## 5. Hiệu ứng thi triển (`pre`) không phân giải

- 32 kỹ năng có `f[].pre`; trong đó **25 khoá không tồn tại trong bảng `c`**:
  `native_012ad8cfaf7c, native_29354f9a1b85, native_5e972cc14f57, native_c6cd1ecec92e, native_4f6186c4833c,
  native_bc268609fb8c, native_e335f1f8332b, native_7da7826f4aae, native_3dfa4815984e, native_0416839a1cf0,
  native_a246e530062d, native_1f905e639052, native_738e1f980ce3, native_d09f5ff9c644, native_4aca18689430,
  native_bce0eb4477c0, native_3bc673d7febf, native_2165dc5ea789, native_5bafa8023af3, native_8526039aa0cc,
  native_4cc01d50a919, native_4e59951c82c6, native_946c91ea907e, native_0a54726f2ae4, native_883bc1897e1a`
  → các chiêu này mất **hoạt ảnh thi triển tại chỗ**, chỉ còn đạn bay.
- `fx/jx/*.webp` (66 file hash) và `fx/advanced/advanced/*.webp` (72 file) **không được bảng nào
  tham chiếu** — không file nào trong hai thư mục này được nạp.

## 6. Độ phân giải khung hình — cả hai bên đều lệch, local không tệ hơn

Đo `w*scale*n × h*scale*d` (scale 1.4) so với kích thước thật của webp:

| | khớp | lệch |
| :--- | ---: | ---: |
| Web (`m`, 194 khung) | 28 | 166 |
| Local (`m`, 228 khung) | 62 | 166 |

- Lệch ở local: **99/166 chỉ lệch ≤2 px** (do atlas packer của web cắt bớt 1–6 px) — không thấy bằng mắt.
- **1 trường hợp lệch lớn**: `m165` (−531×−691) — chính là mục số 3 ở trên, phải sửa.
- Web dùng nearest-neighbour (`imageSmoothingEnabled = !1` khi tỉ lệ là số nguyên); `js/render.js` của
  local **không đặt** `imageSmoothingEnabled` → trình duyệt làm mượt ảnh (bilinear) khi phóng 1.4×,
  hiệu ứng hơi mờ. Đây là khác biệt *phong cách*, không phải lỗi chức năng.

## 7. Kỹ năng & danh mục

| | web | local |
| :--- | ---: | ---: |
| Kỹ năng định nghĩa | 236 | 295 (`JX.skills` 295 = 271 gốc + 24 skill 120/150) |
| Kỹ năng web KHÔNG có ở local | 0 | — |
| Kỹ năng chỉ local có | — | 59: 708–721 (nhóm 120), 1055–1081 (nhóm 150), 1110, 1114, 1220–1239, 2133 |
| Kỹ năng có đạn (`m`) | 119 | 161 |
| Kỹ năng **không** có hiệu ứng | 117 | 133 |

17 kỹ năng local có đạn mà web không (16,81,86,89,93,94,101,110,146,159,163,171,178,269,277,282,332):
đây là các chiêu được dựng thêm bằng bảng `s` + `pre` của local, không phải lỗi.

## 8. Trạng thái xử lý (cập nhật 2026-11-09, sau khi "Triển khai")

| # | Việc | Trạng thái | Ghi chú |
| :-- | :--- | :--- | :--- |
| 1 | Sửa `m[165]` | ✅ Xong | `src_archive/fx.js`: về `100×65 ax49 ay56` / `49×48 ax25 ay44`. `fx_bosung.js` không chứa mục này. Build lại → `1.data.684c3d2a.bundle.js`. |
| 2 | Bù file cho 27 mục `m` chết | ⏸ Chưa làm (ngoài phạm vi được giao) | Nguồn khả dĩ: `fx/advanced/advanced/*.webp` (72 file) và `fx/jx/*.webp` (66 file) — hiện **không bảng nào tham chiếu**. Cần map thủ công id → file. |
| 3 | 25 khoá `native_*` trong `f[].pre` | ✅ Xong | Xoá tham chiếu chết: 110 chỗ `"pre":"native_…"` → `"pre":null` (bảng `c` không có mục nào tên `native_*`). Bundle data còn 0 lần `native_`. |
| 4 | `imageSmoothingEnabled = false` | ✅ Xong | Đặt ngay sau `CX=CV.getContext("2d")` trong `js/main.js` (đã kiểm chứng có trong `4.features.e52436c2.bundle.js`), và đặt lại trong `resizeArena()` (`js/render.js`) vì gán `CV.width/height` reset trạng thái context. |
| 5 | Công cụ kiểm tra tự động | ✅ Xong | `check_fx.cjs` — `node check_fx.cjs` (exit 1 khi có lỗi), `--quiet`, `--warn-ok`. |

### Phát hiện thêm khi làm mục 3–5

- `f[].c` **không phải** khoá của bảng `c` mà là **số khung** của hiệu ứng thi triển (`render.js`
  đọc `l.c`). Chỉ `f[].pre` mới trỏ vào bảng `c`. Vì vậy 250 chỗ `f[].c` không có trong bảng `c`
  là **bình thường**, không phải lỗi.
- Phép đo kích thước khung đúng phải là `w*n × h*d` (atlas ghép n khung × d hàng), **không** nhân
  `FX_SCALE` — scale chỉ áp lúc vẽ. Đo sai công thức từng sinh cảnh báo giả cho 235 khung.
- Sau khi sửa: `check_fx.cjs` báo **0 cảnh báo**, còn **65 lỗi** — toàn bộ là 64 file webp của nhóm
  `m` chết ở mục 2 (404 cả trên server web), tức đúng như dự kiến cho tới khi làm mục 2.

### Quy trình từ nay

```
node build_obfuscate.js   # sửa js/ hoặc src_archive/ xong phải build
node check_fx.cjs         # bảng hiệu ứng → file → kích thước → pre phân giải
node checks/check_maps.js
```

---

## 9. Kiểm tra riêng kỹ năng 141 — Liệt Hỏa Tình Thiên

So từng trường với `web_skills_lit` (định nghĩa kỹ năng lấy từ bundle web) và mô phỏng sát thương
bằng công thức của cả hai engine (nhân vật mẫu: lực tay 900–1300, +120% ngoại công, nội công 800,
chiêu cấp 20).

| Hạng mục | Local | Web | Kết luận |
| :--- | :--- | :--- | :--- |
| Hiệu ứng `f[141]` | `{form:3,num:16,pre:5,c:56}` | giống hệt | ✅ |
| Đạn `m[56]` (fly 170×102×3, hit 62×67×6, spd 324) | giống hệt | giống hệt | ✅ |
| `physicsenhance_p` cấp 20 | 75 | 75 | ✅ |
| `firedamage_v` cấp 20 | [150,0,150] | [150,0,150] | ✅ |
| `skill_attackradius` / `missle_speed_v` / `skill_cost_v` | 448 / 28 / 25 | 448 / 28 / 25 | ✅ |
| `seriesdamage_p` cấp 20 | 30 | 30 | ✅ |
| Hình thức: form 3 (vòng), 16 đạn, bán kính 72 | giống hệt | giống hệt | ✅ |
| `addskilldamage1` → 361 Vân Long Kích | +55% | +55% | ✅ |
| **`addskilldamage2` → 1075 Giang Hải Nộ Lan** | **thiếu** (đã bổ sung) | +45% | ❌→✅ |
| Sát thương mỗi đòn (engine riêng) | 150 | 150 | ✅ chênh 0.00% |

**Kết luận:** trước khi sửa, 141 đã chạy **giống hệt web** ở mọi mặt người chơi thấy (hiệu ứng, sát
thương, hình thức đánh, nội lực, tốc độ) — chỉ thiếu một dòng cộng dưỡng cho chiêu 1075. Đã thêm
`addskilldamage2` vào `src_archive/data.js` và build lại.

### Phát hiện rộng hơn: 83 kỹ năng thiếu `addskilldamageN` so với web

Ví dụ 10, 14, 29, 30 (web có tới `addskilldamage6`, local chỉ tới 4), 34 (web tới 7), 45 (web tới 9).
Nguyên nhân: dữ liệu kỹ năng của local lấy từ nguồn cũ hơn bản web. **Chưa áp hàng loạt** vì một số
đích đến không tồn tại trong danh sách kỹ năng của web (ví dụ 1075 là chiêu cấp 150 chỉ có ở local).
Cách làm an toàn: `node tools/sync_skills_web.cjs --apply --only=<id>` theo từng nhóm, build, thử.

---

## 10. Đồng bộ `addskilldamageN` (đã triển khai)

Công cụ mới: `tools/sync_addskilldamage.cjs`

```
node tools/sync_addskilldamage.cjs          # báo cáo
node tools/sync_addskilldamage.cjs --apply  # ghi (sao lưu data.js), rồi build
```

Chỉ **thêm khoá mà local còn thiếu** — không ghi đè giá trị đã có, không sửa trường khác, và bỏ qua
mục trỏ tới chiêu không tồn tại trong `JX.skills`.

| | Trước | Sau |
| :--- | ---: | ---: |
| Kỹ năng thiếu `addskilldamageN` so với web | 83 | 83 − 72 = **11 kỹ năng** (54 khoá) |
| Khoá `addskilldamageN` giống hệt web | — | **191 / 191** (0 khác) |
| Khoá đã thêm | — | **75 khoá trên 72 kỹ năng** |

### 54 khoá còn thiếu — lý do bỏ qua (đúng như thiết kế)

Chúng trỏ tới các chiêu **chỉ có ở web**, không tồn tại trong `JX.skills` của dự án:
`1083, 1084, 1086, 1087, 1088, 1091, 1093, 1094, 1095, 1096, 1097, 1099, 1100, 1101, 1104, 1107, 1108, 1109, 1113…`
(gia đình 1064–1109). Các chiêu này thuộc nhóm 150/175 của web; dự án dùng bộ 120/150 riêng
(`skills-120.js`, `skills-150-all.js`). Muốn có thì phải **import cả định nghĩa chiêu**, không phải chỉ
thêm một dòng attr — để dành quyết định riêng.

### Ví dụ hiệu lực đã thêm

| Chiêu | Khoá mới | Cộng vào chiêu đích |
| :--- | :--- | :--- |
| 10 Kim Cang Phục Ma | `addskilldamage5`, `6` | 1056, 1057 (+54%, +51%) |
| 14 Hàng Long Bất Vũ | `addskilldamage6` | 1055 (+125%) |
| 45 Phích Lịch đơn | `addskilldamage7, 8, 9` | tới 1101/1109 |
| 141 Liệt Hỏa Tình Thiên | `addskilldamage2` | 1075 Giang Hải Nộ Lan (+45%) |

### Ghi chú kiểm tra

`test_mongdiep.cjs` và `test_aura_fx.cjs` báo hỏng 1–3 mục ("stats.js tính vòng sáng bất kể đã bấm Bật",
nhãn "Vòng sáng · bị động", chuỗi `hiệu ứng</button>`). Đây là **test cũ so với mã hiện tại**, không
phải hồi quy của đợt này: `js/stats.js` trong repo (cả bản HEAD lẫn bản làm việc) dùng `skApplies(l)`
chứ không dùng regex mà test tìm, và nút bật/tắt trong `js/skillsys.js` là
`<button ... data-aura="${t.id}">Bật/Tắt</button>` (không có chữ "hiệu ứng").

---

## 11. Kết quả hai việc cuối

### 11.1 Sửa 2 test cũ (đã xong)

| Test | Dòng sai | Sửa thành |
| :--- | :--- | :--- |
| `test_mongdiep.cjs` | tìm regex `l.aura&&S.sk[l.id]>0&&skKind(l)==="aura"` trong `js/stats.js`; tìm nhãn `Vòng sáng · bị động`; tìm `data-aura="${t.id}">${(S.auraOff…` | kiểm `typeof skApplies==="function"&&!skApplies(l)` (đúng mã hiện tại) + có `auraPassiveOn`; nhãn `<span class="tag aura">Vòng sáng</span>`; nút `data-aura="${t.id}">${off?"Bật":"Tắt"}</button>` + `querySelectorAll("[data-aura]")` |
| `test_aura_fx.cjs` | tìm chuỗi `hiệu ứng</button>` | cùng nút `data-aura="…">Bật/Tắt</button>` + bind `[data-aura]` |

Kết quả: cả hai **✔ Tất cả kiểm tra đạt** (trước đó: 3 và 1 mục hỏng).

### 11.2 Nhóm chiêu 1064–1109: **không import được** — nguồn không tồn tại

Đã kiểm tra bundle công khai của web (`dist/game.*.js`):

- Map `skills:{…}` của web có **236 kỹ năng, id lớn nhất là 630**. Không có định nghĩa kỹ năng nào ≥ 1000.
- Các id **1064–1109** trong bundle web là **quái/NPC** (`Thành Niên Võ sĩ Hải Đường`, `Tống Chủ Soái wu`,
  `Đèn trung thu`…), không phải chiêu.
- Vì vậy `addskilldamageN` mà web ghi `[[1083,0,…]]` trỏ tới **id quái**, không phải chiêu — dữ liệu bẩn
  phía web.

Kết luận: **54 khoá còn thiếu là đúng, không nên thêm.** Không có gì để import; nếu sau này cần thì phải
lấy định nghĩa chiêu từ dữ liệu JX gốc, không phải từ web này.
