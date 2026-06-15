/**
 * Interactive accuracy chart — loads eval-results/eval-statistics.json
 */
(function () {
  'use strict';

  const STATS_URL = './eval-results/eval-statistics.json';

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

  const VIEWS = {
    aggregated: { label: 'Aggregated', key: 'overall' },
    domain: { label: 'Domain Category', key: 'by_domain' },
    graph: { label: 'Graph Type', key: 'by_graph' },
  };

  let stats = null;
  let chart = null;
  let currentView = 'aggregated';

  const canvas = document.getElementById('results-chart');
  const legendEl = document.getElementById('results-legend');
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

  function accuracyPercent(bucket, modelId) {
    const row = bucket[modelId];
    if (!row || row.accuracy == null) return null;
    return row.accuracy * 100;
  }

  function orderedModels(available) {
    const set = new Set(available);
    return MODEL_ORDER.filter((m) => set.has(m));
  }

  function buildToggleButtons() {
    toggleRoot.innerHTML = '';
    Object.entries(VIEWS).forEach(([id, { label }]) => {
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
    if (!stats || viewId === currentView) return;
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
      graphPopoverTitle.textContent = graphType;
      graphPopoverBody.innerHTML = svg;
      graphPopover.dataset.graphType = graphType;
    }

    positionGraphPopover(event);
  }

  function groupedExamplesKey() {
    if (currentView === 'domain') return 'by_domain';
    if (currentView === 'graph') return 'by_graph';
    return null;
  }

  function groupedRawLabels() {
    if (!stats) return [];
    if (currentView === 'domain') {
      return stats.domains.filter((cat) => stats.by_domain[cat]);
    }
    if (currentView === 'graph') {
      return stats.graph_types.filter((cat) => stats.by_graph[cat]);
    }
    return [];
  }

  function groupedLabelIndexAtEvent(event) {
    if (!chart || !stats) return -1;
    if (currentView !== 'domain' && currentView !== 'graph') return -1;

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
    if (currentView === 'domain' || currentView === 'graph') {
      const index = groupedLabelIndexAtEvent(event);
      canvas.style.cursor = index >= 0 ? 'pointer' : 'default';
    } else {
      canvas.style.cursor = 'default';
    }
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
    if (currentView !== 'domain' && currentView !== 'graph') return;
    if (typeof CategoryExamples === 'undefined') return;

    const index = groupedLabelIndexAtEvent(event);
    if (index < 0) return;

    hideGraphPopover();

    const rawLabels = groupedRawLabels();
    const categoryName = rawLabels[index];
    const groupKey = groupedExamplesKey();
    if (categoryName && groupKey) {
      CategoryExamples.show(groupKey, categoryName);
    }
  }

  function setupChartInteraction() {
    if (!canvas) return;

    const grouped = currentView === 'domain' || currentView === 'graph';
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

  /** Bottom layout padding for domain-style x-axis (keeps 0–100% plot height consistent). */
  function domainStyleBottomPadding() {
    if (!stats) {
      return (
        GROUPED_LABEL_GAP_AXIS +
        2 * MULTILINE_LINE_HEIGHT +
        GROUPED_LABEL_GAP_TITLE +
        AXIS_TITLE_FONT.size +
        GROUPED_LABEL_EXTRA_BOTTOM
      );
    }
    const domainLabels = stats.domains
      .filter((cat) => stats.by_domain[cat])
      .map(formatGroupedLabel);
    const labelLineCount = maxLabelLines(domainLabels);
    return (
      GROUPED_LABEL_GAP_AXIS +
      labelLineCount * MULTILINE_LINE_HEIGHT +
      GROUPED_LABEL_GAP_TITLE +
      AXIS_TITLE_FONT.size +
      GROUPED_LABEL_EXTRA_BOTTOM
    );
  }

  /** Line breaks for grouped x-axis labels (Chart.js ignores \\n in default ticks). */
  const GROUPED_LABEL_LINES = {
    'Health and Medicine': ['Health and', 'Medicine'],
    Engineering: ['Engineering'],
    'History, Geography and Agriculture': ['History, Geography', 'and Agriculture'],
    'Economics and Finance': ['Economics and', 'Finance'],
    'Arts, Music and Entertainment': ['Arts, Music', 'and Entertainment'],
    'Science and Technology': ['Science and', 'Technology'],
    'Human Activities and Behavior': ['Human Activities', 'and Behavior'],
    'Chain-like': ['Chain-like'],
    'Collider-like': ['Collider-like'],
    Correlated: ['Correlated'],
    'Diamond-like': ['Diamond-like'],
    'Fork-like': ['Fork-like'],
    Hydrid: ['Hydrid'],
  };

  function formatGroupedLabel(label) {
    const lines = GROUPED_LABEL_LINES[label];
    if (lines) return lines.join('\n');
    if (label.includes(', ')) {
      return label.split(', ').join(',\n');
    }
    const andIdx = label.indexOf(' and ');
    if (andIdx > 0) {
      return label.slice(0, andIdx) + '\nand' + label.slice(andIdx + 4);
    }
    return label;
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

  if (typeof Chart !== 'undefined') {
    Chart.register(multilineXAxisPlugin);
  }

  function groupedXAxisTitle() {
    if (currentView === 'domain') return 'Domain Category';
    if (currentView === 'graph') return 'Graph Type';
    return '';
  }

  function accuracyTooltipLabel(ctx) {
    const v = ctx.parsed.y;
    if (v == null) return 'N/A';
    return ' ' + v.toFixed(1) + '%';
  }

  function groupedTooltipCallbacks() {
    return {
      title(items) {
        return items[0]?.dataset?.label || '';
      },
      label: accuracyTooltipLabel,
    };
  }

  function tooltipOptions(groupedInteraction) {
    return {
      boxPadding: 1,
      callbacks: groupedInteraction
        ? groupedTooltipCallbacks()
        : {
            title(items) {
              return items[0]?.label || '';
            },
            label: accuracyTooltipLabel,
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

    return {
      responsive: true,
      maintainAspectRatio: false,
      interaction: groupedInteraction
        ? { mode: 'nearest', intersect: true, axis: 'x' }
        : { mode: 'index', intersect: false },
      layout: {
        padding: {
          bottom: domainStyleBottomPadding(),
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
        tooltip: tooltipOptions(groupedInteraction),
      },
      scales: {
        y: {
          min: 0,
          max: 100,
          title: {
            display: true,
            text: 'Accuracy',
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
        },
      },
    };
  }

  function aggregatedConfig(models) {
    const values = models.map((m) => accuracyPercent(stats.overall, m));
    return {
      type: 'bar',
      data: {
        labels: models.map(modelLabel),
        datasets: [
          {
            label: 'Accuracy',
            data: values,
            backgroundColor: models.map((m) => MODEL_COLORS[m]),
            borderColor: models.map((m) => MODEL_COLORS[m]),
            borderWidth: 1,
            borderRadius: 4,
            maxBarThickness: 56,
          },
        ],
      },
      options: chartOptions({ axisTitle: '', groupedInteraction: false }),
    };
  }

  function groupedConfig(groupKey, categoryList) {
    const bucket = stats[groupKey];
    const models = orderedModels(stats.models);
    const rawLabels = categoryList.filter((cat) => bucket[cat]);
    const labels = rawLabels.map(formatGroupedLabel);

    const datasets = models.map((modelId) => ({
      label: modelLabel(modelId),
      data: rawLabels.map((cat) => accuracyPercent(bucket[cat], modelId)),
      backgroundColor: MODEL_COLORS[modelId],
      borderColor: MODEL_COLORS[modelId],
      borderWidth: 1,
      borderRadius: 3,
      maxBarThickness: 22,
    }));

    return {
      type: 'bar',
      data: { labels, datasets },
      options: {
        ...chartOptions({
          axisTitle: groupedXAxisTitle(),
          groupedInteraction: true,
        }),
        datasets: {
          bar: {
            categoryPercentage: 0.72,
            barPercentage: 0.9,
          },
        },
        scales: {
          ...chartOptions({
            axisTitle: groupedXAxisTitle(),
            groupedInteraction: true,
          }).scales,
          x: {
            ...chartOptions({
              axisTitle: groupedXAxisTitle(),
              groupedInteraction: true,
            }).scales.x,
            stacked: false,
          },
        },
      },
    };
  }

  function renderChart() {
    if (!stats || !canvas) return;

    const models = orderedModels(stats.models);
    renderLegend(models);

    let config;
    if (currentView === 'aggregated') {
      config = aggregatedConfig(models);
    } else if (currentView === 'domain') {
      config = groupedConfig('by_domain', stats.domains);
    } else {
      config = groupedConfig('by_graph', stats.graph_types);
    }

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

  async function init() {
    if (!canvas || !toggleRoot) return;

    buildToggleButtons();

    try {
      const statsPromise = fetch(STATS_URL).then((res) => {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      });
      const examplesPromise =
        typeof CategoryExamples !== 'undefined'
          ? CategoryExamples.load()
          : Promise.resolve(null);

      const [statsJson] = await Promise.all([statsPromise, examplesPromise]);
      stats = statsJson;

      if (typeof CategoryExamples !== 'undefined') {
        CategoryExamples.configureModels(orderedModels(stats.models), modelLabel);
      }

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
