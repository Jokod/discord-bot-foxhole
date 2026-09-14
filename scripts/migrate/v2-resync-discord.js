/**
 * Discord message resync after migrate-v2 DB changes.
 *
 * Resync is performed automatically on bot startup via events/onReady.js:
 *   - syncAllStockpileLists(client)
 *   - syncAllOrderBoards(client)
 *
 * Restart the bot after running scripts/migrate-v2.js — no separate Discord API
 * rewrite is required from this stub.
 *
 *   node scripts/migrate-v2-resync-discord.js
 */
'use strict';

console.log('[migrate-v2-resync-discord] Resync happens on bot ready:');
console.log('  - syncAllStockpileLists (utils/stockpileListSync.js)');
console.log('  - syncAllOrderBoards (utils/orderBoardSync.js)');
console.log('Restart the bot after migrate-v2.js to refresh Discord messages.');
process.exit(0);
