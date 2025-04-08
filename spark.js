const mineflayer = require('mineflayer');
const { pathfinder } = require('mineflayer-pathfinder');

const { registerPvp } = require('./pvp'); // PVP - JOE
const { registerMovement } = require('./movement'); // MOVEMENT - JOE
const { registerEventLog } = require('./eventlog'); // MEMORY - JOE
const { registerIdle } = require('./idle'); // AUTOPILOT - JOE



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
  registerEventLog(bot);
  registerMovement(bot);
  registerPvp(bot);
  registerIdle(bot);
});
