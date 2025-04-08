// movement.js
const { Movements, goals } = require('mineflayer-pathfinder');
const minecraftData = require('minecraft-data');

function registerMovement(bot) {
  bot.on('chat', (username, message) => {
    if (username === bot.username) return;

    if (message === 'follow me') {
      const target = bot.players[username]?.entity;
      if (!target) {
        bot.chat(`I can't see you, ${username}!`);
        return;
      }

      const mcData = minecraftData(bot.version);
      const defaultMove = new Movements(bot, mcData);
      bot.pathfinder.setMovements(defaultMove);

      const { GoalFollow } = goals;
      const followGoal = new GoalFollow(target, 1);
      bot.pathfinder.setGoal(followGoal, true);
      bot.chat(`Following you, ${username}!`);
    }
  });
}

module.exports = { registerMovement };
