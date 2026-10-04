/* UNITY DROP — presentation controller. The server is the sole draw authority. */
const DROP_ITEMS = Object.freeze({
  common: Object.freeze({ rarity: "common", title: "リピーター会イベント 200円OFF", message: "次回のUnityイベントで使える特典です。スタッフにお伝えください。" }),
  rare: Object.freeze({ rarity: "rare", title: "RARE DROP", message: "少し特別な特典です。内容はスタッフにお声がけください。" }),
  secret: Object.freeze({ rarity: "secret", title: "SECRET RARE DROP", message: "おめでとうございます。特別なDROPです。内容はスタッフにお声がけください。" })
});

(function () {
  "use strict";
  const $ = id => document.getElementById(id);
  const screens = ["screen-intro", "screen-opening", "screen-result", "screen-already", "screen-fallback"];
  const VIDEO_SOURCES = Object.freeze({
    common: "assets/videos/secret.mp4",
    rare: "assets/videos/rare.mp4",
    secret: "assets/videos/common.mp4"
  });
  let opening = false;

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

  async function participantToken() {
    let token = localStorage.getItem(SESSION_KEY);
    if (!token) {
      token = (await api("/api/session")).token;
      localStorage.setItem(SESSION_KEY, token);
    }
    return token;
  }

  async function requestServerDraw() {
    const token = await participantToken();
    let requestId = localStorage.getItem(REQUEST_KEY);
    if (!requestId) {
      requestId = crypto.randomUUID();
      localStorage.setItem(REQUEST_KEY, requestId);
    }

    /* Reusing requestId makes a retry safe when the first response was lost. */
    const result = await api("/api/draw", {
      headers: { authorization: `Bearer ${token}` },
      body: { requestId }
    });
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
    const source = VIDEO_SOURCES[item.rarity];
    const skip = $("btn-skip");
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
        video.removeEventListener("ended", finish);
        video.removeEventListener("error", finish);
        video.removeEventListener("timeupdate", progress);
        video.pause();
        video.removeAttribute("src");
        video.load();
        resolve();
      };
      // A stalled download/playback must never hide an already awarded prize.
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
      video.addEventListener("ended", finish);
      video.addEventListener("error", finish);
      video.addEventListener("timeupdate", progress);
      video.muted = true;
      video.defaultMuted = true;
      video.playsInline = true;
      video.loop = false;
      video.src = source;
      armWatchdog();
      try { Promise.resolve(video.play()).catch(finish); }
      catch (_) { finish(); }
    });
  }

  function render(prefix, item) {
    $(`${prefix}-title`).textContent = String(item.title || "");
    $(`${prefix}-message`).textContent = String(item.message || "");
    const rarity = $(`${prefix}-rarity-label`); rarity.textContent = item.rarity === "common" ? "STANDARD DROP" : tierLabel(item.rarity); rarity.dataset.rarity = item.rarity || "common";
    $(`${prefix}-expiration`).textContent = item.expiresAt ? `有効期限  ${item.expiresAt}` : "";
  }

  async function openDrop() {
    if (opening) return;
    opening = true;
    let item;
    try { item = await requestServerDraw(); }
    catch (error) {
      console.error("UNITY DROP backend draw error:", error);
      if (error.message === "pool_exhausted") return fallback("今回のDROPはすべて終了しました。ご参加ありがとうございました。");
      return fallback("通信が安定してから、もう一度お試しください。同じ抽選IDで安全に再開します。");
    }
    item.expiresAt = expirationDate();
    try { localStorage.setItem(RESULT_KEY, JSON.stringify(item)); }
    catch (error) { console.warn("UNITY DROP result cache error:", error); }
    try { await cinematic(item); }
    catch (error) { console.error("UNITY DROP presentation error:", error); }
    render("result", item);
    showScreen("screen-result");
  }

  function fallback(message) { $("fallback-message").textContent = message; showScreen("screen-fallback"); }
  async function init() {
    $("btn-open").addEventListener("click", event => { event.currentTarget.disabled = true; openDrop(); }, { once: true });
    $("btn-share").addEventListener("click", async () => { const data = { title: "UNITY DROP", text: "UNITY DROPを受け取りました。", url: location.href }; try { if (navigator.share) await navigator.share(data); else await navigator.clipboard.writeText(location.href); } catch (_) {} });
    try {
      const [event, saved] = await Promise.all([api("/api/event"), Promise.resolve(JSON.parse(localStorage.getItem(RESULT_KEY) || "null"))]);
      if (saved?.title && saved.eventId === event.eventId) { render("already", saved); showScreen("screen-already"); }
      else showScreen("screen-intro");
    } catch (_) { showScreen("screen-intro"); }
  }
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", init) : init();
})();
