/* DetourEats v2.0.6 review-backed evidence API */
const MAX_CANDIDATES = 8;
const TIMEOUT_MS = 7500;
let redditToken = { value: "", expiresAt: 0 };

module.exports = async function handler(req, res) {
  setHeaders(res);
  if (req.method === "OPTIONS") return end(res, 204, null);
  if (req.method !== "POST") return end(res, 405, { error: "method_not_allowed", message: "Use POST." });

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    const candidates = (Array.isArray(body.candidates) ? body.candidates : [])
      .map(cleanCandidate)
      .filter(c => c.name)
      .slice(0, MAX_CANDIDATES);

    if (!candidates.length) return end(res, 400, { error: "missing_candidates" });

    const configured = configuredProviders();
    if (!configured.length) {
      return end(res, 200, {
        version: "2.0.6",
        status: "not_configured",
        configuredProviders: [],
        results: candidates.map(c => ({ key: c.key, status: "not_configured" }))
      });
    }

    const results = await Promise.all(
      candidates.map(candidate => evidenceFor(candidate, configured))
    );
    return end(res, 200, { version: "2.0.6", status: "ok", configuredProviders: configured, results });
  } catch (error) {
    console.error("restaurant-evidence", error);
    return end(res, 500, { error: "evidence_failed", message: "Live restaurant evidence could not be loaded." });
  }
};

async function evidenceFor(candidate, configured) {
  const jobs = [];
  if (configured.includes("google")) jobs.push(safe("google", () => googleEvidence(candidate)));
  if (configured.includes("yelp")) jobs.push(safe("yelp", () => yelpEvidence(candidate)));
  if (configured.includes("reddit")) jobs.push(safe("reddit", () => redditEvidence(candidate)));

  const providerResults = await Promise.all(jobs);
  const sources = providerResults.filter(r => r.status === "ok" && r.data).map(r => r.data);
  if (!sources.length) {
    return {
      key: candidate.key,
      status: "unavailable",
      providerStatus: providerResults.map(providerStatus),
      message: "Configured sources did not return a confident business match."
    };
  }

  return {
    key: candidate.key,
    status: "ready",
    ...scoreEvidence(candidate, sources),
    providerStatus: providerResults.map(providerStatus),
    checkedAt: new Date().toISOString()
  };
}

async function safe(provider, fn) {
  try {
    const data = await fn();
    return data ? { provider, status: "ok", data } : { provider, status: "no_match" };
  } catch (error) {
    return { provider, status: "error", message: error.name === "AbortError" ? "Request timed out." : String(error.message || error).slice(0, 160) };
  }
}

async function googleEvidence(candidate) {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) return null;

  let p = null;
  if (candidate.googlePlaceId) {
    const fields = [
      "id", "displayName", "formattedAddress", "addressComponents", "location",
      "rating", "userRatingCount", "reviews", "businessStatus",
      "googleMapsUri", "primaryType", "types", "websiteUri",
      "regularOpeningHours", "currentOpeningHours", "utcOffsetMinutes"
    ].join(",");
    const response = await fetchTimeout(
      `https://places.googleapis.com/v1/places/${encodeURIComponent(candidate.googlePlaceId)}`,
      { headers: { "X-Goog-Api-Key": key, "X-Goog-FieldMask": fields } }
    );
    p = await jsonOrThrow(response, "Google Places");
  } else {
    const body = {
      textQuery: [candidate.name, candidate.address, candidate.city].filter(Boolean).join(", "),
      pageSize: 3,
      languageCode: "en"
    };
    if (hasCoords(candidate)) {
      body.locationBias = { circle: { center: { latitude: candidate.coordinates[1], longitude: candidate.coordinates[0] }, radius: 5000 } };
    }
    const fields = [
      "places.id", "places.displayName", "places.formattedAddress", "places.addressComponents", "places.location",
      "places.rating", "places.userRatingCount", "places.reviews", "places.businessStatus",
      "places.googleMapsUri", "places.primaryType", "places.types", "places.websiteUri",
      "places.regularOpeningHours", "places.currentOpeningHours", "places.utcOffsetMinutes"
    ].join(",");
    const response = await fetchTimeout("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Goog-Api-Key": key, "X-Goog-FieldMask": fields },
      body: JSON.stringify(body)
    });
    const data = await jsonOrThrow(response, "Google Places");
    const options = (data.places || []).map(place => ({
      raw: place,
      name: place.displayName?.text || "",
      address: place.formattedAddress || "",
      coordinates: place.location ? [Number(place.location.longitude), Number(place.location.latitude)] : null
    }));
    const match = bestMatch(candidate, options);
    if (!match) return null;
    p = match.raw;
  }
  return {
    provider: "google",
    businessName: p.displayName?.text || candidate.name,
    address: p.formattedAddress || "",
    city: googleLocality(p.addressComponents || []),
    rating: numberOrNull(p.rating),
    reviewCount: Number(p.userRatingCount || 0),
    businessStatus: String(p.businessStatus || ""),
    isClosed: p.businessStatus === "CLOSED_PERMANENTLY",
    url: p.googleMapsUri || "",
    categories: [p.primaryType, ...(Array.isArray(p.types) ? p.types : [])].filter(Boolean),
    regularOpeningHours: p.regularOpeningHours || null,
    currentOpeningHours: p.currentOpeningHours || null,
    utcOffsetMinutes: numberOrNull(p.utcOffsetMinutes),
    reviews: (p.reviews || []).slice(0, 5).map(r => ({
      source: "google",
      rating: numberOrNull(r.rating),
      text: r.text?.text || r.originalText?.text || "",
      publishedAt: r.publishTime || "",
      url: r.googleMapsUri || p.googleMapsUri || ""
    })).filter(r => r.text || r.rating !== null)
  };
}

async function yelpEvidence(candidate) {
  const key = process.env.YELP_API_KEY;
  if (!key) return null;
  const params = new URLSearchParams({ term: candidate.name, limit: "3", sort_by: "best_match", locale: "en_US" });
  if (hasCoords(candidate)) {
    params.set("latitude", String(candidate.coordinates[1]));
    params.set("longitude", String(candidate.coordinates[0]));
  } else {
    params.set("location", candidate.address || candidate.city);
  }
  const response = await fetchTimeout(`https://api.yelp.com/v3/businesses/search?${params}`, {
    headers: { Authorization: `Bearer ${key}`, Accept: "application/json" }
  });
  const data = await jsonOrThrow(response, "Yelp");
  const options = (data.businesses || []).map(b => ({
    raw: b,
    name: b.name || "",
    address: b.location?.display_address?.join(", ") || "",
    coordinates: b.coordinates ? [Number(b.coordinates.longitude), Number(b.coordinates.latitude)] : null
  }));
  const match = bestMatch(candidate, options);
  if (!match) return null;
  const b = match.raw;
  let reviews = [];
  let reviewAccess = "rating_only";
  try {
    const reviewResponse = await fetchTimeout(`https://api.yelp.com/v3/businesses/${encodeURIComponent(b.id)}/reviews?limit=3&sort_by=yelp_sort`, {
      headers: { Authorization: `Bearer ${key}`, Accept: "application/json" }
    }, 5500);
    if (reviewResponse.ok) {
      const reviewData = await reviewResponse.json();
      reviews = (reviewData.reviews || []).slice(0, 3).map(r => ({
        source: "yelp", rating: numberOrNull(r.rating), text: r.text || "",
        publishedAt: r.time_created || "", url: r.url || b.url || ""
      }));
      reviewAccess = "excerpts";
    }
  } catch {}
  return {
    provider: "yelp",
    businessName: b.name || candidate.name,
    address: b.location?.display_address?.join(", ") || "",
    city: [b.location?.city, b.location?.state].filter(Boolean).join(", "),
    rating: numberOrNull(b.rating),
    reviewCount: Number(b.review_count || 0),
    isClosed: Boolean(b.is_closed),
    url: b.url || "",
    categories: (b.categories || []).map(c => c.title).filter(Boolean),
    reviewAccess,
    reviews
  };
}

async function redditEvidence(candidate) {
  if (String(process.env.REDDIT_ENABLED || "").toLowerCase() !== "true") return null;
  const token = await redditAccessToken();
  if (!token) return null;
  const headers = {
    Authorization: `Bearer ${token}`,
    "User-Agent": process.env.REDDIT_USER_AGENT || "web:detoureats:v2.0.6 (restaurant evidence)"
  };
  const query = [`\"${candidate.name}\"`, candidate.city ? `\"${candidate.city}\"` : "", "(food OR restaurant OR cafe OR coffee OR pizza OR burger)"].filter(Boolean).join(" ");
  const params = new URLSearchParams({ q: query, sort: "relevance", t: "all", limit: "8", type: "link", raw_json: "1" });
  const response = await fetchTimeout(`https://oauth.reddit.com/search?${params}`, { headers });
  const data = await jsonOrThrow(response, "Reddit");
  const posts = (data.data?.children || []).map(x => x.data).filter(Boolean).filter(p => nameAppears(candidate.name, `${p.title || ""} ${p.selftext || ""}`)).slice(0, 3);
  if (!posts.length) return null;
  const reviews = [];
  for (const post of posts) {
    reviews.push({
      source: "reddit",
      text: `${post.title || ""} ${post.selftext || ""}`.trim(),
      publishedAt: post.created_utc ? new Date(post.created_utc * 1000).toISOString() : "",
      url: post.permalink ? `https://www.reddit.com${post.permalink}` : ""
    });
    try {
      const cr = await fetchTimeout(`https://oauth.reddit.com/comments/${post.id}?limit=15&depth=1&sort=top&raw_json=1`, { headers }, 5000);
      const cd = await jsonOrThrow(cr, "Reddit comments");
      for (const item of (cd?.[1]?.data?.children || [])) {
        const c = item.data;
        if (c?.body && nameAppears(candidate.name, c.body)) {
          reviews.push({
            source: "reddit", text: c.body,
            publishedAt: c.created_utc ? new Date(c.created_utc * 1000).toISOString() : "",
            url: c.permalink ? `https://www.reddit.com${c.permalink}` : ""
          });
        }
      }
    } catch {}
  }
  return {
    provider: "reddit", businessName: candidate.name, address: candidate.address || "", city: candidate.city || "", rating: null,
    reviewCount: reviews.length, isClosed: false,
    url: posts[0]?.permalink ? `https://www.reddit.com${posts[0].permalink}` : "",
    categories: ["Forum discussion"], reviews: reviews.slice(0, 20)
  };
}

async function redditAccessToken() {
  const id = process.env.REDDIT_CLIENT_ID;
  const secret = process.env.REDDIT_CLIENT_SECRET;
  if (!id || !secret) return "";
  if (redditToken.value && redditToken.expiresAt > Date.now() + 60000) return redditToken.value;
  const response = await fetchTimeout("https://www.reddit.com/api/v1/access_token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": process.env.REDDIT_USER_AGENT || "web:detoureats:v2.0.6 (restaurant evidence)"
    },
    body: "grant_type=client_credentials"
  });
  const data = await jsonOrThrow(response, "Reddit OAuth");
  redditToken = { value: data.access_token || "", expiresAt: Date.now() + Number(data.expires_in || 3600) * 1000 };
  return redditToken.value;
}

function scoreEvidence(candidate, sources) {
  const ratingSources = sources.filter(s => s.rating !== null && Number(s.reviewCount) > 0);
  const snippets = sources.flatMap(s => Array.isArray(s.reviews) ? s.reviews : []);
  const ratingScore = adjustedRating(ratingSources);
  const sentiment = foodSentiment(snippets);
  const consistencyScore = consistency(ratingSources, sentiment);
  const recencyScore = recency(snippets);
  const forum = forumEvidence(snippets.filter(s => s.source === "reddit"));
  const rawFoodScore = weighted([
    [ratingScore, 0.65], [sentiment.score, 0.12], [consistencyScore, 0.13],
    [recencyScore, 0.05], [forum.score, 0.05]
  ], 66);
  const totalReviewCount = ratingSources.reduce((n, s) => n + Number(s.reviewCount || 0), 0);
  const confidenceScore = clamp(Math.round(
    32 + sources.length * 9 + Math.min(42, Math.log10(Math.max(1, totalReviewCount)) * 14) +
    Math.min(8, snippets.length * 1.1) + Math.min(8, forum.mentionCount * 1.5)
  ), 30, 98);
  const confidenceFactor = clamp((confidenceScore - 25) / 73, 0.28, 1);
  const foodScore = 70 + (rawFoodScore - 70) * confidenceFactor;
  const google = sources.find(s => s.provider === "google");
  const yelp = sources.find(s => s.provider === "yelp");
  const googleStatus = String(google?.businessStatus || "");
  const googleClosed = ["CLOSED_PERMANENTLY", "CLOSED_TEMPORARILY"].includes(googleStatus);
  const businessClosed = googleClosed || Boolean(yelp?.isClosed);
  const closureReason =
    googleStatus === "CLOSED_PERMANENTLY"
      ? "Google reports this business permanently closed."
      : googleStatus === "CLOSED_TEMPORARILY"
        ? "Google reports this business temporarily closed."
        : yelp?.isClosed
          ? "Yelp reports this business closed."
          : "";
  const sourceSummaries = sources.map(s => ({
    provider: s.provider, rating: s.rating, reviewCount: Number(s.reviewCount || 0), url: s.url || "",
    reviewAccess: s.reviewAccess || (s.reviews?.length ? "snippets" : "rating_only"),
    businessStatus: s.businessStatus || "", isClosed: Boolean(s.isClosed),
    categories: Array.isArray(s.categories) ? s.categories : []
  }));
  const matchedCity = sources.map(s => String(s.city || "").trim()).find(Boolean) || candidate.city || "";
  const matchedAddress = sources.map(s => String(s.address || "").trim()).find(Boolean) || candidate.address || "";
  const categories = [...new Set(sources.flatMap(s => Array.isArray(s.categories) ? s.categories : []).filter(Boolean))].slice(0, 8);
  const googleHours = google?.regularOpeningHours || null;
  return {
    restaurant: { requestedName: candidate.name, matchedNames: sources.map(s => s.businessName).filter(Boolean) },
    matchedCity,
    matchedAddress,
    categories,
    foodScore: Math.round(foodScore), confidenceScore,
    confidenceLabel: confidenceScore >= 88 ? "High" : confidenceScore >= 68 ? "Moderate" : "Limited",
    totalReviewCount, sourceCount: sources.length, reviewSnippetCount: snippets.length,
    forumMentionCount: forum.mentionCount,
    components: {
      adjustedRatingScore: roundOrNull(ratingScore), foodSentimentScore: roundOrNull(sentiment.score),
      consistencyScore: roundOrNull(consistencyScore), recencyScore: roundOrNull(recencyScore),
      forumScore: roundOrNull(forum.score),
      positiveFoodSignals: sentiment.positiveCount,
      negativeFoodSignals: sentiment.negativeCount
    },
    themes: sentiment.themes, concerns: sentiment.concerns,
    regularOpeningHours: googleHours,
    utcOffsetMinutes: numberOrNull(google?.utcOffsetMinutes),
    summary: summaryText(foodScore, totalReviewCount, ratingSources, sentiment, forum),
    businessClosed,
    closureReason,
    sources: sourceSummaries
  };
}

function adjustedRating(sources) {
  if (!sources.length) return null;
  const count = sources.reduce((n, s) => n + Number(s.reviewCount || 0), 0);
  const average = sources.reduce((n, s) => n + Number(s.rating) * Number(s.reviewCount || 0), 0) / Math.max(1, count);
  const adjusted = (average * count + 4.15 * 40) / (count + 40);
  return clamp(((adjusted - 1) / 4) * 100, 0, 100);
}

function foodSentiment(reviews) {
  const relevant = reviews.map(r => ({ ...r, n: normalize(r.text) })).filter(r => FOOD.some(t => r.n.includes(t)));
  if (!relevant.length) return { score: null, positiveCount: 0, negativeCount: 0, themes: [], concerns: [] };
  let pos = 0, neg = 0;
  const themes = new Map(), concerns = new Map();
  for (const r of relevant) {
    pos += POS.filter(t => r.n.includes(t)).length;
    neg += NEG.filter(t => r.n.includes(t)).length;
    for (const t of THEMES) if (r.n.includes(t)) themes.set(t, (themes.get(t) || 0) + 1);
    for (const t of CONCERNS) if (r.n.includes(t)) concerns.set(t, (concerns.get(t) || 0) + 1);
  }
  return {
    score: clamp(68 + (pos - neg * 1.15) * 4.5, 28, 96), positiveCount: pos, negativeCount: neg,
    themes: topKeys(themes, 4, 2), concerns: topKeys(concerns, 3, 2)
  };
}

function consistency(sources, sentiment) {
  if (!sources.length && sentiment.score === null) return null;
  let score = 82;
  if (sources.length > 1) {
    const ratings = sources.map(s => Number(s.rating));
    const mean = ratings.reduce((a, b) => a + b, 0) / ratings.length;
    const sd = Math.sqrt(ratings.reduce((n, r) => n + (r - mean) ** 2, 0) / ratings.length);
    score -= sd * 28;
  }
  const total = sentiment.positiveCount + sentiment.negativeCount;
  if (total) score -= (sentiment.negativeCount / total) * 32;
  return clamp(score, 35, 96);
}

function recency(reviews) {
  const ages = reviews.map(r => ageDays(r.publishedAt)).filter(Number.isFinite);
  if (!ages.length) return null;
  const avg = ages.reduce((a, b) => a + b, 0) / ages.length;
  return avg <= 180 ? 92 : avg <= 365 ? 82 : avg <= 730 ? 68 : avg <= 1460 ? 54 : 40;
}

function forumEvidence(reviews) {
  if (!reviews.length) return { score: null, mentionCount: 0 };
  let pos = 0, neg = 0;
  for (const r of reviews) {
    const n = normalize(r.text);
    pos += POS.filter(t => n.includes(t)).length;
    neg += NEG.filter(t => n.includes(t)).length;
  }
  return { score: clamp(60 + (pos - neg) * 5 + Math.min(12, reviews.length * 2), 35, 94), mentionCount: reviews.length };
}

function summaryText(foodScore, totalCount, ratingSources, sentiment, forum) {
  const parts = [`Review-backed food score ${Math.round(foodScore)}.`];
  const ratingSummary = formatRatingEvidence(ratingSources, totalCount);
  if (ratingSummary) parts.push(`${ratingSummary}.`);

  if (sentiment.themes.length) {
    const themeText = formatNaturalList(sentiment.themes.map(humanizeTheme));
    const praise = sentiment.positiveCount > sentiment.negativeCount;
    parts.push(`${praise ? "Repeated praise for" : "Reviews repeatedly mention"} ${themeText}.`);
  }

  if (sentiment.concerns.length) {
    parts.push(`Some reviews mention ${formatNaturalList(sentiment.concerns.map(humanizeConcern))}.`);
  }

  if (forum.mentionCount) {
    parts.push(`${forum.mentionCount} relevant forum discussion signal${forum.mentionCount === 1 ? "" : "s"}.`);
  }

  return parts.join(" ");
}

function formatRatingEvidence(sources, totalCount) {
  if (!sources.length || !totalCount) return "";
  if (sources.length === 1) {
    const source = sources[0];
    return `${Number(totalCount).toLocaleString()} ${title(source.provider)} rating${Number(totalCount) === 1 ? "" : "s"}`;
  }
  const providers = formatNaturalList(sources.map(source => title(source.provider)));
  return `${Number(totalCount).toLocaleString()} ratings across ${providers}`;
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

function humanizeConcern(value) {
  const labels = {
    bland: "bland food", cold: "food arriving cold", stale: "stale food", dry: "dry food",
    undercooked: "undercooked food", overcooked: "overcooked food", burnt: "burnt food",
    soggy: "soggy food", inconsistent: "inconsistent quality", greasy: "greasy food",
    "small portion": "small portions"
  };
  return labels[String(value || "").toLowerCase()] || String(value || "").toLowerCase();
}

function bestMatch(candidate, options) {
  const scored = options.map(o => ({ ...o, score: matchScore(candidate, o) })).sort((a, b) => b.score - a.score);
  const best = scored[0];
  if (!best) return null;
  const requested = normalize(candidate.name);
  const generic = ["restaurant", "cafe", "coffee shop", "diner", "bakery", "pizza"].includes(requested);
  const threshold = generic ? 0.72 : 0.58;
  if (best.score < threshold) return null;
  if (hasCoords(candidate) && Array.isArray(best.coordinates) && haversine(candidate.coordinates, best.coordinates) > 4) return null;
  return best;
}
function matchScore(c, o) {
  const name = tokenSimilarity(c.name, o.name);
  const leftLoc = normalize(`${c.address} ${c.city}`), rightLoc = normalize(o.address);
  const location = leftLoc && rightLoc ? tokenSimilarity(leftLoc, rightLoc) : 0.45;
  let distance = 0.55;
  if (hasCoords(c) && Array.isArray(o.coordinates)) {
    const miles = haversine(c.coordinates, o.coordinates);
    distance = miles <= .3 ? 1 : miles <= 1 ? .9 : miles <= 3 ? .65 : miles <= 8 ? .35 : 0;
  }
  return name * .68 + location * .17 + distance * .15;
}
function tokenSimilarity(a, b) {
  const A = new Set(normalize(a).split(" ").filter(t => t.length > 1));
  const B = new Set(normalize(b).split(" ").filter(t => t.length > 1));
  if (!A.size || !B.size) return 0;
  const intersection = [...A].filter(t => B.has(t)).length;
  return intersection / new Set([...A, ...B]).size;
}
function nameAppears(name, text) {
  const tokens = normalize(name).split(" ").filter(t => t.length >= 3);
  const h = normalize(text);
  return tokens.length && tokens.filter(t => h.includes(t)).length >= Math.max(1, Math.ceil(tokens.length * .7));
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

function configuredProviders() {
  return [
    process.env.GOOGLE_PLACES_API_KEY ? "google" : "",
    process.env.YELP_API_KEY ? "yelp" : "",
    String(process.env.REDDIT_ENABLED || "").toLowerCase() === "true" && process.env.REDDIT_CLIENT_ID && process.env.REDDIT_CLIENT_SECRET ? "reddit" : ""
  ].filter(Boolean);
}
function cleanCandidate(c) {
  const coordinates = Array.isArray(c?.coordinates) && c.coordinates.length >= 2 ? [Number(c.coordinates[0]), Number(c.coordinates[1])] : null;
  return {
    key: clean(c?.key, 240) || normalize([c?.name, c?.city, c?.address].filter(Boolean).join("|")),
    name: clean(c?.name, 180), address: clean(c?.address, 260), city: clean(c?.city, 120),
    googlePlaceId: clean(c?.googlePlaceId, 180),
    coordinates: coordinates?.every(Number.isFinite) ? coordinates : null
  };
}
function providerStatus(r) { return { provider: r.provider, status: r.status, message: r.message || "" }; }
function hasCoords(c) { return Array.isArray(c.coordinates) && c.coordinates.length >= 2 && c.coordinates.every(Number.isFinite); }
function haversine(a, b) {
  const rad = x => Number(x) * Math.PI / 180, R = 3958.8;
  const [lon1, lat1] = a, [lon2, lat2] = b, dLat = rad(lat2 - lat1), dLon = rad(lon2 - lon1);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}
async function fetchTimeout(url, options = {}, timeout = TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try { return await fetch(url, { ...options, signal: controller.signal }); }
  finally { clearTimeout(timer); }
}
async function jsonOrThrow(response, provider) {
  let data = null;
  try { data = await response.json(); } catch {}
  if (!response.ok) throw new Error(`${provider} returned HTTP ${response.status}.`);
  return data;
}
function weighted(parts, fallback) {
  const available = parts.filter(([s]) => Number.isFinite(s));
  if (!available.length) return fallback;
  const weight = available.reduce((n, [, w]) => n + w, 0);
  return available.reduce((n, [s, w]) => n + s * w / weight, 0);
}
function topKeys(map, limit, minimum = 1) { return [...map.entries()].filter(([, count]) => count >= minimum).sort((a, b) => b[1] - a[1]).slice(0, limit).map(([k]) => title(k)); }
function title(v) { return String(v).replace(/\b\w/g, m => m.toUpperCase()); }
function normalize(v) { return String(v || "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/&/g, " and ").replace(/[^a-zA-Z0-9]+/g, " ").toLowerCase().replace(/\s+/g, " ").trim(); }
function clean(v, n) { return String(v || "").replace(/\s+/g, " ").trim().slice(0, n); }
function numberOrNull(v) { const n = Number(v); return Number.isFinite(n) ? n : null; }
function roundOrNull(v) { return Number.isFinite(v) ? Math.round(v) : null; }
function clamp(v, min, max) { return Math.max(min, Math.min(max, Number(v))); }
function ageDays(v) { const t = Date.parse(v || ""); return Number.isFinite(t) ? Math.max(0, (Date.now() - t) / 86400000) : NaN; }
function setHeaders(res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}
function end(res, status, payload) { res.statusCode = status; res.end(payload === null ? "" : JSON.stringify(payload)); }

const FOOD = ["food","dish","meal","pizza","burger","sandwich","coffee","espresso","breakfast","lunch","dinner","pasta","sauce","crust","steak","chicken","taco","sushi","dessert","cookie","bakery","fresh","flavor","taste","portion","menu"];
const POS = ["delicious","excellent","amazing","fantastic","outstanding","perfect","fresh","flavorful","tasty","best","favorite","recommend","worth the drive","worth a detour","homemade","crispy","tender","authentic","generous"];
const NEG = ["bland","cold","stale","dry","undercooked","overcooked","burnt","burned","soggy","tasteless","mediocre","disappointing","awful","terrible","small portion","inconsistent","greasy"];
const THEMES = ["pizza","crust","coffee","espresso","breakfast","sandwich","burger","pasta","steak","chicken","taco","sushi","dessert","cookie","bakery","fresh","homemade","portion"];
const CONCERNS = ["bland","cold","stale","dry","undercooked","overcooked","burnt","soggy","inconsistent","greasy","small portion"];

module.exports._test = { scoreEvidence, adjustedRating, foodSentiment, bestMatch, cleanCandidate };
