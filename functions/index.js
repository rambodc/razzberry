// functions/index.js
// Keep this file tiny: just import and re-export each function.

const { transcodeArtistIntroV2 } = require('./artistIntro');
const { transakWebhook, createTransakSession } = require('./transak');

exports.transcodeArtistIntroV2 = transcodeArtistIntroV2;
exports.transakWebhook = transakWebhook;
exports.createTransakSession = createTransakSession;

// Later, you can add more
