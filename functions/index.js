// functions/index.js (ESM)
// Export production functions

import { createTransakSession } from './transak.js';

// Activate main Transak function under name `transak`
export const transak = createTransakSession;
