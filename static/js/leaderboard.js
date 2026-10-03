/**
 * CoBe leaderboard — renders a sortable, filterable table from
 * eval-results/paper-results.json (Table 5: accuracy averaged across the three
 * query phrasings, ± std across phrasings).
 */
(function () {
  'use strict';

  const STATS_URL = './eval-results/paper-results.json';

  // Display metadata for each model id used in paper-results.json.
  const MODEL_META = {
    gpt:          { label: 'GPT-5.4-Pro',     org: 'OpenAI',          type: 'proprietary', params: '—' },
    gemini:       { label: 'Gemini-3.1-Pro',  org: 'Google DeepMind', type: 'proprietary', params: '—' },
    claude:       { label: 'Claude-Opus-4.7', org: 'Anthropic',       type: 'proprietary', params: '—' },
    'gemma-27b':  { label: 'Gemma-2-27B',     org: 'Google DeepMind', type: 'open',        params: '27B' },
    'llama3-70b': { label: 'Llama-3.1-70B',   org: 'Meta',            type: 'open',        params: '70B' },
    phi4:         { label: 'Phi-4',           org: 'Microsoft',       type: 'open',        params: '14B' },
    'qwen-7b':    { label: 'Qwen-2.5-7B',     org: 'Alibaba',         type: 'open',        params: '7B' },
    'mistral-7b': { label: 'Mistral-7B-v0.3', org: 'Mistral AI',      type: 'open',        params: '7B' },
    'llama3-8b':  { label: 'Llama-3.1-8B',    org: 'Meta',            type: 'open',        params: '8B' },
  };

  const tableBody = document.getElementById('leaderboard-body');
  const filterRoot = document.getElementById('lb-controls');
  const statusEl = document.getElementById('leaderboard-status');
  if (!tableBody) return;

  let rows = [];
  let filter = 'all';
  let sortKey = 'accuracy';
  let sortDir = 'desc';

  function pct(v) { return v.toFixed(2); }

  function applySortFilter() {
    let view = rows.slice();
    if (filter !== 'all') view = view.filter((r) => r.type === filter);
    view.sort((a, b) => {
      let cmp;
      if (sortKey === 'model') cmp = a.label.localeCompare(b.label);
      else if (sortKey === 'type') cmp = a.type.localeCompare(b.type);
      else cmp = a[sortKey] - b[sortKey];
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return view;
  }

  function render() {
    const view = applySortFilter();
    tableBody.innerHTML = view
      .map((r, i) => {
        // Bars use an absolute 0–100% scale so a full bar would mean a solved benchmark.
        const widthPct = Math.max(2, r.accuracy);
        const rankClass = sortKey === 'accuracy' && sortDir === 'desc' && i === 0 ? ' top1' : '';
        const medal = sortKey === 'accuracy' && sortDir === 'desc' && i === 0 ? '🥇' : i + 1;
        return (
          '<tr>' +
          '<td class="lb-rank' + rankClass + '">' + medal + '</td>' +
          '<td><div class="lb-model">' + r.label + '</div>' +
          '<div class="lb-org hide-sm">' + r.org + '</div></td>' +
          '<td class="hide-sm"><span class="lb-type ' + r.type + '">' +
          (r.type === 'proprietary' ? 'Proprietary' : 'Open') + '</span></td>' +
          '<td class="hide-sm">' + r.params + '</td>' +
          '<td class="lb-acc-cell"><div class="lb-acc-bar">' +
          '<div class="lb-acc-fill" style="width:' + widthPct + '%"></div></div></td>' +
          '<td><span class="lb-acc-val">' + pct(r.accuracy) + '%</span>' +
          '<span class="lb-acc-std">±' + pct(r.std) + '</span></td>' +
          '</tr>'
        );
      })
      .join('');

    document.querySelectorAll('.leaderboard thead th').forEach((th) => {
      const key = th.dataset.sort;
      th.classList.toggle('is-sorted', key === sortKey);
      const ind = th.querySelector('.sort-ind');
      if (ind) ind.textContent = key === sortKey ? (sortDir === 'asc' ? '▲' : '▼') : '↕';
    });
  }

  function setupSorting() {
    document.querySelectorAll('.leaderboard thead th.sortable').forEach((th) => {
      th.addEventListener('click', () => {
        const key = th.dataset.sort;
        if (key === sortKey) {
          sortDir = sortDir === 'asc' ? 'desc' : 'asc';
        } else {
          sortKey = key;
          sortDir = key === 'model' || key === 'type' ? 'asc' : 'desc';
        }
        render();
      });
    });
  }

  function setupFilters() {
    if (!filterRoot) return;
    filterRoot.querySelectorAll('.lb-filter').forEach((btn) => {
      btn.addEventListener('click', () => {
        filter = btn.dataset.filter;
        filterRoot.querySelectorAll('.lb-filter').forEach((b) =>
          b.classList.toggle('is-active', b === btn)
        );
        render();
      });
    });
  }

  async function init() {
    setupSorting();
    setupFilters();
    try {
      const res = await fetch(STATS_URL);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const stats = await res.json();
      rows = Object.entries(stats.overall)
        .filter(([id]) => MODEL_META[id])
        .map(([id, v]) => ({
          id,
          accuracy: v.accuracy,
          std: v.std,
          ...MODEL_META[id],
        }));
      if (statusEl) statusEl.hidden = true;
      render();
    } catch (err) {
      console.error('leaderboard:', err);
      if (statusEl) {
        statusEl.hidden = false;
        statusEl.textContent = 'Could not load leaderboard data. Serve the site over HTTP.';
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
