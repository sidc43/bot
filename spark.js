const mineflayer = require('mineflayer');
const { pathfinder } = require('mineflayer-pathfinder');

const { registerMovement } = require('./movement'); // import "cog"

const bot = mineflayer.createBot({
  host: 'localhost',
  port: 60060,
  username: 'Bot',
});

bot.loadPlugin(pathfinder);

bot.on('login', () => {
  console.log('Bot has logged in');
});

bot.on('spawn', () => {
  console.log('Bot has spawned');
  bot.chat('Hello, I am a bot!');
  
  // Register "cogs" here
  registerMovement(bot);
});
