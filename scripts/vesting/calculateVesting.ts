import dotenv from "dotenv";
import { Api, JsonRpc } from 'eosjs';
import { JsSignatureProvider } from 'eosjs/dist/eosjs-jssig';  // development only

dotenv.config();

import { argv } from 'process';

const fetch = require('node-fetch');
const signatureProvider = new JsSignatureProvider([]);
const rpc = new JsonRpc('https://ore.openrights.exchange/', { fetch }); //required to read blockchain state
const api = new Api({ rpc, signatureProvider }); //required to submit transactions

async function main() {
  const accountName = argv[2]
  const [balanceResult] = await rpc.get_currency_balance('eosio.token', accountName, 'ORE')
  const [balanceStr] =  balanceResult.split(' ')
  console.log('balance: ', balanceStr)
  const {rows} = await rpc.get_table_rows({
    json: true,                 // Get the response as json
    code: 'eosio.token',           // Contract that we target
    scope: 'eosio.token',          // Account that owns the data
    table: 'vesting',          // Table name
    lower_bound: accountName,     // Table primary key value
    limit: 1,                   // Here we limit to 1 to get only the single row with primary key equal to 'testacc'
    reverse: false,             // Optional: Get reversed data
    show_payer: false,          // Optional: Show ram payer
  });
  const {vesting} = rows[0] 
  console.log(vesting)
  let totalLocked = 0
  let totalUnlocked = 0
  // For each Vesting index increase total locked and unlocked amounts to calculate total available amount in the end
  vesting.forEach( (vest: any) => {
    const {claimed, locked, start_time, end_time} = vest
    const [lockedStr] = locked.split(' ') 
    const [claimedStr] = claimed.split(' ') 
    const start = Math.round((Date.parse(start_time) / 1000))
    const end = Math.round((Date.parse(end_time) / 1000))
    const now = Math.round((Date.now() / 1000))
    const unlockRatio = (now - start)/(end - start)
    console.log('lockRatio: ', unlockRatio)
    const unlocked = Number(lockedStr) * unlockRatio
    const unlockedAvailabe = unlocked - Number(claimedStr)
    totalUnlocked += unlockedAvailabe
    totalLocked += Number(lockedStr)
  })
  console.log('totalLocked', totalLocked)
  console.log('totalUnlocked', totalUnlocked)
  console.log('balance', Number(balanceStr))
  const totalAvailable = Number(balanceStr) - totalLocked + totalUnlocked
  console.log(totalAvailable)
}

(async () => {
  await main().catch((error) => console.log("Unexpected error", error));
  process.exit(); // exit Node execution
})();