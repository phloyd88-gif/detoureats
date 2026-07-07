/* DetourEats v1.3 Beta app layer
   Focus: clearer trip states, stronger recommendation language, cleaner demo behavior.
*/

const els = {
  setupScreen: document.getElementById("setupScreen"),
  driveScreen: document.getElementById("driveScreen"),
  originInput: document.getElementById("originInput"),
  destinationInput: document.getElementById("destinationInput"),
  swapRouteButton: document.getElementById("swapRouteButton"),
  previewRouteButton: document.getElementById("previewRouteButton"),
  routePreviewCard: document.getElementById("routePreviewCard"),
  recentTripsSection: document.getElementById("recentTripsSection"),
  recentTripsList: document.getElementById("recentTripsList"),
  clearRecentTripsButton: document.getElementById("clearRecentTripsButton"),
  useLocationButton: document.getElementById("useLocationButton"),
  locationModeBadge: document.getElementById("locationModeBadge"),
  locationSetupTitle: document.getElementById("locationSetupTitle"),
  locationSetupStatus: document.getElementById("locationSetupStatus"),
  maxAddedInput: document.getElementById("maxAddedInput"),
  tripModeInput: document.getElementById("tripModeInput"),
  stopTypeInput: document.getElementById("stopTypeInput"),
  foodPreferenceInput: document.getElementById("foodPreferenceInput"),
  chainPolicyInput: document.getElementById("chainPolicyInput"),
  pricePreferenceInput: document.getElementById("pricePreferenceInput"),
  familyFriendlyInput: document.getElementById("familyFriendlyInput"),
  currentTimeInput: document.getElementById("currentTimeInput"),
  startTripButton: document.getElementById("startTripButton"),
  enableNotificationsButton: document.getElementById("enableNotificationsButton"),
  backButton: document.getElementById("backButton"),
  tripTitle: document.getElementById("tripTitle"),
  tripSubtitle: document.getElementById("tripSubtitle"),
  driverStatusPanel: document.getElementById("driverStatusPanel"),
  routeProgressBar: document.getElementById("routeProgressBar"),
  routeProgressText: document.getElementById("routeProgressText"),
  liveRouteBadge: document.getElementById("liveRouteBadge"),
  routingProgressMessage: document.getElementById("routingProgressMessage"),
  routeRemainingText: document.getElementById("routeRemainingText"),
  nextFoodZoneText: document.getElementById("nextFoodZoneText"),
  decisionCountdownText: document.getElementById("decisionCountdownText"),
  decisionCard: document.getElementById("decisionCard"),
  decisionConsequencePanel: document.getElementById("decisionConsequencePanel"),
  tripTimelinePanel: document.getElementById("tripTimelinePanel"),
  timelineModeLabel: document.getElementById("timelineModeLabel"),
  foodZoneSummary: document.getElementById("foodZoneSummary"),
  tripTimeline: document.getElementById("tripTimeline"),
  detailsPanel: document.getElementById("detailsPanel"),
  takeMeThereButton: document.getElementById("takeMeThereButton"),
  skipButton: document.getElementById("skipButton"),
  whyButton: document.getElementById("whyButton"),
  fasterButton: document.getElementById("fasterButton"),
  recheckRouteButton: document.getElementById("recheckRouteButton"),
  priorityChips: Array.from(document.querySelectorAll("[data-priority]")),
  skipReasonPanel: document.getElementById("skipReasonPanel"),
  closeSkipPanelButton: document.getElementById("closeSkipPanelButton"),
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
  origin: "",
  destination: "",
  locationEnabled: false,
  locationIsOrigin: false,
  routePreview: null,
  routePreviewSignature: "",
  routePreviewStatus: "idle",
  currentCoordinates: null,
  locationAccuracy: null,
  routingMode: "demo",
  routingBusy: false,
  routingMessage: "",
  liveCandidates: null,
  liveSession: null,
  liveMetrics: null,
  locationWatchId: null,
  lastRoutedCoordinates: null,
  lastLiveRefreshAt: 0,
  maxAdded: 10,
  tripMode: "balanced",
  stopType: "either",
  foodPreference: "anything",
  chainPolicy: "avoid",
  pricePreference: "any",
  familyFriendly: false,
  excludedCategories: new Set(),
  deferUntilSeq: 0,
  minimumScore: 0,
  lastSkipAdjustment: "",
  currentTime: 480,
  routePosition: 0,
  lookahead: 5,
  candidatePool: "All",
  hoursMode: "requireOpen",
  skippedIds: new Set(),
  currentPick: null,
  currentResult: null,
  detailsOpen: false,
  notificationsEnabled: false
};

function getCandidates() {
  if (state.routingMode === "live" && Array.isArray(state.liveCandidates)) {
    return state.liveCandidates;
  }
  if (Array.isArray(window.DETOUR_EATS_CANDIDATES)) return window.DETOUR_EATS_CANDIDATES;
  if (Array.isArray(window.candidates)) return window.candidates;
  if (Array.isArray(window.restaurants)) return window.restaurants;
  return [];
}

function getEngineResult() {
  const candidates = getCandidates();

  const engineSettings = {
    routePosition: state.routingMode === "live" ? 0 : state.routePosition,
    currentTime: state.currentTime,
    maxAdded: state.maxAdded,
    maxAddedMinutes: state.maxAdded,
    lookahead: state.routingMode === "live" ? 99 : state.lookahead,
    candidatePool: state.candidatePool,
    hoursMode: state.hoursMode,
    tripMode: state.tripMode,
    stopType: state.stopType,
    foodPreference: state.foodPreference,
    chainPolicy: state.chainPolicy,
    pricePreference: state.pricePreference,
    familyFriendly: state.familyFriendly,
    excludedCategories: Array.from(state.excludedCategories),
    deferUntilSeq: state.deferUntilSeq,
    minimumScore: state.minimumScore,
    skippedIds: Array.from(state.skippedIds),
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
  const open =
    rawPick.hoursConfidence === "unknown" ||
    rawPick.hoursConfidence === "listed_not_evaluated"
      ? null
      : (rawPick.openAtArrival ?? rawPick.isOpen ?? rawPick.hours?.open ?? true);
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

  if (result?.decision) {
    const d = result.decision;
    const labels = {
      "stop-now": "Stop Now",
      "eat-soon": "Eat Soon",
      "keep-driving": "Keep Driving",
      "good-stop": "Found Something"
    };

    return {
      key: d.state,
      label: labels[d.state] || "Found Something",
      headline: d.headline,
      subline: d.detail,
      badgeClass: d.state === "stop-now" ? "strong" : d.state === "keep-driving" ? "wait" : "practical"
    };
  }

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

  const trip = getTripState(pick, result);
  const copy = getRecommendationCopy(pick, trip);

  els.tripTitle.textContent =
    state.origin && state.destination
      ? `${state.origin} → ${state.destination}`
      : state.destination || "Your trip";
  els.tripSubtitle.textContent =
    state.routingMode === "live"
      ? `${trip.label} · live route`
      : trip.label;

  renderDriverStatus(pick, result, trip);
  renderDecisionCard(pick, trip, copy);
  renderDecisionConsequences(pick, result, trip);
  renderTripTimeline(pick, result);
  renderDetailsPanel(pick, trip, copy);
  renderUpcoming(upcoming.length ? upcoming : getFallbackUpcoming(pick));

  if (els.routePositionLabel) {
    els.routePositionLabel.textContent = describeRoutePosition();
  }

  updatePriorityChips();
  els.takeMeThereButton.disabled = !pick;
  els.skipButton.disabled = !pick;
  els.whyButton.disabled = !pick;
  els.fasterButton.disabled = !pick;
  els.recheckRouteButton.disabled = state.routingBusy || state.routingMode !== "live";
  els.recheckRouteButton.classList.toggle("hidden", state.routingMode !== "live");
  els.recheckRouteButton.textContent = state.routingBusy ? "Rechecking…" : "Recheck Route";
  els.takeMeThereButton.textContent = pick ? "Take Me There" : "Keep Watching";
  els.whyButton.textContent = state.detailsOpen ? "Hide Details" : "Tell Me Why";
  els.whyButton.setAttribute("aria-expanded", String(state.detailsOpen));
  els.detailsPanel.classList.toggle("hidden", !state.detailsOpen);
}

function renderDriverStatus(pick, result, trip) {
  if (state.routingMode === "live" && state.liveMetrics) {
    const metrics = state.liveMetrics;
    const progress = Number(metrics.progressPercent || 0);

    els.routeProgressBar.style.width = `${progress}%`;
    els.routeProgressText.textContent = `${progress}% of live trip`;
    els.routeRemainingText.textContent =
      `${formatDuration(metrics.remainingMinutes)} · ${Number(metrics.remainingMiles || 0).toFixed(0)} mi remaining`;
    els.liveRouteBadge.textContent = state.routingBusy ? "Updating" : "Live";
    els.liveRouteBadge.className =
      `live-route-badge ${state.routingBusy ? "updating" : "live"}`;

    const evaluated = (result?.evaluated || result?.upcoming || [])
      .map(normalizePick)
      .filter(Boolean)
      .sort((a, b) => Number(a.minutesAhead ?? 999) - Number(b.minutesAhead ?? 999));

    const nextStrong = evaluated.find(candidate =>
      candidate.open !== false && candidate.score >= 86
    );

    els.nextFoodZoneText.textContent = nextStrong
      ? `${nextStrong.city || nextStrong.name} · ${formatDuration(nextStrong.minutesAhead)} ahead`
      : "No strong stop on the current live route";

    els.decisionCountdownText.textContent = pick
      ? getDecisionTiming(pick).label
      : trip.key === "keep-driving"
        ? "No decision needed"
        : "Watching ahead";

    const discoverySummary =
      Number(metrics.discoveredCount || 0) > 0
        ? `${metrics.discoveredCount} route-discovered · ${metrics.curatedCount || 0} curated`
        : metrics.discoveryStatus === "unavailable"
          ? "Restaurant discovery unavailable; curated stops only"
          : `${metrics.curatedCount || 0} curated stops`;

    els.routingProgressMessage.textContent =
      state.routingMessage ||
      `${discoverySummary} · updated ${formatRelativeUpdate(metrics.updatedAt)}`;
    els.routingProgressMessage.classList.remove("hidden");
    els.demoToggleButton.classList.add("hidden");
    els.debugPanel.classList.add("hidden");
    return;
  }

  const candidates = getCandidates();
  const maxSeq = Math.max(1, ...candidates.map(candidate => Number(candidate.seq ?? 0)));
  const routePosition = Math.max(0, Math.min(maxSeq, Number(state.routePosition)));
  const progress = Math.round((routePosition / maxSeq) * 100);
  const remainingMinutes = Math.max(0, Math.round((maxSeq - routePosition) * 52));

  const evaluated = (result?.evaluated || result?.upcoming || [])
    .map(normalizePick)
    .filter(Boolean)
    .sort((a, b) => Number(a.seq ?? 0) - Number(b.seq ?? 0));

  const nextStrong = evaluated.find(candidate =>
    candidate.open !== false &&
    candidate.score >= 86 &&
    Number(candidate.seq ?? 0) >= routePosition
  );

  els.routeProgressBar.style.width = `${progress}%`;
  els.routeProgressText.textContent = `${progress}% of demo corridor`;
  els.routeRemainingText.textContent = remainingMinutes
    ? `About ${formatDuration(remainingMinutes)} remaining`
    : "Destination area";
  els.liveRouteBadge.textContent = "Demo";
  els.liveRouteBadge.className = "live-route-badge demo";
  els.routingProgressMessage.classList.add("hidden");

  if (nextStrong) {
    const minutesAhead = estimateMinutesAhead(nextStrong);
    els.nextFoodZoneText.textContent =
      `${nextStrong.city || nextStrong.name} · about ${formatDuration(minutesAhead)} ahead`;
  } else {
    els.nextFoodZoneText.textContent = "No strong zone in the current lookahead";
  }

  els.decisionCountdownText.textContent = pick
    ? getDecisionTiming(pick).label
    : trip.key === "keep-driving"
      ? "No decision needed"
      : "Watching ahead";

  els.demoToggleButton.classList.remove("hidden");
}

function estimateMinutesAhead(pick) {
  if (pick?.liveRoute && Number.isFinite(Number(pick.minutesAhead))) {
    return Math.max(0, Number(pick.minutesAhead));
  }

  const distance = Math.max(
    0,
    Number(pick.seq ?? state.routePosition) - Number(state.routePosition)
  );
  return distance === 0 ? 3 : Math.max(6, Math.round(distance * 18));
}

function getDecisionTiming(pick) {
  if (pick?.liveRoute && Number.isFinite(Number(pick.decisionMinutes))) {
    const minutes = Math.max(0, Number(pick.decisionMinutes));
    return {
      label: minutes <= 1 ? "Decide now" : `Decision in about ${minutes} min`,
      detail: pick.decisionInstruction || "Be ready to leave the main route."
    };
  }

  const minutes = estimateMinutesAhead(pick);

  if (minutes <= 5) {
    return {
      label: "Decide now",
      detail: "This is the current decision window."
    };
  }

  if (minutes <= 12) {
    return {
      label: `Decision in about ${minutes} min`,
      detail: "Be ready to choose directions soon."
    };
  }

  return {
    label: `Decision in about ${minutes} min`,
    detail: "No action yet. DetourEats is tracking the approach."
  };
}

function getConfidenceStatus(pick) {
  const confidence = String(pick.confidence || "Medium").toLowerCase();
  const risk = String(pick.operationalRisk || "").toLowerCase();

  if (pick.provenance === "route-discovered") {
    return pick.open === null
      ? { label: "Hours unverified", className: "confidence-risk" }
      : { label: "Discovery data", className: "confidence-medium" };
  }

  if (pick.open === false) {
    return { label: "Verify hours", className: "confidence-risk" };
  }

  if (risk.includes("sell out") || risk.includes("limited") || risk.includes("verify")) {
    return { label: "Timing risk", className: "confidence-risk" };
  }

  if (confidence === "high") {
    return { label: "High confidence", className: "confidence-high" };
  }

  return { label: "Medium confidence", className: "confidence-medium" };
}

function formatDuration(totalMinutes) {
  const minutes = Math.max(0, Number(totalMinutes) || 0);
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;

  if (!hours) return `${remainder} min`;
  if (!remainder) return `${hours} hr`;
  return `${hours} hr ${remainder} min`;
}

function toggleWhyDetails() {
  if (!state.currentPick) return;
  state.detailsOpen = !state.detailsOpen;
  els.detailsPanel.classList.toggle("hidden", !state.detailsOpen);
  els.whyButton.textContent = state.detailsOpen ? "Hide Details" : "Tell Me Why";
  els.whyButton.setAttribute("aria-expanded", String(state.detailsOpen));

  if (state.detailsOpen) {
    setTimeout(() => {
      els.detailsPanel.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  }
}

function eatSooner() {
  state.tripMode = "hungry";
  state.stopType = "either";
  state.minimumScore = 0;
  state.deferUntilSeq = Number(state.routePosition);
  state.lastSkipAdjustment = "Eating priority changed to Eat soon.";

  if (els.tripModeInput) {
    els.tripModeInput.value = "hungry";
  }

  updatePriorityChips();
  render();
  showToast("Eat soon selected", "Now showing the earliest open stop that clears the quality bar.");
}

function setEatingPriority(priority) {
  const allowed = new Set(["balanced", "hungry", "adventure"]);
  if (!allowed.has(priority)) return;

  state.tripMode = priority;
  state.minimumScore = 0;

  if (priority === "hungry") {
    state.deferUntilSeq = Number(state.routePosition);
    state.lastSkipAdjustment = "Eating priority changed to Eat soon.";
  } else if (priority === "adventure") {
    state.lastSkipAdjustment = "Eating priority changed to Worth waiting for.";
  } else {
    state.lastSkipAdjustment = "Eating priority changed to Best overall.";
  }

  if (els.tripModeInput) {
    els.tripModeInput.value = priority;
  }

  updatePriorityChips();
  render();
  showToast("Eating priority updated", state.lastSkipAdjustment);
}

function updatePriorityChips() {
  (els.priorityChips || []).forEach(button => {
    const active = button.dataset.priority === state.tripMode;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
}

function getScoreMeaning(score) {
  const value = Number(score || 0);
  if (value >= 97) return "Rare, route-defining stop";
  if (value >= 92) return "Worth changing the plan";
  if (value >= 84) return "Strong decision for this stretch";
  return "Best practical option available";
}

function getScoreComparison(pick, result) {
  const next = normalizePick(result?.nextAlternative);
  if (!next) {
    return {
      text: "No qualifying alternative in the current route window",
      className: "comparison-current"
    };
  }

  const difference = Number(pick.score) - Number(next.score);

  if (difference >= 6) {
    return {
      text: `${difference} points stronger than the next qualifying stop`,
      className: "comparison-current"
    };
  }

  if (difference <= -6) {
    return {
      text: `${Math.abs(difference)} points below a stronger option later`,
      className: "comparison-later"
    };
  }

  return {
    text: `Similar score to the next qualifying stop`,
    className: "comparison-even"
  };
}

function getProvenanceStatus(pick) {
  if (pick?.provenance === "route-discovered") {
    return {
      label: "Route-discovered",
      className: "provenance-discovered",
      detail: "Found automatically along this live route"
    };
  }

  return {
    label: "Curated",
    className: "provenance-curated",
    detail: "Reviewed for the DetourEats test database"
  };
}

function getHoursStatus(pick) {
  if (pick.open === true) return "Open at arrival";
  if (pick.open === false) return "Closed at arrival";
  if (pick.publishedHours && pick.publishedHours !== "Not listed in OpenStreetMap") {
    return "Hours listed, arrival not verified";
  }
  return "Hours not verified";
}

function renderTrustSnapshot(pick) {
  const routeMode = pick.liveRoute ? "Live route" : "Curated route";
  const provenance = getProvenanceStatus(pick);
  const confidence = pick.confidence || "Medium";
  const hours = getHoursStatus(pick);
  const freshness = pick.verifiedDate || "Prototype dataset";
  const risk = pick.operationalRisk
    ? `<div class="trust-alert">${escapeHtml(pick.operationalRisk)}</div>`
    : "";

  return `
    <div class="trust-snapshot">
      <div class="trust-snapshot-heading">
        <span>Trust snapshot</span>
        <strong>${escapeHtml(routeMode)}</strong>
      </div>
      <div class="provenance-banner ${provenance.className}">
        <strong>${escapeHtml(provenance.label)}</strong>
        <span>${escapeHtml(provenance.detail)}</span>
      </div>
      <div class="trust-snapshot-grid">
        <div><span>Restaurant data</span><strong>${escapeHtml(confidence)} confidence</strong></div>
        <div><span>Hours</span><strong>${escapeHtml(hours)}</strong></div>
        <div><span>Data status</span><strong>${escapeHtml(freshness)}</strong></div>
      </div>
      ${risk}
    </div>
  `;
}

function renderDecisionCard(pick, trip, copy) {
  if (!pick) {
    els.decisionCard.innerHTML = `
      <div class="decision-card-top">
        <div class="badge ${trip.badgeClass}">${trip.label}</div>
        <div class="confidence-chip confidence-medium">Watching ahead</div>
      </div>
      <div class="empty driver-empty">
        <div class="score-hero score-hero-empty">
          <span>Detour Score</span>
          <strong>—</strong>
          <small>Waiting for a qualifying stop</small>
        </div>
        <h2>${escapeHtml(trip.headline)}</h2>
        <p>${escapeHtml(trip.subline)}</p>
        <div class="driver-callout">
          <strong>No action needed.</strong>
          <span>DetourEats will surface the next worthwhile decision.</span>
        </div>
      </div>
    `;
    return;
  }

  const tier = getRecommendationTier(pick);
  const openLabel = getHoursStatus(pick);
  const confidence = getConfidenceStatus(pick);
  const provenance = getProvenanceStatus(pick);
  const timing = getDecisionTiming(pick);
  const comparison = getScoreComparison(pick, state.currentResult);
  const explanation = pick.scoreExplanation || {};
  const scoreClass =
    pick.score >= 92 ? "score-elite" :
    pick.score >= 84 ? "score-strong" :
    "score-practical";

  els.decisionCard.innerHTML = `
    <div class="decision-card-top">
      <div class="badge ${trip.badgeClass}">${escapeHtml(tier)}</div>
      <div class="card-status-chips">
        <div class="provenance-chip ${provenance.className}">${escapeHtml(provenance.label)}</div>
        <div class="confidence-chip ${confidence.className}">${escapeHtml(confidence.label)}</div>
      </div>
    </div>

    <div class="score-and-decision">
      <div class="score-hero ${scoreClass}" aria-label="Detour Score ${pick.score}">
        <span>Detour Score</span>
        <strong>${pick.score}</strong>
        <small>${escapeHtml(getScoreMeaning(pick.score))}</small>
      </div>

      <div class="decision-copy">
        <p class="driver-decision-label">${escapeHtml(trip.headline)}</p>
        <h2 class="place-name">${escapeHtml(pick.name)}</h2>
        <p class="meta">${escapeHtml(trip.subline)}</p>
        <div class="score-comparison ${comparison.className}">
          ${escapeHtml(comparison.text)}
        </div>
      </div>
    </div>

    <div class="score-driver-row">
      <div>
        <span>Food</span>
        <strong>${escapeHtml(String(explanation.restaurantQuality ?? "—"))}</strong>
      </div>
      <div>
        <span>Trip fit</span>
        <strong>${escapeHtml(String(explanation.tripFit ?? "—"))}</strong>
      </div>
      <div>
        <span>Time fit</span>
        <strong>${escapeHtml(String(explanation.timeFit ?? "—"))}</strong>
      </div>
    </div>

    <div class="decision-timing-callout">
      <span>Decision window</span>
      <strong>${escapeHtml(timing.label)}</strong>
      <small>${escapeHtml(timing.detail)}</small>
    </div>

    <div class="fact-grid driver-fact-grid">
      <div class="fact highlight">
        <strong>Adds ${pick.added} min</strong>
        <span>${pick.liveRoute ? "Live route impact" : "Estimated trip impact"}</span>
      </div>
      <div class="fact">
        <strong>${escapeHtml(openLabel)}</strong>
        <span>${pick.liveRoute ? "Live ETA" : "Estimated arrival"} ${escapeHtml(String(pick.arrival))}</span>
      </div>
      <div class="fact">
        <strong>${escapeHtml(pick.city || "Along your route")}</strong>
        <span>${escapeHtml(pick.signature)}</span>
      </div>
    </div>

    ${renderTrustSnapshot(pick)}
  `;
}

function renderDecisionConsequences(pick, result, trip) {
  const panel = els.decisionConsequencePanel;
  if (!panel) return;

  if (!pick) {
    panel.innerHTML = `
      <div class="consequence-heading">
        <span>Decision impact</span>
        <strong>No decision needed yet</strong>
      </div>
      <p>DetourEats is still watching for the next stop that clears your quality bar.</p>
    `;
    return;
  }

  const outlook = result?.routeOutlook || {};
  const next = normalizePick(result?.nextAlternative);
  const waitText = outlook.waitMinutes
    ? formatDuration(outlook.waitMinutes)
    : "outside the current route window";

  const nextScoreText = next
    ? `Detour Score ${next.score}`
    : "No qualifying alternative";

  const scoreDifference = Number(outlook.scoreDifference);
  let comparisonText = "Similar food decision";
  if (Number.isFinite(scoreDifference) && scoreDifference >= 6) {
    comparisonText = `${Math.abs(scoreDifference)} points stronger`;
  } else if (Number.isFinite(scoreDifference) && scoreDifference <= -6) {
    comparisonText = `${Math.abs(scoreDifference)} points weaker`;
  }

  panel.innerHTML = `
    <div class="consequence-heading">
      <span>Decision impact</span>
      <strong>${escapeHtml(outlook.label || "Current route decision")}</strong>
    </div>

    <div class="consequence-grid">
      <div class="consequence-option stop-option">
        <span>Stop here</span>
        <strong>${escapeHtml(pick.name)}</strong>
        <p>${escapeHtml(outlook.stopMessage || `Adds ${pick.added} minutes to the trip.`)}</p>
      </div>

      <div class="consequence-option skip-option">
        <span>Skip and wait</span>
        <strong>${escapeHtml(next?.name || "No next stop")}</strong>
        <p>${escapeHtml(outlook.skipMessage || "No qualifying alternative is currently available.")}</p>
        <small>${escapeHtml(next ? `${waitText} · ${nextScoreText} · ${comparisonText}` : nextScoreText)}</small>
      </div>
    </div>
  `;
}

function renderTripTimeline(pick, result) {
  if (!els.tripTimeline || !els.foodZoneSummary) return;

  const candidates = (result?.evaluated || result?.upcoming || [])
    .map(normalizePick)
    .filter(candidate => candidate && candidate.open !== false)
    .sort((a, b) => {
      if (state.routingMode === "live") {
        return Number(a.minutesAhead ?? 999) - Number(b.minutesAhead ?? 999);
      }
      return Number(a.seq ?? 999) - Number(b.seq ?? 999);
    })
    .slice(0, 6);

  if (state.routingMode === "live") {
    const discovered = Number(state.liveMetrics?.discoveredCount || 0);
    const curated = Number(state.liveMetrics?.curatedCount || 0);
    els.timelineModeLabel.textContent =
      discovered > 0
        ? `${discovered} discovered · ${curated} curated`
        : "Live location";
  } else {
    els.timelineModeLabel.textContent = "Curated route";
  }

  if (!candidates.length) {
    els.foodZoneSummary.innerHTML =
      `<strong>Weak stretch ahead</strong><span>No qualifying stop in the current window.</span>`;
    els.tripTimeline.innerHTML =
      `<p class="timeline-empty">DetourEats is watching beyond the current route window.</p>`;
    return;
  }

  const zones = analyzeTimelineZones(candidates);
  els.foodZoneSummary.innerHTML = `
    <strong>${escapeHtml(zones.headline)}</strong>
    <span>${escapeHtml(zones.detail)}</span>
  `;

  els.tripTimeline.innerHTML = candidates.map((candidate, index) => {
    const role = getTimelineRole(candidate, pick, index);
    const timing = state.routingMode === "live"
      ? `${formatDuration(candidate.minutesAhead)} ahead`
      : `${formatDuration(estimateMinutesAhead(candidate))} ahead`;
    const gap = index === 0
      ? ""
      : getTimelineGap(candidates[index - 1], candidate);
    const zoneClass = candidate.score >= 92
      ? "strong-zone"
      : candidate.score >= 84
        ? "good-zone"
        : "backup-zone";

    return `
      <article class="timeline-stop ${zoneClass} ${pick?.id === candidate.id ? "current" : ""}">
        <div class="timeline-line">
          <span class="timeline-dot"></span>
        </div>
        <div class="timeline-stop-body">
          <div class="timeline-stop-top">
            <span>${escapeHtml(role)}</span>
            <div class="timeline-score"><small>Score</small><strong>${candidate.score}</strong></div>
          </div>
          <h3>${escapeHtml(candidate.name)}</h3>
          <p>${escapeHtml(candidate.city || candidate.category || "")}</p>
          <div class="timeline-provenance ${candidate.provenance === "route-discovered" ? "provenance-discovered" : "provenance-curated"}">
            ${candidate.provenance === "route-discovered" ? "Route-discovered option" : "Curated recommendation"}
          </div>
          <div class="timeline-meta">
            <span>${escapeHtml(timing)}</span>
            <span>Adds ${candidate.added} min</span>
          </div>
          ${gap ? `<small>${escapeHtml(gap)}</small>` : ""}
        </div>
      </article>
    `;
  }).join("");
}

function analyzeTimelineZones(candidates) {
  const strong = candidates.filter(candidate => candidate.score >= 88);
  const first = candidates[0];
  const second = candidates[1];

  if (!strong.length) {
    return {
      headline: "Limited options ahead",
      detail: "Usable stops exist, but none currently clears the strong-stop threshold."
    };
  }

  if (strong.length >= 3) {
    return {
      headline: "Strong food zone ahead",
      detail: "Several qualifying choices are coming, so there is room to wait."
    };
  }

  if (!second) {
    return {
      headline: "Last good stop",
      detail: "Only one qualifying option remains in the current route window."
    };
  }

  const gapMinutes = getCandidateMinutes(second) - getCandidateMinutes(first);
  if (gapMinutes >= 75) {
    return {
      headline: "Long weak stretch after this",
      detail: `The next qualifying option is roughly ${formatDuration(gapMinutes)} later.`
    };
  }

  if (second.score >= first.score + 6) {
    return {
      headline: "Route improves ahead",
      detail: "A meaningfully stronger option is coming if you are comfortable waiting."
    };
  }

  if (first.score >= second.score + 6) {
    return {
      headline: "Best food is earlier",
      detail: "The current option is stronger than what follows."
    };
  }

  return {
    headline: "Options remain healthy",
    detail: "Another similarly rated stop follows without a major gap."
  };
}

function getTimelineRole(candidate, pick, index) {
  if (pick?.id === candidate.id) return "Best decision now";
  if (index === 1) return "Best if you wait";
  if (index === 2) return "Reasonable backup";
  return "Later option";
}

function getTimelineGap(previous, current) {
  const gap = Math.max(0, getCandidateMinutes(current) - getCandidateMinutes(previous));
  if (gap < 25) return "Close behind the prior option";
  if (gap < 60) return `About ${gap} minutes after the prior option`;
  return `Food gap: about ${formatDuration(gap)}`;
}

function getCandidateMinutes(candidate) {
  return state.routingMode === "live"
    ? Number(candidate.minutesAhead || 0)
    : estimateMinutesAhead(candidate);
}

function formatRelativeUpdate(timestamp) {
  const seconds = Math.max(0, Math.round((Date.now() - Number(timestamp || 0)) / 1000));
  if (seconds < 15) return "just now";
  if (seconds < 60) return `${seconds} seconds ago`;
  return `${Math.round(seconds / 60)} minutes ago`;
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
      <div><strong>${explanation.urgencyFit ?? "—"}</strong><span>Urgency</span></div>
      <div><strong>${explanation.preferenceFit ?? "—"}</strong><span>Preference</span></div>
    </div>
  ` : "";

  const engineBullets = explanation?.bullets?.length ? explanation.bullets : rationale;
  const risk = pick.operationalRisk
    ? `<div class="risk-note"><strong>Watch:</strong> ${escapeHtml(pick.operationalRisk)}</div>`
    : "";

  const sourceLink = pick.sourceUrl
    ? `<a class="source-link" href="${escapeHtml(pick.sourceUrl)}" target="_blank" rel="noopener noreferrer">View verification source</a>`
    : "";

  els.detailsPanel.innerHTML = `
    <h2>Why this stop</h2>
    <p class="lead-copy">${escapeHtml(copy.lead)}</p>
    ${scoreBreakdown}
    <ul class="details-list">
      ${engineBullets.map(item => `<li>${escapeHtml(item)}</li>`).join("")}
    </ul>

    <div class="trust-section">
      <h3>${pick.provenance === "route-discovered" ? "Available route data" : "Verified facts"}</h3>
      <div class="trust-row"><span>Restaurant</span><strong>${escapeHtml(pick.name)}</strong></div>
      <div class="trust-row"><span>Location</span><strong>${escapeHtml(pick.address || pick.city || "")}</strong></div>
      <div class="trust-row"><span>Published hours</span><strong>${escapeHtml(pick.publishedHours || "Not available")}</strong></div>
      <div class="trust-row"><span>Recommendation type</span><strong>${escapeHtml(getProvenanceStatus(pick).label)}</strong></div>
      <div class="trust-row"><span>Source</span><strong>${escapeHtml(pick.sourceType || "Curated source")}</strong></div>
      <div class="trust-row"><span>Data confidence</span><strong>${escapeHtml(pick.confidence || "Medium")}</strong></div>
      <div class="trust-row"><span>Last checked</span><strong>${escapeHtml(pick.verifiedDate || "Prototype dataset")}</strong></div>
      ${pick.liveRoute ? `<div class="trust-row"><span>Route mode</span><strong>Live location beta</strong></div>` : ""}
      ${pick.liveRoute ? `<div class="trust-row"><span>Distance ahead</span><strong>${escapeHtml(String(pick.distanceAheadMiles ?? "—"))} miles</strong></div>` : ""}
      ${sourceLink}
    </div>

    <div class="context-section">
      <h3>Trip context</h3>
      <div class="context-grid">
        <div><span>Meal urgency</span><strong>${escapeHtml(state.currentResult?.urgency?.level || "No rush")}</strong></div>
        <div><span>Route outlook</span><strong>${escapeHtml(state.currentResult?.routeContext?.level || "Unknown")}</strong></div>
        <div><span>Style applied</span><strong>${escapeHtml(formatPreferenceLabel(state.tripMode))}</strong></div>
        <div><span>Preferences</span><strong>${escapeHtml(getPreferenceSummary())}</strong></div>
        <div><span>Route outlook</span><strong>${escapeHtml(state.currentResult?.routeOutlook?.label || "Watching")}</strong></div>
      </div>
      <p>${escapeHtml(state.currentResult?.routeContext?.message || "")}</p>
      ${state.lastSkipAdjustment ? `<p class="adjustment-note"><strong>Adjusted:</strong> ${escapeHtml(state.lastSkipAdjustment)}</p>` : ""}
    </div>

    <div class="editorial-section">
      <h3>DetourEats judgment</h3>
      <p>${pick.provenance === "route-discovered"
        ? "Route position and detour timing use the live route. Restaurant quality is estimated conservatively from available map metadata, so the Detour Score is capped until stronger editorial evidence is available."
        : pick.liveRoute
          ? "Route order, distance ahead, arrival timing, decision timing, and added trip time use the current beta route calculation. Restaurant hours and Detour Score remain curated."
          : "Route position, arrival time, and added-trip time are curated estimates in demo mode."}</p>
    </div>
    ${risk}
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

function formatPreferenceLabel(value) {
  const labels = {
    balanced: "Best overall",
    adventure: "Worth waiting for",
    strict: "Worth waiting for",
    hungry: "Eat soon",
    either: "Either",
    quick: "Quick stop",
    sitdown: "Sit-down",
    anything: "Anything good",
    local: "Local favorite",
    regional: "Regional specialty",
    avoid: "Avoid chains",
    fallback: "Chains as fallback",
    allow: "Allow chains",
    any: "Any price",
    budget: "Inexpensive"
  };
  return labels[String(value)] || String(value || "");
}

function getPreferenceSummary() {
  const parts = [
    formatPreferenceLabel(state.stopType),
    formatPreferenceLabel(state.foodPreference),
    formatPreferenceLabel(state.chainPolicy)
  ];

  if (state.pricePreference === "budget") parts.push("Inexpensive");
  if (state.familyFriendly) parts.push("Family-friendly");

  return parts.join(" · ");
}

const PREFERENCE_STORAGE_KEY = "detoureats_preferences_v1";
const RECENT_TRIPS_STORAGE_KEY = "detoureats_recent_trips_v1";
const MAX_RECENT_TRIPS = 5;

function getRouteSignature() {
  const originKey = state.locationIsOrigin && state.currentCoordinates
    ? `gps:${state.currentCoordinates.map(value => Number(value).toFixed(4)).join(",")}`
    : `text:${String(els.originInput?.value || "").trim().toLowerCase()}`;
  const destinationKey = String(els.destinationInput?.value || "").trim().toLowerCase();
  return `${originKey}|${destinationKey}|${Number(els.maxAddedInput?.value || 10)}`;
}

function invalidateRoutePreview() {
  state.routePreview = null;
  state.routePreviewSignature = "";
  state.routePreviewStatus = "idle";
  renderRoutePreview();
}

function getRecentTrips() {
  try {
    const trips = JSON.parse(localStorage.getItem(RECENT_TRIPS_STORAGE_KEY) || "[]");
    return Array.isArray(trips) ? trips.slice(0, MAX_RECENT_TRIPS) : [];
  } catch {
    return [];
  }
}

function saveRecentTrip(origin, destination) {
  if (!origin || !destination) return;

  const current = getRecentTrips();
  const normalized = `${origin.toLowerCase()}|${destination.toLowerCase()}`;
  const next = [
    { origin, destination, savedAt: Date.now() },
    ...current.filter(
      trip => `${String(trip.origin).toLowerCase()}|${String(trip.destination).toLowerCase()}` !== normalized
    )
  ].slice(0, MAX_RECENT_TRIPS);

  try {
    localStorage.setItem(RECENT_TRIPS_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Recent trips are optional.
  }

  renderRecentTrips();
}

function renderRecentTrips() {
  if (!els.recentTripsList || !els.recentTripsSection) return;

  const trips = getRecentTrips();
  els.recentTripsSection.classList.toggle("hidden", trips.length === 0);

  els.recentTripsList.innerHTML = trips.map((trip, index) => `
    <button type="button" class="recent-trip-button" data-recent-trip="${index}">
      <strong>${escapeHtml(trip.origin)}</strong>
      <span>→ ${escapeHtml(trip.destination)}</span>
    </button>
  `).join("");

  els.recentTripsList.querySelectorAll("[data-recent-trip]").forEach(button => {
    button.addEventListener("click", () => {
      const trip = trips[Number(button.dataset.recentTrip)];
      if (!trip) return;
      state.locationEnabled = false;
      state.locationIsOrigin = false;
      state.currentCoordinates = null;
      els.originInput.value = trip.origin;
      els.destinationInput.value = trip.destination;
      els.useLocationButton.textContent = "Use My Location";
      updateLocationSetup("Typed route selected", "Preview the route before starting.", "demo");
      invalidateRoutePreview();
    });
  });
}

function clearRecentTrips() {
  try {
    localStorage.removeItem(RECENT_TRIPS_STORAGE_KEY);
  } catch {
    // Ignore storage failures.
  }
  renderRecentTrips();
}

function renderRoutePreview(message = "") {
  if (!els.routePreviewCard) return;

  if (state.routePreviewStatus === "loading") {
    els.routePreviewCard.innerHTML = `
      <div class="route-preview-loading">
        <span class="route-preview-spinner" aria-hidden="true"></span>
        <div>
          <span>Checking route</span>
          <strong>${escapeHtml(message || state.routingMessage || "Calculating drive time and food options")}</strong>
          <small>This may take several seconds on a long route.</small>
        </div>
      </div>
    `;
    return;
  }

  if (state.routePreviewStatus === "error") {
    els.routePreviewCard.innerHTML = `
      <div class="route-preview-error">
        <span>Route not ready</span>
        <strong>${escapeHtml(message || "We could not verify that route.")}</strong>
        <small>Check both locations and try again.</small>
      </div>
    `;
    return;
  }

  const preview = state.routePreview;
  if (!preview) {
    els.routePreviewCard.innerHTML = `
      <div class="route-preview-empty">
        <span>Route preview</span>
        <strong>Enter a starting point and destination</strong>
        <small>We will verify the route and search for food before the trip starts.</small>
      </div>
    `;
    return;
  }

  const metrics = preview.snapshot?.metrics || {};
  const discovered = Number(metrics.discoveredCount || 0);
  const curated = Number(metrics.curatedCount || 0);
  const total = Number(metrics.totalCandidates || discovered + curated);

  els.routePreviewCard.innerHTML = `
    <div class="route-preview-ready">
      <div class="route-preview-heading">
        <span>Route ready</span>
        <strong>${escapeHtml(state.origin)} → ${escapeHtml(state.destination)}</strong>
      </div>
      <div class="route-preview-grid">
        <div><span>Drive time</span><strong>${escapeHtml(formatDuration(metrics.totalMinutes || metrics.remainingMinutes || 0))}</strong></div>
        <div><span>Distance</span><strong>${escapeHtml(String(Math.round(Number(metrics.totalMiles || metrics.remainingMiles || 0))))} mi</strong></div>
        <div><span>Food options</span><strong>${total}</strong></div>
      </div>
      <p>${discovered} route-discovered · ${curated} curated</p>
    </div>
  `;
}

function setRouteSetupBusy(isBusy, message = "") {
  state.routingBusy = Boolean(isBusy);
  state.routePreviewStatus = isBusy ? "loading" : state.routePreviewStatus;
  els.previewRouteButton.disabled = isBusy;
  els.startTripButton.disabled = isBusy;
  els.swapRouteButton.disabled = isBusy;
  els.useLocationButton.disabled = isBusy;
  els.previewRouteButton.textContent = isBusy ? "Checking…" : "Preview Route";
  els.startTripButton.textContent = isBusy ? "Preparing Trip…" : "Trust Us";
  renderRoutePreview(message);
}

function validateRouteInputs() {
  const originText = String(els.originInput?.value || "").trim();
  const destinationText = String(els.destinationInput?.value || "").trim();

  if (!state.locationIsOrigin && !originText) {
    throw new Error("Enter a starting point or select Use My Location.");
  }
  if (!destinationText) {
    throw new Error("Enter a destination.");
  }
  if (
    !state.locationIsOrigin &&
    originText.toLowerCase() === destinationText.toLowerCase()
  ) {
    throw new Error("Starting point and destination must be different.");
  }

  return { originText, destinationText };
}

async function previewSelectedRoute({ quiet = false } = {}) {
  const service = window.DetourEatsLiveRoute;
  if (!service?.buildLiveTrip) {
    throw new Error("The live route service is unavailable.");
  }

  const { originText, destinationText } = validateRouteInputs();
  const signature = getRouteSignature();

  if (state.routePreview && state.routePreviewSignature === signature) {
    return state.routePreview;
  }

  state.origin = state.locationIsOrigin ? "Current location" : originText;
  state.destination = destinationText;
  state.routePreviewStatus = "loading";
  setRouteSetupBusy(true, "Locating your route");

  try {
    const result = await service.buildLiveTrip({
      originCoordinates:
        state.locationIsOrigin && Array.isArray(state.currentCoordinates)
          ? state.currentCoordinates
          : null,
      originText: state.locationIsOrigin ? "" : originText,
      destinationText,
      candidates: window.DETOUR_EATS_CANDIDATES || [],
      maxAddedMinutes: Number(els.maxAddedInput.value),
      progressCallback: message => {
        state.routingMessage = message;
        renderRoutePreview(message);
      }
    });

    state.routePreview = result;
    state.routePreviewSignature = signature;
    state.routePreviewStatus = "ready";
    state.routingMessage = "";
    renderRoutePreview();

    if (!quiet) {
      const count = Number(result.snapshot?.metrics?.totalCandidates || 0);
      showToast("Route ready", `${count} qualifying food options were found.`);
    }

    return result;
  } catch (error) {
    state.routePreview = null;
    state.routePreviewSignature = "";
    state.routePreviewStatus = "error";
    state.routingMessage = "";
    renderRoutePreview(error?.message || "The route could not be verified.");
    if (!quiet) {
      showToast("Route not ready", error?.message || "Check the trip details and try again.");
    }
    throw error;
  } finally {
    setRouteSetupBusy(false);
  }
}

function swapRoute() {
  if (state.locationIsOrigin) {
    showToast(
      "Type a starting point first",
      "Current location cannot be used as the destination when swapping."
    );
    return;
  }

  const origin = els.originInput.value;
  els.originInput.value = els.destinationInput.value;
  els.destinationInput.value = origin;
  invalidateRoutePreview();
}

function applyExampleRoute(origin, destination) {
  state.locationEnabled = false;
  state.locationIsOrigin = false;
  state.currentCoordinates = null;
  els.originInput.value = origin;
  els.destinationInput.value = destination;
  els.useLocationButton.textContent = "Use My Location";
  updateLocationSetup("Example route selected", "Preview the route or start the trip.", "demo");
  invalidateRoutePreview();
}

function savePreferences() {
  const preferences = {
    maxAdded: Number(els.maxAddedInput?.value || state.maxAdded || 10),
    tripMode: els.tripModeInput?.value || state.tripMode || "balanced",
    stopType: els.stopTypeInput?.value || state.stopType || "either",
    foodPreference: els.foodPreferenceInput?.value || state.foodPreference || "anything",
    chainPolicy: els.chainPolicyInput?.value || state.chainPolicy || "avoid",
    pricePreference: els.pricePreferenceInput?.value || state.pricePreference || "any",
    familyFriendly: Boolean(els.familyFriendlyInput?.checked)
  };

  try {
    localStorage.setItem(PREFERENCE_STORAGE_KEY, JSON.stringify(preferences));
  } catch {
    // The app still works if browser storage is unavailable.
  }
}

function loadPreferences() {
  let saved = null;

  try {
    saved = JSON.parse(localStorage.getItem(PREFERENCE_STORAGE_KEY) || "null");
  } catch {
    saved = null;
  }

  if (!saved) return;

  if (els.maxAddedInput && Number.isFinite(Number(saved.maxAdded))) {
    els.maxAddedInput.value = String(saved.maxAdded);
  }
  if (els.tripModeInput && saved.tripMode) {
    els.tripModeInput.value = saved.tripMode;
  }
  if (els.stopTypeInput && saved.stopType) {
    els.stopTypeInput.value = saved.stopType;
  }
  if (els.foodPreferenceInput && saved.foodPreference) {
    els.foodPreferenceInput.value = saved.foodPreference;
  }
  if (els.chainPolicyInput && saved.chainPolicy) {
    els.chainPolicyInput.value = saved.chainPolicy;
  }
  if (els.pricePreferenceInput && saved.pricePreference) {
    els.pricePreferenceInput.value = saved.pricePreference;
  }
  if (els.familyFriendlyInput) {
    els.familyFriendlyInput.checked = Boolean(saved.familyFriendly);
  }
}

function showToast(title, message) {
  if (!els.toast) return;
  els.toast.innerHTML = `<strong>${escapeHtml(title)}</strong><span>${escapeHtml(message)}</span>`;
  els.toast.classList.remove("hidden");
  setTimeout(() => els.toast.classList.add("hidden"), 4500);
}

async function startTrip() {
  if (state.routingBusy) return;

  let preview;
  try {
    preview = await previewSelectedRoute({ quiet: true });
  } catch {
    return;
  }

  state.started = true;
  state.maxAdded = Number(els.maxAddedInput.value);
  state.tripMode = els.tripModeInput.value;
  state.stopType = els.stopTypeInput?.value || "either";
  state.foodPreference = els.foodPreferenceInput?.value || "anything";
  state.chainPolicy = els.chainPolicyInput?.value || "avoid";
  state.pricePreference = els.pricePreferenceInput?.value || "any";
  state.familyFriendly = Boolean(els.familyFriendlyInput?.checked);
  state.excludedCategories = new Set();
  state.deferUntilSeq = 0;
  state.minimumScore = 0;
  state.lastSkipAdjustment = "";
  state.detailsOpen = false;
  state.currentTime = getActualCurrentMinutes();
  state.routePosition = 0;
  state.lookahead = 99;
  state.candidatePool = els.candidatePoolInput?.value || "All";
  state.hoursMode = els.hoursModeInput?.value || "requireOpen";
  state.skippedIds = new Set();
  savePreferences();

  state.liveSession = preview.session;
  applyLiveSnapshot(preview.snapshot);

  els.setupScreen.classList.add("hidden");
  els.driveScreen.classList.remove("hidden");

  if (state.locationIsOrigin) {
    startLocationWatch();
  }

  saveRecentTrip(state.origin, state.destination);
  render();

  const count = Number(preview.snapshot?.metrics?.totalCandidates || 0);
  showToast(
    "Trip started",
    count > 0
      ? `${count} route-relevant food options are being evaluated.`
      : "The route is active; DetourEats will keep watching for viable stops."
  );
}

async function activateLiveRoute() {
  const result = await previewSelectedRoute({ quiet: true });
  state.liveSession = result.session;
  applyLiveSnapshot(result.snapshot);
  if (state.locationIsOrigin) startLocationWatch();
  render();
}

function applyLiveSnapshot(snapshot) {
  state.liveCandidates = snapshot?.candidates || [];
  state.liveMetrics = snapshot?.metrics || null;
  state.routingMode = state.liveCandidates.length ? "live" : "demo";
  state.routingMessage = "";
  state.routePosition = 0;
  state.lookahead = 99;
  state.currentTime = getActualCurrentMinutes();
  state.lastRoutedCoordinates = snapshot?.originCoordinates || state.currentCoordinates;
  state.lastLiveRefreshAt = Date.now();
}

function setRoutingBusy(busy, message = "") {
  state.routingBusy = Boolean(busy);
  updateRoutingMessage(message);
}

function updateRoutingMessage(message) {
  state.routingMessage = message || "";
  if (!els.routingProgressMessage) return;

  if (message) {
    els.routingProgressMessage.textContent = message;
    els.routingProgressMessage.classList.remove("hidden");
  } else {
    els.routingProgressMessage.classList.add("hidden");
  }
}

function getActualCurrentMinutes() {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

function goBack() {
  stopLocationWatch();
  state.started = false;
  state.routingMode = "demo";
  state.liveCandidates = null;
  state.liveSession = null;
  state.liveMetrics = null;
  state.detailsOpen = false;
  els.driveScreen.classList.add("hidden");
  els.setupScreen.classList.remove("hidden");
}

function skipPick() {
  if (!state.currentPick) return;
  els.skipReasonPanel?.classList.toggle("hidden");
}

function closeSkipPanel() {
  els.skipReasonPanel?.classList.add("hidden");
}

function applySkipReason(reason) {
  const pick = state.currentPick;
  if (!pick) return;

  state.skippedIds.add(pick.id);

  switch (reason) {
    case "too-far":
      state.maxAdded = Math.max(5, Math.min(state.maxAdded, pick.added - 1, state.maxAdded - 5));
      state.lastSkipAdjustment = `Maximum detour tightened to ${state.maxAdded} minutes.`;
      showToast("Detour tightened", state.lastSkipAdjustment);
      break;

    case "not-hungry":
      state.deferUntilSeq = Math.max(state.deferUntilSeq, Number(pick.seq || state.routePosition) + 2);
      state.lastSkipAdjustment = "Recommendations pushed farther down the route.";
      showToast("We’ll wait", state.lastSkipAdjustment);
      break;

    case "wrong-cuisine": {
      const cuisine = String(pick.category || "").trim();
      if (cuisine) state.excludedCategories.add(cuisine.toLowerCase());
      state.lastSkipAdjustment = cuisine
        ? `${cuisine} excluded for the rest of this trip.`
        : "That cuisine was excluded for this trip.";
      showToast("Cuisine adjusted", state.lastSkipAdjustment);
      break;
    }

    case "too-expensive":
      state.pricePreference = "budget";
      state.lastSkipAdjustment = "Now prioritizing inexpensive stops.";
      showToast("Budget mode applied", state.lastSkipAdjustment);
      break;

    case "need-faster":
      state.stopType = "quick";
      state.maxAdded = Math.min(state.maxAdded, 10);
      state.lastSkipAdjustment = "Now prioritizing quick stops within 10 minutes.";
      showToast("Faster stops only", state.lastSkipAdjustment);
      break;

    case "show-better":
      state.minimumScore = Math.min(99, Math.max(state.minimumScore, Number(pick.score || 0) + 3));
      state.lastSkipAdjustment = `Next stop must score at least ${state.minimumScore}.`;
      showToast("Quality bar raised", state.lastSkipAdjustment);
      break;

    default:
      state.lastSkipAdjustment = "That stop was removed from this trip.";
      showToast("Skipped", "We’ll look for the next best option.");
  }

  state.detailsOpen = false;
  closeSkipPanel();
  render();
}

function takeMeThere() {
  const pick = state.currentPick;
  if (!pick) {
    showToast("Still watching", "No stop is worth interrupting you for yet.");
    return;
  }

  const query = encodeURIComponent(pick.name);
  const coordinateDestination = Array.isArray(pick.coordinates)
    ? `${pick.coordinates[1]},${pick.coordinates[0]}`
    : "";
  const url = coordinateDestination
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(coordinateDestination)}&travelmode=driving`
    : pick.mapsUrl || pick.url || `https://www.google.com/maps/search/?api=1&query=${query}`;
  window.open(url, "_blank", "noopener,noreferrer");
}

async function requestCurrentLocation() {
  if (!navigator.geolocation) {
    updateLocationSetup("Location unavailable", "This browser does not support location.", "error");
    return;
  }

  els.useLocationButton.disabled = true;
  els.useLocationButton.textContent = "Locating…";
  updateLocationSetup("Requesting location", "Allow location access when your browser asks.", "working");

  try {
    const position = await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 18000,
        maximumAge: 30000
      });
    });

    state.currentCoordinates = [
      Number(position.coords.longitude),
      Number(position.coords.latitude)
    ];
    state.locationAccuracy = Number(position.coords.accuracy || 0);
    state.locationEnabled = true;
    state.locationIsOrigin = true;
    els.originInput.value = "Current location";
    invalidateRoutePreview();

    els.useLocationButton.textContent = "Location Ready";
    updateLocationSetup(
      "Current location selected",
      `Starting-point accuracy is approximately ${Math.round(state.locationAccuracy)} meters.`,
      "live"
    );
  } catch (error) {
    state.locationEnabled = false;
    state.locationIsOrigin = false;
    state.currentCoordinates = null;
    if (els.originInput.value === "Current location") {
      els.originInput.value = "";
    }
    invalidateRoutePreview();
    els.useLocationButton.textContent = "Use My Location";

    const message = error?.code === 1
      ? "Location permission was denied. The curated route will still work."
      : error?.code === 3
        ? "Location request timed out. Try again when signal is stronger."
        : "Your location could not be determined.";

    updateLocationSetup("Demo route remains available", message, "error");
  } finally {
    els.useLocationButton.disabled = false;
  }
}

function updateLocationSetup(title, status, mode = "demo") {
  els.locationSetupTitle.textContent = title;
  els.locationSetupStatus.textContent = status;
  els.locationModeBadge.textContent = mode === "live" ? "Location ready" : mode === "working" ? "Working" : "Demo route";
  els.locationModeBadge.className = `location-mode-badge ${mode}`;
}

function startLocationWatch() {
  stopLocationWatch();
  if (!state.locationIsOrigin || !navigator.geolocation) return;

  state.locationWatchId = navigator.geolocation.watchPosition(
    handleLocationUpdate,
    error => console.warn("Location update unavailable", error),
    {
      enableHighAccuracy: true,
      timeout: 20000,
      maximumAge: 20000
    }
  );
}

function stopLocationWatch() {
  if (state.locationWatchId !== null && navigator.geolocation?.clearWatch) {
    navigator.geolocation.clearWatch(state.locationWatchId);
  }
  state.locationWatchId = null;
}

async function handleLocationUpdate(position) {
  const coordinates = [
    Number(position.coords.longitude),
    Number(position.coords.latitude)
  ];

  state.currentCoordinates = coordinates;
  state.locationAccuracy = Number(position.coords.accuracy || 0);

  if (
    state.routingMode !== "live" ||
    state.routingBusy ||
    !state.liveSession
  ) {
    return;
  }

  const moved = window.DetourEatsLiveRoute.distanceMeters(
    state.lastRoutedCoordinates,
    coordinates
  );
  const elapsed = Date.now() - Number(state.lastLiveRefreshAt || 0);

  // Refresh only after about 2 miles or five minutes to protect public services.
  if (moved >= 3200 || elapsed >= 300000) {
    await refreshLiveRoute(coordinates);
  }
}

async function refreshLiveRoute(coordinates) {
  if (!state.liveSession || state.routingBusy) return;

  setRoutingBusy(true, "Updating route from your new position");

  try {
    const snapshot = await window.DetourEatsLiveRoute.refreshLiveTrip({
      session: state.liveSession,
      originCoordinates: coordinates,
      maxAddedMinutes: state.maxAdded,
      progressCallback: updateRoutingMessage
    });

    applyLiveSnapshot(snapshot);
  } catch (error) {
    console.error(error);
    state.routingMessage = "Live update delayed; last route remains active.";
  } finally {
    setRoutingBusy(false);
    render();
  }
}

async function recheckRouteNow() {
  if (
    state.routingMode !== "live" ||
    !state.liveSession ||
    !state.currentCoordinates ||
    state.routingBusy
  ) {
    return;
  }

  showToast("Rechecking route", "Updating timing and restaurant order from your current position.");
  await refreshLiveRoute(state.currentCoordinates);
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
  if (state.routingMode === "live") {
    showToast("Live route active", "Demo route controls are hidden while real location is active.");
    return;
  }
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
els.previewRouteButton.addEventListener("click", () => {
  previewSelectedRoute().catch(() => {});
});
els.useLocationButton.addEventListener("click", requestCurrentLocation);
els.swapRouteButton.addEventListener("click", swapRoute);
els.clearRecentTripsButton.addEventListener("click", clearRecentTrips);
document.querySelectorAll("[data-origin][data-destination]").forEach(button => {
  button.addEventListener("click", () => {
    applyExampleRoute(button.dataset.origin, button.dataset.destination);
  });
});

els.originInput.addEventListener("input", () => {
  if (els.originInput.value !== "Current location") {
    state.locationEnabled = false;
    state.locationIsOrigin = false;
    state.currentCoordinates = null;
    els.useLocationButton.textContent = "Use My Location";
    updateLocationSetup("Typed starting point", "Preview the route before starting.", "demo");
  }
  invalidateRoutePreview();
});
els.destinationInput.addEventListener("input", invalidateRoutePreview);
els.backButton.addEventListener("click", goBack);
els.skipButton.addEventListener("click", skipPick);
els.closeSkipPanelButton?.addEventListener("click", closeSkipPanel);
document.querySelectorAll("[data-skip-reason]").forEach(button => {
  button.addEventListener("click", () => applySkipReason(button.dataset.skipReason));
});
els.takeMeThereButton.addEventListener("click", takeMeThere);
els.whyButton.addEventListener("click", toggleWhyDetails);
els.fasterButton.addEventListener("click", eatSooner);
els.recheckRouteButton.addEventListener("click", recheckRouteNow);
(els.priorityChips || []).forEach(button => {
  button.addEventListener("click", () => setEatingPriority(button.dataset.priority));
});
els.enableNotificationsButton.addEventListener("click", enableNotifications);
els.demoToggleButton.addEventListener("click", toggleDemoControls);

[
  els.routePositionInput,
  els.lookaheadInput,
  els.candidatePoolInput,
  els.hoursModeInput,
  els.currentTimeInput,
  els.maxAddedInput,
  els.tripModeInput,
  els.stopTypeInput,
  els.foodPreferenceInput,
  els.chainPolicyInput,
  els.pricePreferenceInput,
  els.familyFriendlyInput
].forEach(el => {
  if (!el) return;
  el.addEventListener("input", () => {
    if (state.started) updateFromControls();
  });
  el.addEventListener("change", () => {
    savePreferences();
    if (el === els.maxAddedInput && !state.started) {
      invalidateRoutePreview();
    }
    if (state.started) updateFromControls();
  });
});

window.addEventListener("beforeunload", stopLocationWatch);
loadPreferences();
renderRecentTrips();
renderRoutePreview();
registerServiceWorker();
