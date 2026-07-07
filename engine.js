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

    const urgency = calculateMealUrgency(settings);
    const routeContext = analyzeRouteScarcity(scored, settings);

    let pick = scored[0] || null;

    const style = String(settings.tripMode || "balanced").toLowerCase();
    if (style.includes("hungry")) {
      const earliestGoodEnough = scored
        .filter(c =>
          c.openAtArrival !== false &&
          c.restaurantQuality >= 72 &&
          c.detourScore >= 76
        )
        .sort((a, b) => {
          if (a.seq !== b.seq) return a.seq - b.seq;
          return b.detourScore - a.detourScore;
        })[0];

      if (earliestGoodEnough) {
        pick = earliestGoodEnough;
      }
    }

    const decision = buildDecisionMessage(pick, scored, urgency, routeContext, settings);

    return {
      pick,
      upcoming: scored.slice(0, 6),
      evaluated: scored,
      explanation: pick ? pick.scoreExplanation : null,
      reason: pick ? "recommended" : "no_candidate_available",
      urgency,
      routeContext,
      decision
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

    const style = String(settings.tripMode || "balanced").toLowerCase();
    const distanceAhead = Math.max(0, c.seq - number(settings.routePosition, 0));
    const urgencyFit = scoreUrgency(distanceAhead, style);

    let tripFit;
    let detourScore;

    if (style.includes("hungry")) {
      tripFit = clamp(
        timeFit * 0.32 +
        openFit * 0.18 +
        chainFit * 0.08 +
        backtrackFit * 0.14 +
        scarcityFit * 0.08 +
        urgencyFit * 0.20
      );

      detourScore = clamp(
        restaurantQuality * 0.48 +
        tripFit * 0.52
      );

      if (distanceAhead <= 2 && restaurantQuality >= 72 && c.openAtArrival !== false) {
        detourScore += 7;
      }
      if (distanceAhead >= 4) {
        detourScore -= Math.min(14, (distanceAhead - 3) * 4);
      }
    } else if (style.includes("adventure") || style.includes("food")) {
      tripFit = clamp(
        timeFit * 0.24 +
        openFit * 0.16 +
        chainFit * 0.10 +
        backtrackFit * 0.15 +
        scarcityFit * 0.15 +
        urgencyFit * 0.20
      );

      detourScore = clamp(
        restaurantQuality * 0.76 +
        tripFit * 0.24
      );

      if (c.destinationWorthiness >= 92) detourScore += 4;
    } else {
      tripFit = clamp(
        timeFit * 0.42 +
        openFit * 0.18 +
        chainFit * 0.10 +
        backtrackFit * 0.18 +
        scarcityFit * 0.12
      );

      detourScore = clamp(
        restaurantQuality * 0.64 +
        tripFit * 0.36
      );
    }

    if (restaurantQuality >= 74 && scarcityFit >= 88) {
      detourScore = Math.max(detourScore, style.includes("hungry") ? 86 : 84);
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
      urgencyFit: Math.round(urgencyFit),
      style,
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
      urgencyFit: Math.round(urgencyFit),
      styleApplied: style,
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

  function scoreUrgency(distanceAhead, style) {
    if (style.includes("hungry")) {
      if (distanceAhead <= 1) return 100;
      if (distanceAhead === 2) return 92;
      if (distanceAhead === 3) return 76;
      if (distanceAhead === 4) return 58;
      return 35;
    }

    if (style.includes("adventure") || style.includes("food")) {
      if (distanceAhead <= 2) return 78;
      if (distanceAhead <= 5) return 92;
      return 84;
    }

    if (distanceAhead <= 2) return 94;
    if (distanceAhead <= 4) return 84;
    return 68;
  }

  function calculateMealUrgency(settings) {
    const currentTime = number(settings.currentTime, 720);
    const mealType = String(settings.mealType || "").toLowerCase();

    let level = "No rush";
    let score = 35;
    let explanation = "You are outside a typical meal-pressure window.";

    if (mealType.includes("breakfast")) {
      if (currentTime >= 510 && currentTime <= 660) {
        level = "Eat soon";
        score = 82;
        explanation = "You are in a strong breakfast window.";
      } else if (currentTime > 660 && currentTime <= 750) {
        level = "Stop now";
        score = 96;
        explanation = "Breakfast options may start narrowing soon.";
      }
    } else if (mealType.includes("lunch")) {
      if (currentTime >= 660 && currentTime <= 780) {
        level = "Start looking";
        score = 65;
        explanation = "Lunch timing is approaching.";
      } else if (currentTime > 780 && currentTime <= 900) {
        level = "Eat soon";
        score = 85;
        explanation = "You are in the main lunch window.";
      } else if (currentTime > 900 && currentTime <= 990) {
        level = "Stop now";
        score = 97;
        explanation = "You are late in the lunch window.";
      }
    } else if (mealType.includes("dinner")) {
      if (currentTime >= 990 && currentTime <= 1080) {
        level = "Start looking";
        score = 64;
        explanation = "Dinner timing is approaching.";
      } else if (currentTime > 1080 && currentTime <= 1230) {
        level = "Eat soon";
        score = 86;
        explanation = "You are in the main dinner window.";
      } else if (currentTime > 1230) {
        level = "Stop now";
        score = 98;
        explanation = "Late-night options may become sparse.";
      }
    } else if (currentTime >= 720 && currentTime <= 900) {
      level = "Eat soon";
      score = 80;
      explanation = "You are in a common lunch period.";
    } else if (currentTime >= 1080 && currentTime <= 1230) {
      level = "Eat soon";
      score = 82;
      explanation = "You are in a common dinner period.";
    }

    return { level, score, explanation };
  }

  function analyzeRouteScarcity(scored, settings) {
    if (!scored.length) {
      return {
        level: "Sparse",
        strongOptionsAhead: 0,
        nextStrongSeq: null,
        message: "No strong open options are currently available in the lookahead window."
      };
    }

    const strong = scored
      .filter(c => c.detourScore >= 88 && c.openAtArrival !== false)
      .sort((a, b) => a.seq - b.seq);

    const acceptable = scored
      .filter(c => c.detourScore >= 76 && c.openAtArrival !== false)
      .sort((a, b) => a.seq - b.seq);

    if (strong.length === 0) {
      return {
        level: acceptable.length ? "Limited" : "Sparse",
        strongOptionsAhead: 0,
        nextStrongSeq: null,
        message: acceptable.length
          ? "There are usable stops ahead, but no standout option in this stretch."
          : "Food options become weak in this stretch."
      };
    }

    const first = strong[0];
    const routePosition = number(settings.routePosition, 0);
    const segmentsAway = Math.max(0, first.seq - routePosition);

    if (strong.length === 1 && segmentsAway <= 2) {
      return {
        level: "Last strong option",
        strongOptionsAhead: 1,
        nextStrongSeq: first.seq,
        message: "This may be the last strong option for a while."
      };
    }

    if (segmentsAway >= 4) {
      return {
        level: "Better later",
        strongOptionsAhead: strong.length,
        nextStrongSeq: first.seq,
        message: "A stronger option exists later, but it is not close."
      };
    }

    return {
      level: "Healthy",
      strongOptionsAhead: strong.length,
      nextStrongSeq: first.seq,
      message: "Several strong options remain in the current route window."
    };
  }

  function buildDecisionMessage(pick, scored, urgency, routeContext, settings) {
    if (!pick) {
      return {
        state: "keep-driving",
        headline: "Keep driving.",
        detail: "Nothing ahead currently clears the quality bar."
      };
    }

    const laterBetter = scored
      .filter(c => c.seq > pick.seq && c.detourScore >= pick.detourScore + 5 && c.openAtArrival !== false)
      .sort((a, b) => a.seq - b.seq)[0];

    if (urgency.level === "Stop now" || routeContext.level === "Last strong option") {
      return {
        state: "stop-now",
        headline: "Stop here.",
        detail: routeContext.level === "Last strong option"
          ? "This is the last strong option for this stretch."
          : urgency.explanation
      };
    }

    if (urgency.level === "Eat soon" && pick.detourScore >= 80) {
      return {
        state: "eat-soon",
        headline: "Eat soon.",
        detail: routeContext.message
      };
    }

    if (laterBetter && urgency.score < 80) {
      return {
        state: "keep-driving",
        headline: "Keep driving.",
        detail: `A stronger option is coming up later: ${laterBetter.name}.`
      };
    }

    if (routeContext.level === "Sparse" || routeContext.level === "Limited") {
      return {
        state: "stop-now",
        headline: "Stop here.",
        detail: routeContext.message
      };
    }

    return {
      state: "good-stop",
      headline: "Good stop ahead.",
      detail: "This is the best decision for the current stretch."
    };
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
    if (s.style.includes("hungry")) bullets.push("Hungry Soon mode favors an earlier acceptable stop.");
    else if (s.style.includes("adventure") || s.style.includes("food")) bullets.push("Food Adventure mode is willing to wait for a stronger destination stop.");
    else bullets.push("Balanced mode weighs food quality and trip cost together.");
    if (c.famousFor) bullets.push(`Known for: ${c.famousFor}.`);

    return {
      restaurantQuality: s.restaurantQuality,
      tripFit: s.tripFit,
      timeFit: s.timeFit,
      scarcityFit: s.scarcityFit,
      urgencyFit: s.urgencyFit,
      style: s.style,
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
