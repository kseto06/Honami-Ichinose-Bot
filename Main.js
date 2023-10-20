/*
* HONAMI ICHINOSE DISCORD BOT - From the Classroom of the Elite
* @author Kaden (Winterlicia) <>
*/

/*
* INSTRUCTIONS -- RUNNING THE CODE
* * * If you want to do public hosting for Spotify and want to run the bot at the same time: run "npm start"
* * * If you want to do private hosting (i.e. security purposes) and want to run the bot:    run "node Main.js"
*/

/*IDEAS:
*  Add a calendar function that allows the user to see the things that they need to do -- COMPLETED
*  Add Spotify API function to play music on Discord API --WORK IN PROGRESS
*/

//Init discord.js, Table, fetch, SpotifyAPI
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
import SpotifyWebApi from 'spotify-web-api-node'; //Documentation: https://www.npmjs.com/package/spotify-web-api-node

//Init config for Token, Spotify Client ID, Spotify Client Secret
import fs from 'fs';
const config = JSON.parse(fs.readFileSync('config.json', 'utf-8'));

const clientId = config.spotify_clientid; // Replace with your Spotify client ID
const clientSecret = config.spotify_clientsecret; // Replace with your Spotify client secret

//Define spotifyApi with client's ID and Secret
const spotifyApi = new SpotifyWebApi({
  clientId: clientId,
  clientSecret: clientSecret,
});

import { Table } from 'embed-table'; //Documentation: https://github.com/TreeFarmer/embed-table/tree/master
const table = new Table ({
    titles: ['**Tasks**', '**Subject**', '**Due Date**'],
    titleIndexes: [0, 65, 105],
    columnIndexes: [0, 30, 50],
    start: '`',
    end: '`',
    padEnd: 3
});

//Init functions & arrays
import { calculator, randomizeArray, addTask, viewTask, resolveTask, sleep, checkDueDate } from './Functions.js';
import { goodbyeWords, helloWords, sadWords, encouragements } from './Arrays.js';
import { Task } from './Task.js';
import { getTomorrowDate } from './Date.js';
import { authorizeSpotify, playSong, returnNextTracks, checkCurrentTrack } from './Spotify/SpotifyFunctions.js';
const currentDate = new Date();
var newAccessToken = null;

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

//WELCOME MESSAGE FUNCTIONALITY
client.on('guildMemberAdd', (member) => {  
    const channel = member.guild.channels.cache.get('general');
    console.log(channel);

    const welcomeEmbed = new EmbedBuilder()
        .setColor('#FFB6C1')
        .setTitle(`Welcome, <@${member.id}>, to the Ichinose Fan Club!! You can learn more about me here: <3`)
        .setDescription('[Honami Ichinose - About Me!](https://you-zitsu.fandom.com/wiki/Honami_Ichinose)')
        .setImage('https://i.redd.it/zmnr47j814m81.png');
    //Send the embed as a message:
    member.guild.channels.cache.find(ch => ch.name === 'general').send({ embeds: [welcomeEmbed] });
});


//MESSAGE FUNCTIONALITIES:
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
                    client.off('messageCreate', calendarListener);

                } else if (nestedMessage === '!view') {
                    await message.channel.send("Here is your current to-do list~~");
                                        
                    //Get the task values in the array from viewTask and format it in the table
                    viewTask()
                        .then((result) => {
                            //result = currentTaskList array, iterate through each task:
                            for (let i = 0; i < result.length; i++) {
                                var line = result[i];
                                var split = line.split(',');
                                var currentTask = new Task(split[0], split[1], split[2]);
                                table.addRow([currentTask.getTask(), currentTask.getSubject().trim(), currentTask.getDueDate().trim()]);
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

    //TIME FUNCTIONALITY: 
    //At the beginning of the day, check due dates, and send a reminder to the user for tasks due the next day:
    if (content === '!reminder') {
        checkDueDate(getTomorrowDate())
            //result returns true if the due date today exists.
            .then((result) => {
                if (result !== null && result.length !== 0) {
                    let timeOfDay = '';
                    if (currentDate.getHours() >= 0 && currentDate.getHours() < 12) {
                        timeOfDay = 'morning';
                    } else if (currentDate.getHours() >= 12 && currentDate.getHours() < 19) {
                        timeOfDay = 'afternoon';
                    } else if (currentDate.getHours() >= 19 && currentDate.getHours() < 24) {
                        timeOfDay = 'evening';
                    } else {
                        timeOfDay = 'day';
                    }
                    message.channel.send("Good "+timeOfDay+"! You have task(s) that seem to be due tomorrow~~");
                    
                    //Create another table of tasks due tomorrow:
                    for (let i = 0; i < result.length; i++) {
                        var line = result[i];
                        var split = line.split(',');
                        var task_ToDo = new Task(split[0], split[1], split[2]);
                        table.addRow([task_ToDo.getTask(), task_ToDo.getSubject().trim(), task_ToDo.getDueDate().trim()]);
                    }

                    //Once all values have been added to the table, use embedBuilder to send the table
                    const embed = new EmbedBuilder().setFields(table.toField());                            
                    message.channel.send({ embeds: [embed] });
                    message.channel.send("Good luck on finishing up your tasks for tomorrow <3");
                } else {
                    message.channel.send("You have nothing due tomorrow~~");
                }
            })
            .catch((error) => {
                console.error(error);
            });
    }

    if (content === '!authorize') {
        await message.reply("Sure!! For me to connect to Spotify and play music, I'm going to need you to make sure your Spotify app/web is opened up, with you logged in~~");
        await message.reply("Authorize here: http://127.0.0.1:8080/authorize");
        //Authorize Spotify with function defined in PKCE Authorization
        await authorizeSpotify()
            .then((accessToken) => {
                newAccessToken = accessToken;
                console.log(newAccessToken);
                message.channel.send("Successfully authorized!!");
            })
            .catch((error) => {
                console.log("Authorization failed: "+error);
            });
    }

    var enableMusic = false;
    if (content === '!music') {
        await message.channel.send("Make you authorize Spotify first or else these functions won't run!! Authorize using the command: !authorize");
        sleep(3000);
        await message.channel.send("Please enter a function: !play, !cancel");
        enableMusic = true;
        
        const musicListener = async (nestedMessage) => {
            if (nestedMessage.author.bot) { return; }

            nestedMessage = String(nestedMessage).toLowerCase().trim();

            console.log('Nested message: '+nestedMessage);
            
            if (enableMusic === true) {

                if (nestedMessage === '!cancel') {
                    await message.channel.send("Ok then, cancelling~~");
                    client.off('messageCreate', musicListener);

                } else if (nestedMessage === '!play') {
                    await message.channel.send("Alrighty, enter the name of the song and the name of the artist that you want to play!");
                    await message.channel.send("In the format of: 'Song Name', 'Artist Name'");

                    const playMusicListener = async (input) => {
                        console.log("Attempt to log access token from global declare: "+newAccessToken);
                        try {
                            input = String(input).split(','); //input[0] = songName, input[1] = artistName
                            let SongName = input[0].trim();
                            let ArtistName = input[1].trim().toLowerCase();
                            try {
                                playSong(String("'"+SongName+"'"), String("'"+ArtistName+"'"), newAccessToken)
                                    .then((success) => {
                                        //Send current song playing (only when it is actually playing):
                                        if (success) {
                                            message.channel.send(`Now playing: **${input[0].trim().split(' ').map((word) => (word[0].toUpperCase() + word.substring(1, word.length))).join(" ")}**, by **${input[1].trim().split(' ').map((word) => word[0].toUpperCase() + word.substring(1, word.length)).join(" ")}**~~`);
                                            return;
                                        } else {
                                            message.channel.send("Couldn't find the song you wanted to play! :(");
                                            return;
                                        }
                                    });                           

                                //When the song is over, play the next song in the artist's top tracks:
                                await returnNextTracks(input[1].trim().toLowerCase(), newAccessToken)
                                    .then(() => {
                                        message.channel.send(`Some more tracks by **${input[1].trim().split(' ').map((word) => word[0].toUpperCase() + word.substring(1, word.length)).join(" ")}** have been added to the queue~~`);
                                    })
                                    .catch((error) => {
                                        console.error("An error occurred: "+error);
                                        message.channel.send("Couldn't get your next tracks! :(");
                                   });

                            } catch (error) {
                                console.error("Error with playing the song: "+error);
                                await message.channel.send("Your song wasn't found~~ Check if your song really exists!");
                            }
                            client.off('messageCreate', playMusicListener);
                            client.off('messageCreate', musicListener);

                        } catch (error) {
                            message.channel.send("There was an error in trying to find and play your song :(");

                            const periodIndex = error.message.indexOf('.');
                            // If a period is found, extract the first sentence. Otherwise, log the entire error message.
                            if (periodIndex !== -1) {
                                message.channel.send('An error occurred: '+ error.message.substring(0, periodIndex + 2));
                                message.channel.send("Please refresh the Honami Ichinose Bot to be able to use it again.");
                            } else {
                                message.channel.send('An error occurred:'+ error.message);
                            }

                            client.off('messageCreate', playMusicListener);
                            client.off('messageCreate', musicListener);
                            console.error('Error:', error);
                            throw error;
                        }
                    }
                    //Register playMusicListener
                    client.on('messageCreate', playMusicListener);
                } else {
                    console.log("Functionality doesn't exist");
                }                          
            }
        }
        //Register musicListener
        client.on('messageCreate', musicListener);
    }

    //Pause and resume SpotifyAPI Commands
    spotifyApi.setAccessToken(newAccessToken);
    if (content === '!pause') {
        spotifyApi.pause()
            .then(() => {
                message.channel.send("Your song has paused!");
            })
            .catch((error) => {
                //if the user making the request is non-premium, a 403 FORBIDDEN response code will be returned
                console.log('Something went wrong!', error);
            });
    } else if (content === '!resume') {
        spotifyApi.play()
            .then(() => {
                message.channel.send("Your song is resuming~~");
            })
            .catch((error) => {
                //if the user making the request is non-premium, a 403 FORBIDDEN response code will be returned
                console.log('Something went wrong!', error);
            });
    } else if (content === '!skip to next') {
        spotifyApi.skipToNext()
            .then(() => {
                message.channel.send("Alright, skipping to the next song in queue~~");
            })
            .then(() => {
                setTimeout(async () => {
                    spotifyApi.getMyCurrentPlayingTrack()
                    .then((currentSong) => {
                        message.channel.send(`Now playing: **${currentSong.body.item.name}**, by **${currentSong.body.item.artists[0].name}**~~`);
                    })
                    .catch((error) => {
                        console.error("Error in getting the current playback state of the next track: "+error);
                    });
                }, 5000);
            })
            .catch((error) => {
                console.error("Error in skipping to the next song: "+error);
            });
    } else if (content === '!skip to previous') {
        spotifyApi.skipToPrevious()
            .then(() => {
                message.channel.send("Alright, playing back your previous song...");
            })
            .then(() => {
                setTimeout(async () => {
                    spotifyApi.getMyCurrentPlayingTrack()
                    .then((currentSong) => {
                        message.channel.send(`Now playing: **${currentSong.body.item.name}**, by **${currentSong.body.item.artists[0].name}**~~`);
                    })
                    .catch((error) => {
                        console.error("Error in getting the current playback state of the next track: "+error);
                    });
                }, 3000);
            })
            .catch((error) => {
                console.error("Error in skipping back to the previous song: "+error);
            });
    }

    //Build Clash Royale Deck
    if (content === "!build cr") {
        await message.reply("I'll make you the strongest deck there is >:D");
    }

    //Periodically check the current track (SpotifyFunction)
    setInterval(() => {
        checkCurrentTrack(newAccessToken)
            .then((song_and_artist) => {
                //[0] contains song, [1] contains artist
                message.channel.send(`Now playing: **${song_and_artist[0]}**, by **${song_and_artist[1]}**~~`); 
            })        
            .catch((error) => {
                console.error('Error in setInterval:', error);
            });
      }, 5000);
});

client.login(config.token);