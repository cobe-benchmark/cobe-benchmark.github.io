/**
 * Interactive results chart — the paper's numbers, sliced by causal graph type,
 * query phrasing, evaluation criterion and qualitative failure pattern.
 * Reads eval-results/paper-results.json (values from the ICLR 2027 draft).
 */
(function () {
  'use strict';

  const DATA_URL = './eval-results/paper-results.json';

  // The earlier (June 2026) evaluation run in eval-statistics.json /
  // category-examples.json predates the current paper: different numbers and an
  // older domain taxonomy. Its per-domain view and the click-a-label example
  // explorer are kept but switched off; set to true to bring them back.
  const SHOW_LEGACY_VIEWS = false;
  const LEGACY_STATS_URL = './eval-results/eval-statistics.json';

  /** Fixed display order and colors (matches paper figures). */
  const MODEL_ORDER = [
    'gpt',
    'gemini',
    'claude',
    'llama3-8b',
    'mistral-7b',
    'qwen-7b',
    'phi4',
    'gemma-27b',
    'llama3-70b',
  ];

  const MODEL_LABELS = {
    gpt: 'GPT-5.4-Pro',
    gemini: 'Gemini-3.1-Pro',
    claude: 'Claude-Opus-4.7',
    'llama3-8b': 'Llama-3.1-8B',
    'mistral-7b': 'Mistral-7B-v0.3',
    'qwen-7b': 'Qwen-2.5-7B',
    phi4: 'Phi-4',
    'gemma-27b': 'Gemma-2-27B',
    'llama3-70b': 'Llama-3.1-70B',
  };

  const MODEL_COLORS = {
    gpt: '#4472c4',
    gemini: '#ed7d31',
    claude: '#70ad47',
    'llama3-8b': '#c00000',
    'mistral-7b': '#7030a0',
    'qwen-7b': '#843c0c',
    phi4: '#e377c2',
    'gemma-27b': '#7f7f7f',
    'llama3-70b': '#bcbd22',
  };

  /** X-axis label lines per category key (Chart.js ignores \n in default ticks). */
  const CATEGORY_LINES = {
    // Graph types. The data keeps the paper's "Hydrid" key, which the diagram module also uses.
    'Chain-like': ['Chain-like'],
    'Collider-like': ['Collider-like'],
    Correlated: ['Correlated'],
    'Diamond-like': ['Diamond-like'],
    'Fork-like': ['Fork-like'],
    Hydrid: ['Hybrid'],
    // Query phrasings (Sec. 3).
    A: ['A', 'Rewrite the original text…'],
    B: ['B', 'Based on the preceding text…'],
    C: ['C', 'Rewrite the above passage…'],
    // Evaluation criteria (Fig. 6).
    upstream: ['Edits unaffected', 'facts (E1)'],
    downstream: ['Misses required', 'changes (E2)'],
    connectors: ['Wrong', 'connectors'],
    numeric: ['Numeric', 'direction'],
    latent: ['Latent', 'factors'],
    // Qualitative failure patterns (App. C, Fig. 9).
    i: ['(i) Unchanged', 'reason'],
    ii: ['(ii) Background', 'rationalized'],
    iii: ['(iii) Stale', 'consequence'],
    iv: ['(iv) Physical /', 'quantitative'],
    v: ['(v) Spatial', 'consequence'],
    vi: ['(vi) Unsupported', 'connector'],
    vii: ['(vii) Historical', 'fact changed'],
    // Legacy domain taxonomy (earlier run).
    'Health and Medicine': ['Health and', 'Medicine'],
    Engineering: ['Engineering'],
    'History, Geography and Agriculture': ['History, Geography', 'and Agriculture'],
    'Economics and Finance': ['Economics and', 'Finance'],
    'Arts, Music and Entertainment': ['Arts, Music', 'and Entertainment'],
    'Science and Technology': ['Science and', 'Technology'],
    'Human Activities and Behavior': ['Human Activities', 'and Behavior'],
  };

  const VIEWS = [
    {
      id: 'aggregated',
      label: 'Overall',
      caption:
        'Accuracy averaged across the three query phrasings (Table 5); whiskers show ± one standard ' +
        'deviation across phrasings. A response counts as correct only if it passes every check.',
    },
    {
      id: 'graph',
      label: 'Graph type',
      key: 'by_graph',
      axisTitle: 'Causal graph type',
      caption:
        'Accuracy by the causal structure behind each story (Fig. 7). Correlated graphs are the hardest for almost ' +
        'every model, which read correlation as causation; diamond-like graphs, and to a lesser extent fork-like ' +
        'and hybrid ones, also trail. Hover a label to see its graph.',
    },
    {
      id: 'query',
      label: 'Query phrasing',
      key: 'by_query',
      axisTitle: 'Query phrasing',
      caption:
        'Accuracy for each of the three conversational phrasings of the same request (Fig. 8). The differences ' +
        'are small, so the failures are not an artifact of one wording.',
    },
    {
      id: 'criterion',
      label: 'Error type',
      key: 'by_criterion',
      axisTitle: 'Evaluation criterion',
      caption:
        'Failure rate per evaluation criterion (Fig. 6), so lower is better. Of the three checks, editing facts that ' +
        'should stay fixed (E1) is the most common failure for every model. “Numeric direction” and “latent factors” ' +
        'are sub-types: a wrong direction for a numerical change, and a hidden background factor not kept invariant.',
    },
    {
      id: 'mode',
      label: 'Failure pattern',
      key: 'by_failure_mode',
      axisTitle: 'Qualitative failure pattern',
      caption:
        'Accuracy across the fine-grained failure modes defined in App. C (Fig. 9); see the error-type ' +
        'explorer below for a worked example of each. On average, rationalized background facts (ii) and ' +
        'physical or quantitative constraints (iv) are the hardest.',
    },
    {
      id: 'domain',
      label: 'Domain (earlier run)',
      key: 'by_domain',
      legacy: true,
      axisTitle: 'Domain category',
      caption: 'Accuracy by domain from an earlier evaluation run that predates the current paper.',
    },
  ].filter((v) => SHOW_LEGACY_VIEWS || !v.legacy);

  let data = null;
  let legacy = null;
  let chart = null;
  let currentView = 'aggregated';

  const canvas = document.getElementById('results-chart');
  const legendEl = document.getElementById('results-legend');
  const captionEl = document.getElementById('results-caption');
  const toggleRoot = document.getElementById('results-view-toggle');
  const loadingEl = document.getElementById('results-chart-loading');
  const errorEl = document.getElementById('results-chart-error');
  const panelEl = document.getElementById('results-chart-panel');
  const graphPopover = document.getElementById('graph-type-popover');
  const graphPopoverTitle = document.getElementById('graph-type-popover-title');
  const graphPopoverBody = document.getElementById('graph-type-popover-body');
  let hoveredGraphIndex = -1;

  function modelLabel(id) {
    return MODEL_LABELS[id] || id;
  }

  function categoryLines(key) {
    return CATEGORY_LINES[key] || [key];
  }

  function viewById(id) {
    return VIEWS.find((v) => v.id === id);
  }

  function orderedModels(available) {
    const set = new Set(available);
    return MODEL_ORDER.filter((m) => set.has(m));
  }

  /** Bucket of { metric, categories, values: { category: { model: pct } } } for a grouped view. */
  function bucketFor(view) {
    if (!view || !view.key) return null;
    const source = view.legacy ? legacy : data;
    return source ? source[view.key] || null : null;
  }

  function isFailureMetric(view) {
    const bucket = bucketFor(view);
    return !!bucket && bucket.metric === 'failure_rate';
  }

  /** Example explorer (category-examples.js) only has items for the earlier run. */
  function examplesEnabled(view) {
    return (
      SHOW_LEGACY_VIEWS &&
      typeof CategoryExamples !== 'undefined' &&
      !!view &&
      (view.key === 'by_domain' || view.key === 'by_graph')
    );
  }

  /** Converts the legacy eval-statistics.json layout into the grouped-bucket shape. */
  function legacyBucket(stats, groupKey, categoryList) {
    const values = {};
    categoryList.forEach((cat) => {
      const row = stats[groupKey][cat];
      if (!row) return;
      values[cat] = {};
      Object.keys(row).forEach((m) => {
        if (row[m] && row[m].accuracy != null) values[cat][m] = row[m].accuracy * 100;
      });
    });
    return { metric: 'accuracy', categories: Object.keys(values), values };
  }

  function buildToggleButtons() {
    toggleRoot.innerHTML = '';
    VIEWS.forEach(({ id, label }) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'toggle-btn' + (id === currentView ? ' is-active' : '');
      btn.textContent = label;
      btn.dataset.view = id;
      btn.addEventListener('click', () => setView(id));
      toggleRoot.appendChild(btn);
    });
  }

  function setView(viewId) {
    if (!data || viewId === currentView) return;
    currentView = viewId;
    hideGraphPopover();
    if (typeof CategoryExamples !== 'undefined') {
      CategoryExamples.hide();
    }
    toggleRoot.querySelectorAll('.toggle-btn').forEach((btn) => {
      btn.classList.toggle('is-active', btn.dataset.view === viewId);
    });
    renderChart();
  }

  function hideGraphPopover() {
    hoveredGraphIndex = -1;
    if (!graphPopover) return;
    graphPopover.classList.remove('is-visible');
    graphPopover.hidden = true;
    graphPopover.setAttribute('aria-hidden', 'true');
    delete graphPopover.dataset.graphType;
  }

  function positionGraphPopover(event) {
    if (!graphPopover || !event) return;

    const wrap = canvas && canvas.closest('.results-chart-wrap');
    if (!wrap) return;

    const rect = wrap.getBoundingClientRect();
    const offset = 14;
    let left = event.clientX - rect.left + offset;
    let top = event.clientY - rect.top + offset;

    graphPopover.hidden = false;
    graphPopover.classList.add('is-visible');
    graphPopover.setAttribute('aria-hidden', 'false');

    const popRect = graphPopover.getBoundingClientRect();
    const maxLeft = rect.width - popRect.width - 8;
    const maxTop = rect.height - popRect.height - 8;
    left = Math.max(8, Math.min(left, maxLeft));
    top = Math.max(8, Math.min(top, maxTop));

    graphPopover.style.left = left + 'px';
    graphPopover.style.top = top + 'px';
  }

  function showGraphPopover(graphType, event) {
    if (
      !graphPopover ||
      !graphPopoverTitle ||
      !graphPopoverBody ||
      !chart ||
      typeof GraphTypeDiagrams === 'undefined'
    ) {
      return;
    }

    const svg = GraphTypeDiagrams.getSvg(graphType);
    if (!svg) {
      hideGraphPopover();
      return;
    }

    if (graphPopover.dataset.graphType !== graphType) {
      graphPopoverTitle.textContent = categoryLines(graphType).join(' ');
      graphPopoverBody.innerHTML = svg;
      graphPopover.dataset.graphType = graphType;
    }

    positionGraphPopover(event);
  }

  function groupedRawLabels() {
    const bucket = bucketFor(viewById(currentView));
    return bucket ? bucket.categories.filter((cat) => bucket.values[cat]) : [];
  }

  function groupedLabelIndexAtEvent(event) {
    if (!chart || currentView === 'aggregated') return -1;

    const pos = Chart.helpers.getRelativePosition(event, chart);
    const scale = chart.scales.x;
    const labels = chart.data.labels || [];
    if (!labels.length) return -1;

    const maxLines = maxLabelLines(labels);
    const labelsTop = scale.bottom + GROUPED_LABEL_GAP_AXIS;
    const labelsBottom = labelsTop + maxLines * MULTILINE_LINE_HEIGHT;

    if (
      pos.y < labelsTop - GRAPH_LABEL_HIT_PAD_Y ||
      pos.y > labelsBottom + GRAPH_LABEL_HIT_PAD_Y
    ) {
      return -1;
    }

    const ctx = chart.ctx;
    const fontSize = GROUPED_TICK_FONT.size;
    const fontFamily = GROUPED_TICK_FONT.family;
    ctx.save();
    ctx.font = `400 ${fontSize}px ${fontFamily}`;

    for (let i = 0; i < labels.length; i++) {
      const tickX = scale.getPixelForTick(i);
      const lines = String(labels[i]).split('\n');
      let maxW = 0;
      lines.forEach((line) => {
        maxW = Math.max(maxW, ctx.measureText(line).width);
      });
      const halfW = maxW / 2 + GRAPH_LABEL_HIT_PAD_X;
      if (pos.x >= tickX - halfW && pos.x <= tickX + halfW) {
        ctx.restore();
        return i;
      }
    }

    ctx.restore();
    return -1;
  }

  function updateGroupedLabelCursor(event) {
    if (!canvas) return;
    const view = viewById(currentView);
    const interactive = examplesEnabled(view) || view.id === 'graph';
    const index = interactive ? groupedLabelIndexAtEvent(event) : -1;
    canvas.style.cursor = index >= 0 && examplesEnabled(view) ? 'pointer' : 'default';
  }

  function onChartMouseMove(event) {
    updateGroupedLabelCursor(event);

    if (currentView !== 'graph') {
      hideGraphPopover();
      return;
    }

    const index = groupedLabelIndexAtEvent(event);
    if (index < 0) {
      hideGraphPopover();
      return;
    }

    const rawLabels = groupedRawLabels();
    const graphType = rawLabels[index];
    if (!graphType || !GraphTypeDiagrams.has(graphType)) {
      hideGraphPopover();
      return;
    }

    const nativeEvent = event.native || event;
    if (index !== hoveredGraphIndex) {
      hoveredGraphIndex = index;
      showGraphPopover(graphType, nativeEvent);
    } else {
      positionGraphPopover(nativeEvent);
    }
  }

  function onChartClick(event) {
    const view = viewById(currentView);
    if (!examplesEnabled(view)) return;

    const index = groupedLabelIndexAtEvent(event);
    if (index < 0) return;

    hideGraphPopover();

    const categoryName = groupedRawLabels()[index];
    if (categoryName) {
      CategoryExamples.show(view.key, categoryName);
    }
  }

  function setupChartInteraction() {
    if (!canvas) return;

    const grouped = currentView !== 'aggregated';
    canvas.onmousemove = grouped ? onChartMouseMove : null;
    canvas.onmouseleave = grouped
      ? () => {
          hideGraphPopover();
          canvas.style.cursor = 'default';
        }
      : null;
    canvas.onclick = grouped ? onChartClick : null;

    if (!grouped) {
      hideGraphPopover();
      canvas.style.cursor = 'default';
    }
  }

  const AXIS_TITLE_FONT = {
    family: "'Google Sans', 'Noto Sans', sans-serif",
    size: 16,
    weight: '600',
  };

  const GROUPED_TICK_FONT = {
    family: "'Google Sans', 'Noto Sans', sans-serif",
    size: 12,
  };

  const MULTILINE_LINE_HEIGHT = 15;
  const GROUPED_LABEL_GAP_AXIS = 4;
  const GROUPED_LABEL_GAP_TITLE = 8;
  const GROUPED_LABEL_EXTRA_BOTTOM = 14;
  const GRAPH_LABEL_HIT_PAD_X = 6;
  const GRAPH_LABEL_HIT_PAD_Y = 4;

  /** Bottom padding sized for the tallest label set, so the 0–100% plot height stays put across views. */
  function bottomPadding() {
    let lineCount = 1;
    VIEWS.forEach((view) => {
      const bucket = bucketFor(view);
      if (!bucket) return;
      bucket.categories.forEach((cat) => {
        lineCount = Math.max(lineCount, categoryLines(cat).length);
      });
    });
    return (
      GROUPED_LABEL_GAP_AXIS +
      lineCount * MULTILINE_LINE_HEIGHT +
      GROUPED_LABEL_GAP_TITLE +
      AXIS_TITLE_FONT.size +
      GROUPED_LABEL_EXTRA_BOTTOM
    );
  }

  function formatGroupedLabel(key) {
    return categoryLines(key).join('\n');
  }

  function maxLabelLines(labels) {
    return Math.max(
      1,
      ...labels.map((l) => String(l).split('\n').length)
    );
  }

  const multilineXAxisPlugin = {
    id: 'multilineXAxis',

    afterDraw(chart) {
      const opts = chart.options.plugins?.multilineXAxis;
      if (!opts?.enabled) return;

      const scale = chart.scales.x;
      if (!scale) return;

      const ctx = chart.ctx;
      const labels = chart.data.labels || [];
      const fontSize = opts.fontSize || GROUPED_TICK_FONT.size;
      const fontFamily = GROUPED_TICK_FONT.family;
      const tickColor = opts.tickColor || '#7a7a7a';
      const axisTitle = opts.axisTitle || '';
      const titleFontSize = AXIS_TITLE_FONT.size;

      const gapAxisToLabels = 4;
      const gapLabelsToTitle = 8;
      const maxLines = maxLabelLines(labels);
      const labelsSlotHeight = maxLines * MULTILINE_LINE_HEIGHT;
      const titleY =
        scale.bottom + gapAxisToLabels + labelsSlotHeight + gapLabelsToTitle;

      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';

      // Category labels just below the bars / x-axis (gray).
      ctx.fillStyle = tickColor;
      ctx.font = `400 ${fontSize}px ${fontFamily}`;

      scale.ticks.forEach((tick, i) => {
        const label = labels[i];
        if (label == null) return;

        const lines = String(label).split('\n');
        const x = scale.getPixelForTick(i);
        let y =
          scale.bottom +
          gapAxisToLabels +
          (maxLines - lines.length) * MULTILINE_LINE_HEIGHT;

        lines.forEach((line) => {
          ctx.fillText(line, x, y);
          y += MULTILINE_LINE_HEIGHT;
        });
      });

      if (axisTitle) {
        ctx.fillStyle = '#363636';
        ctx.font = `${AXIS_TITLE_FONT.weight} ${titleFontSize}px ${fontFamily}`;
        ctx.fillText(
          axisTitle,
          (chart.chartArea.left + chart.chartArea.right) / 2,
          titleY
        );
      }

      ctx.restore();
    },
  };

  /** ± whiskers on the aggregated bars (errors in the same units as the data). */
  const errorBarsPlugin = {
    id: 'errorBars',

    afterDatasetsDraw(chart) {
      const errors = chart.options.plugins?.errorBars?.errors;
      if (!errors) return;

      const yScale = chart.scales.y;
      const values = chart.data.datasets[0].data;
      const ctx = chart.ctx;

      ctx.save();
      ctx.strokeStyle = '#363636';
      ctx.lineWidth = 1.5;
      chart.getDatasetMeta(0).data.forEach((bar, i) => {
        const err = errors[i];
        const v = values[i];
        if (err == null || v == null) return;
        // Offset from the bar's (possibly animating) top so whiskers ride along with it.
        const half = yScale.getPixelForValue(v) - yScale.getPixelForValue(v + err);
        const cap = Math.min(7, bar.width / 4);
        ctx.beginPath();
        ctx.moveTo(bar.x, bar.y - half);
        ctx.lineTo(bar.x, bar.y + half);
        ctx.moveTo(bar.x - cap, bar.y - half);
        ctx.lineTo(bar.x + cap, bar.y - half);
        ctx.moveTo(bar.x - cap, bar.y + half);
        ctx.lineTo(bar.x + cap, bar.y + half);
        ctx.stroke();
      });
      ctx.restore();
    },
  };

  if (typeof Chart !== 'undefined') {
    Chart.register(multilineXAxisPlugin, errorBarsPlugin);
  }

  function valueTooltipLabel(failure) {
    return (ctx) => {
      const v = ctx.parsed.y;
      if (v == null) return 'N/A';
      return ' ' + v.toFixed(1) + '%' + (failure ? ' failed' : '');
    };
  }

  function tooltipOptions(groupedInteraction, failure) {
    return {
      boxPadding: 1,
      callbacks: groupedInteraction
        ? {
            title(items) {
              return items[0]?.dataset?.label || '';
            },
            label: valueTooltipLabel(failure),
          }
        : {
            title(items) {
              return items[0]?.label || '';
            },
            label(ctx) {
              const row = data.overall[orderedModels(data.models)[ctx.dataIndex]];
              return ' ' + row.accuracy.toFixed(2) + '% ± ' + row.std.toFixed(2);
            },
          },
    };
  }

  function renderLegend(models) {
    legendEl.innerHTML = '';
    models.forEach((modelId) => {
      const item = document.createElement('span');
      item.className = 'results-legend-item';
      item.innerHTML =
        '<span class="results-legend-swatch" style="background:' +
        MODEL_COLORS[modelId] +
        '"></span>' +
        '<span>' +
        modelLabel(modelId) +
        '</span>';
      legendEl.appendChild(item);
    });
  }

  function chartOptions(opts) {
    const groupedInteraction = opts && opts.groupedInteraction;
    const axisTitle = (opts && opts.axisTitle) || '';
    const failure = !!(opts && opts.failure);

    return {
      responsive: true,
      maintainAspectRatio: false,
      interaction: groupedInteraction
        ? { mode: 'nearest', intersect: true, axis: 'x' }
        : { mode: 'index', intersect: false },
      layout: {
        padding: {
          bottom: bottomPadding(),
          top: 4,
        },
      },
      plugins: {
        legend: { display: false },
        multilineXAxis: {
          enabled: true,
          fontSize: GROUPED_TICK_FONT.size,
          tickColor: '#7a7a7a',
          axisTitle,
        },
        errorBars: { errors: (opts && opts.errors) || null },
        tooltip: tooltipOptions(groupedInteraction, failure),
      },
      scales: {
        y: {
          min: 0,
          max: 100,
          title: {
            display: true,
            text: failure ? 'Failure rate (lower is better)' : 'Accuracy',
            font: AXIS_TITLE_FONT,
            padding: { bottom: 8 },
          },
          ticks: {
            callback: (v) => v + '%',
            font: { size: 12 },
          },
          grid: { color: 'rgba(0,0,0,0.06)' },
        },
        x: {
          title: {
            display: false,
          },
          ticks: {
            display: false,
            font: GROUPED_TICK_FONT,
            maxRotation: 0,
            minRotation: 0,
            autoSkip: false,
            padding: 4,
          },
          grid: { display: false },
          stacked: false,
        },
      },
    };
  }

  function aggregatedConfig(models) {
    return {
      type: 'bar',
      data: {
        labels: models.map(modelLabel),
        datasets: [
          {
            label: 'Accuracy',
            data: models.map((m) => data.overall[m].accuracy),
            backgroundColor: models.map((m) => MODEL_COLORS[m]),
            borderColor: models.map((m) => MODEL_COLORS[m]),
            borderWidth: 1,
            borderRadius: 4,
            maxBarThickness: 56,
          },
        ],
      },
      options: chartOptions({
        axisTitle: '',
        groupedInteraction: false,
        errors: models.map((m) => data.overall[m].std),
      }),
    };
  }

  function groupedConfig(view, models) {
    const bucket = bucketFor(view);
    const rawLabels = bucket.categories.filter((cat) => bucket.values[cat]);

    const datasets = models.map((modelId) => ({
      label: modelLabel(modelId),
      data: rawLabels.map((cat) => {
        const v = bucket.values[cat][modelId];
        return v == null ? null : v;
      }),
      backgroundColor: MODEL_COLORS[modelId],
      borderColor: MODEL_COLORS[modelId],
      borderWidth: 1,
      borderRadius: 3,
      maxBarThickness: 22,
    }));

    return {
      type: 'bar',
      data: { labels: rawLabels.map(formatGroupedLabel), datasets },
      options: {
        ...chartOptions({
          axisTitle: view.axisTitle,
          groupedInteraction: true,
          failure: isFailureMetric(view),
        }),
        datasets: {
          bar: {
            categoryPercentage: 0.72,
            barPercentage: 0.9,
          },
        },
      },
    };
  }

  function renderChart() {
    if (!data || !canvas) return;

    const view = viewById(currentView);
    const models = orderedModels(data.models);
    renderLegend(models);
    if (captionEl) captionEl.textContent = view.caption || '';

    const config =
      view.id === 'aggregated' ? aggregatedConfig(models) : groupedConfig(view, models);

    if (chart) {
      chart.destroy();
    }
    chart = new Chart(canvas, config);
    setupChartInteraction();
  }

  function showPanel() {
    if (loadingEl) loadingEl.hidden = true;
    if (errorEl) errorEl.hidden = true;
    if (panelEl) panelEl.hidden = false;
  }

  function showError(message) {
    if (loadingEl) loadingEl.hidden = true;
    if (panelEl) panelEl.hidden = true;
    if (errorEl) {
      errorEl.hidden = false;
      errorEl.textContent = message;
    }
  }

  function fetchJson(url) {
    return fetch(url).then((res) => {
      if (!res.ok) throw new Error('HTTP ' + res.status + ' for ' + url);
      return res.json();
    });
  }

  async function loadLegacy() {
    const [stats] = await Promise.all([
      fetchJson(LEGACY_STATS_URL),
      typeof CategoryExamples !== 'undefined' ? CategoryExamples.load() : null,
    ]);
    legacy = {
      by_domain: legacyBucket(stats, 'by_domain', stats.domains),
      by_graph: legacyBucket(stats, 'by_graph', stats.graph_types),
    };
    if (typeof CategoryExamples !== 'undefined') {
      CategoryExamples.configureModels(orderedModels(stats.models), modelLabel);
    }
  }

  async function init() {
    if (!canvas || !toggleRoot) return;

    buildToggleButtons();

    try {
      const [paper] = await Promise.all([
        fetchJson(DATA_URL),
        SHOW_LEGACY_VIEWS ? loadLegacy() : null,
      ]);
      data = paper;

      showPanel();
      renderChart();
    } catch (err) {
      showError(
        'Could not load results data. Serve the site over HTTP (e.g. python3 -m http.server) — ' +
          'opening index.html directly from the filesystem blocks the JSON fetch.'
      );
      console.error('results-chart:', err);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
