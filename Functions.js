/*
* HONAMI ICHINOSE DISCORD BOT - From the Classroom of the Elite
* @author Kaden (Winterlicia) <>
*/

const Math = require('mathjs');

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

module.exports = {
    calculator,
    randomizeArray,
};