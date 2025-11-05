# TODO

## Roadmap Overview
This roadmap tracks delivery of the UK Community Pharmacy OTC Decision Support Assistant.

### Upcoming
- [ ] Publish the OTC dyspepsia self-care rule pack with alginate/PPI decision support and schema coverage.
- [ ] Publish the OTC headache and migraine relief rule pack including red flag escalation and triptan exclusions.
- [ ] Publish the OTC primary dysmenorrhoea rule pack covering NSAID eligibility and safety netting.
- [ ] Publish the OTC low back pain and minor sprains rule pack covering heat therapy, NSAIDs, and manual referral triggers.
- [ ] Publish the OTC eczema flare management rule pack including emollient selection and steroid guardrails.
- [ ] Publish the OTC tinea pedis rule pack with antifungal selection guidance and hygiene advice.
- [ ] Publish the OTC minor burns and scalds rule pack covering first aid, dressing supply, and referral cues.
- [ ] Publish the OTC allergic rhinitis rule pack including antihistamine and intranasal corticosteroid pathways.
- [ ] Publish the OTC conjunctivitis rule pack covering viral, allergic, and bacterial differentials with product guidance.
- [ ] Publish the OTC dry eye rule pack with lubricant laddering and red flag screening.
- [ ] Fold the guided walkthrough copy into the published documentation set once the overlay ships to production.
- [ ] Replace the front-end regex intake with a scispaCy + medspaCy + dateparser + pyahocorasick pipeline bundled for client-side execution and wired into the intake schema.
- [ ] Ship NLP intake suggestions guidance and automated coverage.
- [ ] Promote the in-browser NLP parser harness to automated regression coverage once the end-to-end flow is stable.
- [ ] Harden the JSON rule pack compiler with schema validation and snapshot tests across all supported pack types.

## DONE
- [x] Ship the offline-first PWA foundation (service worker, precache strategy, manifest metadata). (2025-03-05)
- [x] Implement rule-pack manifest signing and client-side signature verification prior to executing any downloaded pack. (2025-03-05)
- [x] Refactor the evaluator to load json-logic-compatible packs dynamically so that adding a new pathway requires only publishing YAML/JSON content. (2025-03-05)
- [x] Build interactive intake prototype that consumes the published schema and renders clarifier prompts. (2025-02-15)
- [x] Publish static MVP design document landing page. (2025-10-28)
- [x] Draft the offline cache strategy covering rule packs, dictionaries, and version banners. (2025-03-18)
- [x] Publish the Pharmacy First rule packs (sore throat, acute sinusitis, earache/AOM, impetigo, infected insect bite, shingles, uncomplicated UTI) through the versioned JSON pipeline with schema validation and snapshot coverage. (2025-11-02)
- [x] Publish the initial OTC self-care rule packs (cold symptoms, acute diarrhoea, functional constipation) through the signed JSON manifest workflow. (2025-11-02)
