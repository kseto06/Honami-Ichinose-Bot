/*
* HONAMI ICHINOSE DISCORD BOT - From the Classroom of the Elite
* @author Kaden (Winterlicia) <>
*/

/*IDEAS:
*  Add a calendar function that allows the user to see the things that they need to do -- COMPLETED
*  Add Spotify API function to play music on Discord API
*/

//Init discord.js, Table, fetch
import fetch from 'node-fetch';
import { Client, GatewayIntentBits, EmbedBuilder } from 'discord.js';
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessageReactions,
  ],
});
import { Table } from 'embed-table'; //https://github.com/TreeFarmer/embed-table/tree/master

//Init Token config
import fs from 'fs';
const config = JSON.parse(fs.readFileSync('config.json', 'utf-8'));

//Init functions & arrays
import { calculator, randomizeArray, addTask, viewTask, resolveTask, sleep } from './Functions.js';
import { goodbyeWords, helloWords, sadWords, encouragements } from './Arrays.js';
import { Task } from './Task.js';

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.on('guildMemberAdd', (member) => {  
    const channel = member.guild.channels.cache.get('general');
    console.log(channel);

    const welcomeEmbed = new EmbedBuilder()
        .setColor('#FFB6C1')
        .setTitle(`Welcome, ${member.user}, to the Ichinose Fan Club!! You can learn more about me here: <3`)
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
        if (content.includes('hi') && !/hi\b/.test(content)) {
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
        await message.reply("hmmm... should I be your mommy :smirk:");
    }

    //Calculator function
    var enableCalculator = false;
    if (content === "!calculator") {
        await message.reply("I studied Calculus and Vectors at the Classroom of the Elite >:)");
        await message.channel.send("Gimme a question!!")
        enableCalculator = true;
        
        //Nested messageCreate for calculation:
        const calculatorListener = async (nestedMessage) => {
            if (nestedMessage.author.bot) return;

            nestedMessage = nestedMessage.content.toLowerCase();
            
            if (enableCalculator === true) {
                await message.channel.send("Alrighty, give me a moment...");

                if (nestedMessage === '!cancel') {
                    await message.channel.send("Ok then, no more math for now~~");
                    client.off('messageCreate', calculatorListener);
                } else {    
                    calculator(nestedMessage)
                        .then((result) => {
                            message.channel.send(result);
                            enableCalculator = false;
                            client.off('messageCreate', calculatorListener);
                        })
                        .catch((error) => {
                            message.channel.send("Hmmm... I couldn't do it! Quite the challenge you got there... :(");
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
    
    var enableCalendar = false;
    var needToAdd = false;
    var needToResolve = false;
    if (content === "!calendar") {
        await message.reply("Sure, would you like to view your current tasks, do you already have another task to add, or have you finished a task?? :thinking:");
        await message.channel.send("!cancel, !view, !add, !resolve");
        enableCalendar = true;

        const calendarListener = async (nestedMessage) => {
            if (nestedMessage.author.bot) { return; }

            nestedMessage = nestedMessage.content.toLowerCase();

            if (enableCalendar === true) {
                await message.channel.send("Alrighty, give me a moment...");
                sleep(4000);

                if (nestedMessage === '!cancel') {
                    await message.channel.send("Ok then, cancelling~~");
                    client.off('messageCreate', calculatorListener);

                } else if (nestedMessage === '!view') {
                    await message.channel.send("Here is your current to-do list~~");
                                        
                    const table = new Table ({
                        titles: ['**Tasks**', '**Subject**', '**Due Date**'],
                        titleIndexes: [0, 65, 105],
                        columnIndexes: [0, 30, 50],
                        start: '`',
                        end: '`',
                        padEnd: 3
                    });
                    //Get the task values in the array from viewTask and format it in the table
                    viewTask()
                        .then((result) => {
                            //result = currentTaskList array, iterate through each task:
                            for (let i = 0; i < result.length; i++) {
                                var line = result[i];
                                var split = line.split(',');
                                var currentTask = new Task(split[0], split[1], split[2]);
                                table.addRow([currentTask.getTask(), currentTask.getSubject(), currentTask.getDueDate()]);
                            }

                            //Once all values have been added to the table, use embedBuilder to send the table
                            const embed = new EmbedBuilder().setFields(table.toField());                            
                            message.channel.send({ embeds: [embed] });

                            enableCalendar = false;
                            client.off('messageCreate', calendarListener);
                        })
                        .catch((error) => {
                            message.channel.send("Hmmm, I can't seem to load your to-do list... It might be empty!");
                            enableCalendar = false;
                            client.off('messageCreate', calendarListener);
                            console.error(error);
                        });

                } else if (nestedMessage === '!add') {
                    await message.channel.send("Alright, enter in a task to add to your to-do list~~");
                    sleep(1000);
                    await message.channel.send("Add in the format of: 'Task', 'Subject', 'Due Date'~~");
                    sleep(1000);
                    needToAdd = true;

                    const newTask = async (addNewTask, addNewSubject, addNewDueDate) => {

                        if (needToAdd === true) {
                            //Assign above values to the newTask
                            //Use addTask(input) function defined in Functions.js
                            addTask(String(addNewTask, addNewSubject, addNewDueDate))
                                .then((result) => {
                                    message.channel.send(result);
                                    needToAdd = false;
                                    enableCalendar = false;
                                    client.off('messageCreate', calendarListener);
                                    client.off('messageCreate', newTask);
                                })
                                .catch((error) => {
                                    message.channel.send("Oh no... I couldn't add your task to the database :(");
                                    needToAdd = false;
                                    enableCalendar = false;
                                    client.off('messageCreate', calendarListener);
                                    client.off('messageCreate', newTask);
                                    console.error(error);
                                });
                        }
                    }
                    //Register the nested newTask listener:
                    client.on('messageCreate', newTask);
                    return;

                } else if (nestedMessage === '!resolve') {
                    await message.channel.send("Alright, enter the name of the task that you want to remove~~");
                    sleep(1000);
                    await message.channel.send("Only the TASK NAME, you hear me?! If you don't follow my instructions I'm not gonna help you >:(")
                    sleep(1000);
                    needToResolve = true;

                    const removeTask = async (taskName) => {

                        if (needToResolve === true) {
                            resolveTask(taskName)
                                .then((result) => {
                                    message.channel.send(result);
                                    needToResolve = false;
                                    enableCalendar = false;
                                    client.off('messageCreate', calendarListener);
                                    client.off('messageCreate', removeTask);
                                })
                                .catch((error) => {
                                    message.channel.send("Either your to-do list is empty, or I just couldn't find the task in the database that you wanted to remove!");
                                    console.error(error);
                                    needToResolve = false;
                                    enableCalendar = false;
                                    client.off('messageCreate', calendarListener);
                                    client.off('messageCreate', removeTask);
                                });
                        }
                    }
                    //Register the nested removeTask listener:
                    client.on('messageCreate', removeTask);
                    return;

                } else {
                    if (enableCalendar !== true) {
                        return;
                    } else {
                        await message.channel.send("Invalid input! I'm gonna cancel this operation~~");
                        await console.log("Invalid input: "+nestedMessage.content);
                        client.off('messageCreate', calendarListener);
                    }
                }
            }
        }
        //Register the nested calendar listener:
        client.on('messageCreate', calendarListener);
    }

    //Build Clash Royale Deck
    if (content === "!build cr") {
        await message.reply("I'll make you the strongest deck there is >:D");
    }
});

client.login(config.token);