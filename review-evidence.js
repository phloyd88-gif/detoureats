/* DetourEats v1.9.4 review evidence client */
(function () {
  "use strict";

  const CACHE_KEY = "detoureats_review_evidence_v2";
  const TTL_MS = 7 * 24 * 60 * 60 * 1000;
  const MAX_REQUEST = 5;
  const inflight = new Set();
  let requestActive = false;
  let providerStatus = { status: "idle", configuredProviders: [] };

  function candidateKey(candidate) {
    const coords = Array.isArray(candidate?.coordinates)
      ? candidate.coordinates.slice(0, 2).map(v => Number(v).toFixed(4)).join(",")
      : "";
    return normalize([candidate?.name, candidate?.city, candidate?.address, coords].filter(Boolean).join("|")).slice(0, 240);
  }

  function applyCached(candidates) {
    const cache = readCache();
    return (candidates || []).map(candidate => {
      const entry = cache[candidateKey(candidate)];
      if (!entry || !isFresh(entry)) {
        return { ...candidate, reviewEvidenceStatus: entry ? "stale" : "pending" };
      }
      return applyEvidence(candidate, entry.evidence);
    });
  }

  function applyEvidence(candidate, evidence) {
    if (!evidence || evidence.status !== "ready") {
      return { ...candidate, reviewEvidence: evidence || null, reviewEvidenceStatus: evidence?.status || "unavailable" };
    }
    const food = finite(evidence.foodScore) ?? finite(candidate.foodReputation) ?? 66;
    const existingDestination = finite(candidate.destinationWorthiness) ?? 60;
    const forum = finite(evidence.components?.forumScore);
    const destination = clamp(existingDestination * .75 + food * .15 + (forum === null ? existingDestination : forum) * .10, 0, 100);
    const confirmedClosed = Boolean(evidence.businessClosed);
    return {
      ...candidate,
      reviewEvidence: evidence,
      reviewEvidenceStatus: "ready",
      reviewBackedFoodScore: Math.round(food),
      foodReputation: Math.round(food),
      reviewConfidence: Math.round(finite(evidence.confidenceScore) ?? finite(candidate.reviewConfidence) ?? 50),
      consistency: Math.round(finite(evidence.components?.consistencyScore) ?? finite(candidate.consistency) ?? 62),
      destinationWorthiness: Math.round(destination),
      evidenceSummary: evidence.summary || candidate.evidenceSummary,
      openAtArrival: confirmedClosed ? false : candidate.openAtArrival,
      hoursConfidence: confirmedClosed ? "provider_confirmed_closed" : candidate.hoursConfidence,
      operationalStatus: confirmedClosed ? "closed" : candidate.operationalStatus,
      operationalConfidence: confirmedClosed ? "high" : candidate.operationalConfidence,
      operationalReason: confirmedClosed ? (evidence.closureReason || "A connected review provider reports this business closed.") : candidate.operationalReason,
      sourceType: appendSources(candidate.sourceType, evidence.sources)
    };
  }

  async function schedule(candidates, onUpdate) {
    if (requestActive) return;
    const cache = readCache();
    const unique = [];
    const seen = new Set();
    for (const candidate of candidates || []) {
      const key = candidateKey(candidate);
      if (!key || seen.has(key) || inflight.has(key)) continue;
      seen.add(key);
      const entry = cache[key];
      if (!entry || !isFresh(entry)) unique.push(candidate);
      if (unique.length >= MAX_REQUEST) break;
    }
    if (!unique.length) return;

    requestActive = true;
    unique.forEach(c => inflight.add(candidateKey(c)));
    providerStatus = { ...providerStatus, status: "loading" };

    try {
      const response = await fetch("/api/restaurant-evidence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidates: unique.map(c => ({
            key: candidateKey(c),
            name: c.name || "",
            city: c.city || "",
            address: c.address || "",
            coordinates: Array.isArray(c.coordinates) ? c.coordinates : null
          }))
        })
      });
      const data = await response.json();
      providerStatus = {
        status: data.status || (response.ok ? "ok" : "error"),
        configuredProviders: data.configuredProviders || [],
        message: data.message || ""
      };
      if (!response.ok) throw new Error(data.message || "Review evidence request failed.");
      const next = readCache();
      for (const result of data.results || []) {
        if (!result?.key) continue;
        next[result.key] = { savedAt: Date.now(), evidence: result };
      }
      writeCache(next);
      if (typeof onUpdate === "function") onUpdate(data);
    } catch (error) {
      providerStatus = { ...providerStatus, status: "error", message: error?.message || "Review evidence could not be loaded." };
    } finally {
      unique.forEach(c => inflight.delete(candidateKey(c)));
      requestActive = false;
    }
  }

  function getProviderStatus() { return { ...providerStatus }; }
  function clearCache() { try { localStorage.removeItem(CACHE_KEY); } catch {} }
  function readCache() {
    try {
      const value = JSON.parse(localStorage.getItem(CACHE_KEY) || "{}");
      return value && typeof value === "object" ? value : {};
    } catch { return {}; }
  }
  function writeCache(cache) {
    try {
      const entries = Object.entries(cache).sort((a, b) => Number(b[1]?.savedAt || 0) - Number(a[1]?.savedAt || 0)).slice(0, 250);
      localStorage.setItem(CACHE_KEY, JSON.stringify(Object.fromEntries(entries)));
    } catch {}
  }
  function isFresh(entry) { return entry?.savedAt && Date.now() - Number(entry.savedAt) < TTL_MS; }
  function appendSources(existing, sources) {
    const names = (sources || []).map(s => title(s.provider)).filter(Boolean);
    return [existing, names.length ? `Review evidence: ${names.join(" + ")}` : ""].filter(Boolean).join(" · ");
  }
  function title(value) { return String(value || "").replace(/\b\w/g, m => m.toUpperCase()); }
  function normalize(value) { return String(value || "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/&/g, " and ").replace(/[^a-zA-Z0-9]+/g, " ").toLowerCase().replace(/\s+/g, " ").trim(); }
  function finite(value) { const n = Number(value); return Number.isFinite(n) ? n : null; }
  function clamp(value, min, max) { return Math.max(min, Math.min(max, Number(value))); }

  window.DetourEatsReviewEvidence = {
    candidateKey, applyCached, applyEvidence, schedule, getProviderStatus, clearCache
  };
})();
