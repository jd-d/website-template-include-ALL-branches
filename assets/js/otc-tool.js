import { initializeUi } from './otc/ui.js';
import { initializeTranscriptController } from './otc/transcript-controller.js';

initializeTranscriptController();

initializeUi().catch((error) => {
  console.error('Failed to initialise OTC Flow UI', error);
  const status = document.querySelector('#sr-status');
  if (status) {
    status.textContent = 'Failed to initialise rule packs. Reload the page to try again.';
  }
});
