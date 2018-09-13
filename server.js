if (process.env.NODE_ENV !== 'production') {
  require('dotenv').load();
}

const Discord = require("discord.js");
const client = new Discord.Client();

const http = require('http');
const express = require('express');
const app = express();
//needed to show uptime on uptimerobot
app.get("/", (request, response) => {
  response.sendStatus(200);
});
app.listen(process.env.PORT);
//const config = require("./config.json");

//var PublicPem = key.exportKey('pkcs1-public-pem');
//var privatePem = key.exportKey('pkcs1-pem');
const NodeRSA = require('node-rsa');
const key = new NodeRSA();
const keyData = process.env.privateRSA.replace(/\\n/g, '\n')
key.importKey(keyData,'pkcs1')

/* //using uptimerobot to keepalive, remove comment block to re-enable
  const app = express();
  app.get("/", (request, response) => {
    //console.log(Date.now() + " Ping Received");
    response.sendStatus(200);
  });
  app.listen(process.env.PORT);
  setInterval(() => {
    http.get(`http://${process.env.PROJECT_DOMAIN}.glitch.me/`);
  }, 280000);
*/
const Promise = require('bluebird');
const GoogleSpreadsheet = require('google-spreadsheet');



const fs = require('fs');


// spreadsheet key is the long id in the sheets URL
const doc =  Promise.promisifyAll(new GoogleSpreadsheet('145J-MEXIGh-ww_gnRtjLyhZ6GXS7t9MH96-Xlsvw7gY'));

//const useServiceAccountAuth = util.promisify(doc.useServiceAccountAuth);
//const getRowsAsync = util.promisify(getRows);

var pKey = process.env.private_key.replace(/\\n/g, '\n')
var ignoreBot = false
const creds = {
  "type": "service_account",
  "project_id": process.env.project_id,
  "private_key_id": process.env.private_key_id,
  "private_key": pKey,
  "client_email": process.env.client_email,
  "client_id": process.env.client_id,
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://accounts.google.com/o/oauth2/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": process.env.client_x509_cert_url
}

let PREFIX = process.env.prefix
let BOT = []
let Commands = ['restore','remove','whoami']
let serverInfo = '', serverRoles = '', botPos = '', availableRoles =''

let userData = {}, botConfig = {}, USERVARS = {}, COMMANDCOOLDOWN = {}, IGNOREROLES = []
//wingTrainee = {}

let maxRank = 0, restarts = 0
let wingRegexp = '', rankRegexp = ''
let canChangeRank = false

async function loadBotConfig() {
    await doc.useServiceAccountAuthAsync(creds)
    let rows = await doc.getRowsAsync(1)

    for (let i = 0; i < rows.length; i++) {
      userData[rows[i].discordid] = rows[i]

      userData[rows[i].discordid].confirmedtobe = decrypt(userData[rows[i].discordid].confirmedtobe).split(',')//array
      userData[rows[i].discordid].roles = decrypt(userData[rows[i].discordid].roles).split(',')//array
    }
    rows = await doc.getRowsAsync(2)

    for (let i = 0; i < rows.length; i++) {
      botConfig[rows[i].item] = rows[i].info
    }
/*
    rows = await doc.getRowsAsync(3)
    let a = botConfig.wingtrainee
    for (let i = 0; i < rows.length; i++) {
      if (isNaN(rows[i].wingtrainee)) {
        wingTrainee[rows[i].wingtrainee] = rows[i].minrank
      } else {
        b = a.replace(/`#`/gi,rows[i].wingtrainee)
        wingTrainee[b] = rows[i].minrank
      }
    }
*/
    wingRegexp = new RegExp(botConfig.wingregexp, "i");
    rankRegexp = new RegExp(botConfig.rankregexp, "i");

    rows = await doc.getRowsAsync(4)
    BOT.commands = []
    for (let i = 0; i < rows.length; i++) {
      BOT.commands.push(rows[i].command)
      BOT[rows[i].command] = {}
      BOT[rows[i].command].minrank = rows[i].minrank
      BOT[rows[i].command].discordid = rows[i].discordid
      BOT[rows[i].command].type = rows[i].type
      BOT[rows[i].command].achievement = rows[i].achievement

    }

    client.login(process.env.token);
  }
  

  async function loadClientData() {
    serverInfo = client.guilds.get(process.env.mainserver)
    serverRoles = serverInfo.roles
    botPos = serverInfo.me.highestRole.position
  //Add only roles the bot is able to manage
    availableRoles = serverRoles.filter((p) => (p.position < botPos) && (p.position > 0) );
    
    maxRank = 0
    let ignoreRoles = botConfig.ignoreroles.split(',')
    availableRoles.forEach(r => {
      let rName = r.name.toLowerCase()
      if (wingRegexp.test(rName)){maxRank ++}
      if (rankRegexp.test(rName)) {canChangeRank = true}

      //set up ignoreroles
      
      for (let i = 0; i < ignoreRoles.length; i++) {
        if (rName.split(ignoreRoles[i].toLowerCase()).length > 1){IGNOREROLES.push(r.id);break;}
      }

    })
    availableRoles.sort(function(a,b) {
      return a.position-b.position

    })

    //let b = botConfig.wingtrainee.toString().replace(/`#`/gi,maxRank)
    //if (!(b in wingTrainee)){addNewWing(maxRank);wingTrainee[b] = wingTrainee.new;consoleLog('bot','Added new wing.','')}
    let b = botConfig.wingcommand.toString().replace(/`#`/gi,maxRank)
    if (!(b in BOT)){addNewWing(maxRank);consoleLog('bot','Added new wing.','')}

  }


async function consoleLog(a,b,c){
  let consoleChannel = await client.channels.get('417600417824768010')
  console.log(a,b)
  if (a == 'Error') {
    a = `<@${process.env.owner}> Error`
  }
  if (c == true){
    //will edit later
    return await consoleChannel.send(`${a} >> ${b}`);
  }else if(typeof c == 'object'){
    //edit
    return await c.edit(`${a} >> ${b}`);
  }else {
    consoleChannel.send(`${a} >> ${b}`)
  }
}

function format(seconds){
  let d = Math.floor(seconds / 86400);
  let h = Math.floor((seconds % 86400) / 3600);
  let m = Math.floor(((seconds % 86400) % 3600) / 60);
  let s = Math.floor(seconds % 3600 % 60);

  //Up for: 1 days, 8 hours, 38 minutes, and 45 seconds

  let dDisplay = d > 0 ? d + (d == 1 ? " day, " : " days, ") : "";
  let hDisplay = h > 0 ? h + (h == 1 ? " hour, " : " hours, ") : "";
  let mDisplay = m > 0 ? m + (m == 1 ? " minute, and " : " minutes, and ") : "";
  let sDisplay = s > 0 ? s + (s == 1 ? " second" : " seconds") : "";

  return dDisplay + hDisplay + mDisplay + sDisplay;
}

function commandCooldown(id,command) {
  if (COMMANDCOOLDOWN[command] === undefined){COMMANDCOOLDOWN[command] = {}}
  const timeout = 30000
  if (COMMANDCOOLDOWN[command][id] !== undefined){return Math.round((timeout - (Date.now() - COMMANDCOOLDOWN[command][id]))/1000*10)/10;}

  COMMANDCOOLDOWN[command][id] = Date.now()
  setTimeout(() => {
    delete COMMANDCOOLDOWN[command][id]
  }, timeout);
  return false

}

function encrypt(str) {
  return key.encrypt(str, 'base64');
}

function decrypt(str) {
  /*
  let tmpStr = str.split(',') //for confirmed to be -- not needed
  let tmpDecrypt = ''
  if (tmpStr.length > 0) {
    for (let i = 0; i < tmpStr.length; i++) {
      if (tmpDecrypt != '') {
        tmpDecrypt = key.decrypt(str, 'utf8');
      }else {
        tmpDecrypt = `,${key.decrypt(str, 'utf8')}`
      }
    }
  }else {tmpDecrypt = key.decrypt(str, 'utf8');}
  return tmpDecrypt
  */
 return key.decrypt(str, 'utf8');

}

function dispMsg(num,txt){
  let msg = botConfig.dispmsg
  return msg.replace(/@/g,'@\u200B').replace(/`num`/gi,`${num}\u200B`).replace(/`txt`/gi,txt)+'\n'

}

function escapeRegExp(str) {
  return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
}

function sendMsg(item,id,role) {
  let msg = botConfig[item]
  //replace all @ with @ zero-width spaces
  msg = msg.replace(/`n`/g,'\u000d')
  msg = msg.replace(/@/g,'@\u200B')
  msg = msg.replace(/`user`/g,'<@'+id+'>')
  msg = msg.replace(/`role`/g,'`@\u200B'+role.name+'`')
  return msg;
}

//remove confirm account (now replaced by compareData)
/*
function confirmAccount(id,confirm) {
  let tmpConfirm = confirm.toLowerCase()
  let confirm = encrypt(tmpConfirm.toLowerCase())
  doc.getRows(1, function (err, rows) {
    if(err) {consoleLog('Error',err,'');}
    for (let i = 0; i < rows.length; i++) {
      
      if (rows[i].discordid == id) {
        //account already added
        if (decrypt(rows[i].confirmedtobe) == tmpConfirm) {
          
          return true;
        }else {
          //add alt account
          rows[i].confirmedtobe += ','+confirm
          rows[i].save()
          return true;
        }
      }
    }
    
    //add new account
    doc.addRow(1, {discordid: id, confirmedtobe: confirm} ,function (err, rows) {
      if(err) {consoleLog('Error',err,'');}
    });
  });
}
*/

function addNewWing(w) {
  let a = botConfig.wingtrainee.toString().replace(/`#`/gi,w)
  let b = botConfig.wingcommand.toString().replace(/`#`/gi,w)
  let dID = '0'
  availableRoles.filter((r) => {
    if (r.name.toLowerCase() === a){dID = r.id;return;}
  })

  doc.addRow(4, {command: b, minrank: botConfig.minrank,discordid: dID,type: 'toggle'} ,function (err, rows) {
    if(err) {consoleLog('Error',err,'');}
  })
  
  BOT.commands.push(b)
  BOT[b] = {}
  BOT[b].minrank = botConfig.minrank
  BOT[b].discordid = dID
  BOT[b].type = 'toggle'
}


async function updateDB(id,dbKey = [],data = [],reason) {
  //data is saved after every change due to bot d/c

 //loop through keys
 //console.log(id,dbKey,data,reason)
  if (!(id in userData)){userData[id] = {}}
  for (let i = 0; i < dbKey.length; i++) {
    //loop through missing data
    let newData = data[i]
    if (newData != null && newData != undefined && newData != ''){
      
      if (dbKey[i] === 'roles') {

        if (userData[id].roles == '' || userData[id].roles == undefined ){
        //for old accounts in DB
          userData[id].roles = [id]
        }
      }
      if (reason === 'add' || dbKey[i] === 'roles') {
        
        userData[id][dbKey[i]] = userData[id][dbKey[i]].concat(newData)
        
      }else{
        //overwrite and new
        userData[id][dbKey[i]] = newData
      }
    }
    //flatten all arrays to single array
    userData[id][dbKey[i]] = [].concat.apply([], userData[id][dbKey[i]]);
  }
  
  if (reason === 'overwrite' || reason === 'add'){
    doc.getRows(1, function (err, rows) {
      if(err) {consoleLog('Error',err,'');}
      for (let i = 0; i < rows.length; i++) {
        if (rows[i].discordid == id) {
          for (let x = 0; x < dbKey.length; x++) {
            rows[i][dbKey[x]] = encrypt(userData[id][dbKey[x]].join(','))
          }
          rows[i].save()
        }
      }
    })
  }else if (reason === 'new'){
    let cTb = encrypt(userData[id].confirmedtobe.join(','))
    if (cTb == null || cTb == undefined ){cTb = ''}
    await doc.addRow(1, {discordid: id, confirmedtobe: cTb, roles: encrypt(userData[id].roles.join(','))} ,function (err, rows) {
      if(err) {consoleLog('Error',err,'');}
    })

  }
}

function compareData(id,dbKey = [],newData = []){
  let tmpData = []
  let roleIndex = dbKey.indexOf('roles')
  if (roleIndex >= 0){
    if (typeof newData[roleIndex] === 'object' && newData[roleIndex].constructor !== Array){
    let tmpData = newData[roleIndex].map(r => r.id)
    newData[roleIndex] = tmpData.filter(r => IGNOREROLES.indexOf(r) < 0)
    }
  }

  if (!(id in userData)){updateDB(id,dbKey,newData,'new');return;}

  let comp = [], missingData = []
  for (let i = 0; i < dbKey.length; i++) {
    comp[i] = [].concat.apply([],  userData[id][dbKey[i]]);
    newData[i] = [].concat.apply([], newData[i]);
    comp[i].sort(); newData[i].sort()
    missingData[i] = newData[i].filter((r) => {
      let tmpComp = comp[i].join('`').toLowerCase().split('`'); 
      return tmpComp.indexOf(r.toString().toLowerCase()) < 0 && IGNOREROLES.indexOf(r) < 0;
    })
  }
  if (missingData.join().length > 1){
    updateDB(id,dbKey,missingData,'add')
  }else {
    return true;
  }

}

function createCollector(id,message,createReason) {
  let validReply = USERVARS[id].displayRoles[0]
  USERVARS[id].useReply = []
  USERVARS[id].processing = false
  USERVARS[id].filter = m => {
    if (USERVARS[id].processing){return false;}
    reply = m.content.toLowerCase()
    if (m.author.id === message.author.id) {
      let replyArray = reply.split(",").map(i => i.trim())

      if (USERVARS[id].displayRoles === undefined){return false}
      if (replyArray.indexOf(USERVARS[id].displayRoles.length+'') >= 0 || reply === USERVARS[id].displayRoles.length+'') {
        for (let i = 1; i < USERVARS[id].displayRoles.length; i++) {
          USERVARS[id].useReply.push(i+'')
        }
        return true;
      }
      if (replyArray.length > 0) {
        USERVARS[id].useReply = replyArray.filter((r) => {
          if (r !== undefined){return validReply.indexOf(r.trim()) >=0}
        })
      }else{
        
        let isValid = validReply.some(r => r == reply)
        if (isValid){USERVARS[id].useReply[0] = reply}
      }
      if (USERVARS[id].useReply.length > 0){return true;}else{return false;}
    }else{return false;}
  };

  USERVARS[id].collector = message.channel.createMessageCollector(USERVARS[id].filter, { time: 30000 });

  USERVARS[id].collector.on('collect', m => {
    parseRoleData(id,m,USERVARS[id].useReply,createReason) 
  });

  USERVARS[id].collector.on('end', (collected,reason) => {
    USERVARS[id].disp.react('❌')
    USERVARS[id].disp.edit(`${USERVARS[id].disp.content}\n ***Edit: No longer accepting responses (${reason})***`)
    
    if (reason === 'Another command has been used.') {
      USERVARS[id] = {}
    }else {
      delete USERVARS[id]
    }
    
   });
}

async function parseRoleData(id,m,msg,reason){
  USERVARS[id].processing = true
  let member = m.member
  USERVARS[id].currentRole = await client.users.get(id).lastMessage.member._roles
  if (USERVARS[id].counter === undefined) {USERVARS[id].counter = []}
  
  let direct = false //if direct the msg should be in a string not an array
  let content = ''
  if (!Array.isArray(msg)){
    direct = true ;msg = msg.toLowerCase().split(",").map(i => i.trim())
  }else {
    content = USERVARS[id].disp.content
  }
  
  if (direct){
    if (msg.indexOf('all') >= 0 || msg.indexOf(USERVARS[id].displayRoles.length+'') >= 0) {
      msg = []
      for (let i = 1; i < USERVARS[id].displayRoles.length; i++) {
        msg.push(i+'')
      }
    }
  }

  //msg = msg.filter(r => {return r !== undefined})
  let tmpMsg = msg.slice()
  let wRegexp = new RegExp(botConfig.wingregexp.split(' ')[0], "i");//w#
  
  let inactive = ''
  let react = {}
  react[id] = false
  for (let [index,r] of USERVARS[id].displayRoles.entries()){
      if (index > 0){
        if (USERVARS[id].counter.indexOf(index) >= 0){continue;}
        let rID = r.id
        let rName = r.name.toLowerCase()

        let i = tmpMsg.indexOf(rID)
        let n = tmpMsg.indexOf(rName)
        let wExec = wRegexp.exec(rName)
        let w = -1
        if (wExec !== null){
          w = tmpMsg.indexOf(wRegexp.exec(rName)[0])
        }
        let d = tmpMsg.indexOf(index+'');

        if (i >= 0 || n >= 0 || w >= 0 || d >= 0)  {
          react[id] = true
          USERVARS[id].counter.push(index)
          role = await m.guild.roles.get(rID);
          if (reason === 'restore') {
            await member.addRole(role);
                if (inactive === ''){
                  //inactive = await m.guild.roles.find("name", "Inactive Trainee");
                  inactive = await m.guild.roles.find(x => x.name === "Inactive Trainee")
                  await member.removeRole(inactive)
                }
          }else {
            await member.removeRole(role);
            //if no role after removing, give inactive trainee
            if ((USERVARS[id].currentRole.length - USERVARS[id].counter) == 0){
              //let inactive = await m.guild.roles.find("name", "Inactive Trainee");
              let inactive = await m.guild.roles.find(x => x.name === "Inactive Trainee")
              await member.addRole(inactive);
            }
          }

          if (!direct){
            let itemRep = escapeRegExp(botConfig.dispmsg).replace(/`num`/gi,`${index}\\u200B`).replace(/`txt`/gi,`.+`)
            let itemRegexp = new RegExp(itemRep,'i')
            let item = content.match(itemRegexp)
            content = content.replace(itemRegexp,`${item} ✅`)
            
            let newContent = await USERVARS[id].disp.edit(content)
            USERVARS[id].disp = newContent

          }

          let num = 0
          let a = ''
          if (i >= 0 ){num = i; a = `(${(rName)})`}
          if (n >= 0 ){num = n; a = ''}
          if (w >= 0 ){num = w; a = `(${(rName)})`}
          if (d >= 0 ){num = d; a = `(${(rName)})`}

          tmpMsg[num] += `${a}✅`

          msg.splice(num,1)

        }
      }
    }

    if (canChangeRank) {
     await updateRank(id,m)
    }

    if (USERVARS[id].collector != undefined){
      USERVARS[id].processing = false
      if (USERVARS[id].counter.length >= Object.keys(USERVARS[id].displayRoles).length-1) {
        let stopReason = ''
        let itemRegexp = new RegExp(`\\[${Object.keys(USERVARS[id].displayRoles).length}\\u200B].+`,'i')
        let item = content.match(itemRegexp)
        content = content.replace(itemRegexp,`${item} ✅`)
            
        let newContent = await USERVARS[id].disp.edit(content)
        USERVARS[id].disp = newContent
        
        if (reason === 'restore'){stopReason = 'All roles restored.'}else{stopReason = 'All roles removed.'}
        USERVARS[id].collector.stop(stopReason)
      }
    }
      
  if (direct){
    let text = ''
    if (react[id]){
      if (reason === 'restore'){
        text = 'I have restored:'
      }else {
        text = `I have removed:`
      }
    }else{
      text = `Try using **${PREFIX}${reason}**, I was unable to ${reason}:`
    }
    msg.forEach(r =>{
      let num = tmpMsg.indexOf(r)
      if (num >= 0){
        tmpMsg[num] += '❌'
      }
    })
    
    await m.reply(`${text}\`\`\`${tmpMsg.join(', ')}\`\`\``)
    delete USERVARS[id]
  }else {
    if (react[id]) {
      m.react('✅')
    }else {
      m.react('❌')
    }
    
  }
}

async function updateRank(id,message) {
  USERVARS[id].currentRole = await client.users.get(id).lastMessage.member._roles
  USERVARS[id].rankCounter = 0

  let rank = 0
  let rankobj = {}
  rankobj[id] = {}
  for (let role of USERVARS[id].currentRole) {
    let r = await message.guild.roles.get(role)
    let rName = r.name
    if (rankRegexp.test(rName)) {rank = rankRegexp.exec(rName)[1];rankobj[id] = r}//to remove
    if (wingRegexp.test(rName)) {USERVARS[id].rankCounter ++}//to add
    }

  if (rank+'' === USERVARS[id].rankCounter+'') {return false;}//for when user restores a trainee role
    availableRoles.forEach(async (role) =>{
    let r = rankRegexp.exec(role.name); 
    if (r !== null){
      if (r[1]+'' === USERVARS[id].rankCounter+'') {
        let member = message.member
        try{
          await member.addRole(role);
          await member.removeRole(rankobj[id])
        }catch(e){
          consoleLog('Error',e,'')
        }
        return true
      }
    }
  })
}

function setNick(gw2,nick) {
  var n = botConfig['setnickname']
  n = n.replace(/`gw2`/g,gw2)
  n = n.replace(/`nick`/g,nick)

  if (n.length >= 32 || nick == undefined) {
    n = gw2
  }

  return n;
}

async function getRank(userID,message) {
  let rank = 0
  let currentRoles = await client.users.get(userID).lastMessage.member._roles
  
  currentRoles.forEach(r => {
    let rankName = message.guild.roles.get(r).name
    if (rankRegexp.test(rankName)) {rank = /[0-9]+/.exec(rankName)[0]}
  })
  return rank;


}
async function processAchi(userID,m,userRole,cRank){
  if (m.embeds[0] === null || m.embeds[0] === undefined){return;}
  member = await m.mentions.members.first();
  let apEarned = m.embeds[0].fields[m.embeds[0].fields.length-1]
  let achiAPearned = apEarned.name.toLowerCase()
  let achiAP = apEarned.value.split('/')
  let achiTitle = m.embeds[0].title.toLowerCase()
    for (let a in BOT) {
      if (BOT[a].achievement !== 'null'){
        if (BOT[a].achievement === achiTitle && achiAPearned === 'ap earned' && achiAP[0] === achiAP[1] && cRank >= BOT[a].minrank){
          if (userRole.indexOf(BOT[a].discordid) < 0) {
            USERVARS[userID].achieved = true
            addAchiRole(userID,BOT[a].discordid,m,member)
            USERVARS[userID].achiM.react('✅')
            USERVARS[userID].collector.stop()
          }
          break;
        }
      }
    }

}

async function addAchiRole(userID,roleID,message,member) {
  compareData(userID,['roles'],[[roleID]])
  role = await message.guild.roles.get(roleID);
  await member.addRole(role);
  message.channel.send(`:tada: You have earned \`${role.name}\` role :tada:`)
}
client.on("ready", () => {
  loadClientData()

  //console.log(`users: ${Object.keys(userData).length} config: ${Object.keys(botConfig).length} test: ${Object.keys(testobj).length}`)

  consoleLog('Log',`Bot loaded[${restarts}] into [${client.guilds.get(process.env.mainserver).name}] with ${client.guilds.get(process.env.mainserver).memberCount} users. Loaded ${Object.keys(userData).length} users from database, ${Object.keys(botConfig).length} config entries and ${Object.keys(BOT.commands).length} commands`); 
  //console.log(`Bot has loaded[${restarts}] ${Object.keys(userData).length} users from database, ${Object.keys(botConfig).length} config entries. \nWith ${client.guilds.get(process.env.mainserver).memberCount} users in ${client.guilds.get(process.env.mainserver).name} `)
  client.user.setActivity(`R2dTr0n`);
});

client.on("guildCreate", guild => {
  consoleLog('Log',`New guild joined: ${guild.name} (id: ${guild.id}). This guild has ${guild.memberCount} members!`,'');
});

client.on("guildDelete", guild => {
  consoleLog('Log',`I have been removed from: ${guild.name} (id: ${guild.id})`,'');
});


client.on("message", async message => {
  //if(message.author.bot) return;
  //310050883100737536 gw2bot
  let member = '', userID=''
  if(message.author.id == '310050883100737536' && !ignoreBot){

    member = await message.mentions.members.first();
    if (member == null || member == undefined){return;}
    userID = member.id;
    let userRole = await client.users.get(userID).lastMessage.member._roles

    
    if (message.embeds[0] == null || message.embeds[0] == undefined){return;}
    let GW2Account = await message.embeds[0].author.name

    
    if (GW2Account == null || GW2Account == undefined){return;}
   
    let nickname = await client.users.get(userID).lastMessage.member.nickname
    if (nickname == null){
      //check username
      nickname = await client.users.get(userID).username
    }
    
    //let role = message.guild.roles.find("name", "Trainee");
    let role = message.guild.roles.find(x => x.name === "Trainee")
    let m = false,reason = ''

    if (userRole.length == 0) {
      try {
        m = await consoleLog('Pre-Action','Checking database for: ' + nickname,true) 
        compareData(userID,['confirmedtobe','roles'],[[GW2Account],[role.id]])
        let n = 'trainee'
        let nn = ''
        if (nickname.toLowerCase().search(GW2Account.toLowerCase()) < 0){
          n = 'nickname';
          nn = 'Changed nickname and added '
          let nick = setNick(GW2Account,nickname)
          nickname = nick
          m = await consoleLog('Pre-Action','Setting nickname: ' + nick,m)
          await message.guild.members.get(userID).setNickname(nick);
        }
        m = await consoleLog('Pre-Action','Adding role to: ' + nickname,m)
        await member.addRole(role);
        consoleLog('Action',`${nn}Role added to: ${nickname}`,m)
        //await message.channel.send(sendMsg(n,userID,role))
        await member.send(sendMsg(n,userID,role)).catch(() => message.channel.send(sendMsg(n,userID,role)))
        await message.react('✅')

      } catch (e) {
        consoleLog('Error',e,'')
      }

    }else {
      compareData(userID,['confirmedtobe','roles'],[[GW2Account],[userRole]])

    }

  }else if (message.author.bot) {return;}

  member = message.member
  if (member == null || member == undefined){return;}
  userID = member.id;
  

  if(message.content.indexOf('$') === 0) {
    let args = message.content.slice(1).trim().split(/ +/g);
    let command = args.shift().toLowerCase();
    if (command === 'achievementinfo'){
      let cRank = 0
      cRank = await getRank(userID,message)

      let userRole = await client.users.get(userID).lastMessage.member._roles
      if (USERVARS[userID] === undefined){USERVARS[userID] = {}}
      //if (USERVARS[userID].collectorAchi !== undefined){USERVARS[userID].collectorAchi.stop('Command in use already.');USERVARS[userID] = {}}
      if (USERVARS[userID].collector !== undefined){USERVARS[userID].collector.stop('Another command has been used.');USERVARS[userID] = {}}
      USERVARS[userID].filterAchi = m => {
        if (m.author.id === '310050883100737536') {
          USERVARS[userID].achiM = m
          return true
        }else{return false;}
      };


      USERVARS[userID].collector = message.channel.createMessageCollector(USERVARS[userID].filterAchi, {maxMatches: 3 });

      USERVARS[userID].collector.on('collect', m => {
        processAchi(userID,m,userRole,cRank)
        
      });

      USERVARS[userID].collector.on('end', (collected,reason) => {
        /*
        if (USERVARS[userID].achieved){
          USERVARS[userID].achiM.react('✅')
        }
        
        else
        {
          USERVARS[userID].achiM.react('❌')
        }
        */
        delete USERVARS[userID]    
       });
    }
  }


  if(message.content.indexOf(PREFIX) !== 0) return;
  const args = message.content.slice(PREFIX.length).trim().split(/ +/g);
  const command = args.shift().toLowerCase();
  let cRank = 0
  cRank = await getRank(userID,message)
  if (message.author.id !== process.env.owner){
    if (!(message.member.roles.has(botConfig.admin))){
      //if (Commands.indexOf(command) < 0) {return}
      if (BOT.commands.indexOf(command) < 0) {return}
      
      if (BOT[command].minrank > cRank){return}
      const cd = commandCooldown(userID, command)
      if (cd !== false){message.channel.send(`You can use **${PREFIX}${command}** again after ${cd} seconds`);return;}
      if (!(userID in userData)){message.channel.send('I have no record of you, try using **$bosses** in <#379098260813381633>');return;}
    }
  }

  if (command === 'update') {
    userData = {}
    botConfig = {}
    await loadBotConfig()
    await loadClientData()
    consoleLog('Bot','Bot config updated','')
  }
  if (command === 'ignorebot') {
    ignoreBot = !ignoreBot
    consoleLog('Bot','Ignoring GW2Bot: '+ ignoreBot,'')
  }
  if (command === 'getid') {
    let member = message.member
    if (member == null || member == undefined){return;}
    let userID = member.id;
    let userRole = await client.users.get(userID).lastMessage.member._roles
    let GW2Account = 'Google.1364'
    if (GW2Account == null || GW2Account == undefined){return;}
    compareData(userID,['confirmedtobe','roles'],[[GW2Account],[userRole]])
  }

  if(command === "restore") {
    if (USERVARS[userID] === undefined){USERVARS[userID] = {}}
    if (USERVARS[userID].collector !== undefined){USERVARS[userID].collector.stop('Another command has been used.');USERVARS[userID] = {}}

    USERVARS[userID].currentRole = await client.users.get(userID).lastMessage.member._roles
    let dbRole = userData[userID].roles

    //let wT = botConfig.wingtrainee
    let rank = 0
    USERVARS[userID].currentRole.forEach(r => {
      let rankName = message.guild.roles.get(r).name
      if (rankRegexp.test(rankName)) {rank = /[0-9]+/.exec(rankName)}
    })

    USERVARS[userID].dispRoles = availableRoles.filter(r => {
      let dbOverride = false
      BOT.commands.forEach(c => {
        if (BOT[c].type === 'toggle' && BOT[c].discordid === r.id && cRank >= BOT[c].minrank) {
          dbOverride = true
        }
      })

      /*
      if (r.name.toLowerCase() in wingTrainee){
        if (rank >= wingTrainee[r.name.toLowerCase()]) {
          dbOverride = true
        }
      }
      */
      if (rank == maxRank && wingRegexp.test(r.name)) {
        dbOverride = true
      }else if (dbRole.indexOf(r.id) >=0){
        dbOverride = true
      }
      return dbOverride && USERVARS[userID].currentRole.indexOf(r.id) < 0 && IGNOREROLES.indexOf(r.id) < 0
    })

    compareData(userID,['roles'],[USERVARS[userID].dispRoles])
    /*
    USERVARS[userID].dispRoles.sort(function(a,b) {
      let aNum = wingRegexp.exec(a.name);
      let bNum = wingRegexp.exec(b.name);

      return (aNum > bNum) ? 1 : ((bNum > aNum) ? -1 : 0);
    }); 
*/
  
    USERVARS[userID].displayRoles = []
    USERVARS[userID].displayRoles[0] = []
    USERVARS[userID].toDisplay = ''

    let i = 1
    USERVARS[userID].dispRoles.forEach((role) => {
      USERVARS[userID].displayRoles[i] = {name:role.name, id:role.id}
      USERVARS[userID].toDisplay += dispMsg(i,role.name)
      //Array for accepted responses
      let w = wingRegexp.exec(role.name);
      if (w !== null){w = w[1].toLowerCase()}
      USERVARS[userID].displayRoles[0].push(i+'',role.name.toLowerCase(),role.id,w)
    
      i++
    })

    if (i > 2 ) {
      USERVARS[userID].toDisplay += dispMsg(i,'All Roles Listed.')
      USERVARS[userID].displayRoles[0].push(i+'')
    }

    if (args.length >= 1){
      await parseRoleData(userID,message,args.join(' '),command);
      return;
    }

    if (USERVARS[userID].toDisplay === ''){message.channel.send('You have no roles that I can restore.');return;}

    USERVARS[userID].disp = await message.reply(' Please choose which role(s) you want to restore, multiple roles should be separated by a comma `,`\n ```css\n'+USERVARS[userID].toDisplay+'```')
    createCollector(userID,message,command)
  }
  if (command ==='remove') {
    if (USERVARS[userID] === undefined){USERVARS[userID] = {}}
    if (USERVARS[userID].collector !== undefined){USERVARS[userID].collector.stop('Another command has been used.')}
   
    USERVARS[userID].currentRole = await client.users.get(userID).lastMessage.member._roles

    USERVARS[userID].dispRoles = availableRoles.filter(r => {
      return  USERVARS[userID].currentRole.indexOf(r.id) >= 0 && IGNOREROLES.indexOf(r.id) < 0
    })

    compareData(userID,['roles'], [USERVARS[userID].dispRoles])
/*
    USERVARS[userID].dispRoles.sort(function(a,b) {
      console.log(a.name,b.name)
      let aNum = wingRegexp.exec(a.name);
      let bNum = wingRegexp.exec(b.name);
      if (aNum === null){aNum = 0}else{aNum = parseInt(aNum[1])}
      if (bNum === null){bNum = 0}else{bNum = parseInt(bNum[1])}
      console.log(a.position,b.position, a.position-b.position)
      //return (aNum > bNum) ? 1 : ((bNum > aNum) ? -1 : 0);
      return b.position-a.position;
    }); 
console.log(USERVARS[userID].dispRoles)

*/
    USERVARS[userID].displayRoles = []
    USERVARS[userID].displayRoles[0] = []
    USERVARS[userID].toDisplay = ''
    let i = 1
    USERVARS[userID].dispRoles.forEach((role) => {
      USERVARS[userID].displayRoles[i] = {name:role.name, id:role.id}
      USERVARS[userID].toDisplay += dispMsg(i,role.name)
     //Array for accepted responses
     let w = wingRegexp.exec(role.name);
     if (w !== null){w = w[1].toLowerCase()}
     USERVARS[userID].displayRoles[0].push(i+'',role.name.toLowerCase(),role.id,w)
   
      i++
    })

    if (i > 2 ) {
      USERVARS[userID].toDisplay += dispMsg(i,'All Roles Listed.')
      USERVARS[userID].displayRoles[0].push(i+'')
    }

    if (args.length >= 1){
      await parseRoleData(userID,message,args.join(' '),command);
      return;
    }

    if (USERVARS[userID].toDisplay === ''){message.channel.send('You have no roles that I can remove.');return;}

    USERVARS[userID].disp = await message.reply(' Please choose which role(s) you want to remove, multiple roles should be separated by a comma `,`\n ```css\n'+USERVARS[userID].toDisplay+'```')
    createCollector(userID,message,command)
  }

  if (command ==='roleid') {
    let tmpDsp = ''

    let remRoles = availableRoles.filter((r) => {

       if (IGNOREROLES.indexOf(r.id) >= 0) {return false;}
        
        tmpDsp += `${r.name} >> POS: ${r.position}, ID: ${r.id}\n`
        return true;
    })

    consoleLog('Bot',tmpDsp, '')
  }
  if (command ==='whoami') {
    
    let rank = 0
    let tmpRoles = ''
    availableRoles.map((r) => {
      if (userData[userID].roles.indexOf(r.id) >= 0){
        let rankName = message.guild.roles.get(r.id).name
        if (tmpRoles === '') {
          tmpRoles += rankName 
        }else {
          tmpRoles += `, ${rankName}`
        }
        if (wingRegexp.test(rankName)){rank ++}
        return true;}
    
    })

/*
    userData[userID].roles.forEach((r,index) => {
      if (index > 0){
        let rankName = message.guild.roles.get(r).name
        if (tmpRoles === '') {
          tmpRoles += rankName 
        }else {
          tmpRoles += `, ${rankName}`
        }
        
        if (wingRegexp.test(rankName)){rank ++}
      }
    })
*/
    message.reply(`You are: ${userData[userID].confirmedtobe.join(',')}\nRank: ${rank}\nSaved role(s): ${tmpRoles}`)
  }



  if (command ==='read') {
console.log('read')

    if (isNaN(args[0])){message.channel.send('Please enter a number'); return;}
      let id = args[0]
      doc.getRows(1, function (err, rows) {
        for (let i = 0; i < rows.length; i++) {
          if (rows[i].discordid == id) {
            let tmpMsg = `GW2Account(s): ${decrypt(rows[i].confirmedtobe)} | Roles: ${decrypt(rows[i].roles)}`
            console.log(tmpMsg)
            //consoleLog('Decrypt',decrypt(cSplit[z]),'')
          }
        }
      })
  };
  if(command === "encrypt") {
    consoleLog('Encrypt',encrypt(args.join(' ')))
  }

  if (command === 'manualnick' && message.author.id == process.env.owner ){
    if (isNaN(args[0])){return;}
    if (args[0] == undefined || args[1] == undefined){return;}
    let id = args[0]
    let GW2Acc = args[1]
    GW2Acc = GW2Acc.replace(/`s/g,' ')
    let nick = args[2]
    await message.guild.members.get(id).setNickname(setNick(GW2Acc,nick)).catch(error => consoleLog('Error',`Couldn't change nickname messages because of: ${error}`,''));
  }

  if(command === "test") {
    let testobj = {a:'test',b:'test1'}
    console.log(1,botConfig)
    console.log(`users: ${Object.keys(userData).length} config: ${Object.keys(botConfig).length} test: ${Object.keys(testobj).length}`)
  }
  if(command === "removerole") {
    //let role = message.guild.roles.find("name", "Trainee");
    let role = message.guild.roles.find(x => x.name === "Trainee")
    let member = message.member
    member.removeRole(role).catch(console.error);
  }
  if(command === "uptime") {
    let uptime = process.uptime();
    message.channel.send('I have been online for: ' + format(uptime))
  }
  if(command === "ping") {
    // Calculates ping between sending a message and editing it, giving a nice round-trip latency.
    // The second ping is an average latency between the bot and the websocket server (one-way, not round-trip)
    const m = await message.channel.send("Ping?");
    m.edit(`Pong! Latency is ${m.createdTimestamp - message.createdTimestamp}ms. API Latency is ${Math.round(client.ping)}ms`);
  }
  
  if(command === "purge") {
    // This command removes all messages from all users in the channel, up to 100.
    
    // get the delete count, as an actual number.
    const deleteCount = parseInt(args[0], 10);
    
    // Ooooh nice, combined conditions. <3
    if(!deleteCount || deleteCount < 2 || deleteCount > 100)
      return message.reply("Please provide a number between 2 and 100 for the number of messages to delete");
    
    // So we get our messages, and delete them. Simple enough, right?
    const fetched = await message.channel.fetchMessages({count: deleteCount});
    message.channel.bulkDelete(fetched)
      .catch(error => message.reply(`Couldn't delete messages because of: ${error}`));
  }

  if (BOT[command].type === 'toggle'){
    role = await message.guild.roles.get(BOT[command].discordid);
    if(message.member.roles.has(BOT[command].discordid)) {
      await member.removeRole(role);
      message.channel.send(`I have removed: \`@\u200B${role.name}\`, you will no longer receive pings for this role.`)
    } else {
      await member.addRole(role);
      message.channel.send(`I have added: \`@\u200B${role.name}\`, you will now receive pings for this role.`)
    }
  }

  if (BOT[command].type === 'toggletitle'){
    role = await message.guild.roles.get(BOT[command].discordid);
    if(message.member.roles.has(BOT[command].discordid)) {
      compareData(userID,['roles'],[[BOT[command].discordid]])
      await member.removeRole(role);
      message.channel.send(`I have removed: \`${role.name}\``)
    } else {
      if (userData[userID].roles.indexOf(BOT[command].discordid) > 0){
        await member.addRole(role);
        message.channel.send(`I have restored: \`${role.name}\``)
      }else {
        if (BOT[command].achievement !== 'null'){
          message.channel.send(`You have not yet earned: \`${role.name}\`. Please type \`$achievementinfo ${BOT[command].achievement}\``)
        } else{
          message.channel.send(`You have not yet earned: \`${role.name}\`. Please submit logs to <#401223376233955328>.`)

        }
      }
    }
  }


});
client.on('disconnected', function(e) {
  console.log('restarted')
  restarts ++
  client.login(process.env.token);
});


loadBotConfig()
