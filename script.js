/* ==========================================================================
   UNITY DROP（シンプル版）— script.js
   ==========================================================================
   ★★★ 管理者が変更するのは基本的にこの2か所だけです ★★★
   ========================================================================== */

// ==================================================
// 【管理者用メモ】今回のイベントの想定人数
// ※この数字は抽選回数の制限には使われません（下記【注意】参照）。
//   「今回は何人分を想定しているか」を管理者が把握しておくための
//   メモとして使ってください。
// ==================================================
const DROP_CONFIG = {
  totalDrops: 10
};

// ==================================================
// 【注意】1日1回の制限について
// --------------------------------------------------
// 「同一端末・同一ブラウザでは、日本時間で1日1回だけ引ける」という
// 制限は自動化されています（下のロジックで日付から自動計算されます）。
// totalDrops を変更しても「1日◯人まで」という全体の人数制限には
// なりません。GitHub Pages + localStorage という構成上、
// 全参加者を横断して「あと何人分残っているか」を数える方法が
// ないためです（別端末なら誰でも1日1回引けます）。
// ==================================================

// ==================================================
// 【管理者用】DROPの内容一覧（COMMON / RARE / SECRET RARE）
// count は出現の重みです。合計に対する比率で抽選されます。
// 例）COMMON:7, RARE:2, SECRET RARE:1 → 合計10のうち
//     COMMON 70% / RARE 20% / SECRET RARE 10%
// ==================================================
const DROP_ITEMS = [
  {
    rarity: "common",
    title: "次回イベント 200円OFF",
    message: "次回のUnityイベントで使える特典です。受付でスタッフにお伝えください。",
    count: 7
  },
  {
    rarity: "rare",
    title: "RARE DROP",
    message: "少し特別な特典です。次回イベントでスタッフにお声がけください。",
    count: 2
  },
  {
    rarity: "secret",
    title: "SECRET RARE DROP",
    message: "今回は特別なDROPです。次回イベントでスタッフにお声がけください。",
    count: 1
  }
];

/* ==========================================================================
   ここから下はロジックです（通常は変更不要）
   ========================================================================== */

(function () {
  const prefersReducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const T = (ms) => prefersReducedMotion ? Math.min(ms, 200) : ms;
  function wait(ms) { return new Promise(resolve => setTimeout(resolve, T(ms))); }

  /* ---------------------------------------------------------------------
     日本時間（JST）基準で「YYYY-MM-DD」を求める
     ブラウザのタイムゾーンに関わらず、常に日本時間の日付になります
  --------------------------------------------------------------------- */
  function getJstDateString() {
    try {
      // en-CA ロケール＋Asia/Tokyo指定で "YYYY-MM-DD" 形式を安全に取得
      return new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Tokyo",
        year: "numeric", month: "2-digit", day: "2-digit"
      }).format(new Date());
    } catch (err) {
      // 万一Intlが使えない極めて古い環境向けのフォールバック（UTC+9換算）
      const now = new Date();
      const jst = new Date(now.getTime() + (9 * 60 + now.getTimezoneOffset()) * 60000);
      const p = (n) => String(n).padStart(2, "0");
      return `${jst.getFullYear()}-${p(jst.getMonth() + 1)}-${p(jst.getDate())}`;
    }
  }

  const todayKey = "unity-drop-" + getJstDateString();
  const STORAGE_KEY_OPENED = "unityDropOpened_" + todayKey;
  const STORAGE_KEY_RESULT = "unityDropResult_" + todayKey;

  function $(id) { return document.getElementById(id); }

  function showScreen(id) {
    const ids = ["screen-intro", "screen-opening", "screen-result", "screen-already", "screen-fallback"];
    ids.forEach(s => {
      const el = $(s);
      if (el) el.classList.remove("is-active");
    });
    const target = $(id);
    if (target) target.classList.add("is-active");
  }

  function showFallback(message) {
    const el = $("fallback-message");
    if (el && message) el.textContent = message;
    showScreen("screen-fallback");
  }

  function escapeText(str) {
    return String(str == null ? "" : str);
  }

  function pickRandomItem() {
    if (!Array.isArray(DROP_ITEMS) || DROP_ITEMS.length === 0) return null;
    const pool = [];
    DROP_ITEMS.forEach(item => {
      const weight = Math.max(1, Number(item.count) || 1);
      for (let i = 0; i < weight; i++) pool.push(item);
    });
    const index = Math.floor(Math.random() * pool.length);
    return pool[index];
  }

  function rarityLabel(rarity) {
    if (rarity === "secret") return "✦ SECRET RARE ✦";
    if (rarity === "rare") return "RARE";
    return "";
  }

  /* ---------------------------------------------------------------------
     演出用パーツ生成
  --------------------------------------------------------------------- */
  function spawnGatherParticles() {
    const field = $("gather-field");
    if (!field) return;
    field.innerHTML = "";
    const count = 18;
    for (let i = 0; i < count; i++) {
      const p = document.createElement("span");
      p.className = "gather-particle";
      const angle = Math.random() * Math.PI * 2;
      const distance = 90 + Math.random() * 70;
      p.style.setProperty("--gx", `${Math.cos(angle) * distance}px`);
      p.style.setProperty("--gy", `${Math.sin(angle) * distance}px`);
      field.appendChild(p);
      setTimeout(() => p.classList.add("is-gathering"), Math.random() * 200);
    }
  }

  function spawnBurstParticles(rarity) {
    const field = $("burst-field");
    if (!field) return;
    field.innerHTML = "";
    const count = rarity === "secret" ? 70 : rarity === "rare" ? 42 : 22;
    const maxDistance = rarity === "secret" ? 260 : rarity === "rare" ? 190 : 130;
    for (let i = 0; i < count; i++) {
      const p = document.createElement("span");
      p.className = "burst-particle";
      const angle = Math.random() * Math.PI * 2;
      const distance = 60 + Math.random() * maxDistance;
      p.style.setProperty("--bx", `${Math.cos(angle) * distance}px`);
      p.style.setProperty("--by", `${Math.sin(angle) * distance}px`);
      field.appendChild(p);
      requestAnimationFrame(() => p.classList.add("is-firing"));
    }
  }

  const TEASE_LINES = ["UNITY DROP", "LOADING...", "YOUR DROP IS COMING..."];
  async function playTeaseText() {
    const el = $("tease-text");
    if (!el) return;
    for (const line of TEASE_LINES) {
      el.textContent = line;
      el.style.animation = "none";
      void el.offsetWidth; // reflow でアニメーションをリセット
      el.style.animation = "";
      await wait(430);
    }
  }

  /* ---------------------------------------------------------------------
     ガチャ演出のオーケストレーション（フェーズごとに演出を変化させる）
  --------------------------------------------------------------------- */
  const phaseIds = [
    "phase-blackout", "phase-logo", "phase-rings", "phase-tease",
    "phase-heartbeat", "phase-box", "phase-blackout-extra", "phase-special", "phase-burst"
  ];
  function setPhase(id) {
    phaseIds.forEach(p => {
      const el = $(p);
      if (el) el.classList.remove("is-active");
    });
    const target = $(id);
    if (target) target.classList.add("is-active");
  }

  async function playCinematic(item) {
    const rarity = item.rarity || "common";
    showScreen("screen-opening");

    // Phase 0（0.0〜1.0秒）：画面が暗転しDROP開始
    setPhase("phase-blackout");
    await wait(1000);

    // Phase 1（1.0〜2.0秒）：Unityロゴが出現、回転・発光
    setPhase("phase-logo");
    await wait(1000);

    // Phase 2（2.0〜3.0秒）：光のリングが広がり、粒子が集まる
    setPhase("phase-rings");
    spawnGatherParticles();
    await wait(1000);

    // Phase 3（3.0〜4.0秒）：煽りテキスト
    setPhase("phase-tease");
    await playTeaseText();

    // Phase 4（4.0〜5.0秒）：一度暗くし、鼓動のような演出＋光が強くなる
    setPhase("phase-heartbeat");
    await wait(1000);

    // Phase 5（5.0〜6.0秒）：DROPボックスが出現、開く直前の演出
    setPhase("phase-box");
    await wait(1000);

    // ここから先は結果（レアリティ）によって尺・演出を変える
    // ※ここまでの演出はレアリティに関わらず共通のため、結果は一切示唆されません
    if (rarity === "rare" || rarity === "secret") {
      setPhase("phase-blackout-extra");
      await wait(450);
    }
    if (rarity === "secret") {
      setPhase("phase-special");
      await wait(800);
    }

    // Phase 6：光が最大になり、粒子・フラッシュ、カードが開く → 結果表示
    setPhase("phase-burst");
    const flash = $("burst-flash");
    const burstRarityEl = $("burst-rarity");
    flash.classList.remove("is-flashing", "is-flashing--strong");
    burstRarityEl.classList.remove("is-shown");
    void flash.offsetWidth;

    burstRarityEl.textContent = rarityLabel(rarity);

    if (rarity === "secret") {
      flash.classList.add("is-flashing--strong");
    } else {
      flash.classList.add("is-flashing");
    }
    await wait(150);

    if (rarityLabel(rarity)) burstRarityEl.classList.add("is-shown");
    spawnBurstParticles(rarity);

    const burstHold = rarity === "secret" ? 1500 : rarity === "rare" ? 1100 : 900;
    await wait(burstHold);

    renderResultInto("result", item, rarity);
    showScreen("screen-result");
  }

  /* ---------------------------------------------------------------------
     結果表示
  --------------------------------------------------------------------- */
  function renderResultInto(prefixId, item, rarity) {
    const titleEl = $(prefixId + "-title");
    const messageEl = $(prefixId + "-message");
    const labelEl = $(prefixId + "-rarity-label");
    if (titleEl) titleEl.textContent = escapeText(item.title);
    if (messageEl) messageEl.textContent = escapeText(item.message);
    if (labelEl) {
      const r = rarity || item.rarity || "";
      if (r === "rare" || r === "secret") {
        labelEl.textContent = rarityLabel(r);
        labelEl.setAttribute("data-rarity", r);
      } else {
        labelEl.textContent = "";
        labelEl.removeAttribute("data-rarity");
      }
    }
  }

  /* ---------------------------------------------------------------------
     DROPを開く（ボタン押下）
  --------------------------------------------------------------------- */
  async function openDrop() {
    if (!Array.isArray(DROP_ITEMS) || DROP_ITEMS.length === 0) {
      showFallback("現在DROPの内容が準備されていません。運営にお問い合わせください。");
      return;
    }

    const item = pickRandomItem();
    if (!item) {
      showFallback("現在DROPの内容が準備されていません。運営にお問い合わせください。");
      return;
    }

    try {
      localStorage.setItem(STORAGE_KEY_OPENED, "1");
      localStorage.setItem(STORAGE_KEY_RESULT, JSON.stringify(item));
    } catch (err) {
      console.warn("UNITY DROP: localStorageへの保存に失敗しました。", err);
    }

    await playCinematic(item);
  }

  /* ---------------------------------------------------------------------
     初期化
  --------------------------------------------------------------------- */
  function init() {
    const btnOpen = $("btn-open");
    if (btnOpen) {
      btnOpen.addEventListener("click", () => {
        btnOpen.disabled = true;
        openDrop();
      });
    }

    let alreadyOpened = false;
    let previousResult = null;
    try {
      alreadyOpened = localStorage.getItem(STORAGE_KEY_OPENED) === "1";
      const stored = localStorage.getItem(STORAGE_KEY_RESULT);
      if (stored) previousResult = JSON.parse(stored);
    } catch (err) {
      alreadyOpened = false;
    }

    if (alreadyOpened) {
      if (previousResult && previousResult.title) {
        renderResultInto("already", previousResult, previousResult.rarity);
      } else {
        renderResultInto("already", { title: "DROP済み", message: "本日分のDROPはすでに開いています。" }, "");
      }
      showScreen("screen-already");
      return;
    }

    showScreen("screen-intro");
  }

  window.addEventListener("error", () => {
    showFallback("予期しないエラーが発生しました。ページを再読み込みしてお試しください。");
  });

  document.addEventListener("DOMContentLoaded", () => {
    try {
      init();
    } catch (err) {
      console.error("UNITY DROP init error:", err);
      showFallback("予期しないエラーが発生しました。ページを再読み込みしてお試しください。");
    }
  });
})();
