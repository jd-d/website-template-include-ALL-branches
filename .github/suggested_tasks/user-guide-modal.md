---
title: Deliver dedicated in-app user guide for the calculator
labels:
  - priority: high
  - feature
body: |
  ## Summary
  Replace the existing "How to use this tool" link with a modal or overlay that presents a comprehensive user guide distinct from the README.

  ## Acceptance Criteria
  - The guide launches from the "How to use this tool" control without navigating away from the calculator.
  - Content covers every major feature in plain language with industry context for newcomers and links to deeper resources.
  - Copy updates can be managed from a single source of truth (markdown/JSON) and are localized for EN/ES.
  - Accessibility: focus is trapped inside the modal, escape closes it, and content is screen-reader friendly.

  ## Implementation Notes
  - Consider using an existing modal component or introduce one if needed.
  - Coordinate with content to finalize guide sections before final QA.
---
