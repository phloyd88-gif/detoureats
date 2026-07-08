/* DetourEats v1.9.6 review-backed restaurant intelligence
   This module uses only information already available to the prototype:
   curated restaurant records, OpenStreetMap metadata, route calculations,
   user feedback, and field-test reports.

   It intentionally does not fabricate review ratings. Live commercial review,
   forum, and editorial providers can be registered later through the
   provider-neutral adapter interface below.
*/
(function () {
  "use strict";

  const VERSION = "1.9.6-beta";
  const FIELD_TEST_KEY = "detoureats_field_tests_v1";
  const ISSUE_REPORT_KEY = "detoureats_place_issues_v1";
  const LAST_SNAPSHOT_KEY = "detoureats_last_field_snapshot_v1";
  const MAX_SNAPSHOTS = 120;
  const MAX_ISSUES = 100;

  const LEVELS = {
    mapped: {
      key: "mapped",
      label: "Mapped restaurant",
      shortLabel: "Mapped",
      className: "intelligence-mapped",
      rank: 1
    },
    promising: {
      key: "promising",
      label: "Promising restaurant",
      shortLabel: "Promising",
      className: "intelligence-promising",
      rank: 2
    },
    verified: {
      key: "verified",
      label: "Verified DetourEats recommendation",
      shortLabel: "Verified",
      className: "intelligence-verified",
      rank: 3
    },
    bucket: {
      key: "bucket",
      label: "Curated bucket-list place",
      shortLabel: "Bucket list",
      className: "intelligence-bucket",
      rank: 4
    }
  };

  const providerRegistry = new Map();

  function registerProvider(name, adapter) {
    const key = normalizeText(name);
    if (!key || !adapter || typeof adapter !== "object") {
      throw new Error("A provider name and adapter object are required.");
    }
    providerRegistry.set(key, {
      name: String(name),
      adapter,
      registeredAt: Date.now()
    });
  }

  function getProviderStatus() {
    return {
      architectureReady: true,
      configured: Array.from(providerRegistry.values()).map(entry => ({
        name: entry.name,
        available:
          typeof entry.adapter.isAvailable === "function"
            ? Boolean(entry.adapter.isAvailable())
            : true
      })),
      notConnectedMessage:
        "No licensed live review or forum provider is connected in this beta."
    };
  }

  function enrichCandidates(candidates, context = {}) {
    const enriched = (Array.isArray(candidates) ? candidates : [])
      .filter(candidate =>
        !window.DetourEatsPlaceStatus
          ?.getSuppressionForCandidate?.(candidate)
      )
      .map(candidate => enrichCandidate(candidate, context))
      .filter(Boolean);

    return dedupeNearbyCandidates(enriched);
  }

  function enrichCandidate(candidate, context = {}) {
    if (!candidate || typeof candidate !== "object") return null;

    const hours = assessHours(candidate, context);
    const level = classifyIntelligenceLevel(candidate);
    const signals = buildSignals(candidate, level);
    const gaps = buildDataGaps(candidate, level, hours);
    const confidenceScore = calculateConfidence(
      candidate,
      level,
      signals,
      gaps
    );

    const intelligence = {
      version: VERSION,
      level,
      confidenceScore,
      confidenceLabel: confidenceLabel(confidenceScore),
      whySpecial: buildWhySpecial(candidate, level),
      signals,
      dataGaps: gaps,
      hours,
      sourceSummary: buildSourceSummary(candidate, level),
      operationalStatus:
        candidate.operationalStatus ||
        "unverified",
      operationalConfidence:
        candidate.operationalConfidence ||
        "unknown",
      operationalReason:
        candidate.operationalReason ||
        "Current operation has not been independently confirmed.",
      liveReviewStatus:
        buildLiveReviewStatus(
          candidate
        ),
      providerStatus: getProviderStatus(),
      duplicateKey: makeDuplicateKey(candidate),
      updatedAt: Date.now()
    };

    const resolvedOpenAtArrival =
      hours.open === true || hours.open === false
        ? hours.open
        : (candidate.openAtArrival ?? null);
    const resolvedHoursConfidence =
      hours.status === "verified-closed"
        ? "verified_closed"
        : hours.status === "schedule-likely"
          ? "schedule_evaluated"
          : candidate.hoursConfidence;

    return {
      ...candidate,
      openAtArrival: resolvedOpenAtArrival,
      hoursConfidence: resolvedHoursConfidence,
      intelligence,
      intelligenceLevel: level.key,
      intelligenceLabel: level.label,
      intelligenceConfidence: confidenceScore,
      hoursAssessment: hours
    };
  }

  function classifyIntelligenceLevel(candidate) {
    const curated =
      candidate.provenance === "curated" ||
      (
        candidate.sourceUrl &&
        candidate.discoverySource !== "openstreetmap"
      );
    const food = number(candidate.foodReputation, 0);
    const destination = number(
      candidate.destinationWorthiness,
      0
    );
    const uniqueness = number(candidate.uniqueness, 0);
    const evidenceScore = number(
      candidate.destinationEvidenceScore,
      0
    );
    const evidenceLevel = String(
      candidate.destinationEvidenceLevel || ""
    ).toLowerCase();

    if (
      curated &&
      food >= 92 &&
      destination >= 94 &&
      uniqueness >= 86
    ) {
      return LEVELS.bucket;
    }

    if (curated) {
      return LEVELS.verified;
    }

    if (
      evidenceLevel === "strong" &&
      evidenceScore >= 8 &&
      destination >= 82 &&
      uniqueness >= 68
    ) {
      return LEVELS.promising;
    }

    if (
      evidenceLevel === "moderate" ||
      evidenceScore >= 4 ||
      (
        candidate.website &&
        candidate.publishedHours &&
        candidate.cuisine
      )
    ) {
      return LEVELS.promising;
    }

    return LEVELS.mapped;
  }

  function buildSignals(candidate, level) {
    const signals = [];

    if (level.key === "bucket") {
      signals.push({
        type: "editorial",
        label: "Curated destination-level food and uniqueness"
      });
    } else if (level.key === "verified") {
      signals.push({
        type: "editorial",
        label: "Curated DetourEats restaurant record"
      });
    }

    if (candidate.sourceType) {
      signals.push({
        type: "source",
        label: String(candidate.sourceType)
      });
    }

    if (candidate.wikipedia || candidate.wikidata) {
      signals.push({
        type: "identity",
        label: "Wikipedia or Wikidata identity signal"
      });
    }

    if (candidate.award || candidate.stars) {
      signals.push({
        type: "recognition",
        label: "Recognition metadata is present"
      });
    }

    if (candidate.description) {
      signals.push({
        type: "description",
        label: "Mapped business description is available"
      });
    }

    if (candidate.website) {
      signals.push({
        type: "website",
        label: "Business website is mapped"
      });
    }

    if (candidate.cuisine || candidate.category) {
      signals.push({
        type: "cuisine",
        label: `Cuisine identity: ${
          candidate.cuisine || candidate.category
        }`
      });
    }

    if (candidate.regionalSpecialty) {
      signals.push({
        type: "regional",
        label: "Regional-specialty signal"
      });
    }

    if (candidate.localFavorite) {
      signals.push({
        type: "local",
        label: "Local-favorite signal"
      });
    }

    if (candidate.publishedHours) {
      signals.push({
        type: "hours",
        label: "Published hours are available"
      });
    }

    const reviewEvidence =
      candidate.reviewEvidence;
    if (
      reviewEvidence?.status ===
      "ready"
    ) {
      for (
        const source of
        reviewEvidence.sources || []
      ) {
        if (
          Number.isFinite(
            Number(source.rating)
          )
        ) {
          signals.push({
            type: source.provider,
            label:
              `${titleCase(source.provider)} ${Number(source.rating).toFixed(1)} from ${Number(source.reviewCount || 0).toLocaleString()} ratings`
          });
        }
      }

      if (
        reviewEvidence
          .forumMentionCount
      ) {
        signals.push({
          type: "forum",
          label:
            `${reviewEvidence.forumMentionCount} relevant forum discussion signal${reviewEvidence.forumMentionCount === 1 ? "" : "s"}`
        });
      }
    }

    return uniqueByLabel(signals).slice(0, 9);
  }

  function buildDataGaps(candidate, level, hours) {
    const gaps = [];

    const discovered =
      candidate.provenance === "route-discovered" ||
      candidate.discoverySource === "openstreetmap";

    if (discovered) {
      if (
        candidate.reviewEvidence
          ?.status === "ready"
      ) {
        if (
          candidate.reviewEvidence
            .confidenceLabel !== "High"
        ) {
          gaps.push(
            "Review evidence is available, but confidence remains below the high-confidence threshold."
          );
        }
        const providers = new Set(
          (
            candidate.reviewEvidence
              .sources || []
          ).map(source =>
            source.provider
          )
        );
        if (!providers.has("reddit")) {
          gaps.push(
            "Forum evidence is not connected or did not return a confident match."
          );
        }
      } else {
        gaps.push(
          "Food quality is still estimated from map data until live review sources return a confident match."
        );
        gaps.push(
          "No live cross-platform review evidence is currently attached to this restaurant."
        );
      }
    }

    if (
      candidate.operationalConfidence === "low"
    ) {
      gaps.push(
        candidate.operationalReason ||
        "Current business operation is weakly verified."
      );
    }

    if (hours.status === "unknown") {
      gaps.push("Arrival-time hours are not verified.");
    } else if (hours.status === "schedule-likely") {
      gaps.push(
        "Hours are estimated from a published schedule and may not reflect holidays, sellouts, or timezone changes."
      );
    }

    if (
      candidate.routeCalculationMethod === "matrix"
    ) {
      gaps.push(
        "Added time is a route-matrix estimate because exact detour confirmation did not finish."
      );
    }

    if (!candidate.phone) {
      gaps.push("No mapped phone number for direct confirmation.");
    }

    if (!candidate.website && level.rank < LEVELS.verified.rank) {
      gaps.push("No mapped official website.");
    }

    if (
      !candidate.address ||
      candidate.address === candidate.city
    ) {
      gaps.push("Full street address is incomplete.");
    }

    return uniqueStrings(gaps).slice(0, 6);
  }

  function calculateConfidence(
    candidate,
    level,
    signals,
    gaps
  ) {
    let score = {
      mapped: 42,
      promising: 64,
      verified: 88,
      bucket: 94
    }[level.key] || 42;

    score += Math.min(8, signals.length);
    score -= Math.min(15, gaps.length * 2);

    if (candidate.confidence === "High") score += 4;
    if (candidate.confidence === "Low") score -= 7;
    if (candidate.openAtArrival === false) score -= 10;
    if (candidate.backtracking) score -= 12;
    if (
      candidate.operationalConfidence === "low"
    ) {
      score -= 14;
    } else if (
      candidate.operationalConfidence === "medium"
    ) {
      score -= 4;
    }
    if (
      candidate.routeCalculationMethod === "matrix"
    ) {
      score -= 3;
    }

    if (
      candidate.reviewEvidence
        ?.status === "ready"
    ) {
      score += Math.round(
        (
          Number(
            candidate.reviewEvidence
              .confidenceScore || 50
          ) - 50
        ) * 0.25
      );
    }

    return clamp(Math.round(score), 25, 98);
  }

  function confidenceLabel(score) {
    if (score >= 90) return "Very high";
    if (score >= 78) return "High";
    if (score >= 60) return "Moderate";
    return "Limited";
  }

  function buildRestaurantSnapshot(candidate) {
    if (!candidate) {
      return "Restaurant near the route.";
    }

    const isRouteDiscovered =
      candidate.provenance ===
        "route-discovered" ||
      Boolean(
        candidate.discoverySource
      );

    if (!isRouteDiscovered) {
      const curated =
        candidate.signatureDish ||
        candidate.signatureItem ||
        candidate.famousFor ||
        candidate.tagline ||
        candidate.summary ||
        candidate.evidenceSummary ||
        "";

      if (curated) {
        return conciseSentence(
          curated,
          125
        );
      }
    }

    const name =
      String(candidate.name || "");
    const cuisine =
      cleanCategory(
        candidate.cuisine
      );
    const category =
      cleanCategory(
        candidate.category
      );
    const amenity =
      normalizeText(
        candidate.amenity
      );

    const coffeeSignal =
      [
        name,
        cuisine,
        category,
        amenity
      ].some(value =>
        /\b(coffee|cafe|café)\b/i.test(
          String(value || "")
        )
      );

    if (coffeeSignal) {
      return "Coffee shop and café near the route.";
    }

    const cuisineLabel =
      cuisine &&
      !isGenericRestaurantType(
        cuisine
      )
        ? cuisine
        : category &&
          !isGenericRestaurantType(
            category
          )
          ? category
          : "";

    const quick =
      candidate.quickStop ||
      amenity === "fast food" ||
      amenity === "fast_food";

    if (quick) {
      return cuisineLabel
        ? `${cuisineLabel} quick-service stop near the route.`
        : "Quick-service food stop near the route.";
    }

    if (
      candidate.sitDown ||
      amenity === "restaurant"
    ) {
      return cuisineLabel
        ? `${cuisineLabel} sit-down restaurant near the route.`
        : "Sit-down restaurant near the route.";
    }

    return cuisineLabel
      ? `${cuisineLabel} food stop near the route.`
      : "Restaurant near the route.";
  }

  function cleanCategory(value) {
    return String(value || "")
      .replaceAll("_", " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function isGenericRestaurantType(value) {
    return [
      "restaurant",
      "cafe",
      "café",
      "fast food",
      "quick service",
      "food"
    ].includes(
      normalizeText(value)
    );
  }

  function conciseSentence(value, limit) {
    const text =
      String(value || "")
        .replace(/<[^>]*>/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    if (!text) {
      return "Restaurant near the route.";
    }

    const firstSentence =
      text.match(
        /^.*?[.!?](?:\s|$)/
      )?.[0]?.trim() ||
      text;

    if (
      firstSentence.length <= limit
    ) {
      return /[.!?]$/.test(
        firstSentence
      )
        ? firstSentence
        : `${firstSentence}.`;
    }

    const shortened =
      firstSentence
        .slice(0, limit)
        .replace(/\s+\S*$/, "")
        .trim();

    return `${shortened}…`;
  }

  function buildWhySpecial(candidate, level) {
    if (
      candidate.reviewEvidence
        ?.status === "ready"
    ) {
      return buildRestaurantSnapshot(candidate);
    }

    if (candidate.evidenceSummary) {
      return String(candidate.evidenceSummary);
    }

    if (candidate.description) {
      return truncate(candidate.description, 170);
    }

    const specialty =
      candidate.famousFor ||
      candidate.cuisine ||
      candidate.category;

    if (level.key === "promising" && specialty) {
      return `Promising route discovery with a distinct ${specialty} identity and stronger-than-basic destination evidence.`;
    }

    if (specialty) {
      return `Mapped ${specialty} option whose location and route impact can be evaluated, but food quality still needs stronger evidence.`;
    }

    return "The location is mapped and route-accessible, but there is not yet enough evidence to describe it as a verified food destination.";
  }

  function buildSourceSummary(candidate, level) {
    if (
      candidate.reviewEvidence
        ?.status === "ready"
    ) {
      return (
        candidate.reviewEvidence
          .sources || []
      )
        .map(source => {
          const rating =
            Number.isFinite(
              Number(source.rating)
            )
              ? ` ${Number(source.rating).toFixed(1)}`
              : "";
          const count =
            Number(source.reviewCount || 0)
              ? ` (${Number(source.reviewCount).toLocaleString()})`
              : "";
          return `${titleCase(source.provider)}${rating}${count}`;
        })
        .join(" · ");
    }

    if (level.rank >= LEVELS.verified.rank) {
      return [
        candidate.sourceType || "Curated source",
        candidate.sourceUrl ? "source link available" : "",
        candidate.verifiedDate || ""
      ].filter(Boolean).join(" · ");
    }

    return [
      candidate.discoverySource === "nominatim"
        ? "Bounded local fallback discovery"
        : "OpenStreetMap route discovery",
      candidate.website ? "website mapped" : "",
      candidate.destinationEvidenceLevel
        ? `${candidate.destinationEvidenceLevel} destination evidence`
        : ""
    ].filter(Boolean).join(" · ");
  }

  function buildLiveReviewStatus(candidate) {
    const evidence =
      candidate.reviewEvidence;

    if (
      evidence?.status === "ready"
    ) {
      return (
        `Review-backed food score ${evidence.foodScore} · ` +
        `${evidence.confidenceLabel} confidence · ` +
        formatRatingEvidence(evidence)
      );
    }

    if (
      candidate.reviewEvidenceStatus ===
      "pending"
    ) {
      return "Checking configured live review sources";
    }

    return "No live review evidence attached";
  }

  function formatRatingEvidence(evidence) {
    const ratingSources = (evidence?.sources || [])
      .filter(source => Number.isFinite(Number(source.rating)) && Number(source.reviewCount || 0) > 0);
    const total = Number(evidence?.totalReviewCount || 0);
    if (!ratingSources.length || !total) return "No rating count available";
    if (ratingSources.length === 1) {
      return `${total.toLocaleString()} ${titleCase(ratingSources[0].provider)} rating${total === 1 ? "" : "s"}`;
    }
    const providers = ratingSources.map(source => titleCase(source.provider));
    const providerText = providers.length === 2
      ? `${providers[0]} and ${providers[1]}`
      : `${providers.slice(0, -1).join(", ")}, and ${providers[providers.length - 1]}`;
    return `${total.toLocaleString()} ratings across ${providerText}`;
  }

  function titleCase(value) {
    return String(value || "")
      .replace(/\b\w/g, letter =>
        letter.toUpperCase()
      );
  }

  function assessHours(candidate) {
    if (candidate.openAtArrival === true) {
      return {
        status: "verified-open",
        label: "Open at estimated arrival",
        open: true,
        confidence: "curated-or-existing"
      };
    }

    if (candidate.openAtArrival === false) {
      return {
        status: "verified-closed",
        label: "Closed at estimated arrival",
        open: false,
        confidence: "curated-or-existing"
      };
    }

    const hours = String(
      candidate.publishedHours || ""
    ).trim();

    if (!hours) {
      return {
        status: "unknown",
        label: "Hours unavailable",
        open: null,
        confidence: "none"
      };
    }

    if (/^24\/7$/i.test(hours)) {
      return {
        status: "schedule-likely",
        label: "Published as open 24/7",
        open: true,
        confidence: "published-schedule"
      };
    }

    if (
      /^(closed|off)$/i.test(hours) ||
      /\bpermanently closed\b/i.test(hours)
    ) {
      return {
        status: "verified-closed",
        label: "Published as closed",
        open: false,
        confidence: "published-schedule"
      };
    }

    const arrivalTimestamp = number(
      candidate.arrivalTimestamp,
      0
    );

    if (
      arrivalTimestamp &&
      looksLikeMachineOpeningHours(hours)
    ) {
      const parsed = evaluateSimpleOpeningHours(
        hours,
        new Date(arrivalTimestamp)
      );

      if (parsed !== null) {
        return {
          status: "schedule-likely",
          label: parsed
            ? "Schedule suggests open"
            : "Schedule suggests closed",
          open: parsed,
          confidence: "published-schedule-local-time"
        };
      }
    }

    return {
      status: "listed-not-evaluated",
      label: "Published hours listed",
      open: null,
      confidence: "listed-only"
    };
  }

  function looksLikeMachineOpeningHours(value) {
    return /(?:Mo|Tu|We|Th|Fr|Sa|Su).*\d{1,2}:\d{2}/.test(
      value
    );
  }

  function evaluateSimpleOpeningHours(value, date) {
    try {
      const dayCode = [
        "Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"
      ][date.getDay()];
      const minute =
        date.getHours() * 60 + date.getMinutes();
      let matchedDay = false;

      for (const rawGroup of value.split(";")) {
        const group = rawGroup
          .replace(/"[^"]*"/g, "")
          .trim();
        if (!group) continue;

        const match = group.match(
          /^([A-Za-z,\-\s]+)\s+(.+)$/
        );
        if (!match) continue;

        const days = parseDays(match[1]);
        if (!days.has(dayCode)) continue;
        matchedDay = true;

        if (/\boff\b|\bclosed\b/i.test(match[2])) {
          return false;
        }

        const intervals = match[2].split(",");
        for (const interval of intervals) {
          const timeMatch = interval.trim().match(
            /^(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})$/
          );
          if (!timeMatch) continue;

          const start =
            Number(timeMatch[1]) * 60 +
            Number(timeMatch[2]);
          const end =
            Number(timeMatch[3]) * 60 +
            Number(timeMatch[4]);

          if (end >= start) {
            if (minute >= start && minute <= end) return true;
          } else {
            if (minute >= start || minute <= end) return true;
          }
        }
      }

      return matchedDay ? false : null;
    } catch {
      return null;
    }
  }

  function parseDays(expression) {
    const result = new Set();
    const all = [
      "Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"
    ];
    const clean = String(expression || "")
      .replace(/\s+/g, "");

    for (const part of clean.split(",")) {
      if (part.includes("-")) {
        const [start, end] = part.split("-");
        const startIndex = all.indexOf(start);
        const endIndex = all.indexOf(end);
        if (startIndex < 0 || endIndex < 0) continue;

        let index = startIndex;
        while (true) {
          result.add(all[index]);
          if (index == endIndex) break;
          index = (index + 1) % all.length;
        }
      } else if (all.includes(part)) {
        result.add(part);
      }
    }

    return result;
  }

  function dedupeNearbyCandidates(candidates) {
    const kept = [];

    const ordered = [...candidates].sort(
      (a, b) =>
        number(b.intelligence?.level?.rank, 0) -
          number(a.intelligence?.level?.rank, 0) ||
        number(b.intelligenceConfidence, 0) -
          number(a.intelligenceConfidence, 0)
    );

    for (const candidate of ordered) {
      const duplicateIndex = kept.findIndex(existing =>
        isLikelyDuplicate(existing, candidate)
      );

      if (duplicateIndex < 0) {
        kept.push(candidate);
        continue;
      }

      const existing = kept[duplicateIndex];
      kept[duplicateIndex] = mergeDuplicateRecords(
        existing,
        candidate
      );
    }

    return kept.sort((a, b) => {
      const aSeq = number(a.seq, 9999);
      const bSeq = number(b.seq, 9999);
      if (aSeq !== bSeq) return aSeq - bSeq;
      return number(a.minutesAhead, 9999) -
        number(b.minutesAhead, 9999);
    });
  }

  function isLikelyDuplicate(a, b) {
    if (!a || !b) return false;
    if (a.id && b.id && String(a.id) === String(b.id)) {
      return true;
    }

    const aName = normalizeRestaurantName(a.name);
    const bName = normalizeRestaurantName(b.name);
    if (!aName || aName !== bName) return false;

    if (
      a.address &&
      b.address &&
      normalizeText(a.address) === normalizeText(b.address)
    ) {
      return true;
    }

    if (
      Array.isArray(a.coordinates) &&
      Array.isArray(b.coordinates)
    ) {
      return distanceMeters(
        a.coordinates,
        b.coordinates
      ) <= 250;
    }

    return false;
  }

  function mergeDuplicateRecords(a, b) {
    const preferred =
      number(a.intelligenceConfidence, 0) >=
      number(b.intelligenceConfidence, 0)
        ? a
        : b;
    const secondary = preferred === a ? b : a;

    return enrichCandidate({
      ...secondary,
      ...preferred,
      duplicateMerged: true,
      duplicateSources: uniqueStrings([
        ...(a.duplicateSources || []),
        ...(b.duplicateSources || []),
        a.sourceType,
        b.sourceType
      ].filter(Boolean))
    });
  }

  function makeDuplicateKey(candidate) {
    const name = normalizeRestaurantName(candidate.name);
    const address = normalizeText(candidate.address || "");
    const coordinateKey =
      Array.isArray(candidate.coordinates)
        ? candidate.coordinates
            .map(value => number(value, 0).toFixed(3))
            .join(",")
        : "";
    return `${name}|${address || coordinateKey}`;
  }

  function buildCandidateAudit(
    candidates,
    result,
    settings = {}
  ) {
    const pickId = String(result?.pick?.id || "");
    const exceptionalId = String(
      result?.exceptionalOpportunity?.id || ""
    );
    const skipped = new Set(
      (settings.skippedIds || []).map(String)
    );

    return (Array.isArray(candidates) ? candidates : [])
      .map(candidate => {
        const score = number(
          candidate.detourScore ??
          candidate.score,
          0
        );

        return {
          id: String(candidate.id || candidate.name),
          name: candidate.name,
          city: candidate.city || "",
          score,
          addedMinutes: number(
            candidate.estimatedAddedMinutes ??
            candidate.addedMinutes,
            0
          ),
          intelligenceLevel:
            candidate.intelligence?.level?.label ||
            candidate.intelligenceLabel ||
            "Unknown",
          intelligenceConfidence:
            number(
              candidate.intelligence?.confidenceScore ??
              candidate.intelligenceConfidence,
              0
            ),
          provenance:
            candidate.provenance || "unknown",
          hours:
            candidate.intelligence?.hours?.label ||
            "Unknown",
          outcome: auditOutcome(
            candidate,
            pickId,
            exceptionalId,
            skipped,
            settings
          )
        };
      })
      .sort((a, b) => b.score - a.score);
  }

  function auditOutcome(
    candidate,
    pickId,
    exceptionalId,
    skipped,
    settings
  ) {
    const id = String(candidate.id || candidate.name);
    if (id === pickId) return "Selected normal recommendation";
    if (id === exceptionalId) {
      return "Selected rare-opportunity override";
    }
    if (skipped.has(id)) return "Skipped by tester";
    if (candidate.exceptionalOnly) {
      return "Held outside normal pool; exceptional scan only";
    }
    if (candidate.openAtArrival === false) {
      return "Rejected: closed at arrival";
    }
    if (candidate.backtracking) {
      return "Rejected: backtracking";
    }

    const added = number(
      candidate.estimatedAddedMinutes ??
      candidate.addedMinutes,
      0
    );
    const maxAdded = number(settings.maxAdded, 10);
    if (added > maxAdded) {
      return "Not selected: exceeds normal added-time preference";
    }

    const score = number(
      candidate.detourScore ??
      candidate.score,
      0
    );
    const minimum = number(settings.minimumScore, 0);
    if (score < minimum) {
      return "Rejected: below raised quality threshold";
    }

    return "Not selected: stronger trip-fit option ranked ahead";
  }

  function recordSnapshot(payload) {
    const route = payload?.route || {};
    const settings = payload?.settings || {};
    const result = payload?.result || {};
    const candidates = Array.isArray(payload?.candidates)
      ? payload.candidates
      : [];
    const audit = buildCandidateAudit(
      candidates,
      result,
      settings
    );

    const fingerprint = JSON.stringify({
      origin: route.origin || "",
      destination: route.destination || "",
      mode: settings.tripMode || "",
      pick: result?.pick?.id || "",
      exceptional:
        result?.exceptionalOpportunity?.id || "",
      routeUpdatedAt:
        payload?.routeUpdatedAt || 0,
      candidateSignature: audit
        .slice(0, 10)
        .map(row => `${row.id}:${row.score}`)
        .join("|")
    });

    try {
      if (
        localStorage.getItem(LAST_SNAPSHOT_KEY) ===
        fingerprint
      ) {
        return null;
      }
      localStorage.setItem(
        LAST_SNAPSHOT_KEY,
        fingerprint
      );
    } catch {
      // Continue without duplicate suppression.
    }

    const snapshot = {
      id: `snapshot-${Date.now()}-${Math.random()
        .toString(36).slice(2, 7)}`,
      capturedAt: new Date().toISOString(),
      appVersion: VERSION,
      route,
      settings: sanitizeSettings(settings),
      selected: result?.pick
        ? summarizeCandidate(result.pick)
        : null,
      exceptionalOpportunity:
        result?.exceptionalOpportunity
          ? summarizeCandidate(
              result.exceptionalOpportunity
            )
          : null,
      routeContext: result?.routeContext || null,
      routeOutlook: result?.routeOutlook || null,
      candidates: audit.slice(0, 30)
    };

    const snapshots = getSnapshots();
    snapshots.unshift(snapshot);
    saveSnapshots(snapshots.slice(0, MAX_SNAPSHOTS));
    return snapshot;
  }

  function recordIssue(report) {
    const issue = {
      id: `issue-${Date.now()}-${Math.random()
        .toString(36).slice(2, 7)}`,
      createdAt: new Date().toISOString(),
      appVersion: VERSION,
      restaurant: report?.restaurant || null,
      issueType: String(
        report?.issueType || "other"
      ),
      notes: String(report?.notes || "").trim(),
      route: report?.route || null,
      routeMetrics: report?.routeMetrics || null
    };

    const issues = getIssues();
    issues.unshift(issue);
    saveIssues(issues.slice(0, MAX_ISSUES));

    if (
      ["closed", "location", "duplicate"].includes(
        issue.issueType
      )
    ) {
      window.DetourEatsPlaceStatus
        ?.suppressCandidate?.(
          issue.restaurant,
          issue.issueType,
          issue.notes
        );
    }

    return issue;
  }

  function getFieldTestSummary() {
    const snapshots = getSnapshots();
    const issues = getIssues();
    const uniqueRoutes = new Set(
      snapshots.map(snapshot =>
        `${snapshot.route?.origin || ""}|${
          snapshot.route?.destination || ""
        }`
      )
    );

    return {
      snapshots: snapshots.length,
      issues: issues.length,
      suppressions:
        window.DetourEatsPlaceStatus
          ?.getSuppressions?.().length ||
        0,
      uniqueRoutes: uniqueRoutes.size,
      latestSnapshot: snapshots[0] || null,
      providers: getProviderStatus()
    };
  }

  function exportFieldTests() {
    return {
      exportedAt: new Date().toISOString(),
      appVersion: VERSION,
      providerStatus: getProviderStatus(),
      snapshots: getSnapshots(),
      issues: getIssues(),
      localSuppressions:
        window.DetourEatsPlaceStatus
          ?.getSuppressions?.() ||
        []
    };
  }

  function exportCandidateCsv() {
    const rows = [
      [
        "captured_at",
        "origin",
        "destination",
        "restaurant",
        "city",
        "detour_score",
        "added_minutes",
        "intelligence_level",
        "intelligence_confidence",
        "provenance",
        "hours",
        "outcome"
      ]
    ];

    for (const snapshot of getSnapshots()) {
      for (const candidate of snapshot.candidates || []) {
        rows.push([
          snapshot.capturedAt,
          snapshot.route?.origin || "",
          snapshot.route?.destination || "",
          candidate.name || "",
          candidate.city || "",
          candidate.score ?? "",
          candidate.addedMinutes ?? "",
          candidate.intelligenceLevel || "",
          candidate.intelligenceConfidence ?? "",
          candidate.provenance || "",
          candidate.hours || "",
          candidate.outcome || ""
        ]);
      }
    }

    return rows.map(row =>
      row.map(csvCell).join(",")
    ).join("\n");
  }

  function clearFieldTests() {
    try {
      localStorage.removeItem(FIELD_TEST_KEY);
      localStorage.removeItem(ISSUE_REPORT_KEY);
      localStorage.removeItem(LAST_SNAPSHOT_KEY);
    } catch {
      // Best effort.
    }
  }

  function getSnapshots() {
    return loadArray(FIELD_TEST_KEY);
  }

  function getIssues() {
    return loadArray(ISSUE_REPORT_KEY);
  }

  function saveSnapshots(value) {
    saveArray(FIELD_TEST_KEY, value);
  }

  function saveIssues(value) {
    saveArray(ISSUE_REPORT_KEY, value);
  }

  function loadArray(key) {
    try {
      const parsed = JSON.parse(
        localStorage.getItem(key) || "[]"
      );
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function saveArray(key, value) {
    try {
      localStorage.setItem(
        key,
        JSON.stringify(value)
      );
    } catch {
      // Field testing remains optional.
    }
  }

  function summarizeCandidate(candidate) {
    return {
      id: String(candidate.id || candidate.name),
      name: candidate.name || "",
      city: candidate.city || "",
      score: number(
        candidate.detourScore ??
        candidate.score,
        0
      ),
      addedMinutes: number(
        candidate.estimatedAddedMinutes ??
        candidate.addedMinutes,
        0
      ),
      intelligence:
        candidate.intelligence || null
    };
  }

  function sanitizeSettings(settings) {
    return {
      tripMode: settings.tripMode || "",
      maxAdded: number(settings.maxAdded, 0),
      stopType: settings.stopType || "",
      foodPreference:
        settings.foodPreference || "",
      chainPolicy: settings.chainPolicy || "",
      pricePreference:
        settings.pricePreference || "",
      familyFriendly:
        Boolean(settings.familyFriendly),
      exceptionalAlerts:
        settings.exceptionalAlerts !== false,
      minimumScore:
        number(settings.minimumScore, 0)
    };
  }

  function normalizeRestaurantName(value) {
    return normalizeText(value)
      .replace(/\b(the|restaurant|cafe|café)\b/g, " ")
      .replace(/\binc\b|\bllc\b/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function normalizeText(value) {
    return String(value || "")
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  function uniqueByLabel(items) {
    const seen = new Set();
    return items.filter(item => {
      const key = normalizeText(item.label);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function uniqueStrings(items) {
    return [...new Set(
      items
        .map(value => String(value || "").trim())
        .filter(Boolean)
    )];
  }

  function truncate(value, limit) {
    const text = String(value || "").trim();
    if (text.length <= limit) return text;
    return `${text.slice(0, limit - 1).trim()}…`;
  }

  function distanceMeters(a, b) {
    const lon1 = number(a?.[0], 0) * Math.PI / 180;
    const lat1 = number(a?.[1], 0) * Math.PI / 180;
    const lon2 = number(b?.[0], 0) * Math.PI / 180;
    const lat2 = number(b?.[1], 0) * Math.PI / 180;
    const dLon = lon2 - lon1;
    const dLat = lat2 - lat1;
    const h =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1) *
        Math.cos(lat2) *
        Math.sin(dLon / 2) ** 2;
    return 6371000 * 2 * Math.atan2(
      Math.sqrt(h),
      Math.sqrt(1 - h)
    );
  }

  function csvCell(value) {
    const text = String(value ?? "");
    return `"${text.replaceAll('"', '""')}"`;
  }

  function number(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed)
      ? parsed
      : fallback;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  window.DetourEatsRestaurantIntelligence = {
    VERSION,
    LEVELS,
    registerProvider,
    getProviderStatus,
    enrichCandidate,
    enrichCandidates,
    buildRestaurantSnapshot,
    assessHours,
    buildCandidateAudit,
    recordSnapshot,
    recordIssue,
    getFieldTestSummary,
    exportFieldTests,
    exportCandidateCsv,
    clearFieldTests,
    getSnapshots,
    getIssues
  };
})();
