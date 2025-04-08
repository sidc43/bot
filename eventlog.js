function registerEventLog(bot) {
    const eventLog = [];
  
    // Add an event with optional tag/category
    bot.logEvent = (text, type = 'generic', target = null) => {
      const timestamp = new Date();
      eventLog.push({ timestamp, text, type, target });
  
      if (eventLog.length > 50) {
        eventLog.shift();
      }
    };
  
    // Handle summary queries
    bot.on('chat', (username, message) => {
      if (username === bot.username) return;
  
      const msg = message.toLowerCase();
      if (
        msg.includes("how are") ||
        msg.includes("what happened") ||
        msg.includes("what's up") ||
        msg.includes("what have you been up to")
      ) {
        if (eventLog.length === 0) {
          bot.chat("Not much has happened lately.");
        } else {
          const summary = summarizeEvents(eventLog.slice(-25));
          bot.chat(summary);
        }
      }
    });
  
    function summarizeEvents(events) {
      const mood = evaluateMood(events);
      const now = Date.now();
      const recent = events.filter(e => now - e.timestamp.getTime() < 5 * 60 * 1000);
      const counts = {};
      let combatCount = 0;
  
      for (const event of recent) {
        if (event.type === 'combat' && event.target) {
          const key = `attacked:${event.target}`;
          counts[key] = (counts[key] || 0) + 1;
          combatCount++;
        } else if (event.type === 'loot' && event.target) {
          const key = `looted:${event.target}`;
          counts[key] = (counts[key] || 0) + 1;
        }
      }
  
      const sentences = [];
  
      const attackedSummaries = Object.entries(counts)
        .filter(([key]) => key.startsWith('attacked:'))
        .map(([key, count]) => {
          const [, mob] = key.split(':');
          return `got attacked by ${pluralize(mob, count)}`;
        });
  
      const lootSummaries = Object.entries(counts)
        .filter(([key]) => key.startsWith('looted:'))
        .map(([key, count]) => {
          const [, item] = key.split(':');
          return `picked up some ${pluralize(item, count)}`;
        });
  
      if (attackedSummaries.length > 0) {
        sentences.push(`I ${attackedSummaries.join(', ')}.`);
      }
  
      if (lootSummaries.length > 0) {
        sentences.push(`I also ${lootSummaries.join(', ')}.`);
      }
  
      if (sentences.length === 0) return `${mood} Not much has happened lately.`;
      return `${mood} ${sentences.join(' ')}`;
    }
  
    function evaluateMood(events) {
      const now = Date.now();
      const recent = events.filter(e => now - e.timestamp.getTime() < 5 * 60 * 1000);
      const mood = {
        combatCount: 0,
        deathCount: 0,
        lootCount: 0,
        uniqueMobs: new Set(),
      };
  
      for (const e of recent) {
        if (e.type === 'combat' && e.target) {
          mood.combatCount++;
          mood.uniqueMobs.add(e.target);
        }
        if (e.type === 'death') mood.deathCount++;
        if (e.type === 'loot') mood.lootCount++;
      }
  
      // Return mood label based on pattern
      if (mood.deathCount >= 1 && mood.combatCount >= 4) return "Overwhelmed.";
      if (mood.deathCount >= 1) return "Tired.";
      if (mood.combatCount > 6) return "Anxious.";
      if (mood.combatCount > 3 && mood.lootCount > 2) return "Confident.";
      if (mood.combatCount < 2 && mood.lootCount >= 3) return "Calm.";
  
      return "Steady.";
    }
  
    function pluralize(word, count) {
      return count === 1
        ? word
        : word.endsWith('y')
        ? word.slice(0, -1) + 'ies'
        : word + 's';
    }
  }
  
  module.exports = { registerEventLog };
  