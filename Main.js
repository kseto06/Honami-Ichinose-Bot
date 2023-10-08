/*
* HONAMI ICHINOSE DISCORD BOT - From the Classroom of the Elite
* @author Kaden (Winterlicia) <>
*/

//Init discord.js
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildMembers,
  ],
});

//Init Token config
const fs = require('fs');
const config = JSON.parse(fs.readFileSync('config.json', 'utf-8'));

//Init functions & arrays
const { calculator, randomizeArray } = require('./Functions');
const { goodbyeWords, helloWords, sadWords, encouragements } = require('./Arrays');

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.on('guildMemberAdd', (member) => {  
    const channel = member.guild.channels.cache.get('general');
    console.log(channel);

    const welcomeEmbed = new EmbedBuilder()
        .setColor(FFB6C1)
        .setTitle("Welcome, "+member.user.username+", to the Ichinose Fan Club!! You can learn more about me here: <3")
        .setDescription('[Honami Ichinose - About Me!](https://you-zitsu.fandom.com/wiki/Honami_Ichinose)')
        .setImage('https://i.redd.it/zmnr47j814m81.png');
    //Send the embed as a message:
    member.guild.channels.cache.find(ch => ch.name === 'general').send({ embeds: [welcomeEmbed] });
});

client.on("messageCreate", async message => {
    if (message.author.bot) { return; }

    const content = message.content.toLowerCase();
    console.log(content);

    //Check for empty message errors
    if (message.content.trim() === '') {
        console.log('Received an empty message.');
        return;
    }

    //"Hello" function
    if (helloWords.some((word) => content.includes(word))) {
        if (!/hi\b/.test(content)) {
            return;
        } else {
            await message.reply("Hi! Honami Ichinose here <3");
        }
    }

    //"Goodbye" function
    if (goodbyeWords.some((word) => content.includes(word))) {
        await message.reply("bye bye!! see u later <3")
    }

    //"Encouragements"
    if (sadWords.some((word) => content.includes(word))) {
        randomizeArray(encouragements)
            .then((result) => {
                message.reply(result);
            })
            .catch((error) => {
                message.reply("I'm so sorry... I just don't know what to say :(");
                console.error(error);
            });
    }

    if (content.includes('mommy') || content.includes('mommies')) {
        await message.reply("Addison likes dommy mommies");
        await message.reply("@Kades needs to remove this from his code later so that Waterloo doesn't see this...");
    }

    //Calculator function
    var enableCalculator = false;
    if (content === "!calculator") {
        await message.reply("I studied Calculus and Vectors at the Classroom of the Elite >:)");
        await message.reply("Gimme a question!!")
        enableCalculator = true;
        
        //Nested messageCreate for calculation:
        const calculatorListener = async (nestedMessage) => {
            if (nestedMessage.author.bot) return;
            
            if (enableCalculator === true) {
                await message.reply("Alrighty, give me a moment...");

                if (nestedMessage === '!cancel') {
                    await message.reply("Ok then, no more math for now~~");
                    client.off('messageCreate', calculatorListener);
                } else {    
                    calculator(nestedMessage)
                        .then((result) => {
                            message.reply(result);
                            enableCalculator = false;
                            client.off('messageCreate', calculatorListener);
                        })
                        .catch((error) => {
                            message.reply("Hmmm... I couldn't do it! Quite the challenge you got there... :(");
                            enableCalculator = false;
                            client.off('messageCreate', calculatorListener);
                            console.error(error);
                        });
                }
            }
        }
        //Register the nested calculator listener:
        client.on('messageCreate', calculatorListener);
    }

    //Build Clash Royale Deck
    if (content === "!build cr") {
        await message.reply("I'll make you the strongest deck there is >:D");


    }
});



client.login(config.token);