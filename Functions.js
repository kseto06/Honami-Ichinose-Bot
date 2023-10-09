/*
* HONAMI ICHINOSE DISCORD BOT - From the Classroom of the Elite
* @author Kaden (Winterlicia) <>
*/

const Math = require('mathjs');
const fs = require('fs');
const { Task } = require('./Task');

//FUNCTIONS:
async function calculator(message) {
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

async function randomizeArray(array) {
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
async function addTask(task) {
    const taskFilePath = 'TaskList.txt';

    return new Promise((resolve, reject) => {
        var isTaskAdded = null;
        try {
           fs.appendFileSync(taskFilePath, task + '\n', 'utf-8');
           console.log("File written successfully.");
           isTaskAdded = true;
        } catch (error) {
            console.error("An error occurred: "+error);
            isTaskAdded = false;
        }

        if (isTaskAdded === true) {
            resolve("Your task is added to the database~~");
        } else {
            reject("Something went wrong! I couldn't add your task to the database :(")
        }
    });
}

async function viewTask() {
    const taskFilePath = 'TaskList.txt';
    var currentTaskList = [];

    return new Promise((resolve, reject) => {

        const fileStream = fs.createReadStream(taskFilePath, 'utf-8');
        const lineReader = require('readline').createInterface({
            input: fileStream,
            crlfDelay: Infinity,
        });

        try {
            lineReader.on('line', (line) => {
                //var split = line.split(','); 
                //split[0] = task, split[1] = subject, split[2] = due date
                //var currentTask = new Task(split[0], split[1], split[2]);
                currentTaskList.push(line);
            });            
        } catch (error) {
            console.error("An error with pushing to the taskList array occurred: "+error);
        }

        lineReader.on('close', () => {
            if (currentTaskList.length > 0) {
                //Format the task list as a readable message:
                //const taskListMessage = currentTaskList.join('\n');
                resolve(currentTaskList);
            } else {
                reject("To-do list is empty~~")
            }
        });

        fileStream.on('error', (error) => {
            console.error("An error occurred: "+error);
            reject("An error occurred: "+error);
        });
    });
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
    calculator,
    randomizeArray,
    addTask,
    viewTask,
    sleep,
};