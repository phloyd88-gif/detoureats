/* DetourEats v2.0.6 Review-Backed Scoring Engine

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
    let visible = filterCandidates(normalized, settings);
    let usedDeferredFallback = false;

    if (
      !visible.length &&
      String(settings.skipIntent?.reason || "") === "not-hungry" &&
      number(settings.deferUntilSeq, 0) > number(settings.routePosition, 0)
    ) {
      visible = filterCandidates(normalized, {
        ...settings,
        deferUntilSeq: number(settings.routePosition, 0)
      });
      usedDeferredFallback = true;
    }

    let scored = visible
      .map(candidate => scoreCandidate(candidate, settings, normalized))
      .sort(compareScoredCandidates);

    // Skip reasons are one-step preferences, not hard filters. If earlier trip
    // adjustments leave the normal candidate window empty, widen the search to
    // the remaining safe, forward, open candidates rather than showing a false
    // "quality bar" dead end.
    let usedSkipFallbackWindow = false;
    if (!scored.length && settings.skipIntent) {
      visible = filterCandidatesForSkipFallback(normalized, settings);
      scored = visible
        .map(candidate => scoreCandidate(candidate, settings, normalized))
        .sort(compareScoredCandidates);
      usedSkipFallbackWindow = scored.length > 0;
    }

    // Availability fallback: user preferences should rank results, not erase
    // every route-safe restaurant. If the normal window is empty, retain the
    // best remaining open, forward option and explain that it is a fallback.
    let usedAvailabilityFallback = false;
    if (!scored.length && normalized.length) {
      visible = filterCandidatesForAvailabilityFallback(normalized, settings);
      scored = visible
        .map(candidate => scoreCandidate(candidate, settings, normalized))
        .sort(compareScoredCandidates);
      usedAvailabilityFallback = scored.length > 0;
    }

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

    const policyEligible = chooseByChainPolicy(eligible, settings);
    const policyScored = chooseByChainPolicy(scored, settings);
    const rankedForSelection = policyEligible.length ? policyEligible : policyScored;
    let pick = rankedForSelection[0] || null;
    const skipSelection = selectBySkipIntent(policyScored, settings);

    if (skipSelection.pick) {
      pick = skipSelection.pick;
    }

    const style = String(settings.tripMode || "balanced").toLowerCase();
    if (style.includes("hungry") && !skipSelection.lockPick) {
      const earliestGoodEnough = rankedForSelection
        .filter(c =>
          c.openAtArrival !== false &&
          c.restaurantQuality >= 72 &&
          c.detourScore >= 74
        )
        .sort((a, b) => {
          const aAhead = candidateMinutesAhead(a, settings);
          const bAhead = candidateMinutesAhead(b, settings);
          if (aAhead !== bAhead) return aAhead - bAhead;

          const aAdded = Number(a.estimatedAddedMinutes ?? 999);
          const bAdded = Number(b.estimatedAddedMinutes ?? 999);
          if (aAdded !== bAdded) return aAdded - bAdded;

          return b.detourScore - a.detourScore;
        })[0];

      if (earliestGoodEnough) {
        pick = earliestGoodEnough;
      }
    }

    const preferredCandidateId = String(settings.preferredCandidateId || "");
    if (preferredCandidateId) {
      const preferred = policyScored.find(
        candidate => String(candidate.id) === preferredCandidateId
      );
      if (preferred) pick = preferred;
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
      eligibilityDiagnostics: buildEligibilityDiagnostics(normalized, settings),
      evaluated: scored,
      explanation: pick ? pick.scoreExplanation : null,
      reason: pick ? "recommended" : "no_candidate_available",
      urgency,
      routeContext,
      routeOutlook,
      nextAlternative,
      exceptionalOpportunity,
      decision,
      preferenceOutcome: usedDeferredFallback && !skipSelection.outcome
        ? {
            matched: false,
            label: "No later stop available",
            message: "The route window has no later qualifying stop, so the best remaining option is shown as a fallback."
          }
        : (skipSelection.outcome || (usedSkipFallbackWindow
          ? {
              matched: false,
              label: "Best remaining fallback",
              message: "The normal preference window had no result, so DetourEats widened the search and kept the best safe option visible."
            }
          : (usedAvailabilityFallback
            ? {
                matched: false,
                label: "Best available fallback",
                message: "No restaurant matched every active preference, so DetourEats kept the strongest open, forward option visible instead of returning no result."
              }
            : null)))
    };
  }

  function candidateMinutesAhead(candidate, settings = {}) {
    const direct = Number(candidate?.minutesAhead);
    if (Number.isFinite(direct)) return Math.max(0, direct);

    const decision = Number(candidate?.decisionMinutes);
    if (Number.isFinite(decision)) return Math.max(0, decision + 10);

    // Demo/curated route sequence values are ordering markers, not 45-minute
    // route segments. Use the same conservative 18-minute estimate shown by
    // the client UI so timing comparisons remain internally consistent.
    const routePosition = number(settings.routePosition, 0);
    const sequenceGap = Math.max(
      0,
      number(candidate?.seq, routePosition) - routePosition
    );
    return sequenceGap === 0 ? 3 : Math.max(6, sequenceGap * 18);
  }

  function candidateCuisine(candidate) {
    return String(candidate?.cuisine || candidate?.category || "").trim();
  }

  function priceRank(value) {
    const text = String(value || "").trim();
    if (!text) return 99;
    const dollars = (text.match(/\$/g) || []).length;
    return dollars || 99;
  }

  function formatPreferenceMinutes(value) {
    const minutes = Math.max(0, Math.round(number(value, 0)));
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const remainder = minutes % 60;
    return remainder ? `${hours} hr ${remainder} min` : `${hours} hr`;
  }

  function selectBySkipIntent(ranked, settings = {}) {
    const intent = settings.skipIntent;
    if (!intent || !ranked.length) {
      return { pick: null, lockPick: false, outcome: null };
    }

    const candidates = ranked.filter(candidate =>
      String(candidate.id) !== String(intent.referenceId || "")
    );
    if (!candidates.length) {
      return {
        pick: null,
        lockPick: false,
        outcome: {
          matched: false,
          label: "No alternative available",
          message: "No remaining open stop matches this request yet."
        }
      };
    }

    const byScore = [...candidates].sort(compareScoredCandidates);
    const referenceAhead = number(intent.referenceMinutesAhead, Infinity);
    const referenceAdded = number(intent.referenceAddedMinutes, Infinity);
    const referencePrice = priceRank(intent.referencePriceLevel);
    const reason = String(intent.reason || "");

    if (reason === "need-faster") {
      const strict = candidates
        .filter(candidate => {
          const ahead = candidateMinutesAhead(candidate, settings);
          const added = number(candidate.estimatedAddedMinutes, Infinity);
          return ahead < referenceAhead && added < referenceAdded;
        })
        .sort((a, b) => {
          const aTotal = candidateMinutesAhead(a, settings) + number(a.estimatedAddedMinutes, 999) * 0.75;
          const bTotal = candidateMinutesAhead(b, settings) + number(b.estimatedAddedMinutes, 999) * 0.75;
          if (aTotal !== bTotal) return aTotal - bTotal;
          return b.detourScore - a.detourScore;
        });

      const practical = strict.length ? strict : candidates
        .filter(candidate => {
          const ahead = candidateMinutesAhead(candidate, settings);
          const added = number(candidate.estimatedAddedMinutes, Infinity);
          return (
            ahead <= referenceAhead &&
            (
              (ahead < referenceAhead && added <= referenceAdded + 2) ||
              added < referenceAdded
            )
          );
        })
        .sort((a, b) => {
          const aAhead = candidateMinutesAhead(a, settings);
          const bAhead = candidateMinutesAhead(b, settings);
          if (aAhead !== bAhead) return aAhead - bAhead;
          const aAdded = number(a.estimatedAddedMinutes, 999);
          const bAdded = number(b.estimatedAddedMinutes, 999);
          if (aAdded !== bAdded) return aAdded - bAdded;
          return b.detourScore - a.detourScore;
        });

      if (practical.length) {
        const pick = practical[0];
        return {
          pick,
          lockPick: true,
          outcome: {
            matched: true,
            label: "Faster option found",
            message: `${pick.name} is ${formatPreferenceMinutes(candidateMinutesAhead(pick, settings))} ahead and adds ${Math.round(number(pick.estimatedAddedMinutes, 0))} min.`
          }
        };
      }

      const fallback = [...candidates].sort((a, b) => {
        const aAhead = candidateMinutesAhead(a, settings);
        const bAhead = candidateMinutesAhead(b, settings);
        if (aAhead !== bAhead) return aAhead - bAhead;
        const aAdded = number(a.estimatedAddedMinutes, 999);
        const bAdded = number(b.estimatedAddedMinutes, 999);
        if (aAdded !== bAdded) return aAdded - bAdded;
        return b.detourScore - a.detourScore;
      })[0];

      return {
        pick: fallback,
        lockPick: true,
        outcome: {
          matched: false,
          label: "No truly faster alternative",
          message: `The earliest remaining stop is ${formatPreferenceMinutes(candidateMinutesAhead(fallback, settings))} ahead, so it is being shown as the best fallback, not as a faster result.`
        }
      };
    }

    if (reason === "too-far") {
      const closer = candidates
        .filter(candidate => number(candidate.estimatedAddedMinutes, Infinity) < referenceAdded)
        .sort((a, b) => {
          const aAdded = number(a.estimatedAddedMinutes, 999);
          const bAdded = number(b.estimatedAddedMinutes, 999);
          if (aAdded !== bAdded) return aAdded - bAdded;
          const aAhead = candidateMinutesAhead(a, settings);
          const bAhead = candidateMinutesAhead(b, settings);
          if (aAhead !== bAhead) return aAhead - bAhead;
          return b.detourScore - a.detourScore;
        });
      const pick = closer[0] || [...candidates].sort((a, b) =>
        number(a.estimatedAddedMinutes, 999) - number(b.estimatedAddedMinutes, 999) ||
        candidateMinutesAhead(a, settings) - candidateMinutesAhead(b, settings) ||
        b.detourScore - a.detourScore
      )[0];
      const matched = number(pick.estimatedAddedMinutes, Infinity) < referenceAdded;
      return {
        pick,
        lockPick: true,
        outcome: {
          matched,
          label: matched ? "Shorter detour found" : "No shorter detour available",
          message: matched
            ? `${pick.name} adds ${Math.round(number(pick.estimatedAddedMinutes, 0))} min, less than the skipped stop.`
            : `${pick.name} has the smallest remaining detour, but it is not shorter than the skipped stop.`
        }
      };
    }

    if (reason === "not-hungry") {
      const later = candidates
        .filter(candidate => candidateMinutesAhead(candidate, settings) >= referenceAhead + number(intent.minimumLaterMinutes, 10))
        .sort((a, b) => candidateMinutesAhead(a, settings) - candidateMinutesAhead(b, settings) || b.detourScore - a.detourScore);
      const pick = later[0] || byScore[0];
      const matched = candidateMinutesAhead(pick, settings) > referenceAhead;
      return {
        pick,
        lockPick: true,
        outcome: {
          matched,
          label: matched ? "Later stop selected" : "No later stop available",
          message: matched
            ? `${pick.name} is farther down the route at ${formatPreferenceMinutes(candidateMinutesAhead(pick, settings))} ahead.`
            : "No later qualifying stop is available, so the best remaining option is shown as a fallback."
        }
      };
    }

    if (reason === "too-expensive") {
      const cheaper = candidates
        .filter(candidate => priceRank(candidate.priceLevel) < referencePrice)
        .sort((a, b) => priceRank(a.priceLevel) - priceRank(b.priceLevel) || b.detourScore - a.detourScore);
      const priced = candidates
        .filter(candidate => priceRank(candidate.priceLevel) < 99)
        .sort((a, b) => priceRank(a.priceLevel) - priceRank(b.priceLevel) || b.detourScore - a.detourScore);
      const pick = cheaper[0] || priced[0] || byScore[0];
      const matched = referencePrice < 99 && priceRank(pick.priceLevel) < referencePrice;
      return {
        pick,
        lockPick: true,
        outcome: {
          matched,
          label: matched ? "Cheaper option found" : "Cheapest available fallback",
          message: matched
            ? `${pick.name} is listed at a lower price tier (${pick.priceLevel}).`
            : "No clearly cheaper option is available from the current price data, so the best lower-cost candidate is shown."
        }
      };
    }

    if (reason === "wrong-cuisine") {
      const excluded = String(intent.excludedCategory || intent.referenceCategory || "").toLowerCase();
      const different = candidates.filter(candidate => {
        const category = candidateCuisine(candidate).toLowerCase();
        return !excluded || (category && category !== excluded && !category.includes(excluded) && !excluded.includes(category));
      });
      const pick = (different.length ? different : byScore)[0];
      const matched = different.includes(pick);
      return {
        pick,
        lockPick: true,
        outcome: {
          matched,
          label: matched ? "Different cuisine selected" : "Cuisine fallback",
          message: matched
            ? `${pick.name} is outside the cuisine category you skipped.`
            : "No clearly different cuisine is available in the current route window."
        }
      };
    }

    if (reason === "show-better") {
      const target = number(intent.targetScore, number(settings.minimumScore, 0));
      const stronger = candidates.filter(candidate => candidate.detourScore >= target);
      const pick = (stronger.length ? stronger : byScore)[0];
      const matched = pick.detourScore >= target;
      return {
        pick,
        lockPick: true,
        outcome: {
          matched,
          label: matched ? "Stronger stop found" : "Best available fallback",
          message: matched
            ? `${pick.name} clears the requested Detour Score of ${Math.round(target)}.`
            : `Nothing remaining reaches ${Math.round(target)}, so the strongest available stop is shown instead of returning no results.`
        }
      };
    }

    return { pick: null, lockPick: false, outcome: null };
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
      operationalStatus:
        c.operationalStatus || "unverified",
      operationalConfidence:
        c.operationalConfidence || "unknown",
      operationalReason:
        c.operationalReason || "",
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
    const chainPolicy = String(settings.chainPolicy || "fallback").toLowerCase();

    return candidates.filter(c => {
      if (c.exceptionalOnly) return false;
      if (skippedIds.has(String(c.id))) return false;
      if (c.seq < routePosition) return false;
      if (c.seq > maxSeq) return false;
      if (chainPolicy === "avoid" && c.chain) return false;
      if (c.backtracking) return false;
      if (isConfirmedBusinessClosed(c)) return false;
      if (c.openAtArrival === false) return false;

      /*
        Stop format, cuisine, price, and similar user choices are ranking
        preferences. They must never erase an otherwise usable route option.
        The scoring layer handles those preferences after hard route-safety and
        operating-status checks pass.
      */
      return true;
    });
  }

  function filterCandidatesForSkipFallback(candidates, settings) {
    const routePosition = number(settings.routePosition, 0);
    const skippedIds = new Set((settings.skippedIds || []).map(String));
    const chainPolicy = String(settings.chainPolicy || "fallback").toLowerCase();

    return candidates.filter(candidate => {
      if (candidate.exceptionalOnly) return false;
      if (skippedIds.has(String(candidate.id))) return false;
      if (number(candidate.seq, routePosition) < routePosition) return false;
      if (candidate.backtracking) return false;
      if (candidate.openAtArrival === false) return false;
      if (["closed", "stale-unverified"].includes(candidate.operationalStatus)) return false;
      if (chainPolicy === "avoid" && candidate.chain) return false;
      return true;
    });
  }

  function filterCandidatesForAvailabilityFallback(candidates, settings) {
    const routePosition = number(settings.routePosition, 0);
    const skippedIds = new Set((settings.skippedIds || []).map(String));
    const chainPolicy = String(settings.chainPolicy || "fallback").toLowerCase();

    return candidates.filter(candidate => {
      if (skippedIds.has(String(candidate.id))) return false;
      if (number(candidate.seq, routePosition) < routePosition) return false;
      if (candidate.backtracking) return false;
      if (isConfirmedBusinessClosed(candidate)) return false;
      if (candidate.openAtArrival === false) return false;
      if (chainPolicy === "avoid" && candidate.chain) return false;
      return true;
    });
  }

  function isConfirmedBusinessClosed(candidate) {
    const status = String(candidate?.operationalStatus || "").toLowerCase();
    const hoursConfidence = String(candidate?.hoursConfidence || "").toLowerCase();
    return Boolean(
      candidate?.reviewEvidence?.businessClosed === true ||
      ["closed", "locally-suppressed"].includes(status) ||
      ["provider_confirmed_closed", "permanently_closed"].includes(hoursConfidence)
    );
  }

  function buildEligibilityDiagnostics(candidates, settings = {}) {
    const routePosition = number(settings.routePosition, 0);
    const skippedIds = new Set((settings.skippedIds || []).map(String));
    const chainPolicy = String(settings.chainPolicy || "fallback").toLowerCase();
    const diagnostics = {
      total: candidates.length,
      usable: 0,
      independentUsable: 0,
      skipped: 0,
      behind: 0,
      backtracking: 0,
      closedBusiness: 0,
      closedAtArrival: 0,
      chainExcluded: 0
    };

    for (const candidate of candidates) {
      if (skippedIds.has(String(candidate.id))) {
        diagnostics.skipped += 1;
        continue;
      }
      if (number(candidate.seq, routePosition) < routePosition) {
        diagnostics.behind += 1;
        continue;
      }
      if (candidate.backtracking) {
        diagnostics.backtracking += 1;
        continue;
      }
      if (isConfirmedBusinessClosed(candidate)) {
        diagnostics.closedBusiness += 1;
        continue;
      }
      if (candidate.openAtArrival === false) {
        diagnostics.closedAtArrival += 1;
        continue;
      }
      if (chainPolicy === "avoid" && candidate.chain) {
        diagnostics.chainExcluded += 1;
        continue;
      }
      diagnostics.usable += 1;
      if (!candidate.chain) diagnostics.independentUsable += 1;
    }

    return diagnostics;
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
        if (
          ["closed", "stale-unverified"].includes(
            candidate.operationalStatus
          )
        ) {
          return false;
        }
        if (
          candidate.operationalConfidence === "low"
        ) {
          return false;
        }
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

    const reviewBacked =
      c.reviewEvidence?.status ===
        "ready" &&
      Number.isFinite(
        Number(
          c.reviewEvidence.foodScore
        )
      );

    const provisionalQuality = clamp(
      c.foodReputation * 0.38 +
      c.destinationWorthiness * 0.24 +
      c.uniqueness * 0.18 +
      c.consistency * 0.12 +
      c.reviewConfidence * 0.08
    );

    const baseRestaurantQuality =
      reviewBacked
        ? clamp(
            c.reviewEvidence
              .foodScore
          )
        : provisionalQuality;

    const qualityAdjustment = scoreRestaurantQualitySignals(c, reviewBacked);
    const restaurantQuality = clamp(
      baseRestaurantQuality + qualityAdjustment.adjustment
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

    // Once the route has multiple review-backed options, do not let a thin
    // provisional map record win merely because its route fit is convenient.
    // This stabilizes the final recommendation after evidence finishes loading.
    const reviewBackedCount = (allCandidates || []).filter(candidate =>
      candidate?.reviewEvidence?.status === "ready" &&
      Number.isFinite(Number(candidate?.reviewEvidence?.foodScore))
    ).length;
    if (reviewBacked) {
      const evidenceConfidence = Number(c.reviewEvidence?.confidenceScore || 0);
      detourScore += evidenceConfidence >= 88 ? 2 : evidenceConfidence >= 68 ? 1 : 0;
    } else if (reviewBackedCount >= 2) {
      detourScore -= 5;
    }

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
      let discoveryCap;

      if (reviewBacked) {
        const evidenceConfidence =
          Number(
            c.reviewEvidence
              ?.confidenceScore || 0
          );
        discoveryCap =
          evidenceConfidence >= 88
            ? 94
            : evidenceConfidence >= 68
              ? 90
              : 85;
      } else {
        discoveryCap =
          c.discoveryConfidence === "medium"
            ? 86
            : 81;

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
      }

      detourScore = Math.min(detourScore, discoveryCap);

      if (
        c.operationalConfidence === "low"
      ) {
        detourScore = Math.min(
          detourScore,
          76
        );
      } else if (
        c.operationalConfidence === "medium"
      ) {
        detourScore = Math.min(
          detourScore,
          84
        );
      }
    }

    // A restaurant that appears closed is never a valid recommendation.
    // Unknown arrival hours can remain visible, but cannot look like a fully
    // verified top decision.
    if (c.openAtArrival === false) {
      detourScore = 0;
    } else if (c.openAtArrival === null) {
      const unknownHoursCap =
        c.provenance === "route-discovered" ||
        c.discoverySource === "openstreetmap"
          ? 82
          : 86;
      detourScore = Math.min(detourScore, unknownHoursCap);
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
      detourGate,
      reviewBacked,
      qualitySignalReasons: qualityAdjustment.reasons
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

  function compareScoredCandidates(a, b) {
    const scoreDifference = Number(b.detourScore || 0) - Number(a.detourScore || 0);
    if (scoreDifference) return scoreDifference;

    const aReady = a?.reviewEvidence?.status === "ready" ? 1 : 0;
    const bReady = b?.reviewEvidence?.status === "ready" ? 1 : 0;
    if (aReady !== bReady) return bReady - aReady;

    const confidenceDifference =
      Number(b?.reviewEvidence?.confidenceScore || b?.reviewConfidence || 0) -
      Number(a?.reviewEvidence?.confidenceScore || a?.reviewConfidence || 0);
    if (confidenceDifference) return confidenceDifference;

    const addedDifference =
      Number(a?.estimatedAddedMinutes ?? 999) -
      Number(b?.estimatedAddedMinutes ?? 999);
    if (addedDifference) return addedDifference;

    return candidateMinutesAhead(a) - candidateMinutesAhead(b);
  }

  function chooseByChainPolicy(scored, settings) {
    const policy = String(settings.chainPolicy || "fallback").toLowerCase();
    if (policy !== "fallback") return scored;

    const independent = scored.filter(candidate => !candidate.chain);
    return independent.length ? independent : scored;
  }

  function scoreRestaurantQualitySignals(candidate, reviewBacked) {
    const categoryText = String([
      candidate.category,
      candidate.cuisine,
      candidate.googlePrimaryType,
      ...(candidate.googleTypes || [])
    ].filter(Boolean).join(" ")).toLowerCase();
    const nameText = String(candidate.name || "").toLowerCase();
    const evidence = candidate.reviewEvidence || {};
    const reviewCount = number(evidence.reviewCount ?? candidate.googleDiscoveryReviewCount, 0);
    const themes = Array.isArray(evidence.themes) ? evidence.themes : (Array.isArray(evidence.foodThemes) ? evidence.foodThemes : []);
    const concerns = Array.isArray(evidence.concerns) ? evidence.concerns : [];
    let adjustment = 0;
    const reasons = [];

    const nonRestaurantSignals = [
      [/(cater|catering|event service)/, -12, "Primarily appears to be a catering or event business."],
      [/(convenience|gas station|truck stop|grocery|supermarket)/, -14, "Food listing appears secondary to a non-restaurant business."],
      [/(coffee|cafe|café)/, -5, "Coffee-focused listing has limited meal evidence."],
      [/(bakery|bakeshop)/, -3, "Bakery evidence is treated more conservatively as a full meal stop."],
      [/(bar|pub|tavern)/, -2, "Food evidence is separated from bar-focused popularity."]
    ];
    for (const [pattern, penalty, reason] of nonRestaurantSignals) {
      if (pattern.test(categoryText) || pattern.test(nameText)) {
        adjustment += penalty;
        reasons.push(reason);
        break;
      }
    }

    if (reviewBacked) {
      if (reviewCount < 25) { adjustment -= 7; reasons.push("Very limited review volume lowers confidence."); }
      else if (reviewCount < 75) { adjustment -= 4; reasons.push("Limited review volume lowers confidence."); }
      else if (reviewCount >= 500) adjustment += 2;
      if (themes.length >= 2) { adjustment += 3; reasons.push("Multiple repeated food strengths support the score."); }
      else if (themes.length === 0) { adjustment -= 3; reasons.push("Reviews provide little dish-specific food evidence."); }
      if (concerns.length >= 2) { adjustment -= 4; reasons.push("Multiple recurring concerns reduce consistency."); }
    } else {
      adjustment -= 3;
      reasons.push("Food score remains provisional without connected review evidence.");
    }

    return { adjustment, reasons };
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
      .sort((a, b) => candidateMinutesAhead(a, settings) - candidateMinutesAhead(b, settings));

    const acceptable = scored
      .filter(c => c.detourScore >= 76 && c.openAtArrival !== false)
      .sort((a, b) => candidateMinutesAhead(a, settings) - candidateMinutesAhead(b, settings));

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
    const firstMinutesAhead = candidateMinutesAhead(first, settings);

    if (strong.length === 1 && firstMinutesAhead <= 45) {
      return {
        level: "Last strong option",
        strongOptionsAhead: 1,
        nextStrongSeq: first.seq,
        message: "This may be the last strong option for a while."
      };
    }

    if (firstMinutesAhead >= 90) {
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

    const pickMinutes = candidateMinutesAhead(pick, settings);

    return rankedCandidates
      .filter(candidate =>
        candidate.id !== pick.id &&
        candidate.openAtArrival !== false &&
        candidateMinutesAhead(candidate, settings) > pickMinutes
      )
      .sort((a, b) => {
        const minuteGap =
          candidateMinutesAhead(a, settings) -
          candidateMinutesAhead(b, settings);
        if (minuteGap !== 0) return minuteGap;
        return Number(b.detourScore) - Number(a.detourScore);
      })[0] || null;
  }

  function buildRouteOutlook(pick, nextAlternative, rankedCandidates, settings) {
    if (!pick) {
      return {
        level: "Watching",
        label: "No decision yet",
        stopMessage: "DetourEats is still watching the route.",
        skipMessage: "No remaining open stop is ready yet."
      };
    }

    const currentMinutesAhead = candidateMinutesAhead(pick, settings);
    const nextMinutesAhead = nextAlternative
      ? candidateMinutesAhead(nextAlternative, settings)
      : null;
    const waitMinutes = nextMinutesAhead === null
      ? null
      : Math.max(0, nextMinutesAhead - currentMinutesAhead);
    const currentSeq = number(pick.seq, number(settings.routePosition, 0));
    const nextSeq = nextAlternative ? number(nextAlternative.seq, currentSeq + 1) : null;
    const segmentGap = nextSeq === null ? null : Math.max(1, nextSeq - currentSeq);
    const scoreDifference = nextAlternative
      ? number(nextAlternative.detourScore, 0) - number(pick.detourScore, 0)
      : null;

    let level = "Stable";
    let label = "Options remain available";
    let skipMessage = nextAlternative
      ? `If you skip, ${nextAlternative.name} is roughly ${formatRouteMinutes(waitMinutes)} later.`
      : "If you skip, there is no other open stop in the current route results.";

    if (!nextAlternative) {
      level = "Sparse";
      label = "Weak stretch ahead";
    } else if (waitMinutes >= 120) {
      level = "Sparse";
      label = "Long gap ahead";
    } else if (scoreDifference >= 6) {
      level = "Improving";
      label = "Stronger option later";
    } else if (scoreDifference <= -6) {
      level = "Declining";
      label = "Current stop is stronger";
    } else if (waitMinutes <= 45) {
      level = "Healthy";
      label = "Another option is close";
    }

    if (nextAlternative) {
      if (scoreDifference >= 6) {
        skipMessage =
          `If you skip, ${nextAlternative.name} is about ${formatRouteMinutes(waitMinutes)} later and scores ${Math.abs(scoreDifference)} points higher.`;
      } else if (scoreDifference <= -6) {
        skipMessage =
          `If you skip, the next open stop is about ${formatRouteMinutes(waitMinutes)} later and scores ${Math.abs(scoreDifference)} points lower.`;
      } else {
        skipMessage =
          `If you skip, ${nextAlternative.name} is about ${formatRouteMinutes(waitMinutes)} later with a similar score.`;
      }
    }

    let stopMessage =
      `Stop here and you can arrive in about ${formatRouteMinutes(Math.max(1, currentMinutesAhead))}, with ${pick.estimatedAddedMinutes} minutes added to the trip.`;

    if (level === "Sparse" || level === "Declining") {
      stopMessage =
        "This is the stronger decision now. The route gets weaker after this stop.";
    } else if (level === "Improving") {
      stopMessage =
        "This is good enough now, but a stronger option exists later if you are comfortable waiting.";
    }

    return {
      level,
      label,
      waitMinutes,
      segmentGap,
      currentMinutesAhead,
      nextMinutesAhead,
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
      const afterSkip = Boolean(settings.skipIntent);
      return {
        state: "keep-driving",
        headline: "Keep driving.",
        detail: afterSkip
          ? "No remaining open, forward restaurant is available in the current route results."
          : "No open, forward restaurant is currently available in the checked route window."
      };
    }

    if (pick.openAtArrival === false) {
      return {
        state: "keep-driving",
        headline: "Keep driving.",
        detail: "This restaurant appears closed at your estimated arrival time."
      };
    }

    if (pick.openAtArrival === null) {
      return {
        state: "verify-hours",
        headline: "Verify hours first.",
        detail: "The food case is promising, but arrival-time hours are not confirmed."
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

  function formatRatingEvidence(evidence) {
    const sources = (evidence?.sources || [])
      .filter(source => Number.isFinite(Number(source.rating)) && Number(source.reviewCount || 0) > 0);
    const total = Number(evidence?.totalReviewCount || 0);
    if (!sources.length || !total) return "available review evidence";
    if (sources.length === 1) {
      const provider = titleCase(sources[0].provider);
      return `${total.toLocaleString()} ${provider} rating${total === 1 ? "" : "s"}`;
    }
    return `${total.toLocaleString()} ratings across ${formatNaturalList(sources.map(source => titleCase(source.provider)))}`;
  }

  function hasPositiveFoodSignal(evidence) {
    return Number(evidence?.components?.positiveFoodSignals || 0) >
      Number(evidence?.components?.negativeFoodSignals || 0);
  }

  function formatNaturalList(items) {
    const clean = items.filter(Boolean);
    if (!clean.length) return "";
    if (clean.length === 1) return clean[0];
    if (clean.length === 2) return `${clean[0]} and ${clean[1]}`;
    return `${clean.slice(0, -1).join(", ")}, and ${clean[clean.length - 1]}`;
  }

  function humanizeTheme(value) {
    const labels = {
      pizza: "pizza", crust: "pizza crust", coffee: "coffee", espresso: "espresso",
      breakfast: "breakfast", sandwich: "sandwiches", burger: "burgers", pasta: "pasta",
      steak: "steak", chicken: "chicken", taco: "tacos", sushi: "sushi",
      dessert: "desserts", cookie: "cookies", bakery: "baked goods", fresh: "fresh food",
      homemade: "homemade food", portion: "portion sizes"
    };
    return labels[String(value || "").toLowerCase()] || String(value || "").toLowerCase();
  }

  function titleCase(value) {
    return String(value || "").replace(/\b\w/g, letter => letter.toUpperCase());
  }

  function explainScore(c, s) {
    const bullets = [];
    if (Array.isArray(s.qualitySignalReasons)) {
      bullets.push(...s.qualitySignalReasons);
    }

    if (
      c.provenance === "route-discovered" ||
      c.discoverySource === "openstreetmap"
    ) {
      if (s.reviewBacked) {
        const evidence =
          c.reviewEvidence;
        bullets.push(
          `Food score uses ${formatRatingEvidence(evidence)}.`
        );
        if (evidence.themes?.length) {
          bullets.push(
            `${hasPositiveFoodSignal(evidence) ? "Repeated praise for" : "Reviews repeatedly mention"} ${formatNaturalList(evidence.themes.map(humanizeTheme))}.`
          );
        }
        if (evidence.forumMentionCount) {
          bullets.push(
            `${evidence.forumMentionCount} relevant forum discussion signal${evidence.forumMentionCount === 1 ? "" : "s"} contributed to the evidence profile.`
          );
        }
      } else {
        bullets.push(
          "Route-discovered option with provisional food quality estimated from map metadata."
        );
      }
      if (
        c.operationalConfidence === "low"
      ) {
        bullets.push(
          "Current operation is weakly verified, so the recommendation score is capped."
        );
      } else if (
        c.operationalConfidence === "medium"
      ) {
        bullets.push(
          "Current operation has moderate map-based verification."
        );
      }
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
    else bullets.push("Best overall weighs food quality and trip cost together.");
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
