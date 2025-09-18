// functions/index.js (ESM)
// Export production functions

import { createTransakSession } from './transak.js';
import {
  fireblocksPing as _fireblocksPing,
  fireblocksCreateOrGetVaults as _fireblocksCreateOrGetVaults,
  fireblocksCreateDepositHandle as _fireblocksCreateDepositHandle,
  fireblocksXrplTransferTest as _fireblocksXrplTransferTest,
} from './fireblocks.js';

// Activate main Transak function under name `transak`
export const transak = createTransakSession;
export const fireblocksPing = _fireblocksPing;
export const fireblocksCreateOrGetVaults = _fireblocksCreateOrGetVaults;
export const fireblocksCreateDepositHandle = _fireblocksCreateDepositHandle;
export const fireblocksXrplTransferTest = _fireblocksXrplTransferTest;
