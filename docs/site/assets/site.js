(() => {
  const GROUPS = [
    {
      title: "Foundations",
      pages: [
        { id: "overview", href: "overview.html", label: "NAppGUI Overview", summary: "The source-backed entry point for the current checkout." },
        { id: "architecture-notes", href: "architecture-notes.html", label: "Architecture Notes", summary: "A code-grounded architecture summary for the current checkout." },
        { id: "core-architecture", href: "core-architecture.html", label: "Core Architecture", summary: "How the main libraries, startup path, events, and resources fit together." },
        { id: "guictx-abstraction", href: "guictx-abstraction.html", label: "GuiCtx Abstraction Layer", summary: "The backend contract between high-level GUI code and native implementations." },
        { id: "layout-cell-management", href: "layout-cell-management.html", label: "Layout and Cell Management", summary: "Grid composition, cell sizing, recursive layout, and panel/window integration." },
        { id: "data-binding-system", href: "data-binding-system.html", label: "Data Binding System", summary: "DBind metadata, layout/member binding, and object-change notifications." },
        { id: "build-system-configuration", href: "build-system-configuration.html", label: "Build System and Configuration", summary: "CMake entry points, compiler setup, resource generation, and WebView gating." }
      ]
    },
    {
      title: "GUI",
      pages: [
        { id: "gui-components", href: "gui-components.html", label: "GUI Components", summary: "The public widget families exposed through guiall.h." },
        { id: "basic-controls", href: "basic-controls.html", label: "Basic Controls", summary: "Buttons, edits, combos, popups, sliders, progress bars, and up/down controls." },
        { id: "text-rich-content", href: "text-rich-content.html", label: "Text and Rich Content", summary: "Labels, image views, text views, and web views." },
        { id: "data-display-components", href: "data-display-components.html", label: "Data Display Components", summary: "ListBox and TableView, plus their owner-drawn data/display model." },
        { id: "layout-components", href: "layout-components.html", label: "Layout Components", summary: "Panels, split views, windows, menus, and common dialogs." }
      ]
    },
    {
      title: "Platforms",
      pages: [
        { id: "platform-implementations", href: "platform-implementations.html", label: "Platform Implementations", summary: "A comparison of the macOS, Windows, and GTK backends." },
        { id: "macos-implementation", href: "macos-implementation.html", label: "macOS Implementation", summary: "Cocoa/AppKit, Core Graphics, and conditional WKWebView support." },
        { id: "windows-implementation", href: "windows-implementation.html", label: "Windows Implementation", summary: "Win32 windowing, GDI/GDI+, accelerators, and WebView2." },
        { id: "gtk-implementation", href: "gtk-implementation.html", label: "GTK Implementation", summary: "GtkApplication, Cairo/Pango drawing, GTK window management, and WebKitGTK." }
      ]
    },
    {
      title: "Core",
      pages: [
        { id: "core-infrastructure", href: "core-infrastructure.html", label: "Core Infrastructure", summary: "The runtime services under core, osbs, and the wider stack." },
        { id: "memory-management-core-types", href: "memory-management-core-types.html", label: "Memory Management and Core Types", summary: "Heap helpers, typed containers, and the macro-heavy core data model." },
        { id: "file-system-io", href: "file-system-io.html", label: "File System and I/O", summary: "Low-level bfile access, high-level hfile helpers, and the Stream API." },
        { id: "graphics-opengl-integration", href: "graphics-opengl-integration.html", label: "Graphics and OpenGL Integration", summary: "draw2d services, image/font handling, and platform OpenGL contexts." },
        { id: "ogl3d-internals", href: "ogl3d-internals.html", label: "OGL3D Internals", summary: "Context creation, platform backends, version checks, and the glhello usage pattern." }
      ]
    },
    {
      title: "Services and Tools",
      pages: [
        { id: "encode-library", href: "encode-library.html", label: "Encode Library", summary: "Base64 helpers, DBind-driven JSON, and the lightweight URL parser." },
        { id: "encode-api-examples", href: "encode-api-examples.html", label: "Encode API Examples", summary: "Practical patterns for Base64, JSON, and URL parsing from the repo demos." },
        { id: "inet-http-client", href: "inet-http-client.html", label: "Inet HTTP Client", summary: "The cross-platform HTTP layer built on encode and platform OS backends." },
        { id: "inet-api-examples", href: "inet-api-examples.html", label: "Inet API Examples", summary: "Repo-backed GET, response handling, and HTTP-plus-JSON usage patterns." },
        { id: "nrc-resource-compiler", href: "nrc-resource-compiler.html", label: "NRC Resource Compiler", summary: "How resource packs, localization, and generated ResPack code are produced." }
      ]
    }
  ];

  const MIN_SEARCH_CHARS = 2;
  const MAX_RESULTS = 10;
  const FLAT_PAGES = new Map();
  let searchIndexScriptPromise = null;
  let searchEntriesPromise = null;

  for (const group of GROUPS) {
    for (const page of group.pages) {
      FLAT_PAGES.set(page.id, page);
    }
  }

  function escapeHtml(text) {
    return String(text ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function normalizeSearchText(text) {
    return String(text ?? "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  function tokenizeQuery(query) {
    const normalized = normalizeSearchText(query);
    return normalized ? normalized.split(/\s+/).filter(Boolean) : [];
  }

  function trimText(text, maxLength = 180) {
    const value = String(text ?? "").trim();
    if (value.length <= maxLength) {
      return value;
    }

    return `${value.slice(0, maxLength).trimEnd()}...`;
  }

  function loadSearchIndexScript() {
    if (Array.isArray(window.NAPPGUI_SEARCH_INDEX)) {
      return Promise.resolve(window.NAPPGUI_SEARCH_INDEX);
    }

    if (searchIndexScriptPromise) {
      return searchIndexScriptPromise;
    }

    searchIndexScriptPromise = new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "assets/search-index.js";
      script.async = true;
      script.onload = () => resolve(Array.isArray(window.NAPPGUI_SEARCH_INDEX) ? window.NAPPGUI_SEARCH_INDEX : []);
      script.onerror = () => resolve([]);
      document.head.appendChild(script);
    });

    return searchIndexScriptPromise;
  }

  function loadSearchEntries() {
    if (searchEntriesPromise) {
      return searchEntriesPromise;
    }

    searchEntriesPromise = loadSearchIndexScript().then((entries) =>
      entries.map((entry, index) => ({
        ...entry,
        _index: index,
        _titleText: normalizeSearchText(entry.title),
        _pageText: normalizeSearchText(entry.page),
        _groupText: normalizeSearchText(entry.group),
        _summaryText: normalizeSearchText(entry.summary),
        _bodyText: normalizeSearchText(entry.text)
      }))
    );

    return searchEntriesPromise;
  }

  function searchMarkup(idPrefix, mode) {
    const searchId = `${idPrefix}-input`;
    const rootClass = mode === "home" ? "search-block search-block-home" : "search-block search-block-sidebar";
    return `
      <section class="${rootClass}">
        <label class="search-label" for="${searchId}">Search Docs</label>
        <div class="search-input-wrap">
          <input
            id="${searchId}"
            class="search-input"
            type="search"
            inputmode="search"
            autocomplete="off"
            spellcheck="false"
            placeholder="Search pages, sections, APIs, or source files"
          >
          <button class="search-clear" type="button" hidden>Clear</button>
        </div>
        <p class="search-hint">Search page titles, section headings, APIs, platforms, and source file names.</p>
        <div class="search-results" hidden aria-live="polite"></div>
      </section>
    `;
  }

  function renderSidebar() {
    const sidebar = document.querySelector(".sidebar");
    if (!sidebar) return;

    const pageId = document.body.dataset.page || "";
    const current = FLAT_PAGES.get(pageId);
    const title =
      document.body.dataset.sidebarTitle ||
      current?.label ||
      document.querySelector(".page-title")?.textContent?.trim() ||
      "NAppGUI Local Docs";
    const summary =
      document.body.dataset.sidebarSummary ||
      current?.summary ||
      "Source-backed documentation for the local nappgui_src checkout.";

    const groupsHtml = GROUPS.map((group) => {
      const links = group.pages
        .map((page) => {
          const active = page.id === pageId ? ' class="active"' : "";
          return `<a${active} href="${page.href}">${escapeHtml(page.label)}</a>`;
        })
        .join("");
      return `<nav class="nav-group"><h3>${escapeHtml(group.title)}</h3>${links}</nav>`;
    }).join("");

    sidebar.innerHTML = `
      <div class="brand">
        <small>NAppGUI Local Docs</small>
        <h1>${escapeHtml(title)}</h1>
        <p class="muted">${escapeHtml(summary)}</p>
      </div>
      ${searchMarkup("sidebar-doc-search", "sidebar")}
      <nav class="nav-group">
        <h3>Site</h3>
        <a href="index.html">Docs Home</a>
        <a href="architecture-notes.html">Architecture Notes</a>
      </nav>
      ${groupsHtml}
      <div class="sidebar-note">
        Verified against commit <code>0a1eaf3bdbe9e1b530550fe3a392e2d37a065687</code>,
        dated <code>2026-04-25</code>, version <code>1.6.2</code>.
      </div>
    `;
  }

  function renderHomeSearch() {
    const host = document.querySelector(".home-search");
    if (!host) return;

    host.innerHTML = searchMarkup("home-doc-search", "home");
  }

  function renderTOC() {
    const toc = document.querySelector(".toc");
    if (!toc) return;

    const sections = [...document.querySelectorAll(".section[id] > h2")]
      .map((heading) => ({
        id: heading.parentElement.id,
        label: heading.textContent.trim()
      }))
      .filter((section) => section.id && section.label);

    if (sections.length === 0) {
      toc.innerHTML = "";
      toc.style.display = "none";
      return;
    }

    toc.innerHTML = `
      <div class="toc-card">
        <h3>On This Page</h3>
        ${sections.map((section) => `<a href="#${section.id}">${escapeHtml(section.label)}</a>`).join("")}
      </div>
    `;
  }

  function scoreEntry(entry, normalizedQuery, tokens) {
    let score = 0;

    if (entry._titleText.includes(normalizedQuery)) score += 120;
    if (entry._pageText.includes(normalizedQuery)) score += 60;
    if (entry._summaryText.includes(normalizedQuery)) score += 34;
    if (entry._bodyText.includes(normalizedQuery)) score += 16;
    if (entry._groupText.includes(normalizedQuery)) score += 12;

    for (const token of tokens) {
      let tokenScore = 0;

      if (entry._titleText.includes(token)) tokenScore = Math.max(tokenScore, 60);
      if (entry._pageText.includes(token)) tokenScore = Math.max(tokenScore, 30);
      if (entry._summaryText.includes(token)) tokenScore = Math.max(tokenScore, 18);
      if (entry._bodyText.includes(token)) tokenScore = Math.max(tokenScore, 8);
      if (entry._groupText.includes(token)) tokenScore = Math.max(tokenScore, 8);

      if (tokenScore === 0) {
        return -1;
      }

      score += tokenScore;
    }

    if (entry.kind === "page") {
      score += 4;
    }

    return score;
  }

  function runSearch(query, entries) {
    const normalizedQuery = normalizeSearchText(query);
    const tokens = tokenizeQuery(query);

    if (!normalizedQuery || tokens.length === 0) {
      return [];
    }

    return entries
      .map((entry) => ({ entry, score: scoreEntry(entry, normalizedQuery, tokens) }))
      .filter((item) => item.score >= 0)
      .sort((left, right) => {
        if (right.score !== left.score) {
          return right.score - left.score;
        }

        if (left.entry.kind !== right.entry.kind) {
          return left.entry.kind === "page" ? -1 : 1;
        }

        return left.entry._index - right.entry._index;
      })
      .slice(0, MAX_RESULTS)
      .map((item) => item.entry);
  }

  function renderSearchState(resultsEl, message) {
    resultsEl.hidden = false;
    resultsEl.innerHTML = `<div class="search-state">${escapeHtml(message)}</div>`;
  }

  function renderSearchResults(resultsEl, query, results) {
    if (results.length === 0) {
      renderSearchState(resultsEl, `No matches for "${query}".`);
      return;
    }

    const countHtml = `<div class="search-count">Top ${results.length} result${results.length === 1 ? "" : "s"} for <code>${escapeHtml(query)}</code></div>`;
    const itemsHtml = results
      .map((result) => {
        const meta = result.kind === "section"
          ? `${result.group} · ${result.page}`
          : `${result.group} · Page`;
        const snippet = trimText(result.summary || result.text || "", 180);
        return `
          <a class="search-result" href="${escapeHtml(result.href)}">
            <span class="search-result-title">${escapeHtml(result.title)}</span>
            <span class="search-result-meta">${escapeHtml(meta)}</span>
            <span class="search-result-snippet">${escapeHtml(snippet)}</span>
          </a>
        `;
      })
      .join("");

    resultsEl.hidden = false;
    resultsEl.innerHTML = `${countHtml}${itemsHtml}`;
  }

  function initializeSearchRoot(root) {
    const input = root.querySelector(".search-input");
    const clearButton = root.querySelector(".search-clear");
    const resultsEl = root.querySelector(".search-results");
    let entries = null;

    if (!input || !clearButton || !resultsEl) {
      return;
    }

    function syncClearButton() {
      clearButton.hidden = input.value.trim().length === 0;
    }

    function ensureEntries() {
      return loadSearchEntries().then((loadedEntries) => {
        entries = loadedEntries;
        return loadedEntries;
      });
    }

    function clearSearch(keepFocus) {
      input.value = "";
      syncClearButton();
      resultsEl.hidden = true;
      resultsEl.innerHTML = "";
      if (keepFocus) {
        input.focus();
      }
    }

    function updateSearch() {
      const query = input.value.trim();
      syncClearButton();

      if (query.length === 0) {
        resultsEl.hidden = true;
        resultsEl.innerHTML = "";
        return;
      }

      if (query.length < MIN_SEARCH_CHARS) {
        renderSearchState(resultsEl, `Type at least ${MIN_SEARCH_CHARS} characters to search the docs.`);
        return;
      }

      if (entries === null) {
        renderSearchState(resultsEl, "Loading search index...");
        ensureEntries().then(() => {
          if (input.value.trim() === query) {
            updateSearch();
          }
        });
        return;
      }

      if (entries.length === 0) {
        renderSearchState(resultsEl, "Search index is unavailable for this local build.");
        return;
      }

      const results = runSearch(query, entries);
      renderSearchResults(resultsEl, query, results);
    }

    input.addEventListener("focus", () => {
      ensureEntries();
      if (input.value.trim().length >= MIN_SEARCH_CHARS) {
        updateSearch();
      }
    });

    input.addEventListener("input", updateSearch);

    input.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        clearSearch(true);
        event.preventDefault();
        return;
      }

      if (event.key === "Enter") {
        const firstResult = resultsEl.querySelector(".search-result");
        if (firstResult) {
          window.location.href = firstResult.getAttribute("href");
          event.preventDefault();
        }
      }
    });

    clearButton.addEventListener("click", () => {
      clearSearch(true);
    });

    document.addEventListener("click", (event) => {
      if (!root.contains(event.target)) {
        resultsEl.hidden = true;
      }
    });
  }

  function initializeSearch() {
    const roots = document.querySelectorAll(".search-block");
    roots.forEach((root) => initializeSearchRoot(root));
  }

  document.addEventListener("DOMContentLoaded", () => {
    renderSidebar();
    renderHomeSearch();
    renderTOC();
    initializeSearch();
    loadSearchEntries();
  });
})();
