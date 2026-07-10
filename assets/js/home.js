/* ============================================================================
   PALE HOUR — home.js
   トップページ専用：スクロールで空が夜→夜明け→朝へ変化する（診断LPと同じ演出）
   ※この「夜明けに変化していく背景」は確定演出。削除・変更しないこと。
   ========================================================================== */
(function () {
  "use strict";
  var RM = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var smooth = function (p, a, b) { return clamp((p - a) / (b - a), 0, 1); };

  var lT = document.getElementById("lTwilight");
  var lB = document.getElementById("lBlue");
  var lD = document.getElementById("lDawn");
  var lY = document.getElementById("lDay");
  var stars = document.getElementById("stars");
  var sun = document.getElementById("sun");
  var header = document.getElementById("siteHeader");
  if (!lT) return;

  var progress = 0, target = 0, raf = null;

  function computeTarget() {
    var h = document.documentElement.scrollHeight - window.innerHeight;
    target = h > 0 ? clamp(window.scrollY / h, 0, 1) : 0;
  }

  function paint(p) {
    /* 夜 → 薄明 → ブルーの時間 → 夜明け → 朝 */
    lT.style.opacity = smooth(p, 0.06, 0.28);
    lB.style.opacity = smooth(p, 0.28, 0.5);
    lD.style.opacity = smooth(p, 0.5, 0.72);
    lY.style.opacity = smooth(p, 0.74, 0.92);
    stars.style.opacity = 1 - smooth(p, 0.1, 0.42);

    /* 太陽が水平線から静かに昇る */
    var rise = smooth(p, 0.5, 0.9);
    sun.style.opacity = rise * 0.9;
    sun.style.transform =
      "translate(-50%, " + (26 - rise * 30) + "vh)";

    /* 文字・ヘッダーの色モード：夜明け以降は濃紺の文字へ */
    var day = p > 0.52;
    if (header) header.classList.toggle("on-dark", !day);
  }

  function tick() {
    /* 目標値へゆっくり追従（急激な変化をさせない） */
    progress += (target - progress) * (RM ? 1 : 0.07);
    if (Math.abs(target - progress) < 0.0005) progress = target;
    paint(progress);
    raf = progress === target ? null : requestAnimationFrame(tick);
  }

  function onScroll() {
    computeTarget();
    if (raf === null) raf = requestAnimationFrame(tick);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  computeTarget();
  paint(target);
  progress = target;
})();
