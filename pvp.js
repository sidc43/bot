// pvp.js
const mineflayer = require('mineflayer');
const pvp = require('mineflayer-pvp').plugin;
const { Movements, goals } = require('mineflayer-pathfinder');
const minecraftData = require('minecraft-data');

function registerPvp(bot) {
  bot.loadPlugin(pvp);

  let guardTarget = null;
  let guardInterval = null;
  let lastCombatAnnouncement = 0;
  let lootCooldown = false;
  bot.isGuarding = false;

  bot.on('chat', (username, message) => {
    if (username === bot.username) return;

    if (message === 'attack me') {
      bot.pauseIdle?.();

      const target = bot.players[username]?.entity;
      if (!target) {
        bot.chat(`I can't see you, ${username}!`);
        return;
      }

      equipBestWeapon();
      bot.pvp.attack(target);
      bot.chat(`Engaging in combat with ${username}!`);
      bot.logEvent?.(`Engaged in PvP with ${username}`, 'combat', username);
    }

    if (message === 'stop attacking') {
      bot.pvp.stop();
      bot.resumeIdle?.();
      bot.chat(`Ceased attack.`);
      bot.logEvent?.("Stopped attacking.", 'combat');
    }

    if (message === 'guard me') {
      bot.pauseIdle?.();

      const target = bot.players[username]?.entity;
      if (!target) {
        bot.chat(`I can't see you, ${username}!`);
        return;
      }

      bot.isGuarding = true;
      guardTarget = target;

      const mcData = minecraftData(bot.version);
      const defaultMove = new Movements(bot, mcData);
      bot.pathfinder.setMovements(defaultMove);

      const { GoalFollow } = goals;
      bot.pathfinder.setGoal(new GoalFollow(guardTarget, 2), true);
      bot.chat(`Now guarding ${username}.`);
      bot.logEvent?.(`Started guarding ${username}`, 'guard', username);

      if (guardInterval) clearInterval(guardInterval);
      guardInterval = setInterval(() => {
        if (!guardTarget) return;

        const nearbyHostiles = Object.values(bot.entities).filter(e =>
          e.type === 'hostile' &&
          isHostile(e.name) &&
          e.position.distanceTo(guardTarget.position) < 15
        );

        if (nearbyHostiles.length > 0) {
          const closest = nearbyHostiles[0];
          if (!bot.pvp.target || bot.pvp.target !== closest) {
            equipBestWeapon();
            bot.pvp.attack(closest);
            bot.logEvent?.(`Engaging ${nearbyHostiles.length} hostile(s) near ${username}`, 'combat');
          }

          const now = Date.now();
          if (now - lastCombatAnnouncement > 5000) {
            bot.chat(`Engaging ${nearbyHostiles.length} hostile(s) near you.`);
            lastCombatAnnouncement = now;
          }
        } else {
          bot.pvp.stop();
        }
      }, 1000);
    }

    if (message === 'stop guarding') {
      bot.isGuarding = false;
      guardTarget = null;
      if (guardInterval) clearInterval(guardInterval);
      bot.pathfinder.setGoal(null);
      bot.pvp.stop();
      bot.resumeIdle?.();
      bot.chat('Stopped guarding.');
      bot.logEvent?.("Stopped guarding.", 'guard');
    }
  });

  function isHostile(name) {
    const hostiles = [
      'zombie', 'skeleton', 'creeper', 'spider', 'witch', 'enderman', 'drowned',
      'phantom', 'slime', 'pillager', 'vindicator', 'zombified_piglin',
      'zoglin', 'hoglin', 'warden'
    ];
    return hostiles.includes(name.toLowerCase());
  }

  function equipBestWeapon() {
    const weapons = bot.inventory.items().filter(item =>
      item.name.includes('sword') || item.name.includes('axe')
    );
    if (weapons.length === 0) return;

    const tierScore = name => {
      if (name.includes('netherite')) return 5;
      if (name.includes('diamond')) return 4;
      if (name.includes('iron')) return 3;
      if (name.includes('stone')) return 2;
      if (name.includes('wood') || name.includes('gold')) return 1;
      return 0;
    };

    weapons.sort((a, b) => tierScore(b.name) - tierScore(a.name));
    const best = weapons[0];
    bot.equip(best, 'hand').catch(() => {});
  }
}

module.exports = { registerPvp };