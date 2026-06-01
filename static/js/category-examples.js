/**
 * Expandable representative examples for domain / graph-type categories.
 */
(function (global) {
  'use strict';

  const EXAMPLES_URL = './eval-results/category-examples.json';

  let examplesData = null;
  let panelEl = null;
  let titleEl = null;
  let counterEl = null;
  let bodyEl = null;
  let prevBtn = null;
  let nextBtn = null;

  let activeGroup = null;
  let activeCategory = null;
  let exampleIndex = 0;
  let selectedModel = 'gpt';

  let modelOrder = [];
  let modelLabelFn = (id) => id;

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text == null ? '' : String(text);
    return div.innerHTML;
  }

  function trimModelOutput(text) {
    if (text == null || text === '') return '';
    return String(text).replace(/^\s+/, '').replace(/\s+$/, '');
  }

  function formatModelOutput(text) {
    const trimmed = trimModelOutput(text);
    return trimmed || '(No output recorded)';
  }

  function getExamples() {
    if (!examplesData || !activeGroup || !activeCategory) return [];
    const bucket = examplesData[activeGroup];
    return bucket && bucket[activeCategory] ? bucket[activeCategory] : [];
  }

  function configureModels(order, labelFn) {
    modelOrder = order || [];
    modelLabelFn = labelFn || ((id) => id);
  }

  function bindDom() {
    panelEl = document.getElementById('category-example-panel');
    titleEl = document.getElementById('category-example-title');
    counterEl = document.getElementById('category-example-counter');
    bodyEl = document.getElementById('category-example-body');
    prevBtn = document.getElementById('category-example-prev');
    nextBtn = document.getElementById('category-example-next');

    if (prevBtn) {
      prevBtn.addEventListener('click', () => stepExample(-1));
    }
    if (nextBtn) {
      nextBtn.addEventListener('click', () => stepExample(1));
    }
  }

  function isOpen() {
    return panelEl && !panelEl.hidden && activeCategory != null;
  }

  function hide() {
    activeGroup = null;
    activeCategory = null;
    exampleIndex = 0;
    if (!panelEl) return;
    panelEl.hidden = true;
    panelEl.setAttribute('aria-hidden', 'true');
  }

  function defaultModelForExample(example) {
    if (!example || !example.model_outputs) return modelOrder[0] || 'gpt';
    if (example.model_outputs.gpt) return 'gpt';
    for (const id of modelOrder) {
      if (example.model_outputs[id]) return id;
    }
    return Object.keys(example.model_outputs)[0];
  }

  function show(groupKey, categoryName) {
    if (!panelEl || !examplesData) return;

    const list = examplesData[groupKey] && examplesData[groupKey][categoryName];
    if (!list || !list.length) return;

    const same =
      activeGroup === groupKey && activeCategory === categoryName && !panelEl.hidden;
    if (same) {
      hide();
      return;
    }

    activeGroup = groupKey;
    activeCategory = categoryName;
    exampleIndex = 0;

    panelEl.hidden = false;
    panelEl.setAttribute('aria-hidden', 'false');
    if (titleEl) titleEl.textContent = categoryName;

    const example = list[0];
    selectedModel = defaultModelForExample(example);
    renderExample();
    panelEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function stepExample(delta) {
    const list = getExamples();
    if (!list.length) return;
    exampleIndex = (exampleIndex + delta + list.length) % list.length;
    const example = list[exampleIndex];
    selectedModel = defaultModelForExample(example);
    renderExample();
  }

  function renderCriteriaList(items) {
    if (!items || !items.length) return '<p class="example-box-text">—</p>';
    return (
      '<ul class="example-criteria-list">' +
      items.map((item) => '<li>' + escapeHtml(item) + '</li>').join('') +
      '</ul>'
    );
  }

  function renderModelToggles(example, activeId) {
    const outputs = example.model_outputs || {};
    const ids = modelOrder.filter((id) => outputs[id]);
    return (
      '<div class="example-model-toggles" role="tablist" aria-label="Model outputs">' +
      ids
        .map(
          (id) =>
            '<button type="button" class="example-model-toggle' +
            (id === activeId ? ' is-active' : '') +
            '" role="tab" data-model="' +
            escapeHtml(id) +
            '" aria-selected="' +
            (id === activeId) +
            '">' +
            escapeHtml(modelLabelFn(id)) +
            '</button>'
        )
        .join('') +
      '</div>'
    );
  }

  function verdictClass(verdict) {
    if (verdict === 'correct') return 'is-correct';
    if (verdict === 'wrong') return 'is-wrong';
    return 'is-unknown';
  }

  function verdictIconHtml(verdict) {
    if (verdict === 'correct') {
      return (
        '<span class="example-verdict-icon example-verdict-icon--correct" aria-hidden="true">' +
        '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">' +
        '<path d="M6 12.5L10 16.5L18 7.5" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>' +
        '</svg></span>'
      );
    }
    if (verdict === 'wrong') {
      return (
        '<span class="example-verdict-icon example-verdict-icon--wrong" aria-hidden="true">' +
        '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">' +
        '<path d="M7 7L17 17M17 7L7 17" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>' +
        '</svg></span>'
      );
    }
    return '';
  }

  function applyOutputVerdict(boxEl, row) {
    if (!boxEl || !row) return;
    boxEl.classList.remove('is-correct', 'is-wrong', 'is-unknown');
    boxEl.classList.add(verdictClass(row.verdict));
    const iconSlot = boxEl.querySelector('.example-verdict-icon-slot');
    if (iconSlot) {
      iconSlot.innerHTML = verdictIconHtml(row.verdict);
    }
  }

  function renderExample() {
    const list = getExamples();
    if (!bodyEl || !list.length) return;

    const example = list[exampleIndex];
    const outputs = example.model_outputs || {};
    if (!outputs[selectedModel]) {
      selectedModel = defaultModelForExample(example);
    }
    const out = outputs[selectedModel] || { response: '', verdict: 'unknown' };

    if (counterEl) {
      counterEl.textContent = exampleIndex + 1 + ' / ' + list.length;
    }

    bodyEl.innerHTML =
      '<div class="example-box example-box--scenario">' +
      '<div class="example-box-label">Example</div>' +
      '<div class="example-box-text">' +
      escapeHtml(example.original) +
      '</div></div>' +
      '<div class="example-box example-box--query">' +
      '<div class="example-box-label">Query</div>' +
      '<div class="example-box-text">' +
      escapeHtml(example.query) +
      '</div></div>' +
      '<div class="example-box example-box--output ' +
      verdictClass(out.verdict) +
      '" id="example-output-box">' +
      '<span class="example-verdict-icon-slot">' +
      verdictIconHtml(out.verdict) +
      '</span>' +
      '<div class="example-box-label">Model Output</div>' +
      renderModelToggles(example, selectedModel) +
      '<div class="example-box-text" id="example-output-text">' +
      escapeHtml(formatModelOutput(out.response)) +
      '</div></div>' +
      '<div class="example-box example-box--gold">' +
      '<div class="example-box-label">Sample Representative Answer</div>' +
      '<div class="example-box-text">' +
      escapeHtml(example.gold_answer) +
      '</div></div>' +
      '<div class="example-box example-box--criteria">' +
      '<div class="example-box-label">Evaluation Criteria</div>' +
      '<p class="example-box-text" style="margin:0 0 0.35rem;font-weight:600;">Should Not Change:</p>' +
      renderCriteriaList(example.should_not_change) +
      '<p class="example-box-text" style="margin:0.5rem 0 0.35rem;font-weight:600;">Should Change:</p>' +
      renderCriteriaList(example.should_change) +
      '</div>';

    bodyEl.querySelectorAll('.example-model-toggle').forEach((btn) => {
      btn.addEventListener('click', () => {
        selectedModel = btn.dataset.model;
        bodyEl.querySelectorAll('.example-model-toggle').forEach((b) => {
          const on = b.dataset.model === selectedModel;
          b.classList.toggle('is-active', on);
          b.setAttribute('aria-selected', on ? 'true' : 'false');
        });
        const row = outputs[selectedModel];
        const textEl = document.getElementById('example-output-text');
        const boxEl = document.getElementById('example-output-box');
        if (textEl && row) {
          textEl.textContent = formatModelOutput(row.response);
        }
        if (boxEl && row) {
          applyOutputVerdict(boxEl, row);
        }
      });
    });
  }

  async function load() {
    bindDom();
    try {
      const res = await fetch(EXAMPLES_URL);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      examplesData = await res.json();
      return examplesData;
    } catch (err) {
      console.warn('category-examples: could not load', err);
      examplesData = null;
      return null;
    }
  }

  global.CategoryExamples = {
    load,
    configureModels,
    show,
    hide,
    isOpen,
  };
})(typeof window !== 'undefined' ? window : global);
