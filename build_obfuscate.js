/**
 * BUILD & OBFUSCATE SCRIPT FOR JX2 / VOLAM IDLE
 * 
 * Chiến lược:
 * 1. Bundle 1 (data) & Bundle 2 (skills_data):
 *    - Dữ liệu tĩnh mảng/object rất lớn (3.6MB & 0.8MB).
 *    - Không mã hóa chuỗi làm rối cấu trúc (để tránh lag và load chậm cho điện thoại).
 *    - Chỉ dọn dẹp comment/whitespace an toàn.
 * 
 * 2. Bundle 3 (engine) & Bundle 4 (features):
 *    - Chứa logic chiến đấu, combat, save, GM, auth, kết nối, anti-cheat, kỹ năng.
 *    - Thực hiện MÃ HÓA LÀM RỐI (JavaScript-Obfuscator):
 *      + stringArray: true, stringArrayThreshold: 0.8, stringArrayEncoding: ['base64']
 *      + rotateStringArray: true, shuffleStringArray: true
 *      + splitStrings: true
 *      + renameGlobals: false (BẢO TOÀN BIẾN TOÀN CỤC & TƯƠNG TÁC DOM/HTML)
 *      + controlFlowFlattening: false (giữ hiệu năng 60fps khi đánh quái)
 *      + deadCodeInjection: false
 *      + reservedNames & reservedStrings: bảo vệ các hàm/biến cốt lõi.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
let JavaScriptObfuscator;
try {
  JavaScriptObfuscator = require('javascript-obfuscator');
} catch (e) {
  console.error('[LỖI] Thiếu javascript-obfuscator. Chạy npm install rồi build lại.');
  process.exit(1);
}

const volamDir = path.resolve(__dirname);

// Bẫy chống DevTool / Extension can thiệp trái phép & Domain Lock
const ANTI_DEVTOOL_SNIPPET = "";

const tier1_files = [
  'src_archive/data.js', 'src_archive/setvi.js', 'src_archive/setfix.js', 'src_archive/bkvng.js',
  'src_archive/world.js', 'src_archive/zones2.js', 'src_archive/animfix.js', 'src_archive/sound.js', 'src_archive/fx.js',
  'src_archive/fx_bosung.js', 'src_archive/fx_native_motion.js', 'src_archive/fx_trangthai.js',
  'src_archive/fx_tucthoi.js', 'src_archive/jmo.js', 'src_archive/jmo2.js'
];

const tier2_files = [
  'js/skstd.js', 'js/skills-120.js', 'js/skills-150-all.js', 'js/core.js', 'js/mapobs.js', 'js/stats.js',
  'js/vocong.js', 'js/skillsys.js', 'js/kytran.js', 'js/loot.js', 'src_archive/rdata.js',
  'js/sets.js', 'js/recipes.js', 'js/procs.js'
];

const tier3_files = [
  'js/combat.js', 'js/field.js', 'js/ride.js', 'js/save.js', 'js/guard.js',
  'js/render.js', 'js/fx_tracking.js', 'js/vltk_missiles.js', 'js/jxmis.js', 'src_archive/jxstate.js',
  'src_archive/fx2.js', 'src_archive/fx3.js', 'src_archive/fx_web_sync.js', 'src_archive/shadow_web_sync.js', 'js/skillfx.js', 'js/aura_team_fx.js', 'js/vli-skill-visuals-v7.js',
  'js/look.js', 'js/jxparts.js', 'js/look_engine.js', 'js/graphics_quality.js', 'js/audio.js', 'js/ui.js', 'js/control.js', 'js/hit_timing.js', 'js/hit_collision.js', 'js/hit_stop.js', 'js/bigmap.js'
];

const tier4_files = [
  // ngua.js PHẢI đứng đầu: horse.js (nạp sau) gọi ngFloorFix/ngKichDuyenAttr/ngTierRow ngay trong init().
  // Obfuscator dồn khai báo const/let nên file nạp sau có thể bị đẩy xuống → TDZ.
  'js/ngua.js',
  'js/shop.js', 'js/potsel.js', 'js/rewards.js', 'js/title.js', 'js/realm.js', 'js/records.js',
  'js/horse.js', 'js/thanma.js', 'js/duel.js', 'js/tyvo.js', 'js/tongkim.js', 'js/tk_battle_dev.js', 'js/real_tk.js',
  'js/dungeon.js', 'js/giangho.js', 'js/forge.js', 'js/epdo.js', 'js/thuyen.js',
  'js/mode.js', 'js/tabs2.js', 'js/auto.js', 'js/guide.js', 'js/stash.js',
  'js/donkho.js', 'js/name.js', 'js/net.js', 'js/chatcfg.js',
  'js/chat.js', 'js/market.js', 'js/vip.js', 'js/pwa.js', 'js/party.js',
  'js/guild.js',
  'js/presence.js', 'js/ui20.js', 'js/ui20win.js', 'js/boss_priority_ui.js', 'js/csel.js',
  'js/skills-120-active.js', 'js/tooltip.js', 'js/main.js', 'js/roster.js', 'js/roster_summon.js',
  'js/bestdress.js', 'js/holo.js'];

// File thử nghiệm được giữ trong cây nguồn nhưng không phát hành vào game.
const BUILD_EXCLUDED_FILES = ['js/pet_system_dev.js'];

// Danh sách từ khóa toàn cục cần bảo vệ tuyệt đối (Reserved Names)
const RESERVED_NAMES = [
  'heroLook', 'drawLookFx', 'drawAura', 'drawJxHero', 'jxHeroSetup', 'jxBuildLook', 'SERIES_GLOW_CORE', 'SERIES_GLOW_OUTER',
  'allyEnts', 'allyDraw', 'allyTgt', 'allyHurt', 'rosterTick',
  'SERIES_GLOW_AURA', 'S', 'R', 'NET', 'J', 'W', 'FAC', 'SERIES',
  'SLOT', 'calc', 'recalc', 'init', 'frame', 'save', 'closeModal', 'modal',
  'itemModal', 'itemHTML', 'chatShowItem', 'openTyvoModal', 'startTyvo', 'NO', 'LO', 'FO',
  'MO', 'tyvo', 'openGuildModal', 'getMyGuild', 'getStoredGuilds', 'checkAccountBanned', 'openGmAccessModal', 'forceAppUpdate',
  'openUpdateModal', 'setupVerButtons', 'checkUpdateVer', 'appVerCheck', 'maintOn', 'uiSfx', 'u20On', 'APP_V',
  'LATEST_VER', 'esc', 'toast', 'log', 'hero', 'mon', 'monsters', 'target',
  'inv', 'bag', 'skills', 'arena', 'ctx', 'canvas', 'view', 'equip',
  'wear', 'useSkill', 'openRealmModal', 'getRealmStats', 'getCurrentRealm', 'advanceRealm', 'getRealmTitle', 'getRealmIndex',
  'drawRealmRingAnim', 'REALM_RINGS', 'tkBattleStart', 'tkBattleSpawnWave', 'tkBattleWaveCleared', 'tkBattleFinish', 'tkBattleBody', 'bindTkBattleTab',
  'drawTkBattleHud', 'tkAllyEnts', 'tkAllyDraw', 'netOn', 'netUpload', 'netUploadSlot', 'netCheckCloud', 'netCloudList',
  'netCloudLoad', 'netSyncChar', 'netInit', 'netModal', 'netEnsureUser', 'CSEL', 'slotMenu', 'cselClose',
  'cselEnter', 'cselPanel', 'cselDraw', 'pickFaction', 'createCharacter', 'CV', 'CX', 'DPR', 'drawGroundShadow',
  'AR', 'resizeArena', 'CAM', 'snapCamera', 'GFRUIT', 'goldFruitTick', 'goldFruitGo', 'drawGoldFruitInWorld',
  'tryHarvestFruit', 'openFruitPack', 'codexGoldFruitHtml', 'getGoldFruitSchedule', 'testFruitSpawn', 'goldFruitBody', 'getMyGuildSkillBonuses', 'guildSkillAttr',
  'handleRemoteGuildSync', 'sendGuildChat', 'pushGuildSystemChat', 'renderGuildShopTab', 'handleBuyGuildShopItem', 'enterGuildBase', 'leaveGuildBase', 'guildBaseTick',
  'inGuildBase', 'onGuildBossKilled', 'partyAuraAttr', 'partyExpBonus', 'partyMates', 'PARTY_AURAS', 'PARTY_MAX', 'PT_MAX',
  'ptModal', 'PT', 'PTC', 'ptcView', 'PARTY', 'partyInvite', 'partyLeave', 'partyKick',
  'partyAppoint', 'partyDisband', 'partyClose', 'ptcSay', 'ptBtnInit', 'sendPartyChat', 'handleRemotePartyChat', 'handleRemotePartySync',
  'handleRemotePartyEvent', 'pushPartySystemChat', 'handleRemotePartyMessage'
];

const BUNDLE_CONFIGS = [
  {
    name: '1.data.bundle.js',
    files: tier1_files,
    obfuscate: false
  },
  {
    name: '2.skills_data.bundle.js',
    files: tier2_files,
    obfuscate: false
  },
  {
    name: '3.engine.bundle.js',
    files: tier3_files,
    obfuscate: true
  },
  {
    name: '4.features.bundle.js',
    files: tier4_files,
    obfuscate: true
  }
];

function md5Hash(str) {
  return crypto.createHash('md5').update(str, 'utf8').digest('hex').slice(0, 8);
}

async function build() {
  console.log('=== BẮT ĐẦU ĐÓNG GÓI VÀ MÃ HÓA BUNDLE JX2 ===');
  
  // Dọn dẹp bundle cũ trong thư mục assets/ của cả 2 repo nếu có
  const targetDirs = [volamDir];

  for (const base of targetDirs) {
    const assetsDir = path.join(base, 'assets');
    if (fs.existsSync(assetsDir)) {
      const files = fs.readdirSync(assetsDir);
      for (const f of files) {
        if (f.endsWith('.bundle.js')) {
          fs.unlinkSync(path.join(assetsDir, f));
        }
      }
    }
  }

  const bundleTags = [];

  for (const cfg of BUNDLE_CONFIGS) {
    console.log(`\n-> Đang xử lý: ${cfg.name} (${cfg.files.length} files)...`);
    const chunks = [];
    
    if (cfg.obfuscate) {
      chunks.push(ANTI_DEVTOOL_SNIPPET);
    }

    for (const rel of cfg.files) {
      const fullPath = path.join(volamDir, rel);
      if (!fs.existsSync(fullPath)) throw new Error(`Không tìm thấy file nguồn: ${rel}`);
      let content = fs.readFileSync(fullPath, 'utf8').trim();
      chunks.push(`/* --- ${rel} --- */\n${content}`);
      if (!content.endsWith(';')) {
        chunks.push(';');
      }
    }

    let code = chunks.join('\n');
    console.log(`   Dung lượng gốc: ${(code.length / 1024).toFixed(1)} KB`);

    if (cfg.obfuscate) {
      console.log(`   Đang làm rối mã nguồn (Obfuscating)...`);
      const startTime = Date.now();
      const obfResult = JavaScriptObfuscator.obfuscate(code, {
        compact: true,
        controlFlowFlattening: false,
        deadCodeInjection: false,
        debugProtection: false,
        disableConsoleOutput: false,
        identifierNamesGenerator: 'hexadecimal',
        log: false,
        numbersToExpressions: false,
        renameGlobals: false,
        selfDefending: false,
        // Cùng source + dependency phải tạo cùng hash để cache và review ổn định.
        seed: 'volam-idle-build-v1',
        simplify: true,
        splitStrings: true,
        splitStringsChunkLength: 10,
        stringArray: true,
        stringArrayEncoding: ['base64'],
        stringArrayThreshold: 0.8,
        rotateStringArray: true,
        shuffleStringArray: true,
        stringArrayIndexShift: true,
        reservedNames: RESERVED_NAMES,
        reservedStrings: ['^/api/', '^/auth/', '^/gm/', 'vli_']
      });
      code = obfResult.getObfuscatedCode();
      console.log(`   Hoàn tất làm rối trong ${((Date.now() - startTime) / 1000).toFixed(2)}s`);
      console.log(`   Dung lượng sau mã hóa: ${(code.length / 1024).toFixed(1)} KB`);
    }

    const hash = md5Hash(code);
    const hashedName = cfg.name.replace('.bundle.js', `.${hash}.bundle.js`);

    for (const base of targetDirs) {
      const outPath = path.join(base, 'assets', hashedName);
      fs.writeFileSync(outPath, code, 'utf8');
      console.log(`   Đã ghi: ${hashedName} vào ${path.basename(base)}/assets/`);
    }

    bundleTags.push(`<script src="assets/${hashedName}"></script>`);
  }

  // Cập nhật index.html
  console.log('\n-> Cập nhật play.html...');
  const playHtmlPath = path.join(volamDir, 'play.html');
  let html = fs.readFileSync(playHtmlPath, 'utf8');

  const idxStart = html.indexOf('<script src="assets/1.data.');
  const idxEnd = html.indexOf('</body>');

  if (idxStart !== -1 && idxEnd !== -1) {
    const newScripts = bundleTags.join('\n') + '\n';
    const newHtml = html.slice(0, idxStart) + newScripts + html.slice(idxEnd);

    for (const base of targetDirs) {
      fs.writeFileSync(path.join(base, 'play.html'), newHtml, 'utf8');
      fs.writeFileSync(path.join(base, 'game.html'), newHtml, 'utf8');
      console.log(`   Đã cập nhật play.html + game.html trong ${path.basename(base)}`);
    }
  } else {
    console.error(' [LỖI] Không tìm thấy vùng thẻ script trong play.html');
    process.exit(1);
  }

  // Tăng version và đổi namespace cache. Worker mới sẽ xóa cache ảnh của bản trước.
  const verPath = path.join(volamDir, 'ver.json');
  if (fs.existsSync(verPath)) {
    const verData = JSON.parse(fs.readFileSync(verPath, 'utf8'));
    verData.v = Date.now();
    for (const base of targetDirs) {
      fs.writeFileSync(path.join(base, 'ver.json'), JSON.stringify(verData, null, 2), 'utf8');
      const swPath = path.join(base, 'sw.js');
      if (!fs.existsSync(swPath)) continue;
      const swSource = fs.readFileSync(swPath, 'utf8');
      const swVersioned = swSource
        .replace(/const C\s*=\s*"jxidle-v[^"]*";/, `const C = "jxidle-v${verData.v}";`)
        .replace(/const IMG\s*=\s*"jxidle-img-[^"]*";/, `const IMG = "jxidle-img-${verData.v}";`);
      if (swVersioned === swSource) throw new Error('Không tìm thấy marker version cache trong sw.js');
      fs.writeFileSync(swPath, swVersioned, 'utf8');
    }
    console.log(`   Đã tăng version + cache namespace -> ${verData.v}`);
  }

  console.log('\n=== TẤT CẢ BUNDLE ĐÃ ĐƯỢC MÃ HÓA & ĐÓNG GÓI THÀNH CÔNG 100% ===');
}

if (require.main === module) {
  build().catch(err => {
    console.error('Lỗi trong quá trình build:', err);
    process.exit(1);
  });
}

module.exports = { BUNDLE_CONFIGS, BUILD_EXCLUDED_FILES, build };
