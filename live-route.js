/* DetourEats v1.8.9 Hardened Closure Validation
   No account or API token is required.

   Prototype services:
   - OpenStreetMap Nominatim public geocoder
   - Project OSRM public routing server
   - Overpass API for restaurants along the route

   Public services are queried conservatively. A live trip never falls
   back to unrelated demo restaurants when a service is slow or unavailable.
*/
(function () {
  "use strict";

  const GEOCODE_CACHE_KEY = "detoureats_geocode_cache_v2";
  const DISCOVERY_CACHE_KEY = "detoureats_discovery_cache_v5";

  const NOMINATIM_URL =
    "https://nominatim.openstreetmap.org/search";
  const OSRM_ROUTE_URL =
    "https://router.project-osrm.org/route/v1/driving";
  const OSRM_TABLE_URL =
    "https://router.project-osrm.org/table/v1/driving";
  const OVERPASS_URLS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.private.coffee/api/interpreter",
    "https://maps.mail.ru/osm/tools/overpass/api/interpreter"
  ];

  const GEOCODE_TIMEOUT_MS = 8000;
  const BASELINE_ROUTE_TIMEOUT_MS = 10000;
  const TABLE_TIMEOUT_MS = 9000;
  const EXACT_ROUTE_TIMEOUT_MS = 7000;

  const DISCOVERY_TOTAL_BUDGET_MS = 28000;
  const PRACTICAL_CHUNK_TIMEOUT_MS = 7500;
  const OPTIONAL_CHUNK_TIMEOUT_MS = 6500;
  const DISCOVERY_CONCURRENCY = 2;
  const OPTIONAL_DISCOVERY_CONCURRENCY = 1;

  const EXACT_ROUTING_BUDGET_MS = 13000;
  const EXACT_ROUTING_CONCURRENCY = 3;

  const SHORT_ROUTE_THRESHOLD_METERS = 65000;
  const SHORT_ROUTE_OVERPASS_BUDGET_MS = 18000;
  const SHORT_ROUTE_NOMINATIM_TIMEOUT_MS = 6500;
  const SHORT_ROUTE_SEARCH_RADIUS_METERS = 7500;
  const NOMINATIM_FALLBACK_URL =
    "https://nominatim.openstreetmap.org/search";

  const PRACTICAL_RADIUS_METERS = 6000;
  const EXTENDED_RADIUS_METERS = 18000;
  const DESTINATION_RADIUS_METERS = 32000;
  const EXCEPTIONAL_RADIUS_METERS = 32000;
  const HUNGRY_FALLBACK_RADIUS_METERS = 9000;

  const PRACTICAL_CHUNK_LENGTH_METERS = 70000;
  const EXTENDED_CHUNK_LENGTH_METERS = 140000;
  const DESTINATION_CHUNK_LENGTH_METERS = 210000;
  const PRACTICAL_POINT_SPACING_METERS = 32000;
  const OPTIONAL_POINT_SPACING_METERS = 70000;

  const ROUTE_BUCKET_COUNT = 20;
  const MAX_DISCOVERED_CANDIDATES = 36;
  const MAX_TABLE_CANDIDATES = 20;
  const MAX_EXACT_CANDIDATES = 10;

  const activeControllers = new Set();
  let activeBuildGeneration = 0;

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


  function filterOperationalCandidates(
    candidates
  ) {
    const service =
      window.DetourEatsPlaceStatus;

    if (service?.filterCandidates) {
      return service.filterCandidates(
        candidates || []
      );
    }

    return candidates || [];
  }

  async function fetchJson(url, options = {}, timeoutMs = 15000) {
    const controller = new AbortController();
    activeControllers.add(controller);

    const timer = setTimeout(() => {
      controller.abort("timeout");
    }, Math.max(1000, Number(timeoutMs || 15000)));

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
        if (
          controller.signal.reason === "user-cancel" ||
          controller.signal.reason === "superseded"
        ) {
          throw new Error("Route check canceled.");
        }
        throw new Error("A route service took too long to respond.");
      }
      throw error;
    } finally {
      clearTimeout(timer);
      activeControllers.delete(controller);
    }
  }

  function cancelActiveRequests(reason = "user-cancel") {
    activeBuildGeneration += 1;

    for (const controller of activeControllers) {
      try {
        controller.abort(reason);
      } catch {
        // Best-effort cancellation.
      }
    }

    activeControllers.clear();
  }

  function assertBuildActive(generation) {
    if (generation !== activeBuildGeneration) {
      throw new Error("Route check canceled.");
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
      const results = await fetchJson(
        `${NOMINATIM_URL}?${params.toString()}`,
        {},
        GEOCODE_TIMEOUT_MS
      );
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
      `${OSRM_ROUTE_URL}/${coordinateString}?${params.toString()}`,
      {},
      Number(options.timeoutMs || BASELINE_ROUTE_TIMEOUT_MS)
    );

    const result = data?.routes?.[0];
    if (!result) throw new Error("No drivable route was returned.");
    return result;
  }

  async function routeTable(coordinates, timeoutMs = TABLE_TIMEOUT_MS) {
    if (!Array.isArray(coordinates) || coordinates.length < 3) {
      throw new Error(
        "The route matrix requires an origin, destination, and at least one restaurant."
      );
    }

    const coordinateString = coordinates
      .map(pair =>
        `${Number(pair[0]).toFixed(6)},${Number(pair[1]).toFixed(6)}`
      )
      .join(";");

    const candidateCount = coordinates.length - 2;
    const sourceIndexes = [
      0,
      ...Array.from(
        { length: candidateCount },
        (_, index) => index + 1
      )
    ];
    const destinationIndexes = [
      ...Array.from(
        { length: candidateCount },
        (_, index) => index + 1
      ),
      coordinates.length - 1
    ];

    const params = new URLSearchParams({
      sources: sourceIndexes.join(";"),
      destinations: destinationIndexes.join(";"),
      annotations: "duration,distance"
    });

    const data = await fetchJson(
      `${OSRM_TABLE_URL}/${coordinateString}?${params.toString()}`,
      {},
      timeoutMs
    );

    if (
      data?.code !== "Ok" ||
      !Array.isArray(data.durations)
    ) {
      throw new Error(
        "The route timing matrix was unavailable."
      );
    }

    return data;
  }

  async function prepareCuratedCandidates(
    candidates,
    routeContext,
    progressCallback
  ) {
    const prepared = [];

    for (
      const candidate of
      filterOperationalCandidates(
        candidates || []
      )
    ) {
      if (!Array.isArray(candidate.coordinates)) continue;

      const projection = projectPointToRoute(
        candidate.coordinates,
        routeContext
      );

      if (
        !projection ||
        projection.distanceMeters > DESTINATION_RADIUS_METERS
      ) {
        continue;
      }

      prepared.push({
        ...candidate,
        coordinates: candidate.coordinates.map(Number),
        coordinatePrecision:
          candidate.coordinatePrecision ||
          "curated coordinates",
        provenance: "curated",
        discoverySource: null,
        routeOffsetMiles:
          metersToMiles(projection.distanceMeters),
        routeProgress:
          projection.progress,
        routeBucket:
          projection.bucket,
        detourTier:
          getDetourTier(projection.distanceMeters)
      });
    }

    if (prepared.length) {
      progressCallback?.(
        `Adding ${prepared.length} route-relevant curated stop${
          prepared.length === 1 ? "" : "s"
        }`
      );
    }

    return prepared;
  }

  async function buildLiveTrip({
    originCoordinates,
    originText,
    originLabel,
    destinationCoordinates,
    destinationText,
    destinationLabel,
    candidates,
    maxAddedMinutes,
    tripMode,
    progressCallback
  }) {
    cancelActiveRequests("superseded");
    const buildGeneration = activeBuildGeneration;
    assertBuildActive(buildGeneration);

    if (
      !Array.isArray(originCoordinates) &&
      !String(originText || "").trim()
    ) {
      throw new Error(
        "Enter a starting point or use your current location."
      );
    }
    if (!String(destinationText || "").trim()) {
      throw new Error("Enter a destination.");
    }

    progressCallback?.("Locating starting point");
    const origin = Array.isArray(originCoordinates)
      ? {
          coordinates: originCoordinates.map(Number),
          precision: originText
            ? "address autocomplete"
            : "device location",
          label:
            originLabel ||
            originText ||
            "Current location"
        }
      : await geocode(originText);

    assertBuildActive(buildGeneration);
    progressCallback?.("Locating destination");

    const destination = Array.isArray(
      destinationCoordinates
    )
      ? {
          coordinates:
            destinationCoordinates.map(Number),
          precision: "address autocomplete",
          label:
            destinationLabel ||
            destinationText
        }
      : await geocode(destinationText);

    if (
      distanceMeters(
        origin.coordinates,
        destination.coordinates
      ) < 1500
    ) {
      throw new Error(
        "Starting point and destination are too close together."
      );
    }

    assertBuildActive(buildGeneration);
    progressCallback?.("Calculating main route");

    const baseline = await route(
      [
        origin.coordinates,
        destination.coordinates
      ],
      {
        steps: true,
        geometry: true,
        timeoutMs: BASELINE_ROUTE_TIMEOUT_MS
      }
    );

    assertBuildActive(buildGeneration);

    const routeGeometry =
      baseline?.geometry?.coordinates ||
      [
        origin.coordinates,
        destination.coordinates
      ];
    const routeContext =
      buildRouteContext(routeGeometry);

    progressCallback?.(
      "Searching route sections for restaurants"
    );

    let discovery = {
      candidates: [],
      plan:
        createDefaultDiscoveryPlan(tripMode),
      diagnostics: {
        status: "unavailable",
        totalChunks: 0,
        completedChunks: 0,
        failedChunks: 0,
        cachedChunks: 0,
        rawElements: 0,
        statusExcluded: 0,
        knownClosedExcluded: 0,
        staleExcluded: 0
      }
    };

    try {
      discovery = await discoverRestaurants(
        routeContext,
        progressCallback,
        {
          tripMode,
          routeDistanceMeters:
            Number(baseline.distance || 0),
          buildGeneration
        }
      );
    } catch (error) {
      if (
        /canceled/i.test(error?.message || "") &&
        !/timed out/i.test(error?.message || "")
      ) {
        throw error;
      }

      console.warn(
        "Restaurant discovery unavailable; retaining verified driving route:",
        error
      );

      discovery = {
        candidates: [],
        plan: {
          ...createDefaultDiscoveryPlan(
            tripMode
          ),
          status: "unavailable",
          label:
            "Driving route verified · restaurant search unavailable",
          summary:
            "The driving route is valid, but restaurant discovery did not respond."
        },
        diagnostics: {
          status: "unavailable",
          totalChunks: 0,
          completedChunks: 0,
          failedChunks: 1,
          cachedChunks: 0,
          rawElements: 0,
          practicalElements: 0,
          extendedElements: 0,
          destinationElements: 0,
          exceptionalElements: 0,
          statusExcluded: 0,
          knownClosedExcluded: 0,
          staleExcluded: 0,
          routeVerified: true
        }
      };
    }

    assertBuildActive(buildGeneration);

    const relevantCurated =
      await prepareCuratedCandidates(
        candidates,
        routeContext,
        progressCallback
      );

    const mergedCandidates =
      selectCandidatesForRouting(
        filterOperationalCandidates(
          mergeCandidates(
            relevantCurated,
            discovery.candidates
          )
        )
      );

    const session = {
      originText: String(originText || ""),
      originLabel:
        origin.label ||
        String(
          originText || "Current location"
        ),
      originCoordinates: origin.coordinates,
      destinationText,
      destinationLabel:
        destination.label ||
        destinationText,
      destinationCoordinates:
        destination.coordinates,
      routeGeometry,
      routeContext,
      candidates: mergedCandidates,
      curatedSourceCandidates:
        candidates || [],
      initialDurationSeconds:
        Number(baseline.duration || 0),
      initialDistanceMeters:
        Number(baseline.distance || 0),
      discoveryStatus:
        discovery.plan.status,
      discoveryPlan:
        discovery.plan,
      discoveryDiagnostics:
        discovery.diagnostics,
      statusExcludedCount:
        Number(
          discovery.diagnostics?.statusExcluded ||
          0
        ),
      tripMode:
        String(tripMode || "balanced"),
      discoveredCount:
        discovery.candidates.length,
      curatedCount:
        relevantCurated.length,
      lastDiscoveryAt: Date.now(),
      createdAt: Date.now()
    };

    const snapshot = await refreshLiveTrip({
      session,
      originCoordinates:
        origin.coordinates,
      maxAddedMinutes,
      progressCallback,
      baselineRoute: baseline,
      buildGeneration,
      forceRediscovery: false
    });

    return { session, snapshot };
  }

  async function refreshLiveTrip({
    session,
    originCoordinates,
    maxAddedMinutes,
    progressCallback,
    baselineRoute = null,
    buildGeneration = activeBuildGeneration,
    forceRediscovery = false
  }) {
    assertBuildActive(buildGeneration);
    progressCallback?.("Updating driving route");

    const shouldRediscover =
      forceRediscovery ||
      !Array.isArray(session.candidates) ||
      session.candidates.length === 0 ||
      session.discoveryStatus === "unavailable" ||
      Date.now() -
        Number(session.lastDiscoveryAt || 0) >
        15 * 60 * 1000;

    const baseline =
      baselineRoute ||
      await route(
        [
          originCoordinates,
          session.destinationCoordinates
        ],
        {
          steps: true,
          geometry: shouldRediscover,
          timeoutMs:
            BASELINE_ROUTE_TIMEOUT_MS
        }
      );

    assertBuildActive(buildGeneration);

    if (shouldRediscover) {
      const geometry =
        baseline?.geometry?.coordinates ||
        session.routeGeometry ||
        [
          originCoordinates,
          session.destinationCoordinates
        ];
      const routeContext =
        buildRouteContext(geometry);

      progressCallback?.(
        "Refreshing restaurant search on the remaining route"
      );

      try {
        const discovery =
          await discoverRestaurants(
            routeContext,
            progressCallback,
            {
              tripMode: session.tripMode,
              routeDistanceMeters:
                Number(
                  baseline.distance || 0
                ),
              buildGeneration
            }
          );

        const curated =
          await prepareCuratedCandidates(
            session.curatedSourceCandidates ||
              [],
            routeContext,
            progressCallback
          );

        session.routeGeometry = geometry;
        session.routeContext = routeContext;
        session.candidates =
          selectCandidatesForRouting(
            filterOperationalCandidates(
              mergeCandidates(
                curated,
                discovery.candidates
              )
            )
          );
        session.discoveryStatus =
          discovery.plan.status;
        session.discoveryPlan =
          discovery.plan;
        session.discoveryDiagnostics =
          discovery.diagnostics;
        session.statusExcludedCount =
          Number(
            discovery.diagnostics?.statusExcluded ||
            0
          );
        session.discoveredCount =
          discovery.candidates.length;
        session.curatedCount =
          curated.length;
        session.lastDiscoveryAt =
          Date.now();
      } catch (error) {
        if (/canceled/i.test(error?.message || "")) {
          throw error;
        }
        console.warn(
          "Restaurant rediscovery delayed:",
          error
        );
      }
    }

    assertBuildActive(buildGeneration);

    /*
      Revalidate even when restaurant rediscovery did not run. This removes
      stale candidates already held in an active trip session.
    */
    session.candidates =
      filterOperationalCandidates(
        session.candidates || []
      );

    const routing =
      await screenAndRouteCandidates({
        session,
        originCoordinates,
        baseline,
        maxAddedMinutes,
        progressCallback,
        buildGeneration
      });

    assertBuildActive(buildGeneration);

    const initialDuration = Math.max(
      1,
      Number(
        session.initialDurationSeconds ||
        baseline.duration
      )
    );
    const initialDistance = Math.max(
      1,
      Number(
        session.initialDistanceMeters ||
        baseline.distance
      )
    );
    const remainingDuration =
      Number(baseline.duration || 0);
    const remainingDistance =
      Number(baseline.distance || 0);

    const durationProgress = clamp(
      1 -
        remainingDuration /
          initialDuration,
      0,
      1
    );
    const distanceProgress = clamp(
      1 -
        remainingDistance /
          initialDistance,
      0,
      1
    );

    const liveCandidates =
      filterOperationalCandidates(
        routing.candidates
      );

    const routedDiscovered =
      liveCandidates.filter(
        candidate =>
          candidate.provenance ===
          "route-discovered"
      ).length;
    const routedCurated =
      liveCandidates.filter(
        candidate =>
          candidate.provenance !==
          "route-discovered"
      ).length;

    const searchOutcome =
      determineSearchOutcome({
        discoveryStatus:
          session.discoveryStatus,
        discoveredRaw:
          Number(
            session.discoveryDiagnostics
              ?.rawElements || 0
          ),
        candidatePool:
          Number(
            session.candidates?.length || 0
          ),
        matrixStatus:
          routing.matrixStatus,
        qualifyingCount:
          liveCandidates.length,
        statusExcluded:
          Number(
            session.statusExcludedCount ||
            0
          )
      });

    const plan =
      session.discoveryPlan || {};

    return {
      candidates: liveCandidates,
      originCoordinates,
      destinationCoordinates:
        session.destinationCoordinates,
      metrics: {
        originLabel:
          session.originLabel,
        destinationLabel:
          session.destinationLabel,
        totalMinutes: Math.round(
          remainingDuration / 60
        ),
        totalMiles:
          metersToMiles(
            remainingDistance
          ),
        totalCandidates:
          liveCandidates.length,
        progressPercent:
          Math.round(
            Math.max(
              durationProgress,
              distanceProgress
            ) * 100
          ),
        remainingMinutes:
          Math.round(
            remainingDuration / 60
          ),
        remainingMiles:
          metersToMiles(
            remainingDistance
          ),

        discoveredCount:
          routedDiscovered,
        curatedCount:
          routedCurated,
        rawDiscoveredCount:
          Number(
            session.discoveryDiagnostics
              ?.rawElements || 0
          ),
        candidatePoolCount:
          Number(
            session.candidates?.length || 0
          ),
        matrixScreenedCount:
          routing.matrixScreenedCount,
        exactRouteCount:
          routing.exactRouteCount,
        estimatedRouteCount:
          routing.estimatedRouteCount,

        discoveryStatus:
          session.discoveryStatus,
        matrixStatus:
          routing.matrixStatus,
        exactRoutingStatus:
          routing.exactRoutingStatus,
        searchOutcome,
        routeVerified: true,
        restaurantSearchFailed:
          session.discoveryStatus ===
          "unavailable",
        shortRouteSearch:
          Boolean(
            session.discoveryDiagnostics
              ?.shortRoute
          ),
        discoveryProvider:
          session.discoveryDiagnostics
            ?.providerLabel ||
          session.discoveryPlan
            ?.providerLabel ||
          "OpenStreetMap",
        shortRouteFallbackUsed:
          Boolean(
            session.discoveryDiagnostics
              ?.fallbackSucceeded
          ),
        statusExcludedCount:
          Number(
            session.statusExcludedCount ||
            0
          ),
        knownClosedExcludedCount:
          Number(
            session.discoveryDiagnostics
              ?.knownClosedExcluded ||
            0
          ),
        staleExcludedCount:
          Number(
            session.discoveryDiagnostics
              ?.staleExcluded ||
            0
          ),

        discoveryChunksTotal:
          Number(
            session.discoveryDiagnostics
              ?.totalChunks || 0
          ),
        discoveryChunksCompleted:
          Number(
            session.discoveryDiagnostics
              ?.completedChunks || 0
          ),
        discoveryChunksFailed:
          Number(
            session.discoveryDiagnostics
              ?.failedChunks || 0
          ),
        discoveryChunksCached:
          Number(
            session.discoveryDiagnostics
              ?.cachedChunks || 0
          ),

        practicalCount:
          liveCandidates.filter(
            candidate =>
              candidate.detourTier ===
              "practical"
          ).length,
        extendedCount:
          liveCandidates.filter(
            candidate =>
              candidate.detourTier ===
              "extended"
          ).length,
        destinationDetourCount:
          liveCandidates.filter(
            candidate =>
              candidate.detourTier ===
              "destination"
          ).length,

        searchRadiusMiles:
          Number(
            plan.maximumRadiusMiles ||
            metersToMiles(
              PRACTICAL_RADIUS_METERS
            )
          ),
        searchMode:
          plan.label ||
          "Segmented route search",
        searchSummary:
          plan.summary ||
          "Restaurant discovery was checked in smaller route sections.",
        extendedSearchUsed:
          Boolean(plan.extendedUsed),
        destinationSearchUsed:
          Boolean(
            plan.destinationUsed
          ),
        exceptionalSearchUsed:
          Boolean(
            plan.exceptionalSearchUsed
          ),
        exceptionalRadiusMiles:
          Number(
            plan.exceptionalRadiusMiles ||
            metersToMiles(
              EXCEPTIONAL_RADIUS_METERS
            )
          ),
        exceptionalCandidateCount:
          liveCandidates.filter(
            candidate =>
              candidate.exceptionalScan ||
              candidate.exceptionalOnly
          ).length,

        updatedAt: Date.now()
      }
    };
  }

  async function screenAndRouteCandidates({
    session,
    originCoordinates,
    baseline,
    maxAddedMinutes,
    progressCallback,
    buildGeneration
  }) {
    const sourceCandidates =
      selectCandidatesForRouting(
        filterOperationalCandidates(
          session.candidates || []
        )
      ).slice(0, MAX_TABLE_CANDIDATES);

    if (!sourceCandidates.length) {
      return {
        candidates: [],
        matrixStatus: "not-needed",
        exactRoutingStatus: "not-needed",
        matrixScreenedCount: 0,
        exactRouteCount: 0,
        estimatedRouteCount: 0
      };
    }

    progressCallback?.(
      `Screening ${sourceCandidates.length} restaurants for real driving time`
    );

    let matrixCandidates = [];
    let matrixStatus = "unavailable";

    try {
      const coordinates = [
        originCoordinates,
        ...sourceCandidates.map(
          candidate =>
            candidate.coordinates
        ),
        session.destinationCoordinates
      ];
      const tableResult =
        await routeTable(
          coordinates,
          TABLE_TIMEOUT_MS
        );

      matrixCandidates =
        applyRouteMatrix({
          candidates:
            sourceCandidates,
          tableResult,
          baseline,
          maxAddedMinutes,
          tripMode:
            session.tripMode
        });
      matrixStatus =
        matrixCandidates.length
          ? "complete"
          : "complete-no-qualifiers";
    } catch (error) {
      if (/canceled/i.test(error?.message || "")) {
        throw error;
      }

      console.warn(
        "Route matrix unavailable; using a smaller exact-route fallback:",
        error
      );
      matrixStatus = "unavailable";
      matrixCandidates =
        sourceCandidates
          .sort(
            (a, b) =>
              preliminaryCandidateRank(b) -
              preliminaryCandidateRank(a)
          )
          .slice(0, 8)
          .map(candidate => ({
            ...candidate,
            matrixAddedMinutes: null,
            routeCalculationMethod:
              "pending-exact",
            routeTimingConfidence:
              "pending"
          }));
    }

    if (!matrixCandidates.length) {
      return {
        candidates: [],
        matrixStatus,
        exactRoutingStatus:
          "not-needed",
        matrixScreenedCount: 0,
        exactRouteCount: 0,
        estimatedRouteCount: 0
      };
    }

    const exactTargets =
      selectExactRouteTargets(
        matrixCandidates
      );

    const exactResults =
      await refineExactRoutes({
        candidates: exactTargets,
        originCoordinates,
        destinationCoordinates:
          session.destinationCoordinates,
        baseline,
        buildGeneration,
        progressCallback
      });

    const exactById = new Map(
      exactResults.map(candidate => [
        String(candidate.id),
        candidate
      ])
    );

    const finalCandidates = [];

    for (const candidate of matrixCandidates) {
      const exact = exactById.get(
        String(candidate.id)
      );

      if (exact) {
        finalCandidates.push(exact);
        continue;
      }

      if (
        Number.isFinite(
          Number(
            candidate.matrixAddedMinutes
          )
        )
      ) {
        const minutesAhead =
          Math.max(
            0,
            Number(
              candidate.matrixMinutesAhead ||
              0
            )
          );
        const arrival = new Date(
          Date.now() +
            minutesAhead * 60 * 1000
        );

        finalCandidates.push({
          ...candidate,
          liveRoute: true,
          addedMinutes:
            Number(
              candidate.matrixAddedMinutes
            ),
          estimatedAddedMinutes:
            Number(
              candidate.matrixAddedMinutes
            ),
          minutesAhead,
          distanceAheadMiles:
            Number(
              candidate.matrixDistanceAheadMiles ||
              0
            ),
          arrivalClock:
            formatClock(arrival),
          arrivalTime:
            formatClock(arrival),
          arrivalTimestamp:
            arrival.getTime(),
          decisionMinutes:
            Math.max(
              0,
              Math.ceil(
                minutesAhead - 10
              )
            ),
          decisionInstruction:
            "Prepare to leave the main route for this stop.",
          routeCalculatedAt:
            Date.now(),
          routeCalculationMethod:
            "matrix",
          routeTimingConfidence:
            "estimated"
        });
      }
    }

    finalCandidates.sort((a, b) => {
      if (
        Number(a.minutesAhead || 0) !==
        Number(b.minutesAhead || 0)
      ) {
        return (
          Number(a.minutesAhead || 0) -
          Number(b.minutesAhead || 0)
        );
      }
      return (
        Number(
          a.estimatedAddedMinutes || 0
        ) -
        Number(
          b.estimatedAddedMinutes || 0
        )
      );
    });

    finalCandidates.forEach(
      (candidate, index) => {
        candidate.seq = index + 1;
      }
    );

    const exactRouteCount =
      finalCandidates.filter(
        candidate =>
          candidate.routeCalculationMethod ===
          "exact"
      ).length;
    const estimatedRouteCount =
      finalCandidates.filter(
        candidate =>
          candidate.routeCalculationMethod ===
          "matrix"
      ).length;

    let exactRoutingStatus = "unavailable";
    if (!exactTargets.length) {
      exactRoutingStatus = "not-needed";
    } else if (
      exactRouteCount ===
      exactTargets.length
    ) {
      exactRoutingStatus = "complete";
    } else if (exactRouteCount > 0) {
      exactRoutingStatus = "partial";
    } else if (
      estimatedRouteCount > 0
    ) {
      exactRoutingStatus =
        "matrix-fallback";
    }

    return {
      candidates: finalCandidates,
      matrixStatus,
      exactRoutingStatus,
      matrixScreenedCount:
        matrixCandidates.length,
      exactRouteCount,
      estimatedRouteCount
    };
  }

  function applyRouteMatrix({
    candidates,
    tableResult,
    baseline,
    maxAddedMinutes,
    tripMode
  }) {
    const durations =
      tableResult.durations || [];
    const distances =
      tableResult.distances || [];
    const candidateCount =
      candidates.length;
    const maximumDetour =
      getMaximumCandidateDetour(
        maxAddedMinutes,
        tripMode
      );
    const results = [];

    for (
      let candidateIndex = 0;
      candidateIndex < candidateCount;
      candidateIndex += 1
    ) {
      const sourceRow =
        candidateIndex + 1;
      const candidateColumn =
        candidateIndex;
      const destinationColumn =
        candidateCount;

      const originToCandidate =
        Number(
          durations?.[0]?.[
            candidateColumn
          ]
        );
      const candidateToDestination =
        Number(
          durations?.[sourceRow]?.[
            destinationColumn
          ]
        );
      const originDistance =
        Number(
          distances?.[0]?.[
            candidateColumn
          ]
        );

      if (
        !Number.isFinite(
          originToCandidate
        ) ||
        !Number.isFinite(
          candidateToDestination
        )
      ) {
        continue;
      }

      const addedMinutes =
        Math.max(
          0,
          Math.round(
            (
              originToCandidate +
              candidateToDestination -
              Number(
                baseline.duration || 0
              )
            ) / 60
          )
        );

      const candidate =
        candidates[candidateIndex];
      const allowed =
        candidate.exceptionalOnly
          ? Math.max(
              maximumDetour,
              45
            )
          : maximumDetour;

      if (addedMinutes > allowed) {
        continue;
      }

      const minutesAhead =
        Math.max(
          0,
          Math.ceil(
            originToCandidate / 60
          )
        );

      if (
        minutesAhead >
        Math.ceil(
          Number(
            baseline.duration || 0
          ) / 60
        ) + 45
      ) {
        continue;
      }

      results.push({
        ...candidate,
        matrixAddedMinutes:
          addedMinutes,
        matrixMinutesAhead:
          minutesAhead,
        matrixDistanceAheadMiles:
          Number.isFinite(
            originDistance
          )
            ? metersToMiles(
                originDistance
              )
            : 0,
        routeCalculationMethod:
          "matrix-screened",
        routeTimingConfidence:
          "estimated",
        matrixRank:
          preliminaryCandidateRank(
            candidate,
            addedMinutes
          )
      });
    }

    return results
      .sort(
        (a, b) =>
          Number(b.matrixRank || 0) -
          Number(a.matrixRank || 0)
      )
      .slice(0, MAX_TABLE_CANDIDATES);
  }

  function preliminaryCandidateRank(
    candidate,
    addedMinutes = null
  ) {
    const added =
      Number.isFinite(
        Number(addedMinutes)
      )
        ? Number(addedMinutes)
        : 12;

    return (
      Number(
        candidate.destinationWorthiness ||
        0
      ) * 1.25 +
      Number(
        candidate.foodReputation || 0
      ) +
      Number(
        candidate.uniqueness || 0
      ) * 0.5 +
      Number(
        candidate.destinationEvidenceScore ||
        0
      ) * 4 +
      (
        candidate.operationalConfidence === "high"
          ? 18
          : candidate.operationalConfidence === "medium"
            ? 7
            : -24
      ) -
      added * 1.8 -
      Number(
        candidate.routeOffsetMiles || 0
      ) * 0.5 +
      (
        candidate.provenance ===
        "curated"
          ? 18
          : 0
      ) +
      (
        candidate.exceptionalScan
          ? 12
          : 0
      )
    );
  }

  function selectExactRouteTargets(
    candidates
  ) {
    const selected = [];
    const selectedIds = new Set();

    function add(candidate) {
      if (
        !candidate ||
        selectedIds.has(
          String(candidate.id)
        ) ||
        selected.length >=
          MAX_EXACT_CANDIDATES
      ) {
        return;
      }
      selectedIds.add(
        String(candidate.id)
      );
      selected.push(candidate);
    }

    candidates
      .slice()
      .sort(
        (a, b) =>
          Number(b.matrixRank || 0) -
          Number(a.matrixRank || 0)
      )
      .slice(0, 6)
      .forEach(add);

    for (
      let bucketGroup = 0;
      bucketGroup < 4;
      bucketGroup += 1
    ) {
      const minimum =
        bucketGroup * 5;
      const maximum =
        minimum + 4;
      const candidate =
        candidates
          .filter(item =>
            Number(item.routeBucket) >=
              minimum &&
            Number(item.routeBucket) <=
              maximum
          )
          .sort(
            (a, b) =>
              Number(b.matrixRank || 0) -
              Number(a.matrixRank || 0)
          )[0];
      add(candidate);
    }

    candidates
      .filter(
        candidate =>
          candidate.exceptionalScan ||
          candidate.exceptionalOnly
      )
      .slice(0, 2)
      .forEach(add);

    return selected;
  }

  async function refineExactRoutes({
    candidates,
    originCoordinates,
    destinationCoordinates,
    baseline,
    buildGeneration,
    progressCallback
  }) {
    if (!candidates.length) return [];

    const deadline =
      Date.now() +
      EXACT_ROUTING_BUDGET_MS;
    let cursor = 0;
    let attempted = 0;
    const results = [];

    async function worker() {
      while (true) {
        assertBuildActive(
          buildGeneration
        );

        const index = cursor;
        cursor += 1;
        if (index >= candidates.length) {
          return;
        }

        const remaining =
          deadline - Date.now();
        if (remaining < 1000) return;

        const candidate =
          candidates[index];
        attempted += 1;
        progressCallback?.(
          `Confirming best detours ${attempted} of ${candidates.length}`
        );

        try {
          const via = await route(
            [
              originCoordinates,
              candidate.coordinates,
              destinationCoordinates
            ],
            {
              steps: true,
              geometry: false,
              timeoutMs:
                Math.min(
                  EXACT_ROUTE_TIMEOUT_MS,
                  remaining
                )
            }
          );

          const firstLeg =
            via.legs?.[0];
          if (!firstLeg) continue;

          const addedMinutes =
            Math.max(
              0,
              Math.round(
                (
                  Number(
                    via.duration || 0
                  ) -
                  Number(
                    baseline.duration ||
                    0
                  )
                ) / 60
              )
            );
          const minutesAhead =
            Math.max(
              0,
              Math.ceil(
                Number(
                  firstLeg.duration ||
                  0
                ) / 60
              )
            );
          const decision =
            findDecisionPoint(firstLeg);
          const arrival = new Date(
            Date.now() +
              Number(
                firstLeg.duration || 0
              ) * 1000
          );

          results.push({
            ...candidate,
            liveRoute: true,
            addedMinutes,
            estimatedAddedMinutes:
              addedMinutes,
            minutesAhead,
            distanceAheadMiles:
              metersToMiles(
                Number(
                  firstLeg.distance || 0
                )
              ),
            arrivalClock:
              formatClock(arrival),
            arrivalTime:
              formatClock(arrival),
            arrivalTimestamp:
              arrival.getTime(),
            decisionMinutes:
              Math.max(
                0,
                Math.ceil(
                  Number(
                    decision.seconds || 0
                  ) / 60
                )
              ),
            decisionInstruction:
              decision.instruction,
            routeCalculatedAt:
              Date.now(),
            routeCalculationMethod:
              "exact",
            routeTimingConfidence:
              "high"
          });
        } catch (error) {
          if (
            /canceled/i.test(
              error?.message || ""
            )
          ) {
            throw error;
          }
          console.warn(
            `Exact route confirmation failed for ${candidate.name}; retaining matrix estimate when available.`,
            error
          );
        }
      }
    }

    const workerCount =
      Math.min(
        EXACT_ROUTING_CONCURRENCY,
        candidates.length
      );

    await Promise.all(
      Array.from(
        { length: workerCount },
        () => worker()
      )
    );

    return results;
  }

  async function discoverRestaurants(
    routeContext,
    progressCallback,
    options = {}
  ) {
    const style =
      normalizeTripMode(
        options.tripMode
      );
    const buildGeneration =
      options.buildGeneration ??
      activeBuildGeneration;
    const deadline =
      Date.now() +
      DISCOVERY_TOTAL_BUDGET_MS;

    assertBuildActive(buildGeneration);

    if (
      Number(options.routeDistanceMeters || 0) <=
      SHORT_ROUTE_THRESHOLD_METERS
    ) {
      return await discoverShortRouteRestaurants(
        routeContext,
        progressCallback,
        {
          style,
          buildGeneration
        }
      );
    }


    const practicalChunks =
      buildRouteChunks(
        routeContext,
        PRACTICAL_CHUNK_LENGTH_METERS,
        PRACTICAL_POINT_SPACING_METERS
      );
    const extendedChunks =
      buildRouteChunks(
        routeContext,
        EXTENDED_CHUNK_LENGTH_METERS,
        OPTIONAL_POINT_SPACING_METERS
      );
    const destinationChunks =
      buildRouteChunks(
        routeContext,
        DESTINATION_CHUNK_LENGTH_METERS,
        OPTIONAL_POINT_SPACING_METERS
      );

    const practicalPromise =
      discoverTierByChunks({
        routeContext,
        chunks: practicalChunks,
        radiusMeters:
          PRACTICAL_RADIUS_METERS,
        evidenceMode: "all",
        searchTier: "practical",
        progressCallback,
        buildGeneration,
        deadline,
        timeoutMs:
          PRACTICAL_CHUNK_TIMEOUT_MS,
        concurrency:
          DISCOVERY_CONCURRENCY
      });

    const runExtended =
      style === "balanced" ||
      style === "adventure";

    const extendedPromise =
      runExtended
        ? discoverTierByChunks({
            routeContext,
            chunks:
              extendedChunks,
            radiusMeters:
              EXTENDED_RADIUS_METERS,
            evidenceMode:
              "evidence",
            searchTier:
              "extended",
            progressCallback,
            buildGeneration,
            deadline,
            timeoutMs:
              OPTIONAL_CHUNK_TIMEOUT_MS,
            concurrency:
              OPTIONAL_DISCOVERY_CONCURRENCY
          })
        : Promise.resolve(
            emptyTierDiagnostics(
              "extended"
            )
          );

    const destinationPromise =
      style === "adventure"
        ? discoverTierByChunks({
            routeContext,
            chunks:
              destinationChunks,
            radiusMeters:
              DESTINATION_RADIUS_METERS,
            evidenceMode:
              "destination",
            searchTier:
              "destination",
            progressCallback,
            buildGeneration,
            deadline,
            timeoutMs:
              OPTIONAL_CHUNK_TIMEOUT_MS,
            concurrency:
              OPTIONAL_DISCOVERY_CONCURRENCY
          })
        : discoverTierByChunks({
            routeContext,
            chunks:
              destinationChunks,
            radiusMeters:
              EXCEPTIONAL_RADIUS_METERS,
            evidenceMode:
              "exceptional",
            searchTier:
              "exceptional",
            progressCallback,
            buildGeneration,
            deadline,
            timeoutMs:
              OPTIONAL_CHUNK_TIMEOUT_MS,
            concurrency:
              OPTIONAL_DISCOVERY_CONCURRENCY
          });

    let [
      practical,
      extended,
      destinationOrExceptional
    ] = await Promise.all([
      practicalPromise,
      extendedPromise,
      destinationPromise
    ]);

    assertBuildActive(buildGeneration);

    if (
      style === "hungry" &&
      practical.items.length < 8 &&
      Date.now() < deadline - 1500
    ) {
      extended =
        await discoverTierByChunks({
          routeContext,
          chunks:
            extendedChunks,
          radiusMeters:
            HUNGRY_FALLBACK_RADIUS_METERS,
          evidenceMode:
            "evidence",
          searchTier:
            "extended",
          progressCallback,
          buildGeneration,
          deadline,
          timeoutMs:
            OPTIONAL_CHUNK_TIMEOUT_MS,
          concurrency:
            OPTIONAL_DISCOVERY_CONCURRENCY
        });
    }

    const destination =
      style === "adventure"
        ? destinationOrExceptional
        : emptyTierDiagnostics(
            "destination"
          );
    const exceptional =
      style === "adventure"
        ? {
            ...emptyTierDiagnostics(
              "exceptional"
            ),
            items:
              destination.items
                .filter(
                  isStrictExceptionalDiscoveryCandidate
                )
                .map(candidate => ({
                  ...candidate,
                  exceptionalScan:
                    true,
                  exceptionalOnly:
                    false
                }))
          }
        : destinationOrExceptional;

    const combined =
      dedupeCandidates([
        ...practical.items,
        ...extended.items,
        ...destination.items,
        ...exceptional.items
      ]);

    const candidates =
      selectDistributedDiscovered(
        combined
      );

    const allDiagnostics = [
      practical,
      extended,
      destinationOrExceptional
    ];
    const totalChunks =
      allDiagnostics.reduce(
        (sum, item) =>
          sum +
          Number(
            item.diagnostics.totalChunks ||
            0
          ),
        0
      );
    const completedChunks =
      allDiagnostics.reduce(
        (sum, item) =>
          sum +
          Number(
            item.diagnostics.completedChunks ||
            0
          ),
        0
      );
    const failedChunks =
      allDiagnostics.reduce(
        (sum, item) =>
          sum +
          Number(
            item.diagnostics.failedChunks ||
            0
          ),
        0
      );
    const cachedChunks =
      allDiagnostics.reduce(
        (sum, item) =>
          sum +
          Number(
            item.diagnostics.cachedChunks ||
            0
          ),
        0
      );
    const rawElements =
      allDiagnostics.reduce(
        (sum, item) =>
          sum +
          Number(
            item.diagnostics.rawElements ||
            0
          ),
        0
      );
    const statusExcluded =
      allDiagnostics.reduce(
        (sum, item) =>
          sum +
          Number(
            item.diagnostics.statusExcluded ||
            0
          ),
        0
      );
    const knownClosedExcluded =
      allDiagnostics.reduce(
        (sum, item) =>
          sum +
          Number(
            item.diagnostics.knownClosedExcluded ||
            0
          ),
        0
      );
    const staleExcluded =
      allDiagnostics.reduce(
        (sum, item) =>
          sum +
          Number(
            item.diagnostics.staleExcluded ||
            0
          ),
        0
      );

    let status = "complete";
    if (
      completedChunks === 0 &&
      cachedChunks === 0
    ) {
      status = "unavailable";
    } else if (failedChunks > 0) {
      status = "partial";
    } else if (
      rawElements === 0
    ) {
      status = "empty";
    }

    const maximumRadius =
      style === "adventure"
        ? DESTINATION_RADIUS_METERS
        : runExtended ||
          extended.items.length
          ? style === "hungry"
            ? HUNGRY_FALLBACK_RADIUS_METERS
            : EXTENDED_RADIUS_METERS
          : PRACTICAL_RADIUS_METERS;

    const plan = {
      status,
      style,
      practicalUsed: true,
      extendedUsed:
        runExtended ||
        extended.items.length > 0,
      destinationUsed:
        style === "adventure",
      exceptionalSearchUsed: true,
      practicalRadiusMiles:
        metersToMiles(
          PRACTICAL_RADIUS_METERS
        ),
      extendedRadiusMiles:
        runExtended ||
        extended.items.length
          ? metersToMiles(
              style === "hungry"
                ? HUNGRY_FALLBACK_RADIUS_METERS
                : EXTENDED_RADIUS_METERS
            )
          : 0,
      destinationRadiusMiles:
        style === "adventure"
          ? metersToMiles(
              DESTINATION_RADIUS_METERS
            )
          : 0,
      exceptionalRadiusMiles:
        metersToMiles(
          EXCEPTIONAL_RADIUS_METERS
        ),
      maximumRadiusMiles:
        metersToMiles(
          maximumRadius
        ),
      label:
        status === "partial"
          ? "Segmented route search · partial results retained"
          : status === "unavailable"
            ? "Driving route ready · restaurant search unavailable"
            : style === "adventure"
              ? "Segmented search · destination detours included"
              : runExtended ||
                extended.items.length
                ? "Segmented search · extended detours included"
                : "Segmented search · practical corridor",
      summary:
        buildSegmentedSearchSummary({
          style,
          status,
          totalChunks,
          completedChunks,
          failedChunks,
          rawElements,
          practicalCount:
            practical.items.length,
          extendedCount:
            extended.items.length,
          destinationCount:
            destination.items.length,
          exceptionalCount:
            exceptional.items.length
        })
    };

    return {
      candidates,
      plan,
      diagnostics: {
        status,
        totalChunks,
        completedChunks,
        failedChunks,
        cachedChunks,
        rawElements,
        practicalElements:
          practical.diagnostics.rawElements,
        extendedElements:
          extended.diagnostics.rawElements,
        destinationElements:
          destination.diagnostics.rawElements,
        exceptionalElements:
          exceptional.diagnostics.rawElements,
        statusExcluded,
        knownClosedExcluded,
        staleExcluded
      }
    };
  }

  async function discoverShortRouteRestaurants(
    routeContext,
    progressCallback,
    {
      style,
      buildGeneration
    }
  ) {
    assertBuildActive(buildGeneration);

    const points = buildShortRouteSearchPoints(
      routeContext
    );

    progressCallback?.(
      "Searching nearby restaurants along the short route"
    );

    let overpassItems = [];
    let overpassSucceeded = false;
    let overpassRaw = 0;
    let statusExcluded = 0;

    try {
      const query = buildOverpassChunkQuery(
        points,
        SHORT_ROUTE_SEARCH_RADIUS_METERS,
        "all"
      );

      const result = await fetchShortRouteOverpass({
        query,
        timeoutMs:
          SHORT_ROUTE_OVERPASS_BUDGET_MS
      });

      overpassSucceeded = true;
      overpassRaw = result.elements.length;

      for (const element of result.elements) {
        const assessment =
          window.DetourEatsPlaceStatus
            ?.assessOsmElement?.(element) ||
          {
            blocked: false,
            status: "unverified",
            confidence: "low",
            reason:
              "Business status validation was unavailable.",
            lastCheckedAt: "",
            ageDays: 99999,
            signalCount: 0
          };

        if (assessment.blocked) {
          statusExcluded += 1;
          continue;
        }

        const candidate = convertOsmElement(
          element,
          routeContext,
          "practical",
          assessment
        );

        if (candidate) {
          overpassItems.push(candidate);
        }
      }
    } catch (error) {
      console.warn(
        "Short-route OpenStreetMap search unavailable:",
        error
      );
    }

    assertBuildActive(buildGeneration);

    let fallbackItems = [];
    let fallbackSucceeded = false;

    if (overpassItems.length < 5) {
      progressCallback?.(
        "Using a local restaurant fallback search"
      );

      try {
        fallbackItems =
          await discoverShortRouteWithNominatim(
            routeContext,
            buildGeneration
          );
        fallbackSucceeded = true;
      } catch (error) {
        console.warn(
          "Short-route local fallback unavailable:",
          error
        );
      }
    }

    const candidates =
      selectDistributedDiscovered(
        dedupeCandidates([
          ...overpassItems,
          ...fallbackItems
        ])
      );

    let status = "complete";
    if (
      !overpassSucceeded &&
      !fallbackSucceeded
    ) {
      status = "unavailable";
    } else if (!candidates.length) {
      status = "empty";
    } else if (
      !overpassSucceeded ||
      fallbackSucceeded
    ) {
      status = "fallback";
    }

    const providerLabel =
      overpassSucceeded && fallbackSucceeded
        ? "OpenStreetMap plus local fallback"
        : overpassSucceeded
          ? "OpenStreetMap"
          : fallbackSucceeded
            ? "Bounded local fallback"
            : "Unavailable";

    return {
      candidates,
      plan: {
        status,
        style,
        practicalUsed: true,
        extendedUsed: false,
        destinationUsed: false,
        exceptionalSearchUsed: false,
        practicalRadiusMiles:
          metersToMiles(
            SHORT_ROUTE_SEARCH_RADIUS_METERS
          ),
        extendedRadiusMiles: 0,
        destinationRadiusMiles: 0,
        exceptionalRadiusMiles: 0,
        maximumRadiusMiles:
          metersToMiles(
            SHORT_ROUTE_SEARCH_RADIUS_METERS
          ),
        label:
          status === "fallback"
            ? "Short-route local search · fallback used"
            : status === "unavailable"
              ? "Short-route restaurant search unavailable"
              : "Short-route local search",
        summary:
          status === "unavailable"
            ? "Neither local restaurant provider responded."
            : `${candidates.length} route-relevant local restaurant record${candidates.length === 1 ? "" : "s"} retained using ${providerLabel}.`,
        shortRoute: true,
        providerLabel
      },
      diagnostics: {
        status,
        totalChunks: 1,
        completedChunks:
          overpassSucceeded ||
          fallbackSucceeded
            ? 1
            : 0,
        failedChunks:
          overpassSucceeded ||
          fallbackSucceeded
            ? 0
            : 1,
        cachedChunks: 0,
        rawElements:
          overpassRaw +
          fallbackItems.length,
        practicalElements:
          candidates.length,
        extendedElements: 0,
        destinationElements: 0,
        exceptionalElements: 0,
        statusExcluded,
        knownClosedExcluded: 0,
        staleExcluded: 0,
        shortRoute: true,
        overpassSucceeded,
        fallbackSucceeded,
        providerLabel
      }
    };
  }

  function buildShortRouteSearchPoints(
    routeContext
  ) {
    const total =
      Number(
        routeContext?.totalMeters || 0
      );

    const sampled = sampleRouteByDistance(
      routeContext,
      Math.max(6000, total / 3)
    );

    if (sampled.length <= 4) {
      return sampled;
    }

    return [
      sampled[0],
      sampled[
        Math.floor(
          sampled.length / 2
        )
      ],
      sampled[
        sampled.length - 1
      ]
    ];
  }

  async function fetchShortRouteOverpass({
    query,
    timeoutMs
  }) {
    const deadline =
      Date.now() +
      Math.max(
        1500,
        Number(timeoutMs || 0)
      );
    let lastError = null;

    for (
      let attempt = 0;
      attempt <
      OVERPASS_URLS.length * 2;
      attempt += 1
    ) {
      const remaining =
        deadline - Date.now();

      if (remaining < 900) break;

      const endpoint =
        OVERPASS_URLS[
          attempt %
          OVERPASS_URLS.length
        ];
      const useGet =
        attempt >=
        OVERPASS_URLS.length;

      try {
        let data;

        if (useGet) {
          const url =
            `${endpoint}?data=${
              encodeURIComponent(query)
            }`;

          if (url.length > 7800) {
            continue;
          }

          data = await fetchJson(
            url,
            { method: "GET" },
            remaining
          );
        } else {
          data = await fetchJson(
            endpoint,
            {
              method: "POST",
              headers: {
                "Content-Type":
                  "application/x-www-form-urlencoded;charset=UTF-8"
              },
              body:
                new URLSearchParams({
                  data: query
                }).toString()
            },
            remaining
          );
        }

        return {
          elements:
            Array.isArray(
              data?.elements
            )
              ? data.elements
              : []
        };
      } catch (error) {
        lastError = error;
      }
    }

    throw (
      lastError ||
      new Error(
        "All public restaurant-search endpoints failed."
      )
    );
  }

  async function discoverShortRouteWithNominatim(
    routeContext,
    buildGeneration
  ) {
    assertBuildActive(buildGeneration);

    const bounds = routeBoundsWithPadding(
      routeContext,
      0.07
    );
    const categories = [
      "restaurant",
      "cafe",
      "fast food"
    ];

    const settled = await Promise.allSettled(
      categories.map(async category => {
        assertBuildActive(buildGeneration);

        const params = new URLSearchParams({
          q: category,
          format: "jsonv2",
          countrycodes: "us",
          bounded: "1",
          viewbox:
            `${bounds.west},${bounds.north},${bounds.east},${bounds.south}`,
          limit: "25",
          addressdetails: "1",
          extratags: "1",
          namedetails: "1"
        });

        const data = await fetchJson(
          `${NOMINATIM_FALLBACK_URL}?${params.toString()}`,
          {},
          SHORT_ROUTE_NOMINATIM_TIMEOUT_MS
        );

        return (data || [])
          .map(item =>
            convertNominatimRestaurant(
              item,
              routeContext,
              category
            )
          )
          .filter(Boolean);
      })
    );

    assertBuildActive(buildGeneration);

    const results = settled.flatMap(result =>
      result.status === "fulfilled"
        ? result.value
        : []
    );

    if (!results.length) {
      const failure = settled.find(
        result => result.status === "rejected"
      );
      if (failure) throw failure.reason;
    }

    return dedupeCandidates(results)
      .slice(0, 30);
  }

  function convertNominatimRestaurant(
    item,
    routeContext,
    category
  ) {
    const coordinates = [
      Number(item?.lon),
      Number(item?.lat)
    ];

    if (
      coordinates.some(
        value =>
          !Number.isFinite(value)
      )
    ) {
      return null;
    }

    const name = String(
      item?.namedetails?.name ||
      item?.name ||
      item?.display_name
        ?.split(",")[0] ||
      ""
    ).trim();

    if (!name) return null;

    const projection =
      projectPointToRoute(
        coordinates,
        routeContext
      );

    if (
      !projection ||
      projection.distanceMeters >
        SHORT_ROUTE_SEARCH_RADIUS_METERS
    ) {
      return null;
    }

    const amenity = String(
      item?.extratags?.amenity ||
      item?.type ||
      category
    ).toLowerCase();

    if (
      ![
        "restaurant",
        "cafe",
        "fast_food",
        "fast food"
      ].some(value =>
        amenity.includes(value)
      )
    ) {
      return null;
    }

    const address = [
      item?.address?.house_number,
      item?.address?.road,
      item?.address?.city ||
        item?.address?.town ||
        item?.address?.village,
      item?.address?.state
    ].filter(Boolean).join(", ");

    const website =
      item?.extratags?.website ||
      item?.extratags?.["contact:website"] ||
      "";
    const phone =
      item?.extratags?.phone ||
      item?.extratags?.["contact:phone"] ||
      "";
    const openingHours =
      item?.extratags?.opening_hours ||
      "";

    const signalCount = [
      website,
      phone,
      openingHours
    ].filter(Boolean).length;

    const candidate = {
      id:
        `nominatim-${
          item?.osm_type || "place"
        }-${item?.osm_id || name}`,
      name,
      city:
        item?.address?.city ||
        item?.address?.town ||
        item?.address?.village ||
        "",
      address,
      coordinates,
      category:
        amenity.includes("cafe")
          ? "Café"
          : amenity.includes("fast")
            ? "Fast food"
            : "Restaurant",
      cuisine:
        item?.extratags?.cuisine ||
        "",
      chain: false,
      independent: true,
      regionalSpecialty: false,
      localFavorite: false,
      foodReputation: 66,
      consistency: 62,
      reviewConfidence: 36,
      uniqueness: 56,
      destinationWorthiness: 58,
      tripFit: 74,
      quickStop:
        amenity.includes("fast"),
      sitDown:
        !amenity.includes("fast"),
      familyFriendly: true,
      priceLevel: 2,
      publishedHours:
        openingHours ||
        "Not listed",
      website,
      phone,
      wikipedia:
        item?.extratags?.wikipedia ||
        "",
      wikidata:
        item?.extratags?.wikidata ||
        "",
      description:
        item?.extratags?.description ||
        "",
      sourceType:
        "Bounded Nominatim local fallback",
      discoverySource:
        "nominatim",
      provenance:
        "route-discovered",
      discoveryConfidence:
        signalCount >= 2
          ? "medium"
          : "low",
      destinationEvidenceScore:
        signalCount >= 2
          ? 3
          : 1,
      destinationEvidenceLevel:
        signalCount >= 2
          ? "moderate"
          : "basic",
      operationalStatus:
        signalCount >= 2
          ? "operational-signals-present"
          : "unverified",
      operationalConfidence:
        signalCount >= 2
          ? "medium"
          : "low",
      operationalReason:
        signalCount >= 2
          ? "Fallback listing includes multiple current operating signals."
          : "Fallback listing has limited current operating data.",
      operationalLastChecked: "",
      operationalAgeDays: 99999,
      operationalSignals:
        signalCount,
      routeOffsetMiles:
        metersToMiles(
          projection.distanceMeters
        ),
      routeProgress:
        projection.progress,
      routeBucket:
        projection.bucket,
      routeAlongMiles:
        metersToMiles(
          projection.alongMeters
        ),
      detourTier: "practical",
      searchTier: "practical",
      sourceUrl:
        item?.osm_id
          ? `https://www.openstreetmap.org/${
              String(item.osm_type).toUpperCase() === "W"
                ? "way"
                : String(item.osm_type).toUpperCase() === "R"
                  ? "relation"
                  : "node"
            }/${item.osm_id}`
          : "",
      operationalRisk:
        "Discovered through the local fallback. Hours and food quality are not independently verified.",
      discoveryRank:
        70 -
        metersToMiles(
          projection.distanceMeters
        ) * 1.5
    };

    const statusAssessment =
      window.DetourEatsPlaceStatus
        ?.assessCandidate?.(candidate) ||
      {
        blocked: false,
        status:
          candidate.operationalStatus,
        confidence:
          candidate.operationalConfidence,
        reason:
          candidate.operationalReason,
        lastCheckedAt: "",
        ageDays: 99999,
        signalCount
      };

    if (statusAssessment.blocked) {
      return null;
    }

    return {
      ...candidate,
      operationalStatus:
        statusAssessment.status,
      operationalConfidence:
        statusAssessment.confidence,
      operationalReason:
        statusAssessment.reason,
      operationalLastChecked:
        statusAssessment.lastCheckedAt ||
        candidate.operationalLastChecked,
      operationalAgeDays:
        statusAssessment.ageDays,
      operationalSignals:
        statusAssessment.signalCount
    };
  }

  function routeBoundsWithPadding(
    routeContext,
    paddingDegrees
  ) {
    const points =
      routeContext?.geometry || [];
    const longitudes =
      points.map(point =>
        Number(point[0])
      );
    const latitudes =
      points.map(point =>
        Number(point[1])
      );

    return {
      west:
        Math.min(...longitudes) -
        paddingDegrees,
      east:
        Math.max(...longitudes) +
        paddingDegrees,
      south:
        Math.min(...latitudes) -
        paddingDegrees,
      north:
        Math.max(...latitudes) +
        paddingDegrees
    };
  }

  async function discoverTierByChunks({
    routeContext,
    chunks,
    radiusMeters,
    evidenceMode,
    searchTier,
    progressCallback,
    buildGeneration,
    deadline,
    timeoutMs,
    concurrency
  }) {
    if (!chunks.length) {
      return emptyTierDiagnostics(
        searchTier
      );
    }

    const items = [];
    let cursor = 0;
    let completedChunks = 0;
    let failedChunks = 0;
    let cachedChunks = 0;
    let rawElements = 0;
    let statusExcluded = 0;
    let knownClosedExcluded = 0;
    let staleExcluded = 0;

    async function worker() {
      while (true) {
        assertBuildActive(
          buildGeneration
        );

        const index = cursor;
        cursor += 1;
        if (index >= chunks.length) {
          return;
        }

        const remaining =
          deadline - Date.now();
        if (remaining < 1000) {
          failedChunks +=
            chunks.length - index;
          return;
        }

        const chunk =
          chunks[index];
        progressCallback?.(
          `Searching route section ${index + 1} of ${chunks.length}`
        );

        try {
          const result =
            await fetchDiscoveryChunk({
              chunk,
              radiusMeters,
              evidenceMode,
              searchTier,
              timeoutMs:
                Math.min(
                  timeoutMs,
                  remaining
                )
            });

          rawElements +=
            result.elements.length;
          completedChunks += 1;
          if (result.cached) {
            cachedChunks += 1;
          }

          for (
            const element of
            result.elements
          ) {
            const statusAssessment =
              window.DetourEatsPlaceStatus
                ?.assessOsmElement?.(element) ||
              {
                blocked: false,
                status: "unverified",
                confidence: "low",
                reason:
                  "Business status validation was unavailable.",
                lastCheckedAt: "",
                ageDays: 99999,
                signalCount: 0
              };

            if (statusAssessment.blocked) {
              statusExcluded += 1;
              if (
                statusAssessment.reasonCode ===
                "known-closed"
              ) {
                knownClosedExcluded += 1;
              }
              if (
                statusAssessment.reasonCode ===
                "stale-no-signals"
              ) {
                staleExcluded += 1;
              }
              continue;
            }

            const candidate =
              convertOsmElement(
                element,
                routeContext,
                searchTier,
                statusAssessment
              );
            if (!candidate) continue;

            if (
              searchTier ===
                "exceptional" &&
              !isStrictExceptionalDiscoveryCandidate(
                candidate
              )
            ) {
              continue;
            }
            if (
              searchTier ===
                "destination" &&
              candidate.destinationEvidenceLevel !==
                "strong"
            ) {
              continue;
            }
            if (
              searchTier ===
                "extended" &&
              candidate.destinationEvidenceLevel ===
                "basic"
            ) {
              continue;
            }

            items.push(candidate);
          }
        } catch (error) {
          if (
            /canceled/i.test(
              error?.message || ""
            )
          ) {
            throw error;
          }
          failedChunks += 1;
          console.warn(
            `${searchTier} discovery failed for route section ${index + 1}:`,
            error
          );
        }
      }
    }

    const workerCount =
      Math.min(
        Math.max(1, concurrency),
        chunks.length
      );

    await Promise.all(
      Array.from(
        { length: workerCount },
        () => worker()
      )
    );

    return {
      items:
        dedupeCandidates(items),
      diagnostics: {
        tier: searchTier,
        totalChunks:
          chunks.length,
        completedChunks,
        failedChunks,
        cachedChunks,
        rawElements,
        statusExcluded,
        knownClosedExcluded,
        staleExcluded
      }
    };
  }

  async function fetchDiscoveryChunk({
    chunk,
    radiusMeters,
    evidenceMode,
    searchTier,
    timeoutMs
  }) {
    const cache =
      loadJsonStorage(
        DISCOVERY_CACHE_KEY
      );
    const cacheKey =
      buildDiscoveryChunkCacheKey({
        chunk,
        radiusMeters,
        evidenceMode,
        searchTier
      });
    const cached =
      cache[cacheKey];

    if (
      cached &&
      Array.isArray(cached.elements) &&
      Date.now() -
        Number(cached.savedAt || 0) <
        6 * 60 * 60 * 1000
    ) {
      return {
        elements:
          cached.elements,
        cached: true
      };
    }

    const query =
      buildOverpassChunkQuery(
        chunk.points,
        radiusMeters,
        evidenceMode
      );
    const deadline =
      Date.now() +
      Math.max(
        1200,
        Number(timeoutMs || 0)
      );
    let lastError = null;

    for (
      let endpointIndex = 0;
      endpointIndex <
      OVERPASS_URLS.length;
      endpointIndex += 1
    ) {
      const remaining =
        deadline - Date.now();
      if (remaining < 900) break;

      const endpoint =
        OVERPASS_URLS[
          (
            chunk.index +
            endpointIndex
          ) %
          OVERPASS_URLS.length
        ];

      try {
        const body =
          new URLSearchParams({
            data: query
          }).toString();

        const data =
          await fetchJson(
            endpoint,
            {
              method: "POST",
              headers: {
                "Content-Type":
                  "application/x-www-form-urlencoded;charset=UTF-8"
              },
              body
            },
            remaining
          );

        const elements =
          Array.isArray(
            data?.elements
          )
            ? data.elements
            : [];

        cache[cacheKey] = {
          savedAt:
            Date.now(),
          elements
        };
        saveJsonStorage(
          DISCOVERY_CACHE_KEY,
          trimDiscoveryCache(
            cache
          )
        );

        return {
          elements,
          cached: false
        };
      } catch (error) {
        lastError = error;
      }
    }

    throw (
      lastError ||
      new Error(
        "Restaurant section search failed."
      )
    );
  }

  function buildOverpassChunkQuery(
    points,
    radiusMeters,
    evidenceMode
  ) {
    const selectors = points.map(point => {
      const latitude = Number(point[1]).toFixed(5);
      const longitude = Number(point[0]).toFixed(5);
      return (
        `nwr(around:${Math.round(radiusMeters)},${latitude},${longitude})` +
        `["amenity"~"^(restaurant|fast_food|cafe)$"]` +
        `["name"]`
      );
    });

    if (evidenceMode === "all") {
      return `[out:json][timeout:20];
(
${selectors.map(selector => `${selector};`).join("\n")}
);
out center tags meta;`;
    }

    const evidenceTags =
      evidenceMode === "destination" ||
      evidenceMode === "exceptional"
        ? ["wikidata", "wikipedia", "award", "stars"]
        : [
            "wikidata",
            "wikipedia",
            "website",
            "contact:website",
            "description",
            "award",
            "stars"
          ];

    const clauses = [];
    for (const selector of selectors) {
      for (const tag of evidenceTags) {
        clauses.push(`${selector}["${tag}"];`);
      }
      if (
        evidenceMode === "destination" ||
        evidenceMode === "exceptional"
      ) {
        clauses.push(`${selector}["website"]["description"];`);
        clauses.push(`${selector}["contact:website"]["description"];`);
      }
    }

    return `[out:json][timeout:20];
(
${clauses.join("\n")}
);
out center tags meta;`;
  }

  function buildDiscoveryChunkCacheKey({
    chunk,
    radiusMeters,
    evidenceMode,
    searchTier
  }) {
    const start =
      chunk.points[0];
    const end =
      chunk.points[
        chunk.points.length - 1
      ];

    return [
      "chunk-v4",
      searchTier,
      evidenceMode,
      Math.round(radiusMeters),
      Number(start[0]).toFixed(2),
      Number(start[1]).toFixed(2),
      Number(end[0]).toFixed(2),
      Number(end[1]).toFixed(2)
    ].join("|");
  }

  function emptyTierDiagnostics(tier) {
    return {
      items: [],
      diagnostics: {
        tier,
        totalChunks: 0,
        completedChunks: 0,
        failedChunks: 0,
        cachedChunks: 0,
        rawElements: 0
      }
    };
  }

  function createDefaultDiscoveryPlan(
    tripMode
  ) {
    return {
      status: "pending",
      style:
        normalizeTripMode(
          tripMode
        ),
      practicalUsed: true,
      extendedUsed: false,
      destinationUsed: false,
      exceptionalSearchUsed: true,
      practicalRadiusMiles:
        metersToMiles(
          PRACTICAL_RADIUS_METERS
        ),
      extendedRadiusMiles: 0,
      destinationRadiusMiles: 0,
      exceptionalRadiusMiles:
        metersToMiles(
          EXCEPTIONAL_RADIUS_METERS
        ),
      maximumRadiusMiles:
        metersToMiles(
          PRACTICAL_RADIUS_METERS
        ),
      label:
        "Segmented route search",
      summary:
        "Restaurant search is being run in smaller route sections."
    };
  }

  function buildSegmentedSearchSummary({
    style,
    status,
    totalChunks,
    completedChunks,
    failedChunks,
    rawElements,
    practicalCount,
    extendedCount,
    destinationCount,
    exceptionalCount
  }) {
    const surviving =
      practicalCount +
      extendedCount +
      destinationCount +
      exceptionalCount;

    if (status === "unavailable") {
      return "The driving route is ready, but the public restaurant search did not respond.";
    }
    if (status === "empty") {
      return "Completed route searches returned no current named restaurant records.";
    }
    if (status === "partial") {
      return surviving > 0
        ? `${surviving} route-relevant restaurant record${surviving === 1 ? "" : "s"} retained from successful search areas.`
        : "Some route areas could not be searched and no usable restaurant record was retained.";
    }
    return `${surviving} route-relevant restaurant record${surviving === 1 ? "" : "s"} retained for route screening.`;
  }

  function determineSearchOutcome({
    discoveryStatus,
    discoveredRaw,
    candidatePool,
    matrixStatus,
    qualifyingCount,
    statusExcluded = 0
  }) {
    if (
      discoveryStatus ===
        "unavailable" &&
      candidatePool === 0
    ) {
      return "restaurant_search_unavailable";
    }

    if (
      discoveryStatus === "empty" &&
      discoveredRaw === 0 &&
      candidatePool === 0
    ) {
      return "no_restaurants_found";
    }

    if (
      candidatePool === 0 &&
      statusExcluded > 0
    ) {
      return "restaurants_excluded_as_closed_or_stale";
    }

    if (
      candidatePool > 0 &&
      matrixStatus ===
        "unavailable" &&
      qualifyingCount === 0
    ) {
      return "restaurants_found_route_checks_failed";
    }

    if (
      candidatePool > 0 &&
      qualifyingCount === 0
    ) {
      return "restaurants_found_but_none_qualified";
    }

    if (
      discoveryStatus === "fallback" &&
      qualifyingCount > 0
    ) {
      return "restaurants_found_and_routed";
    }

    if (
      discoveryStatus === "partial" &&
      Number(qualifyingCount || 0) >= 5
    ) {
      return "restaurants_found_and_routed";
    }

    if (
      discoveryStatus === "partial" &&
      qualifyingCount > 0
    ) {
      return "partial_results_available";
    }

    if (qualifyingCount > 0) {
      return "restaurants_found_and_routed";
    }

    return "no_qualifying_restaurants";
  }

  function normalizeTripMode(value) {
    const mode =
      String(
        value || "balanced"
      ).toLowerCase();

    if (
      mode.includes("adventure") ||
      mode.includes("food") ||
      mode.includes("strict")
    ) {
      return "adventure";
    }
    if (mode.includes("hungry")) {
      return "hungry";
    }
    return "balanced";
  }

  function trimDiscoveryCache(cache) {
    return Object.fromEntries(
      Object.entries(cache)
        .sort(
          (a, b) =>
            Number(
              b[1]?.savedAt || 0
            ) -
            Number(
              a[1]?.savedAt || 0
            )
        )
        .slice(0, 80)
    );
  }

  function getMaximumCandidateDetour(
    maxAddedMinutes,
    tripMode
  ) {
    const maxAdded =
      Number(
        maxAddedMinutes || 10
      );
    const style =
      normalizeTripMode(
        tripMode
      );

    if (style === "hungry") {
      return Math.max(
        maxAdded + 15,
        25
      );
    }
    if (style === "adventure") {
      return Math.max(
        maxAdded + 55,
        75
      );
    }
    return Math.max(
      maxAdded + 35,
      50
    );
  }

  function convertOsmElement(
    element,
    routeContext,
    searchTier = "practical",
    statusAssessment = null
  ) {
    const tags = element?.tags || {};
    const name = String(tags.name || "").trim();
    if (!name) return null;

    const operational =
      statusAssessment ||
      window.DetourEatsPlaceStatus
        ?.assessOsmElement?.(element) ||
      {
        blocked: false,
        status: "unverified",
        confidence: "low",
        reason:
          "Business status validation was unavailable.",
        lastCheckedAt: "",
        ageDays: 99999,
        signalCount: 0
      };

    if (operational.blocked) {
      return null;
    }

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
    const description = String(tags.description || "").trim();
    const wikipedia = tags.wikipedia || "";
    const wikidata =
      tags.wikidata ||
      tags["brand:wikidata"] ||
      "";
    const award = tags.award || tags.awards || "";
    const stars = tags.stars || "";
    const address = buildAddress(tags);
    const city =
      tags["addr:city"] ||
      tags["addr:town"] ||
      tags["addr:village"] ||
      tags["addr:hamlet"] ||
      "Along route";

    const routeProjection =
      projectPointToRoute(
        coordinates,
        routeContext
      );
    if (!routeProjection) return null;

    const routeOffsetMeters =
      routeProjection.distanceMeters;
    const routeOffsetMiles =
      metersToMiles(routeOffsetMeters);
    const detourTier =
      getDetourTier(
        routeOffsetMeters
      );

    const destinationEvidenceScore =
      (wikipedia ? 5 : 0) +
      (wikidata ? 4 : 0) +
      (award ? 4 : 0) +
      (stars ? 3 : 0) +
      (website ? 2 : 0) +
      (description ? 2 : 0) +
      (cuisine ? 1 : 0) +
      (publishedHours ? 1 : 0) +
      (address ? 1 : 0) +
      (phone ? 1 : 0) +
      (!chain ? 1 : 0);

    const destinationEvidenceLevel =
      destinationEvidenceScore >= 8
        ? "strong"
        : destinationEvidenceScore >= 4
          ? "moderate"
          : "basic";

    const metadataCount = [
      cuisine,
      website,
      phone,
      publishedHours,
      address,
      wikidata,
      wikipedia,
      description,
      award,
      stars
    ].filter(Boolean).length;

    const confidence =
      destinationEvidenceLevel === "strong"
        ? "Medium"
        : metadataCount >= 4
          ? "Medium"
          : "Low";
    const discoveryConfidence =
      destinationEvidenceLevel === "strong" ||
      metadataCount >= 4
        ? "medium"
        : "low";

    const qualityBase =
      amenity === "restaurant" ? 69 :
      amenity === "cafe" ? 66 :
      63;

    const foodReputation = clamp(
      qualityBase +
      Math.min(8, destinationEvidenceScore) +
      (cuisine ? 2 : 0) -
      (chain ? 5 : 0),
      56,
      destinationEvidenceLevel === "strong" ? 82 : 78
    );

    const uniqueness = clamp(
      52 +
      (cuisine ? 8 : 0) +
      (description ? 5 : 0) +
      (wikipedia ? 8 : 0) +
      (award ? 7 : 0) -
      (chain ? 20 : 0),
      30,
      88
    );

    const destinationWorthiness = clamp(
      foodReputation * 0.58 +
      uniqueness * 0.24 +
      Math.min(18, destinationEvidenceScore * 2),
      48,
      destinationEvidenceLevel === "strong" ? 91 : 82
    );

    const routeBucket =
      routeProjection.bucket;
    const regionalSpecialty =
      !chain &&
      Boolean(cuisine) &&
      destinationEvidenceLevel === "strong";
    const localFavorite =
      !chain &&
      Boolean(wikipedia || wikidata || description);

    const evidenceLabel =
      destinationEvidenceLevel === "strong"
        ? "strong destination evidence"
        : destinationEvidenceLevel === "moderate"
          ? "promising map evidence"
          : "basic location data";

    const famousFor = description
      ? truncateText(description, 120)
      : cuisine
        ? `Cuisine listed as ${cuisine}`
        : `${amenityLabel(amenity)} with ${evidenceLabel}`;

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
      localFavorite,
      regionalSpecialty,
      kidFriendly: false,
      easyParking:
        String(tags.parking || "").toLowerCase() === "yes" ||
        Boolean(tags["parking:lane"]),
      foodReputation,
      destinationWorthiness,
      uniqueness,
      reviewConfidence: clamp(
        44 + metadataCount * 3 +
        (destinationEvidenceLevel === "strong" ? 5 : 0),
        44,
        72
      ),
      consistency: 62,
      famousFor,
      evidenceSummary:
        `Found ${routeOffsetMiles.toFixed(1)} miles from the route with ${evidenceLabel}. DetourEats has not independently reviewed its food quality.`,
      openAtArrival: null,
      hoursConfidence: publishedHours
        ? "listed_not_evaluated"
        : "unknown",
      publishedHours:
        publishedHours ||
        "Not listed in OpenStreetMap",
      website,
      phone,
      wikipedia,
      wikidata,
      award,
      stars,
      description,
      confidence,
      discoveryConfidence,
      provenance: "route-discovered",
      discoverySource: "openstreetmap",
      sourceType:
        searchTier === "exceptional"
          ? "Strict exceptional-detour scan from OpenStreetMap"
          : detourTier === "destination"
            ? "Destination-detour discovery from OpenStreetMap"
            : detourTier === "extended"
            ? "Extended-detour discovery from OpenStreetMap"
            : "Route discovery from OpenStreetMap",
      sourceUrl:
        `https://www.openstreetmap.org/${element.type}/${element.id}`,
      verifiedDate: element.timestamp
        ? `OSM feature updated ${formatDate(element.timestamp)}`
        : "Discovered on current route",
      mappedTimestamp: element.timestamp || "",
      operationalStatus:
        operational.status,
      operationalConfidence:
        operational.confidence,
      operationalReason:
        operational.reason,
      operationalLastChecked:
        operational.lastCheckedAt || "",
      operationalAgeDays:
        operational.ageDays,
      operationalSignals:
        operational.signalCount,
      operationalRisk:
        operational.confidence === "low"
          ? `Current operation is weakly verified. ${operational.reason}`
          :
        searchTier === "exceptional"
          ? `Rare-opportunity candidate ${routeOffsetMiles.toFixed(1)} miles from the route. Strong map evidence triggered the scan, but DetourEats has not independently verified bucket-list status, food quality, or arrival hours.`
          : detourTier === "practical"
            ? "Route-discovered option. Hours and food quality are not independently verified."
            : `Wider-search candidate ${routeOffsetMiles.toFixed(1)} miles from the route. Actual detour time is calculated, but food quality and hours still require verification.`,
      routeBucket,
      routeProgress:
        routeProjection.progress,
      routeAlongMiles:
        metersToMiles(
          routeProjection.alongMeters
        ),
      routeOffsetMiles,
      detourTier,
      searchTier,
      exceptionalScan:
        searchTier === "exceptional",
      exceptionalOnly:
        searchTier === "exceptional",
      destinationEvidenceScore,
      destinationEvidenceLevel,
      discoveryRank:
        destinationEvidenceScore * 14 +
        foodReputation +
        destinationWorthiness +
        (searchTier === "exceptional" ? 55 : 0) -
        routeOffsetMiles * 1.4 -
        (chain ? 18 : 0)
    };
  }


  function isStrictExceptionalDiscoveryCandidate(candidate) {
    return Boolean(
      candidate &&
      !candidate.chain &&
      candidate.destinationEvidenceLevel === "strong" &&
      Number(candidate.destinationEvidenceScore || 0) >= 10 &&
      Number(candidate.destinationWorthiness || 0) >= 84 &&
      Number(candidate.uniqueness || 0) >= 72 &&
      Number(candidate.foodReputation || 0) >= 76
    );
  }

  function truncateText(value, limit) {
    const text = String(value || "").trim();
    if (text.length <= limit) return text;
    return `${text.slice(0, Math.max(0, limit - 1)).trim()}…`;
  }

  function selectDistributedDiscovered(
    candidates
  ) {
    const deduped = dedupeCandidates(candidates);
    const practical = deduped.filter(
      candidate => candidate.detourTier === "practical"
    );
    const extended = deduped.filter(
      candidate => candidate.detourTier === "extended"
    );
    const destination = deduped.filter(
      candidate => candidate.detourTier === "destination"
    );

    const selected = [
      ...selectTierDistributed(practical, 2, 16),
      ...selectTierDistributed(extended, 1, 8),
      ...selectTierDistributed(destination, 1, 4)
    ];

    return dedupeCandidates(selected)
      .sort((a, b) => {
        if (a.routeBucket !== b.routeBucket) {
          return a.routeBucket - b.routeBucket;
        }
        return Number(b.discoveryRank) - Number(a.discoveryRank);
      })
      .slice(0, MAX_DISCOVERED_CANDIDATES);
  }

  function selectTierDistributed(candidates, perBucket, maximum) {
    const buckets = new Map();

    for (const candidate of candidates) {
      const bucket = Number(candidate.routeBucket || 0);
      if (!buckets.has(bucket)) buckets.set(bucket, []);
      buckets.get(bucket).push(candidate);
    }

    const selected = [];
    for (const bucket of [...buckets.keys()].sort((a, b) => a - b)) {
      const options = buckets.get(bucket).sort(
        (a, b) =>
          Number(b.discoveryRank || 0) -
          Number(a.discoveryRank || 0)
      );
      selected.push(...options.slice(0, perBucket));
    }

    if (selected.length >= maximum) {
      return selected
        .sort(
          (a, b) =>
            Number(b.discoveryRank || 0) -
            Number(a.discoveryRank || 0)
        )
        .slice(0, maximum);
    }

    const selectedIds = new Set(selected.map(candidate => candidate.id));
    const remaining = candidates
      .filter(candidate => !selectedIds.has(candidate.id))
      .sort(
        (a, b) =>
          Number(b.discoveryRank || 0) -
          Number(a.discoveryRank || 0)
      );

    return [...selected, ...remaining].slice(0, maximum);
  }

  function mergeCandidates(
    curated,
    discovered
  ) {
    const combined =
      dedupeCandidates([
        ...(curated || []),
        ...(discovered || [])
      ]);

    return combined.map(candidate => {
      const duplicateCurated =
        (curated || []).find(item =>
          areCandidatesDuplicates(
            item,
            candidate
          )
        );

      if (
        duplicateCurated &&
        candidate.provenance ===
          "route-discovered"
      ) {
        return {
          ...candidate,
          ...duplicateCurated,
          coordinates:
            candidate.coordinates ||
            duplicateCurated.coordinates,
          duplicateMerged: true,
          provenance: "curated"
        };
      }

      return candidate;
    });
  }

  function selectCandidatesForRouting(
    candidates
  ) {
    const normalized =
      (candidates || []).map(
        candidate => ({
          ...candidate,
          routeBucket:
            Number.isFinite(
              Number(
                candidate.routeBucket
              )
            )
              ? Number(
                  candidate.routeBucket
                )
              : 0,
          detourTier:
            candidate.detourTier ||
            "practical"
        })
      );

    const curated = normalized
      .filter(
        candidate =>
          candidate.provenance ===
          "curated"
      )
      .sort(
        (a, b) =>
          preliminaryCandidateRank(b) -
          preliminaryCandidateRank(a)
      )
      .slice(0, 8);

    const practical =
      selectTierDistributed(
        normalized.filter(
          candidate =>
            candidate.provenance !==
              "curated" &&
            candidate.detourTier ===
              "practical"
        ),
        2,
        14
      );

    const extended =
      selectTierDistributed(
        normalized.filter(
          candidate =>
            candidate.provenance !==
              "curated" &&
            candidate.detourTier ===
              "extended"
        ),
        1,
        7
      );

    const exceptional =
      selectTierDistributed(
        normalized.filter(
          candidate =>
            candidate.provenance !==
              "curated" &&
            candidate.exceptionalScan
        ),
        1,
        4
      );

    const destination =
      selectTierDistributed(
        normalized.filter(
          candidate =>
            candidate.provenance !==
              "curated" &&
            candidate.detourTier ===
              "destination" &&
            !candidate.exceptionalScan
        ),
        1,
        5
      );

    return dedupeCandidates([
      ...curated,
      ...practical,
      ...extended,
      ...exceptional,
      ...destination
    ])
      .sort(
        (a, b) =>
          preliminaryCandidateRank(b) -
          preliminaryCandidateRank(a)
      )
      .slice(
        0,
        MAX_DISCOVERED_CANDIDATES
      );
  }


  function areCandidatesDuplicates(
    existing,
    candidate
  ) {
    if (!existing || !candidate) {
      return false;
    }

    if (
      candidate.osmType &&
      candidate.osmId &&
      existing.osmType ===
        candidate.osmType &&
      existing.osmId ===
        candidate.osmId
    ) {
      return true;
    }

    const sameName =
      normalizeName(
        existing.name
      ) ===
      normalizeName(
        candidate.name
      );
    if (!sameName) return false;

    if (
      existing.address &&
      candidate.address &&
      normalizeName(
        existing.address
      ) ===
      normalizeName(
        candidate.address
      )
    ) {
      return true;
    }

    if (
      Array.isArray(
        existing.coordinates
      ) &&
      Array.isArray(
        candidate.coordinates
      )
    ) {
      return (
        distanceMeters(
          existing.coordinates,
          candidate.coordinates
        ) <= 250
      );
    }

    return false;
  }

  function dedupeCandidates(
    candidates
  ) {
    const result = [];

    for (
      const candidate of
      candidates || []
    ) {
      const duplicate =
        result.find(existing =>
          areCandidatesDuplicates(
            existing,
            candidate
          )
        );

      if (!duplicate) {
        result.push(candidate);
        continue;
      }

      const duplicateIndex =
        result.indexOf(
          duplicate
        );
      const existingRank =
        preliminaryCandidateRank(
          duplicate
        );
      const candidateRank =
        preliminaryCandidateRank(
          candidate
        );

      if (
        candidateRank >
        existingRank
      ) {
        result[duplicateIndex] = {
          ...duplicate,
          ...candidate,
          duplicateMerged: true
        };
      } else {
        result[duplicateIndex] = {
          ...candidate,
          ...duplicate,
          duplicateMerged: true
        };
      }
    }

    return result;
  }

  function buildRouteContext(
    coordinates
  ) {
    const geometry =
      (coordinates || [])
        .filter(
          point =>
            Array.isArray(point) &&
            point.length >= 2 &&
            point.every(
              value =>
                Number.isFinite(
                  Number(value)
                )
            )
        )
        .map(point => [
          Number(point[0]),
          Number(point[1])
        ]);

    if (geometry.length < 2) {
      return {
        geometry,
        cumulativeMeters: [0],
        totalMeters: 0
      };
    }

    const cumulativeMeters = [0];
    let totalMeters = 0;

    for (
      let index = 1;
      index < geometry.length;
      index += 1
    ) {
      totalMeters +=
        distanceMeters(
          geometry[index - 1],
          geometry[index]
        );
      cumulativeMeters.push(
        totalMeters
      );
    }

    return {
      geometry,
      cumulativeMeters,
      totalMeters
    };
  }

  function projectPointToRoute(
    point,
    routeContext
  ) {
    const geometry =
      routeContext?.geometry || [];
    const cumulative =
      routeContext?.cumulativeMeters ||
      [];
    const total =
      Number(
        routeContext?.totalMeters || 0
      );

    if (
      !Array.isArray(point) ||
      geometry.length < 2
    ) {
      return null;
    }

    let best = null;

    for (
      let index = 0;
      index <
      geometry.length - 1;
      index += 1
    ) {
      const projection =
        projectPointToSegment(
          point,
          geometry[index],
          geometry[index + 1]
        );

      if (
        !best ||
        projection.distanceMeters <
          best.distanceMeters
      ) {
        const segmentMeters =
          distanceMeters(
            geometry[index],
            geometry[index + 1]
          );
        const alongMeters =
          Number(
            cumulative[index] || 0
          ) +
          segmentMeters *
            projection.t;

        best = {
          distanceMeters:
            projection.distanceMeters,
          alongMeters,
          progress:
            total > 0
              ? clamp(
                  alongMeters / total,
                  0,
                  1
                )
              : 0,
          segmentIndex: index
        };
      }
    }

    if (!best) return null;

    return {
      ...best,
      bucket: clamp(
        Math.floor(
          best.progress *
            ROUTE_BUCKET_COUNT
        ),
        0,
        ROUTE_BUCKET_COUNT - 1
      )
    };
  }

  function projectPointToSegment(
    point,
    start,
    end
  ) {
    const radius = 6371000;
    const referenceLat =
      radians(
        (
          Number(point[1]) +
          Number(start[1]) +
          Number(end[1])
        ) / 3
      );
    const cosLat =
      Math.cos(referenceLat);

    function planar(coordinate) {
      return {
        x:
          radius *
          radians(
            Number(coordinate[0])
          ) *
          cosLat,
        y:
          radius *
          radians(
            Number(coordinate[1])
          )
      };
    }

    const p = planar(point);
    const a = planar(start);
    const b = planar(end);
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const denominator =
      dx * dx + dy * dy;

    const t =
      denominator > 0
        ? clamp(
            (
              (p.x - a.x) * dx +
              (p.y - a.y) * dy
            ) /
              denominator,
            0,
            1
          )
        : 0;

    const nearestX =
      a.x + dx * t;
    const nearestY =
      a.y + dy * t;

    return {
      t,
      distanceMeters:
        Math.hypot(
          p.x - nearestX,
          p.y - nearestY
        )
    };
  }

  function buildRouteChunks(
    routeContext,
    targetLengthMeters,
    pointSpacingMeters
  ) {
    const sampled = sampleRouteByDistance(
      routeContext,
      pointSpacingMeters
    );
    if (!sampled.length) return [];

    const pointsPerChunk =
      pointSpacingMeters <= 40000 ? 2 : 1;
    const chunks = [];

    for (
      let index = 0;
      index < sampled.length;
      index += pointsPerChunk
    ) {
      const points = sampled.slice(
        index,
        index + pointsPerChunk
      );
      if (!points.length) continue;

      chunks.push({
        index: chunks.length,
        points,
        targetLengthMeters
      });
    }

    return chunks;
  }

  function sampleRouteByDistance(
    routeContext,
    spacingMeters
  ) {
    const geometry =
      routeContext?.geometry || [];
    const cumulative =
      routeContext?.cumulativeMeters ||
      [];
    const total =
      Number(
        routeContext?.totalMeters || 0
      );

    if (geometry.length < 2) {
      return geometry;
    }

    const result = [
      geometry[0]
    ];
    let target =
      Math.max(
        1000,
        spacingMeters
      );

    while (target < total) {
      let index = 1;

      while (
        index <
          cumulative.length &&
        cumulative[index] <
          target
      ) {
        index += 1;
      }

      if (
        index >=
        cumulative.length
      ) {
        break;
      }

      const beforeDistance =
        cumulative[index - 1];
      const afterDistance =
        cumulative[index];
      const denominator =
        Math.max(
          1,
          afterDistance -
            beforeDistance
        );
      const ratio =
        clamp(
          (
            target -
            beforeDistance
          ) /
            denominator,
          0,
          1
        );
      const before =
        geometry[index - 1];
      const after =
        geometry[index];

      result.push([
        Number(before[0]) +
          (
            Number(after[0]) -
            Number(before[0])
          ) *
            ratio,
        Number(before[1]) +
          (
            Number(after[1]) -
            Number(before[1])
          ) *
            ratio
      ]);

      target +=
        Math.max(
          1000,
          spacingMeters
        );
    }

    result.push(
      geometry[
        geometry.length - 1
      ]
    );

    return dedupeCoordinatePairs(
      result
    );
  }

  function reduceChunkPoints(
    points,
    maximum
  ) {
    if (
      points.length <= maximum
    ) {
      return dedupeCoordinatePairs(
        points
      );
    }

    const reduced = [];

    for (
      let index = 0;
      index < maximum;
      index += 1
    ) {
      const sourceIndex =
        Math.round(
          index *
            (
              points.length - 1
            ) /
            Math.max(
              1,
              maximum - 1
            )
        );
      reduced.push(
        points[sourceIndex]
      );
    }

    return dedupeCoordinatePairs(
      reduced
    );
  }

  function getDetourTier(
    routeOffsetMeters
  ) {
    if (
      routeOffsetMeters <=
      PRACTICAL_RADIUS_METERS
    ) {
      return "practical";
    }
    if (
      routeOffsetMeters <=
      EXTENDED_RADIUS_METERS
    ) {
      return "extended";
    }
    return "destination";
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
    routeTable,
    buildLiveTrip,
    refreshLiveTrip,
    cancelActiveRequests,
    distanceMeters,
    __test: {
      buildRouteContext,
      buildRouteChunks,
      projectPointToRoute,
      determineSearchOutcome,
      applyRouteMatrix
    }
  };
})();
