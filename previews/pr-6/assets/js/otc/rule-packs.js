export const RULE_PACKS = [
  {
    id: 'uti_women_16_64',
    name: 'Uncomplicated UTI (Women 16 to 64)',
    version: '1.1.0',
    effectiveFrom: '2025-02-01',
    lastReviewed: '2025-02-12',
    complaint: {
      id: 'urinary_symptoms',
      label: 'Urinary symptoms'
    },
    description:
      'Pharmacy First pathway for dysuria and frequency in non-pregnant women aged 16 to 64 with no systemic features.',
    inclusion: [
      'Women aged 16 to 64 presenting with dysuria, frequency, or urgency.',
      'Symptoms present for less than 28 days with no severe systemic illness.',
      'Able to take Nitrofurantoin MR 100 mg twice daily for 3 days.'
    ],
    exclusion: [
      'Pregnancy or suspected pregnancy.',
      'Fever, loin pain, rigors, or visible haematuria.',
      'Indwelling catheter, recurrent UTI (≥2 in 6 months or ≥3 in 12 months), or known renal impairment.',
      'Diabetes with poor control, immunocompromise, or male/urosepsis risk.'
    ],
    safetyNetting: [
      'Seek urgent care if new fever, vomiting, flank pain, or systemic upset develops.',
      'Contact the service if no improvement within 48 hours of starting treatment.',
      'Attend emergency care if unable to pass urine, confused, or systemically unwell.'
    ],
    sections: [
      {
        id: 'symptoms',
        title: 'Core urinary symptoms',
        questions: [
          {
            id: 'dysuria',
            type: 'boolean',
            label: 'Pain or burning when passing urine',
            required: true
          },
          {
            id: 'frequency',
            type: 'boolean',
            label: 'Need to urinate more often than usual',
            required: true
          },
          {
            id: 'urgency',
            type: 'boolean',
            label: 'Urgency or difficulty holding urine',
            required: false
          },
          {
            id: 'visibleHaematuria',
            type: 'boolean',
            label: 'Visible blood in urine',
            required: false,
            flagType: 'red'
          },
          {
            id: 'fever',
            type: 'boolean',
            label: 'Fever or shivering',
            required: false,
            flagType: 'red'
          },
          {
            id: 'loinPain',
            type: 'boolean',
            label: 'Loin or flank pain',
            required: false,
            flagType: 'red'
          },
          {
            id: 'vaginalDischarge',
            type: 'boolean',
            label: 'Vaginal discharge',
            required: false
          },
          {
            id: 'durationDays',
            type: 'number',
            label: 'Symptom duration (days)',
            min: 0,
            max: 60,
            helper: 'Value used to confirm suitability for Pharmacy First supply.',
            required: true
          }
        ]
      },
      {
        id: 'history',
        title: 'History and risk factors',
        questions: [
          {
            id: 'recurrentUti',
            type: 'boolean',
            label: 'History of recurrent UTI',
            helper: '≥2 in 6 months or ≥3 in 12 months',
            required: false
          },
          {
            id: 'diabetes',
            type: 'boolean',
            label: 'Diabetes (poorly controlled)',
            required: false
          },
          {
            id: 'renalImpairment',
            type: 'select',
            label: 'Known renal impairment',
            options: [
              { value: 'no', label: 'No' },
              { value: 'yes', label: 'Yes' },
              { value: 'unknown', label: 'Unknown' }
            ],
            required: false
          },
          {
            id: 'indwellingCatheter',
            type: 'boolean',
            label: 'Indwelling catheter in situ',
            required: false
          },
          {
            id: 'immunocompromised',
            type: 'boolean',
            label: 'Immunocompromised or frail',
            required: false
          },
          {
            id: 'recentUti',
            type: 'boolean',
            label: 'UTI treated within the last 4 weeks',
            required: false
          }
        ]
      }
    ]
  },
  {
    id: 'sore_throat_feverpain',
    name: 'Sore throat (FeverPAIN score)',
    version: '1.0.0',
    effectiveFrom: '2025-01-10',
    lastReviewed: '2025-02-05',
    complaint: {
      id: 'sore_throat',
      label: 'Sore throat'
    },
    description:
      'FeverPAIN pathway for acute sore throat in patients aged 5 years and over, aligned to Pharmacy First England.',
    inclusion: [
      'Age 5 years and above with acute sore throat or tonsillitis symptoms for 10 days or fewer.',
      'No features suggesting severe sepsis, airway compromise, or peritonsillar abscess.',
      'Able to take Phenoxymethylpenicillin or an alternative if indicated.'
    ],
    exclusion: [
      'Difficulty breathing, drooling, stridor, or severe dysphagia.',
      'Immunocompromise, post-transplant status, or intensive chemotherapy.',
      'Recurrent quinsy, scarlet fever outbreak, or sore throat lasting more than 10 days.',
      'Immediate hospital referral required for suspected epiglottitis or severe systemic illness.'
    ],
    safetyNetting: [
      'Seek urgent help if breathing becomes difficult, stridor develops, or unable to swallow fluids.',
      'Consult GP or urgent care if symptoms worsen after 48 hours of treatment or persist beyond 1 week.',
      'Return sooner if a rash, ear pain, or swelling develops.'
    ],
    sections: [
      {
        id: 'red-flags',
        title: 'Red flags',
        questions: [
          {
            id: 'airwayCompromise',
            type: 'boolean',
            label: 'Airway compromise, drooling, or stridor',
            required: false,
            flagType: 'red'
          },
          {
            id: 'systemicallyUnwell',
            type: 'boolean',
            label: 'Systemically very unwell',
            required: false,
            flagType: 'red'
          },
          {
            id: 'immunocompromise',
            type: 'boolean',
            label: 'Known immunocompromise',
            required: false
          }
        ]
      },
      {
        id: 'feverpain',
        title: 'FeverPAIN criteria',
        questions: [
          {
            id: 'fever',
            type: 'boolean',
            label: 'Fever within the last 24 hours',
            required: false
          },
          {
            id: 'purulence',
            type: 'boolean',
            label: 'Pus on tonsils',
            required: false
          },
          {
            id: 'rapidOnset',
            type: 'boolean',
            label: 'Symptoms began within the last 3 days',
            required: false
          },
          {
            id: 'inflamedTonsils',
            type: 'boolean',
            label: 'Severely inflamed tonsils',
            required: false
          },
          {
            id: 'noCough',
            type: 'boolean',
            label: 'Absence of cough or coryza',
            required: false
          }
        ]
      },
      {
        id: 'history',
        title: 'History and duration',
        questions: [
          {
            id: 'durationDays',
            type: 'number',
            label: 'Symptom duration (days)',
            min: 0,
            max: 21,
            required: true
          },
          {
            id: 'previousStrep',
            type: 'boolean',
            label: 'Scarlet fever or positive strep test in the last 30 days',
            required: false
          },
          {
            id: 'antibioticAllergy',
            type: 'select',
            label: 'Penicillin allergy',
            options: [
              { value: 'no', label: 'No' },
              { value: 'yes', label: 'Yes' },
              { value: 'unknown', label: 'Unknown' }
            ],
            required: false
          }
        ]
      }
    ]
  }
];

export function getComplaintOptions() {
  const seen = new Map();
  for (const pack of RULE_PACKS) {
    if (!seen.has(pack.complaint.id)) {
      seen.set(pack.complaint.id, {
        id: pack.complaint.id,
        label: pack.complaint.label
      });
    }
  }
  return Array.from(seen.values());
}

export function getRulePackById(id) {
  return RULE_PACKS.find((pack) => pack.id === id) || null;
}

export function getRulePacksForComplaint(complaintId) {
  return RULE_PACKS.filter((pack) => pack.complaint.id === complaintId);
}
