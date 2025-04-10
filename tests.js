const mineflayer = require("mineflayer");
const fs = require("fs");
const { pathfinder, Movements, goals } = require("mineflayer-pathfinder");
const craftingUtil = require("mineflayer-crafting-util").plugin;

const bot = mineflayer.createBot({
  host: "localhost",
  port: 60060,
  username: "PersonalityBot"
});

bot.loadPlugin(pathfinder);
bot.loadPlugin(craftingUtil);

const personalityOptions = {
  traits: ["adventurous", "cautious", "builder", "fighter", "curious", "lazy"],
  hobbies: ["gardening", "animal care", "mining", "building", "exploring", "fishing"],
  favoriteFoods: ["steak", "porkchop", "salmon", "bread", "apple"],
  favoriteBiomes: ["plains", "forest", "desert", "mountains", "swamp", "taiga"],
  goals: ["build a village", "tame all the animals", "collect rare ores", "explore every biome", "defeat the Ender Dragon"]
};

const personality = {};
let talkCounts = {};
let memoryLog = [];
let isIdling = false;

function generatePersonality() {
  for (const key in personalityOptions) {
    const options = personalityOptions[key];
    const choice = options[Math.floor(Math.random() * options.length)];
    personality[key] = choice;
  }
  fs.writeFileSync("botdata.json", JSON.stringify(personality, null, 2));
}

function saveTalkCounts() {
  fs.writeFileSync("talkCounts.json", JSON.stringify(talkCounts, null, 2));
}

function logMemory(text) {
  const entry = { time: new Date().toISOString(), text };
  memoryLog.push(entry);
  if (memoryLog.length > 200) memoryLog.shift();
  fs.writeFileSync("memoryLog.json", JSON.stringify(memoryLog, null, 2));
}

bot.once("spawn", () => {
  generatePersonality();
  bot.chat("Hello! I have a personality now.");

  const mcData = require("minecraft-data")(bot.version);
  const defaultMove = new Movements(bot, mcData);
  bot.pathfinder.setMovements(defaultMove);

  setInterval(() => {
    if (isIdling || bot.pathfinder.isMoving()) return;

    const inventory = bot.inventory.items();
    const tableNearby = bot.findBlock({ matching: block => block.name === "crafting_table", maxDistance: 6 });

    const has = (name, min = 1) =>
      inventory.filter(i => i.name.includes(name)).reduce((sum, i) => sum + i.count, 0) >= min;

    const logItem = inventory.find(i => i.name.endsWith("_log"));
    const plankItem = inventory.find(i => i.name.includes("planks"));

    if (logItem && !plankItem) {
        const plankName = logItem.name.replace("_log", "_planks");
        const plank = bot.registry.itemsByName[plankName];
        if (!plank) {
          console.log("[DEBUG] Cannot find plank item for", plankName);
          return;
        }
      
        console.log("[DEBUG] Using planCraft to make", plank.name);
        const plan = bot.planCraft({ id: plank.id, count: 4 });
      
        console.log("[DEBUG] Crafting plan:", JSON.stringify(plan, null, 2));
      
        if (!plan.success || plan.recipesToDo.length === 0) {
          console.log("[DEBUG] No valid plan to craft", plank.name);
          return;
        }
      
        const craftNext = (i = 0) => {
          if (i >= plan.recipesToDo.length) {
            bot.chat(`Crafted ${plank.name} from ${logItem.name}`);
            logMemory(`Crafted ${plank.name} from ${logItem.name}`);
            return;
          }
      
          const { recipe, recipeApplications } = plan.recipesToDo[i];
          const requiredName = bot.registry.items[recipe.ingredients?.[0]?.id]?.name;
          const itemToEquip = bot.inventory.items().find(i => i.name === requiredName);
      
          if (!itemToEquip) {
            console.log("[DEBUG] Missing ingredient:", requiredName);
            return;
          }
      
          bot.equip(itemToEquip, "hand", err => {
            if (err) {
              console.log("[EQUIP ERROR]", err);
              return;
            }
      
            bot.craft(recipe, recipeApplications, null, err => {
              if (err) {
                console.log("[CRAFT ERROR]", err);
              } else {
                craftNext(i + 1);
              }
            });
          });
        };
      
        craftNext();
        return;
      }
      
      
      

    // ➕ Sample crafting logic
    if (has("planks", 4) && !has("crafting_table")) {
      const table = bot.registry.itemsByName.crafting_table;
      const recipe = bot.recipesFor(table.id, null, 1)[0];
      if (recipe) bot.craft(recipe, 1, null, () => logMemory("Crafted a crafting table."));
      return;
    }

    // 🧠 Default idle behavior
    const logs = has("log") ? 1 : 0;
    const food = inventory.filter(i => ["beef", "porkchop", "salmon", "chicken"].some(f => i.name.includes(f))).length;

    let goal = null;
    let log = "";

    if (logs + has("planks") < 4) {
      const tree = bot.findBlock({ matching: b => b.name.includes("log"), maxDistance: 32 });
      if (tree) {
        goal = new goals.GoalBlock(tree.position.x, tree.position.y, tree.position.z);
        log = "I went to gather some wood.";
      }
    } else if (food < 3) {
      const mob = bot.nearestEntity(e => e.type === "mob" && ["cow", "pig", "chicken", "sheep"].includes(e.name));
      if (mob) {
        goal = new goals.GoalFollow(mob, 2);
        log = `I chased a ${mob.name} for food.`;
      }
    } else {
      const hobby = personality.hobbies;
      if (hobby === "exploring") {
        const dx = Math.floor(Math.random() * 20 - 10);
        const dz = Math.floor(Math.random() * 20 - 10);
        const pos = bot.entity.position.offset(dx, 0, dz);
        goal = new goals.GoalNear(pos.x, pos.y, pos.z, 2);
        log = "I explored a bit.";
      } else if (hobby === "gardening") {
        const flower = bot.findBlock({ matching: b => b.name.includes("flower") || b.name === "grass", maxDistance: 20 });
        if (flower) {
          goal = new goals.GoalNear(flower.position.x, flower.position.y, flower.position.z, 1);
          log = "I admired some plants.";
        }
      }
    }

    if (goal) {
      isIdling = true;
      bot.pathfinder.setGoal(goal, true);
      setTimeout(() => {
        isIdling = false;
        if (log) logMemory(log);
      }, 6000);
    }
  }, 15000);

  bot.on("chat", (username, message) => {
    if (username === bot.username) return;
    const msg = message.toLowerCase();
    const mood = personality.traits === 'lazy' ? 'laid-back' : 'energetic';

    talkCounts[username] = (talkCounts[username] || 0) + 1;
    saveTalkCounts();
    logMemory(`Talked to ${username}`);

    if (msg.includes("who are you")) {
      bot.chat(`I'm a ${personality.traits} bot who loves ${personality.hobbies}. My favorite food is ${personality.favoriteFoods}, and I love the ${personality.favoriteBiomes} biome. My dream is to ${personality.goals}. I'm usually pretty ${mood}.`);
    } else if (msg.includes("who do you talk to")) {
      const sorted = Object.entries(talkCounts).sort((a, b) => b[1] - a[1]);
      if (sorted.length === 0) {
        bot.chat("I haven't talked to anyone yet.");
      } else {
        const [topUser, count] = sorted[0];
        bot.chat(`I talk to ${topUser} the most — we've chatted ${count} time${count > 1 ? 's' : ''}.`);
      }
    } else if (msg.includes("what happened") || msg.includes("how was your day")) {
      summarizeMemory({ tone: true });
    }
  });

  function summarizeMemory({ tone = false }) {
    const recent = memoryLog.slice(-15);
    const seen = new Set();
    const actions = new Set();
    const chats = new Set();

    for (const m of recent) {
      if (m.text.includes("Talked to")) {
        const who = m.text.split("Talked to ")[1];
        if (who) chats.add(who);
      } else if (m.text.includes("Saw a")) {
        const mob = m.text.split("Saw a ")[1].split(" ")[0];
        seen.add(mob);
      } else actions.add(m.text);
    }

    const intro = tone
      ? (personality.traits === "lazy" ? "It’s been a slow day." : "It’s been a lively day!")
      : "Here's what I remember:";

    const parts = [];
    if (actions.size) parts.push(...actions);
    if (seen.size) parts.push(`I saw ${Array.from(seen).join(", ")}.`);
    if (chats.size) parts.push(`I talked to ${Array.from(chats).join(", ")}.`);

    bot.chat(`${intro} ${parts.join(" ")}`);
  }
});
