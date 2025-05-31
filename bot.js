require('dotenv').config();
const { Telegraf } = require('telegraf');
const fetch = require('node-fetch');
const express = require('express');

const bot = new Telegraf(process.env.BOT_TOKEN);

// Get TON Balance
async function getWalletInfo(address) {
  const baseUrl = process.env.TON_API;
  const url = `${baseUrl}/getAddressInformation?address=${address}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.ok) {
      const balanceTon = parseFloat(data.result.balance) / 1e9;
      return `💰 Wallet: ${address}\n🔸 Balance: ${balanceTon.toFixed(6)} TON`;
    } else {
      return `❌ Error: ${data.error || 'Invalid address or network issue.'}`;
    }
  } catch (err) {
    return `⚠️ Failed to fetch data: ${err.message}`;
  }
}

// Get Jettons
async function getJettons(address) {
  const url = `https://tonapi.io/v2/accounts/${address}/jettons`;
  const headers = {
    Authorization: `Bearer ${process.env.TONAPI_KEY || ''}`
  };

  try {
    const res = await fetch(url, { headers });
    const data = await res.json();
    if (!data.balances || data.balances.length === 0) return 'No Jettons found.';

    let response = '🪙 Jettons:\n';
    for (let j of data.balances.slice(0, 5)) {
      const name = j.jetton.name || j.jetton.symbol || 'Unnamed';
      const balance = parseFloat(j.balance) / Math.pow(10, j.jetton.decimals || 9);
      response += `• ${name}: ${balance.toFixed(4)}\n`;
    }
    return response;
  } catch (err) {
    return '⚠️ Could not fetch Jettons.';
  }
}

// Get NFTs
async function getNFTs(address) {
  const url = `https://tonapi.io/v2/accounts/${address}/nfts`;
  const headers = {
    Authorization: `Bearer ${process.env.TONAPI_KEY || ''}`
  };

  try {
    const res = await fetch(url, { headers });
    const data = await res.json();
    if (!data.nft_items || data.nft_items.length === 0) return 'No NFTs found.';

    let response = '🖼️ NFTs:\n';
    for (let nft of data.nft_items.slice(0, 5)) {
      const name = nft.metadata?.name || 'Unnamed NFT';
      response += `• ${name}\n`;
    }
    return response;
  } catch (err) {
    return '⚠️ Could not fetch NFTs.';
  }
}

// Bot Handlers
bot.start((ctx) =>
  ctx.reply('👋 Send me a TON wallet address and I’ll fetch balance, Jettons, and NFTs!')
);

bot.on('text', async (ctx) => {
  const address = ctx.message.text.trim();
  if (!/^EQ|UQ/.test(address)) {
    ctx.reply('❌ That doesn’t look like a valid TON wallet address.');
    return;
  }

  ctx.reply('🔎 Fetching wallet data...');

  const balance = await getWalletInfo(address);
  const jettons = await getJettons(address);
  const nfts = await getNFTs(address);

  const response = [balance, jettons, nfts].join('\n\n');
  ctx.reply(response);
});

// Launch Bot
bot.launch();
console.log('🤖 Telegram bot is running...');

// ✅ Add Express server to keep Koyeb Web Service alive
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (_, res) => res.send('✅ Telegram bot is running (Koyeb keeps this alive).'));

app.listen(PORT, () => {
  console.log(`🌐 Dummy HTTP server listening on port ${PORT}`);
});

// Handle graceful shutdown
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
