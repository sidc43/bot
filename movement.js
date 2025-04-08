// movement.js
const { Movements, goals, pathfinder } = require('mineflayer-pathfinder');
const minecraftData = require('minecraft-data');

function registerMovement(bot) {
  bot.on('chat', (username, message) => {
    if (username === bot.username) return;

    if (message === 'follow me') {
      bot.pauseIdle?.(); // ⏸️ Pause idle

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

    if (message === 'stop following me') {
      bot.pathfinder.stop();
      bot.resumeIdle?.(); // ▶️ Resume idle
      bot.chat('Stopped following you, ' + username + '!');
    }

    if (message === 'come to me') {
      bot.pauseIdle?.(); // ⏸️ Pause idle

      if (bot.isGuarding) {
        bot.chat("I'm guarding right now. Say 'stop guarding' first.");
        return;
      }

      const target = bot.players[username]?.entity;
      if (!target) {
        bot.chat(`I can't see you, ${username}!`);
        return;
      }

      const distance = bot.entity.position.distanceTo(target.position);
      const speed = 5.2; // sprint+jump speed estimate
      const eta = (distance / speed).toFixed(1);

      const mcData = minecraftData(bot.version);
      const defaultMove = new Movements(bot, mcData);
      bot.pathfinder.setMovements(defaultMove);

      const { GoalNear } = goals;
      const pos = target.position;
      const goal = new GoalNear(pos.x, pos.y, pos.z, 1);
      bot.pathfinder.setGoal(goal);

      bot.chat(`Coming to you, ${username}! ETA: ${eta} seconds`);
    }

    if (message === 'stop moving') {
      bot.pathfinder.setGoal(null);
      bot.resumeIdle?.(); // ▶️ Resume idle
      bot.chat("Okay, I've stopped.");
    }
  });
}

module.exports = { registerMovement };
