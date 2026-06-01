/**
 * Minimal SVG causal graph diagrams for graph-type hover previews.
 */
(function (global) {
  'use strict';

  const VIEW_W = 220;
  const VIEW_H = 110;
  const NODE_R = 16;
  const STROKE = '#6b7280';
  const FILL = '#f3f4f6';
  const TEXT = '#374151';

  function arrowMarkerDef(id, orient) {
    return (
      '<marker id="' +
      id +
      '" markerUnits="userSpaceOnUse" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="' +
      orient +
      '">' +
      '<path d="M0,0 L8,4 L0,8 Z" fill="' +
      STROKE +
      '"/>' +
      '</marker>'
    );
  }

  function svgOpen(id, bidirectional) {
    const markerId = 'gt-arrow-' + id;
    let defs =
      '<defs>' + arrowMarkerDef(markerId, 'auto');
    if (bidirectional) {
      defs += arrowMarkerDef(markerId + '-start', 'auto-start-reverse');
    }
    defs += '</defs>';
    return (
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' +
      VIEW_W +
      ' ' +
      VIEW_H +
      '" ' +
      'role="img" aria-hidden="true" class="graph-type-diagram-svg">' +
      defs
    );
  }

  function edgeId(id) {
    return 'url(#gt-arrow-' + id + ')';
  }

  function edgeIdStart(id) {
    return 'url(#gt-arrow-' + id + '-start)';
  }

  function node(x, y, label) {
    return (
      '<circle cx="' +
      x +
      '" cy="' +
      y +
      '" r="' +
      NODE_R +
      '" fill="' +
      FILL +
      '" stroke="' +
      STROKE +
      '" stroke-width="1.5"/>' +
      '<text x="' +
      x +
      '" y="' +
      (y + 5) +
      '" text-anchor="middle" font-family="Google Sans, Noto Sans, sans-serif" ' +
      'font-size="13" font-weight="600" fill="' +
      TEXT +
      '">' +
      label +
      '</text>'
    );
  }

  function edge(x1, y1, x2, y2, markerRef, dashed) {
    const dash = dashed ? ' stroke-dasharray="6 5"' : '';
    const marker = markerRef ? ' marker-end="' + markerRef + '"' : '';
    return (
      '<line x1="' +
      x1 +
      '" y1="' +
      y1 +
      '" x2="' +
      x2 +
      '" y2="' +
      y2 +
      '" stroke="' +
      STROKE +
      '" stroke-width="1.75"' +
      marker +
      dash +
      '/>'
    );
  }

  function edgeToNode(x1, y1, x2, y2, markerRef, dashed) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len;
    const uy = dy / len;
    const xEnd = x2 - ux * (NODE_R + 2);
    const yEnd = y2 - uy * (NODE_R + 2);
    const xStart = x1 + ux * (NODE_R + 2);
    const yStart = y1 + uy * (NODE_R + 2);
    return edge(xStart, yStart, xEnd, yEnd, markerRef, dashed);
  }

  function diagramChain() {
    const m = edgeId('chain');
    return (
      svgOpen('chain') +
      edgeToNode(35, 55, 110, 55, m) +
      edgeToNode(110, 55, 185, 55, m) +
      node(35, 55, 'A') +
      node(110, 55, 'B') +
      node(185, 55, 'C') +
      '</svg>'
    );
  }

  function diagramCollider() {
    const m = edgeId('collider');
    return (
      svgOpen('collider') +
      edgeToNode(50, 28, 110, 78, m) +
      edgeToNode(170, 28, 110, 78, m) +
      node(50, 28, 'A') +
      node(170, 28, 'C') +
      node(110, 78, 'B') +
      '</svg>'
    );
  }

  function diagramFork() {
    const m = edgeId('fork');
    return (
      svgOpen('fork') +
      edgeToNode(110, 28, 50, 78, m) +
      edgeToNode(110, 28, 170, 78, m) +
      node(110, 28, 'B') +
      node(50, 78, 'A') +
      node(170, 78, 'C') +
      '</svg>'
    );
  }

  function diagramDiamond() {
    const m = edgeId('diamond');
    const ax = 30;
    const dx = 190;
    const midX = (ax + dx) / 2;
    const ay = 55;
    const by = 28;
    const cy = 82;
    return (
      svgOpen('diamond') +
      edgeToNode(ax, ay, midX, by, m) +
      edgeToNode(ax, ay, midX, cy, m) +
      edgeToNode(midX, by, dx, ay, m) +
      edgeToNode(midX, cy, dx, ay, m) +
      node(ax, ay, 'A') +
      node(midX, by, 'B') +
      node(midX, cy, 'C') +
      node(dx, ay, 'D') +
      '</svg>'
    );
  }

  function diagramCorrelated() {
    const ax = 55;
    const ay = 55;
    const bx = 165;
    const by = 55;
    const cx = 110;
    const cy = 18;
    const mEnd = edgeId('correlated');
    const mStart = edgeIdStart('correlated');

    const dx0 = cx - ax;
    const dy0 = cy - ay;
    const len0 = Math.hypot(dx0, dy0) || 1;
    const x0 = ax + (dx0 / len0) * (NODE_R + 2);
    const y0 = ay + (dy0 / len0) * (NODE_R + 2);

    const dx1 = bx - cx;
    const dy1 = by - cy;
    const len1 = Math.hypot(dx1, dy1) || 1;
    const x2 = bx - (dx1 / len1) * (NODE_R + 2);
    const y2 = by - (dy1 / len1) * (NODE_R + 2);

    return (
      svgOpen('correlated', true) +
      '<path d="M' +
      x0 +
      ',' +
      y0 +
      ' Q' +
      cx +
      ',' +
      cy +
      ' ' +
      x2 +
      ',' +
      y2 +
      '" fill="none" stroke="' +
      STROKE +
      '" stroke-width="1.75" stroke-dasharray="6 5" marker-start="' +
      mStart +
      '" marker-end="' +
      mEnd +
      '"/>' +
      node(ax, ay, 'A') +
      node(bx, by, 'B') +
      '</svg>'
    );
  }

  function diagramHybrid() {
    const m = edgeId('hybrid');
    return (
      svgOpen('hybrid') +
      edgeToNode(110, 24, 48, 86, m) +
      edgeToNode(110, 24, 110, 86, m) +
      edgeToNode(110, 24, 172, 86, m) +
      edgeToNode(110, 86, 172, 86, m) +
      node(110, 24, 'B') +
      node(48, 86, 'A') +
      node(110, 86, 'C') +
      node(172, 86, 'D') +
      '</svg>'
    );
  }

  const GRAPH_TYPE_DIAGRAMS = {
    'Chain-like': diagramChain,
    'Collider-like': diagramCollider,
    'Fork-like': diagramFork,
    'Diamond-like': diagramDiamond,
    Correlated: diagramCorrelated,
    Hydrid: diagramHybrid,
  };

  global.GraphTypeDiagrams = {
    getSvg(graphType) {
      const fn = GRAPH_TYPE_DIAGRAMS[graphType];
      return fn ? fn() : '';
    },
    has(graphType) {
      return graphType in GRAPH_TYPE_DIAGRAMS;
    },
  };
})(typeof window !== 'undefined' ? window : global);
