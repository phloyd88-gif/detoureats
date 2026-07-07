/* DetourEats v1.0 Beta live route module
   No account or API token is required.

   Prototype services:
   - OpenStreetMap Nominatim public geocoder
   - Project OSRM public routing server

   This is intentionally low-volume, cached, and sequential for geocoding.
   It is suitable for prototype testing, not a production traffic SLA.
*/
(function () {
  "use strict";

  const GEOCODE_CACHE_KEY = "detoureats_geocode_cache_v1";
  const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
  const OSRM_URL = "https://router.project-osrm.org/route/v1/driving";
  const GEOCODE_DELAY_MS = 1100;

  function loadCache() {
    try {
      return JSON.parse(localStorage.getItem(GEOCODE_CACHE_KEY) || "{}");
    } catch {
      return {};
    }
  }

  function saveCache(cache) {
    try {
      localStorage.setItem(GEOCODE_CACHE_KEY, JSON.stringify(cache));
    } catch {
      // Location routing still works with embedded fallback coordinates.
    }
  }

  async function fetchJson(url, timeoutMs = 22000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: { Accept: "application/json" },
        cache: "no-store"
      });

      if (!response.ok) {
        throw new Error(`Route service returned ${response.status}.`);
      }

      return await response.json();
    } catch (error) {
      if (error?.name === "AbortError") {
        throw new Error("The route calculation timed out.");
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }

  async function geocode(query, fallbackCoordinates = null) {
    const key = String(query || "").trim().toLowerCase();
    const cache = loadCache();

    if (Array.isArray(cache[key]) && cache[key].length === 2) {
      return { coordinates: cache[key], precision: "address cache" };
    }

    const params = new URLSearchParams({
      q: String(query || ""),
      format: "jsonv2",
      limit: "1",
      countrycodes: "us",
      addressdetails: "0",
      email: "phloyd88@gmail.com"
    });

    try {
      const results = await fetchJson(`${NOMINATIM_URL}?${params.toString()}`);
      const first = results?.[0];

      if (first?.lon && first?.lat) {
        const coordinates = [Number(first.lon), Number(first.lat)];
        cache[key] = coordinates;
        saveCache(cache);
        return { coordinates, precision: "address geocode" };
      }
    } catch (error) {
      console.warn("Geocoding fallback used for:", query, error);
    }

    if (Array.isArray(fallbackCoordinates)) {
      return {
        coordinates: fallbackCoordinates.map(Number),
        precision: "city fallback"
      };
    }

    throw new Error(`Could not locate ${query}.`);
  }

  async function route(coordinates, steps = false) {
    if (!Array.isArray(coordinates) || coordinates.length < 2) {
      throw new Error("At least two route points are required.");
    }

    const coordinateString = coordinates
      .map(pair => `${Number(pair[0]).toFixed(6)},${Number(pair[1]).toFixed(6)}`)
      .join(";");

    const params = new URLSearchParams({
      alternatives: "false",
      steps: steps ? "true" : "false",
      overview: "false",
      geometries: "geojson"
    });

    const data = await fetchJson(
      `${OSRM_URL}/${coordinateString}?${params.toString()}`
    );

    const result = data?.routes?.[0];
    if (!result) throw new Error("No drivable route was returned.");
    return result;
  }

  async function prepareCandidates(candidates, progressCallback) {
    const prepared = [];

    for (let index = 0; index < candidates.length; index += 1) {
      const candidate = candidates[index];
      progressCallback?.(
        `Locating restaurants ${index + 1} of ${candidates.length}`
      );

      const result = await geocode(
        candidate.address || `${candidate.name}, ${candidate.city}`,
        candidate.coordinates
      );

      prepared.push({
        ...candidate,
        coordinates: result.coordinates,
        coordinatePrecision: result.precision
      });

      if (index < candidates.length - 1) {
        await delay(GEOCODE_DELAY_MS);
      }
    }

    return prepared;
  }

  async function buildLiveTrip({
    originCoordinates,
    destinationText,
    candidates,
    maxAddedMinutes,
    progressCallback
  }) {
    progressCallback?.("Locating destination");

    const destinationFallback = destinationText
      .toLowerCase()
      .includes("myrtle beach")
        ? [-78.8867, 33.6891]
        : null;

    const destination = await geocode(destinationText, destinationFallback);
    const preparedCandidates = await prepareCandidates(
      candidates,
      progressCallback
    );

    progressCallback?.("Calculating main route");
    const baseline = await route(
      [originCoordinates, destination.coordinates],
      true
    );

    const session = {
      destinationText,
      destinationCoordinates: destination.coordinates,
      candidates: preparedCandidates,
      initialDurationSeconds: Number(baseline.duration || 0),
      initialDistanceMeters: Number(baseline.distance || 0),
      createdAt: Date.now()
    };

    const snapshot = await refreshLiveTrip({
      session,
      originCoordinates,
      maxAddedMinutes,
      progressCallback
    });

    return { session, snapshot };
  }

  async function refreshLiveTrip({
    session,
    originCoordinates,
    maxAddedMinutes,
    progressCallback
  }) {
    progressCallback?.("Updating route");

    const baseline = await route(
      [originCoordinates, session.destinationCoordinates],
      true
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
          true
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

        // A stop behind the driver produces a large via-route penalty.
        // Exclude it, along with extreme out-of-corridor detours.
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

    return {
      candidates: liveCandidates,
      originCoordinates,
      destinationCoordinates: session.destinationCoordinates,
      metrics: {
        progressPercent: Math.round(
          Math.max(durationProgress, distanceProgress) * 100
        ),
        remainingMinutes: Math.round(remainingDuration / 60),
        remainingMiles: metersToMiles(remainingDistance),
        updatedAt: Date.now()
      }
    };
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
    buildLiveTrip,
    refreshLiveTrip,
    distanceMeters
  };
})();
