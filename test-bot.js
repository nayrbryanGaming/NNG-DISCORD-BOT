const { exec } = require('child_process');

// Start the bot and capture output
const bot = exec('node dist/index.js', { cwd: 'e:\\0nngdiscordbot' });

bot.stdout.on('data', (data) => {
  console.log(`BOT OUTPUT: ${data}`);
});

bot.stderr.on('data', (data) => {
  console.error(`BOT ERROR: ${data}`);
});

bot.on('error', (error) => {
  console.error(`BOT EXEC ERROR: ${error.message}`);
});

bot.on('exit', (code) => {
  console.log(`Bot process exited with code ${code}`);
});

// Keep test running
setTimeout(() => {
  console.log('Test timeout - killing bot');
  bot.kill();
  process.exit(0);
}, 10000);
