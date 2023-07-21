//const { contractAbi, contractAddress } = require('./web3/Abitest');
const { contractAbi, contractAddress } = require('./web3/Abi');

const express = require('express')
const path = require('path')
const PORT = process.env.PORT || 49152

express()
  .use(express.static(path.join(__dirname, 'public')))
  .set('views', path.join(__dirname, 'views'))
  .set('view engine', 'ejs')
  .get('/', (req, res) => res.render('pages/index'))
  .listen(PORT, () => console.log(`Listening on ${ PORT }`))


  
require('dotenv').config();
const { ethers } = require('ethers');
const Big = require('big.js');

const httpProvider = new ethers.JsonRpcProvider(process.env.JSON_RPC);


const contract = new ethers.Contract(contractAddress, contractAbi, httpProvider);

const TelegramBot = require('node-telegram-bot-api');
const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: { interval: 10000 } });
//const targetGroupId = '-100674732483';
const targetGroupId = '-1001275249191'; 


bot.on('polling_error', (err) => {
  console.error('Polling error:', err);
});


const axios = require('axios');

  const buySignature ='0xdb663865';

  const apiKey = 'Z1B3GRG3NXG82SA5P6GKMHBF1JPRCGFQP8'; // Replace with your BscScan API key
  let lastTransactionTimestamp = 1689940835;
  const alreadyNotified = new Set();


async function fetchLatestDepositTransaction(contractAddress, depositSignature, bot, targetGroupId) {
  try {
    // Fetch the current value of totalDeposits from Firestore:    
    
    const response = await axios.get(
      `https://api.bscscan.com/api?module=account&action=txlist&address=${contractAddress}&startblock=0&endblock=99999999&sort=desc&apikey=${apiKey}`
    );

    const transactions = response.data.result;
    const depositTransactions = transactions.filter((tx) =>
    tx.methodId === buySignature && 
    parseInt(tx.timeStamp) > lastTransactionTimestamp &&
  parseInt(tx.timeStamp) > Math.floor(Date.now() / 1000) - 60 && Math.floor(Date.now() / 1000) >= 1689955200
);

    if (depositTransactions.length === 0) return;
    const sortedTransactions = depositTransactions.sort((a, b) => parseInt(a.timeStamp) - parseInt(b.timeStamp));

    const latestTransaction = sortedTransactions[sortedTransactions.length -1];

    lastTransactionTimestamp = parseInt(latestTransaction.timeStamp);

    console.log('Latest deposit transactio:', latestTransaction);
    if (alreadyNotified.has(latestTransaction.hash)) return;
    alreadyNotified.add(latestTransaction.hash);


    const abiCoder = new ethers.AbiCoder();
    const inputData = latestTransaction.input.slice(10);
    const decodedData = abiCoder.decode(
        ['address'], // Update this to match the inputs of your deposit function
        '0x' + inputData
      );
      

      const decodedTransaction = {
        hash: latestTransaction.hash,
        from: decodedData[0],
        amount: latestTransaction.value
      };
      
      console.log(decodedTransaction)


    const newamount = new Big(Number(decodedTransaction.amount)).div(new Big('1e18')).toFixed(2);

    const totalDeposits = await contract.getBalance();


    const bscScanLink = `https://bscscan.com/tx/${latestTransaction.hash}`;
    console.log(bscScanLink);
    const totalDeposits2 = new Big(Number(totalDeposits)).div(new Big('1e18')).toFixed(2);
    let numEmojis;

    // calculate number of emojis to send
    if (newamount >= 60) {
      numEmojis = Math.floor(80 * 4);
    } else {
      numEmojis = Math.floor(newamount * 100);
    }
    let emojis = '';
    for (let i = 0; i < numEmojis; i++) {
      emojis += '⭐'; // add rocket emoji
    }
    const caption = `<b>Classic Miner new deposit!</b>\n\n${emojis} \n\n<b>TVL:</b> ${totalDeposits2} BNB\n<b>Deposit Amount:</b> ${newamount} BNB\n\n  <a href="https://classicminer.io/"><u>Website</u></a>  |  <a href="https://the-stamp.com/2023/07/classic-miner/"><u>Audit</u></a>  |  <a href="https://bscscan.com/tx/${latestTransaction.hash}"><u>Tx</u></a>`;
    await bot.sendPhoto(targetGroupId, 'https://ipfs.filebase.io/ipfs/QmSc3Xq7TYxuDHArvi9RDLdgrjDmVTGC7ugb9hnyuvPif4', {
      caption: caption,
      parse_mode: 'HTML'
    });

  } catch (error) {
    console.error('Error fetching BscScan API:', error.message);
    console.log('Response data:', response.data);
  }
}

setInterval(() => {
  fetchLatestDepositTransaction(contractAddress, buySignature, bot, targetGroupId);
  }, 1000); // 10 seconds interval
