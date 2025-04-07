const mineflayer = require('mineflayer');
const { pathfinder, Movements, goals: { GoalNear, GoalFollow, GoalBlock } } = require('mineflayer-pathfinder');
const pvp = require('mineflayer-pvp').plugin;
const armorManager = require('mineflayer-armor-manager');
const toolPlugin = require('mineflayer-tool').plugin;
const vec3 = require('vec3');

console.log("Starting bot...");

const bot = mineflayer.createBot({
  host: 'localhost',
  port: 60060,
  username: 'Spark',
  version: '1.19.4'
});

bot.loadPlugin(pathfinder);
bot.loadPlugin(pvp);
bot.loadPlugin(armorManager);
bot.loadPlugin(toolPlugin);

bot.once('spawn', () => {
  setInterval(checkAutopilot, 5000);
  console.log("[Bot] Spawned successfully.");
  bot.chat("Hey! I'm Spark, your Minecraft buddy.");
  const defaultMove = new Movements(bot);
  bot.pathfinder.setMovements(defaultMove);
});

bot.on('error', err => console.log("Bot error:", err));
bot.on('end', () => console.log("Bot disconnected."));

let autopilotEnabled = true;
let userHasGivenCommand = false;
let currentTask = "waiting for your next command";


async function craftPickaxe() {
  try {
    // Check for logs and sticks
    const logs = bot.inventory.items().find(i => i.name.endsWith('_log'));
    const stick = bot.inventory.items().find(i => i.name === 'stick');
    if (!logs && !bot.inventory.items().some(i => i.name.endsWith('_planks'))) {
      return bot.chat("Sosj, I need logs or planks to craft a pickaxe.");
    }
    if (!stick) return bot.chat("Sosj, I need sticks to craft a pickaxe.");

    // Convert logs to planks if needed
    let planksId;
    if (logs) {
      planksId = bot.registry.itemsByName[logs.name.replace('_log', '_planks')]?.id;
      if (!planksId) return bot.chat("Sosj, I can't turn that log into planks.");
      const plankRecipe = bot.recipesFor(planksId, null, 4, logs)[0];
      if (!plankRecipe) return bot.chat("Sosj, no plank recipe found.");
      await bot.craft(plankRecipe, 1, null);
    } else {
      // Use planks directly if no logs are found
      planksId = bot.registry.itemsByName['oak_planks']?.id;
    }

    // Ensure Spark has enough planks for crafting a pickaxe
    const planks = bot.inventory.items().find(i => i.name === 'oak_planks');
    if (!planks || planks.count < 3) return bot.chat("Sosj, I need more planks to craft a pickaxe.");

    // Check for crafting table
    const craftingTable = bot.inventory.items().find(i => i.name === 'crafting_table');
    if (!craftingTable) {
      bot.chat("Sosj, I don't have a crafting table, so I'll craft one.");
      
      // Craft crafting table from planks
      const craftingTableRecipe = bot.recipesFor(bot.registry.itemsByName.crafting_table.id, null, 1, planks)[0];
      if (!craftingTableRecipe) return bot.chat("Sosj, I can't craft a crafting table.");
      await bot.craft(craftingTableRecipe, 1, null);
      bot.chat("Sosj, I crafted a crafting table!");
    }

    // Check if a crafting table is nearby first, else place it from inventory
    const nearbyCraftingTable = bot.findBlock({ matching: bot.registry.itemsByName.crafting_table.id, maxDistance: 5 });
    if (!nearbyCraftingTable) {
      bot.chat("Sosj, I don't see any crafting tables nearby, so I will place one from my inventory.");

      // Equip the crafting table to place it
      await bot.equip(craftingTable, 'hand');

      // Try placing the crafting table 2 blocks ahead of the bot
      const blockPos = bot.entity.position.offset(2, 0, 0); 
      const block = bot.blockAt(blockPos);
      if (block) {
        await bot.placeBlock(block, vec3(0, 1, 0)); // Place crafting table at this position
      } else {
        bot.chat("Sosj, I failed to find a valid spot for the crafting table.");
        return;
      }

      // Wait for the block to update (increase the delay slightly)
      await new Promise(resolve => setTimeout(resolve, 4000)); // Wait for 4 seconds
    }

    // Craft the pickaxe using the crafting table
    const pickaxeRecipe = bot.recipesFor(bot.registry.itemsByName.wooden_pickaxe.id, null, 1, planksId)[0];
    if (!pickaxeRecipe) return bot.chat("Sosj, no pickaxe recipe found.");
    await bot.craft(pickaxeRecipe, 1, null);

    bot.chat("Sosj, I crafted a wooden pickaxe!");
  } catch (err) {
    bot.chat("Sosj, couldn't craft pickaxe: " + err.message);
  }
}



async function checkAutopilot() {
  if (!autopilotEnabled) {
    currentTask = "waiting for your next command";
    console.log("Autopilot is disabled.");
    return;
  }

  if (userHasGivenCommand) return;

  const woodLogs = ['oak_log', 'birch_log', 'spruce_log'];
  const hasLogs = bot.inventory.items().some(i => woodLogs.includes(i.name));
  const hasPickaxe = bot.inventory.items().some(i => i.name.includes('pickaxe'));
  const hasCobblestone = bot.inventory.items().some(i => i.name === 'cobblestone');
  const hasCraftingTable = bot.inventory.items().some(i => i.name === 'crafting_table');

  // Step 1: Gather wood if no logs
  if (!hasLogs) {
    bot.chat("Sosj, I'm gathering wood to get started.");
    bot.emit('chat', bot.username, 'gather wood');
    return;
  }

  // Step 2: Craft a table if we don't have one
  if (!hasCraftingTable) {
    bot.chat("Sosj, I'm crafting a table so I can make some tools.");
    bot.emit('chat', bot.username, 'craft table');
    return;
  }

  // Step 3: Craft a pickaxe if we don't have one
  if (!hasPickaxe) {
    bot.chat("Sosj, I'm crafting a pickaxe so I can start mining.");
    bot.emit('chat', bot.username, 'craft pickaxe');
    return;
  }

  // Step 4: Gather stone if we have a pickaxe and don't have cobblestone
  if (!hasCobblestone) {
    bot.chat("Sosj, I'm going to gather some stone for better tools.");
    bot.emit('chat', bot.username, 'gather stone');
    return;
  }

  bot.chat("All done prepping! Let me know what to do next.");
}

bot.on('chat', async (username, message) => {
  userHasGivenCommand = true;
  if (username === bot.username) return;
  const msg = message.trim().toLowerCase();
  const player = bot.players[username]?.entity;

  const respond = (text) => bot.chat(`${username}, ${text}`);

  if (msg === 'inventory') {
    const items = bot.inventory.items();
    respond(items.length ? `I have: ${items.map(i => `${i.name} x${i.count}`).join(', ')}` : "My inventory is empty.");
  }

  else if (msg === 'come to me') {
    bot.pathfinder.setGoal(new GoalNear(player.position.x, player.position.y, player.position.z, 1));
    respond("Coming to you!");
  }

  else if (msg === 'follow me') {
    following = true;
    bot.pathfinder.setGoal(new GoalFollow(player, 1), true);
    respond("I'm now following you.");
  }

  else if (msg === 'stop following') {
    following = false;
    bot.pathfinder.setGoal(null);
    respond("Stopped following.");
  }

  else if (msg === 'equip armor') {
    try {
      await bot.armorManager.equipAll();
      respond("Armor equipped!");
    } catch (err) {
      respond("Failed to equip armor.");
    }
  }

  else if (msg === 'attack nearest') {
    const target = bot.nearestEntity(e => e.type === 'mob' || e.type === 'player');
    if (target) {
      bot.pvp.attack(target);
      respond(`Attacking ${target.name || 'the nearest target'}!`);
    } else {
      respond("No target in range.");
    }
  }

  else if (msg === 'stop attack') {
    bot.pvp.stop();
    respond("Stopped attacking.");
  }

  else if (msg === 'gather wood') {
    const logTypes = ['oak_log', 'birch_log', 'spruce_log'];
    const target = bot.findBlock({ matching: block => logTypes.includes(block.name), maxDistance: 64 });
    if (!target) return respond("I can't find any wood nearby.");
    try {
      await bot.pathfinder.goto(new GoalBlock(target.position.x, target.position.y, target.position.z));
      bot.chat("Sosj, I'm chopping this tree.");
      await bot.dig(bot.blockAt(target.position));
      bot.chat("Sosj, I got some logs!");
      respond("Got some wood!");
    } catch (err) {
      respond("Couldn't gather wood: " + err.message);
    }
  }

  else if (msg === 'gather stone') {
    const hasPickaxe = bot.inventory.items().some(i => i.name.includes('pickaxe'));
    if (!hasPickaxe) return respond("I need a pickaxe to mine stone.");
    const target = bot.findBlock({ matching: block => block.name === 'stone', maxDistance: 64 });
    if (!target) return respond("I can't find any stone nearby.");
    try {
      await bot.pathfinder.goto(new GoalBlock(target.position.x, target.position.y, target.position.z));
      await bot.dig(bot.blockAt(target.position));
      respond("Got some stone!");
    } catch (err) {
      respond("Couldn't gather stone: " + err.message);
    }
  }

  else if (msg === 'craft table') {
    try {
      const log = bot.inventory.items().find(i => i.name.endsWith('_log'));
      if (!log) return respond("I need logs to craft a table.");

      const plankId = bot.registry.itemsByName[log.name.replace('_log', '_planks')]?.id;
      if (!plankId) return respond("I can't turn that log into planks.");

      const plankRecipe = bot.recipesFor(plankId, null, 4, log)[0];
      if (!plankRecipe) return respond("No plank recipe found.");

      await bot.craft(plankRecipe, 1, null);

      const plankItem = bot.inventory.items().find(i => i.name.endsWith('_planks'));
      if (!plankItem) return respond("No planks to craft with.");

      const tableRecipes = bot.recipesFor(bot.registry.itemsByName.crafting_table.id, null, 1, plankItem);
      if (!tableRecipes.length) return respond("No crafting table recipe found.");

      await bot.craft(tableRecipes[0], 1, null);
      respond("Crafted a crafting table!");
    } catch (err) {
      respond("Couldn't craft table: " + err.message);
    }
  }

  else if (msg === 'craft pickaxe') {
    await craftPickaxe();
  }

  else if (msg === 'autopilot on') {
    autopilotEnabled = true;
    console.log("Autopilot is enabled.");
    respond("Autopilot enabled.");
  }

  else if (msg === 'autopilot off') {
    autopilotEnabled = false;
    console.log("Autopilot is disabled.");
    respond("Autopilot disabled.");
  }

  else if (msg === 'what are you doing') {
    if (autopilotEnabled) {
      respond("Sosj, I’m currently on autopilot and gathering resources.");
    } else {
      respond("Sosj, I'm waiting for your next command.");
    }
  }

  else if (msg === 'talk to me') {
    const replies = [
      "You're doing great!",
      "Need a hand with something?",
      "Exploring together is fun!",
      "Let me know if you need backup!",
      "I’m here for you, partner."
    ];
    respond(replies[Math.floor(Math.random() * replies.length)]);
  }

  else if (msg === 'quit') {
    respond("Bye!");
    bot.quit();
  }
});
