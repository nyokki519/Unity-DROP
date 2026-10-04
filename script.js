/* UNITY DROP — presentation controller. The server is the sole draw authority. */
const DROP_ITEMS = Object.freeze({
  common: Object.freeze({ rarity: "common", title: "リピーター会イベント 200円OFF", message: "次回のUnityイベントで使える特典です。スタッフにお伝えください。" }),
  rare: Object.freeze({ rarity: "rare", title: "RARE DROP", message: "少し特別な特典です。内容はスタッフにお声がけください。" }),
  secret: Object.freeze({ rarity: "secret", title: "SECRET RARE DROP", message: "おめでとうございます。特別なDROPです。内容はスタッフにお声がけください。" })
});

(function () {
  "use strict";
  const $ = id => document.getElementById(id);
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
  const screens = ["screen-intro", "screen-opening", "screen-result", "screen-already", "screen-fallback"];
  const phases = ["phase-awaken", "phase-drop", "phase-charge", "phase-break", "phase-false", "phase-revive", "phase-reveal"];
  let audio;
  let skipped = false;
  let skipWaiters = [];

  function visualRandomIndex(maximum) {
    const values = new Uint32Array(1);
    if (window.crypto?.getRandomValues) {
      window.crypto.getRandomValues(values);
      return values[0] % maximum;
    }
    return Math.floor(Math.random() * maximum);
  }

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

  function jstDate() {
    try { return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()); }
    catch (_) { const d = new Date(Date.now() + (540 + new Date().getTimezoneOffset()) * 60000); return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"), String(d.getDate()).padStart(2, "0")].join("-"); }
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

  function showPhase(id) { phases.forEach(name => $(name)?.classList.toggle("is-active", name === id)); }
  async function hold(ms) {
    if (skipped) return;
    await Promise.race([
      wait(ms),
      new Promise(resolve => skipWaiters.push(resolve))
    ]);
  }

  function skipCinematic() {
    skipped = true;
    skipWaiters.splice(0).forEach(resolve => resolve());
  }
  function vibrate(pattern) { if (navigator.vibrate) navigator.vibrate(pattern); }

  function initAudio() {
    if (!audio) { const Context = window.AudioContext || window.webkitAudioContext; if (Context) audio = new Context(); }
    audio?.resume?.();
  }

  function tone(freq, length = .25, volume = .05, end = freq, type = "sine", delay = 0) {
    if (!audio) return;
    const start = audio.currentTime + delay;
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.type = type; oscillator.frequency.setValueAtTime(freq, start); oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, end), start + length);
    gain.gain.setValueAtTime(.0001, start); gain.gain.exponentialRampToValueAtTime(volume, start + .015); gain.gain.exponentialRampToValueAtTime(.0001, start + length);
    oscillator.connect(gain).connect(audio.destination); oscillator.start(start); oscillator.stop(start + length + .02);
  }

  const sounds = {
    awaken() { tone(48, 1.4, .13, 68); tone(196, 1.2, .025, 392, "sine", .35); },
    drop() { tone(820, .7, .07, 90); tone(42, .65, .22, 28, "sine", .68); },
    charge() { [0,.35,.7,1.05,1.4].forEach((d,i) => tone(100 + i * 55, .3, .045 + i * .008, 180 + i * 80, "triangle", d)); },
    crack() { tone(62, .8, .18, 30); tone(920, .2, .08, 180, "sawtooth", 1.35); },
    lost() { tone(180, 1.1, .045, 48, "sine"); },
    revive() { [0,.14,.28,.42].forEach((d,i) => tone(220 * (i + 1), .65, .055, 500 * (i + 1), "sine", d)); },
    reveal(rarity) { tone(48, 1.6, .26, 24); [0,.1,.2,.3,.4].forEach((d,i) => tone(440 + i * 180, 1, rarity === "secret" ? .075 : .05, 900 + i * 260, "triangle", d)); }
  };

  function seedVisuals() {
    const stars = $("stars");
    for (let i = 0; i < 55; i++) { const s = document.createElement("span"); s.style.cssText = `left:${Math.random()*100}%;top:${Math.random()*100}%;animation-delay:${Math.random()*2}s`; stars.appendChild(s); }
    const field = $("charge-field");
    for (let i = 0; i < 40; i++) { const p = document.createElement("span"); const a = Math.random()*Math.PI*2, d = 110 + Math.random()*240; p.style.setProperty("--x", `${Math.cos(a)*d}px`); p.style.setProperty("--y", `${Math.sin(a)*d}px`); p.style.animationDelay = `${Math.random()}s`; field.appendChild(p); }
  }

  function burst(rarity) {
    const field = $("particle-burst"); field.innerHTML = "";
    const count = rarity === "secret" ? 100 : rarity === "rare" ? 70 : 48;
    for (let i = 0; i < count; i++) { const p = document.createElement("span"), a = Math.random()*Math.PI*2, d = 90 + Math.random()*330; p.style.setProperty("--x", `${Math.cos(a)*d}px`); p.style.setProperty("--y", `${Math.sin(a)*d}px`); p.style.setProperty("--delay", `${Math.random()*.25}s`); field.appendChild(p); }
  }

  function tierLabel(rarity) { return rarity === "secret" ? "SECRET RARE" : rarity === "rare" ? "RARE DROP" : "UNITY DROP"; }

  function chooseOmen(actualRarity) {
    const roll = visualRandomIndex(100);
    if (actualRarity === "secret") return roll < 45 ? "hot" : roll < 75 ? "good" : "normal";
    if (actualRarity === "rare") return roll < 18 ? "extreme" : roll < 60 ? "hot" : roll < 82 ? "good" : "normal";
    return roll < 6 ? "hot" : roll < 28 ? "good" : "normal";
  }

  async function cinematic(item) {
    skipped = false; showScreen("screen-opening");
    const scene = $("cinematic"); scene.className = `cinematic rarity-${item.rarity || "common"}`;
    showPhase("phase-awaken"); sounds.awaken(); await hold(1700);
    showPhase("phase-drop"); sounds.drop(); await hold(1450); vibrate(25);
    const omen = chooseOmen(item.rarity);
    const omenNames = { normal: "IVORY", good: "SAGE", hot: "TERRACOTTA", extreme: "PRISMATIC" };
    $("omen").className = `omen omen-${omen}`;
    $("omen-level").textContent = omenNames[omen];
    showPhase("phase-charge"); sounds.charge();
    const counter = $("charge-percent"); let value = 0;
    const timer = setInterval(() => { value = Math.min(99, value + Math.ceil(Math.random()*8)); counter.textContent = value; }, 90);
    await hold(2100); clearInterval(timer); counter.textContent = "100";
    showPhase("phase-break"); sounds.crack(); await hold(1850); vibrate(35);
    /* Common can still fake-out; higher tiers always get the dramatic reversal. */
    showPhase("phase-false"); sounds.lost(); await hold(item.rarity === "common" ? 1200 : 1650);
    const upgrading = (item.rarity === "rare" && omen === "normal") || (item.rarity === "secret" && omen !== "extreme");
    scene.classList.toggle("is-upgrading", upgrading);
    $("revive-line").textContent = upgrading ? "つながりが、運命を変える。" : "まだ、終わらない。";
    showPhase("phase-revive"); sounds.revive(); await hold(1800);
    $("card-tier").textContent = tierLabel(item.rarity); $("reveal-caption").textContent = item.rarity === "secret" ? "A MIRACLE CONNECTED" : "YOUR DROP";
    burst(item.rarity); $("cinema-flash").classList.add("fire"); showPhase("phase-reveal"); sounds.reveal(item.rarity); vibrate([20, 45, 35]); await hold(item.rarity === "secret" ? 2700 : 2100);
    render("result", item); showScreen("screen-result");
  }

  function render(prefix, item) {
    $(`${prefix}-title`).textContent = String(item.title || "");
    $(`${prefix}-message`).textContent = String(item.message || "");
    const rarity = $(`${prefix}-rarity-label`); rarity.textContent = item.rarity === "common" ? "STANDARD DROP" : tierLabel(item.rarity); rarity.dataset.rarity = item.rarity || "common";
    $(`${prefix}-expiration`).textContent = item.expiresAt ? `有効期限  ${item.expiresAt}` : "";
  }

  async function openDrop() {
    initAudio();
    let item;
    try { item = await requestServerDraw(); }
    catch (error) {
      console.error("UNITY DROP backend draw error:", error);
      if (error.message === "pool_exhausted") return fallback("今回のDROPはすべて終了しました。ご参加ありがとうございました。");
      return fallback("通信が安定してから、もう一度お試しください。同じ抽選IDで安全に再開します。");
    }
    item.expiresAt = expirationDate();
    try { await cinematic(item); } catch (error) { console.error("UNITY DROP presentation error:", error); render("result", item); showScreen("screen-result"); }
  }

  function fallback(message) { $("fallback-message").textContent = message; showScreen("screen-fallback"); }
  async function init() {
    seedVisuals();
    $("btn-open").addEventListener("click", event => { event.currentTarget.disabled = true; openDrop(); }, { once: true });
    $("btn-skip").addEventListener("click", skipCinematic);
    $("btn-share").addEventListener("click", async () => { const data = { title: "UNITY DROP", text: "UNITY DROPを受け取りました。", url: location.href }; try { if (navigator.share) await navigator.share(data); else await navigator.clipboard.writeText(location.href); } catch (_) {} });
    try {
      const [event, saved] = await Promise.all([api("/api/event"), Promise.resolve(JSON.parse(localStorage.getItem(RESULT_KEY) || "null"))]);
      if (saved?.title && saved.eventId === event.eventId) { render("already", saved); showScreen("screen-already"); }
      else showScreen("screen-intro");
    } catch (_) { showScreen("screen-intro"); }
  }
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", init) : init();
})();
