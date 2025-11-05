# UK Community Pharmacy OTC Decision‑Support Assistant — Design Document (Static MVP)
**Version:** 1.0 (draft)  
**Date:** 2025-10-28 01:20 UTC  
**Owner:** Product + Lead Pharmacist

> This document describes *what we are building*, *what it can do*, and *how the static (GitHub Pages) architecture works*.  
> It assumes Python/Node are available during development (for tooling), but the **runtime application ships as a static site** with **no backend**.  
> NLP is “Option B (clinical‑tuned, non‑LLM)” but implemented client‑side with lightweight libraries where possible.

---

## 0) Executive Summary

We are building a **browser‑only decision‑support assistant** that helps UK community pharmacists run safe, fast, and well‑documented OTC and **Pharmacy First** consultations. The app accepts free‑text notes (e.g., “female 28, painful urination 2 days, no fever, no discharge”), extracts key facts with a **lightweight clinical NLP pipeline**, executes **deterministic, pharmacist‑validated decision trees**, and produces a **paste‑ready consultation summary** that fits PharmOutcomes/Sonar/PMR note fields.

**No LLM at runtime. No PHI leaves the device.** The site is deployed as a **static SPA** on GitHub Pages and works offline (PWA). When guidelines change, we ship **new versioned rule packs** (JSON) by pushing to the repo; the client loads the latest rules at runtime.

---

## 1) Goals and Non‑Goals

### Goals
- **Speed & safety:** <30 s from intake to decision when inputs are complete; strict red‑flag short‑circuit.
- **Determinism:** All clinical recommendations come from **versioned rule packs** validated by pharmacists.
- **Zero server PHI:** Default design keeps patient data **only in the browser**; copy‑paste to claims/PMR.
- **Audit‑ready notes:** Auto‑generated, structured documentation with rule IDs and timestamps.
- **Easy maintenance:** Rule packs are YAML/JSON in Git, reviewed via PRs with citations and tests.

### Non‑Goals
- Replacing PMR/claims systems (we generate notes to paste).  
- Long‑term storage of identifiable health data.  
- Running generative models client‑side.

---

## 2) High‑Level Capabilities

- **Conversational intake → structured JSON:** Free text converted to a typed schema (age/sex, symptoms, onset, red flags, meds/allergies, pregnancy, comorbids). Unknowns trigger a single clarifier question.  
- **Deterministic decision engine:** Executes *hard gates* (red flags), *scorers* (e.g., FeverPAIN), and *decision tables* to produce either **Manage in pharmacy** (with specific actions) or **Refer** (levels: same‑day/urgent/routine).  
- **Documentation composer:** Generates paste‑ready Markdown/plain‑text with: working diagnosis/differentials, inclusions/exclusions, product group and safety constraints, safety‑netting, and **rule version + effective date**.  
- **Offline‑first PWA:** Caches rule packs and dictionaries for rapid, resilient use at the counter.  
- **Governance & audit:** Every output includes the **rule pack ID** and **decision trace** to show why a branch fired.

---

## 3) User Roles and Scope

- **Primary:** Community Pharmacists (independent & small groups), ACTs/technicians (under supervision).  
- **Scope of pathways (MVP):**  
  - **Pharmacy First (England):** sore throat, acute sinusitis, earache (AOM), impetigo, infected insect bite, shingles, uncomplicated UTI in women 16–64.  
  - **High‑volume OTC:** acute cough/cold, diarrhoea, constipation, dyspepsia, headache, primary dysmenorrhoea, low back pain/sprains, eczema, tinea pedis, minor burns, allergic rhinitis, conjunctivitis, dry eye.

> Full text of the decision trees exists in the *Decision Tree Library* spec (already drafted). Those exact trees are loaded as JSON/YAML packs and executed client‑side.

---

## 4) Data Model (Intake Schema - abridged)

```json
{
  "patient": {"age": 28, "sex": "female", "pregnant": "unknown"},
  "presentation": "urinary_symptoms",
  "symptoms": {
    "dysuria": true,
    "frequency": true,
    "urgency": true,
    "haematuria": false,
    "fever": false,
    "flank_pain": false,
    "vaginal_discharge": false,
    "duration_days": 2
  },
  "history": {
    "recurrent_uti": false,
    "diabetes": false,
    "catheter": false,
    "renal_impairment": "unknown",
    "immunosuppressed": false
  },
  "meds_allergies": {"penicillin_allergy": false, "current_meds": ["metformin"]},
  "flags": {"acutely_unwell": false},
  "free_text": "female 28, painful urination for two days, no fever, no discharge"
}
```

Rules define what is “required” per pathway and how to behave on `"unknown"` (clarify vs conservative default).

---

## 5) Deterministic Rule Packs (executed client‑side)

**Format:** YAML or JSON with sections: `meta`, `intake_requirements`, `hard_gates`, `scorers`, `differential_rules`, `recommendations`, `documentation`.  
**Evaluation order:** `hard_gates` → `scorers` → `recommendations.choose_one` (with priority order).  
**Trace:** each rule evaluated with boolean result and inputs.  
**Versioning:** semantic version + `effective_from` date; rule ID embedded in every output.

> Example UTI (female 16–64) and FeverPAIN scorer were provided in the earlier spec; those exact texts become YAML/JSON files under `/rules/` and are rendered 1:1 into the UI.

---

## 6) Client‑Side NLP (Option B, LLM‑free)

- **scispaCy**: biomedical tokenisation + entity hints (e.g., “dysuria”, “photophobia”).  
- **medspaCy**: ConText rules for **negation** (“no fever”), **uncertainty**, and **experiencer** (patient vs someone else).  
- **QuickUMLS (optional)**: normalises messy phrases to UMLS concepts (requires UMLS data); can be added later via a tiny API.  
- **dateparser** (default) or **Duckling API** (optional) for time phrases → `duration_days`.  
- **pyahocorasick** + CSV dictionaries for fast, deterministic matching of meds, symptoms, red‑flags, comorbids.  
- **Confidence policy**: exact dict hit > lemma match > fuzzy (edit‑distance 1). Below threshold → `"unknown"` + single clarifier.

> In pure Pages mode we use **scispaCy + medspaCy + dateparser + pyahocorasick**. QuickUMLS and Duckling can be added later via serverless endpoints if needed.

---

## 7) Static Site Architecture (GitHub Pages)

**Runtime is 100% client-side.**

```
/docs                      # GitHub Pages root
  index.html               # SPA shell
  app.js                   # boot logic, UI state, event handlers
  nlp/
    pipeline.js            # wraps scispaCy/medspaCy adapters, dict scans
    dictionaries/
      symptoms.json
      red_flags.json
      meds.json
      comorbidities.json
    patterns/
      negation.json
      experiencer.json
  rules/
    sore_throat.v1.3.json
    uti_female_16_64.v1.3.json
    ...
  vendor/                  # pinned, SRI-checked third-party bundles
    json-logic.min.js
    zod.min.js
    chrono.min.js
    fuse.min.js
  css/
    app.css
  sw.js                    # Service Worker for PWA/offline cache
  manifest.webmanifest     # PWA metadata
```

**Execution flow in the browser**
1. User types narrative → NLP pipeline builds typed intake JSON.  
2. Validate required fields with **Zod**; if unknown, show one clarifier chip.  
3. Run **hard_gates** → immediate referral if any true.  
4. Select rule pack(s) from `/rules/` and evaluate with **json‑logic**.  
5. Render plan + documentation; include `rule_version`, `effective_from`, and trace.  
6. Copy‑to‑clipboard or print to PDF. Offline works via Service Worker.

**Security & integrity**
- Strong **CSP**; no inline eval; only load from self and whitelisted CDNs with **SRI hashes**.  
- Rule packs: include a signed manifest (optional) and verify signature in JS before using a pack.  
- No analytics by default. If enabled, send **aggregate, non‑PHI** counters via a minimal proxy (later).

---

## 8) Tech Stack (MVP)

**Core (client-only):**
- UI: Vanilla JS + small components (or tiny framework if you prefer), Tailwind optional.
- Validation: **Zod** (schema for intake JSON and rule files at load time).
- Rules: **json-logic** evaluator.
- NLP: **scispaCy** (model), **medspaCy** (ConText), **pyahocorasick** (dicts), **dateparser** (time).
- Utilities: **Fuse.js** for typo‑tolerant matches; **dayjs** for timestamps; **clipboard.js** or `navigator.clipboard`.

**Authoring & CI (dev-time, not shipped to browser):**
- Rule DSL in YAML → compiled to JSON in CI via Python (pydantic/ruamel.yaml) or Node.
- Unit tests (PyTest or Vitest) with fixture inputs → expected actions and doc snapshots.
- Precommit hooks to validate schemas and rebuild rule JSON.

**Optional tiny backend (later):**
- Duckling server (container or serverless) for advanced temporal parsing.
- QuickUMLS service for concept linking (requires UMLS data).
- Non‑PHI analytics proxy (Cloudflare Workers/Vercel).

---

## 9) Compliance & Safety

- **Deterministic rules** are the sole source of recommendations; NLP never “decides.”  
- **Red‑flag short‑circuit** occurs before any supply suggestion.  
- **Zero PHI off device** by default; copy‑paste into PMR/claims preserves pharmacy control.  
- **Rule governance:** pharmacist PR reviews with citations (NICE CKS, MHRA alerts, PF spec), semantic versioning, `effective_from` dates.  
- **DPIA** simplified by no server processing; if adding endpoints later, keep them stateless and reject PHI.  
- **DTAC** alignment easier with static delivery and signed rule packs.

---

## 10) Performance Targets

- Intake → plan render: **<500 ms** on typical pharmacy PCs (Web Worker for NLP/rules keeps UI smooth).  
- Rule evaluation: **<10 ms** per pack; all packs kept in-memory after first load.  
- First load: <1.5 MB (gzipped) target for core app + one model; additional rule packs lazy‑loaded.

---

## 11) Roadmap

### MVP (Pages‑only, 6–8 weeks)
- Intake schema + Zod definitions
- Dictionaries and patterns (symptoms, red flags, meds, comorbids)
- scispaCy/medspaCy wiring + dateparser
- Rule DSL (YAML → JSON) and json‑logic evaluator
- Decision Tree Library: 7 PF + 10–12 OTC pathways (exact texts already drafted)
- Documentation composer (markdown + plain text)
- PWA offline cache; strong CSP + SRI; signed manifest (optional)
- Test matrix and golden-document snapshots
- Pilot with 3–5 pharmacists; revise rules and UX

### Post‑MVP / v1.1–v1.3
- **Optional** Duckling serverless endpoint for time parsing
- **Optional** QuickUMLS endpoint with local cache for concept linking
- Keyboard‑first UX; paste profiles for PharmOutcomes/Sonar/PMRs
- Rule‑update notification banner in‑app with diff viewer
- Non‑PHI analytics (feature usage, pathway completion time)

### v2+ (integrations and scalability)
- PMR / claims helpers (local clipboard automation; where allowed, deep-link helpers)
- Multi‑jurisdiction packs (Wales, Scotland, NI variants)
- More pathways (skin/eye expansions, vax screening helpers)
- On‑device spell correction model (tiny) to reduce unknowns without LLMs
- Optional enterprise mode: signed rule packs, remote config, SSO for governance console

---

## 12) Risks & Mitigations

- **Missed synonyms/typos** → Start with curated lists + Fuse.js; add QuickUMLS later if needed.  
- **Rule drift vs guidelines** → PR review by pharmacist board, changelogs, semantic versions, tests.  
- **Client asset tampering** → CSP + SRI; signed manifest; pinned CDN versions.  
- **User acceptance (copy‑paste burden)** → Provide perfect field‑aligned note blocks and shortcuts; explore optional helpers later.  
- **Performance on old PCs** → Keep bundles small, use Web Workers, lazy‑load rule packs.

---

## 13) Appendix — Minimal Library List (client-side)

- **json-logic** — decision evaluation  
- **zod** — JSON schema validation  
- **scispaCy model** — e.g., `en_core_sci_sm` (loaded via JS bridge or preprocessed server-side into dictionary assets)  
- **medspaCy ConText rules** — ported rules or a minimal JS reimplementation of negation/experiencer; alternatively call into a tiny WebAssembly/pyodide bundle if you want to reuse Python components client-side later  
- **dateparser** (or **chrono-node** if you’d rather stay JS‑only)  
- **pyahocorasick** equivalent in JS (e.g., `aho-corasick` npm) or prebuilt trie JSON searched by a small matcher  
- **fuse.js** — fuzzy matching for synonyms  
- **dayjs** — timestamps, formatting  
- **clipboard.js** (optional) — reliable copy buttons

> If keeping the browser 100% JS‑only, prefer **chrono-node** + a JS Aho‑Corasick package and a JS ConText implementation. The Python stack is for authoring/tests; the runtime bundle is JS.

---

End of document.
