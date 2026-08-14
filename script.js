/* ==========================================================================
   UNITY DROP
   Cinematic Gacha Edition
   ==========================================================================

   管理者が基本的に変更するのは DROP_ITEMS の部分だけです。

   ・日本時間で1日1回
   ・日付が変わると自動的に新しいDROP
   ・同一端末 / 同一ブラウザ単位
   ・GitHub Pagesのみで動作
   ========================================================================== */


/* ==========================================================================
   DROP CONFIG
   ========================================================================== */

const DROP_CONFIG = {

  // 管理者用メモ
  // ※全体人数制限ではありません
  totalDrops: 100

};


/* ==========================================================================
   DROP ITEMS
   ==========================================================================

   count = 出現確率の重み

   7 / 2 / 1
   ↓
   COMMON       70%
   RARE         20%
   SECRET RARE  10%

   ※GitHub Pages + localStorage構成なので、
   全参加者共通の残数管理はしていません。
   ========================================================================== */

const DROP_ITEMS = [

  {
    rarity: "common",

    title: "次回イベント 200円OFF",

    message:
      "次回のUnityイベントで使える特典です。スタッフにお伝えください。",

    count: 80
  },

  {
    rarity: "rare",

    title: "RARE DROP",

    message:
      "少し特別な特典です。内容はスタッフにお声がけください。",

    count: 15
  },

  {
    rarity: "secret",

    title: "SECRET RARE DROP",

    message:
      "おめでとうございます。特別なDROPです。内容はスタッフにお声がけください。",

    count: 5
  }

];


/* ==========================================================================
   MAIN
   ========================================================================== */

(function () {

  "use strict";


  /* ------------------------------------------------------------------------
     DOM
     ------------------------------------------------------------------------ */

  function $(id) {

    return document.getElementById(id);

  }


  /* ------------------------------------------------------------------------
     日本時間
     ------------------------------------------------------------------------ */

  function getJstDateString() {

    try {

      return new Intl.DateTimeFormat(
        "en-CA",
        {
          timeZone: "Asia/Tokyo",

          year: "numeric",
          month: "2-digit",
          day: "2-digit"
        }
      ).format(new Date());

    } catch (error) {

      const now = new Date();

      const jst = new Date(
        now.getTime()
        +
        (9 * 60 + now.getTimezoneOffset()) * 60000
      );

      const pad = (value) =>
        String(value).padStart(2, "0");

      return (
        jst.getFullYear()
        +
        "-"
        +
        pad(jst.getMonth() + 1)
        +
        "-"
        +
        pad(jst.getDate())
      );

    }

  }


  /* ------------------------------------------------------------------------
     今日のイベントキー

     例：

     unity-drop-2026-08-14

     ↓翌日

     unity-drop-2026-08-15
     ------------------------------------------------------------------------ */

  const todayKey =
    "unity-drop-" + getJstDateString();


  const STORAGE_KEY_OPENED =
    "unityDropOpened_" + todayKey;


  const STORAGE_KEY_RESULT =
    "unityDropResult_" + todayKey;


  /* ------------------------------------------------------------------------
     画面切り替え
     ------------------------------------------------------------------------ */

  const SCREEN_IDS = [

    "screen-intro",

    "screen-opening",

    "screen-result",

    "screen-already",

    "screen-fallback"

  ];


  function showScreen(id) {

    SCREEN_IDS.forEach(function (screenId) {

      const element = $(screenId);

      if (element) {

        element.classList.remove("is-active");

      }

    });


    const target = $(id);

    if (target) {

      target.classList.add("is-active");

    }

  }


  /* ------------------------------------------------------------------------
     待機

     ※ prefers-reduced-motion でも短縮しません。
     今回はガチャ演出そのものを楽しむ仕様。
     ------------------------------------------------------------------------ */

  function wait(ms) {

    return new Promise(function (resolve) {

      window.setTimeout(resolve, ms);

    });

  }


  /* ------------------------------------------------------------------------
     テキスト
     ------------------------------------------------------------------------ */

  function safeText(value) {

    return String(
      value === null || value === undefined
        ? ""
        : value
    );

  }


  /* ------------------------------------------------------------------------
     重み抽選
     ------------------------------------------------------------------------ */

  function pickRandomItem() {

    if (
      !Array.isArray(DROP_ITEMS)
      ||
      DROP_ITEMS.length === 0
    ) {

      return null;

    }


    let totalWeight = 0;


    DROP_ITEMS.forEach(function (item) {

      const weight =
        Math.max(
          1,
          Number(item.count) || 1
        );

      totalWeight += weight;

    });


    let random =
      Math.random() * totalWeight;


    for (
      let i = 0;
      i < DROP_ITEMS.length;
      i++
    ) {

      const item = DROP_ITEMS[i];

      const weight =
        Math.max(
          1,
          Number(item.count) || 1
        );


      random -= weight;


      if (random < 0) {

        return item;

      }

    }


    return DROP_ITEMS[
      DROP_ITEMS.length - 1
    ];

  }


  /* ------------------------------------------------------------------------
     レアリティ表示
     ------------------------------------------------------------------------ */

  function rarityLabel(rarity) {

    if (rarity === "secret") {

      return "✦ SECRET RARE ✦";

    }

    if (rarity === "rare") {

      return "RARE DROP";

    }

    return "";

  }


  /* ------------------------------------------------------------------------
     結果表示
     ------------------------------------------------------------------------ */

  function renderResultInto(
    prefix,
    item
  ) {

    if (!item) {

      return;

    }


    const title =
      $(prefix + "-title");

    const message =
      $(prefix + "-message");

    const rarity =
      $(prefix + "-rarity-label");


    if (title) {

      title.textContent =
        safeText(item.title);

    }


    if (message) {

      message.textContent =
        safeText(item.message);

    }


    if (rarity) {

      const r =
        item.rarity || "common";


      if (
        r === "rare"
        ||
        r === "secret"
      ) {

        rarity.textContent =
          rarityLabel(r);

        rarity.setAttribute(
          "data-rarity",
          r
        );

      } else {

        rarity.textContent = "";

        rarity.removeAttribute(
          "data-rarity"
        );

      }

    }

  }


  /* ==========================================================================
     PARTICLES
     ========================================================================== */

  function spawnGatherParticles() {

    const field =
      $("gather-field");


    if (!field) {

      return;

    }


    field.innerHTML = "";


    const count = 32;


    for (
      let i = 0;
      i < count;
      i++
    ) {

      const particle =
        document.createElement("span");


      particle.className =
        "gather-particle";


      const angle =
        Math.random() * Math.PI * 2;


      const distance =
        100 + Math.random() * 170;


      const x =
        Math.cos(angle) * distance;


      const y =
        Math.sin(angle) * distance;


      particle.style.left = "50%";

      particle.style.top = "50%";


      particle.style.setProperty(
        "--gx",
        x + "px"
      );


      particle.style.setProperty(
        "--gy",
        y + "px"
      );


      particle.style.animationDelay =
        Math.random() * .5 + "s";


      field.appendChild(
        particle
      );

    }

  }


  /* ==========================================================================
     BURST PARTICLES
     ========================================================================== */

  function spawnBurstParticles(
    rarity
  ) {

    const field =
      $("burst-field");


    if (!field) {

      return;

    }


    field.innerHTML = "";


    let count = 32;

    let distance = 180;


    if (rarity === "rare") {

      count = 55;

      distance = 240;

    }


    if (rarity === "secret") {

      count = 90;

      distance = 330;

    }


    for (
      let i = 0;
      i < count;
      i++
    ) {

      const particle =
        document.createElement("span");


      particle.className =
        "burst-particle";


      const angle =
        Math.random() * Math.PI * 2;


      const length =
        50
        +
        Math.random() * distance;


      const x =
        Math.cos(angle) * length;


      const y =
        Math.sin(angle) * length;


      particle.style.setProperty(
        "--bx",
        x + "px"
      );


      particle.style.setProperty(
        "--by",
        y + "px"
      );


      particle.style.animationDelay =
        Math.random() * .18 + "s";


      field.appendChild(
        particle
      );


      requestAnimationFrame(function () {

        particle.classList.add(
          "is-firing"
        );

      });

    }

  }


  /* ==========================================================================
     PHASE CONTROL
     ========================================================================== */

  const PHASE_IDS = [

    "phase-blackout",

    "phase-logo",

    "phase-rings",

    "phase-tease",

    "phase-heartbeat",

    "phase-box",

    "phase-blackout-extra",

    "phase-special",

    "phase-burst"

  ];


  function setPhase(id) {

    PHASE_IDS.forEach(function (phaseId) {

      const element =
        $(phaseId);


      if (element) {

        element.classList.remove(
          "is-active"
        );

      }

    });


    const target =
      $(id);


    if (target) {

      target.classList.add(
        "is-active"
      );

    }

  }


  /* ==========================================================================
     TEASE TEXT
     ========================================================================== */

  async function playTeaseText() {

    const element =
      $("tease-text");


    if (!element) {

      await wait(2200);

      return;

    }


    const lines = [

      "UNITY DROP",

      "LOADING...",

      "YOUR DROP IS COMING...",

      "ALMOST THERE..."

    ];


    for (
      let i = 0;
      i < lines.length;
      i++
    ) {

      element.textContent =
        lines[i];


      element.style.animation =
        "none";


      void element.offsetWidth;


      element.style.animation =
        "";


      await wait(650);

    }

  }


  /* ==========================================================================
     BURST
     ========================================================================== */

  async function playBurst(
    rarity
  ) {

    setPhase(
      "phase-burst"
    );


    const flash =
      $("burst-flash");


    const rarityElement =
      $("burst-rarity");


    const rings =
      $("burst-rings");


    if (flash) {

      flash.classList.remove(
        "is-flashing",
        "is-flashing--strong"
      );

      void flash.offsetWidth;

    }


    if (rarityElement) {

      rarityElement.classList.remove(
        "is-shown"
      );

      rarityElement.textContent =
        rarityLabel(rarity);

    }


    if (rings) {

      rings.innerHTML = "";

    }


    /* SECRETなら強いフラッシュ */

    if (
      flash
      &&
      rarity === "secret"
    ) {

      flash.classList.add(
        "is-flashing--strong"
      );

    } else if (flash) {

      flash.classList.add(
        "is-flashing"
      );

    }


    /* 少し溜める */

    await wait(500);


    /* レアリティ表示 */

    if (rarityElement) {

      rarityElement.classList.add(
        "is-shown"
      );

    }


    /* 粒子 */

    spawnBurstParticles(
      rarity
    );


    /* リング */

    if (rings) {

      const ring =
        document.createElement("div");

      ring.className =
        "burst-rings";

      rings.appendChild(
        ring
      );

    }


    if (rarity === "secret") {

      await wait(2200);

    } else if (rarity === "rare") {

      await wait(1800);

    } else {

      await wait(1500);

    }

  }


  /* ==========================================================================
     CINEMATIC MAIN
     ========================================================================== */

  async function playCinematic(
    item
  ) {

    const rarity =
      item.rarity || "common";


    showScreen(
      "screen-opening"
    );


    /* --------------------------------------------------------------
       0. 暗転
       -------------------------------------------------------------- */

    setPhase(
      "phase-blackout"
    );

    await wait(1000);


    /* --------------------------------------------------------------
       1. Unityロゴ
       -------------------------------------------------------------- */

    setPhase(
      "phase-logo"
    );

    await wait(1700);


    /* --------------------------------------------------------------
       2. リング・粒子
       -------------------------------------------------------------- */

    setPhase(
      "phase-rings"
    );

    spawnGatherParticles();

    await wait(1900);


    /* --------------------------------------------------------------
       3. 煽り
       -------------------------------------------------------------- */

    setPhase(
      "phase-tease"
    );

    await playTeaseText();


    /* --------------------------------------------------------------
       4. 心拍
       -------------------------------------------------------------- */

    setPhase(
      "phase-heartbeat"
    );

    await wait(1900);


    /* --------------------------------------------------------------
       5. DROP BOX
       -------------------------------------------------------------- */

    setPhase(
      "phase-box"
    );

    await wait(2200);


    /* --------------------------------------------------------------
       RARE追加溜め
       -------------------------------------------------------------- */

    if (
      rarity === "rare"
      ||
      rarity === "secret"
    ) {

      setPhase(
        "phase-blackout-extra"
      );

      await wait(1100);

    }


    /* --------------------------------------------------------------
       SECRET追加演出
       -------------------------------------------------------------- */

    if (
      rarity === "secret"
    ) {

      setPhase(
        "phase-special"
      );

      await wait(1600);

    }


    /* --------------------------------------------------------------
       最終爆発
       -------------------------------------------------------------- */

    await playBurst(
      rarity
    );


    /* --------------------------------------------------------------
       結果画面

       ★ここが重要

       演出終了後に必ずその場で結果を表示
       -------------------------------------------------------------- */

    renderResultInto(
      "result",
      item
    );


    await wait(150);


    showScreen(
      "screen-result"
    );

  }


  /* ==========================================================================
     DROP OPEN
     ========================================================================== */

  async function openDrop() {

    if (
      !Array.isArray(DROP_ITEMS)
      ||
      DROP_ITEMS.length === 0
    ) {

      showFallback(
        "現在DROPの内容が準備されていません。"
      );

      return;

    }


    const item =
      pickRandomItem();


    if (!item) {

      showFallback(
        "DROPの抽選に失敗しました。"
      );

      return;

    }


    /* --------------------------------------------------------------
       先に結果を保存

       演出中にページが閉じても結果が残る
       -------------------------------------------------------------- */

    try {

      localStorage.setItem(
        STORAGE_KEY_OPENED,
        "1"
      );


      localStorage.setItem(
        STORAGE_KEY_RESULT,
        JSON.stringify(item)
      );

    } catch (error) {

      console.warn(
        "UNITY DROP localStorage error:",
        error
      );

    }


    /* --------------------------------------------------------------
       演出開始
       -------------------------------------------------------------- */

    try {

      await playCinematic(
        item
      );

    } catch (error) {

      console.error(
        "UNITY DROP cinematic error:",
        error
      );


      /*
       * 演出でエラーが発生しても
       * 結果画面には必ず到達させる
       */

      renderResultInto(
        "result",
        item
      );


      showScreen(
        "screen-result"
      );

    }

  }


  /* ==========================================================================
     FALLBACK
     ========================================================================== */

  function showFallback(
    message
  ) {

    const element =
      $("fallback-message");


    if (element) {

      element.textContent =
        message;

    }


    showScreen(
      "screen-fallback"
    );

  }


  /* ==========================================================================
     INIT
     ========================================================================== */

  function init() {

    const button =
      $("btn-open");


    if (button) {

      button.addEventListener(
        "click",
        async function () {

          if (
            button.disabled
          ) {

            return;

          }


          button.disabled = true;


          try {

            await openDrop();

          } catch (error) {

            console.error(
              "UNITY DROP error:",
              error
            );

          }

        }
      );

    }


    /* --------------------------------------------------------------
       今日すでに引いたか確認
       -------------------------------------------------------------- */

    let alreadyOpened =
      false;


    let previousResult =
      null;


    try {

      alreadyOpened =
        localStorage.getItem(
          STORAGE_KEY_OPENED
        ) === "1";


      const stored =
        localStorage.getItem(
          STORAGE_KEY_RESULT
        );


      if (stored) {

        previousResult =
          JSON.parse(stored);

      }

    } catch (error) {

      console.warn(
        "UNITY DROP storage read error:",
        error
      );

    }


    /* --------------------------------------------------------------
       すでに引いている
       -------------------------------------------------------------- */

    if (alreadyOpened) {

      if (
        previousResult
        &&
        previousResult.title
      ) {

        renderResultInto(
          "already",
          previousResult
        );

      } else {

        renderResultInto(
          "already",
          {
            rarity: "common",

            title: "DROP済み",

            message:
              "本日分のDROPはすでに開いています。"
          }
        );

      }


      showScreen(
        "screen-already"
      );


      return;

    }


    /* --------------------------------------------------------------
       初回
       -------------------------------------------------------------- */

    showScreen(
      "screen-intro"
    );

  }


  /* ==========================================================================
     ERROR HANDLING
     ========================================================================== */

  window.addEventListener(
    "error",
    function (event) {

      console.error(
        "UNITY DROP global error:",
        event.error || event.message
      );

    }
  );


  window.addEventListener(
    "unhandledrejection",
    function (event) {

      console.error(
        "UNITY DROP promise error:",
        event.reason
      );

    }
  );


  /* ==========================================================================
     START
     ========================================================================== */

  if (
    document.readyState === "loading"
  ) {

    document.addEventListener(
      "DOMContentLoaded",
      init
    );

  } else {

    init();

  }


})();
