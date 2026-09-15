const levels = require('../../shared/app-levels.json');
function resolveLevel(xp) {
  return Math.min(levels.length, 1 + levels.filter(level => xp >= level.xpNeeded).length);
}
module.exports = { resolveLevel };
