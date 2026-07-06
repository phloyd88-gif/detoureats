const state = {
  settings: {
    destination: "Myrtle Beach, SC",
    routePosition: 0,
    candidatePool: "All",
    corridor: "All",
    lookahead: 5,
    travelDay: "monday",
    hoursMode: "requireOpen",
    mealMode: "auto",
    currentTime: 480,
    mealType: "lunch",
    maxAdded: 10,
    tripMode: "balanced",
    hideChains: true
  },
  latestResult: null,
  skippedNames: new Set()
};

const els = {
  setupScreen: document.getElementById("setupScreen"),
  driveScreen: document.getElementById("driveScreen"),
  destinationInput: document.getElementById("destinationInput"),
  currentTimeInput: document.getElementById("currentTimeInput"),
  maxAddedInput: document.getElementById("maxAddedInput"),
  tripModeInput: document.getElementById("tripModeInput"),
  startTripButton: document.getElementById("startTripButton"),
  enableNotificationsButton: document.getElementById("enableNotificationsButton"),
  backButton: document.getElementById("backButton"),
  tripTitle: document.getElementById("tripTitle"),
  tripSubtitle: document.getElementById("tripSubtitle"),
  decisionCard: document.getElementById("decisionCard"),
  takeMeThereButton: document.getElementById("takeMeThereButton"),
  skipButton: document.getElementById("skipButton"),
  routePositionInput: document.getElementById("routePositionInput"),
  routePositionLabel: document.getElementById("routePositionLabel"),
  lookaheadInput: document.getElementById("lookaheadInput"),
  candidatePoolInput: document.getElementById("candidatePoolInput"),
  hoursModeInput: document.getElementById("hoursModeInput"),
  detailsPanel: document.getElementById("detailsPanel"),
  upcomingPanel: document.getElementById("upcomingPanel"),
  toast: document.getElementById("toast"),
  demoToggleButton: document.getElementById("demoToggleButton"),
  debugPanel: document.getElementById("debugPanel")
};

function routePositionLabel(pos) {
  if (pos === 0) return "Start of route";
  const candidate = candidates.find(c => c.seq === pos);
  return candidate ? `Past ${candidate.name}` : `${pos} stops into route`;
}

function updateSettingsFromControls() {
  state.settings.destination = els.destinationInput.value.trim() || "your destination";
  state.settings.currentTime = Number(els.currentTimeInput.value);
  state.settings.maxAdded = Number(els.maxAddedInput.value);
  state.settings.tripMode = els.tripModeInput.value;
  state.settings.routePosition = Number(els.routePositionInput.value);
  state.settings.lookahead = Number(els.lookaheadInput.value);
  state.settings.candidatePool = els.candidatePoolInput.value;
  state.settings.hoursMode = els.hoursModeInput.value;
}

function filteredCandidates() {
  return candidates.filter(c => !state.skippedNames.has(c.name));
}

function showToast(title, body) {
  els.toast.innerHTML = `<strong>${title}</strong><span>${body}</span>`;
  els.toast.classList.remove("hidden");
  setTimeout(() => els.toast.classList.add("hidden"), 5500);

  if ("Notification" in window && Notification.permission === "granted") {
    new Notification(title, { body, icon: "icons/icon-192.svg" });
  }
}

function notificationCopy(result) {
  if (!result.pick) {
    return {
      title: "Keep driving",
      body: "Nothing worth interrupting you for in the current window."
    };
  }
  const p = result.pick;
  const tier = result.tier.label;

  if (tier === "Worth the Detour") {
    return {
      title: "Worth the Detour ahead",
      body: `${p.name} · Score ${p.score} · adds ${p.estimatedAddedMinutes} min · open at ${p.arrivalClock}.`
    };
  }

  if (tier === "Best Breakfast Ahead") {
    return {
      title: "Best breakfast ahead",
      body: `${p.name} · adds ${p.estimatedAddedMinutes} min · ${p.hours.label.toLowerCase()}.`
    };
  }

  return {
    title: tier,
    body: `${p.name} · Score ${p.score} · adds ${p.estimatedAddedMinutes} min.`
  };
}

function renderDecision() {
  const result = recommend(filteredCandidates(), state.settings);
  state.latestResult = result;

  els.routePositionLabel.textContent = routePositionLabel(state.settings.routePosition);
  els.tripTitle.textContent = `Driving to ${state.settings.destination}`;
  els.tripSubtitle.textContent = "Running quietly in the background";

  const p = result.pick;
  if (!p) {
    els.decisionCard.innerHTML = `
      <div class="empty">
        <div class="badge wait">Keep Driving</div>
        <h2>Nothing worth stopping for yet.</h2>
        <p>We would keep watching and check again as the route changes.</p>
      </div>
    `;
    els.takeMeThereButton.disabled = true;
    els.detailsPanel.innerHTML = `
      <h2>Why no pick?</h2>
      <p class="hint">No eligible candidate is open at arrival, within the lookahead window, and inside your added-time settings.</p>
    `;
    els.upcomingPanel.innerHTML = "";
    return;
  }

  els.takeMeThereButton.disabled = false;

  const badgeClass = result.tier.className ? `badge ${result.tier.className}` : "badge";
  els.decisionCard.innerHTML = `
    <div class="${badgeClass}">${result.tier.label}</div>
    <p class="score-label">Detour Score</p>
    <div class="score">${p.score}</div>
    <h2 class="place-name">${p.name}</h2>
    <p class="meta">${p.cuisine} · ${p.price}</p>
    <div class="fact-grid">
      <div class="fact"><strong>${p.estimatedAddedMinutes} min</strong><span>estimated added trip time</span></div>
      <div class="fact highlight"><strong>${p.famousFor}</strong><span>famous for</span></div>
      <div class="fact"><strong>${p.arrivalClock}</strong><span>arrival · ${p.autoMeal} · fit ${p.mealFit}/10</span></div>
      <div class="fact"><strong>${p.hours.label}</strong><span>${p.hours.display}</span></div>
    </div>
  `;

  els.detailsPanel.innerHTML = `
    <h2>Why this pick?</h2>
    <p>${p.evidenceSummary || "This candidate has the best combination of evidence, trip fit, meal fit, and open-at-arrival status."}</p>
    <ul class="details-list">
      <li><strong>Candidate type:</strong> ${p.candidateType}</li>
      <li><strong>City:</strong> ${p.city}</li>
      <li><strong>Route segment:</strong> ${p.segment}</li>
      <li><strong>Internet evidence:</strong> ${p.evidence}/10</li>
      <li><strong>Meal fit:</strong> ${p.mealFit}/10</li>
      <li><strong>Hours:</strong> ${p.hours.label} (${p.hours.display})</li>
    </ul>
    ${(p.sources || []).length ? `<h3>Sources</h3><ul class="details-list">${p.sources.map(src => `<li><a href="${src}" target="_blank">${src}</a></li>`).join("")}</ul>` : ""}
  `;

  els.upcomingPanel.innerHTML = `
    <h2>Upcoming Worthy Stops</h2>
    <p class="hint">These are ranked within the current lookahead window.</p>
    ${result.upcoming.map((item, idx) => `
      <div class="stop-row">
        <div class="mini-score">${item.score}</div>
        <div>
          <strong>${idx + 1}. ${item.name}</strong>
          <span>${item.city} · ${item.arrivalClock} ${item.autoMeal} · ${item.hours.label} · adds ${item.estimatedAddedMinutes} min</span>
        </div>
      </div>
    `).join("")}
  `;
}

function startTrip() {
  updateSettingsFromControls();
  els.setupScreen.classList.add("hidden");
  els.driveScreen.classList.remove("hidden");
  renderDecision();

  const copy = notificationCopy(state.latestResult);
  showToast(copy.title, copy.body);
}

function openMapsForPick() {
  const p = state.latestResult?.pick;
  if (!p) return;

  const query = encodeURIComponent(`${p.name} ${p.city}`);
  window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, "_blank", "noopener");
}

function skipPick() {
  const p = state.latestResult?.pick;
  if (!p) return;
  state.skippedNames.add(p.name);
  renderDecision();
  const copy = notificationCopy(state.latestResult);
  showToast("Skipped", copy.body);
}

async function requestNotifications() {
  if (!("Notification" in window)) {
    showToast("Notifications unavailable", "This browser does not support web notifications.");
    return;
  }

  const result = await Notification.requestPermission();
  if (result === "granted") {
    showToast("Notifications enabled", "DetourEats can now show test trip alerts in this browser.");
  } else {
    showToast("Notifications not enabled", "You can still use the in-app alerts.");
  }
}

function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("service-worker.js").catch(() => {});
  }
}

els.startTripButton.addEventListener("click", startTrip);
els.enableNotificationsButton.addEventListener("click", requestNotifications);
els.backButton.addEventListener("click", () => {
  els.driveScreen.classList.add("hidden");
  els.setupScreen.classList.remove("hidden");
});
els.takeMeThereButton.addEventListener("click", openMapsForPick);
els.skipButton.addEventListener("click", skipPick);

els.demoToggleButton.addEventListener("click", () => {
  const hidden = els.debugPanel.classList.toggle("hidden");
  els.demoToggleButton.textContent = hidden ? "Show Demo Controls" : "Hide Demo Controls";
});

[
  els.routePositionInput,
  els.lookaheadInput,
  els.candidatePoolInput,
  els.hoursModeInput,
  els.currentTimeInput,
  els.maxAddedInput,
  els.tripModeInput
].forEach(el => {
  el.addEventListener("input", () => {
    updateSettingsFromControls();
    renderDecision();
  });
  el.addEventListener("change", () => {
    updateSettingsFromControls();
    renderDecision();
  });
});

registerServiceWorker();
