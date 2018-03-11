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

var GoogleSpreadsheet = require('google-spreadsheet');
var async = require('async');

// spreadsheet key is the long id in the sheets URL
var doc = new GoogleSpreadsheet('145J-MEXIGh-ww_gnRtjLyhZ6GXS7t9MH96-Xlsvw7gY');
var sheet;

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

loadBotConfig()
//var userData = {}
var botConfig = {}
function loadBotConfig() {
  
  doc.useServiceAccountAuth(creds, function (err) {
    /*//code not needed ATM
    doc.getRows(1, function (err, rows) {
      for (let i = 0; i < rows.length; i++) {
        userData[rows[i].discordid] = rows[i]
      }
    });
    */
    doc.getRows(2, function (err, rows) {
      for (let i = 0; i < rows.length; i++) {
        botConfig[rows[i].item] = rows[i].info
      }
    });
  });
}

async function consoleLog(a,b,c){
  var consoleChannel = await client.channels.get('417600417824768010')
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
  var d = Math.floor(seconds / 86400);
  var h = Math.floor((seconds % 86400) / 3600);
  var m = Math.floor(((seconds % 86400) % 3600) / 60);
  var s = Math.floor(seconds % 3600 % 60);

  //Up for: 1 days, 8 hours, 38 minutes, and 45 seconds

  var dDisplay = d > 0 ? d + (d == 1 ? " day, " : " days, ") : "";
  var hDisplay = h > 0 ? h + (h == 1 ? " hour, " : " hours, ") : "";
  var mDisplay = m > 0 ? m + (m == 1 ? " minute, and " : " minutes, and ") : "";
  var sDisplay = s > 0 ? s + (s == 1 ? " second" : " seconds") : "";

  return dDisplay + hDisplay + mDisplay + sDisplay;
}



function encrypt(str) {
  return key.encrypt(str, 'base64');
}

function decrypt(str) {
  return key.decrypt(str, 'utf8');
}

function sendMsg(item,id,role) {
  var msg = botConfig[item]
  //replace all @ with @ zero-width spaces
  msg = msg.replace(/@/g,'@\u200B')
  msg = msg.replace(/`user`/g,'<@'+id+'>')
  msg = msg.replace(/`role`/g,'`@\u200B'+role.name+'`')
  return msg;
}

function confirmAccount(id,confirm) {
  var tmpConfirm = confirm.toLowerCase()
  var confirm = encrypt(tmpConfirm.toLowerCase())
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

function setNick(gw2,nick) {
  var n = botConfig['setnickname']
  n = n.replace(/`gw2`/g,gw2)
  n = n.replace(/`nick`/g,nick)

  if (n.length >= 32 || nick == undefined) {
    n = gw2
  }
  //consoleLog('Action','Setting nickname: '+ n,'')
  return n;
}

client.on("ready", () => {
  consoleLog('Log',`Bot has started, with ${client.users.size} users, in ${client.channels.size} channels of ${client.guilds.size} guilds.`,''); 
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
  
  if(message.author.id == '310050883100737536' && !ignoreBot){

    var member = await message.mentions.members.first();
    if (member == null || member == undefined){return;}
    var userID = member.id;
    var userRole = await client.users.get(userID).lastMessage.member._roles

    
    if (message.embeds[0] == null || message.embeds[0] == undefined){return;}
    var GW2Account = await message.embeds[0].author.name
    if (GW2Account == null || GW2Account == undefined){return;}
   
    var nickname = await client.users.get(userID).lastMessage.member.nickname
    if (nickname == null){
      //check username
      nickname = await client.users.get(userID).username
    }
    
    var role = message.guild.roles.find("name", "Trainee");
    var m
    if (nickname.toLowerCase().search(GW2Account.toLowerCase()) >= 0){
      //give role
      if (userRole.length == 0) {
        try {
          m = await consoleLog('Pre-Action','Checking database for: ' + nickname,true) 
          confirmAccount(userID,GW2Account)
          m = await consoleLog('Pre-Action','Adding role to: ' + nickname,m)
          await member.addRole(role);
          consoleLog('Action','Role added to: ' + nickname,m)
          await message.channel.send(sendMsg('trainee',userID,role))
        } catch (e) {
          consoleLog('Error',e,'')
        }

      }else {
        confirmAccount(userID,GW2Account)
      }
      
    }else {
      if (userRole.length == 0) {
        //set nickname
        try {
          m = await consoleLog('Pre-Action','Checking database for: ' + GW2Account,true) 
          confirmAccount(userID,GW2Account)
          var nick = setNick(GW2Account,nickname)
          m = await consoleLog('Pre-Action','Setting nickname: ' + nick,m)
          await message.guild.members.get(userID).setNickname(nick);
          m = await consoleLog('Pre-Action','Adding role to: ' + nickname,m)
          await member.addRole(role);
          consoleLog('Action','Changed nickname and added role to: ' + nick,m)
          await message.channel.send(sendMsg('nickname',userID,role))
        } catch (e) {
          consoleLog('Error',e,'')
        }
      }
    }

  }else if (message.author.bot) {return;}

  if(message.content.indexOf(process.env.prefix) !== 0) return;
  const args = message.content.slice(process.env.prefix.length).trim().split(/ +/g);
  const command = args.shift().toLowerCase();
  
  if (command == 'update') {
    //userData = {} //not needed ATM
    botConfig = {}
    loadBotConfig()
    consoleLog('Bot','Bot config updated','')
  }
  if (command == 'ignorebot') {
    ignoreBot = !ignoreBot
    consoleLog('Bot','Ignoring GW2Bot: '+ ignoreBot,'')
  }
  if (command == 'getid') {
    console.log(message.channel.id)
    console.log(message.author.id, message.author.id.length)
    console.log(message.guild.roles)
  }

  if (command == 'read') {
console.log('read')

    if (isNaN(args[0])){message.channel.send('Please enter a number'); return;}
      var id = args[0]
      doc.getRows(1, function (err, rows) {
        for (let i = 0; i < rows.length; i++) {
          if (rows[i].discordid == id) {
            var cSplit = rows[i].confirmedtobe.split(',')
            for (let z = 0; z < cSplit.length; z++) {
              consoleLog('Decrypt',decrypt(cSplit[z]),'')
            }
          }
        }
      })
  };

  if (command === 'manualnick' && message.author.id == process.env.owner ){
    if (isNaN(args[0])){return;}
    if (args[0] == undefined || args[1] == undefined){return;}
    var id = args[0]
    var GW2Acc = args[1]
      GW2Acc = GW2Acc.replace(/`s/g,' ')
    var nick = args[2]
    await message.guild.members.get(id).setNickname(setNick(GW2Acc,nick)).catch(error => consoleLog('Error',`Couldn't change nickname messages because of: ${error}`,''));
  }

  if(command === "removerole") {
    var role = message.guild.roles.find("name", "Trainee");
    var member = message.member
    member.removeRole(role).catch(console.error);
  }
  if(command === "uptime") {
    var uptime = process.uptime();
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
});
client.on('disconnected', function(e) {
  consoleLog('Error',e,'')
  client.login(process.env.token);
});

client.login(process.env.token);