/*
* HONAMI ICHINOSE DISCORD BOT - From the Classroom of the Elite
* @author Kaden (Winterlicia) <>
*/

import * as Math from 'mathjs';
import fs from 'fs';
import { Task } from './Task.js';
import { createInterface } from 'readline';

//FUNCTIONS:
export async function calculator(message) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            var isCalculated = null;
            try {
               var calculation = Math.evaluate(String(message));
               isCalculated = true;
            } catch {
                console.log("Invalid Expression");
                isCalculated = false;
            }

            if (isCalculated === true) {
                resolve("Here's your answer! I got: "+calculation);
            } else {
                reject("Hmmm... I couldn't do it! Quite the challenge you got there... :(")
            }
        }, 3000); //She needs to think. She's human.
    });
}

export async function randomizeArray(array) {
    return new Promise((resolve, reject) => {
        if (!Array.isArray(array) || array.length === 0) {
            reject("The input array is either not an array or empty.");
            return;
        }

        var isRandomized = null;
        try {
           let value = Math.random(0, array.length);
           if (value != null && value >= 0 && value <= (array.length)) {
               isRandomized = true; 
           }
        } catch (error) {
           console.error("An error occurred: "+ error);
           isRandomized = false;
        }

        if (isRandomized === true) {
            let randomized = Math.floor(Math.random(0, array.length));
            console.log(randomized);
            resolve(String(array[randomized]));
        } else {
            reject("I'm so sorry... I just don't know what to say :(");
        }
    });
}

//newTask = Task(task, subject, due date)
export async function addTask(task) {
    const taskFilePath = 'TaskList.txt';

    return new Promise((resolve, reject) => {
        try {
            if (isFileEmpty(taskFilePath)) {
                //If the file is empty, don't create a new line ('\n' will create exceptions for the first entry)
                console.log('File empty, DO NOT create a new line.');
                fs.appendFileSync(taskFilePath, task, 'utf-8');
                console.log("File written successfully.");
                resolve("Your task is added to the database~~");
            } else {
                console.log('File not empty, create a new line.');
                fs.appendFileSync(taskFilePath, '\n' + task, 'utf-8');
                console.log("File written successfully.");
                resolve("Your task is added to the database~~");
            }
        } catch (error) {
            console.error("An error occurred: "+error);
            reject("Something went wrong! I couldn't add your task to the database :(")
        }
    });
}

export async function viewTask() {
    const taskFilePath = 'TaskList.txt';
    var currentTaskList = [];

    return new Promise((resolve, reject) => {

        const fileStream = fs.createReadStream(taskFilePath, 'utf-8');
        const lineReader = createInterface({
            input: fileStream,
            crlfDelay: Infinity,
        });

        try {
            lineReader.on('line', (line) => {
                currentTaskList.push(line);
            });            
        } catch (error) {
            console.error("An error with pushing to the taskList array occurred: "+error);
        }

        lineReader.on('close', () => {
            if (currentTaskList.length > 0) {
                //Return the "ArrayList", format table in Main.js
                resolve(currentTaskList);
            } else {
                reject("To-do list is empty~~");
            }
        });

        fileStream.on('error', (error) => {
            console.error("An error occurred: "+error);
            reject("An error occurred: "+error);
        });
    });
}

export async function resolveTask(taskToResolve) {
    const taskFilePath = 'TaskList.txt';
    var taskFound = false;

    return new Promise((resolve, reject) => {
        //Return the ArrayList and match the task that needs to be deleted:
        viewTask()
            .then((result) => {
                for (let i = 0; i < result.length; i++) {
                    var line = result[i];
                    var split = line.split(',');
                    var currentTask = new Task(split[0], split[1], split[2]);
                    console.log("TEST: "+ (String(taskToResolve).toLowerCase() === currentTask.getTask().toLowerCase()));
                    if (String(taskToResolve).toLowerCase() === currentTask.getTask().toLowerCase()) {
                        taskFound = true;
                        //Delete data using Arrays.splice(method)
                        result.splice(i, 1);
                        break;
                    } 
                }

                //For some reason, taskToResolve (input value) is in lowercase -- therefore need to make the getTask() lowercase as well
                if (taskFound === true) {
                    //Erase data in text file to later append:
                    fs.writeFileSync(taskFilePath, '');

                    //Write back the new updated ArrayList in TaskList.txt:
                    //Erase text file and replace it with updated tasks
                    for (let j = 0; j < result.length; j++) {
                        line = result[j];
                        split = line.split(',');
                        currentTask = new Task(split[0], split[1], split[2]);
                        fs.appendFileSync(taskFilePath, String(currentTask) + '\n', 'utf-8');
                        console.log("Task #"+j+" written successfully.");
                        if (j === (result.length - 1)) { break; }
                    }
                    resolve("One less thing to do on the to-do list, good job on finishing your task <3");

                } else {
                    reject("I couldn't find the task in the database that you wanted to remove!");
                }
            })
            .catch((error) => {
                console.log("An error occurred: "+error);
                reject("Your to-do list is empty~~");
            })
    });
}

export function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

//Boolean function
function isFileEmpty(filePath) {
    try {
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        return fileContent.trim() === ''; //return false
    } catch (error) {
        return true;
    }
}