---
title: Add gross/net planning toggle to the lead income card
labels:
  - priority: high
  - feature
body: |
  ## Summary
  Introduce a gross/net toggle for the first planning card so users can enter values from a gross-income perspective and see recalculated outputs instantly.

  ## Acceptance Criteria
  - Toggle switches field labels, helper text, and calculations between gross-focused and net-focused planning modes.
  - Downstream totals stay consistent with the selected mode, including taxes, presets, and exported summaries.
  - State persists across navigation, language, and theme switches.
  - Automated tests cover both modes for regression protection.

  ## Implementation Notes
  - Audit existing presets and calculators to confirm they accept gross-mode inputs without breaking assumptions.
  - Coordinate with design for copy updates and ensure localization coverage.
---
