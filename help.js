const mineflayer = require('mineflayer');

function help(commands, bot) {
  bot.on('chat', (username, message) => {
    if (username === bot.username) return;

    if (message === "help") {
      for (const c of commands) {
        bot.chat(c?.command + ": " + c?.desc);
      }
    }
  });
}

module.exports = { help };