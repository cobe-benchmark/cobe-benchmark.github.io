# CoBe — Counterfactual Benchmark for Text Editing (project website)

Source for the **CoBe** project website, published with GitHub Pages at
**<https://cobe-benchmark.github.io>**.

CoBe is a benchmark for *counterfactual text editing* — rewriting a story to reflect a hypothetical
"what if" while respecting the causal structure of the scene. The site presents the paper's results
and lets anyone test their own model on real benchmark scenarios.

**Related:** [benchmark code](https://github.com/cobe-benchmark/counterfactual-reasoning-benchmark) ·
[dataset (Hugging Face)](https://huggingface.co/datasets/cobe-team/counterfactual-reasoning-benchmark) ·
[live site](https://cobe-benchmark.github.io)

> The accompanying paper is **under review at the NeurIPS 2026 Datasets & Benchmarks Track** and is
> currently anonymous. The author names and paper link in `index.html` are intentionally left as
> placeholders — search for `TODO` (or the literal text `Anonymous`) to find every spot to fill in
> before de-anonymization.

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
├── eval-results/                   # pre-generated data the page fetches at runtime
│   ├── eval-statistics.json        #   accuracy: overall / by_domain / by_graph
│   └── category-examples.json      #   representative scenarios + model outputs per category
└── static/
    ├── css/
    │   ├── index.css               # design system + all section styles (main stylesheet)
    │   ├── results-chart.css       # results chart panel
    │   ├── category-examples.css   # click-a-bar example explorer
    │   ├── graph-type-diagram.css  # causal-graph hover popover
    │   └── bulma*.css, fontawesome.all.min.css, bulma.css.map.txt   # legacy / unused (see below)
    └── js/
        ├── results-chart.js        # Chart.js bar chart (aggregated / domain / graph views)
        ├── category-examples.js    # expandable examples when a chart bar is clicked
        ├── graph-type-diagrams.js  # SVG generator for the 6 causal-graph families
        ├── leaderboard.js          # sortable / filterable leaderboard table
        ├── try-it.js               # "Try it yourself" — test your own model
        ├── failure-modes.js        # the 5 error types + curated examples
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

All numbers shown on the site come from two JSON files in `eval-results/`, fetched at runtime. They are
**pre-generated artifacts**; the script that produces them lives in the separate
[benchmark code repo](https://github.com/cobe-benchmark/counterfactual-reasoning-benchmark), not here.
To refresh the site's numbers, regenerate those JSON files there and drop the new versions into
`eval-results/`.

<details>
<summary><code>eval-results/eval-statistics.json</code> (schema)</summary>

```jsonc
{
  "generated_at": "…",
  "source":      { … },   // provenance of the inputs the stats were derived from
  "notes":       { "accuracy": "correct / (correct + wrong); unknown excluded", … },
  "summary":     { "files_processed": …, … },   // generation bookkeeping
  "models":      ["claude", "gemini", "gemma-27b", "gpt", …],   // 9 ids (order not significant)
  "domains":     ["Health and Medicine", "Engineering", …],     // 7
  "graph_types": ["Chain-like", "Collider-like", …],            // 6
  "overall":   { "gpt": { "correct": 3831, "wrong": 3047, "unknown": 247, "total": 7125, "accuracy": 0.557 }, … },
  "by_domain": { "Health and Medicine": { "gpt": { …same shape… }, … }, … },
  "by_graph":  { "Chain-like":         { "gpt": { …same shape… }, … }, … }
}
```
Accuracy = `correct / (correct + wrong)`; `unknown` outcomes are excluded from the denominator (the file
states this same formula in `notes.accuracy`). Consumed by `results-chart.js` and `leaderboard.js`.
</details>

<details>
<summary><code>eval-results/category-examples.json</code> (schema)</summary>

```jsonc
{
  "generated_at": "…",
  "examples_per_category": 10,
  "models": ["gpt", "gemini", "claude", …],   // ids that may appear in each item's model_outputs
  "by_domain": {
    "Health and Medicine": [
      {
        "example_id": "102v17", "coreset_id": 102, "variation_id": 17, "query_idx": 2,
        "original":    "…the original scenario…",
        "query":       "…the counterfactual edit request…",
        "gold_answer": "…a representative valid edit…",
        "should_not_change": ["…events that must stay fixed…"],
        "should_change":     ["…events causally downstream of the edit…"],
        "model_outputs": { "gpt": { "response": "…", "verdict": "correct|wrong|unknown" }, … }
      }, …
    ], …
  },
  "by_graph": { "Chain-like": [ …same item shape… ], … }
}
```
Consumed by `category-examples.js` (chart explorer) and `try-it.js` (the demo uses `by_domain`).
</details>

---

## Editing common things

| You want to change… | Edit |
|---|---|
| News / updates timeline | the `#news` `<ul class="timeline">` in `index.html` (add newest at top) |
| Hero text, stats, author/venue, paper link | the `<header class="hero">` block in `index.html` |
| Social "Buzz" cards & share text | the `#buzz` section in `index.html`; share URLs/text in `static/js/site.js` |
| Leaderboard model names / org / params | the `MODEL_META` map in `static/js/leaderboard.js` |
| The 5 error-type examples | the `ERRORS` array in `static/js/failure-modes.js` |
| Causal-graph cards (labels / % / blurbs) | the inline `<script>` near the bottom of `index.html` |
| Colors, fonts, spacing | the CSS custom properties in `:root` at the top of `static/css/index.css` |
| Citation / BibTeX | the `#cite` block in `index.html` |
| Reported numbers | regenerate and replace the files in `eval-results/` (see above) |

### Adding or renaming a model

⚠️ Model display metadata is **duplicated across several files**, and any model id present in the JSON but
missing from a file's local map is **silently dropped** from that section (no error). To add or rename a
model, keep all of these in sync for the same model id:

1. **Data** — `eval-results/eval-statistics.json` (`overall` / `by_domain` / `by_graph`) and
   `eval-results/category-examples.json` (`model_outputs`).
2. **Leaderboard** — `MODEL_META` in `static/js/leaderboard.js` (label, org, type, params). *An id not in
   `MODEL_META` won't appear in the leaderboard.*
3. **Results chart** — `MODEL_ORDER`, `MODEL_LABELS`, `MODEL_COLORS` in `static/js/results-chart.js`. *An
   id not in `MODEL_ORDER` won't appear in the chart.*
4. **Try-it demo** — `MODEL_ORDER`, `MODEL_LABELS` in `static/js/try-it.js` (used for the per-model
   verdict chips).

The **display label** for a given id must match across `leaderboard.js`, `results-chart.js` and
`try-it.js`, or the same model will show up under different names in different sections.

---

## Testing & verification locally

There is no automated test suite (it's a static site). Verify changes manually:

**1. Confirm every asset loads (no 404s).** With the dev server running — and started from the repo root
(the directory containing `index.html`), since that directory is the server's document root:

```bash
for p in / static/css/index.css static/js/leaderboard.js static/js/try-it.js \
         static/js/failure-modes.js static/js/site.js \
         eval-results/eval-statistics.json eval-results/category-examples.json; do
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

- Leaderboard fills with 9 models; sorting columns and the All/Proprietary/Open filters work.
- Results chart renders; the **Aggregated / Domain / Graph** toggle switches views; clicking a bar in a
  grouped view opens the examples panel; hovering a graph-type label shows its diagram.
- **Try it yourself**: changing the domain loads new scenarios; **Copy prompt** copies; **Reveal**
  shows criteria, a representative answer, and per-model verdicts.
- Error-type tabs switch the example; the causal-graph gallery shows 6 SVG diagrams.
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
