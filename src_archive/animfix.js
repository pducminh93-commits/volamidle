"use strict";

// Đồng bộ metadata atlas với bundle web. Ảnh local và web giống hệt từng byte;
// bảng cũ chia sai frame nên animation Vi Sơn bị cắt vụn.
const ANIM_WEB_FIX = {
  enemy048: {
    st: { f: "enemy048_st.webp", n: 13, d: 8, w: 70, h: 80, ax: 35, ay: 75, ms: 132, fixed: 1 },
    run: { f: "enemy048_run.webp", n: 15, d: 8, w: 70, h: 80, ax: 35, ay: 75, ms: 38, fixed: 1 },
    at: { f: "enemy048_at.webp", n: 13, d: 8, w: 156, h: 129, ax: 78, ay: 108, ms: 33, fixed: 1 },
    hurt: { f: "enemy048_hurt.webp", n: 10, d: 8, w: 104, h: 100, ax: 52, ay: 95, ms: 42, fixed: 1 },
    die: { f: "enemy048_die.webp", n: 17, d: 8, w: 201, h: 133, ax: 100, ay: 91, ms: 53, fixed: 1 }
  },
  enemy069: {
    st: { f: "enemy069_st.webp", n: 7, d: 8, w: 80, h: 70, ax: 40, ay: 67, ms: 143, fixed: 1 },
    run: { f: "enemy069_run.webp", n: 15, d: 8, w: 82, h: 79, ax: 41, ay: 74, ms: 38, fixed: 1 },
    at: { f: "enemy069_at.webp", n: 15, d: 8, w: 108, h: 94, ax: 54, ay: 77, ms: 33, fixed: 1 },
    hurt: { f: "enemy069_hurt.webp", n: 6, d: 8, w: 80, h: 73, ax: 40, ay: 70, ms: 42, fixed: 1 },
    die: { f: "enemy069_die.webp", n: 9, d: 8, w: 83, h: 84, ax: 41, ay: 69, ms: 56, fixed: 1 }
  },
  enemy130: {
    st: { f: "enemy130_st.webp", n: 10, d: 8, w: 86, h: 113, ax: 43, ay: 108, ms: 143, fixed: 1 },
    run: { f: "enemy130_run.webp", n: 15, d: 8, w: 88, h: 95, ax: 44, ay: 87, ms: 38, fixed: 1 },
    at: { f: "enemy130_at.webp", n: 18, d: 8, w: 181, h: 124, ax: 91, ay: 112, ms: 31, fixed: 1 },
    hurt: { f: "enemy130_hurt.webp", n: 6, d: 8, w: 88, h: 111, ax: 44, ay: 106, ms: 42, fixed: 1 },
    die: { f: "enemy130_die.webp", n: 15, d: 8, w: 164, h: 142, ax: 82, ay: 104, ms: 53, fixed: 1 }
  },
  enemy135: {
    st: { f: "enemy135_st.webp", n: 10, d: 8, w: 42, h: 72, ax: 21, ay: 67, ms: 143, fixed: 1 },
    run: { f: "enemy135_run.webp", n: 15, d: 8, w: 50, h: 75, ax: 25, ay: 69, ms: 38, fixed: 1 },
    at: { f: "enemy135_at.webp", n: 14, d: 8, w: 92, h: 77, ax: 46, ay: 72, ms: 31, fixed: 1 },
    hurt: { f: "enemy135_hurt.webp", n: 6, d: 8, w: 64, h: 74, ax: 32, ay: 68, ms: 42, fixed: 1 },
    die: { f: "enemy135_die.webp", n: 16, d: 8, w: 166, h: 102, ax: 83, ay: 67, ms: 50, fixed: 1 }
  },
  enemy143: {
    st: { f: "enemy143_st.webp", n: 8, d: 8, w: 96, h: 79, ax: 48, ay: 74, ms: 143, fixed: 1 },
    run: { f: "enemy143_run.webp", n: 16, d: 8, w: 102, h: 89, ax: 51, ay: 81, ms: 36, fixed: 1 },
    at: { f: "enemy143_at.webp", n: 20, d: 8, w: 178, h: 115, ax: 89, ay: 102, ms: 31, fixed: 1 },
    hurt: { f: "enemy143_hurt.webp", n: 6, d: 8, w: 94, h: 81, ax: 47, ay: 76, ms: 42, fixed: 1 },
    die: { f: "enemy143_die.webp", n: 14, d: 8, w: 157, h: 123, ax: 79, ay: 89, ms: 50, fixed: 1 }
  }
};
for (const [anim, actions] of Object.entries(ANIM_WEB_FIX)) {
  if (window.JW && window.JW.anim) window.JW.anim[anim] = actions;
}
