# NLP intake parser

This note captures the scope of the natural language intake parser, the heuristics that drive it, and guidance for preparing
transcripts that let the workflow suggest structured answers with minimal cleanup.

## Parser scope

- Extracts patient demographics (age, sex, pregnancy) with confidence scores so the UI can flag low-certainty detections.
- Infers the presenting complaint and rule pack by matching curated keyword bundles tied to Pharmacy First pathways.
- Suggests yes/no answers for required clinical questions, plus duration values when the transcript states symptom timelines.
- Raises warnings when evidence conflicts (for example pregnancy language in a male transcript) and lists data points that
  were not confidently detected for follow-up inside the intake form.

## Heuristic coverage

The parser is deterministic and rule-based so behaviour can be audited without opaque models.

- **Keyword hints** weight phrases for each supported rule pack (UTI in women 16–64 and FeverPAIN sore throat). The pack with
  the highest cumulative strength is selected when its threshold is met.
- **Symptom cues** run targeted regular expressions that look for positive and negative wording, with optional negation checks
  to avoid false positives when patients deny symptoms.
- **Duration detection** promotes timeline mentions (for example "for 3 days") into structured values when they fall within
  clinically relevant ranges.
- **Patient attribute cues** apply curated vocabularies (for example pronouns for sex detection) and verify combinations to
  surface warnings when mutually exclusive states appear together.

## Authoring transcripts for strong suggestions

To maximise the accuracy of suggestions produced by the parser:

- State the patient age explicitly once ("28 year old") instead of relying on indirect references.
- Use unambiguous gendered terms or pronouns only when they reflect the patient record to avoid conflicting cues.
- Call out pregnancy status even when negative so the parser can clear the related missing-data warning.
- Describe core symptoms using the vocabulary the intake form expects (for example "burning when passing urine" for UTI,
  "no cough" for FeverPAIN) and mention notable negatives for red flag questions.
- Include rough durations for symptom onset ("for 2 days") so timeline questions auto-populate during intake.

## Sample transcripts

Use the bundled sample transcripts during manual QA and when validating future heuristics.

### Uncomplicated UTI (sample id: uti_classic)
```
28 year old female reports burning when passing urine and needing to pee every hour for the last 2 days. Denies fever, loin pain, or vaginal discharge. Not pregnant.
```

### FeverPAIN sore throat (sample id: feverpain_high)
```
22-year-old woman with sore throat starting 2 days ago. Reports fever yesterday, pus on her tonsils, very inflamed throat, and no cough. Denies breathing difficulty or immunocompromise.
```

### Ambiguous overlapping complaints (sample id: ambiguous_dual)
```
35 yo male complains of throat irritation but mostly burning urine for 3 days. Mentions urinary frequency and no visible blood in urine. Pregnancy test negative.
```

## Manual QA steps

Follow this checklist during releases to confirm the NLP workflow still applies suggestions correctly:

1. Serve the project root with a static server (for example `npx http-server`).
2. Open `tests/nlp-parser.test.html` in a modern browser and confirm all automated checks report as passed.
3. Launch `index.html`, load the urinary symptoms and sore throat scenario transcripts from this document, and paste them into
   the "Consultation transcript" textarea to observe applied and pending suggestions.
4. Dismiss at least one suggested answer in the UI, then re-apply it to confirm state transitions persist on repeated parses.
5. Record outcomes in `docs/manual-test-log.txt` so regressions can be traced back to a specific release candidate.
