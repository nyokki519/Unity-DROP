/* ==========================================================================
   UNITY DROP
   Cinematic Gacha Edition
   + CINEMATIC SOUND EDITION

   ・日本時間で1日1回
   ・日付が変わると自動的に新しいDROP
   ・同一端末 / 同一ブラウザ単位
   ・GitHub Pagesのみで動作
   ・HTML / CSS変更不要
   ・Web Audio APIによる演出同期サウンド
   ========================================================================== */


/* ==========================================================================
   DROP CONFIG
   ========================================================================== */

const DROP_CONFIG = {

  totalDrops: 100

};


/* ==========================================================================
   DROP ITEMS
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


  /* ==========================================================================
     DOM
     ========================================================================== */

  function $(id) {

    return document.getElementById(id);

  }


  /* ==========================================================================
     AUDIO ENGINE
     ========================================================================== */

  let audioContext = null;

  let masterGain = null;

  let ambienceGain = null;


  function initAudio() {

    if (audioContext) {

      if (audioContext.state === "suspended") {

        audioContext.resume().catch(() => {});

      }

      return;

    }


    try {

      const AudioContext =
        window.AudioContext ||
        window.webkitAudioContext;


      if (!AudioContext) {

        console.warn(
          "Web Audio API is not supported."
        );

        return;

      }


      audioContext =
        new AudioContext();


      masterGain =
        audioContext.createGain();


      masterGain.gain.value = 0.72;


      masterGain.connect(
        audioContext.destination
      );


      ambienceGain =
        audioContext.createGain();


      ambienceGain.gain.value = 0;


      ambienceGain.connect(
        masterGain
      );


    } catch (error) {

      console.warn(
        "Audio initialization failed:",
        error
      );

    }

  }


  function audioReady() {

    if (!audioContext) {

      return false;

    }


    if (
      audioContext.state === "suspended"
    ) {

      audioContext.resume().catch(() => {});

    }


    return true;

  }


  /* --------------------------------------------------------------------------
     Oscillator helper
     -------------------------------------------------------------------------- */

  function tone(
    frequency,
    duration,
    options = {}
  ) {

    if (!audioReady()) {

      return;

    }


    const now =
      audioContext.currentTime;


    const osc =
      audioContext.createOscillator();


    const gain =
      audioContext.createGain();


    const type =
      options.type || "sine";


    const volume =
      options.volume ?? 0.15;


    const attack =
      options.attack ?? 0.01;


    const release =
      options.release ?? duration;


    osc.type = type;


    osc.frequency.setValueAtTime(
      frequency,
      now
    );


    if (options.endFrequency) {

      osc.frequency.exponentialRampToValueAtTime(
        Math.max(20, options.endFrequency),
        now + duration
      );

    }


    gain.gain.setValueAtTime(
      0.0001,
      now
    );


    gain.gain.exponentialRampToValueAtTime(
      Math.max(0.0001, volume),
      now + attack
    );


    gain.gain.exponentialRampToValueAtTime(
      0.0001,
      now + Math.max(
        attack + 0.01,
        release
      )
    );


    osc.connect(gain);

    gain.connect(masterGain);


    osc.start(now);

    osc.stop(
      now + duration + 0.05
    );

  }


  /* --------------------------------------------------------------------------
     Noise helper
     -------------------------------------------------------------------------- */

  function noise(
    duration,
    volume = 0.1,
    filterFrequency = 1800
  ) {

    if (!audioReady()) {

      return;

    }


    const bufferSize =
      audioContext.sampleRate * duration;


    const buffer =
      audioContext.createBuffer(
        1,
        bufferSize,
        audioContext.sampleRate
      );


    const data =
      buffer.getChannelData(0);


    for (
      let i = 0;
      i < bufferSize;
      i++
    ) {

      data[i] =
        Math.random() * 2 - 1;

    }


    const source =
      audioContext.createBufferSource();


    source.buffer =
      buffer;


    const filter =
      audioContext.createBiquadFilter();


    filter.type =
      "lowpass";


    filter.frequency.value =
      filterFrequency;


    const gain =
      audioContext.createGain();


    const now =
      audioContext.currentTime;


    gain.gain.setValueAtTime(
      0.0001,
      now
    );


    gain.gain.exponentialRampToValueAtTime(
      volume,
      now + 0.015
    );


    gain.gain.exponentialRampToValueAtTime(
      0.0001,
      now + duration
    );


    source
      .connect(filter)
      .connect(gain)
      .connect(masterGain);


    source.start(now);

    source.stop(
      now + duration + 0.03
    );

  }


  /* ==========================================================================
     CINEMATIC SOUND EFFECTS
     ========================================================================== */


  /* --------------------------------------------------------------------------
     開始
     -------------------------------------------------------------------------- */

  function soundStart() {

    tone(
      55,
           1.0,
      {
        type: "sine",
        volume: 0.22,
        attack: 0.05,
        endFrequency: 42
      }
    );


    tone(
      110,
      0.8,
      {
        type: "triangle",
        volume: 0.08,
        attack: 0.03,
        endFrequency: 70
      }
    );


    noise(
      0.45,
      0.035,
      1200
    );

  }


  /* --------------------------------------------------------------------------
     Unityロゴ
     -------------------------------------------------------------------------- */

  function soundLogo() {

    tone(
      180,
           1.4,
      {
        type: "sine",
        volume: 0.13,
        attack: 0.03,
        endFrequency: 620
      }
    );


    setTimeout(function () {

      tone(
        880,
        0.8,
        {
          type: "sine",
          volume: 0.12,
          attack: 0.01,
          endFrequency: 1320
        }
      );

    }, 300);


    setTimeout(function () {

      tone(
        1760,
        0.45,
        {
          type: "sine",
          volume: 0.075,
          attack: 0.01,
          endFrequency: 2100
        }
      );

    }, 650);


    noise(
      1.0,
      0.035,
      3000
    );

  }


  /* --------------------------------------------------------------------------
     リング
     -------------------------------------------------------------------------- */

  function soundRings() {

    tone(
      80,
      1.8,
      {
        type: "sine",
        volume: 0.13,
        attack: 0.05,
        endFrequency: 180
      }
    );


    const ringTimes = [
      0,
      350,
      700,
      1050
    ];


    ringTimes.forEach(function (delay, index) {

      setTimeout(function () {

        tone(
          420 + index * 80,
          0.75,
          {
            type: "sine",
            volume: 0.07,
            attack: 0.01,
            endFrequency:
              900 + index * 100
          }
        );

      }, delay);

    });


    noise(
      1.6,
      0.025,
      2200
    );

  }


  /* --------------------------------------------------------------------------
     煽り
     -------------------------------------------------------------------------- */

  function soundTease() {

    const frequencies = [
      440,
      520,
      620,
      760
    ];


    frequencies.forEach(function (
      frequency,
      index
    ) {

      setTimeout(function () {

        tone(
          frequency,
          0.25,
          {
            type: "square",
            volume: 0.035,
            attack: 0.005,
            endFrequency:
              frequency * 1.05
          }
        );

      }, index * 650);

    });

  }


  /* --------------------------------------------------------------------------
     心拍
     -------------------------------------------------------------------------- */

  function soundHeartbeat() {

    function beat(delay, strength) {

      setTimeout(function () {

        tone(
          58,
          0.32,
          {
            type: "sine",
            volume: strength,
            attack: 0.015,
            endFrequency: 42
          }
        );


        tone(
          116,
          0.22,
          {
            type: "sine",
            volume: strength * 0.45,
            attack: 0.01,
            endFrequency: 75
          }
        );

      }, delay);

    }


    beat(0, 0.17);

    beat(360, 0.22);

    beat(900, 0.18);

    beat(1260, 0.25);

  }


  /* --------------------------------------------------------------------------
     BOX
     -------------------------------------------------------------------------- */

  function soundBox() {

    tone(
      70,
      2.2,
      {
        type: "sine",
        volume: 0.16,
        attack: 0.15,
        endFrequency: 125
      }
    );


    tone(
      160,
      1.8,
      {
        type: "triangle",
        volume: 0.055,
        attack: 0.1,
        endFrequency: 380
      }
    );


    setTimeout(function () {

      tone(
        520,
        0.8,
        {
          type: "sine",
          volume: 0.08,
          attack: 0.02,
          endFrequency: 720
        }
      );

    }, 850);


    noise(
      1.5,
      0.025,
      1500
    );

  }


  /* --------------------------------------------------------------------------
     RARE警告
     -------------------------------------------------------------------------- */

  function soundRareWarning() {

    tone(
      130,
      0.7,
      {
        type: "sawtooth",
        volume: 0.06,
        attack: 0.01,
        endFrequency: 95
      }
    );


    setTimeout(function () {

      tone(
        260,
        0.18,
        {
          type: "square",
          volume: 0.08,
          attack: 0.005,
          endFrequency: 220
        }
      );

    }, 220);


    setTimeout(function () {

      tone(
        320,
        0.18,
        {
          type: "square",
          volume: 0.08,
          attack: 0.005,
          endFrequency: 260
        }
      );

    }, 440);

  }


  /* --------------------------------------------------------------------------
     SECRET
     -------------------------------------------------------------------------- */

  function soundSecret() {

    tone(
      110,
      1.7,
      {
        type: "sine",
        volume: 0.13,
        attack: 0.05,
        endFrequency: 440
      }
    );


    setTimeout(function () {

      tone(
        440,
        1.4,
        {
          type: "triangle",
          volume: 0.11,
          attack: 0.03,
          endFrequency: 880
        }
      );

    }, 180);


    setTimeout(function () {

      tone(
        880,
        1.1,
        {
          type: "sine",
          volume: 0.12,
          attack: 0.02,
          endFrequency: 1760
        }
      );

    }, 420);


    setTimeout(function () {

      tone(
        1760,
        0.7,
        {
          type: "sine",
          volume: 0.07,
          attack: 0.01,
          endFrequency: 2400
        }
      );

    }, 720);


    noise(
      1.8,
      0.045,
      4200
    );

  }


  /* --------------------------------------------------------------------------
     最終爆発
     -------------------------------------------------------------------------- */

  function soundBurst(rarity) {

    const isRare =
      rarity === "rare";


    const isSecret =
      rarity === "secret";


    /* 巨大な低音 */

    tone(
      isSecret ? 55 : 65,
      isSecret ? 1.8 : 1.3,
      {
        type: "sine",
        volume: isSecret ? 0.3 : 0.24,
        attack: 0.01,
        endFrequency:
          isSecret ? 28 : 38
      }
    );


    /* 爆発ノイズ */

    noise(
      isSecret ? 1.5 : 1.1,
      isSecret ? 0.18 : 0.13,
      isSecret ? 5000 : 3500
    );


    /* 高音 */

    tone(
      isSecret ? 1000 : 720,
      0.9,
      {
        type: "sine",
        volume: isSecret ? 0.14 : 0.09,
        attack: 0.01,
        endFrequency:
          isSecret ? 2200 : 1500
      }
    );


    /* RARE以上は追加 */

    if (isRare || isSecret) {

      setTimeout(function () {

        tone(
          1400,
          0.7,
          {
            type: "triangle",
            volume: 0.08,
            attack: 0.01,
            endFrequency: 2000
          }
        );

      }, 180);

    }


    /* SECRETはさらにキラキラ */

    if (isSecret) {

      const sparkleTimes = [
        0,
        130,
        260,
        390,
        520,
        650
      ];


      sparkleTimes.forEach(function (
        delay,
        index
      ) {

        setTimeout(function () {

          tone(
            1200 + index * 180,
            0.35,
            {
              type: "sine",
              volume: 0.07,
              attack: 0.005,
              endFrequency:
                1700 + index * 180
            }
          );

        }, delay);

      });

    }

  }


  /* ==========================================================================
     日本時間
     ========================================================================== */

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


  /* ==========================================================================
     TODAY KEY
     ========================================================================== */

  const todayKey =
    "unity-drop-" + getJstDateString();


  const STORAGE_KEY_OPENED =
    "unityDropOpened_" + todayKey;


  const STORAGE_KEY_RESULT =
    "unityDropResult_" + todayKey;


  /* ==========================================================================
     SCREEN
     ========================================================================== */

  const SCREEN_IDS = [

    "screen-intro",
    "screen-opening",
    "screen-result",
    "screen-already",
    "screen-fallback"

  ];


  function showScreen(id) {

    SCREEN_IDS.forEach(function (screenId) {

      const element =
        $(screenId);


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
     WAIT
     ========================================================================== */

  function wait(ms) {

    return new Promise(function (resolve) {

      window.setTimeout(
        resolve,
        ms
      );

    });

  }


  /* ==========================================================================
     TEXT
     ========================================================================== */

  function safeText(value) {

    return String(
      value === null ||
      value === undefined
        ? ""
        : value
    );

  }


  /* ==========================================================================
     RANDOM
     ========================================================================== */

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
      Math.random() *
      totalWeight;


    for (
      let i = 0;
      i < DROP_ITEMS.length;
      i++
    ) {

      const item =
        DROP_ITEMS[i];


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


  /* ==========================================================================
     RARITY
     ========================================================================== */

  function rarityLabel(rarity) {

    if (rarity === "secret") {

      return "✦ SECRET RARE ✦";

    }


    if (rarity === "rare") {

      return "RARE DROP";

    }


    return "";

  }


  /* ==========================================================================
     RESULT
     ========================================================================== */

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
        r === "rare" ||
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
     GATHER PARTICLES
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
        document.createElement(
          "span"
        );


      particle.className =
        "gather-particle";


      const angle =
        Math.random() *
        Math.PI *
        2;


      const distance =
        100 +
        Math.random() *
        170;


      const x =
        Math.cos(angle) *
        distance;


      const y =
        Math.sin(angle) *
        distance;


      particle.style.left =
        "50%";


      particle.style.top =
        "50%";


      particle.style.setProperty(
        "--gx",
        x + "px"
      );


      particle.style.setProperty(
        "--gy",
        y + "px"
      );


      particle.style.animationDelay =
        Math.random() *
        .5 +
        "s";


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
        document.createElement(
          "span"
        );


      particle.className =
        "burst-particle";


      const angle =
        Math.random() *
        Math.PI *
        2;


      const length =
        50 +
        Math.random() *
        distance;


      const x =
        Math.cos(angle) *
        length;


      const y =
        Math.sin(angle) *
        length;


      particle.style.setProperty(
        "--bx",
        x + "px"
      );


      particle.style.setProperty(
        "--by",
        y + "px"
      );


      particle.style.animationDelay =
        Math.random() *
        .18 +
        "s";


      field.appendChild(
        particle
      );


      requestAnimationFrame(
        function () {

          particle.classList.add(
            "is-firing"
          );

        }
      );

    }

  }


  /* ==========================================================================
     PHASE
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

    PHASE_IDS.forEach(
      function (phaseId) {

        const element =
          $(phaseId);


        if (element) {

          element.classList.remove(
            "is-active"
          );

        }

      }
    );


    const target =
      $(id);


    if (target) {

      target.classList.add(
        "is-active"
      );

    }

  }


  /* ==========================================================================
     TEASE
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


    /* 音 */

    soundBurst(
      rarity
    );


    /* フラッシュ */

    if (
      flash &&
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


    await wait(500);


    if (rarityElement) {

      rarityElement.classList.add(
        "is-shown"
      );

    }


    spawnBurstParticles(
      rarity
    );


    if (rings) {

      const ring =
        document.createElement(
          "div"
        );


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
     CINEMATIC
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
       0. BLACKOUT
       -------------------------------------------------------------- */

    setPhase(
      "phase-blackout"
    );


    soundStart();


    await wait(1000);


    /* --------------------------------------------------------------
       1. LOGO
       -------------------------------------------------------------- */

    setPhase(
      "phase-logo"
    );


    soundLogo();


    await wait(1700);


    /* --------------------------------------------------------------
       2. RINGS
       -------------------------------------------------------------- */

    setPhase(
      "phase-rings"
    );


    spawnGatherParticles();


    soundRings();


    await wait(1900);


    /* --------------------------------------------------------------
       3. TEASE
       -------------------------------------------------------------- */

    setPhase(
      "phase-tease"
    );


    soundTease();


    await playTeaseText();


    /* --------------------------------------------------------------
       4. HEARTBEAT
       -------------------------------------------------------------- */

    setPhase(
      "phase-heartbeat"
    );


    soundHeartbeat();


    await wait(1900);


    /* --------------------------------------------------------------
       5. BOX
       -------------------------------------------------------------- */

    setPhase(
      "phase-box"
    );


    soundBox();


    await wait(2200);


    /* --------------------------------------------------------------
       RARE
       -------------------------------------------------------------- */

    if (
      rarity === "rare" ||
      rarity === "secret"
    ) {

      setPhase(
        "phase-blackout-extra"
      );


      soundRareWarning();


      await wait(1100);

    }


    /* --------------------------------------------------------------
       SECRET
       -------------------------------------------------------------- */

    if (
      rarity === "secret"
    ) {

      setPhase(
        "phase-special"
      );


      soundSecret();


      await wait(1600);

    }


    /* --------------------------------------------------------------
       BURST
       -------------------------------------------------------------- */

    await playBurst(
      rarity
    );


    /* --------------------------------------------------------------
       RESULT
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
     OPEN DROP
     ========================================================================== */

  async function openDrop() {

    if (
      !Array.isArray(DROP_ITEMS) ||
      DROP_ITEMS.length === 0
    ) {

      showFallback(
        "現在DROPの内容が準備されていません。"
      );


      return;

    }


    /*
     * iPhoneではユーザー操作内で
     * AudioContextを開始する必要があるため、
     * DROPボタンを押した瞬間に起動
     */

    initAudio();


    const item =
      pickRandomItem();


    if (!item) {

      showFallback(
        "DROPの抽選に失敗しました。"
      );


      return;

    }


    /* --------------------------------------------------------------
       保存
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
       演出
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
        event.error ||
        event.message
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
