/* DetourEats v1.7 Exceptional Detour Scoring Engine

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

    const minimumScore = number(settings.minimumScore, 0);
    const eligible = minimumScore > 0
      ? scored.filter(candidate => candidate.detourScore >= minimumScore)
      : scored;

    const urgency = calculateMealUrgency(settings);
    const routeContext = analyzeRouteScarcity(scored, settings);
    const exceptionalOpportunity = findExceptionalOpportunity(
      normalized,
      settings
    );

    let pick = chooseByChainPolicy(eligible, settings)[0] || null;

    const style = String(settings.tripMode || "balanced").toLowerCase();
    if (style.includes("hungry")) {
      const earliestGoodEnough = chooseByChainPolicy(eligible, settings)
        .filter(c =>
          c.openAtArrival !== false &&
          c.restaurantQuality >= 72 &&
          c.detourScore >= 74
        )
        .sort((a, b) => {
          const aSeq = Number(a.seq ?? 999);
          const bSeq = Number(b.seq ?? 999);
          if (aSeq !== bSeq) return aSeq - bSeq;

          const aAdded = Number(a.estimatedAddedMinutes ?? 999);
          const bAdded = Number(b.estimatedAddedMinutes ?? 999);
          if (aAdded !== bAdded) return aAdded - bAdded;

          return b.detourScore - a.detourScore;
        })[0];

      if (earliestGoodEnough) {
        pick = earliestGoodEnough;
      }
    }

    const rankedEligible = chooseByChainPolicy(
      eligible.length ? eligible : scored,
      settings
    );
    const nextAlternative = findNextAlternative(pick, rankedEligible, settings);
    const routeOutlook = buildRouteOutlook(pick, nextAlternative, rankedEligible, settings);
    const decision = buildDecisionMessage(
      pick,
      scored,
      urgency,
      routeContext,
      settings,
      nextAlternative,
      routeOutlook
    );

    return {
      pick,
      upcoming: rankedEligible.slice(0, 6),
      evaluated: scored,
      explanation: pick ? pick.scoreExplanation : null,
      reason: pick ? "recommended" : "no_candidate_available",
      urgency,
      routeContext,
      routeOutlook,
      nextAlternative,
      exceptionalOpportunity,
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
      openAtArrival:
        c.hoursConfidence === "unknown" ||
        c.hoursConfidence === "listed_not_evaluated"
          ? null
          : (c.openAtArrival ?? c.isOpen ?? true),
      hoursConfidence: c.hoursConfidence || "verified",
      provenance: c.provenance || "curated",
      discoverySource: c.discoverySource || null,
      discoveryConfidence: c.discoveryConfidence || null,
      routeOffsetMiles: number(c.routeOffsetMiles, 0),
      detourTier: c.detourTier || "practical",
      destinationEvidenceScore: number(c.destinationEvidenceScore, 0),
      destinationEvidenceLevel:
        c.destinationEvidenceLevel || "basic",
      exceptionalScan: Boolean(c.exceptionalScan),
      exceptionalOnly: Boolean(c.exceptionalOnly),
      backtracking: Boolean(c.backtracking),
      betterOptionMilesAhead: c.betterOptionMilesAhead ?? null,
      priceLevel: c.priceLevel ?? "$$",
      quickStop: Boolean(c.quickStop),
      sitDown: c.sitDown !== false,
      localFavorite: c.localFavorite !== false,
      regionalSpecialty: Boolean(c.regionalSpecialty),
      kidFriendly: Boolean(c.kidFriendly),
      easyParking: Boolean(c.easyParking)
    };
  }

  function filterCandidates(candidates, settings) {
    const routePosition = Math.max(
      number(settings.routePosition, 0),
      number(settings.deferUntilSeq, 0)
    );
    const lookahead = number(settings.lookahead, 5);
    const maxSeq = lookahead >= 99 ? Infinity : routePosition + lookahead;
    const skippedIds = new Set((settings.skippedIds || []).map(String));
    const excludedCategories = (settings.excludedCategories || []).map(value => String(value).toLowerCase());
    const stopType = String(settings.stopType || "either").toLowerCase();
    const pricePreference = String(settings.pricePreference || "any").toLowerCase();
    const chainPolicy = String(settings.chainPolicy || "avoid").toLowerCase();

    return candidates.filter(c => {
      if (c.exceptionalOnly) return false;
      if (skippedIds.has(String(c.id))) return false;
      if (c.seq < routePosition) return false;
      if (c.seq > maxSeq) return false;
      if (chainPolicy === "avoid" && c.chain) return false;
      if (c.backtracking) return false;
      if (settings.hoursMode !== "warnOnly" && c.openAtArrival === false) return false;
      if (stopType === "quick" && !c.quickStop) return false;
      if (stopType === "sitdown" && !c.sitDown) return false;
      if (pricePreference === "budget" && c.priceLevel !== "$") return false;

      const category = String(c.category || "").toLowerCase();
      if (excludedCategories.some(excluded => category.includes(excluded) || excluded.includes(category))) {
        return false;
      }

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

  function findExceptionalOpportunity(
    candidates,
    settings
  ) {
    if (settings.exceptionalAlerts === false) return null;

    const routePosition = Math.max(
      number(settings.routePosition, 0),
      number(settings.deferUntilSeq, 0)
    );
    const skippedIds = new Set(
      (settings.skippedIds || []).map(String)
    );
    const dismissedIds = new Set(
      (settings.dismissedExceptionalIds || []).map(String)
    );
    const excludedCategories = (
      settings.excludedCategories || []
    ).map(value => String(value).toLowerCase());

    const opportunities = candidates
      .filter(candidate => {
        if (skippedIds.has(String(candidate.id))) return false;
        if (dismissedIds.has(String(candidate.id))) return false;
        if (candidate.seq < routePosition) return false;
        if (candidate.backtracking) return false;
        if (candidate.openAtArrival === false) return false;
        if (candidate.chain) return false;

        const added = number(
          candidate.estimatedAddedMinutes,
          999
        );
        const offset = number(candidate.routeOffsetMiles, 0);
        if (added > 45) return false;
        if (offset > 27) return false;

        const category = String(
          candidate.category || ""
        ).toLowerCase();
        if (
          excludedCategories.some(
            excluded =>
              category.includes(excluded) ||
              excluded.includes(category)
          )
        ) {
          return false;
        }

        const discovered =
          candidate.provenance === "route-discovered" ||
          candidate.discoverySource === "openstreetmap";

        if (discovered) {
          return Boolean(
            candidate.destinationEvidenceLevel === "strong" &&
            number(candidate.destinationEvidenceScore, 0) >= 10 &&
            candidate.destinationWorthiness >= 84 &&
            candidate.uniqueness >= 72 &&
            candidate.foodReputation >= 76
          );
        }

        return Boolean(
          candidate.destinationWorthiness >= 92 &&
          candidate.uniqueness >= 85 &&
          candidate.foodReputation >= 88
        );
      })
      .map(candidate => {
        const restaurantQuality = clamp(
          candidate.foodReputation * 0.38 +
          candidate.destinationWorthiness * 0.24 +
          candidate.uniqueness * 0.18 +
          candidate.consistency * 0.12 +
          candidate.reviewConfidence * 0.08
        );

        const discovered =
          candidate.provenance === "route-discovered" ||
          candidate.discoverySource === "openstreetmap";
        const evidenceFit = discovered
          ? clamp(
              72 +
              number(
                candidate.destinationEvidenceScore,
                0
              ) * 2.5
            )
          : 98;
        const added = number(
          candidate.estimatedAddedMinutes,
          0
        );
        const offset = number(
          candidate.routeOffsetMiles,
          0
        );

        const exceptionalScore = clamp(
          restaurantQuality * 0.42 +
          candidate.destinationWorthiness * 0.25 +
          candidate.uniqueness * 0.15 +
          evidenceFit * 0.18 -
          Math.max(0, added - 15) * 0.22 -
          Math.max(0, offset - 10) * 0.08
        );

        return {
          ...candidate,
          exceptionalScore: Math.round(exceptionalScore),
          exceptionalEvidence:
            discovered
              ? "Strong available map evidence"
              : "Curated destination evidence",
          exceptionalReason:
            discovered
              ? "A strict independent scan found unusually strong destination signals for a place this far from the route."
              : "Curated quality, uniqueness, and destination-worthiness all clear the bucket-list threshold.",
          exceptionalCaveat:
            discovered
              ? "Potential bucket-list opportunity based on strong available map evidence. Food quality, reputation, and arrival hours are not independently verified."
              : "Curated bucket-list opportunity. Arrival hours should still be confirmed."
        };
      })
      .filter(candidate => candidate.exceptionalScore >= 86)
      .sort((a, b) => {
        const aMinutes = number(
          a.decisionMinutes ?? a.minutesAhead,
          a.seq * 45
        );
        const bMinutes = number(
          b.decisionMinutes ?? b.minutesAhead,
          b.seq * 45
        );

        if (aMinutes !== bMinutes) return aMinutes - bMinutes;
        return b.exceptionalScore - a.exceptionalScore;
      });

    return opportunities[0] || null;
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
    const openFit =
      c.openAtArrival === false ? 45 :
      c.openAtArrival === null ? 78 :
      100;
    const chainFit = c.chain ? 55 : 100;
    const backtrackFit = c.backtracking ? 0 : 100;
    const scarcityFit = scoreScarcity(c, allCandidates, settings);
    const preference = scorePreferences(c, settings);
    const preferenceFit = preference.score;

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
    } else if (style.includes("adventure") || style.includes("food") || style.includes("strict")) {
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

    // Preferences can meaningfully reorder otherwise similar stops without
    // making a weak restaurant look elite.
    detourScore += (preferenceFit - 75) * 0.18;

    const detourGate = scoreAdaptiveDetourGate(
      c,
      restaurantQuality,
      style,
      maxAdded
    );
    detourScore += detourGate.adjustment;
    detourScore = Math.min(detourScore, detourGate.cap);

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

    // Route-discovered places have useful route and map evidence but do
    // not have independent DetourEats food reviews. Wider candidates can
    // earn a higher provisional ceiling only when destination evidence is
    // materially stronger.
    if (
      c.provenance === "route-discovered" ||
      c.discoverySource === "openstreetmap"
    ) {
      let discoveryCap =
        c.discoveryConfidence === "medium" ? 86 : 81;

      if (
        c.destinationEvidenceLevel === "strong" &&
        c.detourTier === "extended"
      ) {
        discoveryCap = style.includes("hungry") ? 82 : 88;
      }

      if (
        c.destinationEvidenceLevel === "strong" &&
        c.detourTier === "destination"
      ) {
        discoveryCap =
          style.includes("adventure") ||
          style.includes("food") ||
          style.includes("strict")
            ? 90
            : 86;
      }

      detourScore = Math.min(detourScore, discoveryCap);
    }

    detourScore = Math.round(detourScore);

    const tier = tierForScore(detourScore);
    const scoreExplanation = explainScore(c, {
      restaurantQuality: Math.round(restaurantQuality),
      tripFit: Math.round(tripFit),
      timeFit: Math.round(timeFit),
      scarcityFit: Math.round(scarcityFit),
      urgencyFit: Math.round(urgencyFit),
      preferenceFit: Math.round(preferenceFit),
      preferenceReasons: preference.reasons,
      style,
      detourScore,
      tier,
      maxAdded,
      detourGate
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
      preferenceFit: Math.round(preferenceFit),
      styleApplied: style,
      scoreExplanation
    };
  }

  function chooseByChainPolicy(scored, settings) {
    const policy = String(settings.chainPolicy || "avoid").toLowerCase();
    if (policy !== "fallback") return scored;

    const independent = scored.filter(candidate => !candidate.chain);
    return independent.length ? independent : scored;
  }

  function scorePreferences(candidate, settings) {
    const stopType = String(settings.stopType || "either").toLowerCase();
    const foodPreference = String(settings.foodPreference || "anything").toLowerCase();
    const pricePreference = String(settings.pricePreference || "any").toLowerCase();
    const familyFriendly = Boolean(settings.familyFriendly);
    const reasons = [];
    const parts = [];

    if (stopType === "quick") {
      parts.push(candidate.quickStop ? 100 : 35);
      if (candidate.quickStop) reasons.push("Matches your quick-stop preference.");
    } else if (stopType === "sitdown") {
      parts.push(candidate.sitDown ? 100 : 35);
      if (candidate.sitDown) reasons.push("Matches your sit-down preference.");
    } else {
      parts.push(82);
    }

    if (foodPreference === "local") {
      parts.push(candidate.localFavorite ? 100 : 60);
      if (candidate.localFavorite) reasons.push("Strong local-favorite fit.");
    } else if (foodPreference === "regional") {
      parts.push(candidate.regionalSpecialty ? 100 : 55);
      if (candidate.regionalSpecialty) reasons.push("Matches your regional-specialty preference.");
    } else {
      parts.push(82);
    }

    if (pricePreference === "budget") {
      parts.push(candidate.priceLevel === "$" ? 100 : 45);
      if (candidate.priceLevel === "$") reasons.push("Fits your inexpensive-stop preference.");
    } else {
      parts.push(82);
    }

    if (familyFriendly) {
      const familyScore =
        (candidate.kidFriendly ? 55 : 20) +
        (candidate.easyParking ? 45 : 15);
      parts.push(familyScore);
      if (candidate.kidFriendly && candidate.easyParking) {
        reasons.push("Fits your easy family-stop preference.");
      } else if (candidate.kidFriendly) {
        reasons.push("Kid-friendly, though access may be less convenient.");
      }
    }

    const learned = scoreLearnedPreferences(candidate, settings.learnedPreferences);
    if (learned.hasSignal) {
      parts.push(learned.score);
      reasons.push(...learned.reasons);
    }

    const score = parts.reduce((sum, value) => sum + value, 0) / parts.length;
    return { score: clamp(score), reasons };
  }

  function scoreLearnedPreferences(candidate, profile) {
    if (!profile || number(profile.totalRatings, 0) < 1) {
      return { score: 75, reasons: [], hasSignal: false };
    }

    const parts = [];
    const reasons = [];
    const categoryKey = normalizePreferenceKey(
      candidate.category || candidate.cuisine || ""
    );
    const categorySignal = number(profile.categorySignals?.[categoryKey], 0);

    if (categoryKey && categorySignal !== 0) {
      parts.push(clamp(75 + categorySignal * 6, 45, 98));
      if (categorySignal >= 2) {
        reasons.push("Matches cuisine patterns from your prior ratings.");
      } else if (categorySignal <= -2) {
        reasons.push("This cuisine has been a weaker fit in your prior ratings.");
      }
    }

    const chainSignal = candidate.chain
      ? number(profile.chainSignal, 0)
      : number(profile.independentSignal, 0);
    if (chainSignal !== 0) {
      parts.push(clamp(75 + chainSignal * 5, 50, 96));
      if (chainSignal >= 2) {
        reasons.push(
          candidate.chain
            ? "Matches your positive chain-stop history."
            : "Matches your positive independent-stop history."
        );
      }
    }

    if (candidate.quickStop && number(profile.quickSignal, 0) !== 0) {
      parts.push(clamp(75 + number(profile.quickSignal, 0) * 5, 50, 96));
    }

    if (candidate.sitDown && number(profile.sitDownSignal, 0) !== 0) {
      parts.push(clamp(75 + number(profile.sitDownSignal, 0) * 5, 50, 96));
    }

    if (candidate.localFavorite && number(profile.localSignal, 0) !== 0) {
      parts.push(clamp(75 + number(profile.localSignal, 0) * 5, 50, 96));
    }

    if (
      candidate.regionalSpecialty &&
      number(profile.regionalSignal, 0) !== 0
    ) {
      parts.push(clamp(75 + number(profile.regionalSignal, 0) * 5, 50, 96));
    }

    if (!parts.length) {
      return { score: 75, reasons: [], hasSignal: false };
    }

    return {
      score: parts.reduce((sum, value) => sum + value, 0) / parts.length,
      reasons,
      hasSignal: true
    };
  }

  function normalizePreferenceKey(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  function scoreAdaptiveDetourGate(
    candidate,
    restaurantQuality,
    style,
    maxAdded
  ) {
    const added = number(candidate.estimatedAddedMinutes, 0);
    const offset = number(candidate.routeOffsetMiles, 0);
    const evidence = number(candidate.destinationEvidenceScore, 0);
    const isDiscovered =
      candidate.provenance === "route-discovered" ||
      candidate.discoverySource === "openstreetmap";
    const adventure =
      style.includes("adventure") ||
      style.includes("food") ||
      style.includes("strict");
    const hungry = style.includes("hungry");

    let requiredQuality = 70;
    let cap = 100;
    let adjustment = 0;
    let label = "Practical detour";

    if (added > maxAdded || offset > 5) {
      requiredQuality = 78;
      label = "Extended detour";
    }
    if (added > 20 || offset > 15) {
      requiredQuality = 84;
      label = "Destination-level detour";
    }
    if (added > 35 || offset > 22) {
      requiredQuality = 90;
      label = "Rare destination detour";
    }
    if (added > 50) {
      requiredQuality = 94;
      label = "Exceptional detour only";
    }

    if (hungry && (added > maxAdded + 8 || offset > 8)) {
      cap = Math.min(cap, 76);
      adjustment -= 12;
    }

    const qualityShortfall = Math.max(
      0,
      requiredQuality - restaurantQuality
    );
    if (qualityShortfall > 0) {
      adjustment -= qualityShortfall * 1.25;
      cap = Math.min(
        cap,
        added > 35 ? 72 :
        added > 20 ? 78 :
        84
      );
    } else if (added > maxAdded) {
      adjustment += adventure ? 4 : 1;
    }

    if (isDiscovered && offset > 5) {
      const requiredEvidence =
        offset > 15 || added > 30 ? 8 : 4;
      const evidenceShortfall = Math.max(
        0,
        requiredEvidence - evidence
      );

      if (evidenceShortfall > 0) {
        adjustment -= evidenceShortfall * 3;
        cap = Math.min(cap, offset > 15 ? 76 : 82);
      } else if (adventure) {
        adjustment += Math.min(5, evidence - requiredEvidence + 1);
      }
    }

    return {
      label,
      requiredQuality,
      qualityShortfall: Math.round(qualityShortfall),
      evidence,
      adjustment: Math.round(adjustment * 10) / 10,
      cap
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

    if (style.includes("adventure") || style.includes("food") || style.includes("strict")) {
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
    const style = String(settings.tripMode || "balanced").toLowerCase();

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

    // The user's selected trip style is an explicit preference signal.
    // Hungry Soon must never conflict with a low clock-based urgency label.
    if (style.includes("hungry")) {
      if (level === "No rush" || level === "Start looking") {
        level = "Eat soon";
        score = Math.max(score, 88);
        explanation = "Hungry Soon mode tells DetourEats to prioritize stopping earlier.";
      } else {
        score = Math.max(score, 88);
        explanation = `${explanation} Hungry Soon mode reinforces an earlier stop.`;
      }
    }

    // Food Adventure is more willing to wait unless the clock already says Stop now.
    if ((style.includes("adventure") || style.includes("food") || style.includes("strict")) && level !== "Stop now") {
      if (level === "Eat soon") {
        level = "Start looking";
        score = Math.min(score, 68);
        explanation = "Food Adventure mode is willing to wait for a stronger destination stop.";
      } else if (level === "No rush") {
        explanation = "Food Adventure mode can wait for a stronger destination stop.";
      }
    }

    return { level, score, explanation, styleApplied: style };
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

  function findNextAlternative(pick, rankedCandidates, settings) {
    if (!pick) return rankedCandidates[0] || null;

    return rankedCandidates
      .filter(candidate =>
        candidate.id !== pick.id &&
        candidate.openAtArrival !== false &&
        Number(candidate.seq) > Number(pick.seq)
      )
      .sort((a, b) => {
        const seqGap = Number(a.seq) - Number(b.seq);
        if (seqGap !== 0) return seqGap;
        return Number(b.detourScore) - Number(a.detourScore);
      })[0] || null;
  }

  function buildRouteOutlook(pick, nextAlternative, rankedCandidates, settings) {
    if (!pick) {
      return {
        level: "Watching",
        label: "No decision yet",
        stopMessage: "DetourEats is still watching the route.",
        skipMessage: "No qualifying stop is ready yet."
      };
    }

    const routePosition = number(settings.routePosition, 0);
    const currentSeq = number(pick.seq, routePosition);
    const nextSeq = nextAlternative ? number(nextAlternative.seq, currentSeq + 1) : null;
    const segmentGap = nextSeq === null ? null : Math.max(1, nextSeq - currentSeq);
    const minutesPerSegment = 42;
    const waitMinutes = segmentGap === null ? null : segmentGap * minutesPerSegment;
    const scoreDifference = nextAlternative
      ? number(nextAlternative.detourScore, 0) - number(pick.detourScore, 0)
      : null;

    let level = "Stable";
    let label = "Options remain available";
    let skipMessage = nextAlternative
      ? `If you skip, ${nextAlternative.name} is roughly ${formatRouteMinutes(waitMinutes)} later.`
      : "If you skip, there is no other qualifying stop in the current route window.";

    if (!nextAlternative) {
      level = "Sparse";
      label = "Weak stretch ahead";
    } else if (segmentGap >= 4) {
      level = "Sparse";
      label = "Long gap ahead";
    } else if (scoreDifference >= 6) {
      level = "Improving";
      label = "Stronger option later";
    } else if (scoreDifference <= -6) {
      level = "Declining";
      label = "Current stop is stronger";
    } else if (segmentGap <= 2) {
      level = "Healthy";
      label = "Another option is close";
    }

    if (nextAlternative) {
      if (scoreDifference >= 6) {
        skipMessage =
          `If you skip, ${nextAlternative.name} is about ${formatRouteMinutes(waitMinutes)} later and scores ${Math.abs(scoreDifference)} points higher.`;
      } else if (scoreDifference <= -6) {
        skipMessage =
          `If you skip, the next qualifying stop is about ${formatRouteMinutes(waitMinutes)} later and scores ${Math.abs(scoreDifference)} points lower.`;
      } else {
        skipMessage =
          `If you skip, ${nextAlternative.name} is about ${formatRouteMinutes(waitMinutes)} later with a similar score.`;
      }
    }

    let stopMessage =
      `Stop here and you can eat in about ${formatRouteMinutes(Math.max(8, segmentGap === null ? 18 : segmentGap * 12))}, with ${pick.estimatedAddedMinutes} minutes added to the trip.`;

    if (level === "Sparse" || level === "Declining") {
      stopMessage =
        `This is the stronger decision now. The route gets weaker after this stop.`;
    } else if (level === "Improving") {
      stopMessage =
        `This is good enough now, but a stronger option exists later if you are comfortable waiting.`;
    }

    return {
      level,
      label,
      waitMinutes,
      segmentGap,
      scoreDifference,
      nextAlternativeId: nextAlternative?.id || null,
      stopMessage,
      skipMessage
    };
  }

  function formatRouteMinutes(totalMinutes) {
    const minutes = Math.max(0, Math.round(number(totalMinutes, 0)));
    if (minutes < 60) return `${minutes} minutes`;
    const hours = Math.floor(minutes / 60);
    const remainder = minutes % 60;
    if (!remainder) return `${hours} hour${hours === 1 ? "" : "s"}`;
    return `${hours} hr ${remainder} min`;
  }

  function buildDecisionMessage(
    pick,
    scored,
    urgency,
    routeContext,
    settings,
    nextAlternative,
    routeOutlook
  ) {
    if (!pick) {
      return {
        state: "keep-driving",
        headline: "Keep driving.",
        detail: "Nothing ahead currently clears the quality bar."
      };
    }

    const laterBetter = nextAlternative &&
      nextAlternative.detourScore >= pick.detourScore + 5
        ? nextAlternative
        : null;

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
        detail: routeOutlook?.skipMessage || `A stronger option is coming up later: ${laterBetter.name}.`
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

    if (
      c.provenance === "route-discovered" ||
      c.discoverySource === "openstreetmap"
    ) {
      bullets.push("Route-discovered option with incomplete editorial quality data.");
      if (c.routeOffsetMiles > 5) {
        bullets.push(
          `Adaptive search found it about ${c.routeOffsetMiles.toFixed(1)} miles from the route.`
        );
      }
      if (c.destinationEvidenceLevel === "strong") {
        bullets.push(
          "It cleared the wider-search evidence threshold before detour time was considered."
        );
      }
      if (c.openAtArrival === null) {
        bullets.push("Published hours were not verified against the estimated arrival time.");
      }
    } else if (!c.chain) {
      bullets.push("Independent/local stop instead of a default chain.");
    }
    if (c.estimatedAddedMinutes <= s.maxAdded) {
      bullets.push(`Only adds ${c.estimatedAddedMinutes} minutes to the trip.`);
    } else {
      bullets.push(`Adds ${c.estimatedAddedMinutes} minutes, but the food case may justify it.`);
    }

    if (s.restaurantQuality >= 90) bullets.push("Very strong food reputation for this route.");
    else if (s.restaurantQuality >= 82) bullets.push("Strong food reputation with a clear reason to stop.");
    else bullets.push("Solid available food choice for this stretch.");

    if (s.detourGate?.label && s.detourGate.label !== "Practical detour") {
      bullets.push(
        `${s.detourGate.label}: the quality requirement rises as added time and route distance increase.`
      );
    }
    if (s.scarcityFit >= 88) bullets.push("No clearly better option is coming up soon.");
    if (s.style.includes("hungry")) bullets.push("Hungry Soon mode favors an earlier acceptable stop.");
    else if (s.style.includes("adventure") || s.style.includes("food")) bullets.push("Food Adventure mode is willing to wait for a stronger destination stop.");
    else bullets.push("Balanced mode weighs food quality and trip cost together.");
    (s.preferenceReasons || []).forEach(reason => bullets.push(reason));
    if (c.famousFor) bullets.push(`Known for: ${c.famousFor}.`);

    return {
      restaurantQuality: s.restaurantQuality,
      tripFit: s.tripFit,
      timeFit: s.timeFit,
      scarcityFit: s.scarcityFit,
      urgencyFit: s.urgencyFit,
      preferenceFit: s.preferenceFit,
      preferenceReasons: s.preferenceReasons,
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
