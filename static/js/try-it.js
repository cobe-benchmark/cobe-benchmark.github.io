/**
 * "Try It Yourself" — lets anyone run a real CoBe scenario through their own
 * model: copy the prompt, paste the model's answer, then reveal the
 * evaluation criteria and an illustrative answer.
 */
(function () {
  'use strict';

  const EXAMPLES_URL = './eval-results/category-examples.json?v=20261008';

  // Per-model verdict chips come from an earlier (June 2026) evaluation run that
  // predates the current paper's judge and numbers, so they are hidden for now.
  // Set to true to show them again.
  const SHOW_MODEL_VERDICTS = false;

  const MODEL_LABELS = {
    gpt: 'GPT-5.4-Pro',
    gemini: 'Gemini-3.1-Pro',
    claude: 'Claude-Opus-4.7',
    'llama3-8b': 'Llama-3.1-8B',
    'mistral-7b': 'Mistral-7B',
    'qwen-7b': 'Qwen-2.5-7B',
    phi4: 'Phi-4',
    'gemma-27b': 'Gemma-2-27B',
    'llama3-70b': 'Llama-3.1-70B',
  };
  const MODEL_ORDER = ['gpt', 'gemini', 'claude', 'gemma-27b', 'llama3-70b', 'phi4', 'qwen-7b', 'mistral-7b', 'llama3-8b'];

  const el = {
    panel: document.getElementById('tryit-panel'),
    status: document.getElementById('tryit-status'),
    domainSelect: document.getElementById('tryit-domain'),
    counter: document.getElementById('tryit-counter'),
    prev: document.getElementById('tryit-prev'),
    next: document.getElementById('tryit-next'),
    shuffle: document.getElementById('tryit-shuffle'),
    scenario: document.getElementById('tryit-scenario'),
    query: document.getElementById('tryit-query'),
    copy: document.getElementById('tryit-copy'),
    reveal: document.getElementById('tryit-reveal'),
    answer: document.getElementById('tryit-answer'),
  };
  if (!el.panel) return;

  let data = null;
  let domains = [];
  let activeDomain = null;
  let list = [];
  let idx = 0;

  function esc(t) {
    const d = document.createElement('div');
    d.textContent = t == null ? '' : String(t);
    return d.innerHTML;
  }

  // CoBe prompts are conversational: the story followed by the edit request,
  // with no causal terminology or step-by-step instructions (paper Sec. 1).
  function promptText(ex) {
    return ex.original + '\n\n' + ex.query;
  }

  function setDomain(domain) {
    activeDomain = domain;
    list = (data[domain] || []).slice();
    idx = 0;
    renderExample();
  }

  function renderExample() {
    if (!list.length) return;
    const ex = list[idx];
    el.scenario.textContent = ex.original;
    el.query.textContent = ex.query;
    el.counter.textContent = idx + 1 + ' / ' + list.length;
    el.answer.hidden = true;
    el.reveal.innerHTML = SHOW_MODEL_VERDICTS
      ? '<span class="icon">🔍</span> Reveal evaluation criteria &amp; how models did'
      : '<span class="icon">🔍</span> Reveal evaluation criteria';
    el.copy.classList.remove('is-done');
    el.copy.innerHTML = '<span class="icon">📋</span> Copy prompt';
  }

  function step(delta) {
    idx = (idx + delta + list.length) % list.length;
    renderExample();
  }

  function criteriaHtml(title, cls, items) {
    if (!items || !items.length) return '';
    return (
      '<div class="criteria-block"><div class="ctitle ' + cls + '">' + title + '</div><ul>' +
      items.map((i) => '<li>' + esc(i) + '</li>').join('') +
      '</ul></div>'
    );
  }

  function verdictsHtml(ex) {
    if (!SHOW_MODEL_VERDICTS) return '';
    const outputs = ex.model_outputs || {};
    const ids = MODEL_ORDER.filter((id) => outputs[id]);
    if (!ids.length) return '';
    const chips = ids
      .map((id) => {
        const v = outputs[id].verdict;
        const cls = v === 'correct' ? 'is-correct' : v === 'wrong' ? 'is-wrong' : 'is-unknown';
        const mark = v === 'correct' ? '✓' : v === 'wrong' ? '✗' : '–';
        return (
          '<span class="mv-chip ' + cls + '"><span class="mv-mark">' + mark + '</span>' +
          esc(MODEL_LABELS[id] || id) + '</span>'
        );
      })
      .join('');
    return (
      '<div class="model-verdicts"><div class="mv-title">How benchmarked models handled this exact item</div>' +
      '<div class="mv-grid">' + chips + '</div></div>'
    );
  }

  function reveal() {
    const ex = list[idx];
    el.answer.innerHTML =
      '<div class="demo-box demo-box--gold"><div class="demo-label">✅ Illustrative answer (not scored)</div>' +
      esc(ex.gold_answer) + '</div>' +
      '<div class="demo-box demo-box--criteria"><div class="demo-label">📐 Evaluation criteria</div>' +
      criteriaHtml('Should NOT change:', 'keep', ex.should_not_change) +
      criteriaHtml('Should change:', 'change', ex.should_change) +
      '</div>' +
      verdictsHtml(ex);
    el.answer.hidden = false;
    el.answer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  async function copyPrompt() {
    const ex = list[idx];
    try {
      await navigator.clipboard.writeText(promptText(ex));
    } catch (e) {
      const ta = document.createElement('textarea');
      ta.value = promptText(ex);
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); } catch (_) {}
      document.body.removeChild(ta);
    }
    el.copy.classList.add('is-done');
    el.copy.innerHTML = '<span class="icon">✓</span> Copied — paste into your model';
  }

  function buildDomainOptions() {
    el.domainSelect.innerHTML = domains
      .map((d) => '<option value="' + esc(d) + '">' + esc(d) + '</option>')
      .join('');
  }

  async function init() {
    try {
      const res = await fetch(EXAMPLES_URL);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const json = await res.json();
      data = json.by_domain || {};
      domains = Object.keys(data).filter((d) => (data[d] || []).length);
      if (!domains.length) throw new Error('no examples');

      buildDomainOptions();
      activeDomain = domains[0];
      setDomain(activeDomain);

      el.domainSelect.addEventListener('change', () => setDomain(el.domainSelect.value));
      el.prev.addEventListener('click', () => step(-1));
      el.next.addEventListener('click', () => step(1));
      el.copy.addEventListener('click', copyPrompt);
      el.reveal.addEventListener('click', reveal);
      if (el.shuffle) {
        el.shuffle.addEventListener('click', () => {
          // deterministic-ish jump that still feels random across the set
          idx = (idx + 3) % list.length;
          renderExample();
        });
      }

      el.status.hidden = true;
      el.panel.hidden = false;
    } catch (err) {
      console.error('try-it:', err);
      if (el.status) {
        el.status.textContent =
          'Could not load examples. Serve the site over HTTP (e.g. python3 -m http.server).';
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
