/* ==========================================================================
   UNITY DROP
   Ultimate Cinematic Edition
   Gacha Capsule Edition

   ・日本時間で1日1回
   ・日付が変わると自動的に新しいDROP
   ・同一端末 / 同一ブラウザ単位
   ・GitHub Pagesのみで動作
   ・HTML変更不要
   ・Web Audio API対応
   ・ガチャカプセル演出
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

    count: 75
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

    count: 10
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

        return;

      }


      audioContext =
        new AudioContext();


      masterGain =
        audioContext.createGain();


      masterGain.gain.value = 0.78;


      masterGain.connect(
        audioContext.destination
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


    if (audioContext.state === "suspended") {

      audioContext.resume().catch(() => {});

    }


    return true;

  }


  /* ==========================================================================
     TONE
     ========================================================================== */

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
      options.volume ?? 0.12;


    const attack =
      options.attack ?? 0.01;


    osc.type =
      type;


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
        duration * 0.85
      )
    );


    osc.connect(gain);
    gain.connect(masterGain);


    osc.start(now);


    osc.stop(
      now + duration + 0.05
    );

  }


  /* ==========================================================================
     NOISE
     ========================================================================== */

  function noise(
    duration,
    volume = 0.08,
    filterFrequency = 2200
  ) {

    if (!audioReady()) {

      return;

    }


    const bufferSize =
      Math.floor(
        audioContext.sampleRate *
        duration
      );


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
     SOUND — OPEN
     ========================================================================== */

  function soundStart() {

    tone(
      48,
      1.4,
      {
        type: "sine",
        volume: 0.25,
        attack: 0.04,
        endFrequency: 28
      }
    );


    tone(
      96,
      1.0,
      {
        type: "triangle",
        volume: 0.08,
        attack: 0.02,
        endFrequency: 55
      }
    );


    noise(
      0.7,
      0.035,
      1000
    );

  }


  /* ==========================================================================
     SOUND — LOGO
     ========================================================================== */

  function soundLogo() {

    tone(
      165,
      1.35,
      {
        type: "sine",
        volume: 0.13,
        attack: 0.03,
        endFrequency: 660
      }
    );


    setTimeout(() => {

      tone(
        660,
        0.7,
        {
          type: "sine",
          volume: 0.09,
          attack: 0.01,
          endFrequency: 990
        }
      );

    }, 280);


    setTimeout(() => {

      tone(
        1320,
        0.55,
        {
          type: "sine",
          volume: 0.07,
          attack: 0.01,
          endFrequency: 1980
        }
      );

    }, 600);


    noise(
      0.9,
      0.025,
      3200
    );

  }


  /* ==========================================================================
     SOUND — ENERGY
     ========================================================================== */

  function soundEnergy() {

    tone(
      70,
      2.0,
      {
        type: "sine",
        volume: 0.13,
        attack: 0.04,
        endFrequency: 210
      }
    );


    [0, 300, 600, 900].forEach(
      (delay, index) => {

        setTimeout(() => {

          tone(
            390 + index * 100,
            0.6,
            {
              type: "sine",
              volume: 0.055,
              attack: 0.01,
              endFrequency:
                760 + index * 120
            }
          );

        }, delay);

      }
    );


    noise(
      1.5,
      0.025,
      2600
    );

  }


  /* ==========================================================================
     SOUND — TEASE
     ========================================================================== */

  function soundTease() {

    const frequencies = [
      440,
      500,
      570,
      650,
      740
    ];


    frequencies.forEach(
      (frequency, index) => {

        setTimeout(() => {

          tone(
            frequency,
            0.22,
            {
              type: "square",
              volume: 0.028,
              attack: 0.004,
              endFrequency:
                frequency * 1.04
            }
          );

        }, index * 470);

      }
    );

  }


  /* ==========================================================================
     SOUND — HEART
     ========================================================================== */

  function soundHeartbeat() {

    const beats = [
      [0, 0.13],
      [360, 0.18],
      [760, 0.14],
      [1080, 0.22],
      [1430, 0.28]
    ];


    beats.forEach(
      ([delay, strength]) => {

        setTimeout(() => {

          tone(
            55,
            0.32,
            {
              type: "sine",
              volume: strength,
              attack: 0.01,
              endFrequency: 38
            }
          );


          tone(
            110,
            0.22,
            {
              type: "sine",
              volume: strength * 0.4,
              attack: 0.008,
              endFrequency: 70
            }
          );

        }, delay);

      }
    );

  }


  /* ==========================================================================
     SOUND — CAPSULE
     ========================================================================== */

  function soundCapsule() {

    /* 低い振動 */

    tone(
      58,
      2.3,
      {
        type: "sine",
        volume: 0.17,
        attack: 0.1,
        endFrequency: 125
      }
    );


    tone(
      150,
      1.8,
      {
        type: "triangle",
        volume: 0.05,
        attack: 0.08,
        endFrequency: 420
      }
    );


    /* エネルギー上昇 */

    setTimeout(() => {

      tone(
        420,
        0.7,
        {
          type: "sine",
          volume: 0.06,
          attack: 0.02,
          endFrequency: 680
        }
      );

    }, 850);


    noise(
      1.5,
      0.025,
      1700
    );


    /* 開封直前 */

    setTimeout(() => {

      tone(
        75,
        0.55,
        {
          type: "sine",
          volume: 0.14,
          attack: 0.01,
          endFrequency: 42
        }
      );

    }, 1450);

  }


  /* ==========================================================================
     SOUND — CAPSULE OPEN
     ========================================================================== */

  function soundCapsuleOpen(
    rarity
  ) {

    const secret =
      rarity === "secret";


    const rare =
      rarity === "rare";


    /* パカッ */

    noise(
      0.32,
      secret ? 0.16 : rare ? 0.12 : 0.095,
      secret ? 5200 : 3600
    );


    tone(
      130,
      0.42,
      {
        type: "sine",
        volume: secret ? 0.2 : 0.14,
        attack: 0.005,
        endFrequency:
          secret ? 42 : 55
      }
    );


    /* 光が開く */

    setTimeout(() => {

      tone(
        secret ? 880 : rare ? 720 : 560,
        0.7,
        {
          type: "sine",
          volume:
            secret
              ? 0.16
              : rare
                ? 0.11
                : 0.075,
          attack: 0.01,
          endFrequency:
            secret ? 1800 : 1100
        }
      );

    }, 90);


    if (secret) {

      setTimeout(() => {

        tone(
          1800,
          0.8,
          {
            type: "triangle",
            volume: 0.1,
            attack: 0.01,
            endFrequency: 2800
          }
        );

      }, 230);

    }

  }


  /* ==========================================================================
     SOUND — RARE WARNING
     ========================================================================== */

  function soundRareWarning() {

    tone(
      100,
      0.8,
      {
        type: "sawtooth",
        volume: 0.055,
        attack: 0.01,
        endFrequency: 70
      }
    );


    setTimeout(() => {

      tone(
        240,
        0.17,
        {
          type: "square",
          volume: 0.07,
          attack: 0.005,
          endFrequency: 190
        }
      );

    }, 240);


    setTimeout(() => {

      tone(
        300,
        0.17,
        {
          type: "square",
          volume: 0.075,
          attack: 0.005,
          endFrequency: 230
        }
      );

    }, 480);


    setTimeout(() => {

      tone(
        380,
        0.2,
        {
          type: "square",
          volume: 0.08,
          attack: 0.005,
          endFrequency: 280
        }
      );

    }, 720);

  }


  /* ==========================================================================
     SOUND — SECRET
     ========================================================================== */

  function soundSecret() {

    tone(
      90,
      1.8,
      {
        type: "sine",
        volume: 0.12,
        attack: 0.05,
        endFrequency: 360
      }
    );


    setTimeout(() => {

      tone(
        360,
        1.5,
        {
          type: "triangle",
          volume: 0.1,
          attack: 0.03,
          endFrequency: 720
        }
      );

    }, 180);


    setTimeout(() => {

      tone(
        720,
        1.2,
        {
          type: "sine",
          volume: 0.11,
          attack: 0.02,
          endFrequency: 1440
        }
      );

    }, 420);


    setTimeout(() => {

      tone(
        1440,
        0.8,
        {
          type: "sine",
          volume: 0.08,
          attack: 0.01,
          endFrequency: 2400
        }
      );

    }, 700);


    noise(
      1.8,
      0.045,
      4500
    );

  }


  /* ==========================================================================
     SOUND — FINAL
     ========================================================================== */

  function soundBurst(
    rarity
  ) {

    const secret =
      rarity === "secret";


    const rare =
      rarity === "rare";


    tone(
      secret ? 48 : 60,
      secret ? 2.0 : 1.4,
      {
        type: "sine",
        volume:
          secret ? 0.32 : 0.24,
        attack: 0.008,
        endFrequency:
          secret ? 25 : 34
      }
    );


    noise(
      secret ? 1.7 : 1.1,
      secret ? 0.2 : 0.13,
      secret ? 5200 : 3500
    );


    tone(
      secret ? 1100 : 700,
      0.9,
      {
        type: "sine",
        volume:
          secret ? 0.15 : 0.085,
        attack: 0.008,
        endFrequency:
          secret ? 2500 : 1450
      }
    );


    if (
      rare ||
      secret
    ) {

      setTimeout(() => {

        tone(
          1500,
          0.75,
          {
            type: "triangle",
            volume: 0.09,
            attack: 0.008,
            endFrequency: 2200
          }
        );

      }, 150);

    }


    if (secret) {

      [
        0,
        100,
        200,
        300,
        400,
        500,
        600,
        700
      ].forEach(
        (delay, index) => {

          setTimeout(() => {

            tone(
              1100 + index * 190,
              0.35,
              {
                type: "sine",
                volume: 0.075,
                attack: 0.004,
                endFrequency:
                  1600 + index * 220
              }
            );

          }, delay);

        }
      );

    }

  }


  /* ==========================================================================
     JAPAN TIME
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

      const now =
        new Date();


      const jst =
        new Date(
          now.getTime()
          +
          (
            9 * 60 +
            now.getTimezoneOffset()
          ) * 60000
        );


      const pad =
        value =>
          String(value).padStart(
            2,
            "0"
          );


      return (
        jst.getFullYear()
        + "-"
        + pad(jst.getMonth() + 1)
        + "-"
        + pad(jst.getDate())
      );

    }

  }


  /* ==========================================================================
     STORAGE
     ========================================================================== */

  const todayKey =
    "unity-drop-" +
    getJstDateString();


  const STORAGE_KEY_OPENED =
    "unityDropOpened_" +
    todayKey;


  const STORAGE_KEY_RESULT =
    "unityDropResult_" +
    todayKey;


  /* ==========================================================================
     SCREENS
     ========================================================================== */

  const SCREEN_IDS = [

    "screen-intro",
    "screen-opening",
    "screen-result",
    "screen-already",
    "screen-fallback"

  ];


  function showScreen(id) {

    SCREEN_IDS.forEach(
      screenId => {

        const element =
          $(screenId);


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
     WAIT
     ========================================================================== */

  function wait(ms) {

    return new Promise(
      resolve =>
        setTimeout(
          resolve,
          ms
        )
    );

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

    let totalWeight = 0;


    DROP_ITEMS.forEach(item => {

      totalWeight +=
        Math.max(
          0,
          Number(item.count) || 0
        );

    });


    if (
      totalWeight <= 0
    ) {

      return null;

    }


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
          0,
          Number(item.count) || 0
        );


      random -=
        weight;


      if (
        random < 0
      ) {

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

  function rarityLabel(
    rarity
  ) {

    if (
      rarity === "secret"
    ) {

      return "✦ SECRET RARE ✦";

    }


    if (
      rarity === "rare"
    ) {

      return "◆ RARE DROP ◆";

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
        safeText(
          item.title
        );

    }


    if (message) {

      message.textContent =
        safeText(
          item.message
        );

    }


    if (rarity) {

      const r =
        item.rarity ||
        "common";


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

        rarity.textContent =
          "";


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


    field.innerHTML =
      "";


    for (
      let i = 0;
      i < 42;
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
        Math.PI * 2;


      const distance =
        100 +
        Math.random() * 210;


      particle.style.setProperty(
        "--gx",
        Math.cos(angle) *
        distance +
        "px"
      );


      particle.style.setProperty(
        "--gy",
        Math.sin(angle) *
        distance +
        "px"
      );


      particle.style.left =
        "50%";


      particle.style.top =
        "50%";


      particle.style.animationDelay =
        Math.random() * .45 +
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


    field.innerHTML =
      "";


    let count =
      38;


    let distance =
      190;


    if (
      rarity === "rare"
    ) {

      count =
        65;

      distance =
        270;

    }


    if (
      rarity === "secret"
    ) {

      count =
        110;

      distance =
        380;

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
        Math.PI * 2;


      const length =
        40 +
        Math.random() *
        distance;


      particle.style.setProperty(
        "--bx",
        Math.cos(angle) *
        length +
        "px"
      );


      particle.style.setProperty(
        "--by",
        Math.sin(angle) *
        length +
        "px"
      );


      particle.style.animationDelay =
        Math.random() * .2 +
        "s";


      field.appendChild(
        particle
      );


      requestAnimationFrame(() => {

        particle.classList.add(
          "is-firing"
        );

      });

    }

  }


  /* ==========================================================================
     RARITY COLOR
     ========================================================================== */

  function applyRarityClass(
    rarity
  ) {

    const cinematic =
      $("cinematic");


    if (!cinematic) {

      return;

    }


    cinematic.classList.remove(
      "rarity-common",
      "rarity-rare",
      "rarity-secret"
    );


    cinematic.classList.add(
      "rarity-" +
      rarity
    );

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
      phaseId => {

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
     CAPSULE RESET
     ========================================================================== */

  function resetCapsule() {

    const capsule =
      document.querySelector(
        ".drop-box"
      );


    if (!capsule) {

      return;

    }


    capsule.classList.remove(
      "is-opening"
    );


    void capsule.offsetWidth;

  }


  /* ==========================================================================
     CAPSULE OPEN ANIMATION
     ========================================================================== */

  async function openCapsule(
    rarity
  ) {

    const capsule =
      document.querySelector(
        ".drop-box"
      );


    if (!capsule) {

      await wait(900);

      return;

    }


    /* 初期化 */

    capsule.classList.remove(
      "is-opening"
    );


    void capsule.offsetWidth;


    /* ガチャカプセルを少し待たせる */

    await wait(550);


    /* 開封開始 */

    capsule.classList.add(
      "is-opening"
    );


    soundCapsuleOpen(
      rarity
    );


    /* 光が広がる時間 */

    await wait(780);


    capsule.classList.remove(
      "is-opening"
    );

  }


  /* ==========================================================================
     TEASE TEXT
     ========================================================================== */

  async function playTeaseText() {

    const element =
      $("tease-text");


    if (!element) {

      await wait(2500);

      return;

    }


    const lines = [

      "UNITY DROP",

      "抽選準備中...",

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


      await wait(
        i === 3
          ? 800
          : 650
      );

    }

  }


  /* ==========================================================================
     MICRO SUSPENSE
     ========================================================================== */

  async function suspensePause() {

    const cinematic =
      $("cinematic");


    if (cinematic) {

      cinematic.classList.add(
        "suspense-mode"
      );

    }


    tone(
      42,
      1.0,
      {
        type: "sine",
        volume: 0.1,
        attack: 0.01,
        endFrequency: 34
      }
    );


    await wait(1000);


    if (cinematic) {

      cinematic.classList.remove(
        "suspense-mode"
      );

    }

  }


  /* ==========================================================================
     FINAL BURST
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

      rings.innerHTML =
        "";

    }


    soundBurst(
      rarity
    );


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


    await wait(480);


    if (rarityElement) {

      rarityElement.classList.add(
        "is-shown"
      );

    }


    spawnBurstParticles(
      rarity
    );


    if (rings) {

      for (
        let i = 0;
        i < (
          rarity === "secret"
            ? 3
            : rarity === "rare"
              ? 2
              : 1
        );
        i++
      ) {

        setTimeout(() => {

          const ring =
            document.createElement(
              "div"
            );


          ring.className =
            "burst-rings";


          rings.appendChild(
            ring
          );

        }, i * 180);

      }

    }


    if (
      rarity === "secret"
    ) {

      await wait(2500);

    } else if (
      rarity === "rare"
    ) {

      await wait(1950);

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
      item.rarity ||
      "common";


    applyRarityClass(
      rarity
    );


    showScreen(
      "screen-opening"
    );


    /* ================================================================
       BLACKOUT
       ================================================================ */

    setPhase(
      "phase-blackout"
    );


    soundStart();


    await wait(1050);


    /* ================================================================
       LOGO
       ================================================================ */

    setPhase(
      "phase-logo"
    );


    soundLogo();


    await wait(1700);


    /* ================================================================
       ENERGY
       ================================================================ */

    setPhase(
      "phase-rings"
    );


    spawnGatherParticles();


    soundEnergy();


    await wait(1900);


    /* ================================================================
       TEASE
       ================================================================ */

    setPhase(
      "phase-tease"
    );


    soundTease();


    await playTeaseText();


    /* ================================================================
       HEARTBEAT
       ================================================================ */

    setPhase(
      "phase-heartbeat"
    );


    soundHeartbeat();


    await wait(1750);


    /* ================================================================
       CAPSULE
       ================================================================ */

    setPhase(
      "phase-box"
    );


    resetCapsule();


    soundCapsule();


    /*
      カプセルを見せる時間を確保
    */

    await wait(1050);


    /*
      ガチャカプセル開封
    */

    await openCapsule(
      rarity
    );


    /*
      開封後の余韻
    */

    await wait(250);


    /* ================================================================
       一瞬の暗転
       ================================================================ */

    await suspensePause();


    /* ================================================================
       RARE
       ================================================================ */

    if (
      rarity === "rare" ||
      rarity === "secret"
    ) {

      setPhase(
        "phase-blackout-extra"
      );


      soundRareWarning();


      await wait(1250);

    }


    /* ================================================================
       SECRET
       ================================================================ */

    if (
      rarity === "secret"
    ) {

      setPhase(
        "phase-special"
      );


      soundSecret();


      await wait(1750);

    }


    /* ================================================================
       BURST
       ================================================================ */

    await playBurst(
      rarity
    );


    /* ================================================================
       RESULT
       ================================================================ */

    renderResultInto(
      "result",
      item
    );


    await wait(180);


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


    /* AUDIO */

    initAudio();


    /* 抽選 */

    const item =
      pickRandomItem();


    if (!item) {

      showFallback(
        "DROPの抽選に失敗しました。"
      );


      return;

    }


    /* 保存 */

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


    /* 演出 */

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


          button.disabled =
            true;


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


    /* ================================================================
       今日のDROP確認
       ================================================================ */

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
          JSON.parse(
            stored
          );

      }

    } catch (error) {

      console.warn(
        "UNITY DROP storage read error:",
        error
      );

    }


    /* ================================================================
       すでにOPEN済み
       ================================================================ */

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


    /* ================================================================
       初回
       ================================================================ */

    showScreen(
      "screen-intro"
    );

  }


  /* ==========================================================================
     ERROR
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
    document.readyState ===
    "loading"
  ) {

    document.addEventListener(
      "DOMContentLoaded",
      init
    );

  } else {

    init();

  }


})();
