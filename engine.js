/* DetourEats v0.4 Scoring Engine

Detour Score means:
"How good of a food decision is this stop for this traveler on this trip right now?"

It is not just restaurant quality.
It is restaurant quality filtered through trip fit.
*/

(function () {
  const TIER_RULES = [
    { min: 97, tier: "Bucket List Stop", state: "bucket-list" },
    { min: 92, tier: "Worth the Detour", state: "this-is-your-stop" },
    { min: 84, tier: "Best Stop Ahead", state: "found-something" },
    { min: 0, tier: "Best Available", state: "best-available" }
  ];

  function recommend(candidates, settings = {}) {
    const normalized = (candidates || []).map(normalizeCandidate);
    const visible = filterCandidates(normalized, settings);
    const scored = visible
      .map(candidate => scoreCandidate(candidate, settings, normalized))
      .sort((a, b) => b.detourScore - a.detourScore);

    const pick = scored[0] || null;

    return {
      pick,
      upcoming: scored.slice(0, 6),
      evaluated: scored,
      explanation: pick ? pick.scoreExplanation : null,
      reason: pick ? "recommended" : "no_candidate_available"
    };
  }

  function normalizeCandidate(c) {
    const added = number(c.estimatedAddedMinutes ?? c.addedMinutes ?? c.addedTime ?? c.detourMinutes, 12);
    const quality = number(c.foodReputation ?? c.quality ?? c.ratingScore ?? c.destinationEvidence, 75);
    const uniqueness = number(c.uniqueness ?? c.uniquenessScore, 60);
    const confidence = number(c.reviewConfidence ?? c.confidence ?? c.reviewStrength, 70);
    const consistency = number(c.consistency ?? c.reviewConsistency, 70);
    const destination = number(c.destinationWorthiness ?? c.destinationEvidence ?? c.destinationScore, quality);
    const seq = number(c.seq ?? c.sequence ?? c.routeIndex, 0);

    return {
      ...c,
      id: String(c.id ?? c.name ?? seq),
      name: c.name ?? "Unnamed Stop",
      seq,
      category: c.category ?? c.cuisine ?? "Local food",
      chain: Boolean(c.chain),
      estimatedAddedMinutes: added,
      foodReputation: quality,
      uniqueness,
      reviewConfidence: confidence,
      consistency,
      destinationWorthiness: destination,
      famousFor: c.famousFor ?? c.signatureDish ?? c.signatureItem ?? c.tagline ?? "Local favorite",
      evidenceSummary: c.evidenceSummary ?? c.summary ?? c.why ?? c.famousFor ?? "Strong food stop for this route.",
      arrivalClock: c.arrivalClock ?? c.arrivalTime ?? c.eta ?? "",
      openAtArrival: c.openAtArrival ?? c.isOpen ?? true,
      backtracking: Boolean(c.backtracking),
      betterOptionMilesAhead: c.betterOptionMilesAhead ?? null
    };
  }

  function filterCandidates(candidates, settings) {
    const routePosition = number(settings.routePosition, 0);
    const lookahead = number(settings.lookahead, 5);
    const maxSeq = lookahead >= 99 ? Infinity : routePosition + lookahead;

    return candidates.filter(c => {
      if (c.seq < routePosition) return false;
      if (c.seq > maxSeq) return false;
      if (settings.hideChains !== false && c.chain) return false;
      if (c.backtracking) return false;
      if (settings.hoursMode !== "warnOnly" && c.openAtArrival === false) return false;
      if (settings.candidatePool && settings.candidatePool !== "All") {
        const haystack = [
          c.category,
          c.segment,
          c.bucket,
          ...(Array.isArray(c.tags) ? c.tags : [])
        ].filter(Boolean).join(" ").toLowerCase();
        if (!haystack.includes(String(settings.candidatePool).toLowerCase())) return false;
      }
      return true;
    });
  }

  function scoreCandidate(c, settings, allCandidates) {
    const maxAdded = number(settings.maxAdded ?? settings.maxAddedMinutes, 10);

    const restaurantQuality = clamp(
      c.foodReputation * 0.38 +
      c.destinationWorthiness * 0.24 +
      c.uniqueness * 0.18 +
      c.consistency * 0.12 +
      c.reviewConfidence * 0.08
    );

    const timeFit = scoreAddedTime(c.estimatedAddedMinutes, maxAdded);
    const openFit = c.openAtArrival === false ? 45 : 100;
    const chainFit = c.chain ? 55 : 100;
    const backtrackFit = c.backtracking ? 0 : 100;
    const scarcityFit = scoreScarcity(c, allCandidates, settings);

    const tripFit = clamp(
      timeFit * 0.42 +
      openFit * 0.18 +
      chainFit * 0.10 +
      backtrackFit * 0.18 +
      scarcityFit * 0.12
    );

    let detourScore = clamp(
      restaurantQuality * 0.64 +
      tripFit * 0.36
    );

    // "Best available" rule:
    // If food quality is decent and there are no better options soon, don't undersell it.
    if (restaurantQuality >= 74 && scarcityFit >= 88) {
      detourScore = Math.max(detourScore, 84);
    }

    // Guardrail: convenience cannot make mediocre food look elite.
    if (restaurantQuality < 82) {
      detourScore = Math.min(detourScore, 89);
    }
    if (restaurantQuality < 74) {
      detourScore = Math.min(detourScore, 82);
    }

    detourScore = Math.round(detourScore);

    const tier = tierForScore(detourScore);
    const scoreExplanation = explainScore(c, {
      restaurantQuality: Math.round(restaurantQuality),
      tripFit: Math.round(tripFit),
      timeFit: Math.round(timeFit),
      scarcityFit: Math.round(scarcityFit),
      detourScore,
      tier,
      maxAdded
    });

    return {
      ...c,
      score: detourScore,
      detourScore,
      tier: tier.tier,
      tripState: tier.state,
      restaurantQuality: Math.round(restaurantQuality),
      tripFit: Math.round(tripFit),
      timeFit: Math.round(timeFit),
      scarcityFit: Math.round(scarcityFit),
      scoreExplanation
    };
  }

  function scoreAddedTime(added, maxAdded) {
    if (added <= maxAdded * 0.5) return 100;
    if (added <= maxAdded) return 94;
    if (added <= maxAdded + 5) return 82;
    if (added <= maxAdded + 12) return 64;
    if (added <= maxAdded + 25) return 42;
    return 20;
  }

  function scoreScarcity(candidate, allCandidates, settings) {
    const routePosition = number(settings.routePosition, 0);
    const windowEnd = routePosition + 8;
    const betterSoon = allCandidates.filter(other => {
      if (other.id === candidate.id) return false;
      if (other.seq <= candidate.seq) return false;
      if (other.seq > windowEnd) return false;
      if (other.chain || other.backtracking || other.openAtArrival === false) return false;
      return other.foodReputation >= candidate.foodReputation + 6;
    });

    if (betterSoon.length === 0) return 96;
    if (betterSoon.length === 1) return 76;
    return 58;
  }

  function tierForScore(score) {
    return TIER_RULES.find(rule => score >= rule.min) || TIER_RULES[TIER_RULES.length - 1];
  }

  function explainScore(c, s) {
    const bullets = [];

    if (!c.chain) bullets.push("Independent/local stop instead of a default chain.");
    if (c.estimatedAddedMinutes <= s.maxAdded) {
      bullets.push(`Only adds ${c.estimatedAddedMinutes} minutes to the trip.`);
    } else {
      bullets.push(`Adds ${c.estimatedAddedMinutes} minutes, but the food case may justify it.`);
    }

    if (s.restaurantQuality >= 90) bullets.push("Very strong food reputation for this route.");
    else if (s.restaurantQuality >= 82) bullets.push("Strong food reputation with a clear reason to stop.");
    else bullets.push("Solid available food choice for this stretch.");

    if (s.scarcityFit >= 88) bullets.push("No clearly better option is coming up soon.");
    if (c.famousFor) bullets.push(`Known for: ${c.famousFor}.`);

    return {
      restaurantQuality: s.restaurantQuality,
      tripFit: s.tripFit,
      timeFit: s.timeFit,
      scarcityFit: s.scarcityFit,
      detourScore: s.detourScore,
      tier: s.tier.tier,
      bullets
    };
  }

  function number(value, fallback) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function clamp(value, min = 0, max = 100) {
    return Math.max(min, Math.min(max, Number(value)));
  }

  window.DetourEatsEngine = {
    recommend,
    scoreCandidate,
    normalizeCandidate
  };

  // Backward-compatible global expected by app.js
  window.recommend = recommend;
})();
