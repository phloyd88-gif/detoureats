/* DetourEats v1.4 Beta address autocomplete
   Uses the public Photon demo endpoint conservatively:
   - begins after 3 characters
   - 450 ms debounce
   - aborts superseded requests
   - limits results to 6
   - caches successful searches in-browser
   - preserves manual-entry fallback
*/
(function () {
  "use strict";

  const ENDPOINT = "https://photon.komoot.io/api/";
  const CACHE_KEY = "detoureats_address_search_cache_v1";
  const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
  const MAX_CACHE_ENTRIES = 60;
  const MIN_QUERY_LENGTH = 3;
  const DEBOUNCE_MS = 450;

  function createAutocomplete({
    input,
    menu,
    status,
    getBiasCoordinates,
    onSelect,
    onManualInput
  }) {
    if (!input || !menu) return null;

    let debounceTimer = null;
    let requestController = null;
    let activeIndex = -1;
    let results = [];
    let selectedLabel = "";
    let lastQuery = "";

    input.setAttribute("aria-autocomplete", "list");
    input.setAttribute("aria-controls", menu.id);
    input.setAttribute("aria-expanded", "false");
    input.setAttribute("role", "combobox");

    function scheduleSearch() {
      const query = String(input.value || "").trim();

      if (selectedLabel && query !== selectedLabel) {
        selectedLabel = "";
      }

      onManualInput?.(query);

      clearTimeout(debounceTimer);
      requestController?.abort();
      activeIndex = -1;

      if (
        query === "Current location" ||
        query.length < MIN_QUERY_LENGTH
      ) {
        closeMenu();
        setStatus(
          query.length
            ? `Type ${Math.max(0, MIN_QUERY_LENGTH - query.length)} more character${MIN_QUERY_LENGTH - query.length === 1 ? "" : "s"} for suggestions.`
            : "Start typing an address, city, landmark, or business."
        );
        return;
      }

      setStatus("Searching addresses…", "working");
      debounceTimer = setTimeout(() => search(query), DEBOUNCE_MS);
    }

    async function search(query) {
      const normalizedQuery = query.toLowerCase();
      lastQuery = normalizedQuery;

      const cached = getCachedResults(normalizedQuery);
      if (cached) {
        renderResults(cached);
        return;
      }

      requestController = new AbortController();

      try {
        const params = new URLSearchParams({
          q: query,
          limit: "6",
          lang: "en",
          countrycode: "US"
        });

        const bias = getBiasCoordinates?.();
        if (Array.isArray(bias) && bias.length === 2) {
          params.set("lon", String(Number(bias[0])));
          params.set("lat", String(Number(bias[1])));
          params.set("zoom", "7");
          params.set("location_bias_scale", "0.3");
        }

        const response = await fetch(`${ENDPOINT}?${params.toString()}`, {
          signal: requestController.signal,
          headers: { Accept: "application/json" },
          cache: "no-store"
        });

        if (!response.ok) {
          throw new Error(`Address search returned ${response.status}.`);
        }

        const data = await response.json();
        if (lastQuery !== normalizedQuery) return;

        const suggestions = (data?.features || [])
          .map(convertFeature)
          .filter(Boolean)
          .filter((item, index, list) =>
            list.findIndex(other =>
              other.label.toLowerCase() === item.label.toLowerCase()
            ) === index
          )
          .slice(0, 6);

        setCachedResults(normalizedQuery, suggestions);
        renderResults(suggestions);
      } catch (error) {
        if (error?.name === "AbortError") return;
        console.warn("Address autocomplete unavailable:", error);
        results = [];
        closeMenu();
        setStatus(
          "Suggestions are temporarily unavailable. You can still type the location manually.",
          "error"
        );
      }
    }

    function renderResults(items) {
      results = items;
      activeIndex = -1;

      if (!items.length) {
        menu.innerHTML = `
          <div class="address-suggestion-empty">
            No matching U.S. location found. Manual entry is still available.
          </div>
          ${renderAttribution()}
        `;
        openMenu();
        setStatus("No suggestions found.", "error");
        return;
      }

      menu.innerHTML = `
        <div class="address-suggestion-results" role="listbox">
          ${items.map((item, index) => `
            <button
              type="button"
              class="address-suggestion"
              role="option"
              id="${menu.id}-option-${index}"
              data-suggestion-index="${index}"
              aria-selected="false"
            >
              <span class="address-suggestion-icon" aria-hidden="true">${escapeHtml(item.icon)}</span>
              <span class="address-suggestion-copy">
                <strong>${escapeHtml(item.primary)}</strong>
                <small>${escapeHtml(item.secondary)}</small>
              </span>
              <span class="address-suggestion-type">${escapeHtml(item.typeLabel)}</span>
            </button>
          `).join("")}
        </div>
        ${renderAttribution()}
      `;

      menu.querySelectorAll("[data-suggestion-index]").forEach(button => {
        button.addEventListener("mousedown", event => {
          event.preventDefault();
        });
        button.addEventListener("click", () => {
          selectResult(Number(button.dataset.suggestionIndex));
        });
      });

      openMenu();
      setStatus(`${items.length} suggestion${items.length === 1 ? "" : "s"} available.`, "success");
    }

    function selectResult(index) {
      const selected = results[index];
      if (!selected) return;

      selectedLabel = selected.label;
      input.value = selected.label;
      input.dataset.selectedAddress = "true";
      input.dataset.longitude = String(selected.coordinates[0]);
      input.dataset.latitude = String(selected.coordinates[1]);
      closeMenu();
      setStatus("Exact location selected for routing.", "selected");
      onSelect?.(selected);
      input.focus();
    }

    function handleKeydown(event) {
      if (menu.classList.contains("hidden")) return;

      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActiveIndex(activeIndex + 1);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setActiveIndex(activeIndex - 1);
      } else if (event.key === "Enter" && activeIndex >= 0) {
        event.preventDefault();
        selectResult(activeIndex);
      } else if (event.key === "Escape") {
        closeMenu();
      }
    }

    function setActiveIndex(nextIndex) {
      if (!results.length) return;

      activeIndex = (nextIndex + results.length) % results.length;
      const buttons = Array.from(
        menu.querySelectorAll("[data-suggestion-index]")
      );

      buttons.forEach((button, index) => {
        const active = index === activeIndex;
        button.classList.toggle("active", active);
        button.setAttribute("aria-selected", String(active));
      });

      const activeButton = buttons[activeIndex];
      if (activeButton) {
        input.setAttribute("aria-activedescendant", activeButton.id);
        activeButton.scrollIntoView({ block: "nearest" });
      }
    }

    function clearSelection() {
      selectedLabel = "";
      delete input.dataset.selectedAddress;
      delete input.dataset.longitude;
      delete input.dataset.latitude;
    }

    function setSelectedValue(selection) {
      if (!selection?.label || !Array.isArray(selection.coordinates)) {
        clearSelection();
        return;
      }

      selectedLabel = selection.label;
      input.value = selection.label;
      input.dataset.selectedAddress = "true";
      input.dataset.longitude = String(selection.coordinates[0]);
      input.dataset.latitude = String(selection.coordinates[1]);
      setStatus("Exact location selected for routing.", "selected");
      closeMenu();
    }

    function openMenu() {
      menu.classList.remove("hidden");
      input.setAttribute("aria-expanded", "true");
    }

    function closeMenu() {
      menu.classList.add("hidden");
      input.setAttribute("aria-expanded", "false");
      input.removeAttribute("aria-activedescendant");
      activeIndex = -1;
    }

    function setStatus(message, type = "") {
      if (!status) return;
      status.textContent = message;
      status.className = `address-search-status ${type}`.trim();
    }

    input.addEventListener("input", scheduleSearch);
    input.addEventListener("keydown", handleKeydown);
    input.addEventListener("focus", () => {
      if (
        results.length &&
        String(input.value || "").trim().length >= MIN_QUERY_LENGTH &&
        input.value !== selectedLabel
      ) {
        renderResults(results);
      }
    });
    input.addEventListener("blur", () => {
      window.setTimeout(closeMenu, 140);
    });

    return {
      clearSelection,
      setSelectedValue,
      closeMenu,
      getSelection() {
        if (!input.dataset.selectedAddress) return null;
        return {
          label: input.value,
          coordinates: [
            Number(input.dataset.longitude),
            Number(input.dataset.latitude)
          ]
        };
      }
    };
  }

  function convertFeature(feature) {
    const coordinates = feature?.geometry?.coordinates;
    const properties = feature?.properties || {};

    if (
      !Array.isArray(coordinates) ||
      coordinates.length < 2 ||
      !coordinates.every(Number.isFinite)
    ) {
      return null;
    }

    const primary =
      buildStreetAddress(properties) ||
      properties.name ||
      properties.street ||
      properties.city ||
      properties.state;

    if (!primary) return null;

    const secondaryParts = uniqueParts([
      properties.district,
      properties.city,
      properties.county,
      properties.state,
      properties.postcode,
      properties.country
    ]).filter(part => !sameText(part, primary));

    const secondary = secondaryParts.join(", ");
    const label = secondary ? `${primary}, ${secondary}` : String(primary);
    const type = getFeatureType(properties);

    return {
      label,
      primary: String(primary),
      secondary: secondary || "United States",
      coordinates: coordinates.map(Number),
      type,
      typeLabel: formatTypeLabel(type),
      icon: getTypeIcon(type),
      raw: feature
    };
  }

  function buildStreetAddress(properties) {
    const houseNumber = properties.housenumber;
    const street = properties.street;

    if (houseNumber && street) return `${houseNumber} ${street}`;
    if (street && properties.name && !sameText(street, properties.name)) {
      return properties.name;
    }
    return "";
  }

  function getFeatureType(properties) {
    const type = String(
      properties.type ||
      properties.osm_value ||
      properties.osm_key ||
      ""
    ).toLowerCase();

    if (
      properties.housenumber ||
      type.includes("house") ||
      type.includes("building")
    ) return "address";
    if (type.includes("street") || type.includes("highway")) return "street";
    if (
      type.includes("city") ||
      type.includes("town") ||
      type.includes("village") ||
      type.includes("locality")
    ) return "city";
    if (
      type.includes("airport") ||
      type.includes("station") ||
      type.includes("attraction") ||
      type.includes("amenity") ||
      properties.name
    ) return "place";
    return "location";
  }

  function formatTypeLabel(type) {
    return {
      address: "Address",
      street: "Street",
      city: "City",
      place: "Place",
      location: "Location"
    }[type] || "Location";
  }

  function getTypeIcon(type) {
    return {
      address: "⌂",
      street: "↔",
      city: "●",
      place: "★",
      location: "⌖"
    }[type] || "⌖";
  }

  function uniqueParts(parts) {
    const seen = new Set();
    return parts
      .map(value => String(value || "").trim())
      .filter(Boolean)
      .filter(value => {
        const key = value.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }

  function sameText(a, b) {
    return String(a || "").trim().toLowerCase() ===
      String(b || "").trim().toLowerCase();
  }

  function renderAttribution() {
    return `
      <div class="address-search-attribution">
        Search by Photon · © OpenStreetMap contributors
      </div>
    `;
  }

  function getCachedResults(query) {
    try {
      const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || "{}");
      const entry = cache[query];

      if (
        entry &&
        Array.isArray(entry.results) &&
        Date.now() - Number(entry.savedAt || 0) < CACHE_TTL_MS
      ) {
        return entry.results;
      }
    } catch {
      return null;
    }

    return null;
  }

  function setCachedResults(query, results) {
    try {
      const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || "{}");
      cache[query] = { savedAt: Date.now(), results };

      const trimmed = Object.entries(cache)
        .sort((a, b) => Number(b[1]?.savedAt || 0) - Number(a[1]?.savedAt || 0))
        .slice(0, MAX_CACHE_ENTRIES);

      localStorage.setItem(CACHE_KEY, JSON.stringify(Object.fromEntries(trimmed)));
    } catch {
      // Autocomplete still works without caching.
    }
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  window.DetourEatsAddressSearch = {
    createAutocomplete
  };
})();
