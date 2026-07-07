/* DetourEats v0.3 app layer
   Focus: clearer trip states, stronger recommendation language, cleaner demo behavior.
*/

const els = {
  setupScreen: document.getElementById("setupScreen"),
  driveScreen: document.getElementById("driveScreen"),
  destinationInput: document.getElementById("destinationInput"),
  maxAddedInput: document.getElementById("maxAddedInput"),
  tripModeInput: document.getElementById("tripModeInput"),
  currentTimeInput: document.getElementById("currentTimeInput"),
  startTripButton: document.getElementById("startTripButton"),
  enableNotificationsButton: document.getElementById("enableNotificationsButton"),
  backButton: document.getElementById("backButton"),
  tripTitle: document.getElementById("tripTitle"),
  tripSubtitle: document.getElementById("tripSubtitle"),
  decisionCard: document.getElementById("decisionCard"),
  detailsPanel: document.getElementById("detailsPanel"),
  takeMeThereButton: document.getElementById("takeMeThereButton"),
  skipButton: document.getElementById("skipButton"),
  routePositionInput: document.getElementById("routePositionInput"),
  routePositionLabel: document.getElementById("routePositionLabel"),
  lookaheadInput: document.getElementById("lookaheadInput"),
  candidatePoolInput: document.getElementById("candidatePoolInput"),
  hoursModeInput: document.getElementById("hoursModeInput"),
  upcomingPanel: document.getElementById("upcomingPanel"),
  toast: document.getElementById("toast"),
  demoToggleButton: document.getElementById("demoToggleButton"),
  debugPanel: document.getElementById("debugPanel")
};

let state = {
  started: false,
  destination: "Myrtle Beach, SC",
  maxAdded: 10,
  tripMode: "balanced",
  currentTime: 480,
  routePosition: 0,
  lookahead: 5,
  candidatePool: "All",
  hoursMode: "requireOpen",
  skippedIds: new Set(),
  currentPick: null,
  currentResult: null,
  notificationsEnabled: false
};

function getCandidates() {
  if (Array.isArray(window.DETOUR_EATS_CANDIDATES)) return window.DETOUR_EATS_CANDIDATES;
  if (Array.isArray(window.candidates)) return window.candidates;
  if (Array.isArray(window.restaurants)) return window.restaurants;
  return [];
}

function getEngineResult() {
  const candidates = getCandidates();

  const engineSettings = {
    routePosition: state.routePosition,
    currentTime: state.currentTime,
    maxAdded: state.maxAdded,
    maxAddedMinutes: state.maxAdded,
    lookahead: state.lookahead,
    candidatePool: state.candidatePool,
    hoursMode: state.hoursMode,
    tripMode: state.tripMode,
    travelDay: "saturday",
    corridor: "All",
    hideChains: true,
    mealMode: "auto",
    mealType: getMealWindowLabel()
  };

  // v0.1/v0.2 engine exposes a global recommend(candidates, settings) function.
  if (typeof window.recommend === "function") {
    const result = window.recommend(candidates, engineSettings);
    return {
      ...result,
      pick: result.pick,
      upcoming: result.upcoming || [],
      evaluated: result.evaluated || []
    };
  }

  if (window.DetourEngine && typeof window.DetourEngine.recommend === "function") {
    return window.DetourEngine.recommend({
      candidates,
      ...engineSettings,
      skippedIds: state.skippedIds
    });
  }

  if (typeof window.getRecommendation === "function") {
    return window.getRecommendation({
      candidates,
      ...engineSettings,
      skippedIds: state.skippedIds
    });
  }

  // Fallback scoring if engine.js API changes or is unavailable.
  const lookaheadLimit = state.lookahead === 99 ? 999 : state.lookahead;
  const visible = candidates
    .filter(c => !state.skippedIds.has(String(c.id ?? c.name)))
    .filter(c => passesPool(c))
    .filter(c => Number(c.seq ?? c.sequence ?? c.routeIndex ?? 0) >= state.routePosition)
    .slice(0, lookaheadLimit)
    .map(c => ({...c, score: fallbackScore(c)}))
    .sort((a, b) => b.score - a.score);

  return {
    pick: visible[0] || null,
    upcoming: visible.slice(0, 6),
    reason: visible[0] ? "recommended" : "no_candidates"
  };
}

function passesPool(c) {
  if (state.candidatePool === "All") return true;
  const tags = [
    c.category,
    c.bucket,
    c.type,
    c.segment,
    ...(Array.isArray(c.tags) ? c.tags : [])
  ].filter(Boolean).map(x => String(x).toLowerCase());
  return tags.some(t => t.includes(state.candidatePool.toLowerCase()));
}

function fallbackScore(c) {
  const quality = Number(c.destinationEvidence ? (c.destinationEvidence * 8 + (c.uniqueness ?? 5) * 2) : (c.quality ?? c.ratingScore ?? c.score ?? 75));
  const added = Number(c.addedMinutes ?? c.estimatedAddedMinutes ?? c.addedTime ?? c.detourMinutes ?? 12);
  const independentBonus = c.chain ? -8 : 5;
  const tripPenalty = Math.max(0, added - state.maxAdded) * 3;
  return Math.round(Math.max(0, Math.min(99, quality + independentBonus - tripPenalty)));
}

function normalizePick(rawPick) {
  if (!rawPick) return null;
  const score =
    rawPick.detourScore ??
    rawPick.tripScore ??
    rawPick.score ??
    rawPick._score ??
    82;

  const added =
    rawPick.addedMinutes ??
    rawPick.estimatedAddedMinutes ??
    rawPick.addedTime ??
    rawPick.detourMinutes ??
    rawPick.extraMinutes ??
    10;

  const name = rawPick.name ?? rawPick.restaurant ?? "Recommended Stop";
  const signature = rawPick.signatureDish ?? rawPick.famousFor ?? rawPick.tagline ?? rawPick.summary ?? rawPick.evidenceSummary ?? "Local food worth considering.";
  const arrival = rawPick.arrivalTime ?? rawPick.arrivalClock ?? rawPick.eta ?? estimateArrival(rawPick);
  const open = rawPick.openAtArrival ?? rawPick.isOpen ?? rawPick.hours?.open ?? true;
  const chain = Boolean(rawPick.chain);
  const id = String(rawPick.id ?? rawPick.name ?? Math.random());

  return {
    ...rawPick,
    id,
    name,
    score: Math.round(Number(score)),
    added: Number(added),
    signature,
    arrival,
    open,
    chain
  };
}

function estimateArrival(pick) {
  const seq = Number(pick.seq ?? pick.sequence ?? pick.routeIndex ?? state.routePosition);
  const minutesAhead = Math.max(0, seq - state.routePosition) * 45;
  return formatMinutesOfDay(state.currentTime + minutesAhead);
}

function formatMinutesOfDay(total) {
  let mins = ((Number(total) % 1440) + 1440) % 1440;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const hour12 = h % 12 || 12;
  const ampm = h < 12 ? "AM" : "PM";
  return `${hour12}:${String(m).padStart(2, "0")} ${ampm}`;
}

function getMealWindowLabel() {
  const t = Number(state.currentTime);
  if (t < 600) return "breakfast";
  if (t < 900) return "lunch";
  if (t < 1080) return "dinner";
  return "late bite";
}

function getTripState(pick, result) {
  const position = Number(state.routePosition);
  const meal = getMealWindowLabel();

  if (!pick) {
    return {
      key: "keep-driving",
      label: "Keep Driving",
      headline: "Nothing worth stopping for yet.",
      subline: "We’re still watching ahead.",
      badgeClass: "wait"
    };
  }

  if (pick.tier === "Bucket List Stop" || pick.score >= 97) {
    return {
      key: "bucket-list",
      label: "Bucket List Stop",
      headline: "This is rare.",
      subline: "We’d change the plan for this one.",
      badgeClass: "bucket"
    };
  }

  if (pick.tier === "Worth the Detour" || pick.score >= 92) {
    return {
      key: "this-is-your-stop",
      label: "This Is Your Stop",
      headline: "We’d stop here.",
      subline: `Best ${meal} decision on this stretch.`,
      badgeClass: "strong"
    };
  }

  if (pick.tier === "Best Stop Ahead" || pick.score >= 84) {
    return {
      key: "found-something",
      label: "Found Something",
      headline: "Good stop ahead.",
      subline: "Not bucket-list, but it fits this trip.",
      badgeClass: "practical"
    };
  }

  return {
    key: "best-available",
    label: "Best Available",
    headline: "This is the best available option.",
    subline: "Not legendary, but it is the best call for this stretch.",
    badgeClass: "practical"
  };
}

function getRecommendationTier(pick) {
  if (!pick) return "Keep Driving";
  if (pick.tier) return pick.tier;
  if (pick.score >= 97) return "Bucket List Stop";
  if (pick.score >= 92) return "Worth the Detour";
  if (pick.score >= 84) return "Best Stop Ahead";
  return "Best Available";
}

function getRecommendationCopy(pick, tripState) {
  if (!pick) {
    return {
      lead: "Keep driving.",
      rationale: [
        "No stop in the current lookahead window clears the bar.",
        "DetourEats is still watching the route.",
        "When there’s a better food decision ahead, we’ll surface it."
      ]
    };
  }

  const rationale = [];

  if (!pick.chain) rationale.push("Independent/local option — not a default chain stop.");
  if (pick.added <= state.maxAdded) rationale.push(`Adds ${pick.added} minutes, within your ${state.maxAdded}-minute limit.`);
  else rationale.push(`Adds ${pick.added} minutes, slightly above your normal limit, but the food case is stronger.`);
  rationale.push(pick.signature);

  if (tripState.key === "best-available") {
    rationale.unshift("This is the strongest available stop for this part of the trip.");
  }

  if (pick.open === false) {
    rationale.unshift("Warning: this may not be open at your estimated arrival.");
  }

  return {
    lead: tripState.headline,
    rationale
  };
}

function render() {
  if (!state.started) return;

  const result = getEngineResult() || {};
  let pick = normalizePick(result.pick || result.recommendation || result.best || result.currentPick);
  let upcoming = (result.upcoming || result.candidates || []).map(normalizePick).filter(Boolean);

  if (pick && state.skippedIds.has(pick.id)) {
    pick = upcoming.find(item => !state.skippedIds.has(item.id)) || null;
  }
  upcoming = upcoming.filter(item => !state.skippedIds.has(item.id));

  state.currentPick = pick;
  state.currentResult = result;

  if (!pick) {
    const fallback = getFallbackUpcoming(null)[0];
    if (fallback) pick = fallback;
  }

  const trip = getTripState(pick, result);
  const copy = getRecommendationCopy(pick, trip);

  els.tripTitle.textContent = state.destination || "Your trip";
  els.tripSubtitle.textContent = trip.label;

  renderDecisionCard(pick, trip, copy);
  renderDetailsPanel(pick, trip, copy);
  renderUpcoming(upcoming.length ? upcoming : getFallbackUpcoming(pick));

  if (els.routePositionLabel) {
    els.routePositionLabel.textContent = describeRoutePosition();
  }

  els.takeMeThereButton.disabled = !pick;
  els.takeMeThereButton.textContent = pick ? "Take Me There" : "Keep Watching";
}

function renderDecisionCard(pick, trip, copy) {
  if (!pick) {
    els.decisionCard.innerHTML = `
      <div class="badge ${trip.badgeClass}">${trip.label}</div>
      <div class="empty">
        <h2>${trip.headline}</h2>
        <p>${trip.subline}</p>
        <div class="fact-grid">
          <div class="fact highlight">
            <strong>Looking ahead</strong>
            <span>We’ll only interrupt when the stop is worth it.</span>
          </div>
        </div>
      </div>
    `;
    return;
  }

  const tier = getRecommendationTier(pick);
  const openLabel = pick.open ? "Open at arrival" : "Check hours";
  const chainLabel = pick.chain ? "Chain / known brand" : "Independent/local";

  els.decisionCard.innerHTML = `
    <div class="badge ${trip.badgeClass}">${tier}</div>
    <p class="score-label">Detour Score</p>
    <div class="score">${pick.score}</div>
    <h2 class="place-name">${escapeHtml(pick.name)}</h2>
    <p class="meta">${trip.subline}</p>

    <div class="fact-grid">
      <div class="fact highlight">
        <strong>Adds ${pick.added} min</strong>
        <span>to your trip</span>
      </div>
      <div class="fact">
        <strong>${escapeHtml(openLabel)}</strong>
        <span>ETA ${escapeHtml(String(pick.arrival))}</span>
      </div>
      <div class="fact">
        <strong>${escapeHtml(chainLabel)}</strong>
        <span>${escapeHtml(pick.signature)}</span>
      </div>
    </div>
  `;
}

function renderDetailsPanel(pick, trip, copy) {
  const rationale = copy.rationale || [];
  if (!pick) {
    els.detailsPanel.innerHTML = `
      <h2>What DetourEats is doing</h2>
      <ul class="details-list">
        ${rationale.map(item => `<li>${escapeHtml(item)}</li>`).join("")}
      </ul>
    `;
    return;
  }

  const explanation = pick.scoreExplanation;
  const scoreBreakdown = explanation ? `
    <div class="score-breakdown">
      <div><strong>${explanation.restaurantQuality}</strong><span>Food</span></div>
      <div><strong>${explanation.tripFit}</strong><span>Trip Fit</span></div>
      <div><strong>${explanation.timeFit}</strong><span>Time</span></div>
      <div><strong>${explanation.scarcityFit}</strong><span>Scarcity</span></div>
    </div>
  ` : "";

  const engineBullets = explanation?.bullets?.length ? explanation.bullets : rationale;

  els.detailsPanel.innerHTML = `
    <h2>Why this stop</h2>
    <p class="lead-copy">${escapeHtml(copy.lead)}</p>
    ${scoreBreakdown}
    <ul class="details-list">
      ${engineBullets.map(item => `<li>${escapeHtml(item)}</li>`).join("")}
    </ul>
  `;
}

function renderUpcoming(items) {
  if (!els.upcomingPanel) return;

  const rows = items.slice(0, 5).map(item => `
    <div class="stop-row">
      <div class="mini-score">${item.score}</div>
      <div>
        <strong>${escapeHtml(item.name)}</strong>
        <span>${getRecommendationTier(item)} · adds ${item.added} min · ${escapeHtml(item.signature)}</span>
      </div>
    </div>
  `).join("");

  els.upcomingPanel.innerHTML = `
    <h2>Upcoming candidates</h2>
    <p class="hint">Debug view. Hidden from the main user experience.</p>
    ${rows || `<p class="hint">No remaining candidates in this demo window.</p>`}
  `;
}

function getFallbackUpcoming(currentPick) {
  return getCandidates()
    .filter(c => !currentPick || String(c.id ?? c.name) !== currentPick.id)
    .filter(c => !state.skippedIds.has(String(c.id ?? c.name)))
    .slice(0, 5)
    .map(normalizePick)
    .filter(Boolean);
}

function describeRoutePosition() {
  const n = Number(state.routePosition);
  if (n === 0) return "Start of route";
  if (n < 8) return "Early trip";
  if (n < 16) return "Mid-trip";
  return "Late trip";
}

function showToast(title, message) {
  if (!els.toast) return;
  els.toast.innerHTML = `<strong>${escapeHtml(title)}</strong><span>${escapeHtml(message)}</span>`;
  els.toast.classList.remove("hidden");
  setTimeout(() => els.toast.classList.add("hidden"), 4500);
}

function startTrip() {
  state.started = true;
  state.destination = els.destinationInput.value || "your destination";
  state.maxAdded = Number(els.maxAddedInput.value);
  state.tripMode = els.tripModeInput.value;
  state.currentTime = Number(els.currentTimeInput.value);
  state.routePosition = Number(els.routePositionInput?.value || 0);
  state.lookahead = Number(els.lookaheadInput?.value || 5);
  state.candidatePool = els.candidatePoolInput?.value || "All";
  state.hoursMode = els.hoursModeInput?.value || "requireOpen";
  state.skippedIds = new Set();

  els.setupScreen.classList.add("hidden");
  els.driveScreen.classList.remove("hidden");

  render();
  showToast("Trust Us Mode is on", "We’ll keep the main screen simple and only surface the best decision.");
}

function goBack() {
  state.started = false;
  els.driveScreen.classList.add("hidden");
  els.setupScreen.classList.remove("hidden");
}

function skipPick() {
  if (state.currentPick) {
    state.skippedIds.add(state.currentPick.id);
    showToast("Skipped", "We’ll look for the next best option.");
  }
  render();
}

function takeMeThere() {
  const pick = state.currentPick;
  if (!pick) {
    showToast("Still watching", "No stop is worth interrupting you for yet.");
    return;
  }

  const query = encodeURIComponent(pick.name);
  const url = pick.mapsUrl || pick.url || `https://www.google.com/maps/search/?api=1&query=${query}`;
  window.open(url, "_blank", "noopener,noreferrer");
}

async function enableNotifications() {
  if (!("Notification" in window)) {
    showToast("Notifications unavailable", "This browser does not support notifications.");
    return;
  }

  const permission = await Notification.requestPermission();
  state.notificationsEnabled = permission === "granted";

  if (state.notificationsEnabled) {
    new Notification("DetourEats", {
      body: "Test notification enabled. We’ll tell you when food is worth the stop.",
      icon: "icons/icon-192.svg"
    });
  } else {
    showToast("Notifications not enabled", "You can still use the demo without notifications.");
  }
}

function updateFromControls() {
  state.routePosition = Number(els.routePositionInput?.value || 0);
  state.lookahead = Number(els.lookaheadInput?.value || 5);
  state.candidatePool = els.candidatePoolInput?.value || "All";
  state.hoursMode = els.hoursModeInput?.value || "requireOpen";
  state.currentTime = Number(els.currentTimeInput?.value || state.currentTime);
  render();
}

function toggleDemoControls() {
  const hidden = els.debugPanel.classList.toggle("hidden");
  els.demoToggleButton.textContent = hidden ? "Show Demo Controls" : "Hide Demo Controls";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("service-worker.js").catch(() => {});
  }
}

els.startTripButton.addEventListener("click", startTrip);
els.backButton.addEventListener("click", goBack);
els.skipButton.addEventListener("click", skipPick);
els.takeMeThereButton.addEventListener("click", takeMeThere);
els.enableNotificationsButton.addEventListener("click", enableNotifications);
els.demoToggleButton.addEventListener("click", toggleDemoControls);

[
  els.routePositionInput,
  els.lookaheadInput,
  els.candidatePoolInput,
  els.hoursModeInput,
  els.currentTimeInput,
  els.maxAddedInput,
  els.tripModeInput
].forEach(el => {
  if (!el) return;
  el.addEventListener("input", () => {
    if (state.started) updateFromControls();
  });
  el.addEventListener("change", () => {
    if (state.started) updateFromControls();
  });
});

registerServiceWorker();
