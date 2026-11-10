# AGENTS.md — Võ Lâm IDLE (VolamIDLE)

> Spec làm việc cho AI agent trong dự án này. Người đọc là agent, không phải người chơi.
> Đọc hết file này trước khi sửa bất cứ dòng code nào.

---

## 0. Giao thức làm việc (BẮT BUỘC — kế thừa từ `GEMINI.md`)

| Người dùng nói | Được phép làm |
| :--- | :--- |
| **"Thảo luận"** / hỏi ý kiến / xin phương án | CHỈ trò chuyện, phân tích, tư vấn. **KHÔNG** sửa file, KHÔNG tạo file code, KHÔNG build, KHÔNG đụng logic game. |
| **"Triển khai"** / "làm đi" / "chốt phương án" | Viết code, sửa file, chạy build, chạy test. |

Không có lệnh "Triển khai" thì mọi đề xuất chỉ nằm trong hội thoại.

---

## 1. Dự án là gì

Game nhập vai kiếm hiệp **treo máy (idle RPG)** chạy hoàn toàn trong trình duyệt, dựng lại dữ liệu
gốc Võ Lâm Truyền Kỳ (JX1): bản đồ có va chạm, quái + hoạt ảnh webp, hệ kỹ năng JX, trang bị,
ngũ hành tương sinh tương khắc, tổ đội 4 nhân vật (roster).

- Bản tham chiếu vận hành: **https://s1volam.esport9.com/** (Võ Lâm IDLE — eSport9).
- Ngôn ngữ sản phẩm: tiếng Việt. Thuật ngữ giữ đúng tên gốc VLTK (Tẩy Tủy, Kỳ Trân Các, Vòng Sáng,
  Bùa Lợi, Bùa Hại, Lực tay, Tiềm năng, Điểm kỹ năng...).
- Chạy local: `node local_server.js` → `http://localhost:8080/play.html` (hoặc `Chay_Game.bat`).

---

## 2. Cấu trúc thư mục — nơi code thật sự sống

```
index.html            trang giới thiệu, dẫn tới play.html
play.html             trang chơi game — CHỈ nạp 4 bundle trong assets/
js/                   mã nguồn tính năng (nguồn chân lý để build)
src_archive/          dữ liệu + engine gốc: data.js, world.js, zones2.js, jmo*.js, fx*.js, style.css...
ui/  img/  fx/  snd/  music/  fonts/   tài nguyên
assets/               bundle đã đóng gói — SINH RA KHI BUILD, KHÔNG commit, KHÔNG sửa tay
build_obfuscate.js    gộp + làm rối mã nguồn thành 4 bundle
checks/check_maps.js         kiểm tra bản đồ / quái / icon / độ mới của bundle
test_*.cjs            test logic bằng Node (không cần trình duyệt)
tools/sync_skills_web.cjs   đối chiếu định nghĩa kỹ năng với bundle của bản web
.tmp_web/game.js      cache bundle web (tải về khi chạy sync_skills_web)
```

### 4 bundle (thứ tự nạp trong `play.html` là bắt buộc)

| Bundle | Nội dung | Ghi chú |
| :--- | :--- | :--- |
| `1.data.*.bundle.js` | `src_archive/data.js`, `world.js`, `zones2.js`, `jmo*`, `fx*` | dữ liệu tĩnh ~3.6 MB, chỉ dọn comment, KHÔNG làm rối |
| `2.skills_data.*.bundle.js` | `skstd.js`, `skills-120.js`, `skills-150-all.js` | định nghĩa kỹ năng, không làm rối |
| `3.engine.*.bundle.js` | core, stats, combat, render, look, ui, control... | làm rối (stringArray) |
| `4.features.*.bundle.js` | shop, party, guild, ui20, roster, bestdress, holo... | làm rối (stringArray) |

Danh sách file của từng tier nằm ở đầu `build_obfuscate.js` (`tier1_files` … `tier4_files`).
**Thêm file mới vào `js/` thì phải thêm tên file vào đúng tier, nếu không nó không được bundle.**

---

## 3. Quy trình bắt buộc sau khi sửa mã nguồn

```bash
node build_obfuscate.js     # gộp + làm rối, cập nhật play.html và tăng ver.json
node checks/check_maps.js          # bản đồ/quái/icon thiếu + bundle có cũ hơn mã nguồn không
node tests/test_bestdress.cjs     # (và các test_*.cjs liên quan tới phần vừa sửa)
```

Sửa `js/` hoặc `src_archive/` mà **không build lại thì game không đổi gì** — `play.html` chỉ nạp
bundle. Đây là lỗi phổ biến nhất trong dự án; luôn build rồi mới báo "đã sửa xong".

---

## 4. Quy ước code

- File trong `js/` là script toàn cục (không ES module, không import). Chúng dùng chung `S`, `R`,
  `SK`, `FAC`, `J`, `H`, `CV`, `$`, `esc`, `log`, `toast`, `save`, `recalc`, `modal`... —
  **không khai báo lại**, không bọc trong IIFE nếu cần gọi chéo từ file khác.
- `"use strict"` ở đầu file; style nén (nhiều câu lệnh một dòng) là chủ ý — giữ nguyên kiểu đó khi
  sửa trong file đã nén, đừng "format lại đẹp" cả file.
- Biến/hàm mới phải **duy nhất toàn cục**: kiểm tra bằng `grep -o "<tên>" js/*.js src_archive/*.js`
  trước khi đặt. Trùng tên trong bundle = lỗi im lặng rất khó tìm.
- Tên hàm/biến giữ kiểu tiếng Việt không dấu, ngắn (`skLearn`, `tayTuy`, `auraLvOf`, `bookUse`).
- Comment giải thích **lý do** (đặc biệt khi lệch so với bản web) bằng tiếng Việt, đặt ngay trên hàm.
- Chuỗi hiển thị cho người chơi: tiếng Việt, có dấu, dùng `<b style="color:#ffd24a">` cho tên vật
  phẩm/kỹ năng trong `log()`.
- Mọi thay đổi trạng thái người chơi phải đi qua `save()` (và `R.dirty = !0` nếu đổi chỉ số).

---

## 5. Bản đồ khái niệm nhanh (tra trước khi đọc cả file)

| Cần tìm | File |
| :--- | :--- |
| Định nghĩa kỹ năng `SK[id]`, `J`, `FAC`, `SK_STD` | `src_archive/data.js`, `js/skstd.js`, `js/skills-120.js`, `js/skills-150-all.js` |
| Học / Tẩy Tủy / Bí Kíp 90 / nhánh 90 | `js/vocong.js` |
| Loại kỹ năng (atk/aura/buff/curse/passive), Vòng Sáng, bùa lợi/hại, aura tổ đội | `js/skillsys.js` |
| Tính chỉ số từ trang bị + passive + aura | `js/stats.js` (`calc`, `addAttr`, `allskill_v`) |
| Sát thương, kháng, ngũ hành | `js/combat.js` (`applyPart`, `counters`) |
| Chiến đấu, đạn bay, hiệu ứng chiêu | `js/combat.js`, `js/vltk_missiles.js`, `js/jxmis.js`, `js/skillfx.js`, `js/vli-skill-visuals-v7.js` |
| Bản đồ / bãi luyện công / quái | `src_archive/world.js`, `src_archive/zones2.js`, `js/field.js` |
| Đội 4 nhân vật (roster) | `js/roster.js`, `js/party.js` |
| Mặc đồ tốt cho cả đội | `js/bestdress.js` |
| Ngựa / Mã Trường | `js/horse.js`, `js/ngua.js`, `js/ride.js` |
| Giao diện mobile / PC, menu, khung chat | `js/ui.js`, `js/ui20.js`, `js/ui20win.js`, `js/tabs2.js`, `ui/*.css` |
| Lưu game, phiên bản, PWA | `js/save.js`, `js/pwa.js`, `ver.json`, `sw.js` |

---

## 6. Đối chiếu với bản web (s1volam.esport9.com) — cách làm đúng

Bản web là **nguồn tham chiếu hành vi**, không phải nguồn để copy nguyên khối.

1. Bundle web là công khai: `dist/game.<hash>.js` (không cần đăng nhập) + `js/chatcfg.js` +
   `js/gcfgdata.js` (cấu hình sinh bởi server). `tools/sync_skills_web.cjs` tải và so từng trường
   của mọi kỹ năng với `src_archive/data.js`.
2. Dùng `node tools/sync_skills_web.cjs` (báo cáo) trước, chỉ `--apply --only=...` cho nhóm nhỏ,
   rồi build và thử. **Không** áp hàng loạt: engine hai bản hiểu khác nhau ở
   `skill_skillexp_v`, `addskilldamage*`, `addskillexp*`.
3. Khi bê logic từ web về: viết lại theo style dự án, giữ nguyên **công thức và hằng số**, và
   ghi comment "Như bản web (tên hàm viết tắt của web)" để lần sau đối chiếu được.
4. Ba điểm đã biết là khác nhau có chủ ý — **đừng "sửa" theo web**:

| Chủ đề | Bản web | Dự án này | Lý do |
| :--- | :--- | :--- | :--- |
| `+ cấp kỹ năng` từ trang bị (`allskill_v`) | chỉ cộng vào dòng thuộc tính (`[cấp,0,0]`), KHÔNG nâng cấp kỹ năng đang dùng | cộng vào cấp hiệu lực (`skAdd`, `plusSkill`) | người chơi local cần thấy điểm cộng có tác dụng |
| Vòng sáng (aura) | chỉ tính khi đang bật (`pm`/`j6`) | **bị động**: đã học là cộng chỉ số, `S.auraOff` chỉ tắt hiệu ứng | tránh mất trắng chỉ số khi quên bật |
| Aura nhiều nhân vật | lấy cấp cao nhất trong đội, không cộng dồn | giống web (`allyAuraAttr`) nhưng hiển thị riêng từng người | giữ công bằng giữa 4 nhân vật |

Ngoài ra: bản này **offline thuần** (`js/chatcfg.js`: `mode: "offline"`), không có server, không
có chợ/xếp hạng thật. Đừng thêm phụ thuộc vào API của web.

---

## 7. Kỹ năng agent nên nạp cho dự án này

Các skill đã cài trong workspace (dùng `skill_view` để đọc):

- `game-systems-design` — thiết kế vòng lặp, state, feedback trước khi thêm tính năng.
- `game-mechanics-design` — chọn cơ chế người chơi lặp lại, độ dễ hiểu, tutorial.
- `game-balance-analysis` — cân bằng số: sát thương, tiến trình, tỉ lệ rơi, giá trị trang bị.
- `frontend-design` — dựng/sửa UI (spacing 4-8-12-16-24-32-48-64, một màu nhấn, đủ state).
- `debugging`, `testing`, `code-review` — khi sửa lỗi, viết test, review diff.

Với dự án này, thứ tự đúng là: **systems → mechanics → balance → frontend → test**.

---

## 8. Hard rules

- KHÔNG sửa tay file trong `assets/`, KHÔNG sửa `play.html` phần `<script src="assets/...">`.
- KHÔNG commit `assets/`, `.tmp_web/`, `node_modules/` (đã có trong `.gitignore`).
- KHÔNG đổi tên hay xoá kỹ năng/bản đồ/vật phẩm đã có ID — save của người chơi tham chiếu theo ID.
- KHÔNG đổi cấu trúc `S` (save) mà không có hàm migrate; nếu buộc phải đổi, viết migrate trong
  `js/save.js` và kiểm tra bằng một save cũ.
- KHÔNG đưa `controlFlowFlattening` / `deadCodeInjection` vào `build_obfuscate.js` (giết 60fps).
- KHÔNG gọi API/websocket của bản web trong build local.
- Mọi khẳng định "đã sửa" phải kèm bằng chứng: output của `checks/check_maps.js` hoặc `test_*.cjs`.

## 9. Kiểm tra bắt buộc trước khi báo "xong"

```bash
node build_obfuscate.js   # sửa js/ hoặc src_archive/ xong phải build
node check_tdz.cjs        # chạy bundle thật trong VM, bắt "Cannot access X before initialization"
node check_fx.cjs         # bảng hiệu ứng → file webp → kích thước khung → pre phân giải
node checks/check_maps.js        # bản đồ / quái / icon
node test_aura_all.cjs    # vòng sáng (gộp aura + aura_team + aura_fx + mongdiep)
node tests/test_bestdress.cjs
node test_holo.cjs
node test_ngua.cjs
node test_xp.cjs
```

## check_tdz.cjs — cách hoạt động (đọc trước khi sửa)

Script **không đọc tĩnh** nữa (cách đó báo nhầm hàng trăm biến cục bộ). Nó:
1. nạp bundle 1→4 của `assets/` trong VM tối thiểu (giả lập DOM/localStorage);
2. gọi lần lượt `calc`, `horseAttr`, `horseFixReq`, `ngFloorFix`, `ngKichDuyen`, `save`, `tick`,
   `rosterTick`, `u20Init`, `refresh`, `renderSkill/Char/Inv`;
3. báo mọi lỗi `Cannot access 'X' before initialization`.

Bắt buộc chạy **sau** `node build_obfuscate.js`, vì nó kiểm đúng file bundle trình duyệt nạp.

### Bẫy đã gặp (2026-11-09) — nguyên nhân gốc và cách chặn

`build_obfuscate.js` **xoá comment phân cách giữa các file**, còn JavaScript-Obfuscator **dồn các khai
báo `const` liền nhau thành một câu lệnh**. Hệ quả: khai báo `let NG_KD_CACHE` (dòng 20 của
`js/ngua.js`) bị **kéo xuống giữa file ngua.js trong bundle**, và vì `ngua.js` đứng **gần cuối** tier4
nên `horse.js` (nạp trước) gọi `ngFloorFix` / `ngKichDuyenAttr` lúc `init()` → **TDZ**.

**Đã sửa gốc:** đưa `js/ngua.js` lên **ĐẦU** `tier4_files` (có comment giải thích ngay trong build
script). Kiểm chứng trong bundle thật: `let NG_KD_CACHE` ở offset **596**, `NG_TIERS=[` ở **750**,
`function horseAttr(` ở **171441** → khai báo đứng trước chỗ dùng.

Ba lớp phòng thủ (giữ nguyên):

1. `js/horse.js` chỉ gọi hàm của `ngua.js` qua `typeof … === "function"` — file chưa nạp xong thì bỏ qua.
2. Mọi "bọc hàm" (monkey-patch) phải nằm ở **CUỐI file** (`js/roster.js`: heroAttack, gainXp, save,
   tick, movers). Đặt giữa file thì `init()` → `save()`/`calc()` chạm `const` chưa chạy tới.
3. Comment **không nêu tên biến** dễ gây nhầm (một lần tái diễn là do tên biến nằm trong comment).

**Quy tắc:** nếu một biến/hàm được `init()`, `calc()`, `recalc()`, `refresh()`, `save()`, `tick()`
gọi tới, nó phải là `function` (hoisted) hoặc **khai báo trong file nạp TRƯỚC** — không được là
`const/let` của file nạp sau.

### Chạy thử trên máy

```
Chay_Game.bat        # tự tìm node (PATH hoặc Program Files), cảnh báo & dọn cổng 8080 nếu bị chiếm
node local_server.js # chạy trực tiếp; báo lỗi rõ ràng nếu cổng đã dùng
```
