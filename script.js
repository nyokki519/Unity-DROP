/* ==========================================================================
   UNITY DROP（完全版）
   ==========================================================================
   ・イベントキーは日本時間の日付から自動生成
   ・同じ端末 / 同じブラウザでは1日1回
   ・日付が変われば自動的にもう一度引ける
   ・GitHub Pagesだけで動作
   ・DROPの確率は count の重みで設定
   ========================================================================== */


/* ==========================================================================
   【管理者用】DROP設定
   ========================================================================== */

const DROP_CONFIG = {

  // 管理者用メモ
  // 実際の抽選人数を制限するものではありません
  totalDrops: 10,


  /*
   * ============================================================
   * イベントキー
   * ============================================================
   *
   * 日本時間（Asia/Tokyo）の日付から自動生成します。
   *
   * 2026年8月14日
   * ↓
   * unity-drop-2026-08-14
   *
   * 2026年8月15日
   * ↓
   * unity-drop-2026-08-15
   *
   * そのため、管理者が毎回 eventKey を変更する必要はありません。
   */

  eventKey: "unity-drop-" + new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  })
    .format(new Date())
    .replace(/\//g, "-")

};


/* ==========================================================================
   【管理者用】DROP内容
   ==========================================================================

   count = 抽選時の重み

   例：

   200円OFF → 7
   RARE      → 2
   SECRET    → 1

   合計10

   ↓

   200円OFF = 70%
   RARE      = 20%
   SECRET    = 10%

   ※ GitHub Pagesだけの仕組みなので、
      全参加者共通の「残り在庫」を管理するものではありません。

   ========================================================================== */

const DROP_ITEMS = [

  {
    title: "次回イベント 200円OFF",

    message:
      "次回のUnityイベントで使える特典です。イベントでスタッフにお声がけください。",

    count: 7
  },


  {
    title: "RARE DROP",

    message:
      "レアドロップ！内容はイベントでスタッフに声をかけてください。",

    count: 2
  },


  {
    title: "SECRET RARE DROP",

    message:
      "シークレットレアドロップです。内容はイベントでスタッフにお声がけください。",

    count: 1
  }

];


/* ==========================================================================
   ここから下は通常変更不要
   ========================================================================== */

(function () {


  /* ------------------------------------------------------------------------
     localStorage用キー

     日付ごとに自動的に変わります。

     例：

     unityDropOpened_unity-drop-2026-08-14

     unityDropOpened_unity-drop-2026-08-15

     ------------------------------------------------------------------------ */

  const STORAGE_KEY_OPENED =
    "unityDropOpened_" + DROP_CONFIG.eventKey;

  const STORAGE_KEY_RESULT =
    "unityDropResult_" + DROP_CONFIG.eventKey;


  /* ------------------------------------------------------------------------
     ID取得
     ------------------------------------------------------------------------ */

  function $(id) {
    return document.getElementById(id);
  }


  /* ------------------------------------------------------------------------
     画面切り替え
     ------------------------------------------------------------------------ */

  function showScreen(id) {

    const ids = [
      "screen-intro",
      "screen-opening",
      "screen-result",
      "screen-already",
      "screen-fallback"
    ];


    ids.forEach(function (screenId) {

      const el = $(screenId);

      if (el) {
        el.classList.remove("is-active");
      }

    });


    const target = $(id);

    if (target) {
      target.classList.add("is-active");
    }

  }


  /* ------------------------------------------------------------------------
     エラー画面
     ------------------------------------------------------------------------ */

  function showFallback(message) {

    const el = $("fallback-message");

    if (el && message) {
      el.textContent = message;
    }

    showScreen("screen-fallback");

  }


  /* ------------------------------------------------------------------------
     テキスト安全処理
     ------------------------------------------------------------------------ */

  function escapeText(str) {

    return String(
      str == null ? "" : str
    );

  }


  /* ------------------------------------------------------------------------
     ランダム抽選
     ------------------------------------------------------------------------

     countの重みに応じて抽選します。

     例：

     200円OFF  → count 7
     RARE      → count 2
     SECRET    → count 1

     ↓

     7 + 2 + 1 = 10

     200円OFF → 70%
     RARE     → 20%
     SECRET   → 10%

     ------------------------------------------------------------------------ */

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


    const index =
      Math.floor(
        Math.random() * pool.length
      );


    return pool[index];

  }


  /* ------------------------------------------------------------------------
     キラキラ演出
     ------------------------------------------------------------------------ */

  function fireSparkles() {


    const field = $("sparkle-field");


    if (!field) {
      return;
    }


    const count = 22;


    for (
      let i = 0;
      i < count;
      i++
    ) {


      const sparkle =
        document.createElement("span");


      sparkle.className = "sparkle";


      const angle =
        Math.random() *
        Math.PI *
        2;


      const distance =
        80 +
        Math.random() *
        140;


      sparkle.style.setProperty(
        "--sx",
        `${Math.cos(angle) * distance}px`
      );


      sparkle.style.setProperty(
        "--sy",
        `${Math.sin(angle) * distance}px`
      );


      sparkle.style.left = "50%";
      sparkle.style.top = "50%";


      field.appendChild(sparkle);


      const delay =
        Math.random() * 400;


      setTimeout(function () {

        sparkle.classList.add(
          "is-firing"
        );

      }, delay);

    }

  }


  /* ------------------------------------------------------------------------
     抽選結果を画面に表示
     ------------------------------------------------------------------------ */

  function renderResultInto(prefixId, item) {


    if (!item) {
      return;
    }


    const titleEl =
      $(prefixId + "-title");


    const messageEl =
      $(prefixId + "-message");


    if (titleEl) {

      titleEl.textContent =
        escapeText(item.title);

    }


    if (messageEl) {

      messageEl.textContent =
        escapeText(item.message);

    }

  }


  /* ------------------------------------------------------------------------
     DROPを開く
     ------------------------------------------------------------------------ */

  function openDrop() {


    /* DROP未設定チェック */

    if (
      !Array.isArray(DROP_ITEMS) ||
      DROP_ITEMS.length === 0
    ) {

      showFallback(
        "現在DROPの内容が準備されていません。運営にお問い合わせください。"
      );

      return;

    }


    /* 抽選 */

    const item =
      pickRandomItem();


    if (!item) {

      showFallback(
        "DROPの抽選に失敗しました。ページを再読み込みしてお試しください。"
      );

      return;

    }


    /* 開封演出 */

    showScreen(
      "screen-opening"
    );


    fireSparkles();


    /* 約2秒後に結果表示 */

    window.setTimeout(function () {


      try {


        /*
         * この端末では本日すでに引いた
         * という情報を保存
         */

        localStorage.setItem(
          STORAGE_KEY_OPENED,
          "1"
        );


        /*
         * 抽選結果も保存
         *
         * もう一度アクセスした場合でも
         * 同じ結果を表示できる
         */

        localStorage.setItem(
          STORAGE_KEY_RESULT,
          JSON.stringify(item)
        );


      } catch (err) {


        /*
         * localStorageが使えなくても
         * 今回の抽選結果は表示する
         */

        console.warn(
          "UNITY DROP: localStorageへの保存に失敗しました。",
          err
        );

      }


      /* 結果表示 */

      renderResultInto(
        "result",
        item
      );


      showScreen(
        "screen-result"
      );


    }, 2000);

  }


  /* ------------------------------------------------------------------------
     初期化
     ------------------------------------------------------------------------ */

  function init() {


    /* 開封ボタン */

    const btnOpen =
      $("btn-open");


    if (btnOpen) {


      btnOpen.addEventListener(
        "click",
        function () {


          /*
           * 連打防止
           */

          btnOpen.disabled = true;


          openDrop();

        }
      );

    }


    /* ----------------------------------------------------------------------
       今日すでに引いたか確認
       ---------------------------------------------------------------------- */

    let alreadyOpened = false;

    let previousResult = null;


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
            JSON.parse(stored);

        } catch (parseError) {

          previousResult = null;

        }

      }


    } catch (err) {


      /*
       * localStorageが使えない環境では
       * 毎回引ける状態にフォールバック
       */

      alreadyOpened = false;

    }


    /* ----------------------------------------------------------------------
       すでに今日引いている場合
       ---------------------------------------------------------------------- */

    if (alreadyOpened) {


      if (
        previousResult &&
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
            title: "DROP済み",

            message:
              "このDROPはすでに開いています。"
          }
        );

      }


      showScreen(
        "screen-already"
      );


      return;

    }


    /* ----------------------------------------------------------------------
       初回アクセス
       ---------------------------------------------------------------------- */

    showScreen(
      "screen-intro"
    );

  }


  /* ==========================================================================
     想定外エラー対策
     ========================================================================== */

  window.addEventListener(
    "error",
    function () {


      showFallback(
        "予期しないエラーが発生しました。ページを再読み込みしてお試しください。"
      );


    }
  );


  /* ==========================================================================
     DOM読み込み完了
     ========================================================================== */

  document.addEventListener(
    "DOMContentLoaded",
    function () {


      try {


        init();


      } catch (err) {


        console.error(
          "UNITY DROP init error:",
          err
        );


        showFallback(
          "予期しないエラーが発生しました。ページを再読み込みしてお試しください。"
        );

      }

    }
  );


})();
