const Discord = require('discord.js');
const yt = require('ytdl-core');
const tokens = require('./setari.json');
const fs = require('fs');
const moment = require("moment");
const client = new Discord.Client();
require("moment-duration-format");

let queue = {};

const commands = {
	'reda': (msg) => {
		if (queue[msg.guild.id] === undefined) return msg.channel.sendMessage(`Adauga piese folosind ${tokens.prefix}adauga .`);
		if (!msg.guild.voiceConnection) return commands.intra(msg).then(() => commands.play(msg));
		if (queue[msg.guild.id].playing) return msg.channel.sendMessage('Deja in play-list .');
		let dispatcher;
		queue[msg.guild.id].playing = true;

		console.log(queue);
		(function play(song) {
			console.log(song);
			if (song === undefined) return msg.channel.sendMessage('Play-listul este gol .').then(() => {
				queue[msg.guild.id].playing = false;
				msg.member.voiceChannel.leave();
			});
			msg.channel.sendMessage(`Se reda : **${song.title}** ceruta de : **${song.requester}**`);
			dispatcher = msg.guild.voiceConnection.playStream(yt(song.url, { audioonly: true }), { passes : tokens.passes });
			let collector = msg.channel.createCollector(m => m);
			collector.on('message', m => {
				if (m.content.startsWith(tokens.prefix + 'pauza')) {
					msg.channel.sendMessage('Piesa oprita .').then(() => {dispatcher.pause();});
				} else if (m.content.startsWith(tokens.prefix + 'reia')){
					msg.channel.sendMessage('Piesa reluata .').then(() => {dispatcher.resume();});
				} else if (m.content.startsWith(tokens.prefix + 'omite')){
					msg.channel.sendMessage('Piesa omisa .').then(() => {dispatcher.end();});
				} else if (m.content.startsWith('volum+')){
					if (Math.round(dispatcher.volume*50) >= 100) return msg.channel.sendMessage(`Volumul : ${Math.round(dispatcher.volume*50)}% .`);
					dispatcher.setVolume(Math.min((dispatcher.volume*50 + (2*(m.content.split('+').length-1)))/50,2));
					msg.channel.sendMessage(`Volumul : ${Math.round(dispatcher.volume*50)}% .`);
				} else if (m.content.startsWith('volum-')){
					if (Math.round(dispatcher.volume*50) <= 0) return msg.channel.sendMessage(`Volumul : ${Math.round(dispatcher.volume*50)}% .`);
					dispatcher.setVolume(Math.max((dispatcher.volume*50 - (2*(m.content.split('-').length-1)))/50,0));
					msg.channel.sendMessage(`Volumul : ${Math.round(dispatcher.volume*50)}% .`);
				} else if (m.content.startsWith(tokens.prefix + 'timp')){
					msg.channel.sendMessage(`Timpul piesei : ${Math.floor(dispatcher.time / 60000)}:${Math.floor((dispatcher.time % 60000)/1000) <10 ? '0'+Math.floor((dispatcher.time % 60000)/1000) : Math.floor((dispatcher.time % 60000)/1000)} .`);
				}
			});
			dispatcher.on('end', () => {
				collector.stop();
				play(queue[msg.guild.id].songs.shift());
			});
			dispatcher.on('error', (err) => {
				return msg.channel.sendMessage('eroare : ' + err).then(() => {
					collector.stop();
					play(queue[msg.guild.id].songs.shift());
				});
			});
		})(queue[msg.guild.id].songs.shift());
	},
	'intra': (msg) => {
		return new Promise((resolve, reject) => {
			const voiceChannel = msg.member.voiceChannel;
			if (!voiceChannel || voiceChannel.type !== 'voice') return msg.reply('Nu m-am putut conecta la canalul tau ...');
			voiceChannel.join().then(connection => resolve(connection)).catch(err => reject(err));
		});
	},
	'adauga': (msg) => {
		let url = msg.content.split(' ')[1];
		if (url == '' || url === undefined) return msg.channel.sendMessage(`Trebuie sa pui un link de pe youtube cu comanda ${tokens.prefix}adauga`);
		yt.getInfo(url, (err, info) => {
			if(err) return msg.channel.sendMessage('Link invalid : ' + err);
			if (!queue.hasOwnProperty(msg.guild.id)) queue[msg.guild.id] = {}, queue[msg.guild.id].playing = false, queue[msg.guild.id].songs = [];
			queue[msg.guild.id].songs.push({url: url, title: info.title, requester: msg.author.username});
			msg.channel.sendMessage(`S-a adaugat **${info.title}** in play-list .`);
		});
	},
	'lista': (msg) => {
		if (queue[msg.guild.id] === undefined) return msg.channel.sendMessage(`Adauga niste piese cu  ${tokens.prefix}adauga`);
		let tosend = [];
		queue[msg.guild.id].songs.forEach((song, i) => { tosend.push(`${i+1}. ${song.title} - Ceruta de : ${song.requester}`);});
		msg.channel.sendMessage(`Play-listul __**${msg.guild.name} :**__ Momentan **${tosend.length}** piesa ceruta ${(tosend.length > 15 ? '*[Doar urmatoarele 15 se vad]*' : '')}\n\`\`\`${tosend.slice(0,15).join('\n')}\`\`\``);
	},
	'comenzi': (msg) => {
		let tosend = ['```xl', tokens.prefix + 'intra : "Intra in voice-channel ."',	tokens.prefix + 'adauga : "Adauga o piesa de pe Youtube ."', tokens.prefix + 'eu : "Arata informatii despre autorul bot-ului ."', tokens.prefix + 'restart : "Restarteaza bot-ul ."', tokens.prefix + 'invitatie : "Arata invitatia bot-ului ." ', tokens.prefix + 'status : "Arata statusul bot-ului ."', tokens.prefix + 'lista : "Arata play-listul curent ."', tokens.prefix + 'reda : "Reda play-listul curent , se afiseaza maxim 15 piese ."', ''.toUpperCase(), tokens.prefix + 'pauza : "Opreste muzica ."',	tokens.prefix + 'reia : "Reda muzica ."', tokens.prefix + 'omite : "Omite o piesa ."', tokens.prefix + 'timp : "Arata timpul unei piese ."',	'volum+(+++) : "Creste volumul cu 2%/+"',	'volum-(---) : "Dezcreste volumul cu 2%/-"',	'```'];
		msg.channel.sendMessage(tosend.join('\n'));
	},
	'reboot': (msg) => {
		if (msg.author.id == tokens.adminID) process.exit(); 
	},
	'eu': (msg) => {
  const information = `
  • Bot realizat de therealisvan#6449 .
 • Versiune bot : 1.0.0
 • Construit pe baza Discord.js
 • Repo GitHub : https://github.com/andrewmmrnc/Sena /// fork me on GitHub .
 • Discord therealisvan#6449 : https://discordapp.com/invite/JTFTvF6
 • Pentru intrebari nu ezitati sa intrati pe discordul meu .
`;
  msg.channel.send(information);
	},
	'invitatie': (msg) => {
		msg.channel.sendMessage('Pentru a o adauga pe `Sena#6873` pe serverul tau de discord , te rog sa folosesti aceasta invitatie speciala : `https://discordapp.com/oauth2/authorize?permissions=66317419&scope=bot&client_id=323841234705580033` . O zi buna !');
	},
	'status': (msg) => {
		const duration = moment.duration(client.uptime).format(" D [days], H [hrs], m [mins], s [secs]");
  msg.channel.sendCode("asciidoc", `= STATUS SENA BOT =
  
• Memorie folosita  :: ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB
• Timpul online     :: ${duration}
• Utilizatori       :: ${client.guilds.reduce((a, b) => a + b.memberCount, 0).toLocaleString()}
• Servere           :: ${client.guilds.size.toLocaleString()}
• Canale            :: ${client.channels.size.toLocaleString()}
• Discord.js        :: v${Discord.version}`);
	},
	'restart': (msg) => {
		msg.channel.sendMessage("Adorm ...")
		msg.channel.sendMessage("M-am trezit ...")
    .then(() => {
      process.exit();
    })
    .catch((e) => {
      console.error(e);
    });
	}
};

client.on('ready', () => {
	 client.user.setGame('with herself .','(https://www.twitch.tv/xepox30)');
     client.user.setStatus('idle');
	console.log('Is gata ticule xDDDD ! Fvck me daddy !!!!!');
});

console.log(`M-am deconectat la data de ${new Date()} .`);

console.log(`M-am reconectat , bai nene ba , la data de ${new Date()} .`);

client.on('message', msg => {
	if (!msg.content.startsWith(tokens.prefix)) return;
	if (commands.hasOwnProperty(msg.content.toLowerCase().slice(tokens.prefix.length).split(' ')[0])) commands[msg.content.toLowerCase().slice(tokens.prefix.length).split(' ')[0]](msg);
});
client.login(tokens.d_token);
