/* ==========================================================================
   UNITY DROP
   Premium Opening Animation
   ========================================================================== */


/* ==========================================================================
   管理者設定
   ========================================================================== */

const DROP_CONFIG = {

  totalDrops: 10,

  /*
   * 日本時間の日付から自動生成
   *
   * 例：
   *
   * 2026-08-14
   * ↓
   * unity-drop-2026-08-14
   *
   * 日付が変われば自動的に別のDROPとして扱われます。
   */

  eventKey:
    "unity-drop-" +
    new Intl.DateTimeFormat("ja-JP", {
      timeZone: "Asia/Tokyo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    })
      .format(new Date())
      .replace(/\//g, "-")

};


/* ==========================================================================
   DROP内容
   ==========================================================================

   現在：

   200円OFF     70%
   RARE         20%
   SECRET RARE  10%

   ========================================================================== */

const DROP_ITEMS = [

  {

    title:
      "次回イベント 200円OFF",

    message:
      "次回のUnityイベントで使える特典です。イベントでスタッフにお声がけください。",

    count: 7

  },


  {

    title:
      "RARE DROP",

    message:
      "レアドロップ！内容はイベントでスタッフに声をかけてください。",

    count: 2

  },


  {

    title:
      "SECRET RARE DROP",

    message:
      "シークレットレアドロップです。内容はイベントでスタッフにお声がけください。",

    count: 1

  }

];


/* ==========================================================================
   Main
   ========================================================================== */

(function () {


  /* ------------------------------------------------------------------------
     Storage
     ------------------------------------------------------------------------ */

  const STORAGE_KEY_OPENED =
    "unityDropOpened_" +
    DROP_CONFIG.eventKey;


  const STORAGE_KEY_RESULT =
    "unityDropResult_" +
    DROP_CONFIG.eventKey;


  /* ------------------------------------------------------------------------
     Helper
     ------------------------------------------------------------------------ */

  function $(id) {

    return document.getElementById(id);

  }


  /* ------------------------------------------------------------------------
     Screen
     ------------------------------------------------------------------------ */

  function showScreen(id) {


    const screens = [

      "screen-intro",

      "screen-opening",

      "screen-result",

      "screen-already",

      "screen-fallback"

    ];


    screens.forEach(function (screenId) {

      const el = $(screenId);

      if (el) {

        el.classList.remove(
          "is-active"
        );

      }

    });


    const target = $(id);


    if (target) {

      target.classList.add(
        "is-active"
      );

    }

  }


  /* ------------------------------------------------------------------------
     Fallback
     ------------------------------------------------------------------------ */

  function showFallback(message) {


    const el =
      $("fallback-message");


    if (el) {

      el.textContent =
        message ||
        "予期しないエラーが発生しました。";

    }


    showScreen(
      "screen-fallback"
    );

  }


  /* ==========================================================================
     抽選
     ========================================================================== */

  function pickRandomItem() {


    if (
      !Array.isArray(DROP_ITEMS) ||
      DROP_ITEMS.length === 0
    ) {

      return null;

    }


    const pool = [];


    DROP_ITEMS.forEach(function (item) {


      const weight =
        Math.max(
          1,
          Number(item.count) || 1
        );


      for (
        let i = 0;
        i < weight;
        i++
      ) {

        pool.push(item);

      }

    });


    if (pool.length === 0) {

      return null;

    }


    return pool[
      Math.floor(
        Math.random() *
        pool.length
      )
    ];

  }


  /* ==========================================================================
     パーティクル生成
     ========================================================================== */

  function createParticles(type) {


    const field =
      $("particle-field");


    if (!field) {

      return;

    }


    let count = 55;


    if (type === "rare") {

      count = 80;

    }


    if (type === "secret") {

      count = 130;

    }


    for (
      let i = 0;
      i < count;
      i++
    ) {


      const particle =
        document.createElement(
          "span"
        );


      particle.className =
        "particle";


      const angle =
        Math.random() *
        Math.PI *
        2;


      let distance =
        100 +
        Math.random() *
        320;


      if (type === "secret") {

        distance =
          140 +
          Math.random() *
          430;

      }


      const x =
        Math.cos(angle) *
        distance;


      const y =
        Math.sin(angle) *
        distance;


      const size =
        2 +
        Math.random() *
        5;


      const duration =
        700 +
        Math.random() *
        900;


      let particleColor =
        "#c9a85c";


      if (
        Math.random() > .65
      ) {

        particleColor =
          "#ead49a";

      }


      if (type === "secret") {

        particleColor =
          Math.random() > .5
            ? "#ead49a"
            : "#ffffff";

      }


      particle.style.setProperty(
        "--x",
        `${x}px`
      );


      particle.style.setProperty(
        "--y",
        `${y}px`
      );


      particle.style.setProperty(
        "--size",
        `${size}px`
      );


      particle.style.setProperty(
        "--duration",
        `${duration}ms`
      );


      particle.style.setProperty(
        "--particle-color",
        particleColor
      );


      field.appendChild(
        particle
      );


      requestAnimationFrame(
        function () {

          particle.classList.add(
            "fire"
          );

        }
      );


      setTimeout(
        function () {

          particle.remove();

        },
        duration + 100
      );

    }

  }


  /* ==========================================================================
     Flash
     ========================================================================== */

  function fireFlash() {


    const flash =
      $("flash");


    if (!flash) {

      return;

    }


    flash.classList.remove(
      "active"
    );


    void flash.offsetWidth;


    flash.classList.add(
      "active"
    );

  }


  /* ==========================================================================
     Shockwave
     ========================================================================== */

  function fireShockwave() {


    const shockwave =
      $("shockwave");


    if (!shockwave) {

      return;

    }


    shockwave.classList.remove(
      "active"
    );


    void shockwave.offsetWidth;


    shockwave.classList.add(
      "active"
    );

  }


  /* ==========================================================================
     Result Rarity
     ========================================================================== */

  function getRarity(item) {


    if (!item) {

      return "drop";

    }


    const title =
      String(item.title)
        .toUpperCase();


    if (
      title.includes(
        "SECRET"
      )
    ) {

      return "secret";

    }


    if (
      title.includes(
        "RARE"
      )
    ) {

      return "rare";

    }


    return "drop";

  }


  /* ==========================================================================
     Result表示
     ========================================================================== */

  function renderResult(item) {


    const title =
      $("result-title");


    const message =
      $("result-message");


    const rarity =
      $("result-rarity");


    if (title) {

      title.textContent =
        item.title;

    }


    if (message) {

      message.textContent =
        item.message;

    }


    const type =
      getRarity(item);


    document.body.classList.remove(
      "rare-mode",
      "secret-mode"
    );


    if (rarity) {


      if (type === "secret") {

        rarity.textContent =
          "SECRET RARE";


      } else if (type === "rare") {

        rarity.textContent =
          "RARE";


      } else {

        rarity.textContent =
          "DROP";

      }

    }


    if (type === "rare") {

      document.body.classList.add(
        "rare-mode"
      );

    }


    if (type === "secret") {

      document.body.classList.add(
        "secret-mode"
      );

    }

  }


  /* ==========================================================================
     開封演出
     ========================================================================== */

  function playOpeningAnimation(item) {


    const type =
      getRarity(item);


    /*
     * 最初のパーティクル
     */

    createParticles(
      type
    );


    /*
     * 少し溜める
     */

    setTimeout(
      function () {

        fireShockwave();

      },
      900
    );


    /*
     * 光を爆発
     */

    setTimeout(
      function () {

        fireFlash();

        createParticles(
          type
        );

      },
      1450
    );


    /*
     * SECRETだけさらに追加演出
     */

    if (type === "secret") {


      setTimeout(
        function () {

          fireFlash();

          fireShockwave();

          createParticles(
            "secret"
          );

        },
        1750
      );

    }


    /*
     * 結果表示
     */

    const resultDelay =
      type === "secret"
        ? 2300
        : 2000;


    setTimeout(
      function () {

        renderResult(
          item
        );

        showScreen(
          "screen-result"
        );

      },
      resultDelay
    );

  }


  /* ==========================================================================
     DROP開封
     ========================================================================== */

  function openDrop() {


    if (
      !Array.isArray(DROP_ITEMS) ||
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


    /*
     * 結果は演出開始前に決定
     */

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
        "localStorage保存失敗:",
        error
      );

    }


    /*
     * 開封画面
     */

    showScreen(
      "screen-opening"
    );


    /*
     * 開封演出開始
     */

    playOpeningAnimation(
      item
    );

  }


  /* ==========================================================================
     初期化
     ========================================================================== */

  function init() {


    const btnOpen =
      $("btn-open");


    if (btnOpen) {


      btnOpen.addEventListener(
        "click",
        function () {


          /*
           * 連打防止
           */

          btnOpen.disabled =
            true;


          /*
           * ボタンを少し縮ませる
           */

          btnOpen.style.transform =
            "scale(.94)";


          /*
           * 抽選開始
           */

          openDrop();

        }
      );

    }


    /* ----------------------------------------------------------------------
       今日すでに引いたか確認
       ---------------------------------------------------------------------- */

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


        try {

          previousResult =
            JSON.parse(
              stored
            );

        } catch (error) {

          previousResult =
            null;

        }

      }


    } catch (error) {


      /*
       * localStorageが使えない場合
       */

      alreadyOpened =
        false;

    }


    /* ----------------------------------------------------------------------
       すでに開封済み
       ---------------------------------------------------------------------- */

    if (alreadyOpened) {


      if (
        previousResult &&
        previousResult.title
      ) {


        const title =
          $("already-title");


        const message =
          $("already-message");


        if (title) {

          title.textContent =
            previousResult.title;

        }


        if (message) {

          message.textContent =
            previousResult.message;

        }


      }


      showScreen(
        "screen-already"
      );


      return;

    }


    /* ----------------------------------------------------------------------
       初回
       ---------------------------------------------------------------------- */

    showScreen(
      "screen-intro"
    );

  }


  /* ==========================================================================
     Error
     ========================================================================== */

  window.addEventListener(
    "error",
    function (error) {


      console.error(
        "UNITY DROP error:",
        error
      );


      /*
       * アニメーション中のエラーで
       * 画面を突然Fallbackにしないようにする
       */

    }
  );


  /* ==========================================================================
     DOM Ready
     ========================================================================== */

  document.addEventListener(
    "DOMContentLoaded",
    function () {


      try {

        init();

      } catch (error) {

        console.error(
          "UNITY DROP init error:",
          error
        );


        showFallback(
          "予期しないエラーが発生しました。ページを再読み込みしてお試しください。"
        );

      }

    }
  );


})();
