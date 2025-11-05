import { getRulePackById } from './rule-packs.js';

const CONFIDENCE_LEVELS = {
  explicit: 0.95,
  strong: 0.85,
  moderate: 0.75,
  weak: 0.6,
  conflict: 0.35,
  none: 0
};

const NEGATION_PATTERN = /\b(?:no|not|denies?|denied|without|absence of|free of|negative for)\b/i;
const FEMALE_TERMS = [
  'female',
  'woman',
  'women',
  'lady',
  'girl',
  'she',
  'her'
];
const MALE_TERMS = ['male', 'man', 'men', 'gent', 'gentleman', 'boy', 'he', 'him'];

const AGE_PATTERNS = [
  { regex: /\bage(?:d|:)?\s*(\d{1,3})\b/gi, strength: 'explicit' },
  { regex: /\b(\d{1,3})[- ]?year[- ]?old\b/gi, strength: 'explicit' },
  { regex: /\b(\d{1,3})\s*(?:years?|yrs?)\s*(?:old|of age)?\b/gi, strength: 'explicit' },
  { regex: /\b(\d{1,3})\s*y\/?o\b/gi, strength: 'strong' },
  { regex: /\b(mid|late|early)\s*(\d{2})s\b/gi, strength: 'weak', transform: inferDecadeAge }
];

const PREGNANCY_PATTERNS = [
  { regex: /\b(pregnant|pregnancy|expecting)\b/gi, value: 'yes', strength: 'explicit' },
  { regex: /\b(denies|not|no)\s+(?:currently\s+)?pregnant\b/gi, value: 'no', strength: 'explicit', skipNegationCheck: true },
  { regex: /\bnegative\s+pregnancy\s+test\b/gi, value: 'no', strength: 'strong', skipNegationCheck: true },
  { regex: /\bpregnancy\s+test\s+negative\b/gi, value: 'no', strength: 'strong', skipNegationCheck: true }
];

const UTI_SYMPTOM_CUES = {
  dysuria: [
    cueYes(/\bdysuria\b/gi, 'explicit'),
    cueYes(/\bburning\b[^.]{0,30}\b(?:urine|urinating|peeing|passing urine)\b/gi, 'strong'),
    cueYes(/\bpain\b[^.]{0,30}\b(?:urinating|passing urine|peeing)\b/gi, 'strong'),
    cueNo(/\bno\s+(?:dysuria|pain\s+(?:when|on)\s+(?:urinating|passing urine|peeing))\b/gi, 'strong'),
    cueNo(/\bdenies\b[^.]{0,30}\b(dysuria|pain\s+(?:when|on)\s+(?:urinating|passing urine|peeing))\b/gi, 'strong')
  ],
  frequency: [
    cueYes(/\b(?:urinating|peeing|passing urine)\b[^.]{0,30}\b(more|often|frequently)\b/gi, 'strong'),
    cueYes(/\b(?:peeing|urinating|pee)\b[^.]{0,20}\b(?:every|each)\b[^.]{0,10}\b(?:hour|couple of hours)\b/gi, 'moderate'),
    cueYes(/\bpee\b[^.]{0,15}\b(?:every|each)\b[^.]{0,6}\bhour\b/gi, 'moderate'),
    cueYes(/\burgency\b/gi, 'moderate'),
    cueNo(/\bno\s+(?:change|increase)\s+in\s+(?:urination|peeing)\b/gi, 'strong'),
    cueNo(/\bdenies\b[^.]{0,30}\b(?:frequency|urgent need to pee)\b/gi, 'strong')
  ],
  urgency: [
    cueYes(/\burgenc(?:y|ies)\b/gi, 'strong'),
    cueYes(/\bstruggling\s+to\s+hold\s+urine\b/gi, 'moderate'),
    cueNo(/\bno\s+(?:urgency|issues\s+holding\s+urine)\b/gi, 'strong')
  ],
  visibleHaematuria: [
    cueYes(/\bvisible\s+blood\s+in\s+urine\b/gi, 'explicit'),
    cueYes(/\bhematuria|haematuria\b/gi, 'strong'),
    cueNo(/\bno\s+(?:visible\s+)?blood\s+in\s+urine\b/gi, 'strong'),
    cueNo(/\bdenies\b[^.]{0,30}\b(?:blood\s+in\s+urine|hematuria|haematuria)\b/gi, 'strong')
  ],
  fever: [
    cueYes(/\bfever|pyrexia\b/gi, 'moderate'),
    cueNo(/\bno\s+fever\b/gi, 'strong'),
    cueNo(/\bafebrile\b/gi, 'moderate')
  ],
  loinPain: [
    cueYes(/\bloin\s+pain|flank\s+pain\b/gi, 'strong'),
    cueNo(/\bno\s+(?:loin|flank)\s+pain\b/gi, 'strong')
  ],
  vaginalDischarge: [
    cueYes(/\bvaginal\s+discharge\b/gi, 'moderate'),
    cueNo(/\bno\s+vaginal\s+discharge\b/gi, 'strong')
  ],
  recurrentUti: [
    cueYes(/\brecurrent\s+uti\b/gi, 'moderate'),
    cueYes(/\b(\d+)\s+utis?\s+(?:this|last)\s+(?:year|6\s+months)\b/gi, 'moderate'),
    cueNo(/\bno\s+history\s+of\s+recurrent\s+uti\b/gi, 'strong')
  ],
  diabetes: [
    cueYes(/\b(diabetes|diabetic)\b/gi, 'strong'),
    cueNo(/\bno\s+diabetes\b/gi, 'strong')
  ],
  renalImpairment: [
    cueYes(/\brenal\s+impairment\b/gi, 'strong'),
    cueNo(/\bno\s+known\s+renal\s+issues\b/gi, 'moderate')
  ],
  indwellingCatheter: [
    cueYes(/\bindwelling\s+catheter\b/gi, 'explicit'),
    cueNo(/\bno\s+catheter\b/gi, 'strong')
  ],
  immunocompromised: [
    cueYes(/\bimmunocompromised\b/gi, 'strong'),
    cueNo(/\bnot\s+immunocompromised\b/gi, 'moderate')
  ],
  recentUti: [
    cueYes(/\buti\b[^.]{0,40}\b(last|recent|within)\b[^.]{0,20}\b(\d+)\b/gi, 'moderate'),
    cueNo(/\bno\s+recent\s+uti\b/gi, 'strong')
  ]
};

const SORE_THROAT_CUES = {
  airwayCompromise: [
    cueYes(/\b(drooling|stridor|airway\s+compromise)\b/gi, 'strong'),
    cueNo(/\bno\s+(?:drooling|stridor|airway\s+issues)\b/gi, 'strong'),
    cueNo(/\bdenies\b[^.]{0,30}\b(breathing\s+difficulty|airway\s+(?:issues|compromise))\b/gi, 'strong')
  ],
  systemicallyUnwell: [
    cueYes(/\b(systemically\s+very\s+unwell|toxic\s+appearance)\b/gi, 'strong'),
    cueNo(/\bnot\s+systemically\s+unwell\b/gi, 'strong')
  ],
  immunocompromise: [
    cueYes(/\bimmunocompromised\b/gi, 'strong'),
    cueNo(/\bno\s+immunocompromise\b/gi, 'strong'),
    cueNo(/\bdenies\b[^.]{0,30}\bimmunocompromise\b/gi, 'strong')
  ],
  fever: [
    cueYes(/\bfever\b/gi, 'moderate'),
    cueNo(/\bno\s+fever\b/gi, 'strong'),
    cueNo(/\bafebrile\b/gi, 'moderate')
  ],
  purulence: [
    cueYes(/\bpus\s+on\s+(?:the\s+|her\s+|his\s+)?(?:tonsils|throat)\b/gi, 'explicit'),
    cueYes(/\btonsillar\s+exudate\b/gi, 'strong'),
    cueNo(/\bno\s+(?:pus|exudate)\b/gi, 'strong')
  ],
  rapidOnset: [
    cueYes(/\bonset\s+(?:within|over)\s+(?:the\s+last|past)\s*(?:24|48|3)\s*(?:hours|days)\b/gi, 'strong'),
    cueYes(/\bstarted\s+(?:two|three|\d+)\s+days\s+ago\b/gi, 'moderate'),
    cueYes(/\bstarting\s+(?:two|three|\d+)\s+days\s+ago\b/gi, 'moderate'),
    cueNo(/\bmore\s+than\s+10\s+days\b/gi, 'moderate')
  ],
  inflamedTonsils: [
    cueYes(/\binflamed\s+(?:tonsils|throat)\b/gi, 'strong'),
    cueYes(/\berythematous\s+tonsils\b/gi, 'strong'),
    cueNo(/\btonsils\s+normal\b/gi, 'moderate')
  ],
  noCough: [
    cueYes(/\bno\s+cough\b/gi, 'explicit'),
    cueYes(/\bdenies\s+cough\b/gi, 'strong'),
    cueNo(/\bproductive\s+cough\b/gi, 'moderate'),
    cueNo(/\bpersistent\s+cough\b/gi, 'moderate')
  ],
  previousStrep: [
    cueYes(/\b(strep|scarlet\s+fever)\b[^.]{0,30}\b(last|recent|within)\b/gi, 'moderate'),
    cueNo(/\bno\s+recent\s+(?:strep|scarlet\s+fever)\b/gi, 'strong')
  ],
  antibioticAllergy: [
    cueYes(/\bpenicillin\s+allergy\b/gi, 'explicit'),
    cueNo(/\bno\s+penicillin\s+allergy\b/gi, 'strong')
  ]
};

const RULE_PACK_HINTS = {
  uti_women_16_64: {
    complaintId: 'urinary_symptoms',
    keywords: [
      hint(/\buti\b/gi, 3, 'explicit'),
      hint(/\burinary\s+(?:symptoms|tract\s+infection)\b/gi, 3, 'explicit'),
      hint(/\bburning\s+(?:when|on)\s+(?:urinating|passing urine|peeing)\b/gi, 2, 'strong'),
      hint(/\bburning\s+urine\b/gi, 2, 'strong'),
      hint(/\bdysuria\b/gi, 2, 'strong'),
      hint(/\bwater\s+infection\b/gi, 2, 'moderate'),
      hint(/\bfrequency\s+of\s+urination\b/gi, 1, 'moderate')
    ],
    cues: UTI_SYMPTOM_CUES,
    durationQuestion: 'durationDays'
  },
  sore_throat_feverpain: {
    complaintId: 'sore_throat',
    keywords: [
      hint(/\bsore\s+throat\b/gi, 3, 'explicit'),
      hint(/\btonsillitis\b/gi, 2, 'strong'),
      hint(/\bfeverpain\b/gi, 3, 'explicit'),
      hint(/\bthroat\s+pain\b/gi, 1, 'moderate'),
      hint(/\bstrep\s+throat\b/gi, 2, 'strong')
    ],
    cues: SORE_THROAT_CUES,
    durationQuestion: 'durationDays'
  }
};

const DURATION_PATTERNS = [
  { regex: /for\s+(\d{1,2})\s+days\b/gi, strength: 'strong' },
  { regex: /since\s+(?:the\s+last|past)\s+(\d{1,2})\s+days\b/gi, strength: 'moderate' },
  { regex: /(?:last|past)\s+(\d{1,2})\s+days\b/gi, strength: 'weak' },
  { regex: /(\d{1,2})\s+days\s+ago\b/gi, strength: 'moderate' },
  { regex: /(\d{1,2})\s+day\b/gi, strength: 'weak' }
];

const PATIENT_FIELD_LABELS = {
  'patient.age': 'Patient age',
  'patient.sex': 'Patient sex',
  'patient.pregnant': 'Pregnancy status'
};

function inferDecadeAge(match, phase, decade) {
  const base = parseInt(decade, 10);
  if (Number.isNaN(base)) {
    return null;
  }
  if (phase === 'early') {
    return base;
  }
  if (phase === 'mid') {
    return base + 5;
  }
  if (phase === 'late') {
    return base + 8;
  }
  return base;
}

function scoreFromStrength(strength) {
  return strength ? CONFIDENCE_LEVELS[strength] ?? CONFIDENCE_LEVELS.weak : CONFIDENCE_LEVELS.none;
}

export function scoreAgeConfidence(evidence) {
  return scoreFromStrength(evidence?.strength);
}

export function scoreSexConfidence(evidence) {
  return scoreFromStrength(evidence?.strength);
}

export function scorePregnancyConfidence(evidence) {
  return scoreFromStrength(evidence?.strength);
}

export function scoreSymptomConfidence(evidence) {
  return scoreFromStrength(evidence?.strength);
}

export function scoreRulePackConfidence(evidenceList) {
  if (!evidenceList || evidenceList.length === 0) {
    return CONFIDENCE_LEVELS.none;
  }
  const totalWeight = evidenceList.reduce((sum, item) => sum + (item.weight || 1), 0);
  const strengthBoost = evidenceList.reduce((sum, item) => sum + scoreFromStrength(item.strength || 'weak'), 0) /
    evidenceList.length;
  const capped = Math.min(1, (totalWeight / 6) * 0.6 + strengthBoost * 0.4);
  return Number(capped.toFixed(2));
}

function cueYes(pattern, strength) {
  return { value: 'yes', pattern, strength };
}

function cueNo(pattern, strength) {
  return { value: 'no', pattern, strength, skipNegationCheck: true };
}

function hint(pattern, weight, strength) {
  return { pattern, weight, strength };
}

function normalize(text) {
  return text.replace(/\s+/g, ' ').trim();
}

function isNegated(text, index) {
  const window = text.slice(Math.max(0, index - 40), index);
  return NEGATION_PATTERN.test(window);
}

function detectAge(text) {
  for (const pattern of AGE_PATTERNS) {
    for (const match of text.matchAll(pattern.regex)) {
      const captured = match[1] || match[2];
      const phase = match[1];
      const rawValue = pattern.transform ? pattern.transform(match[0], match[1], match[2]) : parseInt(captured, 10);
      const age = Number.isNaN(rawValue) ? null : rawValue;
      if (age && age > 0 && age < 120) {
        const evidence = { match: match[0], index: match.index, strength: pattern.strength };
        return { value: age, confidence: scoreAgeConfidence(evidence), evidence };
      }
    }
  }
  return null;
}

function detectSex(text) {
  const hits = [];
  for (const term of FEMALE_TERMS) {
    const regex = new RegExp(`\\b${term}\\b`, 'gi');
    if (regex.test(text)) {
      hits.push({ value: 'female', strength: term === 'female' ? 'explicit' : 'strong', term });
    }
  }
  for (const term of MALE_TERMS) {
    const regex = new RegExp(`\\b${term}\\b`, 'gi');
    if (regex.test(text)) {
      hits.push({ value: 'male', strength: term === 'male' ? 'explicit' : 'strong', term });
    }
  }
  if (hits.length === 0) {
    return null;
  }
  const femaleScore = hits.filter((hit) => hit.value === 'female');
  const maleScore = hits.filter((hit) => hit.value === 'male');
  if (femaleScore.length === 0 && maleScore.length === 0) {
    return null;
  }
  const bestGroup = femaleScore.length >= maleScore.length ? femaleScore : maleScore;
  const best = bestGroup[0];
  const evidence = {
    strength: best.strength,
    term: best.term,
    raw: bestGroup.map((h) => h.term),
    allTerms: hits.map((h) => h.term)
  };
  return {
    value: bestGroup === femaleScore ? 'female' : 'male',
    confidence: scoreSexConfidence(evidence),
    evidence
  };
}

function detectPregnancy(text) {
  let best = null;
  for (const pattern of PREGNANCY_PATTERNS) {
    for (const match of text.matchAll(pattern.regex)) {
      if (!pattern.skipNegationCheck && isNegated(text, match.index)) {
        continue;
      }
      const evidence = { strength: pattern.strength, match: match[0] };
      const confidence = scorePregnancyConfidence(evidence);
      if (!best || confidence > best.confidence) {
        best = { value: pattern.value, confidence, evidence };
      }
    }
  }
  return best;
}

function collectRulePackHints(text) {
  let bestPack = null;
  for (const [packId, details] of Object.entries(RULE_PACK_HINTS)) {
    const evidence = [];
    for (const hintItem of details.keywords) {
      const regex = new RegExp(hintItem.pattern.source, hintItem.pattern.flags.includes('g') ? hintItem.pattern.flags : `${hintItem.pattern.flags}g`);
      for (const match of text.matchAll(regex)) {
        evidence.push({ match: match[0], weight: hintItem.weight, strength: hintItem.strength });
      }
    }
    if (evidence.length === 0) {
      continue;
    }
    const confidence = scoreRulePackConfidence(evidence);
    if (!bestPack || confidence > bestPack.confidence) {
      bestPack = {
        id: packId,
        complaintId: details.complaintId,
        evidence,
        confidence
      };
    }
  }
  return bestPack;
}

function detectBooleanAnswer(text, cues) {
  let best = null;
  for (const cue of cues) {
    const pattern = cue.pattern;
    const flags = pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`;
    const regex = new RegExp(pattern.source, flags);
    for (const match of text.matchAll(regex)) {
      if (!cue.skipNegationCheck && isNegated(text, match.index)) {
        continue;
      }
      const evidence = { strength: cue.strength, match: match[0] };
      const confidence = scoreSymptomConfidence(evidence);
      if (!best || confidence > best.confidence) {
        best = { value: cue.value, confidence, evidence };
      }
    }
  }
  return best;
}

function detectDuration(text) {
  for (const pattern of DURATION_PATTERNS) {
    for (const match of text.matchAll(pattern.regex)) {
      const days = parseInt(match[1], 10);
      if (!Number.isNaN(days) && days > 0 && days < 60) {
        const evidence = { strength: pattern.strength, match: match[0] };
        return { value: days, confidence: scoreSymptomConfidence(evidence), evidence };
      }
    }
  }
  return null;
}

function buildAnswerSet(packId, text) {
  const packDetails = RULE_PACK_HINTS[packId];
  if (!packDetails) {
    return {};
  }
  const answers = {};
  const cues = packDetails.cues;
  for (const [questionId, questionCues] of Object.entries(cues)) {
    const result = detectBooleanAnswer(text, questionCues);
    if (result) {
      answers[questionId] = result;
    }
  }
  const duration = detectDuration(text);
  if (duration && packDetails.durationQuestion) {
    answers[packDetails.durationQuestion] = duration;
  }
  return answers;
}

function findRulePackDefinition(packId) {
  if (!packId) {
    return null;
  }
  return getRulePackById(packId);
}

function listRequiredQuestions(pack) {
  if (!pack) {
    return [];
  }
  const required = [];
  for (const section of pack.sections || []) {
    for (const question of section.questions || []) {
      if (question.required) {
        required.push({ id: question.id, label: question.label });
      }
    }
  }
  return required;
}

export function parseTranscript(rawText) {
  const text = normalize(rawText || '');
  const lower = text.toLowerCase();
  const warnings = [];
  const missing = [];

  if (!text) {
    for (const [id, label] of Object.entries(PATIENT_FIELD_LABELS)) {
      missing.push({ id, label, reason: 'not_detected' });
    }
    return {
      patient: {
        age: { value: null, confidence: 0, evidence: null },
        sex: { value: null, confidence: 0, evidence: null },
        pregnant: { value: 'unknown', confidence: 0, evidence: null }
      },
      complaintId: '',
      rulePackId: '',
      answers: {},
      missing,
      warnings
    };
  }

  const age = detectAge(text);
  if (!age) {
    missing.push({ id: 'patient.age', label: PATIENT_FIELD_LABELS['patient.age'], reason: 'not_detected' });
  }

  const sex = detectSex(lower);
  if (!sex) {
    missing.push({ id: 'patient.sex', label: PATIENT_FIELD_LABELS['patient.sex'], reason: 'not_detected' });
  } else {
    const mentionsFemale = sex.evidence?.allTerms?.some((term) => FEMALE_TERMS.includes(term));
    const mentionsMale = sex.evidence?.allTerms?.some((term) => MALE_TERMS.includes(term));
    if (mentionsFemale && mentionsMale) {
      warnings.push('Transcript contains both female and male descriptors; review patient sex.');
    }
  }

  const pregnancy = detectPregnancy(lower) || { value: 'unknown', confidence: 0, evidence: null };
  if (!pregnancy || pregnancy.value === 'unknown') {
    missing.push({ id: 'patient.pregnant', label: PATIENT_FIELD_LABELS['patient.pregnant'], reason: 'not_detected' });
  }

  if (sex && pregnancy.value === 'yes' && sex.value === 'male') {
    warnings.push('Pregnancy detected but patient sex recorded as male.');
  }

  const packGuess = collectRulePackHints(lower);
  const packId = packGuess ? packGuess.id : '';
  const complaintId = packGuess ? packGuess.complaintId : '';
  const answers = packId ? buildAnswerSet(packId, lower) : {};

  const packDefinition = packGuess ? findRulePackDefinition(packGuess.id) : null;
  if (packDefinition) {
    for (const required of listRequiredQuestions(packDefinition)) {
      if (!answers[required.id]) {
        missing.push({ id: required.id, label: required.label, reason: 'not_detected' });
      }
    }
    if (packDefinition.id === 'uti_women_16_64' && sex?.value === 'male') {
      warnings.push('Uncomplicated UTI pack targets women; detected sex is male.');
    }
    if (packDefinition.id === 'uti_women_16_64' && pregnancy.value === 'yes') {
      warnings.push('Uncomplicated UTI pack excludes pregnancy; confirm suitability.');
    }
  }

  return {
    patient: {
      age: age || { value: null, confidence: 0, evidence: null },
      sex: sex || { value: null, confidence: 0, evidence: null },
      pregnant: pregnancy
    },
    complaintId,
    rulePackId: packId,
    answers,
    missing,
    warnings
  };
}

export const SAMPLE_TRANSCRIPTS = [
  {
    id: 'uti_classic',
    description: 'Typical uncomplicated UTI presentation in a non-pregnant adult.',
    text:
      '28 year old female reports burning when passing urine and needing to pee every hour for the last 2 days. Denies fever, loin pain, or vaginal discharge. Not pregnant.',
    expected: {
      complaintId: 'urinary_symptoms',
      rulePackId: 'uti_women_16_64',
      patient: {
        age: 28,
        sex: 'female',
        pregnant: 'no'
      },
      answers: {
        dysuria: 'yes',
        frequency: 'yes',
        fever: 'no',
        loinPain: 'no',
        vaginalDischarge: 'no',
        durationDays: 2
      }
    }
  },
  {
    id: 'feverpain_high',
    description: 'High FeverPAIN score with absence of cough.',
    text:
      '22-year-old woman with sore throat starting 2 days ago. Reports fever yesterday, pus on her tonsils, very inflamed throat, and no cough. Denies breathing difficulty or immunocompromise.',
    expected: {
      complaintId: 'sore_throat',
      rulePackId: 'sore_throat_feverpain',
      patient: {
        age: 22,
        sex: 'female',
        pregnant: 'unknown'
      },
      answers: {
        fever: 'yes',
        purulence: 'yes',
        inflamedTonsils: 'yes',
        noCough: 'yes',
        airwayCompromise: 'no',
        immunocompromise: 'no',
        durationDays: 2
      }
    }
  },
  {
    id: 'ambiguous_dual',
    description: 'Overlapping complaints trigger low-confidence suggestions and warnings.',
    text:
      '35 yo male complains of throat irritation but mostly burning urine for 3 days. Mentions urinary frequency and no visible blood in urine. Pregnancy test negative.',
    expected: {
      complaintId: 'urinary_symptoms',
      rulePackId: 'uti_women_16_64',
      patient: {
        age: 35,
        sex: 'male',
        pregnant: 'no'
      },
      answers: {
        dysuria: 'yes',
        frequency: 'yes',
        visibleHaematuria: 'no',
        durationDays: 3
      }
    }
  }
];
