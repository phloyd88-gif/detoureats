/* DetourEats v2.0.4 Google Places route discovery API */
const MAX_SAMPLE_POINTS = 7;
const MAX_RESULTS_PER_POINT = 12;
const TIMEOUT_MS = 7500;

module.exports = async function handler(req, res) {
  setHeaders(res);
  if (req.method === "OPTIONS") return end(res, 204, null);
  if (req.method !== "POST") {
    return end(res, 405, { error: "method_not_allowed", message: "Use POST." });
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return end(res, 200, {
      version: "2.0.4",
      status: "not_configured",
      places: []
    });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    const samplePoints = cleanPoints(body.samplePoints).slice(0, MAX_SAMPLE_POINTS);
    const radiusMeters = clamp(Number(body.radiusMeters || 6500), 1500, 12000);
    const maxResultCount = clamp(Math.round(Number(body.maxResultCount || 8)), 1, MAX_RESULTS_PER_POINT);

    if (!samplePoints.length) {
      return end(res, 400, { error: "missing_sample_points", message: "No valid route sample points were supplied." });
    }

    const settled = await Promise.allSettled(
      samplePoints.map(point => searchNearby(apiKey, point, radiusMeters, maxResultCount))
    );

    const merged = new Map();
    let successfulSearches = 0;

    for (const result of settled) {
      if (result.status !== "fulfilled") continue;
      successfulSearches += 1;
      for (const place of result.value || []) {
        if (!place?.id) continue;
        const existing = merged.get(place.id);
        if (!existing || candidateRank(place) > candidateRank(existing)) {
          merged.set(place.id, place);
        }
      }
    }

    const places = [...merged.values()]
      .filter(place => place.businessStatus !== "CLOSED_PERMANENTLY")
      .sort((a, b) => candidateRank(b) - candidateRank(a))
      .slice(0, 28);

    return end(res, 200, {
      version: "2.0.4",
      status: successfulSearches ? "ok" : "unavailable",
      successfulSearches,
      attemptedSearches: samplePoints.length,
      places
    });
  } catch (error) {
    console.error("route-places", error);
    return end(res, 500, {
      error: "route_places_failed",
      message: "Google route restaurant discovery could not be completed."
    });
  }
};

async function searchNearby(apiKey, point, radiusMeters, maxResultCount) {
  const response = await fetchTimeout("https://places.googleapis.com/v1/places:searchNearby", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": [
        "places.id",
        "places.displayName",
        "places.formattedAddress",
        "places.addressComponents",
        "places.location",
        "places.rating",
        "places.userRatingCount",
        "places.businessStatus",
        "places.primaryType",
        "places.types",
        "places.googleMapsUri",
        "places.regularOpeningHours",
        "places.priceLevel"
      ].join(",")
    },
    body: JSON.stringify({
      includedTypes: ["restaurant", "cafe", "bakery"],
      maxResultCount,
      rankPreference: "POPULARITY",
      locationRestriction: {
        circle: {
          center: { latitude: point[1], longitude: point[0] },
          radius: radiusMeters
        }
      }
    })
  });

  const data = await jsonOrThrow(response);
  return (data.places || []).map(normalizePlace).filter(Boolean);
}

function normalizePlace(place) {
  const coordinates = place?.location
    ? [Number(place.location.longitude), Number(place.location.latitude)]
    : null;
  if (!place?.id || !place?.displayName?.text || !coordinates?.every(Number.isFinite)) return null;

  return {
    id: String(place.id),
    name: String(place.displayName.text || "").trim(),
    address: String(place.formattedAddress || "").trim(),
    city: googleLocality(place.addressComponents || []),
    coordinates,
    rating: finite(place.rating),
    reviewCount: Math.max(0, Math.round(Number(place.userRatingCount || 0))),
    businessStatus: String(place.businessStatus || ""),
    primaryType: String(place.primaryType || ""),
    types: Array.isArray(place.types) ? place.types.map(String).slice(0, 12) : [],
    url: String(place.googleMapsUri || ""),
    weekdayDescriptions: Array.isArray(place.regularOpeningHours?.weekdayDescriptions)
      ? place.regularOpeningHours.weekdayDescriptions.map(String).slice(0, 7)
      : [],
    periods: Array.isArray(place.regularOpeningHours?.periods)
      ? place.regularOpeningHours.periods.slice(0, 14)
      : [],
    priceLevel: String(place.priceLevel || "")
  };
}

function candidateRank(place) {
  const rating = finite(place?.rating) ?? 0;
  const count = Math.max(0, Number(place?.reviewCount || 0));
  const adjusted = count > 0
    ? (rating * count + 4.1 * 45) / (count + 45)
    : 0;
  return adjusted * 20 + Math.min(28, Math.log10(Math.max(1, count)) * 9);
}

function googleLocality(components) {
  const find = type => (components || []).find(component =>
    Array.isArray(component?.types) && component.types.includes(type)
  )?.longText || "";
  const locality = find("locality") || find("postal_town") || find("administrative_area_level_3") || find("administrative_area_level_2");
  const state = (components || []).find(component =>
    Array.isArray(component?.types) && component.types.includes("administrative_area_level_1")
  )?.shortText || "";
  return [locality, state].filter(Boolean).join(", ");
}

function cleanPoints(value) {
  return (Array.isArray(value) ? value : [])
    .map(point => Array.isArray(point) && point.length >= 2 ? [Number(point[0]), Number(point[1])] : null)
    .filter(point => point && point.every(Number.isFinite) && Math.abs(point[0]) <= 180 && Math.abs(point[1]) <= 90);
}

async function fetchTimeout(url, options = {}, timeout = TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function jsonOrThrow(response) {
  let data = null;
  try { data = await response.json(); } catch {}
  if (!response.ok) throw new Error(`Google Places returned HTTP ${response.status}.`);
  return data || {};
}

function finite(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number(value)));
}

function setHeaders(res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function end(res, status, payload) {
  res.statusCode = status;
  res.end(payload === null ? "" : JSON.stringify(payload));
}
