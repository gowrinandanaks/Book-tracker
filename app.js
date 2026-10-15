/* ═══════════════════════════════════════════════════════════
   MY LIBRARY — app.js
   Vanilla JS · localStorage · Full CRUD + Search + Stats
═══════════════════════════════════════════════════════════ */

'use strict';

/* ─────────────────────────────────────────────────────────
   1. CONSTANTS & STATE
───────────────────────────────────────────────────────── */
const STORAGE_KEY = 'myLibrary_books_v1';

/**
 * Seed books — these match the hardcoded HTML mock cards
 * so the app feels populated on first load.
 * Once the user adds/deletes books the real array takes over.
 */
const SEED_BOOKS = [
  {
    id:        'seed_1',
    title:     'Atomic Habits',
    author:    'James Clear',
    status:    'reading',
    createdAt: '2026-10-12T00:00:00.000Z',
  },
  {
    id:        'seed_2',
    title:     'The Midnight Library',
    author:    'Matt Haig',
    status:    'finished',
    createdAt: '2026-10-05T00:00:00.000Z',
  },
  {
    id:        'seed_3',
    title:     'Dune',
    author:    'Frank Herbert',
    status:    'to-read',
    createdAt: '2026-09-28T00:00:00.000Z',
  },
  {
    id:        'seed_4',
    title:     'Sapiens',
    author:    'Yuval Noah Harari',
    status:    'reading',
    createdAt: '2026-09-20T00:00:00.000Z',
  },
  {
    id:        'seed_5',
    title:     '1984',
    author:    'George Orwell',
    status:    'to-read',
    createdAt: '2026-09-15T00:00:00.000Z',
  },
];

/** @type {Array<BookObject>} In-memory book list (newest first) */
let books = [];

/** Current live-search query string (raw, not trimmed — trim only at filter time) */
let searchQuery = '';

/** requestAnimationFrame handle for search debounce */
let searchDebounceTimer = null;

/* ─────────────────────────────────────────────────────────
   2. DOM REFERENCES
───────────────────────────────────────────────────────── */
// Header / footer
const footerYear        = document.getElementById('footer-year');

// Summary bar
const statTotal         = document.getElementById('stat-total');
const statToRead        = document.getElementById('stat-toread');
const statReading       = document.getElementById('stat-reading');
const statFinished      = document.getElementById('stat-finished');

// Form & its fields
const toggleFormBtn     = document.getElementById('toggle-form-btn');
const formPanel         = document.getElementById('book-form-panel');
const bookForm          = document.getElementById('book-form');
const inputTitle        = document.getElementById('input-title');
const inputAuthor       = document.getElementById('input-author');
const inputStatus       = document.getElementById('input-status');
const errorTitle        = document.getElementById('error-title');
const errorAuthor       = document.getElementById('error-author');

// Search
const searchInput       = document.getElementById('search-input');
const searchClearBtn    = document.getElementById('search-clear');
const searchResultCount = document.getElementById('search-results-count');

// Grid & states
const booksGrid         = document.getElementById('books-grid');
const emptyState        = document.getElementById('empty-state');
const noResultsState    = document.getElementById('no-results');
const libraryCount      = document.getElementById('library-count');

// Toast
const toastEl           = document.getElementById('toast');

/* ─────────────────────────────────────────────────────────
   3. BOOTSTRAP
───────────────────────────────────────────────────────── */
function init() {
  footerYear.textContent = new Date().getFullYear();

  // ── Load persisted books (or seed on very first visit) ──
  const { books: loaded, wasRestored } = loadFromStorage();
  books = loaded;

  // Render everything with the loaded data
  renderAll();
  bindEvents();

  // ── Notify the user if we restored a saved shelf ──
  // (not shown on very first visit / seed load)
  if (wasRestored && books.length > 0) {
    showToast(`📚 Shelf restored — ${books.length} ${books.length === 1 ? 'book' : 'books'} loaded`);
  }
}

/* ─────────────────────────────────────────────────────────
   4. LOCALSTORAGE HELPERS
───────────────────────────────────────────────────────── */

/**
 * The set of fields every book record MUST have.
 * Used to sanitise data loaded from localStorage so that
 * a corrupted or partial record never reaches the renderer.
 */
const REQUIRED_FIELDS = ['id', 'title', 'author', 'status', 'createdAt'];

/** Valid status values — anything else gets normalised to 'to-read' */
const VALID_STATUSES  = new Set(['to-read', 'reading', 'finished']);

/**
 * Sanitise a raw object read from localStorage into a valid book.
 * Returns null if the record is unrecoverable (e.g. missing id/title).
 *
 * @param {*} raw
 * @returns {{ id, title, author, status, createdAt } | null}
 */
function sanitiseBook(raw) {
  if (!raw || typeof raw !== 'object') return null;

  // id and title are the minimum required identifiers
  if (!raw.id || typeof raw.id !== 'string') return null;
  if (!raw.title || typeof raw.title !== 'string' || !raw.title.trim()) return null;

  return {
    id:        String(raw.id).trim(),
    title:     String(raw.title).trim(),
    // author defaults to 'Unknown' if missing
    author:    (raw.author && typeof raw.author === 'string' && raw.author.trim())
                 ? raw.author.trim()
                 : 'Unknown',
    // status must be one of the three valid values
    status:    VALID_STATUSES.has(raw.status) ? raw.status : 'to-read',
    // createdAt must be a parseable date string; fall back to epoch
    createdAt: (!isNaN(Date.parse(raw.createdAt)))
                 ? raw.createdAt
                 : new Date(0).toISOString(),
  };
}

/**
 * Load books from localStorage.
 *
 * Returns an object:
 *   { books: BookObject[], wasRestored: boolean }
 *
 *   wasRestored = true  → data came from localStorage (page was refreshed)
 *   wasRestored = false → first visit, seed data was used
 *
 * The array order is STRICTLY preserved exactly as stored —
 * no sorting is applied here, preserving the newest-first
 * insertion order that unshift() maintains on every add.
 */
function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (raw !== null) {
      // localStorage had data — parse it
      const parsed = JSON.parse(raw);

      if (Array.isArray(parsed)) {
        // Sanitise every record; silently drop unrecoverable ones
        const valid = parsed
          .map(sanitiseBook)
          .filter(Boolean); // remove nulls

        // Log a warning if any records were dropped
        if (valid.length < parsed.length) {
          console.warn(
            `[MyLibrary] Dropped ${parsed.length - valid.length} corrupted record(s) from localStorage`
          );
        }

        // Return the validated list. wasRestored = true even if the
        // array is empty (the key existed, the shelf was just cleared).
        return { books: valid, wasRestored: true };
      }

      // Stored value wasn't an array — treat as corrupt
      console.warn('[MyLibrary] localStorage data was not an array — resetting to seed data');
    }
  } catch (err) {
    // JSON.parse failed or localStorage is unavailable
    console.warn('[MyLibrary] Could not read localStorage:', err);
  }

  // ── First visit (or corrupt storage) — seed with sample data ──
  const seedCopy = SEED_BOOKS.map(sanitiseBook).filter(Boolean);
  saveToStorage(seedCopy);
  return { books: seedCopy, wasRestored: false };
}

/**
 * Persist the current `books` array to localStorage.
 * The array is stored AS-IS (insertion order preserved).
 *
 * Handles QuotaExceededError gracefully with a visible toast
 * so the user knows their change was NOT saved.
 *
 * @param {BookObject[]} [data=books]
 */
function saveToStorage(data = books) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    if (err.name === 'QuotaExceededError' || err.code === 22) {
      // Storage quota hit — warn the user visibly
      console.error('[MyLibrary] localStorage quota exceeded:', err);
      showToast('⚠️ Storage full — your last change could not be saved', 4500);
    } else {
      // Some other write error (e.g. private-browsing restriction)
      console.warn('[MyLibrary] Could not write to localStorage:', err);
    }
  }
}

/* ─────────────────────────────────────────────────────────
   5. UNIQUE ID GENERATOR
───────────────────────────────────────────────────────── */
function generateId() {
  return `book_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/* ─────────────────────────────────────────────────────────
   6. EVENT BINDING
───────────────────────────────────────────────────────── */
function bindEvents() {
  // ── Form toggle (open / close) ──
  toggleFormBtn.addEventListener('click', handleFormToggle);

  // ── Form submission ──
  bookForm.addEventListener('submit', handleFormSubmit);

  // ── Live validation on blur ──
  inputTitle.addEventListener('blur',  () => validateSingleField(inputTitle,  errorTitle,  'Please enter a title'));
  inputAuthor.addEventListener('blur', () => validateSingleField(inputAuthor, errorAuthor, 'Please enter an author'));

  // ── Clear inline error as user types ──
  inputTitle.addEventListener('input',  () => { if (inputTitle.value.trim())  clearError(inputTitle,  errorTitle);  });
  inputAuthor.addEventListener('input', () => { if (inputAuthor.value.trim()) clearError(inputAuthor, errorAuthor); });

  // ── Live search ──
  searchInput.addEventListener('input', handleSearch);
  searchClearBtn.addEventListener('click', clearSearch);

  // ── Escape key closes the form ──
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && isFormOpen()) collapseForm();
  });
}

/* ─────────────────────────────────────────────────────────
   7. FORM TOGGLE
───────────────────────────────────────────────────────── */
function isFormOpen() {
  return formPanel.getAttribute('aria-hidden') === 'false';
}

function handleFormToggle() {
  isFormOpen() ? collapseForm() : expandForm();
}

function expandForm() {
  formPanel.setAttribute('aria-hidden', 'false');
  toggleFormBtn.setAttribute('aria-expanded', 'true');
  // Small delay so the grid-template-rows animation starts first
  setTimeout(() => inputTitle.focus(), 320);
}

function collapseForm() {
  formPanel.setAttribute('aria-hidden', 'true');
  toggleFormBtn.setAttribute('aria-expanded', 'false');
  clearAllErrors();
}

/* ─────────────────────────────────────────────────────────
   8. FORM VALIDATION
───────────────────────────────────────────────────────── */
/**
 * Validates a single field.
 * @param {HTMLInputElement} input  - The input element
 * @param {HTMLElement}      errEl  - The error <p> beneath it
 * @param {string}           msg    - Error message to show
 * @returns {boolean} true when valid
 */
function validateSingleField(input, errEl, msg) {
  if (!input.value.trim()) {
    showError(input, errEl, msg);
    return false;
  }
  clearError(input, errEl);
  return true;
}

/** Mark field as invalid and show the error message */
function showError(input, errEl, msg) {
  input.classList.add('is-error');
  errEl.textContent = msg;
  // Announce to screen readers
  errEl.setAttribute('role', 'alert');
}

/** Remove error styling and message */
function clearError(input, errEl) {
  input.classList.remove('is-error');
  errEl.textContent = '';
}

/** Clear ALL field errors (used on form reset / collapse) */
function clearAllErrors() {
  clearError(inputTitle,  errorTitle);
  clearError(inputAuthor, errorAuthor);
}

/* ─────────────────────────────────────────────────────────
   9. FORM SUBMISSION — ADD BOOK
   Steps:
     1. Run inline validation on both fields
     2. If either fails → stop, show errors, focus first error
     3. If valid → build book object, prepend to array
     4. Persist, re-render grid & stats, clear form, show toast
───────────────────────────────────────────────────────── */
function handleFormSubmit(e) {
  e.preventDefault();

  // Validate both fields (run both so ALL errors show at once)
  const titleOK  = validateSingleField(inputTitle,  errorTitle,  'Please enter a title');
  const authorOK = validateSingleField(inputAuthor, errorAuthor, 'Please enter an author');

  if (!titleOK || !authorOK) {
    // Focus the first invalid field for accessibility
    if (!titleOK)       inputTitle.focus();
    else if (!authorOK) inputAuthor.focus();
    return; // ← stop submission
  }

  /* ── Build the book object ── */
  /** @type {BookObject} */
  const newBook = {
    id:        generateId(),
    title:     inputTitle.value.trim(),
    author:    inputAuthor.value.trim(),
    status:    inputStatus.value,           // 'to-read' | 'reading' | 'finished'
    createdAt: new Date().toISOString(),    // ISO-8601 timestamp
  };

  /* ── Prepend so newest books appear at the top ── */
  books.unshift(newBook);

  /* ── Persist to localStorage ── */
  saveToStorage();

  /* ── Update UI ── */
  renderAll();
  resetForm();
  collapseForm();
  showToast(`"${newBook.title}" added to your library 📚`);
}

/** Clear form inputs and errors after a successful add */
function resetForm() {
  bookForm.reset();
  clearAllErrors();
}

/* ─────────────────────────────────────────────────────────
   10. DELETE BOOK
───────────────────────────────────────────────────────── */
/**
 * Animate card out, remove from array, persist and re-render.
 * @param {string} id - Book id to remove
 */
function deleteBook(id) {
  const book   = books.find(b => b.id === id);
  if (!book) return; // guard: id not in array at all

  // The card may not be in the DOM if search is active and the book
  // didn't match the query. We always mutate the array regardless.
  const cardEl = booksGrid.querySelector(`[data-id="${id}"]`);

  const doRemove = () => {
    books = books.filter(b => b.id !== id);
    saveToStorage();
    renderAll();
    showToast(`"${book.title}" removed`);
  };

  if (cardEl) {
    // Card is visible — animate it out first, then remove
    cardEl.classList.add('removing');
    setTimeout(doRemove, 260);
  } else {
    // Card is hidden (search active) — remove immediately, no animation
    doRemove();
  }
}

/* ─────────────────────────────────────────────────────────
   11. UPDATE STATUS (inline card dropdown)
───────────────────────────────────────────────────────── */
/**
 * Update a book's status in memory and persist,
 * then refresh the card's visual state without a full re-render.
 * @param {string} id        - Book id
 * @param {string} newStatus - New status value
 * @param {HTMLElement} cardEl
 */
function updateBookStatus(id, newStatus, cardEl) {
  const book = books.find(b => b.id === id);
  if (!book) return;

  const oldStatus = book.status;
  if (oldStatus === newStatus) return; // nothing changed

  book.status = newStatus;
  saveToStorage();

  // ── 1. Update card data-status (drives the left accent stripe colour via CSS) ──
  cardEl.setAttribute('data-status', newStatus);

  // ── 2. Update the status pill badge — class + text ──
  const pill = cardEl.querySelector('.status-pill');
  if (pill) {
    pill.className   = `status-pill ${pillClass(newStatus)}`;
    pill.textContent = pillLabel(newStatus);
  }

  // ── 3. Update the card's status select chip colour ──
  const select = cardEl.querySelector('.card-status-select');
  if (select) select.setAttribute('data-status', newStatus);

  // ── 4. Update the book cover colour class ──
  //    (e.g. switching from 'to-read' → 'finished' must change blue cover to green)
  const cover = cardEl.querySelector('.card-cover');
  if (cover) {
    // Remove any existing status cover class
    cover.classList.remove('card-cover-toread', 'card-cover-reading', 'card-cover-finished');
    // Add the correct one for the new status
    const newCoverClass = `card-cover-${newStatus === 'to-read' ? 'toread' : newStatus}`;
    cover.classList.add(newCoverClass);
  }

  // ── 5. Update aria-label so screen readers announce the new status ──
  cardEl.setAttribute(
    'aria-label',
    `${book.title} by ${book.author} — ${statusLabel(newStatus)}`
  );

  // ── 6. Recalculate all summary bar counters ──
  updateStats();
}

/* ─────────────────────────────────────────────────────────
   12. SEARCH
───────────────────────────────────────────────────────── */
/**
 * Debounced search handler.
 * We store the raw input value (spaces and all) so the search box
 * never loses characters. Trimming happens only inside getFilteredBooks()
 * at filter time — not here — so "Frank Herbert" still matches " frank".
 */
function handleSearch(e) {
  searchQuery = e.target.value; // raw — do NOT trim here
  searchClearBtn.hidden = searchQuery.trim().length === 0;

  // Debounce: cancel any pending render tick, schedule a new one.
  // Using setTimeout (not rAF) so it survives rapid typing.
  clearTimeout(searchDebounceTimer);
  searchDebounceTimer = setTimeout(() => {
    renderBooks();
  }, 120); // 120 ms feels instant but avoids layout thrash on every keystroke
}

function clearSearch() {
  searchInput.value        = '';
  searchQuery              = '';
  searchClearBtn.hidden    = true;
  searchResultCount.hidden = true;
  clearTimeout(searchDebounceTimer);
  searchInput.focus();
  renderBooks();
}

/**
 * Return the subset of books whose title or author contains the query.
 * Matching is case-insensitive and ignores leading/trailing whitespace.
 */
function getFilteredBooks() {
  const q = searchQuery.trim().toLowerCase();
  if (!q) return books; // empty / whitespace-only query → show all
  return books.filter(b =>
    b.title.toLowerCase().includes(q) ||
    b.author.toLowerCase().includes(q)
  );
}

/**
 * Wrap occurrences of `query` in a <mark> tag inside `text`.
 * Used to highlight search matches in card titles and author names.
 * Falls back to the plain escaped text when no query is active.
 *
 * @param {string} text  - Already-escaped HTML-safe string
 * @param {string} query - Raw search query (will be escaped before use)
 * @returns {string}     - HTML string safe to inject via innerHTML
 */
function highlightMatch(text, query) {
  const q = query.trim();
  if (!q) return text;

  // Escape the query so regex special chars don't break the pattern
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`(${escaped})`, 'gi');
  // text is already HTML-escaped so we only wrap the matched portion
  return text.replace(re, '<mark class="search-highlight">$1</mark>');
}

/* ─────────────────────────────────────────────────────────
   13. RENDER — MAIN ORCHESTRATOR
───────────────────────────────────────────────────────── */
/** Full re-render: grid + stats + library count label */
function renderAll() {
  renderBooks();
  updateStats();
}

/** Render the filtered book cards into the grid */
function renderBooks() {
  /*
   * ── ORDER INTEGRITY GUARANTEE ──────────────────────────
   * `books` is populated directly from localStorage (or from
   * unshift() calls which maintain newest-first order).
   * We never sort this array here — we render it exactly as
   * received so that the user's ordering is always preserved
   * across page refreshes.
   * ────────────────────────────────────────────────────── */
  const filtered = getFilteredBooks();

  // Decide which UI state to show
  const isLibraryEmpty = books.length === 0;
  const noSearchMatch  = books.length > 0 && filtered.length === 0;
  const hasCards       = filtered.length > 0;

  // Toggle state panels
  emptyState.hidden      = !isLibraryEmpty;
  noResultsState.hidden  = !noSearchMatch;

  // Update search result hint
  if (searchQuery && hasCards) {
    searchResultCount.hidden      = false;
    searchResultCount.textContent = `${filtered.length} result${filtered.length !== 1 ? 's' : ''} for "${searchQuery}"`;
  } else {
    searchResultCount.hidden = true;
  }

  // Clear the existing rendered cards
  booksGrid.innerHTML = '';

  if (!hasCards) {
    updateLibraryCountLabel(0);
    return;
  }

  // Build and append each card in the exact order from `books` / `filtered`.
  // The stagger animation delay is index-based so it always looks correct.
  filtered.forEach((book, index) => {
    const card = buildCard(book, index);
    booksGrid.appendChild(card);
  });

  updateLibraryCountLabel(filtered.length);
}

/* ─────────────────────────────────────────────────────────
   14. CARD BUILDER
───────────────────────────────────────────────────────── */
/**
 * Construct a complete book card DOM element.
 * @param {BookObject} book
 * @param {number}     index - Used for animation stagger delay
 * @returns {HTMLElement}
 */
function buildCard(book, index) {
  const article = document.createElement('article');
  article.className         = 'book-card';
  article.dataset.id        = book.id;
  article.dataset.status    = book.status;
  article.style.animationDelay = `${Math.min(index * 45, 360)}ms`;
  article.setAttribute('role', 'listitem');
  article.setAttribute('aria-label', `${book.title} by ${book.author} — ${statusLabel(book.status)}`);

  // Status-based cover colour class
  const coverClass = `card-cover-${book.status === 'to-read' ? 'toread' : book.status}`;

  // First letter of title for the cover avatar
  const coverLetter = escapeHTML(book.title.charAt(0).toUpperCase());

  // Pre-escaped strings used in both the HTML template and highlight calls
  const safeTitle  = escapeHTML(book.title);
  const safeAuthor = escapeHTML(book.author);
  const safeStatus = escapeHTML(book.status);

  // Apply search highlight to title and author if a query is active
  const displayTitle  = highlightMatch(safeTitle,  searchQuery);
  const displayAuthor = highlightMatch(safeAuthor, searchQuery);

  article.innerHTML = `
    <div class="card-header">
      <div class="card-cover ${escapeHTML(coverClass)}" aria-hidden="true">
        <span class="card-cover-letter">${coverLetter}</span>
      </div>
      <button
        class="card-delete-btn"
        aria-label="Delete ${safeTitle}"
        title="Remove book"
        data-action="delete"
      >
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
          <path d="M1 1l11 11M12 1L1 12" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
        </svg>
      </button>
    </div>

    <div class="card-body">
      <h3 class="card-title">${displayTitle}</h3>
      <p class="card-author">${displayAuthor}</p>
    </div>

    <div class="card-footer">
      <span class="status-pill ${pillClass(book.status)}">${pillLabel(book.status)}</span>
      <select
        class="card-status-select"
        data-status="${safeStatus}"
        aria-label="Change reading status for ${safeTitle}"
        data-action="status"
      >
        <option value="to-read"  ${book.status === 'to-read'  ? 'selected' : ''}>To Read</option>
        <option value="reading"  ${book.status === 'reading'  ? 'selected' : ''}>Reading</option>
        <option value="finished" ${book.status === 'finished' ? 'selected' : ''}>Finished</option>
      </select>
    </div>

    <div class="card-date">Added ${formatDate(book.createdAt)}</div>
  `;

  // ── Bind delete ──
  article.querySelector('[data-action="delete"]').addEventListener('click', () => {
    deleteBook(book.id);
  });

  // ── Bind status change ──
  // Note: updateBookStatus already sets data-status on the select,
  // so we don't need to duplicate that here.
  article.querySelector('[data-action="status"]').addEventListener('change', function () {
    updateBookStatus(book.id, this.value, article);
  });

  return article;
}

/* ─────────────────────────────────────────────────────────
   15. STATS BAR UPDATE
───────────────────────────────────────────────────────── */
function updateStats() {
  const total    = books.length;
  const toRead   = books.filter(b => b.status === 'to-read').length;
  const reading  = books.filter(b => b.status === 'reading').length;
  const finished = books.filter(b => b.status === 'finished').length;

  animateCount(statTotal,    total);
  animateCount(statToRead,   toRead);
  animateCount(statReading,  reading);
  animateCount(statFinished, finished);
}

/**
 * Smoothly animate a counter from its current displayed value to `target`.
 * @param {HTMLElement} el
 * @param {number}      target
 */
function animateCount(el, target) {
  const from     = parseInt(el.textContent, 10) || 0;
  if (from === target) return;

  const duration = 380; // ms
  const startTs  = performance.now();

  function tick(now) {
    const progress = Math.min((now - startTs) / duration, 1);
    // Ease-out cubic
    const eased    = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(from + (target - from) * eased);
    if (progress < 1) requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
}

/** Update the "X books" label above the grid */
function updateLibraryCountLabel(count) {
  libraryCount.textContent = `${count} ${count === 1 ? 'book' : 'books'}`;
}

/* ─────────────────────────────────────────────────────────
   16. TOAST NOTIFICATIONS
───────────────────────────────────────────────────────── */
let toastTimer = null;

/**
 * Show a brief toast message at the bottom of the screen.
 * @param {string} message
 * @param {number} duration - ms to display (default 2800)
 */
function showToast(message, duration = 2800) {
  toastEl.textContent = message;
  toastEl.classList.add('show');

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastEl.classList.remove('show');
  }, duration);
}

/* ─────────────────────────────────────────────────────────
   17. UTILITY HELPERS
───────────────────────────────────────────────────────── */
/**
 * Escape HTML special characters to prevent XSS
 * when injecting user data into innerHTML.
 * @param {string} str
 * @returns {string}
 */
function escapeHTML(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Format an ISO timestamp into a human-readable date.
 * e.g. "Oct 12, 2026"
 * @param {string} iso
 * @returns {string}
 */
function formatDate(iso) {
  try {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day:   'numeric',
      year:  'numeric',
    }).format(new Date(iso));
  } catch {
    return '—';
  }
}

/**
 * CSS class name for the status pill badge.
 * @param {string} status
 * @returns {string}
 */
function pillClass(status) {
  const map = {
    'to-read':  'pill-toread',
    'reading':  'pill-reading',
    'finished': 'pill-finished',
  };
  return map[status] || 'pill-toread';
}

/**
 * Human-readable label for the status pill.
 * @param {string} status
 * @returns {string}
 */
function pillLabel(status) {
  const map = {
    'to-read':  '🔖 To Read',
    'reading':  '📖 Reading',
    'finished': '✅ Finished',
  };
  return map[status] || '🔖 To Read';
}

/**
 * Human-readable status for aria-labels.
 * @param {string} status
 * @returns {string}
 */
function statusLabel(status) {
  const map = {
    'to-read':  'To Read',
    'reading':  'Reading',
    'finished': 'Finished',
  };
  return map[status] || status;
}

/* ─────────────────────────────────────────────────────────
   18. START THE APP
───────────────────────────────────────────────────────── */
init();
