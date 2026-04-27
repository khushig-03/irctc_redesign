// ============================================================
// TRAIN DATA (shared across pages)
// ============================================================
const TRAINS = [
    { name: 'REWA EXPRESS',        number: '12428', route: 'CNB → NDLS', runs: 'Mon, Wed, Fri, Sun' },
    { name: 'MAHAKAUSHAL EXPRESS', number: '11449', route: 'CNB → NDLS', runs: 'Daily' },
    { name: 'VINDHYACHAL EXPRESS', number: '12165', route: 'CNB → NDLS', runs: 'Tue, Thu, Sat' },
];

// Storage helpers (use sessionStorage so it persists within session)
function getRecentTrains() {
    try { return JSON.parse(sessionStorage.getItem('irctc_recent_trains') || '[]'); } catch { return []; }
}
function saveRecentTrain(query) {
    const list = getRecentTrains().filter(t => t.toLowerCase() !== query.toLowerCase());
    list.unshift(query);
    sessionStorage.setItem('irctc_recent_trains', JSON.stringify(list.slice(0, 5)));
}
function clearRecentTrains() {
    sessionStorage.removeItem('irctc_recent_trains');
}

// ============================================================
// 1. COUNTDOWN TIMER (Passenger Details Page)
// ============================================================
const timerElement = document.getElementById('countdown');
if (timerElement) {
    let time = 14 * 60 + 32;
    setInterval(() => {
        const min = Math.floor(time / 60);
        let sec = time % 60;
        sec = sec < 10 ? '0' + sec : sec;
        timerElement.innerHTML = `${min}:${sec}`;
        if (time > 0) time--;
    }, 1000);
}

// ============================================================
// 2. AUTO-SAVE TOAST (Passenger Details Page)
// ============================================================
const inputs = document.querySelectorAll('.auto-save');
const toast = document.getElementById('saveToast');
let saveTimeout;
inputs.forEach(input => {
    input.addEventListener('input', () => {
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(() => {
            if (toast) {
                toast.classList.add('show');
                setTimeout(() => toast.classList.remove('show'), 2500);
            }
        }, 800);
    });
});

// ============================================================
// 3. PAYMENT TABS (Payment Page)
// ============================================================
function switchTab(tabId, element) {
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    element.classList.add('active');
}

// ============================================================
// 4. SUCCESS MODAL (Payment Page)
// ============================================================
function showSuccessModal() {
    const modal = document.getElementById('successModal');
    if (modal) modal.classList.add('show');
}

// ============================================================
// 5. DIRECT TRAIN SEARCH (Search Results Page)
// ============================================================
const trainSearchInput  = document.getElementById('trainSearchInput');
const trainSuggestions  = document.getElementById('trainSuggestions');
const trainRecent       = document.getElementById('trainRecent');
const trainSearchClear  = document.getElementById('trainSearchClear');
const searchStatusBanner = document.getElementById('searchStatusBanner');
const trainCards        = document.querySelectorAll('.train-card');
const trainCountEl      = document.getElementById('trainCount');

if (trainSearchInput) {

    // --- Show recent panel on focus (if input is empty) ---
    trainSearchInput.addEventListener('focus', () => {
        if (trainSearchInput.value.trim() === '') {
            renderRecentPanel();
            trainRecent.classList.add('open');
        }
    });

    // --- Hide panels on outside click ---
    document.addEventListener('click', (e) => {
        const wrap = document.querySelector('.train-search-bar-wrap');
        if (wrap && !wrap.contains(e.target)) {
            trainSuggestions.classList.remove('open');
            trainRecent.classList.remove('open');
        }
    });

    // --- Main input handler ---
    trainSearchInput.addEventListener('input', (e) => {
        const query = e.target.value.trim();
        trainSearchClear.style.display = query ? 'block' : 'none';

        if (query.length === 0) {
            trainSuggestions.classList.remove('open');
            renderRecentPanel();
            trainRecent.classList.add('open');
            clearSearchHighlights();
            return;
        }

        trainRecent.classList.remove('open');
        const matches = filterTrains(query);
        renderSuggestions(matches, query);
        applyHighlights(query);
    });

    // --- Keyboard navigation in suggestions ---
    trainSearchInput.addEventListener('keydown', (e) => {
        const items = trainSuggestions.querySelectorAll('.suggestion-item');
        const active = trainSuggestions.querySelector('.suggestion-item.active');
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (!active) items[0]?.classList.add('active');
            else {
                active.classList.remove('active');
                (active.nextElementSibling || items[0]).classList.add('active');
            }
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (!active) items[items.length - 1]?.classList.add('active');
            else {
                active.classList.remove('active');
                (active.previousElementSibling || items[items.length - 1]).classList.add('active');
            }
        } else if (e.key === 'Enter') {
            const activeItem = trainSuggestions.querySelector('.suggestion-item.active');
            if (activeItem) {
                applySearch(activeItem.dataset.query);
            } else {
                applySearch(trainSearchInput.value.trim());
            }
        } else if (e.key === 'Escape') {
            clearTrainSearch();
        }
    });
}

function filterTrains(query) {
    const q = query.toLowerCase();
    return TRAINS.filter(t =>
        t.name.toLowerCase().includes(q) ||
        t.number.includes(q)
    );
}

function renderSuggestions(matches, query) {
    if (matches.length === 0) {
        trainSuggestions.innerHTML = `<div style="padding:14px 16px; font-size:13px; color:var(--text-muted);">No trains found for "<strong>${escapeHtml(query)}</strong>"</div>`;
        trainSuggestions.classList.add('open');
        return;
    }
    trainSuggestions.innerHTML = matches.map(t => `
        <div class="suggestion-item" data-query="${escapeHtml(t.name)}" onclick="applySearch('${escapeHtml(t.name)}')">
            <div class="suggestion-icon"><i class="fa-solid fa-train"></i></div>
            <div>
                <div class="suggestion-name">${highlightMatch(t.name, query)} <span style="font-weight:400; color:var(--text-muted);">#${t.number}</span></div>
                <div class="suggestion-meta">${t.route} &nbsp;·&nbsp; ${t.runs}</div>
            </div>
        </div>
    `).join('');
    trainSuggestions.classList.add('open');
}

function highlightMatch(text, query) {
    if (!query) return escapeHtml(text);
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return escapeHtml(text);
    return escapeHtml(text.slice(0, idx))
        + `<mark style="background:#fed7aa; border-radius:2px; padding:0 1px; font-weight:700;">${escapeHtml(text.slice(idx, idx + query.length))}</mark>`
        + escapeHtml(text.slice(idx + query.length));
}

function applySearch(query) {
    if (!query) return;
    trainSearchInput.value = query;
    trainSearchClear.style.display = 'block';
    trainSuggestions.classList.remove('open');
    trainRecent.classList.remove('open');
    saveRecentTrain(query);
    applyHighlights(query);
}

function applyHighlights(query) {
    const q = query.toLowerCase().trim();
    if (!q) { clearSearchHighlights(); return; }

    let matchCount = 0;
    trainCards.forEach(card => {
        const name   = card.dataset.name || '';
        const number = card.dataset.number || '';
        const isMatch = name.toLowerCase().includes(q) || number.includes(q);

        card.classList.toggle('search-match', isMatch);
        card.classList.toggle('search-no-match', !isMatch);

        const badge = document.getElementById(`pin-${card.dataset.number}`);
        if (badge) badge.style.display = isMatch ? 'inline-flex' : 'none';

        // Highlight text in the card title
        const titleEl = card.querySelector('.train-name-text');
        if (titleEl) {
            if (isMatch) {
                titleEl.innerHTML = highlightMatch(name, q);
            } else {
                titleEl.textContent = name;
            }
        }

        if (isMatch) {
            matchCount++;
            // Scroll first matched card into view smoothly
            if (matchCount === 1) {
                setTimeout(() => card.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);
            }
        }
    });

    // Move matching cards to top
    const list = document.querySelector('.train-list');
    const allCards = [...list.querySelectorAll('.train-card')];
    allCards.filter(c => c.classList.contains('search-match'))
            .forEach(c => list.insertBefore(c, list.querySelector('.train-card')));

    // Update count and banner
    if (trainCountEl) trainCountEl.textContent = `(${matchCount} matched)`;
    if (searchStatusBanner) {
        searchStatusBanner.style.display = 'flex';
        searchStatusBanner.innerHTML = `
            <i class="fa-solid fa-train" style="color:var(--orange);"></i>
            Showing ${matchCount} result${matchCount !== 1 ? 's' : ''} for "<strong>${escapeHtml(query)}</strong>"
            &nbsp;— non-matching trains are dimmed.
            <button class="clear-search-btn" onclick="clearTrainSearch()">Clear ×</button>
        `;
    }
}

function clearSearchHighlights() {
    trainCards.forEach(card => {
        card.classList.remove('search-match', 'search-no-match');
        const badge = document.getElementById(`pin-${card.dataset.number}`);
        if (badge) badge.style.display = 'none';
        const titleEl = card.querySelector('.train-name-text');
        if (titleEl) titleEl.textContent = card.dataset.name || '';
    });
    if (trainCountEl) trainCountEl.textContent = `(${trainCards.length})`;
    if (searchStatusBanner) searchStatusBanner.style.display = 'none';
}

function clearTrainSearch() {
    if (!trainSearchInput) return;
    trainSearchInput.value = '';
    trainSearchClear.style.display = 'none';
    trainSuggestions.classList.remove('open');
    trainRecent.classList.remove('open');
    clearSearchHighlights();
}

function clearRecent() {
    clearRecentTrains();
    renderRecentPanel();
}

function renderRecentPanel() {
    const recentList = document.getElementById('recentList');
    if (!recentList) return;
    const recents = getRecentTrains();
    if (recents.length === 0) {
        recentList.innerHTML = `<div style="font-size:12px; color:var(--text-muted); padding: 4px 0;">No recent searches yet.</div>`;
        return;
    }
    recentList.innerHTML = recents.map(r => `
        <div class="recent-train-item" onclick="applySearch('${escapeHtml(r)}')">
            <i class="fa-solid fa-clock-rotate-left" style="color:var(--text-muted); font-size:12px; width:14px;"></i>
            <span>${escapeHtml(r)}</span>
        </div>
    `).join('');
}

// ============================================================
// 6. QUICK BOOK BY TRAIN NUMBER (sidebar on search results)
// ============================================================
function quickBook() {
    const input = document.getElementById('quickTrainNum');
    const errEl = document.getElementById('quickBookError');
    if (!input) return;
    const val = input.value.trim();
    const match = TRAINS.find(t => t.number === val || t.name.toLowerCase() === val.toLowerCase());
    if (!match) {
        errEl.style.display = 'block';
        errEl.textContent = `Train "${val}" not found on this route.`;
        return;
    }
    errEl.style.display = 'none';
    saveRecentTrain(match.name);
    // Scroll up and apply search
    if (trainSearchInput) {
        trainSearchInput.value = match.name;
        trainSearchClear.style.display = 'block';
        applyHighlights(match.name);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

// Save which train was booked (for recent history)
function bookTrain(number) {
    const t = TRAINS.find(t => t.number === number);
    if (t) saveRecentTrain(t.name);
}

// ============================================================
// 7. HOMEPAGE — Tab switching & autocomplete
// ============================================================
function switchHomeTab(tab) {
    const routePanel  = document.getElementById('routeSearchPanel');
    const numPanel    = document.getElementById('trainNumberPanel');
    const tabRoute    = document.getElementById('tabRoute');
    const tabNumber   = document.getElementById('tabNumber');
    if (!routePanel || !numPanel) return;

    if (tab === 'route') {
        routePanel.style.display  = '';
        numPanel.style.display    = 'none';
        tabRoute.classList.add('active');
        tabNumber.classList.remove('active');
    } else {
        routePanel.style.display  = 'none';
        numPanel.style.display    = '';
        tabRoute.classList.remove('active');
        tabNumber.classList.add('active');
        renderHomeRecentTrains();
    }
}

function homeTrainAutocomplete(value) {
    const suggestions = document.getElementById('homeTrainSuggestions');
    if (!suggestions) return;
    const q = value.trim();
    if (q.length === 0) { suggestions.classList.remove('open'); return; }
    const matches = filterTrains(q);
    if (matches.length === 0) { suggestions.classList.remove('open'); return; }
    suggestions.innerHTML = matches.map(t => `
        <div class="suggestion-item" onclick="selectHomeTrain('${escapeHtml(t.name)}')">
            <div class="suggestion-icon"><i class="fa-solid fa-train"></i></div>
            <div>
                <div class="suggestion-name">${highlightMatch(t.name, q)} <span style="font-weight:400;color:var(--text-muted);">#${t.number}</span></div>
                <div class="suggestion-meta">${t.route} &nbsp;·&nbsp; ${t.runs}</div>
            </div>
        </div>
    `).join('');
    suggestions.classList.add('open');
}

function selectHomeTrain(name) {
    const input = document.getElementById('homeTrainSearch');
    const suggestions = document.getElementById('homeTrainSuggestions');
    if (input) input.value = name;
    if (suggestions) suggestions.classList.remove('open');
}

function homeQuickSearch() {
    const input = document.getElementById('homeTrainSearch');
    if (!input) return;
    const val = input.value.trim();
    if (!val) return;
    saveRecentTrain(val);
    sessionStorage.setItem('irctc_pending_search', val);
    window.location.href = 'search-results.html';
}

function renderHomeRecentTrains() {
    const container = document.getElementById('homeRecentTrains');
    if (!container) return;
    const recents = getRecentTrains();
    if (recents.length === 0) { container.innerHTML = ''; return; }
    container.innerHTML = `
        <div class="home-recent-header">
            <i class="fa-solid fa-clock-rotate-left"></i> Recently searched
        </div>
        <div>
            ${recents.map(r => `<span class="home-recent-chip" onclick="selectHomeTrain('${escapeHtml(r)}')">${escapeHtml(r)}</span>`).join('')}
        </div>
    `;
}

// Outside click to close home suggestions
document.addEventListener('click', (e) => {
    const homeInput = document.getElementById('homeTrainSearch');
    const homeSugg  = document.getElementById('homeTrainSuggestions');
    if (homeInput && homeSugg && !homeInput.parentElement.contains(e.target)) {
        homeSugg.classList.remove('open');
    }
});

// ============================================================
// 8. AUTO-APPLY PENDING SEARCH (when navigating from homepage)
// ============================================================
window.addEventListener('DOMContentLoaded', () => {
    const pending = sessionStorage.getItem('irctc_pending_search');
    if (pending && trainSearchInput) {
        sessionStorage.removeItem('irctc_pending_search');
        setTimeout(() => {
            trainSearchInput.value = pending;
            trainSearchClear.style.display = 'block';
            applyHighlights(pending);
        }, 100);
    }
});

// ============================================================
// UTILITY
// ============================================================
function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}