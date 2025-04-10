// idle.js
const { goals, Movements } = require('mineflayer-pathfinder');
const minecraftData = require('minecraft-data');

function registerIdle(bot) {
  let isIdling = true;
  let idleSuspended = false;
  const idleInterval = 10 * 1000;
  let lastCraftingTablePos = null;

  const idlePlan = [
    { condition: () => !hasItem(['log', 'planks']), action: gatherWood },
    { condition: () => !hasItem('crafting_table'), action: craftTable },
    { condition: () => !hasItem('wooden_pickaxe'), action: craftWoodPick },
    { condition: () => !hasItem('cobblestone', 3), action: mineStone },
    { condition: () => !hasItem('stone_pickaxe'), action: craftStonePick },
  ];

  function hasItem(names, min = 1) {
    if (!Array.isArray(names)) names = [names];
    return names.some(name =>
      bot.inventory.items().filter(i => i.name.includes(name)).reduce((sum, item) => sum + item.count, 0) >= min
    );
  }

  function logAndChat(text, type = 'task', target = null) {
    bot.chat(text);
    if (bot.logEvent) bot.logEvent(text, type, target);
  }

  function findNearestBlock(typeName) {
    const mcData = minecraftData(bot.version);
    const blockId = mcData.blocksByName[typeName]?.id;
    if (!blockId) return null;
    return bot.findBlock({ matching: blockId, maxDistance: 32 });
  }

  function placeCraftingTable(callback) {
    if (lastCraftingTablePos) {
      const block = bot.blockAt(lastCraftingTablePos);
      if (block && block.name === 'crafting_table' && bot.entity.position.distanceTo(lastCraftingTablePos) <= 20) {
        bot.chat("Heading to the last crafting table.");
        bot.pathfinder.setGoal(new goals.GoalNear(lastCraftingTablePos.x, lastCraftingTablePos.y, lastCraftingTablePos.z, 1));
        return setTimeout(() => callback(), 2000);
      }
    }

    tryPlacingAround();
  }
    }

    const tableItem = bot.inventory.items().find(i => i.name === 'crafting_table');
    if (!tableItem) return callback(new Error("No crafting table to place"));

    function tryPlacingAround() {
      const ground = bot.findBlock({
        matching: block => block.name !== 'air' && block.boundingBox === 'block',
        maxDistance: 10
      });

      if (!ground) return callback(new Error("No valid surface found to place the crafting table"));

      const placePos = ground.position.offset(0, 1, 0);
      const above = bot.blockAt(placePos);

      if (above && above.name !== 'air') {
        return setTimeout(tryPlacingAround, 1000);
      }

      bot.pathfinder.setGoal(new goals.GoalNear(ground.position.x, ground.position.y, ground.position.z, 1));

      setTimeout(() => {
        bot.lookAt(placePos, false, () => {
          bot.equip(tableItem, 'hand', err => {
            if (err) return callback(err);
            bot.placeBlock(ground, { x: 0, y: 1, z: 0 }, err => {
              if (err) return callback(err);
              lastCraftingTablePos = placePos;
              logAndChat("Placed the crafting table.", 'place', 'crafting_table');
              callback();
            });
          });
        });
      }, 1500);
    }

    tryPlacingAround();
  }

  function gatherWood() {
    const target = bot.findBlock({ matching: block => block.name.includes('log'), maxDistance: 32 });
    if (!target) {
      logAndChat("I can't find any trees around.");
      return;
    }
    bot.pathfinder.setGoal(new goals.GoalBlock(target.position.x, target.position.y, target.position.z));
    logAndChat("Heading out to gather some wood.", 'gather', 'log');
  }

  function craftTable() {
    let planks = bot.inventory.items().find(i => i.name.includes('planks'));
    if (!planks) {
      const logs = bot.inventory.items().find(i => i.name.includes('log'));
      if (logs) {
        const logName = logs.name;
        const plankName = logName.replace(/_log$/, '_planks');
        const plankItem = bot.registry.itemsByName[plankName];
        if (plankItem) {
          const recipe = bot.recipesFor(plankItem.id, null, 1)[0];
          if (recipe) {
            return bot.craft(recipe, 1, null, err => {
              if (err) logAndChat("Failed to convert logs to planks.");
              else {
                logAndChat(`Converted ${logName} to ${plankName}.`, 'craft', 'planks');
                craftTable();
              }
            });
          }
        }
      }
      logAndChat("I need wooden planks to craft a table.");
      return;
    }
    const recipe = bot.recipesFor(bot.registry.itemsByName.crafting_table.id, null, 1)[0];
    if (!recipe) {
      logAndChat("No recipe found for crafting table.");
      return;
    }
    bot.craft(recipe, 1, null, err => {
      if (err) {
        logAndChat("Couldn't craft crafting table.");
      } else {
        logAndChat("Crafted a crafting table.", 'craft', 'crafting_table');
      }
    });
  }

  function craftWoodPick() {
    placeCraftingTable(err => {
      if (err) {
        logAndChat("Failed to place crafting table: " + err.message);
        return;
      }
      let planks = bot.inventory.items().find(i => i.name.includes('planks'));
      if (!planks) {
        const logs = bot.inventory.items().find(i => i.name.includes('log'));
        if (logs) {
          const logName = logs.name;
          const plankName = logName.replace(/_log$/, '_planks');
          const plankItem = bot.registry.itemsByName[plankName];
          if (plankItem) {
            const recipe = bot.recipesFor(plankItem.id, null, 1)[0];
            if (recipe) {
              return bot.craft(recipe, 1, null, err => {
                if (err) logAndChat("Failed to convert logs to planks.");
                else {
                  logAndChat(`Converted ${logName} to ${plankName}.`, 'craft', 'planks');
                  craftWoodPick();
                }
              });
            }
          }
        }
        logAndChat("I need planks to make a wooden pickaxe.");
        return;
      }
      const recipe = bot.recipesFor(bot.registry.itemsByName.wooden_pickaxe.id)[0];
      if (!recipe) return;
      bot.craft(recipe, 1, null, err => {
        if (err) logAndChat("Failed to craft wooden pickaxe.");
        else logAndChat("Made a wooden pickaxe.", 'craft', 'wooden_pickaxe');
      });
    });
  }

  function mineStone() {
    const stone = findNearestBlock('stone');
    if (!stone) {
      logAndChat("Can't find any stone to mine.");
      return;
    }
    bot.pathfinder.setGoal(new goals.GoalBlock(stone.position.x, stone.position.y, stone.position.z));
    logAndChat("Off to mine some stone.", 'gather', 'cobblestone');
  }

  function craftStonePick() {
    const recipe = bot.recipesFor(bot.registry.itemsByName.stone_pickaxe.id)[0];
    if (!recipe) return;
    bot.craft(recipe, 1, null, err => {
      if (err) logAndChat("Failed to craft stone pickaxe.");
      else logAndChat("Made a stone pickaxe.", 'craft', 'stone_pickaxe');
    });
  }

  bot.once('spawn', () => {
    bot.on('entitySwingArm', (entity) => {
      if (!entity || !entity.mobType || entity.position.distanceTo(bot.entity.position) > 5) return;
      if (bot.pvp && !bot.pvp.target) {
        bot.pvp.attack(entity);
        bot.pauseIdle?.();
        logAndChat(`I'm under attack by a ${entity.name}, fighting back!`, 'combat', entity.name);

        const handleStop = () => {
          if (!bot.pvp.target) {
            bot.chat("Threat neutralized, resuming idle tasks.");
            bot.resumeIdle?.();
            bot.removeListener('stoppedAttacking', handleStop);
          }
        };
        bot.on('stoppedAttacking', handleStop);
      }
    });

    isIdling = true;

    bot.on('chat', (username, message) => {
      if (username === bot.username) return;
      if (message.toLowerCase() === 'inventory') {
        const items = bot.inventory.items().map(i => `${i.name} x${i.count}`);
        if (items.length > 0) {
          bot.chat(`Here's what I'm carrying: ${items.join(', ')}`);
        } else {
          bot.chat("I'm not carrying anything right now.");
        }
      }
    });
  });

  bot.pauseIdle = () => { idleSuspended = true; };
  bot.resumeIdle = () => { idleSuspended = false; };

  setInterval(() => {
    if (isIdling && !idleSuspended && !bot.isGuarding && !bot.pvp?.target) {
      for (const step of idlePlan) {
        if (step.condition()) {
          step.action();
          break;
        }
      }
    }
  }, idleInterval);
}

module.exports = { registerIdle };
