// functions/index.js (ESM)
// Keep this file tiny: just import and re-export each function.

import { onRequest } from 'firebase-functions/v2/https';

// Minimal test function only (to isolate build/deploy)
export const testFunction = onRequest((req, res) => {
  res.status(200).send('ok');
});

// Later, you can add more
