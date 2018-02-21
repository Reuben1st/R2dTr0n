if (process.env.NODE_ENV !== 'production') {
  require('dotenv').load();
}

const Discord = require("discord.js");
const client = new Discord.Client();

const http = require('http');
const express = require('express');
//const config = require("./config.json");

//var PublicPem = key.exportKey('pkcs1-public-pem');
//var privatePem = key.exportKey('pkcs1-pem');
const NodeRSA = require('node-rsa');
const key = new NodeRSA();
const keyData = process.env.privateRSA.replace(/\\n/g, '\n')
key.importKey(keyData,'pkcs1')


  const app = express();
  app.get("/", (request, response) => {
    console.log(Date.now() + " Ping Received");
    response.sendStatus(200);
  });
  app.listen(process.env.PORT);
  setInterval(() => {
    http.get(`http://${process.env.PROJECT_DOMAIN}.glitch.me/`);
  }, 280000);


var GoogleSpreadsheet = require('google-spreadsheet');
var async = require('async');

// spreadsheet key is the long id in the sheets URL
var doc = new GoogleSpreadsheet('145J-MEXIGh-ww_gnRtjLyhZ6GXS7t9MH96-Xlsvw7gY');
var sheet;

var pKey = process.env.private_key.replace(/\\n/g, '\n')

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
/*
doc.useServiceAccountAuth(creds, function(e){
  console.log(e)
});

*/
loadBotConfig()
//var userData = {}
var botConfig = {}
function loadBotConfig() {
  
  doc.useServiceAccountAuth(creds, function (err) {
    /*
    doc.getRows(1, function (err, rows) {
      for (let i = 0; i < rows.length; i++) {
        userData[rows[i].discordid] = rows[i]
      }
    });
    */
    doc.getRows(2, function (err, rows) {
      for (let i = 0; i < rows.length; i++) {
        botConfig[rows[i].item] = rows[i].message
      }
    });
  });
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
    if(err) {console.log(err);}

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
      if(err) {console.log(err);}
    });
  });

  
  
}

function setNick(gw2,nick) {
  var n = botConfig['setnickname']
  n = n.replace(/`gw2`/g,gw2)
  n = n.replace(/`nick`/g,nick)
  return n;
}

client.on("ready", () => {
  console.log(`Bot has started, with ${client.users.size} users, in ${client.channels.size} channels of ${client.guilds.size} guilds.`); 
  client.user.setActivity(`R2dTr0n`);
});

client.on("guildCreate", guild => {
  console.log(`New guild joined: ${guild.name} (id: ${guild.id}). This guild has ${guild.memberCount} members!`);
  client.user.setActivity(`on ${client.guilds.size} servers`);
});

client.on("guildDelete", guild => {
  console.log(`I have been removed from: ${guild.name} (id: ${guild.id})`);
  client.user.setActivity(`on ${client.guilds.size} servers`);
});


client.on("message", async message => {
  //if(message.author.bot) return;
  //310050883100737536 gw2bot
  
  if(message.author.id == '310050883100737536'){

    
    //var user = message.embeds[0].message.content.split(',')[0] //Just assuming that's their user id.
//var userID = user.replace(/[<@!>]/g, '');

    var member = message.mentions.members.first();
    if (member == null || member == undefined){return;}
    var userID = member.id;
    var userRole = client.users.get(userID).lastMessage.member._roles

    //console.log(userID)
    if (message.embeds[0] == null || message.embeds[0] == undefined){return;}
    var GW2Account = message.embeds[0].author.name
    if (GW2Account == null || GW2Account == undefined){return;}
    //console.log(GW2Account)
    var nickname = client.users.get(userID).lastMessage.member.nickname
    if (nickname == null){
      //check username
      nickname = client.users.get(userID).username
    }
    //nickname = nickname.toLowerCase()
    var role = message.guild.roles.find("name", "Trainee");
    var member = message.mentions.members.first();
    if (nickname.toLowerCase().search(GW2Account.toLowerCase()) >= 0){
      //give role
      
      if (userRole.length == 0) {
        member.addRole(role).catch(console.error);
        confirmAccount(userID,GW2Account)
        message.channel.send(sendMsg('trainee',userID,role))
      }else {
        confirmAccount(userID,GW2Account)
      }
      
    }else {
      if (userRole.length == 0) {
        message.guild.members.get(userID).setNickname(setNick(GW2Account,nickname));
        member.addRole(role).catch(console.error);
        confirmAccount(userID,GW2Account)
        message.channel.send(sendMsg('nickname',userID,role))
      }
    }

  }else if (message.author.bot) return;

  if(message.content.indexOf(process.env.prefix) !== 0) return;
  const args = message.content.slice(process.env.prefix.length).trim().split(/ +/g);
  const command = args.shift().toLowerCase();

  /*
  var member = message.mentions.members.first();
  var userID = member.id;
*/
  
  if (command == 'update') {
    //userData = {}
    botConfig = {}
    loadBotConfig()
    message.channel.send('Bot config updated')
  }
  if (command == 'add') {
    /*
    console.log('change')
    nickname = 'Gw2'
    message.guild.members.get(userID).setNickname(setNick('tteee.1111',nickname));
    console.log('changed')
    //confirmAccount('329708560244146176',args.join(" "))
    */
  }

  if (command == 'read') {
console.log('read')
    //doc.useServiceAccountAuth(creds, function (err) {
 
   // id = "GXBpxtCFY496gbrWZIJ8ed3ia5IB1EenHfjqJDuAdTFg4WXq0QIfjrO4+Ak9W+UH01grLg8W0wtzF/w5StJp1ufPilMo2rDj4lgCLptCRq0ch4505yRW/j/TkUBRG1qLxEg8ucroQI6Zf4eN2d369HrxYB6GD0VueKWUnoSb7wE="
      doc.getRows(1, function (err, rows) {
        for (let i = 0; i < rows.length; i++) {
          //if (rows[i].discordid == id) {
            var cSplit = rows[i].confirmedtobe.split(',')
            for (let z = 0; z < cSplit.length; z++) {
              //const element = array[index];
              console.log(decrypt(cSplit[z]))
            }
            //var decrypted = key.decrypt(rows[i].confirmedtobe, 'utf8');
            //console.log('decrypted: ', decrypted);;
          //}
        }
      })
   // });

  };
/*
  if(command === "addrole") {
    let role = message.guild.roles.find("name", "Trainee");
    let member = message.mentions.members.first();
console.log(message.mentions.members.roles)
    if(message.mentions.members.roles == undefined) {
      console.log('adding role')
      member.addRole(role).catch(console.error);
    } else {
      console.log(`Yay, the author of the message has the role!`);
    }
   
  }
  */
/*
  if(command === "say") {
    // makes the bot say something and delete the message. As an example, it's open to anyone to use. 
    // To get the "message" itself we join the `args` back into a string with spaces: 
    const sayMessage = args.join(" ");
    // Then we delete the command message (sneaky, right?). The catch just ignores the error with a cute smiley thing.
    message.delete().catch(O_o=>{}); 
    // And we get the bot to say the thing: 
    message.channel.send(sayMessage);
  }
  
  */
  // Let's go with a few common example commands! Feel free to delete or change those.
  
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

client.login(process.env.token);
//client.login(process.env.token);