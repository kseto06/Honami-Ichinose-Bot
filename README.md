<h1 align= "center">Honami Ichinose Bot</h1>

<div align="center">
  <img src="./honami_icon.png">
</div>

<div align="center">
  Honami Ichinose, the iconic girl from Classroom of the Elite, has joined Discord to be the ultimate study buddy! 
  From calculating math problems to organizing tasks and even helping with playing music, 
  day-to-day studies will always be motivated.
</div>

### Spotify Demo
<p align="center">
  <img src="./honami_spotify_demo.gif">
</p>

### Task Management Demo
<p align="center">
  <img src="./honami_task_demo.gif">
</p>

## How it Works
### Backend APIs: 
<ins>Discord API</ins>
- Discord API and Developer to allow Discord Bot functionalities such as reading and responding to messages
- Welcome feature that is called whenever a new person joins the server

<ins>Spotify Web API</ins>
- Authorization PKCE Code Flow to grant user authorization for Honami Ichinose Spotify Developer
- Honami Ichinose Bot can now have access to a plethora of Spotify functionalities, using fetch/JSON API calls, such as:
  - Choosing songs, albums, or artists to play through discord message prompt.
    - Choosing songs automatically adds additional songs to the queue, which Spotify is unable to do (it will keep putting your song on repeat)
  - Pausing and skip functionalities
  - Volume changing functionality
  - Song identification functionality that holds song data whenever a new song is detected

 <ins>ChatGPT API</ins>
 - GPT Key to authorize -- reads incoming messages from Discord and sends back a response from GPT API
 - NOTE: For this functionality to work, money must be spent on GPT API.

<br>

### Other Features:
<ins>Calendar</ins>
- Honami Ichinose Bot is able to add, resolve, and view the calendar of list of tasks for the user to complete

<ins>Calculator</ins>
- Uses mathjs to evaluate math expressions that can be typed in Discord

<ins>Motivation</ins>
- Honami will respond to certain phrases or words to provide motivation! <3

<br>

Note: For this project to run, it requires config files that contain the keys to authorize the different APIs, which is not shared here publicly in this repository.
