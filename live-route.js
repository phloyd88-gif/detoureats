/* DetourEats v1.2 Beta live route and discovery module
   No account or API token is required.

   Prototype services:
   - OpenStreetMap Nominatim public geocoder
   - Project OSRM public routing server
   - Overpass API for restaurants along the route

   Public services are queried conservatively and the app always retains
   its curated demo fallback.
*/
(function () {
  "use strict";

  const GEOCODE_CACHE_KEY = "detoureats_geocode_cache_v2";
  const DISCOVERY_CACHE_KEY = "detoureats_discovery_cache_v1";
  const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
  const OSRM_URL = "https://router.project-osrm.org/route/v1/driving";
  const OVERPASS_URLS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter"
  ];
  const GEOCODE_DELAY_MS = 1100;
  const DISCOVERY_RADIUS_METERS = 5000;
  const MAX_ROUTE_SAMPLES = 14;
  const MAX_DISCOVERED_CANDIDATES = 20;
  const MAX_ROUTED_CANDIDATES = 24;

  const KNOWN_CHAINS = [
    "mcdonald", "burger king", "wendy", "taco bell", "kfc",
    "subway", "starbucks", "dunkin", "chipotle", "panera",
    "chick-fil-a", "popeyes", "arby", "sonic", "domino",
    "pizza hut", "little caesars", "five guys", "cracker barrel",
    "denny", "ihop", "applebee", "chili", "olive garden",
    "outback", "longhorn", "texas roadhouse", "buffalo wild wings"
  ];

  function loadJsonStorage(key) {
    try {
      return JSON.parse(localStorage.getItem(key) || "{}");
    } catch {
      return {};
    }
  }

  function saveJsonStorage(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Prototype continues without browser caching.
    }
  }

  async function fetchJson(url, options = {}, timeoutMs = 26000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          Accept: "application/json",
          ...(options.headers || {})
        },
        cache: "no-store"
      });

      if (!response.ok) {
        throw new Error(`Service returned ${response.status}.`);
      }

      return await response.json();
    } catch (error) {
      if (error?.name === "AbortError") {
        throw new Error("The request timed out.");
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }

  async function geocode(query, fallbackCoordinates = null) {
    const key = String(query || "").trim().toLowerCase();
    const cache = loadJsonStorage(GEOCODE_CACHE_KEY);

    if (Array.isArray(cache[key]) && cache[key].length === 2) {
      return {
        coordinates: cache[key],
        precision: "address cache",
        label: String(query || "")
      };
    }

    if (
      cache[key] &&
      Array.isArray(cache[key].coordinates) &&
      cache[key].coordinates.length === 2
    ) {
      return {
        coordinates: cache[key].coordinates,
        precision: "address cache",
        label: cache[key].label || String(query || "")
      };
    }

    const params = new URLSearchParams({
      q: String(query || ""),
      format: "jsonv2",
      limit: "1",
      countrycodes: "us",
      addressdetails: "0"
    });

    try {
      const results = await fetchJson(`${NOMINATIM_URL}?${params.toString()}`);
      const first = results?.[0];

      if (first?.lon && first?.lat) {
        const coordinates = [Number(first.lon), Number(first.lat)];
        const label = first.display_name || String(query || "");
        cache[key] = { coordinates, label };
        saveJsonStorage(GEOCODE_CACHE_KEY, cache);
        return { coordinates, precision: "address geocode", label };
      }
    } catch (error) {
      console.warn("Geocoding fallback used for:", query, error);
    }

    if (Array.isArray(fallbackCoordinates)) {
      return {
        coordinates: fallbackCoordinates.map(Number),
        precision: "city fallback",
        label: String(query || "")
      };
    }

    throw new Error(`Could not locate ${query}.`);
  }

  async function route(coordinates, options = {}) {
    if (!Array.isArray(coordinates) || coordinates.length < 2) {
      throw new Error("At least two route points are required.");
    }

    const coordinateString = coordinates
      .map(pair => `${Number(pair[0]).toFixed(6)},${Number(pair[1]).toFixed(6)}`)
      .join(";");

    const includeGeometry = Boolean(options.geometry);
    const params = new URLSearchParams({
      alternatives: "false",
      steps: options.steps ? "true" : "false",
      overview: includeGeometry ? "full" : "false",
      geometries: "geojson"
    });

    const data = await fetchJson(
      `${OSRM_URL}/${coordinateString}?${params.toString()}`
    );

    const result = data?.routes?.[0];
    if (!result) throw new Error("No drivable route was returned.");
    return result;
  }

  async function prepareCuratedCandidates(candidates, routeSamples, progressCallback) {
    const source = (candidates || []).filter(candidate => {
      if (!Array.isArray(candidate.coordinates)) return false;
      return distanceToSamples(candidate.coordinates, routeSamples) <= 35000;
    });
    const prepared = [];

    for (let index = 0; index < source.length; index += 1) {
      const candidate = source[index];
      progressCallback?.(
        `Locating curated stops ${index + 1} of ${source.length}`
      );

      const result = await geocode(
        candidate.address || `${candidate.name}, ${candidate.city}`,
        candidate.coordinates
      );

      prepared.push({
        ...candidate,
        coordinates: result.coordinates,
        coordinatePrecision: result.precision,
        provenance: "curated",
        discoverySource: null
      });

      if (index < source.length - 1) {
        await delay(GEOCODE_DELAY_MS);
      }
    }

    return prepared;
  }

  async function buildLiveTrip({
    originCoordinates,
    originText,
    destinationText,
    candidates,
    maxAddedMinutes,
    progressCallback
  }) {
    if (!Array.isArray(originCoordinates) && !String(originText || "").trim()) {
      throw new Error("Enter a starting point or use your current location.");
    }
    if (!String(destinationText || "").trim()) {
      throw new Error("Enter a destination.");
    }

    progressCallback?.("Locating starting point");
    const origin = Array.isArray(originCoordinates)
      ? {
          coordinates: originCoordinates.map(Number),
          precision: "device location",
          label: "Current location"
        }
      : await geocode(originText);

    progressCallback?.("Locating destination");

    const destinationFallback = destinationText
      .toLowerCase()
      .includes("myrtle beach")
        ? [-78.8867, 33.6891]
        : null;

    const destination = await geocode(destinationText, destinationFallback);

    if (distanceMeters(origin.coordinates, destination.coordinates) < 1500) {
      throw new Error("Starting point and destination are too close together.");
    }

    progressCallback?.("Calculating main route");
    const baseline = await route(
      [origin.coordinates, destination.coordinates],
      { steps: true, geometry: true }
    );

    const routeCoordinates =
      baseline?.geometry?.coordinates ||
      [origin.coordinates, destination.coordinates];

    const routeSamples = sampleRoute(routeCoordinates);

    progressCallback?.("Finding restaurants along the route");
    let discoveredCandidates = [];
    let discoveryStatus = "available";

    try {
      discoveredCandidates = await discoverRestaurants(
        routeSamples,
        progressCallback
      );
    } catch (error) {
      console.warn("Restaurant discovery unavailable:", error);
      discoveryStatus = "unavailable";
    }

    const relevantCurated = await prepareCuratedCandidates(
      candidates,
      routeSamples,
      progressCallback
    );

    const mergedCandidates = selectCandidatesForRouting(
      mergeCandidates(relevantCurated, discoveredCandidates),
      routeSamples
    );

    const session = {
      originText: String(originText || ""),
      originLabel: origin.label || String(originText || "Current location"),
      originCoordinates: origin.coordinates,
      destinationText,
      destinationLabel: destination.label || destinationText,
      destinationCoordinates: destination.coordinates,
      candidates: mergedCandidates,
      initialDurationSeconds: Number(baseline.duration || 0),
      initialDistanceMeters: Number(baseline.distance || 0),
      discoveryStatus,
      discoveredCount: discoveredCandidates.length,
      curatedCount: relevantCurated.length,
      createdAt: Date.now()
    };

    const snapshot = await refreshLiveTrip({
      session,
      originCoordinates: origin.coordinates,
      maxAddedMinutes,
      progressCallback,
      baselineRoute: baseline
    });

    return { session, snapshot };
  }

  async function refreshLiveTrip({
    session,
    originCoordinates,
    maxAddedMinutes,
    progressCallback,
    baselineRoute = null
  }) {
    progressCallback?.("Updating route");

    const baseline = baselineRoute || await route(
      [originCoordinates, session.destinationCoordinates],
      { steps: true, geometry: false }
    );

    const maximumDetour = Math.max(Number(maxAddedMinutes || 10) + 25, 35);
    const liveCandidates = [];

    for (let index = 0; index < session.candidates.length; index += 1) {
      const candidate = session.candidates[index];
      progressCallback?.(
        `Checking food stops ${index + 1} of ${session.candidates.length}`
      );

      try {
        const via = await route(
          [
            originCoordinates,
            candidate.coordinates,
            session.destinationCoordinates
          ],
          { steps: true, geometry: false }
        );

        const firstLeg = via.legs?.[0];
        if (!firstLeg) continue;

        const addedMinutes = Math.max(
          0,
          Math.round(
            (Number(via.duration || 0) - Number(baseline.duration || 0)) / 60
          )
        );
        const minutesAhead = Math.max(
          0,
          Math.ceil(Number(firstLeg.duration || 0) / 60)
        );
        const milesAhead = metersToMiles(Number(firstLeg.distance || 0));

        if (addedMinutes > maximumDetour) continue;
        if (
          Number(firstLeg.duration || 0) >
          Number(baseline.duration || 0) + 2400
        ) {
          continue;
        }

        const decision = findDecisionPoint(firstLeg);
        const arrival = new Date(
          Date.now() + Number(firstLeg.duration || 0) * 1000
        );

        liveCandidates.push({
          ...candidate,
          liveRoute: true,
          addedMinutes,
          estimatedAddedMinutes: addedMinutes,
          minutesAhead,
          distanceAheadMiles: milesAhead,
          arrivalClock: formatClock(arrival),
          arrivalTime: formatClock(arrival),
          decisionMinutes: Math.max(
            0,
            Math.ceil(Number(decision.seconds || 0) / 60)
          ),
          decisionInstruction: decision.instruction,
          routeCalculatedAt: Date.now()
        });
      } catch (error) {
        console.warn(`Route check failed for ${candidate.name}`, error);
      }
    }

    liveCandidates.sort((a, b) => {
      if (a.minutesAhead !== b.minutesAhead) {
        return a.minutesAhead - b.minutesAhead;
      }
      return a.estimatedAddedMinutes - b.estimatedAddedMinutes;
    });

    liveCandidates.forEach((candidate, index) => {
      candidate.seq = index + 1;
    });

    const initialDuration = Math.max(
      1,
      Number(session.initialDurationSeconds || baseline.duration)
    );
    const initialDistance = Math.max(
      1,
      Number(session.initialDistanceMeters || baseline.distance)
    );
    const remainingDuration = Number(baseline.duration || 0);
    const remainingDistance = Number(baseline.distance || 0);

    const durationProgress = clamp(
      1 - remainingDuration / initialDuration,
      0,
      1
    );
    const distanceProgress = clamp(
      1 - remainingDistance / initialDistance,
      0,
      1
    );

    const routedDiscovered = liveCandidates.filter(
      candidate => candidate.provenance === "route-discovered"
    ).length;
    const routedCurated = liveCandidates.filter(
      candidate => candidate.provenance !== "route-discovered"
    ).length;

    return {
      candidates: liveCandidates,
      originCoordinates,
      destinationCoordinates: session.destinationCoordinates,
      metrics: {
        originLabel: session.originLabel,
        destinationLabel: session.destinationLabel,
        totalMinutes: Math.round(Number(baseline.duration || 0) / 60),
        totalMiles: metersToMiles(Number(baseline.distance || 0)),
        totalCandidates: liveCandidates.length,
        progressPercent: Math.round(
          Math.max(durationProgress, distanceProgress) * 100
        ),
        remainingMinutes: Math.round(remainingDuration / 60),
        remainingMiles: metersToMiles(remainingDistance),
        discoveredCount: routedDiscovered,
        curatedCount: routedCurated,
        discoveryStatus: session.discoveryStatus,
        updatedAt: Date.now()
      }
    };
  }

  async function discoverRestaurants(routeSamples, progressCallback) {
    const cacheKey = routeSamples
      .map(point => `${point[1].toFixed(2)},${point[0].toFixed(2)}`)
      .join("|");
    const cache = loadJsonStorage(DISCOVERY_CACHE_KEY);
    const cached = cache[cacheKey];

    if (
      cached &&
      Array.isArray(cached.items) &&
      Date.now() - Number(cached.savedAt || 0) < 6 * 60 * 60 * 1000
    ) {
      return cached.items;
    }

    const query = buildOverpassQuery(routeSamples);
    let data = null;
    let lastError = null;

    for (const endpoint of OVERPASS_URLS) {
      try {
        progressCallback?.("Searching route food zones");
        const body = new URLSearchParams({ data: query }).toString();
        data = await fetchJson(
          endpoint,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"
            },
            body
          },
          45000
        );
        break;
      } catch (error) {
        lastError = error;
        console.warn("Overpass endpoint failed:", endpoint, error);
      }
    }

    if (!data) {
      throw lastError || new Error("Restaurant discovery failed.");
    }

    const converted = (data.elements || [])
      .map(element => convertOsmElement(element, routeSamples))
      .filter(Boolean);

    const selected = selectDistributedDiscovered(converted, routeSamples);
    cache[cacheKey] = {
      savedAt: Date.now(),
      items: selected
    };
    saveJsonStorage(DISCOVERY_CACHE_KEY, cache);

    return selected;
  }

  function buildOverpassQuery(samples) {
    const clauses = samples.map(point => {
      const lat = Number(point[1]).toFixed(6);
      const lon = Number(point[0]).toFixed(6);
      return `nwr(around:${DISCOVERY_RADIUS_METERS},${lat},${lon})["amenity"~"^(restaurant|fast_food|cafe)$"]["name"];`;
    });

    return `[out:json][timeout:35];
(
${clauses.join("\n")}
);
out center tags meta;`;
  }

  function convertOsmElement(element, routeSamples) {
    const tags = element?.tags || {};
    const name = String(tags.name || "").trim();
    if (!name) return null;

    const coordinates = element.type === "node"
      ? [Number(element.lon), Number(element.lat)]
      : [
          Number(element.center?.lon),
          Number(element.center?.lat)
        ];

    if (!coordinates.every(Number.isFinite)) return null;

    const amenity = String(tags.amenity || "restaurant");
    const cuisine = formatCuisine(tags.cuisine);
    const chain = detectChain(name, tags);
    const website =
      tags.website ||
      tags["contact:website"] ||
      tags["website:menu"] ||
      "";
    const phone = tags.phone || tags["contact:phone"] || "";
    const publishedHours = tags.opening_hours || "";
    const address = buildAddress(tags);
    const city =
      tags["addr:city"] ||
      tags["addr:town"] ||
      tags["addr:village"] ||
      tags["addr:hamlet"] ||
      "Along route";

    const metadataCount = [
      cuisine,
      website,
      phone,
      publishedHours,
      address,
      tags.wikidata || tags["brand:wikidata"]
    ].filter(Boolean).length;

    const confidence = metadataCount >= 4 ? "Medium" : "Low";
    const discoveryConfidence = metadataCount >= 4 ? "medium" : "low";
    const qualityBase =
      amenity === "restaurant" ? 71 :
      amenity === "cafe" ? 68 :
      65;
    const foodReputation = clamp(
      qualityBase +
      (cuisine ? 2 : 0) +
      (website ? 2 : 0) +
      (publishedHours ? 2 : 0) -
      (chain ? 4 : 0),
      58,
      77
    );
    const uniqueness = clamp(
      (cuisine ? 66 : 55) +
      (tags.wikidata ? 3 : 0) -
      (chain ? 18 : 0),
      35,
      72
    );
    const routeBucket = nearestSampleIndex(coordinates, routeSamples);

    return {
      id: `osm-${element.type}-${element.id}`,
      osmType: element.type,
      osmId: element.id,
      name,
      city,
      address: address || city,
      coordinates,
      coordinatePrecision: "OpenStreetMap feature",
      category: cuisine || amenityLabel(amenity),
      cuisine: cuisine || "",
      chain,
      brand: tags.brand || "",
      amenity,
      priceLevel: "$$",
      quickStop:
        amenity === "fast_food" ||
        amenity === "cafe" ||
        String(tags.takeaway || "").toLowerCase() === "yes",
      sitDown: amenity !== "fast_food",
      localFavorite: false,
      regionalSpecialty: false,
      kidFriendly: false,
      easyParking:
        String(tags.parking || "").toLowerCase() === "yes" ||
        Boolean(tags["parking:lane"]),
      foodReputation,
      destinationWorthiness: clamp(foodReputation - 4, 54, 73),
      uniqueness,
      reviewConfidence: clamp(46 + metadataCount * 3, 46, 64),
      consistency: 64,
      famousFor: cuisine
        ? `Cuisine listed as ${cuisine}`
        : `Route-discovered ${amenityLabel(amenity).toLowerCase()}`,
      evidenceSummary:
        "Discovered along the current route from OpenStreetMap. DetourEats has not independently reviewed its food quality.",
      openAtArrival: null,
      hoursConfidence: publishedHours ? "listed_not_evaluated" : "unknown",
      publishedHours: publishedHours || "Not listed in OpenStreetMap",
      website,
      phone,
      confidence,
      discoveryConfidence,
      provenance: "route-discovered",
      discoverySource: "openstreetmap",
      sourceType: "Route-discovered from OpenStreetMap",
      sourceUrl: `https://www.openstreetmap.org/${element.type}/${element.id}`,
      verifiedDate: element.timestamp
        ? `OSM feature updated ${formatDate(element.timestamp)}`
        : "Discovered on current route",
      mappedTimestamp: element.timestamp || "",
      operationalRisk:
        "Route-discovered option. Hours and food quality are not independently verified.",
      routeBucket,
      discoveryRank: metadataCount * 10 + foodReputation - (chain ? 15 : 0)
    };
  }

  function selectDistributedDiscovered(candidates, routeSamples) {
    const deduped = dedupeCandidates(candidates);
    const buckets = new Map();

    for (const candidate of deduped) {
      const bucket = Number(candidate.routeBucket || 0);
      if (!buckets.has(bucket)) buckets.set(bucket, []);
      buckets.get(bucket).push(candidate);
    }

    const selected = [];
    for (const bucket of [...buckets.keys()].sort((a, b) => a - b)) {
      const options = buckets.get(bucket).sort(
        (a, b) => Number(b.discoveryRank) - Number(a.discoveryRank)
      );
      selected.push(...options.slice(0, 2));
    }

    return selected
      .sort((a, b) => {
        if (a.routeBucket !== b.routeBucket) {
          return a.routeBucket - b.routeBucket;
        }
        return b.discoveryRank - a.discoveryRank;
      })
      .slice(0, MAX_DISCOVERED_CANDIDATES);
  }

  function mergeCandidates(curated, discovered) {
    const combined = [...curated, ...discovered];
    const seen = new Map();

    for (const candidate of combined) {
      const key = normalizeName(candidate.name);
      const existing = seen.get(key);

      if (!existing) {
        seen.set(key, candidate);
        continue;
      }

      if (
        existing.provenance === "route-discovered" &&
        candidate.provenance === "curated"
      ) {
        seen.set(key, candidate);
      }
    }

    return [...seen.values()];
  }

  function selectCandidatesForRouting(candidates, routeSamples) {
    return candidates
      .map(candidate => ({
        ...candidate,
        routeBucket:
          candidate.routeBucket ??
          nearestSampleIndex(candidate.coordinates, routeSamples)
      }))
      .sort((a, b) => {
        if (a.routeBucket !== b.routeBucket) {
          return a.routeBucket - b.routeBucket;
        }
        if (a.provenance !== b.provenance) {
          return a.provenance === "curated" ? -1 : 1;
        }
        return Number(b.discoveryRank || 0) - Number(a.discoveryRank || 0);
      })
      .slice(0, MAX_ROUTED_CANDIDATES);
  }

  function dedupeCandidates(candidates) {
    const seenIds = new Set();
    const seenNames = new Set();
    const result = [];

    for (const candidate of candidates) {
      const idKey = `${candidate.osmType}-${candidate.osmId}`;
      const nameKey = normalizeName(candidate.name);

      if (seenIds.has(idKey) || seenNames.has(nameKey)) continue;
      seenIds.add(idKey);
      seenNames.add(nameKey);
      result.push(candidate);
    }

    return result;
  }

  function sampleRoute(coordinates) {
    if (!Array.isArray(coordinates) || coordinates.length < 2) {
      return coordinates || [];
    }

    const distances = [0];
    let total = 0;

    for (let index = 1; index < coordinates.length; index += 1) {
      total += distanceMeters(coordinates[index - 1], coordinates[index]);
      distances.push(total);
    }

    const sampleCount = clamp(
      Math.ceil(total / 70000) + 1,
      5,
      MAX_ROUTE_SAMPLES
    );
    const samples = [];

    for (let sampleIndex = 0; sampleIndex < sampleCount; sampleIndex += 1) {
      const target =
        total * (sampleIndex / Math.max(1, sampleCount - 1));
      let coordinateIndex = 0;

      while (
        coordinateIndex < distances.length - 1 &&
        distances[coordinateIndex] < target
      ) {
        coordinateIndex += 1;
      }

      samples.push(coordinates[coordinateIndex]);
    }

    return dedupeCoordinatePairs(samples);
  }

  function nearestSampleIndex(coordinates, samples) {
    let bestIndex = 0;
    let bestDistance = Infinity;

    samples.forEach((sample, index) => {
      const distance = distanceMeters(coordinates, sample);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = index;
      }
    });

    return bestIndex;
  }

  function distanceToSamples(coordinates, samples) {
    return Math.min(
      ...samples.map(sample => distanceMeters(coordinates, sample))
    );
  }

  function findDecisionPoint(leg) {
    const steps = Array.isArray(leg?.steps) ? leg.steps : [];
    let elapsed = 0;
    let offRamp = null;

    for (const step of steps) {
      const type = String(step?.maneuver?.type || "");
      if (type === "off ramp") {
        offRamp = {
          seconds: elapsed,
          instruction:
            step?.maneuver?.instruction ||
            "Prepare to leave the highway for this stop."
        };
      }
      elapsed += Number(step?.duration || 0);
    }

    if (offRamp) return offRamp;

    return {
      seconds: Math.max(0, Number(leg?.duration || 0) - 600),
      instruction: "Be ready to leave the main route for this stop."
    };
  }

  function detectChain(name, tags) {
    const haystack = [
      name,
      tags.brand,
      tags.operator,
      tags["brand:wikidata"]
    ].filter(Boolean).join(" ").toLowerCase();

    if (tags["brand:wikidata"]) return true;
    return KNOWN_CHAINS.some(chain => haystack.includes(chain));
  }

  function buildAddress(tags) {
    const street = [
      tags["addr:housenumber"],
      tags["addr:street"]
    ].filter(Boolean).join(" ");
    const locality = [
      tags["addr:city"] || tags["addr:town"] || tags["addr:village"],
      tags["addr:state"],
      tags["addr:postcode"]
    ].filter(Boolean).join(", ");

    return [street, locality].filter(Boolean).join(", ");
  }

  function amenityLabel(value) {
    if (value === "fast_food") return "Quick service";
    if (value === "cafe") return "Cafe";
    return "Restaurant";
  }

  function formatCuisine(value) {
    if (!value) return "";
    return String(value)
      .split(";")
      .map(part => part.trim().replaceAll("_", " "))
      .filter(Boolean)
      .slice(0, 3)
      .map(titleCase)
      .join(" / ");
  }

  function titleCase(value) {
    return String(value)
      .split(/\s+/)
      .map(word => word ? word[0].toUpperCase() + word.slice(1) : "")
      .join(" ");
  }

  function normalizeName(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  function dedupeCoordinatePairs(points) {
    const seen = new Set();
    return points.filter(point => {
      const key = `${Number(point[0]).toFixed(4)},${Number(point[1]).toFixed(4)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function formatDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      year: "numeric"
    }).format(date);
  }

  function distanceMeters(a, b) {
    if (!Array.isArray(a) || !Array.isArray(b)) return Infinity;

    const radius = 6371000;
    const lat1 = radians(Number(a[1]));
    const lat2 = radians(Number(b[1]));
    const dLat = radians(Number(b[1]) - Number(a[1]));
    const dLon = radians(Number(b[0]) - Number(a[0]));

    const value =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;

    return radius * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
  }

  function radians(value) {
    return value * Math.PI / 180;
  }

  function metersToMiles(value) {
    return Math.round((Number(value || 0) / 1609.344) * 10) / 10;
  }

  function formatClock(date) {
    return new Intl.DateTimeFormat(undefined, {
      hour: "numeric",
      minute: "2-digit"
    }).format(date);
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, Number(value)));
  }

  function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  window.DetourEatsLiveRoute = {
    geocode,
    route,
    buildLiveTrip,
    refreshLiveTrip,
    distanceMeters
  };
})();
