/*
* HONAMI ICHINOSE DISCORD BOT - From the Classroom of the Elite
* @author Kaden (Winterlicia) <>
*/

//IMPORTS:
import * as Math from 'mathjs';
import fs from 'fs';
import { Task } from './Task.js';
import { createInterface } from 'readline';

//FUNCTIONS:
export async function calculator(message) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            try {
               var calculation = Math.evaluate(String(message));
               resolve("Here's your answer! I got: "+calculation);
            } catch {
                console.log("Invalid Expression");
                reject("Hmmm... I couldn't do it! Quite the challenge you got there... :(");
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
                        if (j === result.length - 1) { //At the end of the file, we don't want to unnecessarily create a new line as this will cause exceptions.
                            fs.appendFileSync(taskFilePath, String(currentTask), 'utf-8');
                        } else {
                            fs.appendFileSync(taskFilePath, String(currentTask) + '\n', 'utf-8');
                        }
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

//Still need to test this:
export async function reviseTask(taskName, taskParameter, revisedParameter) { //String, String, String
    const taskFilePath = 'TestingList.txt';
    var taskFound = false;
    const taskToRevise = null;
    taskParameter = String(taskParameter).toLowerCase().replace(/\s+/g, '');

    return new Promise((resolve, reject) => {
        //Return the ArrayList and match the task that needs to be deleted:
        viewTask()
            .then((result) => {
                for (let i = 0; i < result.length; i++) {
                    var line = result[i];
                    var split = line.split(',');
                    var currentTask = new Task(split[0], split[1], split[2]);
                    console.log("TEST: "+ (String(taskName).toLowerCase() === currentTask.getTask().toLowerCase()));
                    if (String(taskName).toLowerCase() === currentTask.getTask().toLowerCase()) {
                        taskFound = true;
                        //Now compare the parameter and set it with the revisedParameter
                        if (taskParameter.includes('task')) {
                            taskToRevise = currentTask.setTask(revisedParameter);
                        } else if (taskParameter.includes('subject')) {
                            taskToRevise = currentTask.setSubject(revisedParameter);
                        } else if (taskParameter.includes('due') || taskParameter.includes('date')) {
                            taskToRevise = currentTask.setDueDate(revisedParameter);
                        } else {
                            taskToRevise = null;
                            reject(null); //If none of the parameters match, then reject null to indicate invalid parameter
                        }

                        //Replace the data at the specific index with the revisedTask
                        if (taskToRevise !== null) {
                            result[i] = taskToRevise;
                            break;
                        } else {
                            reject(null);
                        }
                    } 
                }

                if (taskFound === true) {
                    //Erase data in text file to later append:
                    fs.writeFileSync(taskFilePath, '');

                    //Write back the new updated ArrayList in TaskList.txt:
                    //Erase text file and replace it with updated tasks
                    for (let j = 0; j < result.length; j++) {
                        split = result[j].split(',');
                        currentTask = new Task(split[0], split[1], split[2]);
                        if (j === result.length - 1) {
                            fs.appendFileSync(taskFilePath, String(currentTask), 'utf-8');
                        } else {
                            fs.appendFileSync(taskFilePath, String(currentTask) + '\n', 'utf-8');
                        }
                        console.log("Task #"+j+" written successfully.");
                        if (j === (result.length - 1)) { break; }
                    }
                    resolve(true); //Resolve true to indicate success

                } else {
                    reject(null); //Reject null to indicate failure
                }
            })
            .catch((error) => {
                console.log("An error occurred: "+error);
                reject(null);
            })
    });
}

export async function checkDueDate(DueDate) {
    const currentTaskList = [];

    return new Promise((resolve, reject) => {
        viewTask()
            .then((result) => {
                for (let i = 0; i < result.length; i++) {
                    var line = result[i];
                    var split = line.split(',');
                    var currentTask = new Task(split[0], split[1], split[2]);
                    console.log("TEST: "+ (String(DueDate).toLowerCase() === currentTask.getDueDate().toLowerCase().replace(/\s+/g, '')));
                    console.log("TEST: "+ String(DueDate).toLowerCase());
                    console.log("TEST: "+ currentTask.getDueDate().toLowerCase().replace(/\s+/g, ''));
                    if (String(DueDate).toLowerCase() === currentTask.getDueDate().toLowerCase().replace(/\s+/g, '')) {
                        //If true, push the task(s) due tomorrow in an array:
                        currentTaskList.push(String(currentTask));
                    } 
                }
                //Once the for loop ends and all possible instances are checked, return the array of tasks to-do:
                console.log("currentTaskList: "+currentTaskList);
                resolve(currentTaskList);
            })
            .catch((error) => {
                console.error(error);
                reject("Nothing due tomorrow!");
            });
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