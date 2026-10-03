# CoBe — A Benchmark for Conversational Counterfactual Text Editing (project website)

Source for the **CoBe** project website, published with GitHub Pages at
**<https://cobe-benchmark.github.io>**.

CoBe is a benchmark for *conversational counterfactual text editing* — revising a story in light of a
"what would have happened if…" request while keeping fixed everything the change does not causally
affect. The site presents the paper's results and lets anyone test their own model on real benchmark
scenarios.

**Related:** [public dataset sample (Kaggle, 200 scenarios)](https://kaggle.com/datasets/5ae0d5bcf4d8f3ed1af4aae45466f2b49d4b21a3d40783980a2bd3b315437204) ·
[live site](https://cobe-benchmark.github.io)

> The accompanying paper is **under review at ICLR 2027** and the site is kept anonymous. The author
> names and paper link in `index.html` are intentionally left as placeholders — search for `TODO` (or
> the literal text `Anonymous`) to find every spot to fill in before de-anonymization. See
> [Hidden sections and switches](#hidden-sections-and-switches) for content that is built but not shown.

---

## Tech stack

This is a **plain static site** — no framework, no bundler, no build step. Everything is hand-written
HTML/CSS/vanilla JavaScript that runs directly in the browser.

External dependencies are loaded from CDNs at runtime (so an internet connection is needed for the
chart, icons, and web fonts to render):

| Dependency | Version | Used for |
|---|---|---|
| [Chart.js](https://www.chartjs.org/) | 4.4.1 (jsDelivr) | the interactive results bar chart |
| [Font Awesome](https://fontawesome.com/) | 6.5.0 (cdnjs) | icons |
| Google Fonts | — | `Inter` (UI) + `Source Serif 4` (abstract/quotes) |

Everything else — layout, the leaderboard, the "Try it yourself" demo, the failure-mode explorer and
the causal-graph diagrams — is local and dependency-free.

> `.gitignore` reserves a git-ignored `.vendor/` directory; it is unused today and exists only as a
> place to drop local copies of the CDN assets if offline support is ever needed. There is nothing to
> install for normal development.

---

## Quick start (local development)

Because the page **fetches JSON data files** (`eval-results/*.json`) at runtime, you must serve it over
HTTP. Opening `index.html` directly with `file://` will leave the leaderboard, chart and demo empty
(browsers block `fetch()` from the filesystem).

Clone and serve with any static file server:

```bash
git clone git@github.com:cobe-benchmark/cobe-benchmark.github.io.git
cd cobe-benchmark.github.io

# Pick ONE of these:
python3 -m http.server 8000        # Python 3 (no install needed)
npx serve .                        # Node (https://www.npmjs.com/package/serve)
php -S localhost:8000              # PHP
```

Then open **<http://localhost:8000>**.

There is nothing to compile and no dependencies to install — edit a file and refresh the browser.

> **Tip:** hard-refresh (`Cmd/Ctrl+Shift+R`) after editing CSS/JS, since the browser caches static
> assets aggressively.

---

## Project structure

```text
.
├── index.html                      # the entire page (all sections live here)
├── README.md
├── eval-results/                   # data the page fetches at runtime
│   ├── paper-results.json          #   numbers from the current paper (leaderboard + results chart)
│   ├── eval-statistics.json        #   earlier (June 2026) run: overall / by_domain / by_graph (legacy)
│   └── category-examples.json      #   scenarios + criteria (+ earlier-run model outputs) for Try it
└── static/
    ├── css/
    │   ├── index.css               # design system + all section styles (main stylesheet)
    │   ├── results-chart.css       # results chart panel
    │   ├── category-examples.css   # click-a-bar example explorer
    │   ├── graph-type-diagram.css  # causal-graph hover popover
    │   └── bulma*.css, fontawesome.all.min.css, bulma.css.map.txt   # legacy / unused (see below)
    └── js/
        ├── results-chart.js        # Chart.js bar chart (overall / graph / phrasing / error type / failure pattern)
        ├── category-examples.js    # expandable examples when a chart bar is clicked
        ├── graph-type-diagrams.js  # SVG generator for the 6 causal-graph families
        ├── leaderboard.js          # sortable / filterable leaderboard table
        ├── try-it.js               # "Try it yourself" — test your own model
        ├── failure-modes.js        # the 7 failure patterns (paper App. C) + worked examples (App. B.1)
        ├── site.js                 # nav, share buttons, copy-to-clipboard, scroll reveal
        └── bulma*.js, fontawesome.all.min.js, index.js   # legacy / unused (see below)
```

### Active vs. legacy files

`index.html` only loads the files listed above as active. The `bulma*`, `fontawesome.all.min.*`,
`bulma.css.map.txt` and `static/js/index.js` files are leftovers from the original Nerfies template and
are **not referenced by the page** — they can be ignored (or pruned) and are kept only to avoid
churning git history.

---

## How the page gets its data

The page fetches JSON from `eval-results/` at runtime.

**`eval-results/paper-results.json`: the current paper's numbers.** This file drives the leaderboard
and the *Explore* chart. It was transcribed from the ICLR 2027 draft:

| Key | Source in the paper | Used by |
|---|---|---|
| `overall` | Table 5 (accuracy averaged over the three query phrasings, `std` across phrasings) | leaderboard, chart "Overall" |
| `by_graph` | Fig. 7 (accuracy by causal graph type) | chart "Graph type" |
| `by_query` | Fig. 8 (accuracy by query phrasing A/B/C) | chart "Query phrasing" |
| `by_criterion` | Fig. 6 (failure rate per evaluation criterion; lower is better) | chart "Error type" |
| `by_failure_mode` | Fig. 9 (accuracy by qualitative failure pattern i–vii, App. C) | chart "Failure pattern" |

The paper prints exact values only for Table 5. The figure-based buckets were read from the bar heights
in the PDF's vector figures and rounded to 0.1. As a sanity check, averaging `by_query` reproduces
Table 5 to within 0.05. When the paper's figures change, regenerate these values, ideally from the raw
results in the benchmark code repo. All values are percentages.

```jsonc
{
  "models":  ["gpt", "gemini", "claude", …],                 // ids, see "Adding or renaming a model"
  "overall": { "gpt": { "accuracy": 61.34, "std": 0.45 }, … },
  "by_graph": {
    "metric": "accuracy",                                     // or "failure_rate" (by_criterion)
    "categories": ["Chain-like", …],                          // display order; labels live in results-chart.js
    "values": { "Chain-like": { "gpt": 63.5, … }, … }
  },
  "by_query": { … }, "by_criterion": { … }, "by_failure_mode": { … }   // same shape
}
```

The prompt-ablation table (paper Table 7) and the dataset statistics are static HTML in `index.html`.

**Legacy files from an earlier (June 2026) evaluation run.** These predate the current paper: different
numbers, an older 7-domain taxonomy, and a different judge.

- `eval-statistics.json` (`overall` / `by_domain` / `by_graph`, with `correct`/`wrong`/`unknown` counts).
  It is no longer displayed. `results-chart.js` can show its per-domain view again via `SHOW_LEGACY_VIEWS`.
- `category-examples.json`: 10 scenarios per old domain/graph category, each with
  `original`, `query`, `gold_answer`, `should_not_change`, `should_change` and per-model `model_outputs`
  (`response` + `verdict`).
  - *Try it yourself* uses `by_domain` for its scenarios and criteria. The old domain names appear as
    "Topic", and the per-model verdict chips are switched off via `SHOW_MODEL_VERDICTS` in `try-it.js`.
  - The click-a-label example explorer (`category-examples.js`) is switched off with the legacy views.

---

## Hidden sections and switches

These pieces are built and kept in the code but hidden on purpose. To bring one back:

| What | Where | How to reveal |
|---|---|---|
| Community / "Buzz" section + share buttons | `<section id="buzz" hidden>` in `index.html` | remove `hidden` |
| Code (GitHub) button, footer link, "Want to be listed?" note | `index.html` (search for "remove `hidden`") | remove `hidden` once the repo is public |
| Per-model ✓/✗ chips in *Try it* | `SHOW_MODEL_VERDICTS` in `static/js/try-it.js` | set `true` (only once the data matches the paper) |
| Per-domain chart view + click-for-examples panel | `SHOW_LEGACY_VIEWS` in `static/js/results-chart.js` | set `true` (only once the data matches the paper) |

The global CSS rule `[hidden] { display: none !important; }` (end of `index.css`) makes `hidden` win over
classes such as `.btn` that set `display`.

---

## Editing common things

| You want to change… | Edit |
|---|---|
| News / updates timeline | the `#news` `<ul class="timeline">` in `index.html` (add newest at top) |
| Hero text, stats, author/venue, paper link | the `<header class="hero">` block in `index.html` |
| Findings cards, task/ladder, healthcare example | `#findings` and `#task` in `index.html` |
| Construction pipeline, dataset stats, domains, audit, scoring, prior-work table | `#benchmark` in `index.html` |
| Prompt-ablation table (paper Table 7) | `#ablations` in `index.html` |
| Social "Buzz" cards & share text (hidden) | the `#buzz` section in `index.html`; share URLs/text in `static/js/site.js` |
| Leaderboard model names / org / params | the `MODEL_META` map in `static/js/leaderboard.js` |
| Chart views, captions, category labels | `VIEWS` and `CATEGORY_LINES` in `static/js/results-chart.js` |
| The 7 failure patterns + examples | the `ERRORS` array in `static/js/failure-modes.js` |
| Causal-graph cards (labels / % / blurbs) | the inline `<script>` near the bottom of `index.html` |
| Colors, fonts, spacing | the CSS custom properties in `:root` at the top of `static/css/index.css` |
| Citation / BibTeX | the `#cite` block in `index.html` |
| Reported numbers | `eval-results/paper-results.json` (see above) |

### Adding or renaming a model

⚠️ Model display metadata is **duplicated across several files**, and any model id present in the JSON but
missing from a file's local map is **silently dropped** from that section (no error). To add or rename a
model, keep all of these in sync for the same model id:

1. **Data** — `eval-results/paper-results.json` (`models`, `overall` and every `values` bucket); the legacy
   `eval-statistics.json` / `category-examples.json` only matter if the legacy switches are turned on.
2. **Leaderboard** — `MODEL_META` in `static/js/leaderboard.js` (label, org, type, params). *An id not in
   `MODEL_META` won't appear in the leaderboard.*
3. **Results chart** — `MODEL_ORDER`, `MODEL_LABELS`, `MODEL_COLORS` in `static/js/results-chart.js`. *An
   id not in `MODEL_ORDER` won't appear in the chart.*
4. **Try-it demo** — `MODEL_ORDER`, `MODEL_LABELS` in `static/js/try-it.js` (used for the per-model
   verdict chips, currently hidden).

The **display label** for a given id must match across `leaderboard.js`, `results-chart.js` and
`try-it.js`, or the same model will show up under different names in different sections.

---

## Testing & verification locally

There is no automated test suite (it's a static site). Verify changes manually:

**1. Confirm every asset loads (no 404s).** With the dev server running — and started from the repo root
(the directory containing `index.html`), since that directory is the server's document root:

```bash
for p in / static/css/index.css static/js/leaderboard.js static/js/try-it.js \
         static/js/failure-modes.js static/js/results-chart.js static/js/site.js \
         eval-results/paper-results.json eval-results/category-examples.json; do
  printf '%s -> %s\n' "$p" "$(curl -s -o /dev/null -w '%{http_code}' "http://localhost:8000/$p")"
done   # every line should end in 200
```

**2. Check for JavaScript console errors and screenshot the page** (headless Chrome — no extra tooling):

```bash
# Pick the Chrome/Chromium binary for your OS:
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"   # macOS
# CHROME=google-chrome            # Linux (or: chromium / chromium-browser)
# CHROME="C:\Program Files\Google\Chrome\Application\chrome.exe"        # Windows
# (any Chromium-based browser works)

"$CHROME" --headless --disable-gpu --no-sandbox --virtual-time-budget=6000 \
  --user-data-dir="$(mktemp -d)" \
  --window-size=1280,2400 --hide-scrollbars \
  --enable-logging=stderr --screenshot=/tmp/cobe.png \
  http://localhost:8000/ 2> /tmp/cobe-console.log

# Any real JS errors show up here:
grep -iE "Uncaught|TypeError|ReferenceError|SyntaxError|is not defined" /tmp/cobe-console.log
open /tmp/cobe.png   # macOS; use xdg-open on Linux
```

> The `--user-data-dir="$(mktemp -d)"` flag gives each run a fresh profile. Without it, the command
> fails (non-zero exit, no screenshot) whenever another Chrome instance already holds the default
> profile lock.

**3. Manual smoke checklist** (in a real browser):

- Leaderboard fills with 9 models (values = paper Table 5, with ±); sorting and the All/Proprietary/Open
  filters work.
- Results chart renders; the **Overall / Graph type / Query phrasing / Error type / Failure pattern**
  toggle switches views and updates the caption; "Overall" shows ± whiskers; hovering a graph-type label
  shows its diagram.
- **Try it yourself**: changing the topic loads new scenarios; **Copy prompt** copies just the story +
  request; **Reveal** shows the criteria and an illustrative answer (no verdict chips while hidden).
- Failure-pattern tabs (i–vii + a valid example) switch the example; the causal-graph gallery shows 6 SVG
  diagrams.
- The Community section and Code links are not visible.
- Mobile: the hamburger menu opens/closes; share/copy buttons work; nothing overflows horizontally.

> **Gotcha — headless Chrome enforces a ~500px minimum layout viewport.** A `--window-size=390,…`
> screenshot renders a 500px layout and the PNG simply *clips* the right edge; that is **not** a real
> overflow bug. To check for genuine horizontal overflow, compare
> `document.documentElement.scrollWidth` against `window.innerWidth` in the browser console, or test on
> an actual device / responsive-design mode.

---

## Deployment

The site is served by **GitHub Pages from the `main` branch** of
`cobe-benchmark/cobe-benchmark.github.io`. Pushing to `main` publishes to
<https://cobe-benchmark.github.io>; no build or CI step runs. There is no staging branch — preview
locally before pushing.

---

## License

<a rel="license" href="http://creativecommons.org/licenses/by-sa/4.0/"><img alt="Creative Commons License" style="border-width:0" src="https://i.creativecommons.org/l/by-sa/4.0/88x31.png" /></a><br />
This work is licensed under a
<a rel="license" href="http://creativecommons.org/licenses/by-sa/4.0/">Creative Commons Attribution-ShareAlike 4.0 International License</a>.
The website design is adapted from the [Nerfies](https://nerfies.github.io/) template.
