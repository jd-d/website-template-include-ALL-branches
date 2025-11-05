---
title: Implement interactive Run Tutorial tour with overlays
labels:
  - priority: high
  - onboarding
body: |
  ## Summary
  Add a Run Tutorial button that drives a guided walkthrough of the calculator via highlight overlays, forward/back navigation, and contextual explanations.

  ## Acceptance Criteria
  - Run Tutorial control appears prominently near the top of the app and starts the tour on click.
  - Each step highlights the relevant UI region, explains its purpose, and allows the user to move forward or back.
  - Tutorial adapts to desktop and mobile layouts without clipping or off-screen content.
  - Tutorial progress can be exited and resumed gracefully, and analytics hooks capture completion.

  ## Implementation Notes
  - Evaluate using an existing tour library or lightweight custom implementation that supports accessibility requirements.
  - Coordinate steps with the new user guide so messaging stays consistent.
---
