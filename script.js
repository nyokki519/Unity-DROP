/* ==========================================================================
   UNITY DROP（シンプル版）— script.js
   ==========================================================================
   ★★★ 管理者が毎回変更するのはこの2か所だけです ★★★
   ========================================================================== */

// ==================================================
// 【管理者用】今回のイベントのDROP口数を設定
// 参加人数に合わせて数字だけ変更してください
// （この数字はページ上部の案内などには使われません。
//   「今回は何口用意したか」を管理者が把握しておくための
//   メモとして使ってください。GitHub Pagesだけで動く仕組みのため、
//   実際に何人が引いたかをこの画面だけで自動集計することはできません）
// ==================================================
const DROP_CONFIG = {
  totalDrops: 8,

  // 【重要】イベントごとに、この文字列を必ず変更してください
  // 「同じ端末では1回しか引けない」状態は、この文字列単位で管理されます。
  // 前回と同じ文字列のままだと、以前に一度DROPを引いた人は
  // （同じ端末・ブラウザの場合）今回は引けません。
  // 逆に、新しいイベントのたびにここを変える（例：日付やイベント名を入れる）だけで、
  // 全員が「まだ引いていない」状態からスタートできます。
  // 例）"2026-08-16-futsal"、"2026-08-23-cafe" など、他の回と重複しなければ何でもOK
  eventKey: "unity-drop-2026-08-16"
};

// ==================================================
// 【管理者用】DROPの内容一覧
// 好きなだけ増減できます。参加者にはこの中からランダムで1つ表示されます
//
// count（出現の重み）について：
// ここでの count は「正確な残り個数」を管理するものではありません
// （GAS・サーバーを使わない構成のため、参加者全員を横断して
//  「もう何個出たか」を数える仕組みがありません）。
// あくまで「出やすさ・出にくさ」の目安（重み）です。
// 例）SPECIAL DROP を 1、それ以外を 5 にすると、
//     SPECIAL DROPは統計的に約6分の1の確率で表示されます
//     （8人引けば大体1人くらい、という目安で、保証ではありません）
// 省略した場合は count: 1 として扱われます
// ==================================================
const DROP_ITEMS = [
  {
    title: "次回イベント 200円OFF",
    message: "次回のUnityイベントで使える特典です。受付でスタッフにお伝えください。",
    count: 5
  },
  {
    title: "ドリンク1杯プレゼント",
    message: "次回イベントでスタッフに声をかけてください。",
    count: 3
  },
  {
    title: "SPECIAL DROP",
    message: "今回は特別なDROPです。次回イベントでスタッフにお声がけください。",
    count: 1
  }
];

/* ==========================================================================
   ここから下はロジックです（通常は変更不要）
   ========================================================================== */

(function () {
  const STORAGE_KEY_OPENED = "unityDropOpened_" + DROP_CONFIG.eventKey;
  const STORAGE_KEY_RESULT = "unityDropResult_" + DROP_CONFIG.eventKey;

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

    // count（重み）に応じたプールを作り、その中からランダムに1つ選ぶ
    // 例）count:5 のアイテムはプールに5回、count:1 のアイテムは1回入る
    const pool = [];
    DROP_ITEMS.forEach(item => {
      const weight = Math.max(1, Number(item.count) || 1);
      for (let i = 0; i < weight; i++) pool.push(item);
    });

    const index = Math.floor(Math.random() * pool.length);
    return pool[index];
  }

  function fireSparkles() {
    const field = $("sparkle-field");
    if (!field) return;
    const count = 22;
    for (let i = 0; i < count; i++) {
      const s = document.createElement("span");
      s.className = "sparkle";
      const angle = Math.random() * Math.PI * 2;
      const distance = 80 + Math.random() * 140;
      s.style.setProperty("--sx", `${Math.cos(angle) * distance}px`);
      s.style.setProperty("--sy", `${Math.sin(angle) * distance}px`);
      s.style.left = "50%";
      s.style.top = "50%";
      field.appendChild(s);
      const delay = Math.random() * 400;
      setTimeout(() => s.classList.add("is-firing"), delay);
    }
  }

  function renderResultInto(prefixId, item) {
    const titleEl = $(prefixId + "-title");
    const messageEl = $(prefixId + "-message");
    if (titleEl) titleEl.textContent = escapeText(item.title);
    if (messageEl) messageEl.textContent = escapeText(item.message);
  }

  function openDrop() {
    if (!Array.isArray(DROP_ITEMS) || DROP_ITEMS.length === 0) {
      showFallback("現在DROPの内容が準備されていません。運営にお問い合わせください。");
      return;
    }

    const item = pickRandomItem();

    showScreen("screen-opening");
    fireSparkles();

    window.setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY_OPENED, "1");
        localStorage.setItem(STORAGE_KEY_RESULT, JSON.stringify(item));
      } catch (err) {
        // localStorageが使えない環境でも、今回の結果表示自体は継続する
        console.warn("UNITY DROP: localStorageへの保存に失敗しました。", err);
      }
      renderResultInto("result", item);
      showScreen("screen-result");
    }, 2000);
  }

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
      // localStorageが使えない環境では「毎回引ける」動作にフォールバックする
      alreadyOpened = false;
    }

    if (alreadyOpened) {
      if (previousResult && previousResult.title) {
        renderResultInto("already", previousResult);
      } else {
        renderResultInto("already", {
          title: "DROP済み",
          message: "このDROPはすでに開いています。"
        });
      }
      showScreen("screen-already");
      return;
    }

    showScreen("screen-intro");
  }

  // 想定外のエラーが起きても画面が真っ白にならないようにする
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
