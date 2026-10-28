/* UNITY DROP — presentation controller. The server is the sole draw authority. */
const DROP_ITEMS = Object.freeze({
  common: Object.freeze({ rarity: "common", title: "200円OFF", subtitle: "リピーター会イベント", message: "リピーター会イベントの参加費から200円割引になる特典です。" }),
  rare: Object.freeze({ rarity: "rare", title: "RARE DROP", message: "少し特別な特典です。" }),
  secret: Object.freeze({ rarity: "secret", title: "SECRET RARE DROP", message: "おめでとうございます。特別なDROPです。" })
});

(function () {
  "use strict";
  const $ = id => document.getElementById(id);
  const screens = ["screen-intro", "screen-ready", "screen-opening", "screen-result", "screen-already", "screen-fallback"];
  // Preserve the existing tier-specific presentation mapping.
  const VIDEO_SOURCES = Object.freeze({
    common: "assets/videos/secret.mp4",
    rare: "assets/videos/rare.mp4",
    secret: "assets/videos/common.mp4"
  });
  const SHARED_VIDEO_SOURCES = Object.freeze([
    "assets/videos/effects/effect-01.mp4",
    "assets/videos/effects/effect-02.mp4",
    "assets/videos/effects/effect-03.mp4",
    "assets/videos/effects/effect-04.mp4",
    "assets/videos/effects/effect-05.mp4"
  ]);
  let opening = false;
  let pendingItem = null;
  let displayedItem = null;

  const API_URL = String(window.UNITY_DROP_API_URL || "").replace(/\/$/, "");
  const SESSION_KEY = "unityDropParticipantToken";
  const REQUEST_KEY = "unityDropPendingRequest";
  const RESULT_KEY = "unityDropLastResult";

  async function api(path, options = {}) {
    const response = await fetch(`${API_URL}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json", ...(options.headers || {}) },
      body: options.body ? JSON.stringify(options.body) : "{}",
      cache: "no-store"
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(payload.error || "api_error");
      error.status = response.status;
      throw error;
    }
    return payload;
  }

  async function createParticipantToken() {
    const token = (await api("/api/session")).token;
    localStorage.setItem(SESSION_KEY, token);
    return token;
  }

  async function participantToken() {
    return localStorage.getItem(SESSION_KEY) || createParticipantToken();
  }

  async function drawWithToken(token, requestId) {
    return api("/api/draw", {
      headers: { authorization: `Bearer ${token}` },
      body: { requestId }
    });
  }

  async function requestServerDraw() {
    let token = await participantToken();
    let requestId = localStorage.getItem(REQUEST_KEY);
    if (!requestId) {
      requestId = crypto.randomUUID();
      localStorage.setItem(REQUEST_KEY, requestId);
    }

    let result;
    try {
      result = await drawWithToken(token, requestId);
    } catch (error) {
      if (error.status !== 401 && error.message !== "unauthorized") throw error;
      localStorage.removeItem(SESSION_KEY);
      token = await createParticipantToken();
      result = await drawWithToken(token, requestId);
    }

    const item = { ...DROP_ITEMS[result.rarity], eventId: result.event_id, drawRequestId: result.request_id, drawnAt: result.drawn_at };
    localStorage.setItem(RESULT_KEY, JSON.stringify(item));
    localStorage.removeItem(REQUEST_KEY);
    return item;
  }

  function expirationDate() {
    const now = new Date();
    const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const day = Math.min(now.getDate(), new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate());
    return `${next.getFullYear()}/${String(next.getMonth() + 1).padStart(2, "0")}/${String(day).padStart(2, "0")}`;
  }

  function showScreen(id) {
    screens.forEach(name => $(name)?.classList.toggle("is-active", name === id));
    document.body.classList.toggle("in-cinematic", id === "screen-opening");
  }

  function tierLabel(rarity) { return rarity === "secret" ? "SECRET RARE" : rarity === "rare" ? "RARE DROP" : "UNITY DROP"; }

  function cinematic(item) {
    const video = $("drop-video");
    const sources = [VIDEO_SOURCES[item.rarity], ...SHARED_VIDEO_SOURCES];
    const source = sources[Math.floor(Math.random() * sources.length)];
    const skip = $("btn-skip");
    const sound = $("btn-sound");
    if (!video || !source) return Promise.resolve();
    showScreen("screen-opening");
    return new Promise(resolve => {
      let finished = false;
      let timer;
      const finish = () => {
        if (finished) return;
        finished = true;
        clearTimeout(timer);
        skip?.removeEventListener("click", finish);
        sound?.removeEventListener("click", enableSound);
        video.removeEventListener("ended", finish);
        video.removeEventListener("error", finish);
        video.removeEventListener("timeupdate", progress);
        video.pause();
        video.removeAttribute("src");
        video.load();
        if (sound) sound.hidden = true;
        resolve();
      };
      const enableSound = () => {
        video.muted = false;
        video.defaultMuted = false;
        video.volume = 1;
        if (sound) sound.hidden = true;
      };
      const armWatchdog = () => {
        clearTimeout(timer);
        timer = setTimeout(finish, 15000);
      };
      let lastTime = -1;
      const progress = () => {
        if (video.currentTime > lastTime) {
          lastTime = video.currentTime;
          armWatchdog();
        }
      };
      skip?.addEventListener("click", finish);
      sound?.addEventListener("click", enableSound);
      video.addEventListener("ended", finish);
      video.addEventListener("error", finish);
      video.addEventListener("timeupdate", progress);
      if (sound) sound.hidden = true;
      video.muted = false;
      video.defaultMuted = false;
      video.volume = 1;
      video.playsInline = true;
      video.loop = false;
      video.src = source;
      armWatchdog();
      try {
        Promise.resolve(video.play()).catch(async () => {
          video.muted = true;
          video.defaultMuted = true;
          if (sound) sound.hidden = false;
          try { await video.play(); }
          catch (_) { finish(); }
        });
      } catch (_) {
        video.muted = true;
        video.defaultMuted = true;
        if (sound) sound.hidden = false;
        try { Promise.resolve(video.play()).catch(finish); }
        catch (_) { finish(); }
      }
    });
  }

  function render(prefix, item) {
    // Upgrade earlier cached common-prize cards without changing their draw identity.
    if (item.rarity === "common" && /200円\s*OFF/.test(item.title || "")) {
      item = { ...item, title: "200円OFF", subtitle: "リピーター会イベント" };
    }
    if (DROP_ITEMS[item.rarity]) item = { ...item, message: DROP_ITEMS[item.rarity].message };
    item = { ...item, usage: String((window.UNITY_DROP_OPTIONS || {}).redemptionInstruction || "") };
    displayedItem = item;
    $(`${prefix}-usage`).textContent = item.usage;
    $(`${prefix}-usage`).hidden = !item.usage;
    $(`${prefix}-subtitle`).textContent = String(item.subtitle || "");
    $(`${prefix}-title`).textContent = String(item.title || "");
    $(`${prefix}-message`).textContent = String(item.message || "");
    const rarity = $(`${prefix}-rarity-label`);
    rarity.textContent = item.rarity === "common" ? "STANDARD DROP" : tierLabel(item.rarity);
    rarity.dataset.rarity = item.rarity || "common";
    $(`${prefix}-expiration`).textContent = item.expiresAt ? `有効期限  ${item.expiresAt}` : "";
    $(`${prefix}-title`).classList.toggle("discount-value", item.rarity === "common" && item.title === "200円OFF");
  }

  async function openDrop() {
    if (opening) return;
    opening = true;
    try {
      const item = await requestServerDraw();
      item.expiresAt = expirationDate();
      try { localStorage.setItem(RESULT_KEY, JSON.stringify(item)); }
      catch (error) { console.warn("UNITY DROP result cache error:", error); }
      pendingItem = item;
      showScreen("screen-ready");
    } catch (error) {
      console.error("UNITY DROP backend draw error:", error);
      opening = false;
      if (error.message === "pool_exhausted") return fallback("今回のDROPはすべて終了しました。ご参加ありがとうございました。");
      if (error.message === "config_snapshot_mismatch") return fallback("本日のDROP設定を更新中です。少し時間をおいて、もう一度お試しください。");
      return fallback("通信が安定してから、もう一度お試しください。同じ抽選IDで安全に再開します。");
    }
  }

  async function receiveDrop() {
    if (!pendingItem) return;
    const button = $("btn-receive");
    if (button) button.disabled = true;
    const item = pendingItem;
    try { await cinematic(item); }
    catch (error) { console.error("UNITY DROP presentation error:", error); }
    render("result", item);
    showScreen("screen-result");
    pendingItem = null;
    opening = false;
  }

  function fallback(message) {
    $("fallback-message").textContent = message;
    showScreen("screen-fallback");
  }

  function isAppleMobile() {
    return /iPhone|iPad|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  }

  function saveFeedback(message) {
    document.querySelectorAll(".save-status").forEach(node => { node.textContent = message; });
  }

  async function saveResultImage(event) {
    if (!displayedItem) return;
    const button = event?.currentTarget;
    if (button) button.disabled = true;
    try {
      saveFeedback("");
      const item = displayedItem;
      const canvas = document.createElement("canvas");
      canvas.width = 1080;
      canvas.height = 1350;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Image canvas unavailable");
      ctx.fillStyle = "#f6f0e5";
      ctx.fillRect(0, 0, 1080, 1350);
      ctx.fillStyle = "#fffdf9";
      ctx.fillRect(60, 60, 960, 1230);
      ctx.strokeStyle = "#c6a576";
      ctx.lineWidth = 2;
      ctx.strokeRect(80, 80, 920, 1190);
      ctx.textAlign = "center";
      const text = (value, y, size, color = "#38271d", serif = false) => {
        ctx.fillStyle = color;
        ctx.font = `${size}px ${serif ? '"Shippori Mincho", serif' : '"DM Sans", sans-serif'}`;
        ctx.fillText(value, 540, y);
      };
      const wrapped = (value, y, size, lineHeight, color) => {
        ctx.font = `${size}px "Shippori Mincho", serif`;
        let line = "";
        for (const character of String(value || "").match(/[A-Za-z0-9]+|[^A-Za-z0-9]/gu) || []) {
          if (character === "\n" || (line && ctx.measureText(line + character).width > 760)) {
            text(line, y, size, color, true);
            y += lineHeight;
            line = character === "\n" ? "" : character;
          } else line += character;
        }
        if (line) text(line, y, size, color, true);
        return y + lineHeight;
      };
      const logo = document.querySelector(".nav-logo");
      if (logo?.complete && logo.naturalWidth) ctx.drawImage(logo, 480, 140, 120, 120);
      text("UNITY DROP", 330, 38);
      text("TODAY’S CONNECTION", 380, 18, "#8d765d");
      if (item.subtitle) text(item.subtitle, 470, 32, "#604c3e", true);
      let y = wrapped(item.title, 590, item.title === "200円OFF" ? 110 : 46, 85, "#38271d");
      y = wrapped(item.message, y + 65, 30, 52, "#79695c");
      if (item.usage) y = wrapped(item.usage, y + 20, 30, 48, "#604c3e");
      const rankY = Math.max(960, y + 24);
      text(item.rarity === "common" ? "STANDARD DROP" : tierLabel(item.rarity), rankY, 20, "#604c3e");
      if (item.expiresAt) text(`有効期限  ${item.expiresAt}`, Math.max(1060, rankY + 65), 34, "#604c3e", true);
      text("今日のつながりに、ありがとう。", 1220, 28, "#79695c", true);
      const filename = `UNITY-DROP-${item.eventId || "result"}.png`;
      const imageUrl = canvas.toDataURL("image/png");
      // Build the File synchronously to retain the tap's user activation on Safari.
      if (isAppleMobile() && typeof navigator.canShare === "function" && typeof navigator.share === "function") {
        try {
          const binary = atob(imageUrl.split(",")[1]);
          const bytes = Uint8Array.from(binary, character => character.charCodeAt(0));
          const file = new File([bytes], filename, { type: "image/png" });
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({ files: [file], title: "UNITY DROP" });
            saveFeedback("共有メニューを閉じました。写真への保存は、共有メニューの「画像を保存」で行えます。");
            return;
          }
        } catch (error) {
          if (error.name === "AbortError") {
            saveFeedback("保存をキャンセルしました。保存する場合は、もう一度「画像を保存」を押してください。");
            return;
          }
          console.warn("UNITY DROP image sharing unavailable:", error);
        }
      }
      const link = document.createElement("a");
      link.download = filename;
      link.href = imageUrl;
      document.body.appendChild(link);
      link.click();
      link.remove();
      saveFeedback("画像のダウンロードを開始しました。見つからない場合は端末のダウンロード先をご確認ください。");
    } catch (error) {
      console.warn("UNITY DROP image export error:", error);
      saveFeedback("画像を保存できませんでした。もう一度「画像を保存」を押すか、この画面のスクリーンショットをご利用ください。");
    } finally {
      if (button) button.disabled = false;
    }
  }

  function configureResultLinks() {
    const options = window.UNITY_DROP_OPTIONS || {};
    document.querySelectorAll("[data-event-link]").forEach(link => {
      const configured = link.dataset.eventLink === "booking" ? options.bookingUrl : options.eventsUrl;
      try {
        const url = new URL(configured);
        if (url.protocol !== "https:") return;
        link.href = url.href;
        link.hidden = false;
      } catch (_) { /* No unverified destination is shown. */ }
    });
  }

  async function init() {
    configureResultLinks();
    $("btn-open").addEventListener("click", event => {
      event.currentTarget.disabled = true;
      openDrop();
    }, { once: true });
    $("btn-receive").addEventListener("click", receiveDrop);
    $("btn-save-image").addEventListener("click", saveResultImage);
    $("btn-save-already").addEventListener("click", saveResultImage);
    if (isAppleMobile() && typeof navigator.canShare === "function" && typeof navigator.share === "function") {
      document.querySelectorAll(".save-help").forEach(note => { note.hidden = false; });
    }
    try {
      const [event, saved] = await Promise.all([api("/api/event"), Promise.resolve(JSON.parse(localStorage.getItem(RESULT_KEY) || "null"))]);
      if (saved?.title && saved.eventId === event.eventId) {
        render("already", saved);
        showScreen("screen-already");
      } else {
        showScreen("screen-intro");
      }
    } catch (_) {
      showScreen("screen-intro");
    }
  }

  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", init) : init();
})();
