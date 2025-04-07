const mineflayer = require('mineflayer');

const bot = mineflayer.createBot({
  host: 'localhost', // Minecraft server IP
  port: 25565, // Minecraft server port
  username: 'Bot', // Bot username
});

bot.on('login', () => {
  console.log('Bot has logged in');
}
);
bot.on('spawn', () => {
  console.log('Bot has spawned');
  bot.chat('Hello, I am a bot!');
});
      
bot.on('chat', (username, message) => {
  if (username === bot.username) return; // Ignore messages from the bot itself
  console.log(`${username}: ${message}`);
  if (message === 'hello') {
    bot.chat(`Hello, ${username}!`);
  }
});
