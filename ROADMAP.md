# Roadmap

## Release Strategy
OTC Flow ships as an offline-capable consultation assistant for UK community pharmacies. We will iterate through six sprints that progressively harden the service worker shell, publish rule packs, expand the intake experience, and layer in NLP support. Each increment is deployable and keeps the assistant usable in pharmacy settings while we grow clinical coverage and automation.

### Sprint Milestones
1. **Sprint 1 Offline Shell and Rule Pack Loader** - Lock in the PWA foundation, manifest signing, and dynamic evaluation hooks so the assistant runs fully client side.
2. **Sprint 2 Pharmacy First Publication Pipeline** - Publish the initial Pharmacy First pathways as versioned YAML with validation and regression coverage.
3. **Sprint 3 OTC Library Expansion and Scenario Presets** - Add the high-volume OTC packs and enrich the scenario presets that demonstrate supply, delayed prescribing, and referral outcomes.
4. **Sprint 4 Intake Experience and Deterministic Engine Polish** - Refine clarifier prompts, audit-ready notes, and deterministic evaluation flows to match clinical governance expectations.
5. **Sprint 5 NLP-Assisted Intake** - Replace regex heuristics with the scispaCy powered pipeline and wire transcript guidance into manual and automated QA.
6. **Sprint 6 Offline Cache Strategy and Release Hardening** - Finalize cache manifests, version banners, and governance artifacts needed for trusted deployments.

## Sprint 1 Offline Shell and Rule Pack Loader
**Goal:** Deliver an offline-first consultation shell that can safely load and execute signed rule packs without server dependencies.

**Exit Criteria:** The service worker precaches the assistant shell, the manifest advertises offline capability, and the evaluator only executes packs that pass signature checks.

### Task 1.1 Harden the PWA shell around the consultation assistant
- Audit the service worker to confirm `index.html`, rule packs, and intake assets are precached for offline launch.
- Verify the web app manifest surfaces correct icons, Pharmacy First branding, and install prompts for desktop kiosks.
- Extend smoke tests under `tests/pipeline.test.html` to assert the offline shell renders required consultation components.

### Task 1.2 Enforce signed rule pack delivery before evaluation
- Maintain the signature verification flow so JSON packs cannot execute until validated against the rule pack manifest.
- Document the signing process in `docs/` for clinical governance review and incorporate it into release checklists.
- Add regression coverage that loads tampered packs to confirm the evaluator refuses execution and reports errors.

### Task 1.3 Keep intake and evaluator bindings working without a server
- Confirm the interactive intake reads from cached schema definitions and persists state locally.
- Ensure the deterministic engine can run the cached Pharmacy First pathways end to end in airplane mode.
- Capture any offline error handling gaps in the TODO backlog for follow up.

## Sprint 2 Pharmacy First Publication Pipeline
**Goal:** Publish the Pharmacy First pathways as versioned YAML, convert them to JSON for the browser, and guarantee deterministic outputs across updates.

**Exit Criteria:** Sore throat, acute sinusitis, earache/AOM, impetigo, infected insect bite, shingles, and uncomplicated UTI packs are published with schema validation, snapshots, and manifest entries.

### Task 2.1 Stand up the YAML authoring workflow for Pharmacy First rule packs
- Finalize the rule pack schema in `assets/js/rules/` and expose it as YAML templates for authors.
- Create linting and validation scripts that reject schema violations before packs are added to the manifest.
- Update documentation in `docs/` so clinical authors can draft pathways using the approved structure.

### Task 2.2 Implement the YAML to JSON compiler and regression harness
- Build the compiler that transforms YAML packs into the JSON format consumed by the browser evaluator.
- Add snapshot coverage that compares compiled output against expected json-logic payloads per pathway.
- Integrate the compiler into CI so publishing a pack rebuilds the manifest automatically.

### Task 2.3 Wire Pharmacy First packs into the assistant experience
- Surface version numbers, red flag messaging, and recommended actions from the published packs inside `index.html`.
- Extend the consultation note generator to include rule pack IDs and evaluation traces for each Pharmacy First pathway.
- Verify scenario presets activate the new packs so demo journeys showcase supply and referral outcomes.

## Sprint 3 OTC Library Expansion and Scenario Presets
**Goal:** Add the high-volume OTC pathways and ensure the assistant can demonstrate diverse consultation journeys out of the box.

**Exit Criteria:** Cough/cold, diarrhoea, constipation, dyspepsia, headache, primary dysmenorrhoea, low back pain/sprains, eczema, tinea pedis, minor burns, allergic rhinitis, conjunctivitis, and dry eye packs are available with preset journeys and documentation.

### Task 3.1 Author and validate the extended OTC rule packs
- Follow the YAML workflow to draft each OTC pathway with safety netting, supply criteria, and referral triggers.
- Expand snapshot coverage to include the new packs and guard against regressions in red flag handling.
- Update the rule pack manifest with metadata for pack ownership, versioning, and published dates.

### Task 3.2 Expand scenario presets for intake demonstrations
- Add preset chips in `index.html` that preload representative journeys across supply, delayed prescribing, and referral.
- Ensure presets set the correct findings so the deterministic engine exercises the new packs end to end.
- Document each preset in the README to help pharmacists run training sessions quickly.

### Task 3.3 Refresh consultation note outputs for the broader library
- Update the note generator to surface pack names, supply decisions, and safety netting guidance per OTC condition.
- Verify the markdown-style output copies cleanly into PharmOutcomes and Sonar without formatting loss.
- Capture QA sign-off for each pathway in `docs/` with manual testing logs.

## Sprint 4 Intake Experience and Deterministic Engine Polish
**Goal:** Strengthen the interactive intake and deterministic evaluation experience so pharmacists can complete consultations quickly and confidently.

**Exit Criteria:** Clarifier prompts cover missing findings, accessibility audits pass, and the evaluation engine exposes transparent decision traces for every rule pack.

### Task 4.1 Improve the intake UI for speed and accessibility
- Refine clarifier chips to highlight missing data and anchor users to relevant sections within the intake form.
- Ensure keyboard navigation and screen reader labels cover demographics, presenting complaint, and rule-pack specific findings.
- Add automated checks that confirm required intake fields are present before evaluation runs.

### Task 4.2 Enhance deterministic evaluation transparency
- Extend the evaluation trace so pharmacists can review the rules triggered for each decision.
- Surface red flag explanations inline with the rule pack outputs inside the consultation summary.
- Update audit logs to store rule pack version, evaluator timestamp, and user-provided safety netting notes.

### Task 4.3 Polish documentation and governance artifacts
- Refresh `docs/` with intake guidance, consultation note templates, and pathway-specific clarifications.
- Review `README.md` to ensure it reflects the evolved intake and evaluation capabilities.
- Align `TODO.md` entries with emerging polish tasks to keep planning artifacts consistent.

## Sprint 5 NLP-Assisted Intake
**Goal:** Integrate the scispaCy, medspaCy, dateparser, and pyahocorasick pipeline to assist with transcript-driven intake while preserving deterministic outputs.

**Exit Criteria:** The NLP pipeline can extract demographics and findings from transcripts, highlight confidence levels, and fall back to manual clarifiers when entities are uncertain.

### Task 5.1 Bundle the NLP dependencies for client-side execution
- Package the lightweight spaCy models, entity rules, and dictionaries for offline use within the service worker cache.
- Provide a build step that prepares WebAssembly assets or alternative browser-compatible modules as needed.
- Add smoke tests that confirm the assistant loads NLP assets without network access.

### Task 5.2 Map NLP entities into the intake schema
- Translate extracted entities into the existing intake JSON structure while preserving manual override controls.
- Highlight low confidence findings so pharmacists can review and amend suggestions before evaluation.
- Log NLP provenance alongside deterministic rule pack results for audit.

### Task 5.3 Publish NLP intake guidance and automated coverage
- Document authoring rules, annotation shortcuts, and failure modes in `docs/nlp-intake.md`.
- Add automated transcript suites in `tests/nlp-parser.test.html` to cover positive, negative, and ambiguous cases.
- Incorporate NLP QA status into release checklists to support governance reviews.

## Sprint 6 Offline Cache Strategy and Release Hardening
**Goal:** Finalize offline cache controls, versioning signals, and governance steps so the assistant can be deployed to production pharmacy estates.

**Exit Criteria:** Cache manifests cover rule packs, NLP assets, and dictionaries; version banners communicate pack freshness; and release documentation meets governance standards.

### Task 6.1 Author the offline cache manifest and rotation policy
- Define cache groups for rule packs, NLP assets, and UI chrome with explicit version hashes.
- Implement cache rotation rules that purge stale packs when new manifests are published.
- Document manual cache reset procedures for IT support teams.

### Task 6.2 Surface version awareness in the assistant UI
- Add version banners in `index.html` that show rule pack and NLP pipeline versions currently cached.
- Provide a notification pattern for when updated packs are available and prompt pharmacists to refresh.
- Ensure offline mode clearly indicates the timestamp of the currently active manifest.

### Task 6.3 Complete release governance and QA sign-off
- Update `docs/` with release checklists, rollback plans, and auditing requirements for Pharmacy First deployments.
- Conduct cross-browser and device smoke tests, capturing evidence in the documentation set.
- Review `TODO.md` and close out remaining roadmap items once governance approvals are secured.
