/* DetourEats v1.8.10 Confirmed Closure Correction
   Focus: clearer trip states, stronger recommendation language, cleaner demo behavior.
*/

const els = {
  setupScreen: document.getElementById("setupScreen"),
  driveScreen: document.getElementById("driveScreen"),
  originInput: document.getElementById("originInput"),
  originSuggestions: document.getElementById("originSuggestions"),
  originSearchStatus: document.getElementById("originSearchStatus"),
  destinationInput: document.getElementById("destinationInput"),
  destinationSuggestions: document.getElementById("destinationSuggestions"),
  destinationSearchStatus: document.getElementById("destinationSearchStatus"),
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
  exceptionalAlertsInput: document.getElementById("exceptionalAlertsInput"),
  testerModeInput: document.getElementById("testerModeInput"),
  currentTimeInput: document.getElementById("currentTimeInput"),
  startTripButton: document.getElementById("startTripButton"),
  voiceToggleButton: document.getElementById("voiceToggleButton"),
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
  tripAlertStatusText: document.getElementById("tripAlertStatusText"),
  exceptionalOpportunityPanel: document.getElementById("exceptionalOpportunityPanel"),
  exceptionalOpportunityName: document.getElementById("exceptionalOpportunityName"),
  exceptionalOpportunityScore: document.getElementById("exceptionalOpportunityScore"),
  exceptionalOpportunityMessage: document.getElementById("exceptionalOpportunityMessage"),
  exceptionalOpportunityAdded: document.getElementById("exceptionalOpportunityAdded"),
  exceptionalOpportunityOffset: document.getElementById("exceptionalOpportunityOffset"),
  exceptionalOpportunityEvidence: document.getElementById("exceptionalOpportunityEvidence"),
  exceptionalOpportunityCaveat: document.getElementById("exceptionalOpportunityCaveat"),
  exceptionalNavigateButton: document.getElementById("exceptionalNavigateButton"),
  exceptionalDismissButton: document.getElementById("exceptionalDismissButton"),
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
  rateLastStopButton: document.getElementById("rateLastStopButton"),
  reportPlaceButton: document.getElementById("reportPlaceButton"),
  fieldTestPanel: document.getElementById("fieldTestPanel"),
  fieldTestSnapshotCount: document.getElementById("fieldTestSnapshotCount"),
  fieldTestIssueCount: document.getElementById("fieldTestIssueCount"),
  fieldTestCurrentSummary: document.getElementById("fieldTestCurrentSummary"),
  fieldTestCandidateAudit: document.getElementById("fieldTestCandidateAudit"),
  exportFieldTestJsonButton: document.getElementById("exportFieldTestJsonButton"),
  exportFieldTestCsvButton: document.getElementById("exportFieldTestCsvButton"),
  clearFieldTestButton: document.getElementById("clearFieldTestButton"),
  placeIssueModal: document.getElementById("placeIssueModal"),
  placeIssueRestaurantName: document.getElementById("placeIssueRestaurantName"),
  placeIssueNotes: document.getElementById("placeIssueNotes"),
  savePlaceIssueButton: document.getElementById("savePlaceIssueButton"),
  cancelPlaceIssueButton: document.getElementById("cancelPlaceIssueButton"),
  closePlaceIssueButton: document.getElementById("closePlaceIssueButton"),
  placeIssueButtons: Array.from(document.querySelectorAll("[data-place-issue]")),
  stopFeedbackPanel: document.getElementById("stopFeedbackPanel"),
  feedbackQuestion: document.getElementById("feedbackQuestion"),
  feedbackPrimaryActions: document.getElementById("feedbackPrimaryActions"),
  feedbackReasonArea: document.getElementById("feedbackReasonArea"),
  feedbackReasonButtons: document.getElementById("feedbackReasonButtons"),
  finishFeedbackButton: document.getElementById("finishFeedbackButton"),
  closeFeedbackButton: document.getElementById("closeFeedbackButton"),
  navigationModal: document.getElementById("navigationModal"),
  navigationModalSummary: document.getElementById("navigationModalSummary"),
  closeNavigationModalButton: document.getElementById("closeNavigationModalButton"),
  googleMapsButton: document.getElementById("googleMapsButton"),
  appleMapsButton: document.getElementById("appleMapsButton"),
  rememberNavigationChoiceInput: document.getElementById("rememberNavigationChoiceInput"),
  resetNavigationPreferenceButton: document.getElementById("resetNavigationPreferenceButton"),
  priorityChips: Array.from(document.querySelectorAll("[data-priority]")),
  skipReasonPanel: document.getElementById("skipReasonPanel"),
  closeSkipPanelButton: document.getElementById("closeSkipPanelButton"),
  toast: document.getElementById("toast")
};

let state = {
  started: false,
  origin: "",
  destination: "",
  originSelection: null,
  destinationSelection: null,
  locationEnabled: false,
  locationIsOrigin: false,
  routePreview: null,
  routePreviewSignature: "",
  routePreviewStatus: "idle",
  currentCoordinates: null,
  locationAccuracy: null,
  routingMode: "idle",
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
  exceptionalAlerts: true,
  testerMode: false,
  selectedPlaceIssue: "",
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
  notificationsEnabled: false,
  voiceEnabled: false,
  announcedAlertKeys: new Set(),
  announcedExceptionalKeys: new Set(),
  dismissedExceptionalIds: new Set(),
  exceptionalOpportunity: null,
  navigationPreference: "",
  pendingNavigationPick: null,
  pendingVisit: null,
  activeFeedbackValue: "",
  feedbackPromptShown: false
};

function getCandidates() {
  const candidates =
    state.routingMode === "live" &&
    Array.isArray(state.liveCandidates)
      ? state.liveCandidates
      : [];

  /*
    Final UI-layer defense: no candidate is rendered until it passes the
    provider-independent business-status filter.
  */
  const validated =
    window.DetourEatsPlaceStatus
      ?.filterCandidates
      ? window.DetourEatsPlaceStatus
          .filterCandidates(candidates)
      : candidates;

  const intelligence =
    window.DetourEatsRestaurantIntelligence;

  return intelligence?.enrichCandidates
    ? intelligence.enrichCandidates(
        validated,
        {
          now: Date.now(),
          routeMode:
            state.routingMode
        }
      )
    : validated;
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
    exceptionalAlerts: state.exceptionalAlerts,
    dismissedExceptionalIds:
      Array.from(state.dismissedExceptionalIds),
    learnedPreferences: getLearnedPreferenceProfile(),
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
      evaluated: result.evaluated || [],
      exceptionalOpportunity:
        result.exceptionalOpportunity || null
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

  const exceptionalOpportunity = normalizePick(
    result.exceptionalOpportunity
  );

  state.currentPick = pick;
  state.currentResult = result;
  state.exceptionalOpportunity = exceptionalOpportunity;

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
  renderExceptionalOpportunity(exceptionalOpportunity, pick);
  renderDecisionCard(pick, trip, copy);
  renderDecisionConsequences(pick, result, trip);
  renderTripTimeline(pick, result);
  renderDetailsPanel(pick, trip, copy);
  renderUpcoming(upcoming.length ? upcoming : getFallbackUpcoming(pick));
  recordFieldTestSnapshot(result, pick, exceptionalOpportunity);
  renderFieldTestPanel(result, pick);

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
  els.rateLastStopButton.classList.toggle("hidden", !state.pendingVisit);
  els.reportPlaceButton.disabled = !pick;
  els.fieldTestPanel.classList.toggle("hidden", !state.testerMode);
  els.takeMeThereButton.textContent = pick ? "Add Stop & Navigate" : "Keep Watching";
  els.whyButton.textContent = state.detailsOpen ? "Hide Details" : "Tell Me Why";
  els.whyButton.setAttribute("aria-expanded", String(state.detailsOpen));
  els.detailsPanel.classList.toggle("hidden", !state.detailsOpen);
  updateTripAlertStatus();
  maybeDeliverExceptionalAlert(exceptionalOpportunity);
  maybeDeliverApproachAlert(pick, result);
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

    const outcome =
      getSearchOutcomeCopy(metrics);
    const discoverySummary = [
      outcome.label,
      `${Number(metrics.rawDiscoveredCount || 0)} mapped`,
      `${Number(metrics.matrixScreenedCount || 0)} screened`,
      `${Number(metrics.totalCandidates || 0)} qualified`,
      Number(metrics.exactRouteCount || 0) > 0
        ? `${metrics.exactRouteCount} exact`
        : "",
      Number(metrics.estimatedRouteCount || 0) > 0
        ? `${metrics.estimatedRouteCount} estimated`
        : ""
    ].filter(Boolean).join(" · ");

    const discoveryWithExceptional =
      metrics.exceptionalSearchUsed &&
      state.exceptionalAlerts
        ? `${discoverySummary} · rare-place scan on`
        : discoverySummary;

    els.routingProgressMessage.textContent =
      state.routingMessage ||
      `${discoveryWithExceptional} · updated ${formatRelativeUpdate(metrics.updatedAt)}`;
    els.routingProgressMessage.classList.remove("hidden");
    return;
  }

  els.routeProgressBar.style.width = "0%";
  els.routeProgressText.textContent =
    "Live route unavailable";
  els.routeRemainingText.textContent =
    "Return to trip setup and recheck the route.";
  els.liveRouteBadge.textContent =
    "Route needed";
  els.liveRouteBadge.className =
    "live-route-badge waiting";
  els.nextFoodZoneText.textContent =
    "No live restaurant corridor is active";
  els.decisionCountdownText.textContent =
    "No decision available";
  els.routingProgressMessage.textContent =
    "DetourEats will not substitute demo restaurants for a failed live route.";
  els.routingProgressMessage.classList.remove(
    "hidden"
  );

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

function getDetourTierStatus(pick) {
  const tier = pick?.detourTier || "practical";
  const offset = Number(pick?.routeOffsetMiles || 0);

  if (tier === "destination") {
    return {
      label: "Destination detour",
      className: "detour-tier-destination",
      detail: offset
        ? `Found about ${offset.toFixed(1)} miles from the route`
        : "Found in the widest destination search"
    };
  }

  if (tier === "extended") {
    return {
      label: "Extended detour",
      className: "detour-tier-extended",
      detail: offset
        ? `Found about ${offset.toFixed(1)} miles from the route`
        : "Found beyond the practical corridor"
    };
  }

  return {
    label: "Practical detour",
    className: "detour-tier-practical",
    detail: offset
      ? `About ${offset.toFixed(1)} miles from the route`
      : "Within the normal route corridor"
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

function formatEvidenceLevel(level) {
  const labels = {
    strong: "Strong map evidence",
    moderate: "Promising map evidence",
    basic: "Basic map data"
  };
  return labels[String(level || "basic").toLowerCase()] || "Curated evidence";
}

function renderTrustSnapshot(pick) {
  const routeMode = pick.liveRoute ? "Live route" : "Curated route";
  const provenance = getProvenanceStatus(pick);
  const detourTier = getDetourTierStatus(pick);
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
        <div><span>Search tier</span><strong>${escapeHtml(detourTier.label)}</strong></div>
        <div><span>Route distance</span><strong>${escapeHtml(detourTier.detail)}</strong></div>
        <div><span>Evidence</span><strong>${escapeHtml(formatEvidenceLevel(pick.destinationEvidenceLevel))}</strong></div>
        <div><span>Data status</span><strong>${escapeHtml(freshness)}</strong></div>
      </div>
      ${risk}
    </div>
  `;
}

function renderRestaurantIntelligenceSummary(pick) {
  const intel = pick?.intelligence;
  if (!intel) return "";

  const gaps = intel.dataGaps?.length
    ? `${intel.dataGaps.length} known data gap${intel.dataGaps.length === 1 ? "" : "s"}`
    : "No major data gaps recorded";

  return `
    <section class="restaurant-intelligence-summary">
      <div class="restaurant-intelligence-heading">
        <div class="intelligence-level ${escapeHtml(intel.level.className)}">
          ${escapeHtml(intel.level.label)}
        </div>
        <strong>${escapeHtml(intel.confidenceLabel)} intelligence confidence</strong>
      </div>
      <p>${escapeHtml(intel.whySpecial)}</p>
      <div class="intelligence-summary-meta">
        <span>${escapeHtml(intel.hours.label)}</span>
        <span>${escapeHtml(gaps)}</span>
      </div>
    </section>
  `;
}

function renderRestaurantIntelligenceDetails(pick) {
  const intel = pick?.intelligence;
  if (!intel) return "";

  const signals = (intel.signals || [])
    .map(signal => `
      <li>
        <strong>${escapeHtml(signal.type)}</strong>
        <span>${escapeHtml(signal.label)}</span>
      </li>
    `)
    .join("");

  const gaps = (intel.dataGaps || [])
    .map(gap => `<li>${escapeHtml(gap)}</li>`)
    .join("");

  return `
    <div class="intelligence-details-section">
      <div class="intelligence-details-heading">
        <div>
          <span>Restaurant intelligence</span>
          <h3>${escapeHtml(intel.level.label)}</h3>
        </div>
        <div class="intelligence-confidence-number">
          <strong>${intel.confidenceScore}</strong>
          <span>confidence</span>
        </div>
      </div>

      <p class="intelligence-special-reason">
        <strong>Why this place is special:</strong>
        ${escapeHtml(intel.whySpecial)}
      </p>

      <div class="intelligence-detail-grid">
        <div>
          <span>Evidence source</span>
          <strong>${escapeHtml(intel.sourceSummary)}</strong>
        </div>
        <div>
          <span>Arrival hours</span>
          <strong>${escapeHtml(intel.hours.label)}</strong>
        </div>
        <div>
          <span>Business status</span>
          <strong>${escapeHtml(intel.operationalStatus)} · ${escapeHtml(intel.operationalConfidence)} confidence</strong>
        </div>
        <div>
          <span>Live review feeds</span>
          <strong>Not connected in this beta</strong>
        </div>
      </div>

      <div class="intelligence-lists">
        <div>
          <h4>Signals used</h4>
          <ul>${signals || "<li>No additional signals.</li>"}</ul>
        </div>
        <div>
          <h4>Known data gaps</h4>
          <ul>${gaps || "<li>No major data gaps recorded.</li>"}</ul>
        </div>
      </div>
    </div>
  `;
}

function getFieldTestSettings() {
  return {
    tripMode: state.tripMode,
    maxAdded: state.maxAdded,
    stopType: state.stopType,
    foodPreference: state.foodPreference,
    chainPolicy: state.chainPolicy,
    pricePreference: state.pricePreference,
    familyFriendly: state.familyFriendly,
    exceptionalAlerts: state.exceptionalAlerts,
    minimumScore: state.minimumScore,
    skippedIds: Array.from(state.skippedIds)
  };
}

function recordFieldTestSnapshot(
  result,
  pick,
  exceptionalOpportunity
) {
  if (!state.testerMode) return;

  const intelligence =
    window.DetourEatsRestaurantIntelligence;
  if (!intelligence?.recordSnapshot) return;

  intelligence.recordSnapshot({
    route: {
      origin: state.origin,
      destination: state.destination,
      routingMode: state.routingMode
    },
    routeUpdatedAt:
      state.liveMetrics?.updatedAt ||
      state.lastLiveRefreshAt ||
      0,
    settings: getFieldTestSettings(),
    result: {
      ...result,
      pick,
      exceptionalOpportunity
    },
    candidates:
      result?.evaluated?.length
        ? result.evaluated
        : getCandidates()
  });
}

function renderFieldTestPanel(result, pick) {
  if (!els.fieldTestPanel || !state.testerMode) return;

  const intelligence =
    window.DetourEatsRestaurantIntelligence;
  if (!intelligence) return;

  const summary = intelligence.getFieldTestSummary();
  const candidates =
    result?.evaluated?.length
      ? result.evaluated
      : getCandidates();
  const audit = intelligence.buildCandidateAudit(
    candidates,
    {
      ...result,
      pick
    },
    getFieldTestSettings()
  );

  els.fieldTestSnapshotCount.textContent =
    `${summary.snapshots} snapshot${summary.snapshots === 1 ? "" : "s"}`;
  els.fieldTestIssueCount.textContent =
    `${summary.issues} report${summary.issues === 1 ? "" : "s"}`;

  const intel = pick?.intelligence;
  els.fieldTestCurrentSummary.innerHTML = pick
    ? `
      <div>
        <span>Current recommendation</span>
        <strong>${escapeHtml(pick.name)}</strong>
      </div>
      <div>
        <span>Intelligence level</span>
        <strong>${escapeHtml(intel?.level?.label || "Unknown")}</strong>
      </div>
      <div>
        <span>Confidence</span>
        <strong>${escapeHtml(intel?.confidenceLabel || "Unknown")} ${intel?.confidenceScore ? `(${intel.confidenceScore})` : ""}</strong>
      </div>
      <div>
        <span>Provider status</span>
        <strong>No live review provider connected</strong>
      </div>
    `
    : `<p>No current recommendation.</p>`;

  els.fieldTestCandidateAudit.innerHTML = `
    <div class="field-audit-header">
      <span>Candidate</span>
      <span>Score</span>
      <span>Intelligence</span>
      <span>Outcome</span>
    </div>
    ${audit.slice(0, 12).map(row => `
      <div class="field-audit-row">
        <div>
          <strong>${escapeHtml(row.name)}</strong>
          <small>${escapeHtml(row.city)}</small>
        </div>
        <span>${row.score || "—"}</span>
        <span>${escapeHtml(row.intelligenceLevel)} · ${row.intelligenceConfidence || "—"}</span>
        <span>${escapeHtml(row.outcome)}</span>
      </div>
    `).join("")}
  `;
}

function openPlaceIssueReport() {
  const pick = state.currentPick;
  if (!pick) {
    showToast("Nothing to report", "No restaurant is currently recommended.");
    return;
  }

  state.selectedPlaceIssue = "";
  els.placeIssueRestaurantName.textContent =
    pick.name;
  els.placeIssueNotes.value = "";
  els.savePlaceIssueButton.disabled = true;
  els.placeIssueButtons.forEach(button =>
    button.classList.remove("selected")
  );
  els.placeIssueModal.classList.remove("hidden");
}

function closePlaceIssueReport() {
  els.placeIssueModal.classList.add("hidden");
  state.selectedPlaceIssue = "";
}

function selectPlaceIssue(issueType) {
  state.selectedPlaceIssue = issueType;
  els.placeIssueButtons.forEach(button => {
    button.classList.toggle(
      "selected",
      button.dataset.placeIssue === issueType
    );
  });
  els.savePlaceIssueButton.disabled = !issueType;
}

function savePlaceIssueReport() {
  const pick = state.currentPick;
  const intelligence =
    window.DetourEatsRestaurantIntelligence;

  if (
    !pick ||
    !state.selectedPlaceIssue ||
    !intelligence?.recordIssue
  ) {
    return;
  }

  const issue = intelligence.recordIssue({
    restaurant: {
      id: pick.id,
      name: pick.name,
      address: pick.address || "",
      city: pick.city || "",
      coordinates: pick.coordinates || null,
      provenance: pick.provenance || "",
      intelligenceLevel:
        pick.intelligence?.level?.label || ""
    },
    issueType: state.selectedPlaceIssue,
    notes: els.placeIssueNotes.value,
    route: {
      origin: state.origin,
      destination: state.destination
    },
    routeMetrics: {
      addedMinutes: pick.added,
      distanceAheadMiles:
        pick.distanceAheadMiles ?? null,
      routeOffsetMiles:
        pick.routeOffsetMiles ?? null
    }
  });

  closePlaceIssueReport();

  if (
    ["closed", "location", "duplicate"].includes(
      issue.issueType
    )
  ) {
    showToast(
      "Place hidden",
      `${pick.name} was removed from recommendations on this device.`
    );
    render();
  } else {
    showToast(
      "Place report saved",
      "The report is included in Field Tester exports."
    );
  }

  renderFieldTestPanel(
    state.currentResult,
    state.currentPick
  );
}

function downloadFieldTestFile(
  filename,
  content,
  mimeType
) {
  const blob = new Blob([content], {
    type: mimeType
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function exportFieldTestJson() {
  const intelligence =
    window.DetourEatsRestaurantIntelligence;
  if (!intelligence) return;

  downloadFieldTestFile(
    `detoureats-field-test-${Date.now()}.json`,
    JSON.stringify(
      intelligence.exportFieldTests(),
      null,
      2
    ),
    "application/json"
  );
}

function exportFieldTestCsv() {
  const intelligence =
    window.DetourEatsRestaurantIntelligence;
  if (!intelligence) return;

  downloadFieldTestFile(
    `detoureats-candidate-audit-${Date.now()}.csv`,
    intelligence.exportCandidateCsv(),
    "text/csv;charset=utf-8"
  );
}

function clearFieldTestData() {
  const intelligence =
    window.DetourEatsRestaurantIntelligence;
  intelligence?.clearFieldTests?.();
  showToast(
    "Field-test data cleared",
    "Snapshots and place reports were removed from this browser."
  );
  renderFieldTestPanel(
    state.currentResult,
    state.currentPick
  );
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
  const detourTier = getDetourTierStatus(pick);
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
        <div class="detour-tier-chip ${detourTier.className}">${escapeHtml(detourTier.label)}</div>
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

    ${renderRestaurantIntelligenceSummary(pick)}

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
          ${candidate.provenance === "route-discovered" ? `
            <div class="timeline-detour-tier ${getDetourTierStatus(candidate).className}">
              ${escapeHtml(getDetourTierStatus(candidate).label)}
              ${Number(candidate.routeOffsetMiles || 0) > 0
                ? ` · ${Number(candidate.routeOffsetMiles).toFixed(1)} mi from route`
                : ""}
            </div>
          ` : ""}
          ${candidate.intelligence ? `
            <div class="timeline-intelligence ${escapeHtml(candidate.intelligence.level.className)}">
              ${escapeHtml(candidate.intelligence.level.shortLabel)}
              · ${escapeHtml(candidate.intelligence.confidenceLabel)} confidence
            </div>
          ` : ""}
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

    ${renderRestaurantIntelligenceDetails(pick)}

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
      ${pick.provenance === "route-discovered" ? `<div class="trust-row"><span>Detour search tier</span><strong>${escapeHtml(getDetourTierStatus(pick).label)}</strong></div>` : ""}
      ${pick.provenance === "route-discovered" ? `<div class="trust-row"><span>Approx. distance from route</span><strong>${escapeHtml(Number(pick.routeOffsetMiles || 0).toFixed(1))} miles</strong></div>` : ""}
      ${pick.provenance === "route-discovered" ? `<div class="trust-row"><span>Destination evidence</span><strong>${escapeHtml(formatEvidenceLevel(pick.destinationEvidenceLevel))}</strong></div>` : ""}
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
const VOICE_PREFERENCE_KEY = "detoureats_voice_preference_v1";
const NOTIFICATION_PREFERENCE_KEY = "detoureats_notification_preference_v1";
const NAVIGATION_PREFERENCE_KEY = "detoureats_navigation_preference_v1";
const PENDING_VISIT_KEY = "detoureats_pending_visit_v1";
const LEARNED_PREFERENCES_KEY = "detoureats_learned_preferences_v1";
const MAX_RECENT_TRIPS = 5;
const REMOVED_DEMO_TRIP_KEYS = new Set([
  "albany, ny|boston, ma",
  "new york, ny|washington, dc",
  "syracuse, ny|philadelphia, pa"
]);
const ROUTE_SETUP_TIMEOUT_MS = 70000;

function getRouteSignature() {
  const originKey = state.locationIsOrigin && state.currentCoordinates
    ? `gps:${state.currentCoordinates.map(value => Number(value).toFixed(5)).join(",")}`
    : state.originSelection?.coordinates
      ? `selected:${state.originSelection.coordinates.map(value => Number(value).toFixed(5)).join(",")}`
      : `text:${String(els.originInput?.value || "").trim().toLowerCase()}`;

  const destinationKey = state.destinationSelection?.coordinates
    ? `selected:${state.destinationSelection.coordinates.map(value => Number(value).toFixed(5)).join(",")}`
    : `text:${String(els.destinationInput?.value || "").trim().toLowerCase()}`;

  return [
    originKey,
    destinationKey,
    Number(els.maxAddedInput?.value || 10),
    String(els.tripModeInput?.value || "balanced")
  ].join("|");
}

function invalidateRoutePreview() {
  state.routePreview = null;
  state.routePreviewSignature = "";
  state.routePreviewStatus = "idle";
  renderRoutePreview();
}

function getRecentTrips() {
  try {
    const parsed = JSON.parse(
      localStorage.getItem(
        RECENT_TRIPS_STORAGE_KEY
      ) || "[]"
    );
    if (!Array.isArray(parsed)) return [];

    const cleaned = parsed.filter(trip => {
      const key = `${
        String(trip?.origin || "")
          .trim()
          .toLowerCase()
      }|${
        String(trip?.destination || "")
          .trim()
          .toLowerCase()
      }`;
      return !REMOVED_DEMO_TRIP_KEYS.has(key);
    }).slice(0, MAX_RECENT_TRIPS);

    if (cleaned.length !== parsed.length) {
      localStorage.setItem(
        RECENT_TRIPS_STORAGE_KEY,
        JSON.stringify(cleaned)
      );
    }

    return cleaned;
  } catch {
    return [];
  }
}

function saveRecentTrip(origin, destination, originSelection = null, destinationSelection = null) {
  if (!origin || !destination || origin === "Current location") return;

  const current = getRecentTrips();
  const normalized = `${origin.toLowerCase()}|${destination.toLowerCase()}`;
  const next = [
    {
      origin,
      destination,
      originSelection,
      destinationSelection,
      savedAt: Date.now()
    },
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
      state.originSelection = trip.originSelection || null;
      state.destinationSelection = trip.destinationSelection || null;
      els.originInput.value = trip.origin;
      els.destinationInput.value = trip.destination;
      originAutocomplete?.setSelectedValue(state.originSelection);
      destinationAutocomplete?.setSelectedValue(state.destinationSelection);
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

function getSearchOutcomeCopy(
  metrics
) {
  const outcomes = {
    restaurant_search_unavailable: {
      label:
        "Driving route ready",
      detail:
        "The route was verified, but restaurant discovery did not respond. Recheck to try the restaurant search again.",
      className:
        "pipeline-partial"
    },
    no_restaurants_found: {
      label:
        "No mapped restaurants returned",
      detail:
        "Completed route sections returned no named restaurant records. Retrying later may produce updated map data.",
      className:
        "pipeline-empty"
    },
    restaurants_excluded_as_closed_or_stale: {
      label:
        "Closed or stale listings filtered",
      detail:
        "Mapped restaurant records were returned, but business-status checks excluded them before routing.",
      className:
        "pipeline-partial"
    },
    restaurants_found_route_checks_failed: {
      label:
        "Restaurants found; timing unavailable",
      detail:
        "Mapped restaurants were found, but the routing service could not calculate usable detour times.",
      className:
        "pipeline-partial"
    },
    restaurants_found_but_none_qualified: {
      label:
        "Restaurants found; none qualified",
      detail:
        "Restaurant records were found and screened, but none met the active detour and route-fit limits.",
      className:
        "pipeline-empty"
    },
    partial_results_available: {
      label:
        "Route ready with limited coverage",
      detail:
        "Usable restaurants were found, although some route areas could not be searched.",
      className:
        "pipeline-partial"
    },
    restaurants_found_and_routed: {
      label:
        "Restaurant route checks complete",
      detail:
        "Route-relevant restaurants were screened and the strongest detours were confirmed.",
      className:
        "pipeline-ready"
    },
    no_qualifying_restaurants: {
      label:
        "No qualifying restaurant yet",
      detail:
        "The route is valid, but there is not currently a restaurant that clears the recommendation threshold.",
      className:
        "pipeline-empty"
    }
  };

  return (
    outcomes[
      metrics?.searchOutcome
    ] ||
    outcomes.no_qualifying_restaurants
  );
}

function renderRoutePreview(
  message = ""
) {
  if (!els.routePreviewCard) return;

  if (
    state.routePreviewStatus ===
    "loading"
  ) {
    els.routePreviewCard.innerHTML = `
      <div class="route-preview-loading">
        <span class="route-preview-spinner" aria-hidden="true"></span>
        <div>
          <span>Checking route</span>
          <strong>${escapeHtml(message || state.routingMessage || "Calculating the driving route")}</strong>
          <small>
            Restaurant sections are searched independently, so successful partial
            results are retained. The process has a hard time limit.
          </small>
          <button id="cancelRouteCheckButton" class="text-button route-cancel-button" type="button">Cancel</button>
        </div>
      </div>
    `;
    return;
  }

  if (
    state.routePreviewStatus ===
    "error"
  ) {
    els.routePreviewCard.innerHTML = `
      <div class="route-preview-error">
        <span>Route not ready</span>
        <strong>${escapeHtml(message || "We could not verify that route.")}</strong>
        <small>Check both locations and try again.</small>
      </div>
    `;
    return;
  }

  const preview =
    state.routePreview;
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

  const metrics =
    preview.snapshot?.metrics || {};
  const outcome =
    getSearchOutcomeCopy(metrics);
  const discovered =
    Number(
      metrics.discoveredCount || 0
    );
  const curated =
    Number(
      metrics.curatedCount || 0
    );
  const total =
    Number(
      metrics.totalCandidates || 0
    );
  const raw =
    Number(
      metrics.rawDiscoveredCount || 0
    );
  const screened =
    Number(
      metrics.matrixScreenedCount || 0
    );
  const exact =
    Number(
      metrics.exactRouteCount || 0
    );
  const estimated =
    Number(
      metrics.estimatedRouteCount || 0
    );
  const chunkCompleted =
    Number(
      metrics.discoveryChunksCompleted ||
      0
    );
  const chunkTotal =
    Number(
      metrics.discoveryChunksTotal ||
      0
    );
  const chunkFailed =
    Number(
      metrics.discoveryChunksFailed ||
      0
    );
  const statusFiltered =
    Number(
      metrics.statusExcludedCount ||
      0
    );

  els.routePreviewCard.innerHTML = `
    <div class="route-preview-ready">
      <div class="route-preview-heading">
        <span>Driving route ready</span>
        <strong>${escapeHtml(state.origin)} → ${escapeHtml(state.destination)}</strong>
      </div>

      <div class="route-preview-grid">
        <div>
          <span>Drive time</span>
          <strong>${escapeHtml(formatDuration(metrics.totalMinutes || metrics.remainingMinutes || 0))}</strong>
        </div>
        <div>
          <span>Distance</span>
          <strong>${escapeHtml(String(Math.round(Number(metrics.totalMiles || metrics.remainingMiles || 0))))} mi</strong>
        </div>
        <div>
          <span>Qualified options</span>
          <strong>${total}</strong>
        </div>
      </div>

      <section class="route-pipeline-status ${escapeHtml(outcome.className)}">
        <strong>${escapeHtml(outcome.label)}</strong>
        <p>${escapeHtml(outcome.detail)}</p>
      </section>

      <div class="route-result-summary">
        <div>
          <span>Route options</span>
          <strong>${total}</strong>
        </div>
        <p>
          ${total > 0
            ? `${total} route-relevant food option${total === 1 ? "" : "s"} are ready for evaluation.`
            : escapeHtml(outcome.detail)}
        </p>
      </div>

      ${state.testerMode ? `
        <section class="route-diagnostic-details">
          <strong>Field-test diagnostics</strong>
          <div class="pipeline-count-grid">
            <div><span>Mapped records</span><strong>${raw}</strong></div>
            <div><span>Route screened</span><strong>${screened}</strong></div>
            <div><span>Exact timing</span><strong>${exact}</strong></div>
            <div><span>Matrix estimates</span><strong>${estimated}</strong></div>
            <div><span>Status filtered</span><strong>${statusFiltered}</strong></div>
          </div>
          <p>
            Provider: ${escapeHtml(metrics.discoveryProvider || "OpenStreetMap")} ·
            ${discovered} route-discovered · ${curated} curated ·
            ${chunkCompleted}/${chunkTotal || chunkCompleted} search sections completed
            ${chunkFailed ? ` · ${chunkFailed} section${chunkFailed === 1 ? "" : "s"} unavailable` : ""}
          </p>
          <div class="adaptive-search-summary">
            <strong>${escapeHtml(metrics.searchMode || "Compact route search")}</strong>
            <span>${escapeHtml(metrics.searchSummary || "Restaurant discovery was checked in compact route areas.")}</span>
          </div>
        </section>
      ` : `
        <div class="route-search-note">
          <span>Restaurant search</span>
          <strong>
            ${metrics.shortRouteFallbackUsed && total > 0
              ? "Nearby options found using the local fallback search."
              : chunkFailed > 0 && total > 0
                ? "Usable options found. Additional route areas may update on recheck."
                : "Route search complete."}
          </strong>
        </div>
      `}

      ${metrics.exceptionalSearchUsed &&
        els.exceptionalAlertsInput?.checked !== false ? `
        <small class="rare-scan-note">
          Rare-place scan remains active regardless of Eating Priority.
        </small>
      ` : ""}
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

function cancelRouteCheck(
  message = "Route check canceled."
) {
  window.DetourEatsLiveRoute
    ?.cancelActiveRequests?.("user-cancel");

  state.routePreview = null;
  state.routePreviewSignature = "";
  state.routePreviewStatus = "error";
  state.routingMessage = "";
  setRouteSetupBusy(false);
  renderRoutePreview(message);
}

function withRouteSetupTimeout(promise) {
  let timeoutId = null;

  const timeoutPromise = new Promise(
    (_, reject) => {
      timeoutId = setTimeout(() => {
        window.DetourEatsLiveRoute
          ?.cancelActiveRequests?.("timeout");
        reject(
          new Error(
            "The public route services did not respond quickly enough. Please try again."
          )
        );
      }, ROUTE_SETUP_TIMEOUT_MS);
    }
  );

  return Promise.race([
    promise,
    timeoutPromise
  ]).finally(() => {
    if (timeoutId) clearTimeout(timeoutId);
  });
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

  state.origin = state.locationIsOrigin
    ? "Current location"
    : state.originSelection?.label || originText;
  state.destination = state.destinationSelection?.label || destinationText;
  state.routePreviewStatus = "loading";
  state.liveCandidates = null;
  state.liveSession = null;
  state.liveMetrics = null;
  state.routingMode = "idle";
  setRouteSetupBusy(true, "Locating your route");

  try {
    const result = await withRouteSetupTimeout(
      service.buildLiveTrip({
      originCoordinates:
        state.locationIsOrigin && Array.isArray(state.currentCoordinates)
          ? state.currentCoordinates
          : state.originSelection?.coordinates || null,
      originText: state.locationIsOrigin ? "" : originText,
      originLabel: state.locationIsOrigin
        ? "Current location"
        : state.originSelection?.label || originText,
      destinationCoordinates: state.destinationSelection?.coordinates || null,
      destinationText,
      destinationLabel: state.destinationSelection?.label || destinationText,
      candidates: window.DETOUR_EATS_CANDIDATES || [],
      maxAddedMinutes: Number(els.maxAddedInput.value),
      tripMode: els.tripModeInput.value,
      progressCallback: message => {
        state.routingMessage = message;
        renderRoutePreview(message);
      }
    })
    );

    state.routePreview = result;
    state.routePreviewSignature = signature;
    state.routePreviewStatus = "ready";
    state.routingMessage = "";
    renderRoutePreview();

    if (!quiet) {
      const metrics =
        result.snapshot?.metrics || {};
      const count =
        Number(
          metrics.totalCandidates || 0
        );
      const outcome =
        getSearchOutcomeCopy(metrics);

      showToast(
        "Driving route ready",
        count > 0
          ? `${count} route-relevant food option${count === 1 ? "" : "s"} qualified.`
          : outcome.detail
      );
    }

    return result;
  } catch (error) {
    state.routePreview = null;
    state.routePreviewSignature = "";
    state.routePreviewStatus = "error";
    state.routingMessage = "";

    const message =
      /restaurant|overpass|nominatim/i.test(
        error?.message || ""
      )
        ? "The driving route may be valid, but restaurant discovery did not finish. Please retry the restaurant search."
        : error?.message ||
          "We could not calculate that driving route.";

    renderRoutePreview(message);

    if (!quiet) {
      showToast(
        "Route not ready",
        message
      );
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
  const originSelection = state.originSelection;

  els.originInput.value = els.destinationInput.value;
  els.destinationInput.value = origin;
  state.originSelection = state.destinationSelection;
  state.destinationSelection = originSelection;

  originAutocomplete?.setSelectedValue(state.originSelection);
  destinationAutocomplete?.setSelectedValue(state.destinationSelection);
  invalidateRoutePreview();
}


function loadSeamlessSettings() {
  try {
    state.voiceEnabled =
      localStorage.getItem(VOICE_PREFERENCE_KEY) === "enabled";
    state.notificationsEnabled =
      localStorage.getItem(NOTIFICATION_PREFERENCE_KEY) === "enabled" &&
      "Notification" in window &&
      Notification.permission === "granted";
    state.navigationPreference =
      localStorage.getItem(NAVIGATION_PREFERENCE_KEY) || "";
    state.pendingVisit = loadPendingVisit();
  } catch {
    // Defaults remain active.
  }

  updateTripAlertStatus();
}

function savePreferences() {
  const preferences = {
    maxAdded: Number(els.maxAddedInput?.value || state.maxAdded || 10),
    tripMode: els.tripModeInput?.value || state.tripMode || "balanced",
    stopType: els.stopTypeInput?.value || state.stopType || "either",
    foodPreference: els.foodPreferenceInput?.value || state.foodPreference || "anything",
    chainPolicy: els.chainPolicyInput?.value || state.chainPolicy || "avoid",
    pricePreference: els.pricePreferenceInput?.value || state.pricePreference || "any",
    familyFriendly: Boolean(els.familyFriendlyInput?.checked),
    exceptionalAlerts:
      els.exceptionalAlertsInput?.checked !== false,
    testerMode:
      Boolean(els.testerModeInput?.checked)
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
  if (els.exceptionalAlertsInput) {
    els.exceptionalAlertsInput.checked =
      saved.exceptionalAlerts !== false;
  }
  if (els.testerModeInput) {
    els.testerModeInput.checked =
      Boolean(saved.testerMode);
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
  state.exceptionalAlerts =
    els.exceptionalAlertsInput?.checked !== false;
  state.testerMode =
    Boolean(els.testerModeInput?.checked);
  state.excludedCategories = new Set();
  state.deferUntilSeq = 0;
  state.minimumScore = 0;
  state.lastSkipAdjustment = "";
  state.detailsOpen = false;
  state.currentTime = getActualCurrentMinutes();
  state.routePosition = 0;
  state.lookahead = 99;
  state.candidatePool = "All";
  state.hoursMode = "requireOpen";
  state.skippedIds = new Set();
  state.announcedAlertKeys = new Set();
  state.announcedExceptionalKeys = new Set();
  state.dismissedExceptionalIds = new Set();
  state.exceptionalOpportunity = null;
  state.feedbackPromptShown = false;
  savePreferences();

  state.liveSession = preview.session;
  applyLiveSnapshot(preview.snapshot);

  els.setupScreen.classList.add("hidden");
  els.driveScreen.classList.remove("hidden");

  if (state.locationIsOrigin) {
    startLocationWatch();
  }

  saveRecentTrip(
    state.origin,
    state.destination,
    state.locationIsOrigin ? null : state.originSelection,
    state.destinationSelection
  );
  render();

  const metrics =
    preview.snapshot?.metrics || {};
  const count =
    Number(
      metrics.totalCandidates || 0
    );
  const outcome =
    getSearchOutcomeCopy(metrics);

  showToast(
    "Trip started",
    count > 0
      ? `${count} route-relevant food option${count === 1 ? "" : "s"} are active.`
      : outcome.detail
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
  state.routingMode = "live";
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
  state.routingMode = "idle";
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

  state.pendingNavigationPick = pick;

  if (state.navigationPreference === "google") {
    launchNavigation("google");
    return;
  }

  if (state.navigationPreference === "apple") {
    launchNavigation("apple");
    return;
  }

  openNavigationModal(pick);
}

function openNavigationModal(pick) {
  const destination = state.destination || "your original destination";
  els.navigationModalSummary.textContent =
    `${pick.name} will be inserted before ${destination}.`;
  els.navigationModal.classList.remove("hidden");
  els.resetNavigationPreferenceButton.classList.toggle(
    "hidden",
    !state.navigationPreference
  );
}

function closeNavigationModal() {
  els.navigationModal.classList.add("hidden");
}

function chooseNavigationProvider(provider) {
  if (els.rememberNavigationChoiceInput.checked) {
    state.navigationPreference = provider;
    try {
      localStorage.setItem(NAVIGATION_PREFERENCE_KEY, provider);
    } catch {
      // Preference remains available for this session.
    }
  }

  launchNavigation(provider);
}

function launchNavigation(provider) {
  const pick = state.pendingNavigationPick || state.currentPick;
  if (!pick) return;

  const url = provider === "apple"
    ? buildAppleMapsUrl(pick)
    : buildGoogleMapsUrl(pick);

  rememberPendingVisit(pick);
  closeNavigationModal();

  showToast(
    "Stop added",
    `Opening ${provider === "apple" ? "Apple Maps" : "Google Maps"} with ${pick.name} before your final destination.`
  );

  window.location.href = url;
}

function buildGoogleMapsUrl(pick) {
  const params = new URLSearchParams({
    api: "1",
    destination: getFinalDestinationValue(),
    waypoints: getRestaurantNavigationValue(pick),
    travelmode: "driving",
    dir_action: "navigate",
    utm_source: "DetourEats",
    utm_campaign: "add_stop_navigation"
  });

  const origin = getNavigationOriginValue();
  if (origin) params.set("origin", origin);

  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

function buildAppleMapsUrl(pick) {
  const params = new URLSearchParams({
    destination: getFinalDestinationValue(),
    waypoint: getRestaurantNavigationValue(pick),
    mode: "driving"
  });

  const origin = getNavigationOriginValue();
  if (origin) params.set("source", origin);

  return `https://maps.apple.com/directions?${params.toString()}`;
}

function getNavigationOriginValue() {
  if (state.locationIsOrigin) return "";

  const coordinates =
    state.liveSession?.originCoordinates ||
    state.originSelection?.coordinates;

  return formatNavigationLocation(coordinates, state.origin);
}

function getFinalDestinationValue() {
  const coordinates =
    state.liveSession?.destinationCoordinates ||
    state.destinationSelection?.coordinates;

  return formatNavigationLocation(coordinates, state.destination);
}

function getRestaurantNavigationValue(pick) {
  return formatNavigationLocation(
    pick.coordinates,
    pick.address || pick.name
  );
}

function formatNavigationLocation(coordinates, fallback) {
  if (Array.isArray(coordinates) && coordinates.length === 2) {
    return `${Number(coordinates[1])},${Number(coordinates[0])}`;
  }
  return String(fallback || "");
}

function resetNavigationPreference() {
  state.navigationPreference = "";
  try {
    localStorage.removeItem(NAVIGATION_PREFERENCE_KEY);
  } catch {
    // Ignore storage failures.
  }
  els.resetNavigationPreferenceButton.classList.add("hidden");
  showToast("Navigation choice reset", "DetourEats will ask next time.");
}

function rememberPendingVisit(pick) {
  const pending = {
    id: pick.id,
    name: pick.name,
    category: pick.category || pick.cuisine || "",
    chain: Boolean(pick.chain),
    quickStop: Boolean(pick.quickStop),
    sitDown: Boolean(pick.sitDown),
    localFavorite: Boolean(pick.localFavorite),
    regionalSpecialty: Boolean(pick.regionalSpecialty),
    estimatedAddedMinutes: Number(pick.added || pick.estimatedAddedMinutes || 0),
    startedAt: Date.now()
  };

  state.pendingVisit = pending;
  state.feedbackPromptShown = false;

  try {
    localStorage.setItem(PENDING_VISIT_KEY, JSON.stringify(pending));
  } catch {
    // Feedback remains available during this session.
  }
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
    state.originSelection = null;
    originAutocomplete?.clearSelection();
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
      ? "Location permission was denied. You can type a starting point instead."
      : error?.code === 3
        ? "Location request timed out. Try again when signal is stronger."
        : "Your location could not be determined.";

    updateLocationSetup("Use a typed starting point", message, "error");
  } finally {
    els.useLocationButton.disabled = false;
  }
}

function updateLocationSetup(
  title,
  status,
  mode = "manual"
) {
  els.locationSetupTitle.textContent =
    title;
  els.locationSetupStatus.textContent =
    status;

  const labels = {
    live: "Location ready",
    working: "Working",
    error: "Location unavailable",
    manual: "Manual route",
    demo: "Manual route"
  };

  const visualMode =
    mode === "demo"
      ? "manual"
      : mode;

  els.locationModeBadge.textContent =
    labels[mode] ||
    "Manual route";
  els.locationModeBadge.className =
    `location-mode-badge ${visualMode}`;
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
    const forceRediscovery =
      state.liveMetrics?.searchOutcome ===
        "restaurant_search_unavailable" ||
      Number(
        state.liveMetrics?.candidatePoolCount ||
        0
      ) === 0 ||
      elapsed >= 15 * 60 * 1000;

    await refreshLiveRoute(
      coordinates,
      { forceRediscovery }
    );
  }
}

async function refreshLiveRoute(coordinates, { forceRediscovery = false } = {}) {
  if (!state.liveSession || state.routingBusy) return;

  setRoutingBusy(true, "Updating route from your new position");

  try {
    const snapshot = await window.DetourEatsLiveRoute.refreshLiveTrip({
      session: state.liveSession,
      originCoordinates: coordinates,
      maxAddedMinutes: state.maxAdded,
      progressCallback: updateRoutingMessage,
      forceRediscovery
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
  const routeOrigin =
    state.currentCoordinates ||
    state.liveSession?.originCoordinates;

  if (
    state.routingMode !== "live" ||
    !state.liveSession ||
    !Array.isArray(routeOrigin) ||
    state.routingBusy
  ) {
    return;
  }

  showToast(
    "Rechecking route",
    state.locationIsOrigin
      ? "Updating timing and restaurant order from your current position."
      : "Rechecking timing and restaurant order for the selected route."
  );
  await refreshLiveRoute(
    routeOrigin,
    { forceRediscovery: true }
  );
}

async function enableNotifications() {
  if (!("Notification" in window)) {
    showToast("Alerts unavailable", "This browser does not support system notifications.");
    return;
  }

  const permission = await Notification.requestPermission();
  state.notificationsEnabled = permission === "granted";

  try {
    localStorage.setItem(
      NOTIFICATION_PREFERENCE_KEY,
      state.notificationsEnabled ? "enabled" : "disabled"
    );
  } catch {
    // Preference remains for this session.
  }

  updateTripAlertStatus();

  if (state.notificationsEnabled) {
    new Notification("DetourEats trip alerts are on", {
      body: "We’ll alert you when a worthwhile food decision is approaching while DetourEats is active.",
      icon: "icons/icon-192.svg"
    });
    showToast("Trip alerts enabled", "Approach alerts are ready.");
  } else {
    showToast("Alerts not enabled", "Voice guidance can still be used.");
  }
}

function toggleVoiceGuidance() {
  if (!("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) {
    showToast("Voice unavailable", "This browser does not support spoken guidance.");
    return;
  }

  state.voiceEnabled = !state.voiceEnabled;

  try {
    localStorage.setItem(
      VOICE_PREFERENCE_KEY,
      state.voiceEnabled ? "enabled" : "disabled"
    );
  } catch {
    // Preference remains for this session.
  }

  updateTripAlertStatus();

  if (state.voiceEnabled) {
    speakMessage(
      "Voice guidance is on. I’ll tell you when a stop is worth it.",
      { force: true }
    );
    showToast("Voice guidance on", "Recommendations will be spoken while DetourEats is active.");
  } else {
    window.speechSynthesis.cancel();
    showToast("Voice guidance off", "Spoken recommendations are disabled.");
  }
}

function renderExceptionalOpportunity(
  opportunity,
  normalPick
) {
  if (
    !opportunity ||
    !state.exceptionalAlerts ||
    state.dismissedExceptionalIds.has(opportunity.id) ||
    !isExceptionalOpportunityApproaching(opportunity)
  ) {
    els.exceptionalOpportunityPanel.classList.add("hidden");
    return;
  }

  const sameAsNormalPick =
    normalPick && normalPick.id === opportunity.id;
  const added = Number(opportunity.added || 0);
  const offset = Number(
    opportunity.routeOffsetMiles || 0
  );
  const score = Number(
    opportunity.exceptionalScore ||
    opportunity.score ||
    0
  );

  els.exceptionalOpportunityName.textContent =
    opportunity.name;
  els.exceptionalOpportunityScore.textContent =
    score ? String(score) : "Rare";
  els.exceptionalOpportunityMessage.textContent =
    sameAsNormalPick
      ? `${opportunity.name} also clears the exceptional-detour override.`
      : `${opportunity.name} is a separate rare opportunity and does not replace your current ${formatPreferenceLabel(state.tripMode)} recommendation.`;
  els.exceptionalOpportunityAdded.textContent =
    `${added} min`;
  els.exceptionalOpportunityOffset.textContent =
    offset > 0
      ? `${offset.toFixed(1)} mi`
      : "Route-calculated";
  els.exceptionalOpportunityEvidence.textContent =
    opportunity.exceptionalEvidence ||
    formatEvidenceLevel(
      opportunity.destinationEvidenceLevel
    );
  els.exceptionalOpportunityCaveat.textContent =
    opportunity.exceptionalCaveat ||
    "A rare-opportunity alert does not replace the current recommendation.";

  els.exceptionalOpportunityPanel.classList.remove(
    "hidden"
  );
}

function isExceptionalOpportunityApproaching(opportunity) {
  return getExceptionalDecisionMinutes(opportunity) <= 45;
}

function getExceptionalDecisionMinutes(opportunity) {
  if (!opportunity) return 999;

  if (opportunity.liveRoute) {
    return Number(
      opportunity.decisionMinutes ??
      opportunity.minutesAhead ??
      999
    );
  }

  return estimateMinutesAhead(opportunity);
}

function maybeDeliverExceptionalAlert(opportunity) {
  if (
    !state.started ||
    !state.exceptionalAlerts ||
    !opportunity ||
    state.dismissedExceptionalIds.has(opportunity.id)
  ) {
    return;
  }

  const minutes = getExceptionalDecisionMinutes(
    opportunity
  );
  let stage = "";

  if (minutes <= 5) stage = "decision";
  else if (minutes <= 45) stage = "opportunity";
  else return;

  const key = `${opportunity.id}:${stage}`;
  if (state.announcedExceptionalKeys.has(key)) return;
  state.announcedExceptionalKeys.add(key);

  const added = Number(opportunity.added || 0);
  const message =
    stage === "decision"
      ? `Rare detour decision now. ${opportunity.name} adds about ${added} minutes and cleared the exceptional-place threshold.`
      : `Rare detour opportunity ahead. ${opportunity.name} adds about ${added} minutes and may be a bucket-list stop. Your normal recommendation remains unchanged.`;

  if (state.voiceEnabled) {
    speakMessage(message);
  }

  if (
    state.notificationsEnabled &&
    Notification.permission === "granted"
  ) {
    try {
      new Notification(
        stage === "decision"
          ? "DetourEats: rare detour decision"
          : "DetourEats: rare place ahead",
        {
          body: message,
          icon: "icons/icon-192.svg",
          tag: `exceptional-${key}`,
          renotify: stage === "decision"
        }
      );
    } catch {
      // Some mobile browsers require service-worker notifications.
    }
  }

  showToast(
    stage === "decision"
      ? "Rare detour decision"
      : "Rare place ahead",
    message
  );
}

function navigateToExceptionalOpportunity() {
  const opportunity = state.exceptionalOpportunity;
  if (!opportunity) return;

  state.pendingNavigationPick = opportunity;

  if (state.navigationPreference === "google") {
    launchNavigation("google");
    return;
  }

  if (state.navigationPreference === "apple") {
    launchNavigation("apple");
    return;
  }

  openNavigationModal(opportunity);
}

function dismissExceptionalOpportunity() {
  const opportunity = state.exceptionalOpportunity;
  if (!opportunity) return;

  state.dismissedExceptionalIds.add(opportunity.id);
  els.exceptionalOpportunityPanel.classList.add(
    "hidden"
  );
  showToast(
    "Current plan kept",
    `${opportunity.name} will not be announced again on this trip.`
  );
  render();
}

function updateTripAlertStatus() {
  const voiceLabel = state.voiceEnabled ? "Voice on" : "Voice off";
  const alertLabel = state.notificationsEnabled ? "alerts on" : "alerts off";
  const exceptionalLabel = state.exceptionalAlerts
    ? "rare scan on"
    : "rare scan off";

  if (els.tripAlertStatusText) {
    els.tripAlertStatusText.textContent =
      `${voiceLabel} · ${alertLabel} · ${exceptionalLabel}`;
  }

  if (els.voiceToggleButton) {
    els.voiceToggleButton.textContent =
      state.voiceEnabled ? "Turn Voice Off" : "Turn Voice On";
  }

  if (els.enableNotificationsButton) {
    els.enableNotificationsButton.textContent =
      state.notificationsEnabled ? "Alerts Enabled" : "Enable Alerts";
  }
}

function maybeDeliverApproachAlert(pick, result) {
  if (!state.started || !pick || Number(pick.score || 0) < 84) return;

  const timing = getDecisionTiming(pick);
  const minutes = pick.liveRoute
    ? Number(pick.decisionMinutes ?? pick.minutesAhead ?? 999)
    : estimateMinutesAhead(pick);

  let stage = "";
  if (minutes <= 1) stage = "now";
  else if (minutes <= 5) stage = "soon";
  else if (minutes <= 20) stage = "approaching";
  else return;

  const alertKey = `${pick.id}:${stage}`;
  if (state.announcedAlertKeys.has(alertKey)) return;
  state.announcedAlertKeys.add(alertKey);

  const outlook = result?.routeOutlook?.label;
  const message = buildApproachAlertMessage(pick, stage, outlook, timing);

  if (state.voiceEnabled) {
    speakMessage(message);
  }

  if (state.notificationsEnabled && Notification.permission === "granted") {
    try {
      new Notification(
        stage === "now" ? "DetourEats: decide now" : "DetourEats: stop approaching",
        {
          body: message,
          icon: "icons/icon-192.svg",
          tag: alertKey,
          renotify: stage === "now"
        }
      );
    } catch {
      // Some mobile browsers require service-worker notifications.
    }
  }

  if (stage === "now" || stage === "soon") {
    showToast(stage === "now" ? "Decision now" : "Stop approaching", message);
  }
}

function buildApproachAlertMessage(pick, stage, outlook, timing) {
  const added = Number(pick.added || 0);
  const score = Number(pick.score || 0);
  const routeContext = outlook ? ` ${outlook}.` : "";

  if (stage === "now") {
    return `${pick.name} is the decision now. Detour Score ${score}. It adds about ${added} minutes.${routeContext}`;
  }

  if (stage === "soon") {
    return `${pick.name} is coming up soon. Detour Score ${score}, adding about ${added} minutes. ${timing.detail}`;
  }

  return `I found a worthwhile stop ahead. ${pick.name} has a Detour Score of ${score} and adds about ${added} minutes.${routeContext}`;
}

function speakMessage(message, options = {}) {
  if (!state.voiceEnabled && !options.force) return;
  if (!("speechSynthesis" in window)) return;

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(String(message || ""));
  utterance.rate = 0.96;
  utterance.pitch = 1;
  utterance.volume = 1;
  window.speechSynthesis.speak(utterance);
}

function getLearnedPreferenceProfile() {
  try {
    const profile = JSON.parse(
      localStorage.getItem(LEARNED_PREFERENCES_KEY) || "{}"
    );
    return profile && typeof profile === "object"
      ? profile
      : createEmptyPreferenceProfile();
  } catch {
    return createEmptyPreferenceProfile();
  }
}

function createEmptyPreferenceProfile() {
  return {
    totalRatings: 0,
    positiveRatings: 0,
    negativeRatings: 0,
    categorySignals: {},
    chainSignal: 0,
    independentSignal: 0,
    quickSignal: 0,
    sitDownSignal: 0,
    localSignal: 0,
    regionalSignal: 0,
    updatedAt: 0
  };
}

function openStopFeedback() {
  const pending = state.pendingVisit || loadPendingVisit();
  if (!pending) {
    showToast("Nothing to rate", "Choose Add Stop & Navigate first.");
    return;
  }

  state.pendingVisit = pending;
  state.activeFeedbackValue = "";
  els.feedbackQuestion.textContent = `Was ${pending.name} worth the detour?`;
  els.feedbackPrimaryActions.classList.remove("hidden");
  els.feedbackReasonArea.classList.add("hidden");
  els.stopFeedbackPanel.classList.remove("hidden");
  state.feedbackPromptShown = true;
}

function closeStopFeedback() {
  els.stopFeedbackPanel.classList.add("hidden");
}

function recordPrimaryFeedback(value) {
  const pending = state.pendingVisit || loadPendingVisit();
  if (!pending) return;

  if (value === "did-not-stop") {
    clearPendingVisit();
    closeStopFeedback();
    showToast("No rating recorded", "That stop will not affect your preferences.");
    render();
    return;
  }

  state.activeFeedbackValue = value;
  updatePreferenceProfile(pending, value, "");
  renderFeedbackReasons(value);
  els.feedbackPrimaryActions.classList.add("hidden");
  els.feedbackReasonArea.classList.remove("hidden");

  showToast(
    "Preference updated",
    value === "positive"
      ? "DetourEats will favor similar stops slightly more."
      : "DetourEats will favor similar stops slightly less."
  );
}

function renderFeedbackReasons(value) {
  const reasons = value === "positive"
    ? [
        ["great-food", "Great food"],
        ["easy-stop", "Easy stop"],
        ["worth-detour", "Worth the detour"],
        ["right-vibe", "Right kind of place"]
      ]
    : [
        ["bad-food-fit", "Food wasn’t for me"],
        ["too-much-detour", "Too much detour"],
        ["too-slow", "Too slow"],
        ["closed-wrong", "Closed or incorrect"]
      ];

  els.feedbackReasonButtons.innerHTML = reasons.map(([key, label]) => `
    <button type="button" data-feedback-reason="${escapeHtml(key)}">
      ${escapeHtml(label)}
    </button>
  `).join("");

  els.feedbackReasonButtons.querySelectorAll("[data-feedback-reason]").forEach(button => {
    button.addEventListener("click", () => {
      const pending = state.pendingVisit || loadPendingVisit();
      if (!pending) return;
      updatePreferenceProfile(
        pending,
        state.activeFeedbackValue,
        button.dataset.feedbackReason
      );
      button.classList.add("selected");
      button.disabled = true;
    });
  });
}

function updatePreferenceProfile(pending, value, reason) {
  const profile = getLearnedPreferenceProfile();
  const delta = value === "positive" ? 1 : -1;
  const categoryKey = normalizePreferenceCategory(pending.category);

  if (!reason) {
    profile.totalRatings = Number(profile.totalRatings || 0) + 1;
    if (delta > 0) {
      profile.positiveRatings = Number(profile.positiveRatings || 0) + 1;
    } else {
      profile.negativeRatings = Number(profile.negativeRatings || 0) + 1;
    }

    if (categoryKey) {
      profile.categorySignals[categoryKey] = clampPreferenceSignal(
        Number(profile.categorySignals[categoryKey] || 0) + delta
      );
    }

    if (pending.chain) {
      profile.chainSignal = clampPreferenceSignal(
        Number(profile.chainSignal || 0) + delta
      );
    } else {
      profile.independentSignal = clampPreferenceSignal(
        Number(profile.independentSignal || 0) + delta
      );
    }

    if (pending.quickStop) {
      profile.quickSignal = clampPreferenceSignal(
        Number(profile.quickSignal || 0) + delta
      );
    }
    if (pending.sitDown) {
      profile.sitDownSignal = clampPreferenceSignal(
        Number(profile.sitDownSignal || 0) + delta
      );
    }
    if (pending.localFavorite) {
      profile.localSignal = clampPreferenceSignal(
        Number(profile.localSignal || 0) + delta
      );
    }
    if (pending.regionalSpecialty) {
      profile.regionalSignal = clampPreferenceSignal(
        Number(profile.regionalSignal || 0) + delta
      );
    }
  } else {
    if (reason === "great-food" || reason === "right-vibe") {
      if (categoryKey) {
        profile.categorySignals[categoryKey] = clampPreferenceSignal(
          Number(profile.categorySignals[categoryKey] || 0) + 1
        );
      }
    } else if (reason === "easy-stop") {
      profile.quickSignal = clampPreferenceSignal(
        Number(profile.quickSignal || 0) + 1
      );
    } else if (reason === "bad-food-fit") {
      if (categoryKey) {
        profile.categorySignals[categoryKey] = clampPreferenceSignal(
          Number(profile.categorySignals[categoryKey] || 0) - 1
        );
      }
    } else if (reason === "too-slow") {
      profile.quickSignal = clampPreferenceSignal(
        Number(profile.quickSignal || 0) + 1
      );
      profile.sitDownSignal = clampPreferenceSignal(
        Number(profile.sitDownSignal || 0) - 1
      );
    }
  }

  profile.updatedAt = Date.now();

  try {
    localStorage.setItem(LEARNED_PREFERENCES_KEY, JSON.stringify(profile));
  } catch {
    // Learning remains best-effort in the browser beta.
  }
}

function normalizePreferenceCategory(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function clampPreferenceSignal(value) {
  return Math.max(-5, Math.min(5, Number(value || 0)));
}

function finishFeedback() {
  clearPendingVisit();
  closeStopFeedback();
  render();
}

function loadPendingVisit() {
  try {
    const pending = JSON.parse(localStorage.getItem(PENDING_VISIT_KEY) || "null");
    return pending && pending.name ? pending : null;
  } catch {
    return null;
  }
}

function clearPendingVisit() {
  state.pendingVisit = null;
  state.activeFeedbackValue = "";
  try {
    localStorage.removeItem(PENDING_VISIT_KEY);
  } catch {
    // Ignore storage failures.
  }
}

function maybePromptForStopFeedback() {
  const pending = state.pendingVisit || loadPendingVisit();
  if (!pending || state.feedbackPromptShown || !state.started) return;

  const elapsed = Date.now() - Number(pending.startedAt || 0);
  if (elapsed < 8 * 60 * 1000) return;

  state.pendingVisit = pending;
  openStopFeedback();
}


function updateFromControls() {
  state.routePosition = 0;
  state.lookahead = 99;
  state.candidatePool = "All";
  state.hoursMode = "requireOpen";
  state.currentTime =
    Number(
      els.currentTimeInput?.value ||
      state.currentTime
    );
  state.testerMode =
    Boolean(
      els.testerModeInput?.checked
    );
  render();
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
    navigator.serviceWorker
      .register("service-worker.js?v=1.8.10", {
        updateViaCache: "none"
      })
      .then(registration => {
        registration.update().catch(() => {});
      })
      .catch(() => {});
  }
}

const originAutocomplete = window.DetourEatsAddressSearch?.createAutocomplete({
  input: els.originInput,
  menu: els.originSuggestions,
  status: els.originSearchStatus,
  getBiasCoordinates: () => state.currentCoordinates,
  onSelect: selection => {
    state.locationEnabled = false;
    state.locationIsOrigin = false;
    state.currentCoordinates = null;
    state.originSelection = {
      label: selection.label,
      coordinates: selection.coordinates
    };
    els.useLocationButton.textContent = "Use My Location";
    updateLocationSetup(
      "Starting point selected",
      "Exact coordinates are ready for route calculation.",
      "live"
    );
    invalidateRoutePreview();
  },
  onManualInput: query => {
    if (query !== state.originSelection?.label) {
      state.originSelection = null;
    }
  }
});

const destinationAutocomplete = window.DetourEatsAddressSearch?.createAutocomplete({
  input: els.destinationInput,
  menu: els.destinationSuggestions,
  status: els.destinationSearchStatus,
  getBiasCoordinates: () =>
    state.originSelection?.coordinates ||
    state.currentCoordinates,
  onSelect: selection => {
    state.destinationSelection = {
      label: selection.label,
      coordinates: selection.coordinates
    };
    invalidateRoutePreview();
  },
  onManualInput: query => {
    if (query !== state.destinationSelection?.label) {
      state.destinationSelection = null;
    }
  }
});

els.startTripButton.addEventListener("click", startTrip);
els.voiceToggleButton.addEventListener("click", toggleVoiceGuidance);
els.previewRouteButton.addEventListener("click", () => {
  previewSelectedRoute().catch(() => {});
});
els.routePreviewCard.addEventListener("click", event => {
  if (event.target?.id === "cancelRouteCheckButton") {
    cancelRouteCheck();
  }
});
els.useLocationButton.addEventListener("click", requestCurrentLocation);
els.swapRouteButton.addEventListener("click", swapRoute);
els.clearRecentTripsButton.addEventListener("click", clearRecentTrips);
els.originInput.addEventListener("input", () => {
  if (els.originInput.value !== "Current location") {
    state.locationEnabled = false;
    state.locationIsOrigin = false;
    state.currentCoordinates = null;
    if (els.originInput.value !== state.originSelection?.label) {
      state.originSelection = null;
    }
    els.useLocationButton.textContent = "Use My Location";
    updateLocationSetup(
      "Typed starting point",
      state.originSelection
        ? "Exact location selected."
        : "Choose a suggestion for the most reliable routing.",
      state.originSelection ? "live" : "demo"
    );
  }
  invalidateRoutePreview();
});
els.destinationInput.addEventListener("input", () => {
  if (els.destinationInput.value !== state.destinationSelection?.label) {
    state.destinationSelection = null;
  }
  invalidateRoutePreview();
});
els.backButton.addEventListener("click", goBack);
els.skipButton.addEventListener("click", skipPick);
els.closeSkipPanelButton?.addEventListener("click", closeSkipPanel);
document.querySelectorAll("[data-skip-reason]").forEach(button => {
  button.addEventListener("click", () => applySkipReason(button.dataset.skipReason));
});
els.takeMeThereButton.addEventListener("click", takeMeThere);
els.exceptionalNavigateButton.addEventListener(
  "click",
  navigateToExceptionalOpportunity
);
els.exceptionalDismissButton.addEventListener(
  "click",
  dismissExceptionalOpportunity
);
els.rateLastStopButton.addEventListener("click", openStopFeedback);
els.reportPlaceButton.addEventListener("click", openPlaceIssueReport);
els.placeIssueButtons.forEach(button => {
  button.addEventListener("click", () =>
    selectPlaceIssue(button.dataset.placeIssue)
  );
});
els.savePlaceIssueButton.addEventListener("click", savePlaceIssueReport);
els.cancelPlaceIssueButton.addEventListener("click", closePlaceIssueReport);
els.closePlaceIssueButton.addEventListener("click", closePlaceIssueReport);
els.placeIssueModal.addEventListener("click", event => {
  if (event.target === els.placeIssueModal) {
    closePlaceIssueReport();
  }
});
els.exportFieldTestJsonButton.addEventListener("click", exportFieldTestJson);
els.exportFieldTestCsvButton.addEventListener("click", exportFieldTestCsv);
els.clearFieldTestButton.addEventListener("click", clearFieldTestData);
els.closeFeedbackButton.addEventListener("click", closeStopFeedback);
els.finishFeedbackButton.addEventListener("click", finishFeedback);
els.feedbackPrimaryActions.querySelectorAll("[data-feedback-value]").forEach(button => {
  button.addEventListener("click", () => {
    recordPrimaryFeedback(button.dataset.feedbackValue);
  });
});
els.closeNavigationModalButton.addEventListener("click", closeNavigationModal);
els.googleMapsButton.addEventListener("click", () => chooseNavigationProvider("google"));
els.appleMapsButton.addEventListener("click", () => chooseNavigationProvider("apple"));
els.resetNavigationPreferenceButton.addEventListener("click", resetNavigationPreference);
els.navigationModal.addEventListener("click", event => {
  if (event.target === els.navigationModal) closeNavigationModal();
});
els.whyButton.addEventListener("click", toggleWhyDetails);
els.fasterButton.addEventListener("click", eatSooner);
els.recheckRouteButton.addEventListener("click", recheckRouteNow);
(els.priorityChips || []).forEach(button => {
  button.addEventListener("click", () => setEatingPriority(button.dataset.priority));
});
els.enableNotificationsButton.addEventListener("click", enableNotifications);

[
  els.currentTimeInput,
  els.maxAddedInput,
  els.tripModeInput,
  els.stopTypeInput,
  els.foodPreferenceInput,
  els.chainPolicyInput,
  els.pricePreferenceInput,
  els.familyFriendlyInput,
  els.exceptionalAlertsInput,
  els.testerModeInput
].forEach(el => {
  if (!el) return;
  el.addEventListener("input", () => {
    if (state.started) updateFromControls();
  });
  el.addEventListener("change", () => {
    savePreferences();
    if (
      (
        el === els.maxAddedInput ||
        el === els.tripModeInput ||
        el === els.exceptionalAlertsInput
      ) &&
      !state.started
    ) {
      invalidateRoutePreview();
    }
    if (state.started) updateFromControls();
  });
});

window.addEventListener("beforeunload", stopLocationWatch);
window.addEventListener("focus", maybePromptForStopFeedback);
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    maybePromptForStopFeedback();
  }
});
loadPreferences();
loadSeamlessSettings();
renderRecentTrips();
renderRoutePreview();
registerServiceWorker();
