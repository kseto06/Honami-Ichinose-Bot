/*
* HONAMI ICHINOSE DISCORD BOT - From the Classroom of the Elite
* @author Kaden (Winterlicia) <>
*/

const currentDate = new Date();

export function getTomorrowDate() {

    const year = currentDate.getFullYear();
    const shortened = String(year).substring(2, 4);
    const month = currentDate.getMonth() + 1; // Months are zero-indexed, so we add 1.
    const day = currentDate.getDate() + 1; //Get the date tomorrow to give a reminder

    return String(month + '/' + day + '/' + shortened);
}