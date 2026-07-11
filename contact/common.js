/* ============================================================================
   PALE HOUR — common.js
   全ページ共通：ヘッダーのスクロール状態 / ハンバーガーメニュー（キーボード対応）/
   出現アニメーション / お問い合わせフォームのバリデーション
   ========================================================================== */
(function () {
  "use strict";

  var header = document.getElementById("siteHeader");
  var toggle = document.getElementById("menuToggle");
  var gnav = document.getElementById("gnav");
  var RM = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- ヘッダー：ファーストビューは透明、スクロール後に半透明白 ---------- */
  function onScroll() {
    if (!header) return;
    header.classList.toggle("is-solid", window.scrollY > 30);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- ハンバーガーメニュー ---------- */
  function setMenu(open) {
    if (!toggle || !gnav) return;
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    toggle.setAttribute("aria-label", open ? "メニューを閉じる" : "メニューを開く");
    gnav.classList.toggle("is-open", open);
    document.body.classList.toggle("menu-open", open);
    if (header) header.classList.toggle("menu-open-header", open);
    if (open) {
      var first = gnav.querySelector("a");
      if (first) first.focus();
    }
  }
  if (toggle && gnav) {
    toggle.addEventListener("click", function () {
      setMenu(toggle.getAttribute("aria-expanded") !== "true");
    });
    /* Escapeで閉じてトグルへフォーカスを戻す（キーボード操作対応） */
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && gnav.classList.contains("is-open")) {
        setMenu(false);
        toggle.focus();
      }
    });
    /* メニュー内リンクを押したら閉じる */
    gnav.addEventListener("click", function (e) {
      if (e.target.closest("a")) setMenu(false);
    });
  }

  /* ---------- 出現アニメーション（ゆっくりフェードのみ） ---------- */
  var targets = document.querySelectorAll(".reveal");
  if (targets.length) {
    if (RM || !("IntersectionObserver" in window)) {
      targets.forEach(function (el) { el.classList.add("is-visible"); });
    } else {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) {
            en.target.classList.add("is-visible");
            io.unobserve(en.target);
          }
        });
      }, { rootMargin: "0px 0px -8% 0px", threshold: 0.05 });
      targets.forEach(function (el) { io.observe(el); });
    }
  }

  /* ---------- GA4：LINEリンククリックでline_registerイベント（診断LPと同仕様） ---------- */
  document.addEventListener("click", function (e) {
    var link = e.target.closest('[data-cv="line"]');
    if (link && typeof window.gtag === "function") {
      window.gtag("event", "line_register", { link_url: link.href });
    }
  });

  /* ---------- お問い合わせフォーム：バリデーション＋Googleフォーム送信 ----------
     診断LPと同じGoogleフォームへ隠しiframe（gform_sink）経由でPOST（接続済 2026-07-12）。
     種別はGoogleフォーム側に項目がないため、本文の先頭に【種別】として合成する。 */
  var form = document.getElementById("contactForm");
  if (form) {
    function setError(field, on) {
      var box = field.closest(".field, .consent-field");
      if (box) box.classList.toggle("has-error", on);
    }
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var name = form.querySelector("#cName");
      var mail = form.querySelector("#cMail");
      var type = form.querySelector("#cType");
      var body = form.querySelector("#cBody");
      var agree = form.querySelector("#cAgree");

      var vName = name.value.trim() !== "";
      var vMail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail.value.trim());
      var vType = type.value !== "";
      var vBody = body.value.trim().length >= 5;
      var vAgree = agree.checked;
      setError(name, !vName);
      setError(mail, !vMail);
      setError(type, !vType);
      setError(body, !vBody);
      setError(agree, !vAgree);

      var status = document.getElementById("formStatus");
      if (vName && vMail && vType && vBody && vAgree) {
        /* 種別を本文の先頭に合成してからGoogleフォームへ送信（隠しiframeなので遷移しない） */
        var typeLabel = type.options[type.selectedIndex].text;
        body.value = "【種別】" + typeLabel + "\n\n" + body.value.trim();
        var btn = form.querySelector('button[type="submit"]');
        if (btn) btn.disabled = true;
        form.submit();
        form.reset();
        status.textContent =
          "送信ありがとうございます。内容を確認のうえ、順にご返信いたします。お急ぎの場合は公式LINEまたはメール（info@pale-hour.com）へどうぞ。";
        status.classList.add("is-shown");
        status.focus && status.focus();
      } else {
        status.textContent = "未入力の項目があります。赤色の表示をご確認ください。";
        status.classList.add("is-shown");
      }
    });
  }
})();
