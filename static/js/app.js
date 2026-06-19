// State Management
let state = {
  releases: [],
  selectedUpdate: null,
  activeFilter: 'all',
  searchQuery: '',
  drafts: {} // Cache custom drafts by update id
};

// DOM Elements
const elements = {
  refreshBtn: document.getElementById('refresh-btn'),
  retryBtn: document.getElementById('retry-btn'),
  searchInput: document.getElementById('search-input'),
  clearSearchBtn: document.getElementById('clear-search'),
  filterPills: document.querySelectorAll('.filter-pill'),
  statCards: document.querySelectorAll('.stat-card'),
  timeline: document.getElementById('releases-timeline'),
  loadingState: document.getElementById('feed-loading'),
  errorState: document.getElementById('feed-error'),
  errorMessage: document.getElementById('error-message'),
  emptyState: document.getElementById('feed-empty'),
  connectionStatus: document.getElementById('connection-status'),
  
  // Stats
  statTotal: document.getElementById('stat-total'),
  statFeatures: document.getElementById('stat-features'),
  statAnnouncements: document.getElementById('stat-announcements'),
  statIssues: document.getElementById('stat-issues'),
  statDeprecated: document.getElementById('stat-deprecated'),
  
  // Composer
  composerEmpty: document.getElementById('composer-empty-state'),
  composerActive: document.getElementById('composer-active-state'),
  composerDate: document.getElementById('composer-date'),
  composerBadge: document.getElementById('composer-badge'),
  composerOriginalText: document.getElementById('composer-original-text'),
  tweetTextarea: document.getElementById('tweet-textarea'),
  charCounter: document.getElementById('char-counter'),
  resetTweetBtn: document.getElementById('reset-tweet-btn'),
  copyTweetBtn: document.getElementById('copy-tweet-btn'),
  tweetBtn: document.getElementById('tweet-btn'),

  // Toolbar extras
  themeToggle: document.getElementById('theme-toggle'),
  toggleTrack: document.getElementById('toggle-track'),
  exportCsvBtn: document.getElementById('export-csv-btn')
};

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  fetchReleases();
});

// Setup Event Listeners
function setupEventListeners() {
  // Refresh Button
  elements.refreshBtn.addEventListener('click', () => fetchReleases(true));
  elements.retryBtn.addEventListener('click', () => fetchReleases(true));
  
  // Search Input
  elements.searchInput.addEventListener('input', (e) => {
    state.searchQuery = e.target.value.toLowerCase().trim();
    elements.clearSearchBtn.style.display = state.searchQuery ? 'block' : 'none';
    renderTimeline();
  });
  
  elements.clearSearchBtn.addEventListener('click', () => {
    elements.searchInput.value = '';
    state.searchQuery = '';
    elements.clearSearchBtn.style.display = 'none';
    renderTimeline();
  });
  
  // Filter Pills
  elements.filterPills.forEach(pill => {
    pill.addEventListener('click', () => {
      elements.filterPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      state.activeFilter = pill.getAttribute('data-filter');
      renderTimeline();
    });
  });
  
  // Clickable Stat Cards for Quick Filtering
  elements.statCards.forEach(card => {
    card.addEventListener('click', () => {
      const type = card.getAttribute('data-type');
      let targetFilter = 'all';
      
      if (type === 'feature') targetFilter = 'Feature';
      else if (type === 'announcement') targetFilter = 'Announcement';
      else if (type === 'issue') targetFilter = 'Issue';
      else if (type === 'deprecated') targetFilter = 'Deprecated';
      
      // Update Filter Pill UI
      elements.filterPills.forEach(pill => {
        if (pill.getAttribute('data-filter') === targetFilter) {
          pill.classList.add('active');
        } else {
          pill.classList.remove('active');
        }
      });
      
      state.activeFilter = targetFilter;
      renderTimeline();
    });
  });
  
  // Composer: Textarea input char limit counting
  elements.tweetTextarea.addEventListener('input', (e) => {
    if (state.selectedUpdate) {
      const text = e.target.value;
      state.drafts[state.selectedUpdate.id] = text;
      updateCharCount(text);
      updateTweetLink(text);
    }
  });
  
  // Composer: Reset Draft
  elements.resetTweetBtn.addEventListener('click', () => {
    if (state.selectedUpdate) {
      const defaultText = state.selectedUpdate.tweet_text;
      elements.tweetTextarea.value = defaultText;
      state.drafts[state.selectedUpdate.id] = defaultText;
      updateCharCount(defaultText);
      updateTweetLink(defaultText);
    }
  });
  
  // Composer: Copy to Clipboard
  elements.copyTweetBtn.addEventListener('click', () => {
    const text = elements.tweetTextarea.value;
    navigator.clipboard.writeText(text).then(() => {
      // Temporary UI feedback
      const originalHtml = elements.copyTweetBtn.innerHTML;
      elements.copyTweetBtn.innerHTML = `
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg> Copied!
      `;
      elements.copyTweetBtn.classList.add('btn-success');
      setTimeout(() => {
        elements.copyTweetBtn.innerHTML = originalHtml;
        elements.copyTweetBtn.classList.remove('btn-success');
      }, 2000);
    }).catch(err => {
      console.error('Could not copy text: ', err);
    });
  });

  // Theme Toggle
  elements.themeToggle.addEventListener('click', () => {
    const isLight = document.body.classList.toggle('light-mode');
    elements.toggleTrack.classList.toggle('active', isLight);
    localStorage.setItem('bq-theme', isLight ? 'light' : 'dark');
  });

  // Restore saved theme preference
  if (localStorage.getItem('bq-theme') === 'light') {
    document.body.classList.add('light-mode');
    elements.toggleTrack.classList.add('active');
  }

  // Export CSV
  elements.exportCsvBtn.addEventListener('click', exportToCSV);
}

// Fetch Release Notes
async function fetchReleases(force = false) {
  setLoading(true);
  try {
    const url = `/api/releases${force ? '?refresh=true' : ''}`;
    const response = await fetch(url);
    const result = await response.json();
    
    if (result.success) {
      state.releases = result.data;
      updateStats();
      renderTimeline();
      
      // Update status dot/text
      if (result.source === 'cache_fallback') {
        setStatus('error', result.warning || 'Refresh failed, serving cache');
      } else {
        setStatus('success', force ? 'Refreshed' : 'Connected');
      }
    } else {
      showError(result.error || 'Server error occurred');
    }
  } catch (err) {
    showError(err.message || 'Network connection failed');
  } finally {
    setLoading(false);
  }
}

// Set UI Loading State
function setLoading(isLoading) {
  if (isLoading) {
    elements.loadingState.style.display = 'block';
    elements.timeline.style.display = 'none';
    elements.errorState.style.display = 'none';
    elements.emptyState.style.display = 'none';
    elements.refreshBtn.disabled = true;
    elements.refreshBtn.querySelector('.spinner-icon').classList.add('spinning');
    setStatus('loading', 'Fetching updates...');
  } else {
    elements.loadingState.style.display = 'none';
    elements.refreshBtn.disabled = false;
    elements.refreshBtn.querySelector('.spinner-icon').classList.remove('spinning');
  }
}

// Show Error UI State
function showError(msg) {
  elements.errorMessage.textContent = msg;
  elements.errorState.style.display = 'flex';
  elements.timeline.style.display = 'none';
  elements.emptyState.style.display = 'none';
  elements.loadingState.style.display = 'none';
  setStatus('error', 'Sync Failed');
}

// Update Status Bar indicator
function setStatus(type, text) {
  elements.connectionStatus.className = `status-indicator ${type}`;
  elements.connectionStatus.querySelector('.status-text').textContent = text;
}

// Calculate and render Stats Bar details
function updateStats() {
  let counts = {
    total: 0,
    Feature: 0,
    Announcement: 0,
    Issue: 0,
    Deprecated: 0
  };
  
  state.releases.forEach(entry => {
    entry.updates.forEach(u => {
      counts.total++;
      if (counts.hasOwnProperty(u.type)) {
        counts[u.type]++;
      }
    });
  });
  
  elements.statTotal.textContent = counts.total;
  elements.statFeatures.textContent = counts.Feature;
  elements.statAnnouncements.textContent = counts.Announcement;
  elements.statIssues.textContent = counts.Issue;
  elements.statDeprecated.textContent = counts.Deprecated;
}

// Filter and render timeline entries
function renderTimeline() {
  elements.timeline.innerHTML = '';
  let visibleEntriesCount = 0;
  
  state.releases.forEach(entry => {
    // Filter updates inside this entry
    const filteredUpdates = entry.updates.filter(update => {
      // Type Filter
      const matchesType = (state.activeFilter === 'all' || update.type === state.activeFilter);
      
      // Keyword Search Filter
      const matchesSearch = (!state.searchQuery || 
        update.type.toLowerCase().includes(state.searchQuery) ||
        update.text.toLowerCase().includes(state.searchQuery) ||
        entry.date.toLowerCase().includes(state.searchQuery)
      );
      
      return matchesType && matchesSearch;
    });
    
    if (filteredUpdates.length > 0) {
      visibleEntriesCount++;
      
      // Create Date block wrapper
      const dateBlock = document.createElement('div');
      dateBlock.className = 'date-block';
      
      // Create Date header
      const dateHeader = document.createElement('div');
      dateHeader.className = 'date-header';
      dateHeader.innerHTML = `
        <h3 class="date-title">${entry.date}</h3>
        <div class="date-line"></div>
      `;
      dateBlock.appendChild(dateHeader);
      
      // Append individual updates
      filteredUpdates.forEach(update => {
        const updateCard = document.createElement('div');
        updateCard.className = 'update-card';
        if (state.selectedUpdate && state.selectedUpdate.id === update.id) {
          updateCard.classList.add('selected');
        }
        
        // Add event listener to select the card
        updateCard.addEventListener('click', (e) => {
          // If clicked the inline social actions, prevent card selection
          if (e.target.closest('.card-actions-inline')) return;
          
          selectUpdate(update, entry.date);
          
          // Re-render timeline to update selection class
          document.querySelectorAll('.update-card').forEach(c => c.classList.remove('selected'));
          updateCard.classList.add('selected');
        });
        
        // Build card HTML
        updateCard.innerHTML = `
          <div class="card-selector-area">
            <div class="checkbox-custom"></div>
          </div>
          <div class="card-main-content">
            <div class="card-top">
              <span class="badge badge-${update.type}">${update.type}</span>
              <div class="card-actions-inline">
                <button class="btn-icon-only copy-action" title="Copy update text to clipboard">
                  <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                  </svg>
                </button>
                <button class="btn-icon-only link-action" title="View Source Release Note" onclick="window.open('${entry.link}', '_blank')">
                  <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                    <polyline points="15 3 21 3 21 9"></polyline>
                    <line x1="10" y1="14" x2="21" y2="3"></line>
                  </svg>
                </button>
                <button class="btn-icon-only twitter-action" title="Compose Tweet for this Update">
                  <svg class="icon fill-icon" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" fill="currentColor"/>
                  </svg>
                </button>
              </div>
            </div>
            <div class="release-body">${update.html}</div>
          </div>
        `;
        
        // Wire up per-card copy button
        const copyBtn = updateCard.querySelector('.copy-action');
        copyBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          navigator.clipboard.writeText(update.text).then(() => {
            copyBtn.classList.add('copied');
            const origHTML = copyBtn.innerHTML;
            copyBtn.innerHTML = `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
            setTimeout(() => {
              copyBtn.innerHTML = origHTML;
              copyBtn.classList.remove('copied');
            }, 1800);
          }).catch(() => {});
        });

        // Add event listener to Twitter inline action
        const twBtn = updateCard.querySelector('.twitter-action');
        twBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          selectUpdate(update, entry.date);
          
          document.querySelectorAll('.update-card').forEach(c => c.classList.remove('selected'));
          updateCard.classList.add('selected');
          
          // Scroll composer into view if on mobile
          if (window.innerWidth <= 968) {
            elements.composerActive.scrollIntoView({ behavior: 'smooth' });
          }
        });
        
        dateBlock.appendChild(updateCard);
      });
      
      elements.timeline.appendChild(dateBlock);
    }
  });
  
  // Show empty state if no matching updates
  if (visibleEntriesCount === 0) {
    elements.timeline.style.display = 'none';
    elements.emptyState.style.display = 'flex';
  } else {
    elements.timeline.style.display = 'flex';
    elements.emptyState.style.display = 'none';
  }
}

// Select Update and load into Composer
function selectUpdate(update, date) {
  state.selectedUpdate = update;
  
  // Toggle UI visibility
  elements.composerEmpty.style.display = 'none';
  elements.composerActive.style.display = 'flex';
  
  // Populate composer details
  elements.composerDate.textContent = date;
  elements.composerBadge.className = `badge badge-${update.type}`;
  elements.composerBadge.textContent = update.type;
  elements.composerOriginalText.textContent = update.text;
  
  // Populate draft textarea: use custom cached draft or the default text
  const currentDraft = state.drafts.hasOwnProperty(update.id) ? state.drafts[update.id] : update.tweet_text;
  elements.tweetTextarea.value = currentDraft;
  state.drafts[update.id] = currentDraft;
  
  updateCharCount(currentDraft);
  updateTweetLink(currentDraft);
}

// Update character counter UI
function updateCharCount(text) {
  // Twitter counts any URL as exactly 23 characters
  const urlRegex = /https?:\/\/[^\s]+/g;
  const twitterText = text.replace(urlRegex, "".padStart(23, "x"));
  const count = twitterText.length;
  elements.charCounter.textContent = `${count} / 280`;
  
  elements.charCounter.className = 'char-counter';
  if (count > 250 && count <= 280) {
    elements.charCounter.classList.add('warning');
  } else if (count > 280) {
    elements.charCounter.classList.add('danger');
  }
}

// Update Tweet share link
function updateTweetLink(text) {
  const urlRegex = /https?:\/\/[^\s]+/g;
  const twitterText = text.replace(urlRegex, "".padStart(23, "x"));
  
  if (twitterText.length > 280 || text.trim() === '') {
    elements.tweetBtn.classList.add('disabled');
    elements.tweetBtn.removeAttribute('href');
    elements.tweetBtn.style.pointerEvents = 'none';
  } else {
    elements.tweetBtn.classList.remove('disabled');
    elements.tweetBtn.style.pointerEvents = 'auto';
    elements.tweetBtn.setAttribute('href', `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`);
  }
}

// Export currently visible (filtered) updates to a CSV file
function exportToCSV() {
  const rows = [['Date', 'Type', 'Text', 'Link', 'Tweet Text']];

  state.releases.forEach(entry => {
    const filteredUpdates = entry.updates.filter(update => {
      const matchesType = (state.activeFilter === 'all' || update.type === state.activeFilter);
      const matchesSearch = (!state.searchQuery ||
        update.type.toLowerCase().includes(state.searchQuery) ||
        update.text.toLowerCase().includes(state.searchQuery) ||
        entry.date.toLowerCase().includes(state.searchQuery)
      );
      return matchesType && matchesSearch;
    });

    filteredUpdates.forEach(update => {
      rows.push([
        entry.date,
        update.type,
        update.text,
        entry.link,
        update.tweet_text
      ]);
    });
  });

  if (rows.length === 1) {
    alert('No visible updates to export. Adjust your filters first.');
    return;
  }

  // Build CSV string — escape fields containing commas/quotes/newlines
  const csvEscape = (val) => {
    const str = String(val ?? '').replace(/"/g, '""');
    return /[",\n\r]/.test(str) ? `"${str}"` : str;
  };

  const csvContent = rows.map(r => r.map(csvEscape).join(',')).join('\r\n');
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  const timestamp = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `bq-release-notes-${timestamp}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  // Visual feedback on the button
  const btn = elements.exportCsvBtn;
  const orig = btn.innerHTML;
  btn.innerHTML = `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> Exported!`;
  btn.classList.add('btn-success');
  setTimeout(() => {
    btn.innerHTML = orig;
    btn.classList.remove('btn-success');
  }, 2000);
}
