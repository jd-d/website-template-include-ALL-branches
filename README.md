# OTC Flow - UK Community Pharmacy Decision Support

OTC Flow is a browser-based consultation assistant for UK community pharmacists. The prototype ships as a static site that
runs entirely offline once cached. It captures consultation intake, evaluates deterministic rule packs, and generates
copy-ready consultation notes for systems such as PharmOutcomes and Sonar.

## Key capabilities

- **Interactive intake** - capture demographics, presenting complaint, and rule-pack specific findings with clarifier chips
  that highlight missing data.
- **Deterministic decision engine** - evaluate Pharmacy First pathways locally, including red flag detection, safety netting,
  and recommended actions.
- **Audit ready documentation** - produce markdown-style consultation notes with rule pack versions, decision traces, and
  safety netting statements ready to paste into clinical systems.
- **Scenario presets** - load prefilled intake journeys to demonstrate supply, delayed prescribing, or referral outcomes in
  seconds.

## Onboarding walkthrough

- Trigger the **View walkthrough** button on the hero panel to step through scenario presets, the transcript parser, and the
  decision card with highlighted focus states and narration.
- Look for the circular **i** icons beside patient demographics, the complaint selector, the rule-pack chooser, and the
  transcript editor. Each icon opens an in-app helper that links directly to [`docs/nlp-intake.md`](docs/nlp-intake.md) for
  deeper transcript authoring guidance.
- Use the **Quick start** card in the transcript section to load or copy an example UTI consultation transcript. Parsing it
  immediately demonstrates how suggestions appear and how clarifier chips clear as you accept values.

## OTC self-care packs

The signed manifest now includes the first OTC-focused self-care pathways in addition to the existing Pharmacy First packs:

- **Common cold and nasal congestion (`otc_cough_cold`)** - captures symptom combinations via the new multi-select intake control,
  highlights immunosuppression or prolonged course red flags, and recommends appropriate decongestant and self-care supply.
- **Acute diarrhoea (`otc_diarrhoea`)** - screens for dehydration, traveller risk factors, and stool frequency to determine
  when oral rehydration and loperamide supply is safe versus when GP review is required.
- **Functional constipation (`otc_constipation`)** - flags urgent features such as rectal bleeding, guides macrogol dosing, and
  surfaces lifestyle contributors for tailored counselling.

Each pack publishes in `assets/rules/` with updated SHA-256 checksums and an RSA-signed manifest. Load the new scenario presets
within the consultation view to demonstrate the OTC journeys quickly.

## Repository layout

- `index.html` - the interactive single page application for the OTC assistant.
- `assets/css/` - shared design tokens, dark/light theming, and component styles for the consultation layout.
- `assets/js/` - vanilla modules for rule packs, the evaluation engine, state management, and UI bindings.
- `docs/` - supporting documents including feasibility notes, release checklists, manual test logs, and the NLP intake guidance.
- [`docs/nlp-intake.md`](docs/nlp-intake.md) - parser scope, heuristics, authoring tips, and manual QA steps for transcript suggestions.
- `tests/pipeline.test.html` - lightweight regression harness that checks the published application shell for key elements.

## Running locally

1. Serve the repository with a static server, for example `npx http-server` from the project root.
2. Visit `http://localhost:8080/index.html` (or your chosen port) to load the assistant.
3. Use the scenario chips to populate sample data, or complete the intake manually to exercise the decision engine.
4. Copy the generated consultation note and verify it matches local governance requirements.

The site uses no bundler or runtime dependencies. All logic is in browser-native ES modules under `assets/js/`.

## Testing

1. Serve the repository root with any static file server (for example `npx http-server -p 8080 .`).
2. Open `tests/pipeline.test.html` to confirm `index.html` renders all primary UI components and metadata. The harness reports any failures directly on the page and in the developer console.
3. Open `tests/nlp-parser.test.html` in the same server session to run the sample transcript suite. Review the per-transcript log for warnings or mismatches and confirm the summary reports a clean pass.
4. (Manual spot check) Paste the sample transcripts into the consultation textarea within `index.html` and confirm the suggestion cards update, including the parser status and warning indicators.
5. (Manual spot check) Trigger the `OTC - Cold relief supply`, `OTC - Diarrhoea rehydration`, and `OTC - Macrogol plan` scenario chips to verify multi-select intake rendering, rule library structure summaries, and the new OTC outcomes.

## Governance and future work

Current rule packs cover uncomplicated UTI (women 16–64), sore throat (FeverPAIN), acute sinusitis, earache/acute otitis media,
impetigo, infected insect bite, shingles, and the initial OTC self-care pathways for cold symptoms, acute diarrhoea, and
functional constipation. The offline cache manifest and service worker ship with the published build, and new releases flow
through the signed JSON rule-pack pipeline for integrity checks. Upcoming milestones focus on expanding the remaining OTC
pathways and automating the rule-pack compilation, signing, and publication steps tracked in `TODO.md`.
