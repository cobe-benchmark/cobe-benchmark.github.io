/**
 * Failure-mode explorer — the seven qualitative failure patterns from the
 * paper (App. C), each with its worked example from App. B.1, plus one
 * response marked correct despite offering several rewrites.
 */
(function () {
  'use strict';

  // The three scored checks (paper Sec. 3.1) that an example violates.
  const CHECKS = {
    preserve: 'Wrongly editing unaffected facts',
    change: 'Failing to make required changes',
    connector: 'Wrong connectors',
  };

  const ERRORS = [
    {
      num: 'i',
      tab: 'Unchanged reason',
      title: 'Overlooking an unchanged reason for an action',
      desc:
        'A rewrite removes an action after changing one associated condition, even though the story ' +
        'supplies another reason for the action that remains in place.',
      check: 'preserve',
      example: '403v1',
      model: 'GPT-5.4-Pro',
      original:
        'I am going to the shop to repair my umbrella. It is raining heavily outside. I took my umbrella when I went out.',
      query:
        'Rewrite the original text, based on what would have happened in this scenario had it not been raining at all instead.',
      output:
        'I am going to the shop to repair my umbrella. It is not raining outside at all, so I did not take my umbrella when going out.',
      gold:
        'I am going to the shop to repair my umbrella. It is not raining outside at all. I still took my umbrella when I went out, since I needed to get it repaired.',
      keep: ['I am going to the shop to repair my umbrella. I took my umbrella when I went out.'],
      change: ['It is raining heavily outside.'],
      reason:
        'The repair errand remains unchanged and supplies a reason to bring the umbrella even without rain. ' +
        'The response changes the weather correctly but treats rain as the only reason for carrying the umbrella, ' +
        'overlooking the purpose explicitly stated in the story.',
    },
    {
      num: 'ii',
      tab: 'Rationalized background',
      title: 'Changing background facts to rationalize the intervention',
      desc:
        'A rewrite alters an unaffected event to make a stipulated outcome appear more expected.',
      check: 'preserve',
      example: '311v21',
      model: 'Claude-Opus-4.7',
      original:
        'Vera is a highly uncharismatic politician, but a major scandal ruined her opponent’s reputation, so she won the election.',
      query:
        'Rewrite the original text, based on what would have happened in this scenario had Vera been a highly charismatic politician and lost the election instead.',
      output:
        'Vera was a highly charismatic politician, but a major scandal ruined her reputation, so she lost the election.',
      gold:
        'Vera is a highly charismatic politician, and a major scandal ruined her opponent’s reputation, but she lost the election.',
      keep: ['A major scandal ruined her opponent’s reputation.'],
      change: ['Vera is a highly uncharismatic politician. She won the election.'],
      reason:
        'The query stipulates both charisma and electoral defeat; it does not ask the model to predict the ' +
        'election from charisma. The opponent’s scandal is unchanged background in the intended scenario. ' +
        'Reassigning the scandal to Vera changes that background to rationalize the requested defeat.',
    },
    {
      num: 'iii',
      tab: 'Stale consequence',
      title: 'Retaining a consequence whose stated reason no longer applies',
      desc:
        'A rewrite incorporates the requested intervention but carries over an explanation tied to the original situation.',
      check: 'change',
      example: '309v26',
      model: 'GPT-5.4-Pro',
      original:
        'It was raining and Timmy had soccer practice. The field was too wet, so practice was canceled.',
      query:
        'Rewrite the original text, based on what would have happened in this scenario had Timmy had squash practice instead.',
      output:
        'It was raining and Timmy had squash practice. The court was too wet, so practice was canceled.',
      gold:
        'It was raining, and the outdoor soccer field was still too wet. Timmy had squash practice instead, and it went ahead on an indoor court.',
      keep: ['It was raining.'],
      change: ['The practice venue was too wet, so the practice was canceled.'],
      reason:
        'Here, “practice venue” refers to the venue used for the activity in the rewritten scenario. Under the ' +
        'ordinary indoor-squash interpretation, rain making the outdoor soccer field too wet is no longer a reason ' +
        'to cancel that practice. The response transfers the wet-venue explanation to the squash court. The outdoor ' +
        'field need not become dry, and the criterion does not rule out every other possible reason for cancellation.',
    },
    {
      num: 'iv',
      tab: 'Quantitative constraint',
      title: 'Violating physical or quantitative constraints',
      desc:
        'A rewrite retains an outcome incompatible with the conditions in the counterfactual scenario.',
      check: 'change',
      example: '317v3',
      model: null,
      original:
        'The water level in the bathtub is rising rapidly because the main faucet is pouring water in at a rate of 5 gallons per minute.',
      query:
        'Rewrite the original text, based on what would have happened instead had the drain been opened, leaking water at 8 gallons per minute.',
      output:
        'The water level in the bathtub is rising rapidly because the main faucet is pouring water in at a rate of 5 gallons per minute. The drain was opened, leaking water at 8 gallons per minute.',
      gold:
        'The faucet continues to pour water into the bathtub at 5 gallons per minute, while the opened drain removes 8 gallons per minute. The water level falls as the tub loses a net 3 gallons per minute.',
      keep: ['The main faucet is pouring water in at a rate of 5 gallons per minute.'],
      change: ['The water level in the bathtub is rising rapidly.'],
      reason:
        'The faucet’s inflow remains fixed, and the intervention adds an outflow exceeding it. While water ' +
        'remains and the stated rates hold, the net volume change is 5 − 8 = −3 gallons per minute, so the water ' +
        'level falls. The response includes the requested drain opening but incorrectly retains the original rising level.',
    },
    {
      num: 'v',
      tab: 'Spatial consequence',
      title: 'Updating spatial consequences inconsistently',
      desc:
        'A rewrite changes an event but fails to keep its consequences consistent with the preserved spatial setting.',
      check: 'change',
      example: '126v7',
      model: 'Llama-3.1-8B',
      original:
        'Walking east across the Brooklyn Bridge at 8 AM, Sato faced into the morning sun, with the Manhattan skyline at her back.',
      query:
        'Rewrite the original text, based on what would have happened in this specific scenario instead had Sato been walking east across the Brooklyn Bridge at 6 PM instead of 8 AM.',
      output:
        'Walking east across the Brooklyn Bridge at 6 PM, Sato faced into the fading light of the setting sun, with the Manhattan skyline at her back.',
      gold:
        'Walking east across the Brooklyn Bridge at 6 PM, Sato had the late-afternoon sun behind her, with the Manhattan skyline at her back.',
      keep: ['Walking east across the Brooklyn Bridge, Sato had the Manhattan skyline at her back.'],
      change: ['It was 8 AM. The sun was in front of Sato.'],
      reason:
        'Changing the time leaves Sato’s direction of travel and Manhattan’s relative position unchanged. A ' +
        'visible setting sun would be in the western sky, behind an eastward walker rather than in front. The ' +
        'illustrative answer shows a daylight realization; the criteria do not require sunlight to remain visible at 6 PM.',
    },
    {
      num: 'vi',
      tab: 'Unsupported connector',
      title: 'Using an unsupported causal connector',
      desc:
        'A rewrite changes the requested event but retains wording that assigns it an unsupported cause.',
      check: 'connector',
      example: '115v3',
      model: null,
      original:
        'The structural engineer observed that the primary support beam had a three-inch fissure across its center. Due to the high risk of immediate collapse, the city council ordered the building to be evacuated immediately.',
      query:
        'Rewrite the original text, based on what would have happened instead had the city council decided to keep the building open for business, rather than order an evacuation.',
      output:
        'The structural engineer observed that the primary support beam had a three-inch fissure across its center. Due to the high risk of immediate collapse, the city council decided to keep the building open for business, rather than order an evacuation.',
      gold:
        'The structural engineer observed that the primary support beam had a three-inch fissure across its center. Despite the high risk of immediate collapse, the city council decided to keep the building open for business, rather than order an evacuation.',
      keep: ['The support beam had a three-inch fissure. There was a high risk of collapse.'],
      change: ['The city council ordered the building to be evacuated immediately.'],
      reason:
        'The intervention changes the council’s decision, not the observed damage or the stated risk. The response ' +
        'incorporates that decision but retains “due to,” presenting the danger as the reason to keep the building ' +
        'open. That connection does not follow from the given scenario. “Despite” expresses the intended contrast; ' +
        'neutral wording without a causal connector would also be valid. No collapse or injury is required.',
    },
    {
      num: 'vii',
      tab: 'Historical fact',
      title: 'Changing historical facts to match a preference',
      desc:
        'A rewrite makes an unaffected past event agree with a newly stipulated preference.',
      check: 'preserve',
      example: '419v1',
      model: 'Claude-Opus-4.7',
      original:
        'Hari’s favorite color is red. He discovers a childhood photo of his girlfriend wearing a red dress. He had never seen this photo before.',
      query:
        'Rewrite the original text, based on what would have happened instead had Hari’s favorite color been blue instead of red.',
      output:
        'Hari’s favorite color is blue. He discovers a childhood photo of his girlfriend wearing a blue dress. He had never seen this photo before.',
      gold:
        'Hari’s favorite color is blue. He discovers a childhood photo of his girlfriend wearing a red dress. He had never seen this photo before.',
      keep: ['Hari discovers a previously unseen childhood photo of his girlfriend. She is wearing a red dress in the photo.'],
      change: ['Hari’s favorite color is red.'],
      reason:
        'The requested change concerns Hari’s preference, not the historical contents of the photograph. Changing ' +
        'the dress to blue makes it match his new preference but alters an unaffected fact. The criteria make no ' +
        'demand about his emotional reaction to the photo.',
    },
    {
      num: '✓',
      tab: 'A valid rewrite',
      title: 'Marked correct despite multiple rewrites',
      desc:
        'The judge checks the criteria rather than matching a reference answer, so differently worded responses — ' +
        'even several alternatives at once — can all pass.',
      success: true,
      example: '217v10',
      model: 'Gemini-3.1-Pro',
      original:
        'Using a paper bookmark to keep her place, Lisa reads a thick novel at the terminal. Her connecting flight has been delayed by three hours.',
      query:
        'Rewrite the original text, based on what would have happened in this specific scenario instead had Lisa watched a movie on her laptop.',
      output: [
        'Using a pair of headphones to block out the noise, Lisa watches a movie on her laptop at the terminal. Her connecting flight has been delayed by three hours.',
        'Hitting the spacebar to pause her screen whenever announcements chime, Lisa watches a movie on her laptop at the terminal. Her connecting flight has been delayed by three hours.',
        'Sitting close to a wall outlet to keep her battery charged, Lisa watches a movie on her laptop at the terminal. Her connecting flight has been delayed by three hours.',
      ],
      gold:
        'Lisa watches a movie on her laptop at the terminal. Her connecting flight has been delayed by three hours.',
      keep: ['Lisa is at the terminal. Her connecting flight has been delayed by three hours.'],
      change: ['Lisa is reading a thick novel and using a paper bookmark to keep her place in that reading activity.'],
      reason:
        'Each alternative replaces the foregrounded reading activity with watching a movie while preserving the ' +
        'location and flight delay. Headphones, pausing, and charging are optional elaborations, not required ' +
        'consequences. The change does not require Lisa to discard the bookmark; it may remain in the closed book.',
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

  function outputHtml(e) {
    const who = e.model ? esc(e.model) : 'Illustrative model response';
    const label = e.success ? '✓ ' + who + ' — marked correct' : '✗ ' + who + ' — invalid edit';
    const body = Array.isArray(e.output)
      ? '<ol class="output-list">' + e.output.map((o) => '<li>' + esc(o) + '</li>').join('') + '</ol>'
      : esc(e.output);
    return (
      '<div class="demo-box demo-box--output-static ' + (e.success ? 'is-right' : 'is-wrong') + '">' +
      '<div class="demo-label">' + label + '</div>' + body + '</div>'
    );
  }

  function renderTabs() {
    tabsRoot.innerHTML = ERRORS.map(
      (e, i) =>
        '<button type="button" class="error-tab' + (i === active ? ' is-active' : '') +
        (e.success ? ' is-success' : '') +
        '" data-i="' + i + '"><span class="etab-num">' + esc(e.num) + '</span>' + esc(e.tab) + '</button>'
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
    const heading = e.success ? 'Valid: ' + esc(e.title) : '(' + esc(e.num) + ') ' + esc(e.title);
    const checkPill = e.check
      ? '<span class="check-pill">Fails check: ' + esc(CHECKS[e.check]) + '</span>'
      : '<span class="check-pill is-pass">Passes all three checks</span>';
    cardRoot.innerHTML =
      '<div class="error-card-head">' +
      '<h3>' + heading + '</h3>' +
      '<p>' + esc(e.desc) + '</p>' + checkPill + '</div>' +
      '<div class="error-card-body">' +
      '<div class="demo-box demo-box--scenario"><div class="demo-label">📄 Story <span style="font-weight:600;color:#94a3b8;margin-left:auto;text-transform:none">#' + esc(e.example) + '</span></div>' + esc(e.original) + '</div>' +
      '<div class="demo-box demo-box--query"><div class="demo-label">✏️ Query</div>' + esc(e.query) + '</div>' +
      outputHtml(e) +
      '<div class="demo-box demo-box--gold"><div class="demo-label">✅ Illustrative answer (not scored)</div>' + esc(e.gold) + '</div>' +
      '<div class="demo-box demo-box--criteria"><div class="demo-label">📐 Evaluation criteria</div>' +
      criteriaHtml('Should NOT change:', 'keep', e.keep) +
      criteriaHtml('Should change:', 'change', e.change) + '</div>' +
      '<div class="demo-box demo-box--reason"><div class="demo-label">⚖️ Authors’ reasoning</div>' +
      esc(e.reason) + '</div>' +
      '</div>';
  }

  renderTabs();
  renderCard();
})();
