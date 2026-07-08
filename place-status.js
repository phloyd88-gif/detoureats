/* DetourEats v1.9.5 review-backed status validation */
(function () {
  "use strict";

  const LOCAL_SUPPRESSION_KEY =
    "detoureats_local_place_suppressions_v1";
  const STALE_NO_SIGNAL_DAYS = 6 * 365;
  const MEDIUM_CONFIDENCE_DAYS = 3 * 365;

  const KNOWN_STATUS_OVERRIDES = [
    {
      name: "shaker mill tavern",
      city: "west stockbridge",
      addressContains: "5 albany",
      status: "closed",
      verifiedAt: "2026-07-07",
      reason:
        "Confirmed former tavern listing. Shaker Mill Inn is a separate lodging business nearby, not this restaurant."
    },
    {
      name: "g s famous lemon cookies",
      nameContains: [
        "famous lemon cookies",
        "g s famous lemon cookies"
      ],
      globalNameMatch: true,
      city: "amsterdam",
      addressContains: "44 e main",
      status: "closed",
      verifiedAt: "2026-07-08",
      reason:
        "Confirmed permanently closed bakery listing at 44 East Main Street in Amsterdam, New York."
    },
    {
      name: "creek stone",
      nameContains: [
        "creek stone",
        "creekstone"
      ],
      globalNameMatch: true,
      city: "amsterdam",
      addressContains: "32 e main",
      status: "closed",
      verifiedAt: "2026-07-08",
      reason:
        "Confirmed permanently closed restaurant formerly located at 32 East Main Street in Amsterdam, New York."
    }
  ];

  const KNOWN_NAME_CORRECTIONS = [
    {
      match: "dair circus",
      correctedName: "Dairy Circus"
    }
  ];

  function applyKnownNameCorrection(candidate) {
    if (!candidate) return candidate;

    const normalizedName =
      normalizeRestaurantName(
        candidate.name
      );

    const correction =
      KNOWN_NAME_CORRECTIONS.find(
        item =>
          normalizedName ===
          normalizeRestaurantName(
            item.match
          )
      );

    if (!correction) {
      return candidate;
    }

    return {
      ...candidate,
      originalProviderName:
        candidate.originalProviderName ||
        candidate.name ||
        "",
      name:
        correction.correctedName
    };
  }

  function assessCandidate(candidate) {
    if (
      candidate?.reviewEvidence
        ?.businessClosed === true
    ) {
      return {
        blocked: true,
        status: "closed",
        confidence: "confirmed",
        reasonCode:
          "review-provider-closed",
        reason:
          candidate.reviewEvidence
            .closureReason ||
          "A connected review provider reports this business permanently closed.",
        lastCheckedAt:
          candidate.reviewEvidence
            .checkedAt || "",
        ageDays: 0,
        signalCount:
          Number(
            candidate.reviewEvidence
              .sourceCount || 1
          )
      };
    }

    const normalized = {
      id:
        String(candidate?.id || ""),
      name:
        String(candidate?.name || "").trim(),
      city:
        String(candidate?.city || "").trim(),
      address:
        String(candidate?.address || "").trim(),
      coordinates:
        Array.isArray(candidate?.coordinates)
          ? candidate.coordinates.map(Number)
          : null
    };

    const localSuppression =
      getSuppressionForCandidate(normalized);

    if (localSuppression) {
      return {
        blocked: true,
        status: "locally-suppressed",
        confidence: "confirmed",
        reasonCode: "local-report",
        reason:
          `Hidden after a local ${localSuppression.issueType} report.`,
        lastCheckedAt:
          localSuppression.createdAt,
        ageDays: 0,
        signalCount: 0
      };
    }

    const override =
      matchKnownStatusOverride(normalized);

    if (override?.status === "closed") {
      return {
        blocked: true,
        status: "closed",
        confidence: "confirmed",
        reasonCode: "known-closed",
        reason: override.reason,
        lastCheckedAt:
          override.verifiedAt,
        ageDays: 0,
        signalCount: 0
      };
    }

    const signalCount = [
      candidate?.website,
      candidate?.phone,
      candidate?.publishedHours &&
      candidate.publishedHours !== "Not listed"
        ? candidate.publishedHours
        : "",
      candidate?.socialUrl
    ].filter(value =>
      String(value || "").trim()
    ).length;

    return {
      blocked: false,
      status:
        candidate?.operationalStatus ||
        (
          signalCount >= 2
            ? "operational-signals-present"
            : "unverified"
        ),
      confidence:
        candidate?.operationalConfidence ||
        (
          signalCount >= 2
            ? "medium"
            : "low"
        ),
      reasonCode: "allowed",
      reason:
        candidate?.operationalReason ||
        (
          signalCount >= 2
            ? "Multiple operating signals are present, but current operation has not been independently confirmed."
            : "Current operation has not been independently confirmed."
        ),
      lastCheckedAt:
        candidate?.operationalLastChecked ||
        "",
      ageDays:
        Number.isFinite(
          Number(candidate?.operationalAgeDays)
        )
          ? Number(candidate.operationalAgeDays)
          : 99999,
      signalCount
    };
  }

  function assessOsmElement(element) {
    const tags = element?.tags || {};
    const candidate = {
      id: element?.type && element?.id
        ? `osm-${element.type}-${element.id}`
        : "",
      name: String(tags.name || "").trim(),
      city:
        tags["addr:city"] ||
        tags["addr:town"] ||
        tags["addr:village"] ||
        tags["addr:hamlet"] ||
        "",
      address: buildAddress(tags),
      coordinates:
        element?.type === "node"
          ? [Number(element.lon), Number(element.lat)]
          : [
              Number(element?.center?.lon),
              Number(element?.center?.lat)
            ]
    };

    const localSuppression =
      getSuppressionForCandidate(candidate);

    if (localSuppression) {
      return {
        blocked: true,
        status: "locally-suppressed",
        confidence: "confirmed",
        reasonCode: "local-report",
        reason:
          `Hidden after a local ${localSuppression.issueType} report.`,
        lastCheckedAt: localSuppression.createdAt,
        ageDays: 0,
        signalCount: 0
      };
    }

    const override =
      matchKnownStatusOverride(candidate);

    if (override?.status === "closed") {
      return {
        blocked: true,
        status: "closed",
        confidence: "confirmed",
        reasonCode: "known-closed",
        reason: override.reason,
        lastCheckedAt: override.verifiedAt,
        ageDays: 0,
        signalCount: 0
      };
    }

    const lifecycleReason =
      getClosedLifecycleReason(tags);

    if (lifecycleReason) {
      const lastCheckedAt =
        mostRecentOperationalDate(
          tags,
          element?.timestamp
        );

      return {
        blocked: true,
        status: "closed",
        confidence: "high",
        reasonCode: "osm-closed-tag",
        reason: lifecycleReason,
        lastCheckedAt,
        ageDays: getAgeDays(lastCheckedAt),
        signalCount: countSignals(tags)
      };
    }

    const lastCheckedAt =
      mostRecentOperationalDate(
        tags,
        element?.timestamp
      );
    const ageDays = getAgeDays(lastCheckedAt);
    const signalCount = countSignals(tags);

    if (
      ageDays > STALE_NO_SIGNAL_DAYS &&
      signalCount === 0
    ) {
      return {
        blocked: true,
        status: "stale-unverified",
        confidence: "low",
        reasonCode: "stale-no-signals",
        reason:
          "The restaurant record is more than six years old and has no mapped hours, phone, website, or recent operational check.",
        lastCheckedAt,
        ageDays,
        signalCount
      };
    }

    let status = "unverified";
    let confidence = "low";
    let reason =
      "Current operation has not been independently confirmed.";

    if (ageDays <= 730 && signalCount >= 1) {
      status = "currently-mapped";
      confidence = "high";
      reason =
        "The listing has recent map activity and at least one operating signal.";
    } else if (
      ageDays <= MEDIUM_CONFIDENCE_DAYS &&
      signalCount >= 1
    ) {
      status = "currently-mapped";
      confidence = "medium";
      reason =
        "The listing has reasonably recent map activity and operating metadata.";
    } else if (signalCount >= 3) {
      status = "operational-signals-present";
      confidence = "medium";
      reason =
        "Multiple operating signals are mapped, but the record has not been checked recently.";
    } else if (signalCount >= 1) {
      status = "weakly-verified";
      confidence = "low";
      reason =
        "Some operating metadata is present, but the listing may be stale.";
    }

    return {
      blocked: false,
      status,
      confidence,
      reasonCode: "allowed",
      reason,
      lastCheckedAt,
      ageDays,
      signalCount
    };
  }

  function matchKnownStatusOverride(candidate) {
    const name =
      normalizeRestaurantName(candidate?.name);
    const city =
      normalizeText(candidate?.city);
    const address =
      normalizeText(candidate?.address);

    return (
      KNOWN_STATUS_OVERRIDES.find(item => {
        const exactName =
          normalizeRestaurantName(item.name);
        const containsNames =
          (item.nameContains || [])
            .map(normalizeRestaurantName)
            .filter(Boolean);

        const nameMatches =
          name === exactName ||
          containsNames.some(fragment =>
            name.includes(fragment)
          );

        if (!nameMatches) {
          return false;
        }

        /*
          Some business names are sufficiently unique that a confirmed
          closure should not depend on inconsistent provider address
          formatting. For those overrides, the normalized name match is
          authoritative.
        */
        if (item.globalNameMatch) {
          return true;
        }

        /*
          Provider records frequently omit city or address fields.
          Use those fields to reject a conflicting location when present,
          but do not allow a missing field to bypass a uniquely named
          confirmed closure.
        */
        if (
          item.city &&
          city &&
          !city.includes(
            normalizeText(item.city)
          )
        ) {
          return false;
        }

        if (
          item.addressContains &&
          address &&
          !address.includes(
            normalizeText(
              item.addressContains
            )
          )
        ) {
          return false;
        }

        return true;
      }) || null
    );
  }

  function validateCandidate(candidate) {
    const correctedCandidate =
      applyKnownNameCorrection(
        candidate
      );
    const assessment =
      assessCandidate(
        correctedCandidate
      );

    if (assessment.blocked) {
      return null;
    }

    return {
      ...correctedCandidate,
      operationalStatus:
        assessment.status,
      operationalConfidence:
        assessment.confidence,
      operationalReason:
        assessment.reason,
      operationalLastChecked:
        assessment.lastCheckedAt ||
        correctedCandidate
          ?.operationalLastChecked ||
        "",
      operationalAgeDays:
        Number.isFinite(
          Number(assessment.ageDays)
        )
          ? Number(assessment.ageDays)
          : Number(
              correctedCandidate
                ?.operationalAgeDays ||
              99999
            ),
      operationalSignals:
        Number.isFinite(
          Number(assessment.signalCount)
        )
          ? Number(
              assessment.signalCount
            )
          : Number(
              correctedCandidate
                ?.operationalSignals ||
              0
            )
    };
  }

  function filterCandidates(candidates) {
    return (candidates || [])
      .map(validateCandidate)
      .filter(Boolean);
  }

  function getClosedLifecycleReason(tags) {
    const closedValues = [
      ["disused", tags.disused],
      ["abandoned", tags.abandoned],
      ["demolished", tags.demolished],
      ["removed", tags.removed],
      ["closed", tags.closed],
      ["disused:amenity", tags["disused:amenity"]],
      ["abandoned:amenity", tags["abandoned:amenity"]],
      ["demolished:amenity", tags["demolished:amenity"]]
    ];

    for (const [key, rawValue] of closedValues) {
      const value =
        String(rawValue || "").toLowerCase();

      if (
        [
          "yes",
          "true",
          "restaurant",
          "cafe",
          "fast_food"
        ].includes(value)
      ) {
        return `OpenStreetMap marks this feature as ${key}.`;
      }
    }

    const hours =
      String(tags.opening_hours || "").trim();

    if (/^(closed|off)$/i.test(hours)) {
      return "Published opening hours mark the place as closed.";
    }

    return "";
  }

  function countSignals(tags) {
    return [
      tags.opening_hours,
      tags.phone,
      tags["contact:phone"],
      tags.website,
      tags["contact:website"],
      tags["contact:facebook"],
      tags["contact:instagram"]
    ].filter(value =>
      String(value || "").trim()
    ).length;
  }

  function mostRecentOperationalDate(
    tags,
    elementTimestamp
  ) {
    const dates = [
      tags.check_date,
      tags["check_date:opening_hours"],
      tags["survey:date"],
      tags["source:date"],
      elementTimestamp
    ]
      .map(parseDate)
      .filter(Boolean)
      .sort(
        (a, b) =>
          b.getTime() - a.getTime()
      );

    return dates.length
      ? dates[0].toISOString()
      : "";
  }

  function getAgeDays(value) {
    const date = parseDate(value);
    if (!date) return 99999;

    return Math.max(
      0,
      Math.floor(
        (Date.now() - date.getTime()) /
        86400000
      )
    );
  }

  function parseDate(value) {
    const text =
      String(value || "").trim();
    if (!text) return null;

    const date = new Date(text);
    return Number.isFinite(date.getTime())
      ? date
      : null;
  }

  function buildAddress(tags) {
    return [
      tags["addr:housenumber"],
      tags["addr:street"],
      tags["addr:city"] ||
        tags["addr:town"] ||
        tags["addr:village"],
      tags["addr:state"]
    ]
      .filter(Boolean)
      .join(", ");
  }

  function suppressCandidate(
    restaurant,
    issueType,
    notes = ""
  ) {
    if (!restaurant) return null;

    const suppression = {
      id:
        String(
          restaurant.id ||
          restaurant.name ||
          `suppression-${Date.now()}`
        ),
      name:
        String(restaurant.name || ""),
      normalizedName:
        normalizeRestaurantName(
          restaurant.name
        ),
      address:
        String(restaurant.address || ""),
      normalizedAddress:
        normalizeText(
          restaurant.address || ""
        ),
      coordinates:
        Array.isArray(
          restaurant.coordinates
        )
          ? restaurant.coordinates.map(Number)
          : null,
      issueType:
        String(issueType || "other"),
      notes:
        String(notes || "").trim(),
      createdAt:
        new Date().toISOString()
    };

    const current =
      getSuppressions().filter(
        item =>
          !suppressionMatches(
            item,
            restaurant
          )
      );

    current.unshift(suppression);

    try {
      localStorage.setItem(
        LOCAL_SUPPRESSION_KEY,
        JSON.stringify(
          current.slice(0, 200)
        )
      );
    } catch {
      // Best effort.
    }

    return suppression;
  }

  function getSuppressions() {
    try {
      const value = JSON.parse(
        localStorage.getItem(
          LOCAL_SUPPRESSION_KEY
        ) || "[]"
      );
      return Array.isArray(value)
        ? value
        : [];
    } catch {
      return [];
    }
  }

  function getSuppressionForCandidate(candidate) {
    if (!candidate) return null;

    return (
      getSuppressions().find(item =>
        suppressionMatches(
          item,
          candidate
        )
      ) || null
    );
  }

  function suppressionMatches(
    suppression,
    candidate
  ) {
    if (
      suppression.id &&
      candidate.id &&
      String(suppression.id) ===
        String(candidate.id)
    ) {
      return true;
    }

    const sameName =
      suppression.normalizedName &&
      suppression.normalizedName ===
        normalizeRestaurantName(
          candidate.name
        );

    if (!sameName) return false;

    const candidateAddress =
      normalizeText(
        candidate.address || ""
      );

    if (
      suppression.normalizedAddress &&
      candidateAddress &&
      suppression.normalizedAddress ===
        candidateAddress
    ) {
      return true;
    }

    if (
      Array.isArray(
        suppression.coordinates
      ) &&
      Array.isArray(
        candidate.coordinates
      )
    ) {
      return (
        distanceMeters(
          suppression.coordinates,
          candidate.coordinates
        ) <= 500
      );
    }

    return false;
  }

  function clearSuppressions() {
    try {
      localStorage.removeItem(
        LOCAL_SUPPRESSION_KEY
      );
    } catch {
      // Best effort.
    }
  }

  function distanceMeters(a, b) {
    const lon1 =
      Number(a?.[0]) * Math.PI / 180;
    const lat1 =
      Number(a?.[1]) * Math.PI / 180;
    const lon2 =
      Number(b?.[0]) * Math.PI / 180;
    const lat2 =
      Number(b?.[1]) * Math.PI / 180;
    const dLon = lon2 - lon1;
    const dLat = lat2 - lat1;
    const h =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1) *
        Math.cos(lat2) *
        Math.sin(dLon / 2) ** 2;

    return (
      6371000 *
      2 *
      Math.atan2(
        Math.sqrt(h),
        Math.sqrt(1 - h)
      )
    );
  }

  function normalizeRestaurantName(value) {
    return normalizeText(value)
      .replace(
        /\b(the|restaurant|cafe|café)\b/g,
        " "
      )
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

  window.DetourEatsPlaceStatus = {
    assessCandidate,
    applyKnownNameCorrection,
    validateCandidate,
    filterCandidates,
    assessOsmElement,
    matchKnownStatusOverride,
    suppressCandidate,
    getSuppressions,
    getSuppressionForCandidate,
    clearSuppressions,
    __test: {
      getAgeDays,
      countSignals,
      getClosedLifecycleReason
    }
  };
})();
