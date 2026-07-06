function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function routeConfidenceScore(value) {
  if (value === "High") return 10;
  if (value === "Medium") return 7;
  return 4;
}

function mealFitScore(candidate, mealType) {
  if (mealType === "breakfast") return candidate.breakfastFit ?? 1;
  if (mealType === "lunch") return candidate.lunchFit ?? 5;
  if (mealType === "dinner") return candidate.dinnerFit ?? 5;
  return candidate.dessertFit ?? 2;
}

function minutesToClock(totalMinutes) {
  const normalized = ((Math.round(totalMinutes) % 1440) + 1440) % 1440;
  const h24 = Math.floor(normalized / 60);
  const mins = normalized % 60;
  const ampm = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 % 12 || 12;
  return `${h12}:${String(mins).padStart(2, "0")} ${ampm}`;
}

function parseClock(value) {
  const [h, m] = value.split(":").map(Number);
  return h * 60 + m;
}

function parseWindow(windowText) {
  const [start, end] = windowText.split("-");
  return { start: parseClock(start), end: parseClock(end) };
}

function mealForArrivalTime(arrivalMinutes) {
  const t = ((arrivalMinutes % 1440) + 1440) % 1440;
  if (t >= 300 && t < 630) return "breakfast";
  if (t >= 630 && t < 900) return "lunch";
  if (t >= 900 && t < 1260) return "dinner";
  return "snack";
}

function estimatedArrivalMinutes(candidate, settings) {
  const stopsAhead = Math.max(0, candidate.seq - settings.routePosition);
  return settings.currentTime + stopsAhead * 45;
}

function effectiveMealType(candidate, settings) {
  if (settings.mealMode === "manual") return settings.mealType;
  return mealForArrivalTime(estimatedArrivalMinutes(candidate, settings));
}

function openingStatus(candidate, arrivalMinutes, settings) {
  if (!candidate.hours || !candidate.hours[settings.travelDay]) {
    return { status: "unknown", label: "Hours unknown", open: false, opensSoon: false, display: "Hours unknown" };
  }

  const t = ((arrivalMinutes % 1440) + 1440) % 1440;
  const windows = candidate.hours[settings.travelDay] || [];

  if (!windows.length) {
    return { status: "closed", label: "Closed at ETA", open: false, opensSoon: false, display: "Closed today" };
  }

  for (const w of windows) {
    const parsed = parseWindow(w);

    if (parsed.start <= parsed.end) {
      if (t >= parsed.start && t <= parsed.end) {
        return { status: "open", label: "Open at ETA", open: true, opensSoon: false, display: `${minutesToClock(parsed.start)}-${minutesToClock(parsed.end)}` };
      }
      const minutesUntilOpen = parsed.start - t;
      if (minutesUntilOpen > 0 && minutesUntilOpen <= 45) {
        return { status: "opensSoon", label: `Opens ${minutesUntilOpen} min after ETA`, open: false, opensSoon: true, display: `${minutesToClock(parsed.start)}-${minutesToClock(parsed.end)}` };
      }
    }

    if (parsed.start > parsed.end && (t >= parsed.start || t <= parsed.end)) {
      return { status: "open", label: "Open at ETA", open: true, opensSoon: false, display: `${minutesToClock(parsed.start)}-${minutesToClock(parsed.end)}` };
    }
  }

  return { status: "closed", label: "Closed at ETA", open: false, opensSoon: false, display: windows.join(", ") };
}

function corridorEligible(candidate, selectedCorridor) {
  if (selectedCorridor === "All") return true;
  if (candidate.corridor === selectedCorridor) return true;
  if (candidate.corridor === "A/B" && ["A", "B", "A/B"].includes(selectedCorridor)) return true;
  if (selectedCorridor === "A/B" && candidate.corridor === "A/B") return true;
  return false;
}

function poolEligible(candidate, selectedPool) {
  if (selectedPool === "All") return true;
  return candidate.candidateType === selectedPool;
}

function isBehind(candidate, routePosition) {
  return candidate.seq <= routePosition;
}

function isInLookahead(candidate, settings) {
  if (settings.lookahead >= 99) return true;
  return candidate.seq > settings.routePosition && candidate.seq <= settings.routePosition + settings.lookahead;
}

function internetEvidenceScore(candidate) {
  return (
    (candidate.destinationEvidence ?? 5) * 0.35 +
    (candidate.signatureEvidence ?? 5) * 0.30 +
    (candidate.uniqueness ?? 5) * 0.20 +
    routeConfidenceScore(candidate.routeFitConfidence) * 0.15
  );
}

function rejectionReason(candidate, settings, arrivalMinutes) {
  if (!poolEligible(candidate, settings.candidatePool)) return "Hidden by candidate pool";
  if (!corridorEligible(candidate, settings.corridor)) return "Hidden by corridor";
  if (isBehind(candidate, settings.routePosition)) return "Behind you";
  if (!isInLookahead(candidate, settings)) return "Too far ahead";
  if (candidate.chain && settings.hideChains) return "Chain hidden";

  const hours = openingStatus(candidate, arrivalMinutes, settings);
  if (settings.hoursMode === "requireOpen" && hours.status === "closed") return "Closed at ETA";
  if (settings.hoursMode === "requireOpen" && hours.status === "unknown") return "Hours unknown";
  if (settings.hoursMode === "requireOpen" && hours.status === "opensSoon") return "Opens after ETA";

  return "";
}

function prelimDetourScore(candidate, settings) {
  const arrivalMinutes = estimatedArrivalMinutes(candidate, settings);
  const rejected = rejectionReason(candidate, settings, arrivalMinutes);
  if (rejected) return null;

  const evidence = internetEvidenceScore(candidate);
  const mealType = effectiveMealType(candidate, settings);
  const mealFit = mealFitScore(candidate, mealType);
  const hours = openingStatus(candidate, arrivalMinutes, settings);

  let score = evidence * 7.2;
  score += mealFit * 1.9;

  if (candidate.estimatedAddedMinutes <= settings.maxAdded) {
    score -= candidate.estimatedAddedMinutes * 0.25;
    score += 4;
  } else {
    score -= settings.maxAdded * 0.25;
    score -= (candidate.estimatedAddedMinutes - settings.maxAdded) * 1.6;
  }

  if (candidate.routeFitConfidence === "Low") score -= 7;
  if (candidate.backtrackRisk === "Medium") score -= 5;
  if (candidate.backtrackRisk === "High") score -= 14;

  if (settings.hoursMode === "warnOnly") {
    if (hours.status === "closed") score -= 30;
    if (hours.status === "opensSoon") score -= 10;
    if (hours.status === "unknown") score -= 12;
  }

  if (candidate.candidateType === "Breakfast/Morning" && (candidate.destinationEvidence ?? 5) <= 5) {
    score -= 3;
  }

  if (settings.tripMode === "strict" && (candidate.destinationEvidence ?? 0) < 8) {
    score -= 12;
  }

  if (settings.tripMode === "hungry") {
    score += candidate.estimatedAddedMinutes <= 10 ? 8 : 0;
  }

  return Math.round(clamp(score, 0, 100));
}

function recommendationTier(candidate, settings) {
  if (!candidate) return { label: "Keep Driving", className: "wait" };
  if (candidate.score >= 92 && candidate.destinationEvidence >= 8) {
    return { label: "Worth the Detour", className: "" };
  }
  if (candidate.autoMeal === "breakfast" && candidate.mealFit >= 8) {
    return { label: "Best Breakfast Ahead", className: "practical" };
  }
  if (candidate.score >= 80) {
    return { label: "Best Stop Ahead", className: "practical" };
  }
  return { label: "Best Available", className: "wait" };
}

function recommend(candidates, settings) {
  const evaluated = candidates.map(c => {
    const arrivalMinutes = estimatedArrivalMinutes(c, settings);
    const score = prelimDetourScore(c, settings);
    const evidence = Math.round(internetEvidenceScore(c) * 10) / 10;
    const autoMeal = effectiveMealType(c, settings);
    const arrivalClock = minutesToClock(arrivalMinutes);
    const mealFit = mealFitScore(c, autoMeal);
    const hours = openingStatus(c, arrivalMinutes, settings);
    const status = score === null ? rejectionReason(c, settings, arrivalMinutes) : "Eligible";
    return { ...c, score, evidence, mealFit, autoMeal, arrivalMinutes, arrivalClock, hours, status };
  });

  const eligible = evaluated
    .filter(c => c.score !== null)
    .sort((a, b) => b.score - a.score);

  const pick = eligible[0] || null;

  return {
    pick,
    tier: recommendationTier(pick, settings),
    upcoming: eligible.slice(0, 6),
    evaluated
  };
}
