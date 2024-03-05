import OpenAI from 'openai';

//Init config.json for id and secret
import fs from 'fs';
const config = JSON.parse(fs.readFileSync('config.json', 'utf-8'));
const gptKey = config.gpt_apikey;

const openai = new OpenAI({
  apiKey: gptKey,
});

export async function GPTMessage(message) {
  return new Promise((resolve, reject) => {
    try { 
      const completion = openai.chat.completions.create({
        messages: [{ role: "system", content: message }],
        model: "gpt-3.5-turbo",
      });

      if (completion) {
        console.log("Response: "+completion.choices[0]);
        resolve(completion.choices[0]);
      }

    } catch (error) {
      console.error("Error in GPTMessage Function: "+error);
      reject(null);
    }

  });
}