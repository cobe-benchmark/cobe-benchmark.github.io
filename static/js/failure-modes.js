/**
 * Failure-mode explorer — the five error types CoBe checks for, each with a
 * real, hand-picked example from the paper's appendix.
 */
(function () {
  'use strict';

  const ERRORS = [
    {
      key: 'upstream',
      tab: 'Editing the wrong variable',
      title: 'Editing events that are not downstream',
      desc:
        'The model rewrites variables that the intervention should leave untouched — ' +
        'usually because it mistakes an independent (or upstream) factor for a consequence of the edit.',
      example: '311v26',
      model: 'Claude-Opus-4.7',
      original: 'Alonso is bad at backgammon, but he rolled good dice, so he won the game.',
      query:
        'Rewrite the original text, based on what would have happened instead had Alonso been good at backgammon and lost the game.',
      output: 'Alonso is good at backgammon, but he rolled bad dice, so he lost the game.',
      gold: 'Alonso is good at backgammon, and he rolled good dice, but he lost the game.',
      keep: ['He rolled good dice.'],
      change: ['Alonso is bad at backgammon.', 'He won the game.'],
      reason:
        'Being good at a game and being lucky are independent variables — Alonso could lose ' +
        'despite good dice due to unseen factors like a brilliant opponent. The dice roll should not have been edited.',
    },
    {
      key: 'downstream',
      tab: 'Missing a consequence',
      title: 'Not editing downstream variables',
      desc:
        'The model leaves (or hallucinates over) an event that the intervention should have changed, ' +
        'breaking the causal chain that follows from the edit.',
      example: '325v12',
      model: 'Phi-4',
      original:
        'Sending a green wedge of citrus skittering across the floor, the bartender bumped the cutting board while mixing a classic Margarita.',
      query:
        'Rewrite the original text, based on what would have happened instead had he been mixing a classic Old Fashioned.',
      output:
        'Sending a splash of ice clinking against the glass, the bartender gently tapped the mixing glass while preparing a classic Old Fashioned. He carefully measured the whiskey, added a dash of bitters, and muddled a sugar cube with a twist of orange peel.',
      gold:
        'Sending an orange wedge of citrus skittering across the floor, the bartender bumped the cutting board while mixing a classic Old Fashioned.',
      keep: ['The bartender bumped the cutting board.'],
      change: ['Sending a green wedge of citrus skittering across the floor.'],
      reason:
        'The downstream garnish should change to an orange wedge (the citrus used in an Old Fashioned) — ' +
        'instead the model rewrote the whole scene and dropped the invariant fact that the bartender bumped the cutting board.',
    },
    {
      key: 'connector',
      tab: 'Wrong connector',
      title: 'Wrong connectors',
      desc:
        'The model updates the facts but keeps the logical glue (because, so, due to) that no longer holds ' +
        'once the edit flips a cause-and-effect relationship.',
      example: '114v4',
      model: 'Qwen-2.5-7B',
      original:
        'Due to the record-breaking heatwave, the server room temperatures spiked. The website went offline for several hours because the automated cooling systems failed to handle the thermal load.',
      query:
        'Rewrite the original text, based on what would have happened instead had the server room temperatures not spiked.',
      output:
        'Due to the record-breaking heatwave, the server room temperatures remained stable thanks to the reliable performance of the automated cooling systems. As a result, the website continued to operate without any interruptions or downtime.',
      gold:
        'Despite the record-breaking heatwave, the server room temperatures did not spike. The website stayed online because the cooling systems were not overtaxed.',
      keep: ['There was a record-breaking heatwave.'],
      change: ['The server room temperatures spiked.', 'The website went offline for several hours.'],
      reason:
        'When the heat no longer causes a spike, the right connector is "despite" or "nevertheless" — not ' +
        '"due to". Keeping the causal connector leaves the sentence logically inconsistent.',
    },
    {
      key: 'quantitative',
      tab: 'Quantitative slip',
      title: 'Quantitative inconsistency',
      desc:
        'When an edit changes a quantity, the resulting effects must move in the right direction and ' +
        'respect physical limits. Models often produce numerically impossible outcomes.',
      example: '153v1',
      model: 'Gemini-3.1-Pro',
      original:
        'The crowd cheered wildly as the gymnast nailed the dismount. She held the strenuous iron cross on the rings for 4 seconds and wore a sparkling red leotard.',
      query:
        'Rewrite the original text, based on what would have happened instead had the gymnast held the strenuous iron cross on the rings for 3 minutes.',
      output:
        'What started as standard cheering dissolved into a stunned silence as the gymnast defied the limits of human physiology… When she finally broke the hold and miraculously still managed to nail the dismount, the arena erupted into sheer pandemonium.',
      gold:
        'The crowd gasped in horror as the gymnast tore a muscle and collapsed. She held the strenuous iron cross on the rings for 3 minutes and wore a sparkling red leotard.',
      keep: ['The gymnast wore a sparkling red leotard.'],
      change: ['The crowd cheered wildly as the gymnast nailed the dismount.'],
      reason:
        'The world record for an iron cross hold is around 40 seconds, so 3 minutes is physically impossible — ' +
        'nailing the dismount afterward is not a valid outcome given the limits of the human body.',
    },
    {
      key: 'latent',
      tab: 'Latent factor',
      title: 'Latent factors inconsistency',
      desc:
        'Some background variables are implied but never stated. They must stay fixed unless the intervention ' +
        'genuinely affects them — models often quietly change them in the wrong direction.',
      example: '126v7',
      model: 'Llama-3.1-8B',
      original:
        'Walking east across the Brooklyn Bridge at 8 AM, Sato faced into the morning sun, with the Manhattan skyline at her back.',
      query:
        'Rewrite the original text, based on what would have happened instead had Sato been walking east across the Brooklyn Bridge at 6 PM instead of 8 AM.',
      output:
        'Walking east across the Brooklyn Bridge at 6 PM, Sato faced into the fading light of the setting sun, with the Manhattan skyline at her back.',
      gold:
        'Walking east across the Brooklyn Bridge at 6 PM, Sato had the late-afternoon sun behind her, with the Manhattan skyline at her back.',
      keep: ['Walking east across the Brooklyn Bridge, Sato had the Manhattan skyline at her back.'],
      change: ['It was 8 AM.', 'The morning sun was in front of Sato.'],
      reason:
        'The evening sun is in the west — the opposite of the morning. Facing east at 6 PM, Sato should have ' +
        'the sun behind her, not in front. The implicit sun position was changed incorrectly.',
    },
  ];

  const tabsRoot = document.getElementById('error-tabs');
  const cardRoot = document.getElementById('error-card');
  if (!tabsRoot || !cardRoot) return;

  let active = 0;

  function esc(t) {
    const d = document.createElement('div');
    d.textContent = t == null ? '' : String(t);
    return d.innerHTML;
  }

  function criteriaHtml(title, cls, items) {
    if (!items || !items.length) return '';
    return (
      '<div class="criteria-block"><div class="ctitle ' + cls + '">' + title + '</div><ul>' +
      items.map((i) => '<li>' + esc(i) + '</li>').join('') +
      '</ul></div>'
    );
  }

  function renderTabs() {
    tabsRoot.innerHTML = ERRORS.map(
      (e, i) =>
        '<button type="button" class="error-tab' + (i === active ? ' is-active' : '') +
        '" data-i="' + i + '"><span class="etab-num">' + (i + 1) + '</span>' + esc(e.tab) + '</button>'
    ).join('');
    tabsRoot.querySelectorAll('.error-tab').forEach((btn) => {
      btn.addEventListener('click', () => {
        active = parseInt(btn.dataset.i, 10);
        renderTabs();
        renderCard();
      });
    });
  }

  function renderCard() {
    const e = ERRORS[active];
    cardRoot.innerHTML =
      '<div class="error-card-head">' +
      '<h3>Error ' + (active + 1) + ': ' + esc(e.title) + '</h3>' +
      '<p>' + esc(e.desc) + '</p></div>' +
      '<div class="error-card-body">' +
      '<div class="demo-box demo-box--scenario"><div class="demo-label">📄 Scenario <span style="font-weight:600;color:#94a3b8;margin-left:auto">#' + esc(e.example) + '</span></div>' + esc(e.original) + '</div>' +
      '<div class="demo-box demo-box--query"><div class="demo-label">✏️ Counterfactual edit request</div>' + esc(e.query) + '</div>' +
      '<div class="demo-box demo-box--output-static is-wrong"><div class="demo-label">✗ ' + esc(e.model) + ' — invalid edit</div>' + esc(e.output) + '</div>' +
      '<div class="demo-box demo-box--gold"><div class="demo-label">✅ Representative valid edit</div>' + esc(e.gold) + '</div>' +
      '<div class="demo-box demo-box--criteria"><div class="demo-label">📐 Evaluation criteria</div>' +
      criteriaHtml('Should NOT change:', 'keep', e.keep) +
      criteriaHtml('Should change:', 'change', e.change) + '</div>' +
      '<div class="demo-box demo-box--reason"><div class="demo-label">⚖️ Why it fails</div>' + esc(e.reason) + '</div>' +
      '</div>';
  }

  renderTabs();
  renderCard();
})();
