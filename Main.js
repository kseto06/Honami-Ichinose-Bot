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
*  Add ChatGPT Functions
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
    titleIndexes: [0, 61, 100],
    columnIndexes: [0, 30, 50],
    start: '`',
    end: '`',
    padEnd: 3
});

//Init functions, arrays, classes, global variables
import { calculator, randomizeArray, addTask, viewTask, resolveTask, reviseTask, sleep, checkDueDate } from './Functions.js';
import { goodbyeWords, helloWords, sadWords, encouragements } from './Arrays.js';
import { Task } from './Task.js';
import { Token } from  './Token.js';
import { getTomorrowDate } from './Date.js';
import { authorizeSpotify, playSong, returnNextTracks, checkCurrentTrack, requestRefresh, setVolume, clearQueue, getQueue, addToQueue, getAlbum, playArtist, getTrackURL } from './Spotify/SpotifyFunctions.js';
const currentDate = new Date();
var newAccessToken = null;
var newRefreshToken = null;
const Tokens = new Token();
var isPaused = false;

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
            if (nestedMessage.author.bot) { return; }

            nestedMessage = nestedMessage.content.toLowerCase();
            
            if (enableCalculator === true) {
                await message.channel.send("Alrighty, give me a moment...");

                if (nestedMessage === '!cancel') {
                    await message.channel.send("Ok then, no more math for now~~");
                    client.off('messageCreate', calculatorListener);
                    return;
                } else {    
                    calculator(nestedMessage)
                        .then((result) => {
                            if (result) {
                                message.channel.send("Here's your answer! I got: "+result);
                                enableCalculator = false;
                                client.off('messageCreate', calculatorListener);
                                return true;
                            } else {
                                message.channel.send("Your input is invalid!!");
                                enableCalculator = false;
                                client.off('messageCreate', calculatorListener);
                                return false;
                            }
                        })
                        .catch((error) => {
                            message.channel.send("Hmmm... I couldn't do it! Quite the challenge you got there... :(");
                            enableCalculator = false;
                            client.off('messageCreate', calculatorListener);
                            console.error(error);
                            return null;
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
    var needToRevise = false;
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
                        if (addNewTask.author.bot) { return; }

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
                        if (taskName.author.bot) { return; }

                        console.log("taskName: "+taskName)
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

                } else if (nestedMessage === '!revise') {
                    await message.channel.send("Alright, enter the name of the task you want to revise~~");
                    sleep(1000);
                    await message.channel.send("Only the TASK NAME, you hear me?! If you don't follow my instructions I'm not gonna help you >:(")
                    sleep(1000);
                    needToRevise = true;
                    let isChosen = false;
                    let dataAdded = false;
                    var updatedData = null;
                    var parameterChoice = null;
                    var assignedChoice = null;

                    const taskRevision = async (taskName) => {

                        if (needToRevise === true) {
                            await message.channel.send("Which part of the task do you want to change - the task name, the subject, or the due date?? :thinking:");
                            try {
                                const parameter = async (chosenParameter) => {
                                    chosenParameter = String(chosenParameter);
                                    let choice = null;

                                    //Choose the appropriate choice based on the user's input:
                                    if (chosenParameter.includes('task')) {
                                        choice = 'task name';
                                    } else if (chosenParameter.includes('subject')) {
                                        choice = 'subject';
                                    } else if (chosenParameter.includes('date')) {
                                        choice = 'due date';
                                    } else {
                                        message.channel.send("Invalid input!! I'm going to cancel this operation~~");
                                        client.off('messageCreate', calendarListener);
                                        client.off('messageCreate', parameter);
                                        client.off('messageCreate', taskRevision);
                                        needToRevise = false;
                                        return null;
                                    }
                                    client.off('messageCreate', parameter)
                                    isChosen = true;
                                    return { chosenParameter, choice };
                                }
                                //Assign the returned values to the global variables within this function:
                                assignedChoice = parameter.choice;
                                parameterChoice = parameter.chosenParameter;
                            } catch (error) {
                                console.error("Error in the parameter function: "+error);
                                message.channel.send("Couldn't process your chosen parameter :(");
                            }

                            if (isChosen === true) {
                                try {
                                    await message.channel.send(`What do you want to change the **${assignedChoice}** to?? :thinking:`);
                                    const changed = async (newData) => {
                                        client.off('messageCreate', changed); 
                                        return newData;
                                    }
                                    //Assign the returned value to the global variable within this function: 
                                    updatedData = changed.newData;
                                    console.log("TEST newData: "+updatedData); 
                                    client.on('messageCreate', changed);                        
                                    dataAdded = true;
                                } catch (error) {
                                    console.error("Error in the changed (newData) function: "+error);
                                    message.channel.send("Couldn't process your new data input :(");
                                }
                            }
                            

                            if (dataAdded === true) {
                                //Add global variables as the parameters for the reviseTask function
                                await reviseTask(String(taskName), String(parameterChoice), String(updatedData))
                                    .then((success) => {
                                        if (success) {
                                            message.channel.send('Your task has been successfully revised~~');
                                            client.off('messageCreate', calendarListener);
                                            client.off('messageCreate', taskRevision);
                                            needToRevise = false;
                                        } else {
                                            message.channel.send("Couldn't revise your task!! :(");
                                            client.off('messageCreate', calendarListener);                                        
                                            client.off('messageCreate', taskRevision);
                                            needToRevise = false;
                                        }
                                    })
                                    .catch((error) => {
                                        console.error('Error in trying to revise task: '+error);
                                        message.channel.send("Couldn't revise your task!! :(");
                                        client.off('messageCreate', calendarListener);
                                        client.off('messageCreate', taskRevision);
                                        needToRevise = false;
                                        return null;
                                    });
                            }
                        } else {
                            message.channel.send("There was an error in processing your task name :(");
                        }
                        //Register taskRevision listener:
                        client.on('messageCreate', taskRevision);
                        return;     
                    }             

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
                message.channel.send("Couldn't get your to-do tasks :(");
                console.error("Reminder failed: "+error);
            });
    }

    //Authorize Spotify function
    if (content === '!authorize') {
        await message.reply("Sure!! For me to connect to Spotify and play music, I'm going to need you to make sure your Spotify app/web is opened up, with you logged in~~");
        await message.reply("Authorize here: http://127.0.0.1:8080/authorize");
        //Authorize Spotify with function defined in PKCE Authorization
        await authorizeSpotify() 
            .then((data) => {
                newAccessToken = data.accessToken;
                newRefreshToken = data.refreshToken;
                console.log("Access Token: "+newAccessToken);
                console.log("Refresh Token: "+newRefreshToken);
                Tokens.setAccessToken(newAccessToken);
                Tokens.setRefreshToken(newRefreshToken);
                message.channel.send("Successfully authorized!! <3");
                return true;
            })
            .catch((error) => {
                message.channel.send("I couldn't authorize you to Spotify! :(")
                console.log("Authorization failed: "+error);
                return null;
            });
    }

    //Manual Request (if needed), mainly for testing purposes
    if (content === '!refresh') {
        await message.reply("Sure!! If your access token has expired, it is important to get a new one~~");

        try {
            const currentRefreshToken = Tokens.getRefreshToken();
            const refreshedAccessToken = await requestRefresh(currentRefreshToken, "expired");

            if (refreshedAccessToken === false) {
                message.channel.send("You haven't authorized to get your access token yet >:(");
                return null;
            }

            if (refreshedAccessToken === null) {
                message.channel.send("I wasn't able to refresh your access token!! :(");
                return null;
            }

            //Set the current access token to the refreshed access token, so it can be used in the other functions:
            newAccessToken = refreshedAccessToken;
            Tokens.setAccessToken(newAccessToken);
            console.log("Refreshed access token: "+newAccessToken);
            message.channel.send("Access token successfully refreshed!! <3");
            return true;

        } catch (error) {
            message.channel.send("I wasn't able to refresh your access token!! :(");
            console.error("Error in calling the requestRefresh function: "+error);
            return null;
        }
    }

    var enableMusic = false;
    if (content === '!music') {
        await message.channel.send("Make you authorize Spotify first or else these functions won't run!! Authorize using the command: !authorize");
        sleep(3000);
        await message.channel.send("Please enter a function: !play, !album, !artist, !cancel");
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
                    await message.channel.send("Enter in the format of: 'Song Name', 'Artist Name'");
                    await message.channel.send("You can leave one of the fields blank. I can still try to find your song as long as you have one of the parameters filled out!");
                    await message.channel.send("Just remember to add the comma so I can differentiate between a song and an artist <3");

                    const playMusicListener = async (input) => {
                        if (input.author.bot || input === '!cancel') { return; }
                        await message.channel.send("Alrighty, give me a moment...");

                        console.log("Attempt to log access token from global declare: "+newAccessToken);
                        try {
                            try {
                                input = String(input).split(','); //input[0] = songName, input[1] = artistName
                                var SongName = input[0].trim();
                                var ArtistName = input[1].trim().toLowerCase();
                            } catch (error) {
                                console.error("Error in trimming the song name and artist name (maybe due to a lack of two inputted variables): "+error);
                                message.channel.send("Invalid input!!");
                                client.off('messageCreate', playMusicListener);
                                client.off('messageCreate', musicListener);
                                return null;
                            }

                            try {
                                isPaused = true;
                                
                                try {
                                    //Clear the queue (if possible):
                                    await clearQueue(Tokens.getAccessToken())
                                    .then(() => {
                                        console.log("Queue cleared successfully!");
                                    })
                                    .catch((error) => {
                                        console.error("Error in clearing the queue (returnNextTracks): "+error);
                                    });
                                } catch (error) {
                                    console.error("Error in clearing the queue (!play cmd): "+error)
                                }

                                playSong(String("'"+SongName+"'"), String("'"+ArtistName+"'"), newAccessToken)
                                    .then((success) => {
                                        //Send current song playing (only when it is actually playing):
                                        if (success) {
                                            console.log(`Now playing: **${input[0].trim().split(' ').map((word) => (word[0].toUpperCase() + word.substring(1, word.length))).join(" ")}**, by **${input[1].trim().split(' ').map((word) => word[0].toUpperCase() + word.substring(1, word.length)).join(" ")}**~~`);
                                            return true;
                                        } else if (success === false) { //If false returned from the playSong function, device doesn't exists
                                            message.channel.send("Couldn't find your device! :(");
                                            isPaused = false;
                                            return false;
                                        } else { //If null returned, send a generic error message.
                                            message.channel.send("Couldn't find the song you wanted to play! :(");
                                            isPaused = false;
                                            return false;
                                        }
                                    })
                                    .then((success) => { //return success of the first .then chain, if true get new tracks, if false send an error message
                                        console.log("Value of success: "+success);
                                        if (success) {
                                            //When the song is over, play the next song in the artist's top tracks:
                                            returnNextTracks(input[1].trim().toLowerCase(), newAccessToken)
                                                .then(() => {
                                                    message.channel.send(`Some more tracks by **${input[1].trim().split(' ').map((word) => word[0].toUpperCase() + word.substring(1, word.length)).join(" ")}** have been added to the queue~~`);
                                                    isPaused = false;
                                                    return true;
                                                })
                                                .catch((error) => {
                                                    console.error("An error occurred: "+error);
                                                    if (String(error).includes("NO_ACTIVE_DEVICE")) {
                                                        message.channel.send("Couldn't find your device!");
                                                    } else if (String(error).includes("No token provided")) {
                                                        message.channel.send("You haven't authorized with Spotify yet!!");
                                                    } else {
                                                        message.channel.send("Couldn't get your next tracks! :(");
                                                    }
                                                    isPaused = false;
                                                    return null;
                                                });
                                        } else {
                                            message.channel.send("Couldn't get the next tracks since I couldn't find the song you wanted to play!! :(");
                                            isPaused = false;
                                            return null;
                                        }
                                    })
                                    .catch((error) => {
                                        if (String(error).includes("NO_ACTIVE_DEVICE")) {
                                            message.channel.send("Couldn't find your device!");
                                        } else if (String(error).includes("No token provided")) {
                                            message.channel.send("You haven't authorized with Spotify yet!!")
                                        } else if (String(error).includes("toUpperCase")) {
                                            return;
                                        } else {
                                            message.channel.send("Couldn't play your chosen song!");
                                        }
                                        console.error("Error occurred in playSong function: "+error);
                                        isPaused = false;
                                        return null;
                                    });                 

                            } catch (error) {
                                await message.channel.send("Couldn't get your next tracks! :(");
                                await console.error("Error with playing the song: "+error);
                                await message.channel.send("Your song wasn't found~~ Check if your song really exists!");
                                isPaused = false;
                                return null;
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
                            isPaused = false;
                            console.error('Error:', error);
                            throw error;
                        }
                    }
                    //Register playMusicListener
                    client.on('messageCreate', playMusicListener);
                } else if (nestedMessage === '!album') {
                    await message.channel.send("Alright, enter the name of the album you want to play?? :thinking:");
                    sleep(1000);

                    const playAlbumListener = async (input) => {
                        if (input.author.bot || input === '!cancel') { return; }

                        await message.channel.send("Alrighty, give me a moment...")

                        try {
                            isPaused = true;
                            //Clear queue in preparation to add album tracks
                            await clearQueue(newAccessToken)
                                .then(() => {
                                    console.log("Queue cleared successfully (!album command)");
                                })
                                .catch((error) => {
                                    console.error("Error in clearing the queue: "+error)
                                });

                            await getAlbum(newAccessToken, input)
                                //Returns the list of songs in the album
                                .then((list) => {
                                    console.log(list);
                                    const length = list.length;
                                    
                                    //Play the first song, then add the rest of the songs to the queue
                                    playSong(list[0].name, list[0].artists, newAccessToken)
                                        .then((success) => {
                                            if (success === true) {
                                                message.channel.send("Playing the first song in your chosen album <3");
                                                return true;
                                            } else if (success === null) {
                                                message.channel.send("I couldn't get the list of the songs in the album :(");
                                                client.off('messageCreate', playAlbumListener);
                                                client.off('messageCreate', musicListener);
                                                isPaused = false;
                                                return null;
                                            } else {
                                                message.channel.send("I wasn't able to make a request to the servers to get your album :(");
                                                client.off('messageCreate', playAlbumListener);
                                                client.off('messageCreate', musicListener);
                                                isPaused = false;
                                                return false;
                                            }
                                        })
                                        //Once song is successfully played and device ID retrieved, add the rest to queue:
                                        .then((success) => {
                                            if (success === true) {
                                                try {                                                    
                                                    for (let i = 1; i < length; i++) {
                                                        try {
                                                            const trackURI = list[i].uri;
                                                            console.log(`Song number ${i}'s URI: ${trackURI}`);
                                                            addToQueue(trackURI, newAccessToken)
                                                                .then((result) => {
                                                                    if (result === true) {
                                                                        console.log(`Song number ${i} added to queue successfully!`);
                                                                    } else {
                                                                        console.log(`Add URI to queue unsuccessful for song number ${i}`);
                                                                        client.off('messageCreate', playAlbumListener);
                                                                        client.off('messageCreate', musicListener);
                                                                        return true;
                                                                    }
                                                                })
                                                                //Here might be where the URI error occurs:
                                                                .catch((error) => {
                                                                    message.channel.send(`I couldn't add ${list[i].name} from your chosen album to the queue! :(`);
                                                                    console.error(`Error in adding song number ${i} to queue: ${error}`);
                                                                    client.off('messageCreate', playAlbumListener);
                                                                    client.off('messageCreate', musicListener);
                                                                    return null;
                                                                });
                                                        } catch (error) {
                                                            console.error("Error in adding to queue (possibly due to required parameter URI missing): "+error);
                                                            message.channel.send("I couldn't add the album song data to the queue :(")
                                                            client.off('messageCreate', playAlbumListener);
                                                            client.off('messageCreate', musicListener);
                                                            return null;
                                                        }
                                                    }
                                                } catch (error) {                                                
                                                    console.error("Error in adding song data to the queue: "+error);
                                                    message.channel.send("I couldn't add the album song data to the queue :(")
                                                    client.off('messageCreate', playAlbumListener);
                                                    client.off('messageCreate', musicListener);
                                                    return null;
                                                }

                                                message.channel.send('Album tracks successfully added to the queue <3');
                                                client.off('messageCreate', playAlbumListener);
                                                client.off('messageCreate', musicListener);
                                                return true;
                                            } 
                                        })
                                        //Unpause interval function
                                        .then((success) => {   
                                            if (success === true) {
                                                isPaused = false;
                                                return;
                                            }
                                        })
                                        .catch((error) => {
                                            message.channel.send("I couldn't play the song in your album!! :(");
                                            client.off('messageCreate', playAlbumListener);
                                            client.off('messageCreate', musicListener);
                                            console.error("Error in playing the song (!album command): "+error);
                                            return false;
                                        });                                    
                                })
                                .catch((error) => {
                                    message.channel.send("I couldn't get your chosen album data :(");
                                    console.error("Error in fetching the album data: "+error);
                                    client.off('messageCreate', playAlbumListener);
                                    client.off('messageCreate', musicListener);
                                    return null;
                                });
                        } catch (error) {
                            console.error("Error in activating the play album listener: "+error);
                            isPaused = false;
                            client.off('messageCreate', playAlbumListener);
                            client.off('messageCreate', musicListener);
                            return null;
                        }
                    }
                    //Register back the playAlbumListener
                    client.on('messageCreate', playAlbumListener);
                } else if (nestedMessage === '!artist') {
                    await message.channel.send("Sure!! Enter the name of the artist you want to play~~");
                    sleep(1000);

                    const artistListener = async (input) => {
                        if (input.author.bot || input === '!cancel') { return; }

                        await message.channel.send("Alrighty, give me a moment...")

                        try {
                            isPaused = true;
                            //Clear queue in preparation to add album tracks
                            await clearQueue(newAccessToken)
                                .then(() => {
                                    console.log("Queue cleared successfully (!album command)");
                                })
                                .catch((error) => {
                                    console.error("Error in clearing the queue: "+error)
                                });

                            await playArtist(input, Tokens.getAccessToken())
                                .then((artist) => {
                                    if (artist) {
                                        message.channel.send(`**${artist}** is now playing :D`);
                                        client.off('messageCreate', artistListener);
                                        client.off('messageCreate', musicListener);
                                        isPaused = false;
                                        return true;
                                    } else if (artist === false) {
                                        message.channel.send("Couldn't find your device!");
                                        client.off('messageCreate', artistListener);
                                        client.off('messageCreate', musicListener);
                                        isPaused = false;
                                        return false;
                                    } else {
                                        message.channel.send("I wasn't able to get your chosen artist's tracks! :(");
                                        client.off('messageCreate', artistListener);
                                        client.off('messageCreate', musicListener);
                                        isPaused = false;
                                        return null;
                                    }
                                })
                                .catch((error) => {
                                    console.error("Error in calling the playArtist function: "+error);
                                    client.off('messageCreate', artistListener);
                                    client.off('messageCreate', musicListener);
                                    isPaused = false;
                                    return null;
                                })
                        } catch (error) {
                            console.error("Error in using the artistListener functionality: "+error);
                            client.off('messageCreate', artistListener);
                            client.off('messageCreate', musicListener);
                            isPaused = false;
                            return null;
                        }
                    }
                    //Register back the artistListener:
                    client.on('messageCreate', artistListener);

                } else {
                    console.log("Functionality doesn't exist");
                }                          
            }
        }
        //Register musicListener
        client.on('messageCreate', musicListener);
    }

    //Other SpotifyAPI Commands
    var volumeBoolean = false;

    spotifyApi.setAccessToken(newAccessToken);
    if (content === '!pause') {
        spotifyApi.pause()
            .then(() => {
                message.channel.send("Your song has paused!");
            })
            .catch((error) => {
                //if the user making the request is non-premium, a 403 FORBIDDEN response code will be returned
                console.log("Error pausing song: "+error);
                if (String(error).includes("NO_ACTIVE_DEVICE")) {
                    message.channel.send("Couldn't find your device!");
                } else if (String(error).includes("No token provided")) {
                    message.channel.send("You haven't authorized with Spotify yet!!")
                } else if (String(error).includes("Restriction violated UNKNOWN")) {
                    message.channel.send("Your song is already paused!");
                } else {
                    message.channel.send("Couldn't resume your song!");
                }
            });
    } else if (content === '!resume') {
        spotifyApi.play()
            .then(() => {
                message.channel.send("Your song is resuming~~");
            })
            .catch((error) => {
                //if the user making the request is non-premium, a 403 FORBIDDEN response code will be returned
                console.log("Error resuming song: "+error);
                if (String(error).includes("NO_ACTIVE_DEVICE")) {
                    message.channel.send("Couldn't find your device!");
                } else if (String(error).includes("No token provided")) {
                    message.channel.send("You haven't authorized with Spotify yet!!")
                } else if (String(error).includes("Restriction violated UNKNOWN")) {
                    message.channel.send("Your song is already playing!");
                } else {
                    message.channel.send("Couldn't resume your song!");
                }
            });
    } else if (content === '!skip to next') {
        spotifyApi.skipToNext()
            .then(() => {
                message.channel.send("Alright, skipping to the next song in queue~~");
            })
            .catch((error) => {
                console.error("Error in skipping to the next song: "+error);
                if (String(error).includes("NO_ACTIVE_DEVICE")) {
                    message.channel.send("Couldn't find your device!");
                } else if (String(error).includes("No token provided")) {
                    message.channel.send("You haven't authorized with Spotify yet!!")
                } else {
                    message.channel.send("Couldn't skip to your next song!");
                }
            });
    } else if (content === '!skip to previous') {
        spotifyApi.skipToPrevious()
            .then(() => {
                message.channel.send("Alright, playing back your previous song...");
            })
            .catch((error) => {
                console.error("Error in skipping back to the previous song: "+error);
                if (String(error).includes("NO_ACTIVE_DEVICE")) {
                    message.channel.send("Couldn't find your device!");
                } else if (String(error).includes("No token provided")) {
                    message.channel.send("You haven't authorized with Spotify yet!!");
                } else {
                    message.channel.send("Couldn't skip to your previous song!");
                }
            });
    } else if (content === '!volume') {
        await message.channel.send('What % volume do you want to adjust the song to?? :thinking:');
        await message.channel.send('Note that this command only works on computer devices, and not on mobile devices~~ :sob:');
        sleep(1000);
        volumeBoolean = true;

        if (volumeBoolean === true) {
            const volumeValue = async (input) => {
                if (input.author.bot) { return; }
                input = String(input).toLowerCase().trim();
                console.log('Volume input: '+input);

                try {
                    //Check if the input is a number, or is not a number and as a result has returned as NaN:
                    if (Number.isNaN(input)) { 
                        message.channel.send('Invalid input!');
                        volumeBoolean = false;
                        client.off('messageCreate', volumeValue);
                        return null; 
                    } else {
                        input = Math.round(Number(input));
                        setVolume(newAccessToken, input)
                            .then((success) => {
                                if (success) {
                                    message.channel.send(`Okie!! Setting volume to ${input}%...`);
                                    volumeBoolean = false;
                                    client.off('messageCreate', volumeValue);
                                }
                            })
                            .catch((error) => {
                                console.error("Error in setting the volume: "+error);
                                
                                if (String(error).includes("NO_ACTIVE_DEVICE")) {
                                    message.channel.send("Couldn't find your device!");
                                } else if (String(error).includes("No token provided")) {
                                    message.channel.send("You haven't authorized with Spotify yet!!");
                                } else {
                                    message.channel.send("Couldn't set your volume! :(");
                                }

                                volumeBoolean = false;
                                client.off('messageCreate', volumeValue);
                            });
                    }
                } catch (error) {
                    message.channel.send("Couldn't get your volume value :(");
                    console.error('Error in getting the volume value: '+error);
                }
            }
            //Register the volumeValue nested listener:
            client.on('messageCreate', volumeValue)
        } else {
            return;
        }
    } else if (content === '!clear queue') {
        await message.channel.send("Alright, give me a second...");
        await clearQueue(newAccessToken)
            .then(() => {
                message.channel.send("Queue cleared successfully!");
                return;
            })
            .catch((error) => {
                message.channel.send("I was unable to clear your queue :(");
                console.error("Error in clearing the queue (!clear queue cmd): "+error);
                return;
            });
    } else if (content === '!view queue') {
        await message.channel.send("Alright, give me a moment...");
        await getQueue(Tokens.getAccessToken())
            .then((queueList) => {
                if (queueList) {
                    const queue = new Table ({
                        titles: ['**Song**', '**Artist**', '**Album**'],
                        titleIndexes: [0, 61, 100],
                        columnIndexes: [0, 30, 50],
                        start: '`',
                        end: '`',
                        padEnd: 3
                    });

                    //Add the values to the embedTable
                    for (let i = 0; i < queueList.length; i++) {
                        try {
                            queue.addRow([queueList[i].name, queueList[i].artist, queueList[i].album]);
                        } catch (error) {
                            console.error(`Error in adding queueList #${i} in the list`);
                        }
                    }

                    //Once all values have been added to the table, use embedBuilder to send the table
                    const embed = new EmbedBuilder().setFields(table.toField());                            
                    message.channel.send({ embeds: [embed] });

                } else {
                    message.channel.send("I couldn't get your queue of songs!! :(");
                    return;
                }
            })
            .catch((error) => {
                message.channel.send("I couldn't get your queue of songs!");
                console.error("Error in retreiving the queue: "+error);
                return null;
            })
    }

    //Build Clash Royale Deck
    if (content === "!build cr") {
        await message.reply("I'll make you the strongest deck there is >:D");
    }

    //Periodically check the current track (SpotifyFunction)
    setInterval(async () => {
        if (isPaused || newAccessToken === null) { return; }

        await spotifyApi.setAccessToken(newAccessToken);
        await checkCurrentTrack(newAccessToken)
            .then((song_and_artist) => {
                //[0] contains song, [1] contains artist
                if (song_and_artist === null) { return; }

                try {

                    getTrackURL(song_and_artist[0], song_and_artist[1], newAccessToken)
                        .then((url) => {
                            try {
                                if (url) {
                                    console.log('URL data returning successfully...')
                                    return url;
                                } else {
                                    return false;
                                }
                            } catch (error) {
                                console.log('Error in returning the URL data'+ error);
                            }
                        })
                        .then((url) => {
                            if (url === false || url === null || url === undefined) { return; }
                            console.log(url);

                            //message.channel.send(`Now playing: **${song_and_artist[0]}**, by **${song_and_artist[1]}**~~`);
                            let trackEmbed;

                            try {
                                trackEmbed = new EmbedBuilder()
                                    .setColor('#FFB6C1')
                                    .setTitle(`${song_and_artist[0]}`).setURL(url.trackURL)
                                    .setAuthor({ name: 'Honami Ichinose Music <3', iconURL: 'https://preview.redd.it/ichinose-honami-ln-vs-anime-v0-s5xfqflkdp1b1.jpg?width=737&format=pjpg&auto=webp&s=da85c830b193d8a6a85144fb3b797973f3902167', url: 'https://developer.spotify.com/dashboard/df4cfadf6d7f404f8d3ae5920ed8b75e' })
                                    .setDescription(`By: [${song_and_artist[1]}](${url.artistURL}) on [${url.albumName}](${url.albumURL})`)
                                    .setFooter({ text: 'On Spotify', iconURL: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/74/Spotify_App_Logo.svg/1200px-Spotify_App_Logo.svg.png' })
                                    .setThumbnail(url.imageURL);
                            } catch (error) {
                                console.error("Error in constructing the trackEmbed: "+error);
                            }
                            
                            try { 
                                if (trackEmbed) {
                                    message.channel.send('**Now Playing: **');
                                    //Send the embed as a message:
                                    message.channel.send({ embeds: [trackEmbed] });
                                } else {
                                    return false;
                                }
                            } catch (error) {
                                console.error("Error in sending the embed song message: "+error);
                                if (String(error).includes("expired")) {
                                    requestRefresh(Tokens.getRefreshToken(), String(error))
                                        .then((refreshedAccessToken) => {
                                            newAccessToken = refreshedAccessToken;
                                            return true;
                                        })
                                        .catch((error) => {
                                            console.error("Error in refreshing the access token: "+error);
                                            return null;
                                        });
                                } else {
                                    return;
                                }
                            }
                        })
                        .catch((error) => {
                            console.error("Error in retrieving the resolved URL: "+error);
                            return null;
                        })
                } catch (error) {
                    console.error("Error in embedding the URL: "+error);
                }

                return true; //return true to simulate success
            })      
            .catch((error) => {     
                if (String(error).includes('expired') && String(newRefreshToken !== null)) {
                    requestRefresh(Tokens.getRefreshToken(), error);
                    return true; //return true to simulate success in refreshing
                }                                     
                console.error('Error in setInterval: '+error);
                return null; //return null to simulate failure      
            });
    }, 7000);

    /*
    * Request a refresh every 10 minutes, since the access token will expire every hour
    * Ensures that we try to refresh at least 6x so that we increase the chances of successful requests
    */

    /*
    setInterval(async () => {
        try {
            const currentRefreshToken = Tokens.getRefreshToken();
            const refreshedAccessToken = await requestRefresh(currentRefreshToken, "expired");

            //Set the current access token to the refreshed access token, so it can be used in the other functions:
            newAccessToken = refreshedAccessToken;
            Tokens.setAccessToken(newAccessToken);
            console.log("Refreshed access token after 10 min interval: "+newAccessToken);
            return true;

        } catch (error) {
            console.error("Error in refreshing after 10 mins: "+error);
            return null;
        }
    }, 600000);
    */
});

client.login(config.token);