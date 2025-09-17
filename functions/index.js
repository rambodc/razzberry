// functions/index.js (ESM)
// Export production functions

import { createTransakSession } from './transak.js';
import { fireblocksPing as _fireblocksPing, fireblocksCreateOrGetVaults as _fireblocksCreateOrGetVaults } from './fireblocks.js';

// Activate main Transak function under name `transak`
export const transak = createTransakSession;
export const fireblocksPing = _fireblocksPing;
export const fireblocksCreateOrGetVaults = _fireblocksCreateOrGetVaults;
