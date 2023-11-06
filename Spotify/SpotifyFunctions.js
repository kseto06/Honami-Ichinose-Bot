/*
* HONAMI ICHINOSE DISCORD BOT - From the Classroom of the Elite
* @author Kaden (Winterlicia) <>
*/

import express from 'express';
import fetch from 'node-fetch';
import crypto from 'crypto';
import SpotifyWebApi from 'spotify-web-api-node';

const app = express();
const PORT = 8080;

//Init config.json for id and secret
import fs from 'fs';
import { request } from 'http';
import { error } from 'console';
const config = JSON.parse(fs.readFileSync('config.json', 'utf-8'));

const clientId = config.spotify_clientid; // Replace with your Spotify client ID
const clientSecret = config.spotify_clientsecret; // Replace with your Spotify client secret
const redirectUri = 'http://127.0.0.1:8080/callback'; // Replace with your redirect URI

//Define spotifyApi with client's ID and Secret
const spotifyApi = new SpotifyWebApi({
  clientId: clientId,
  clientSecret: clientSecret,
});

// In-memory storage for code_verifiers 
const codeVerifiers = new Map();

// Global variables:
var currentSongCount = 0;

// Helper function to generate a random string
function generateRandomString(length) {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let randomString = '';
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    randomString += characters.charAt(randomIndex);
  }
  return randomString;
}

// Generate code verifier and code challenge
function generateCodeChallenge(codeVerifier) {
  const codeChallenge = crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  return codeChallenge;
}

export function authorizeSpotify() {
  return new Promise(async (resolve, reject) => {

  // Construct the authorization URL
  app.get('/authorize', (req, res) => {
    const codeVerifier = generateRandomString(128);
    const codeChallenge = generateCodeChallenge(codeVerifier);

    // Store the codeVerifier on the server side (for this example)
    codeVerifiers.set(req.sessionID, codeVerifier);

    // Define the scope for Spotify API access
    const scope = 'user-read-private user-read-email user-library-modify streaming user-read-playback-state user-modify-playback-state user-read-currently-playing'; // Add the necessary permissions separated by spaces

    // Construct the authorization URL
    const authorizationUrl = `https://accounts.spotify.com/authorize?response_type=code&client_id=${clientId}&scope=${scope}&redirect_uri=${redirectUri}&code_challenge_method=S256&code_challenge=${codeChallenge}`;

    res.redirect(authorizationUrl);
  });

  // Route to handle the Spotify callback (redirect URI)
  app.get('/callback', async (req, res) => {
    // Retrieve the codeVerifier from server storage
    const codeVerifier = codeVerifiers.get(req.sessionID);

    // Use the codeVerifier for token exchange
    const code = req.query.code;

    const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
        code_verifier: codeVerifier,
      }),
    });

    const tokenData = await tokenResponse.json();

    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token;

    if (accessToken && refreshToken) {
      resolve({ accessToken, refreshToken });
    } else {
      reject(new Error('Access token not obtained'));
    }

    res.send('You are now authorized!! Yay! You can close this page now and use our command functions <3');
    // Can now use the access token to make Spotify API requests  
    });
  })
}
// Route for the root path
app.get('/', (req, res) => {
res.send('Welcome to the PKCE Authorization Server');
});


app.listen(PORT, () => {
console.log('Authorize here: http://127.0.0.1:8080/authorize');
console.log(`Server is running on port ${PORT}`);
});

//SPOTIFY FUNCTIONALITIES:
export async function playSong(songName, artistName, accessToken) {
  try {
      //set access token:
      spotifyApi.setAccessToken(accessToken);
      // Using Spotify Web API, search for tracks
      console.log("Song Name: "+songName);
      console.log("Artist Name: "+artistName);
      const searchResults = await spotifyApi.searchTracks(`track:${songName} artist:${artistName}`);
      try {
        if (searchResults.body.tracks.total > 0) {
            const trackURI = searchResults.body.tracks.items[0].uri;

          try {
            // Spotify Web API to get user's device
            const devicesData = await spotifyApi.getMyDevices();
            const devices = devicesData.body.devices;

              if (devices.length > 0) {
                  const activeDeviceID = devices[0].id;
                  console.log('Active Device ID: ', activeDeviceID);
                  
                  // Play the track on the active device
                  await spotifyApi.play({ uris: [trackURI], device_id: activeDeviceID });

                  // You may want to return a success message or result here
                  return true;
              } else {
                  console.log('No active devices found');
                  return false;
              } 
            } catch (error) {
                console.error("Couldn't get devices: "+error);
                return null; 
            }
        } else {
          return null;
        }
      } catch (error) {
        console.error("Couldn't get Search Results: "+error);
        return null;
      }
  } catch (error) {
      console.error("Couldn't call playSong function: "+ error);
      return null;
      //throw error; // Propagate the error to the calling function
  }
}

export async function returnNextTracks(ArtistName, AccessToken) {
  //console.log(AccessToken);
  await spotifyApi.setAccessToken(AccessToken);
  
  //Clear the queue (if possible):
  await clearQueue(AccessToken)
    .then(() => {
      console.log("Queue cleared successfully!");
    })
    .catch((error) => {
      console.error("Error in clearing the queue (returnNextTracks): "+error);
    });

    //Search for other tracks by the same artist:
    await spotifyApi.searchTracks(`artist:${ArtistName}`)
      .then((data) => {
        console.log(`Search tracks by "${ArtistName}" in the artist name'` + data.body.tracks.items);

          // Spotify Web API to get user's device
          spotifyApi.getMyDevices()
            .then((devicesData) => {
              const devices = devicesData.body.devices;

              if (devices.length > 0) {
                const activeDeviceID = devices[0].id;
                console.log('Active Device ID: ', activeDeviceID);
                
                //Add the rest of the artist's songs to the queue?
                for (let i = 0; i < data.body.tracks.items.length; i++) {
                  const QueueURI = data.body.tracks.items[i].uri;
                  //console.log(QueueURI);
                  spotifyApi.addToQueue(QueueURI, { device_id: activeDeviceID });
                  currentSongCount++;
                }
                return "Some other tracks by the same artist were added to your queue~~";
              }
            })
            .catch((error) => {
              console.error("Couldn't get device data: "+error);
              return "Couldn't connect your device! :(";
            });
      })
      .catch((error) => {
        console.error("Couldn't get artist's tracks: "+error);
        return "Couldn't get artist's tracks! :(";
      });
}

export async function getPlaylist(PlaylistName, AccessToken) {
  const playlistArray = [];
  const playlistID = null;

  await spotifyApi.getAccessToken(AccessToken);
  try {
    await spotifyApi.searchPlaylists(PlaylistName)
      .then((playlist) => {
        if (playlist.body.playlists.items > 0) {
          playlistID = playlist.body.playlists.items[0];
        } else {
          console.log("Playlist not found");
          return null;
        }

        spotifyApi.getPlaylistTracks(playlistID)
          .then((songs) => {
            for (let i = 0; i < songs.length; i++) {
              playlistArray.push(songs.body.items.tracks.track.name);
              const QueueURI = data.body.tracks.items[i].uri;
                  //console.log(QueueURI);
                  spotifyApi.addToQueue(QueueURI, { device_id: activeDeviceID });
            }
          })
      })
      .catch((error) => {
        console.log("Error in searching for the playlist: "+error);
      });
  } catch (error) {
      console.error("Error getting playlist: "+error);
  }
}

//Called to clear the queue and to get new artist's tracks
async function clearQueue(AccessToken) {
  spotifyApi.setAccessToken(AccessToken);
  var errorEncountered = false;

  try {
    // Get the current queue data
    const QueueData = await getQueue(AccessToken);
    if (QueueData === 0) { return; }
    console.log('Current Queue Length (clearQueue function): ' + QueueData.length);
    if (QueueData.length === 0) { return; }

    for (let i = 0; i < QueueData.length; i++) {
      try {
        await spotifyApi.skipToNext();
        console.log(`Successfully skipped song number ${i}`);
      } catch (error) {
        console.error('Error skipping to the next song (clearQueue function): '+error);
        errorEncountered = true;
        break; // Exit the loop if an error occurs
      }
    }
  } catch (error) {
    console.error('Error calling getQueue: '+error);
  }
}

var storedSong = null;
export async function checkCurrentTrack(AccessToken) {
  spotifyApi.setAccessToken(AccessToken);
    try {
        const currentSong = await spotifyApi.getMyCurrentPlayingTrack()
        //If there is no current song playing, break
        if (!currentSong || !currentSong.body || !currentSong.body.item) {
          console.error("No current song playing");
          return null;
        }
        const currentSongName = (await currentSong).body.item.name;
        //If the stored song is still equal to the current song, that means the song hasn't changed yet, break
        if (String(storedSong) === String(currentSongName)) {
          return null; 
        } 
        //Else: Get the track of the new song and print it, overwriting the last instance of storedSong with the currentSong.
        storedSong = currentSong.body.item.name;
        const artistName = currentSong.body.item.artists[0].name;
        //Since there is a new track, we can reduce currentSongCount to gradually reset it:
        currentSongCount--;
        return [currentSongName, artistName];
    } catch (error) {
      console.error('Error checking current track: '+error);
    }
}

//Function to request a refresh token if the current access token has expired.
export async function requestRefresh(RefreshToken, error) {
  return new Promise((resolve, reject) => {
    spotifyApi.setRefreshToken(RefreshToken);
    error = String(error).toLowerCase();

    spotifyApi.refreshAccessToken()
      .then((data) => {
        if (error.includes('the access token expired')) {
          // Save the access token so that it's used in future calls
          const newAccessToken = data.body['access_token'];
          console.log("Access token has been refreshed: "+newAccessToken);

          //Return the new access token, and set it equal to the global variable in Main.js
          resolve(String(newAccessToken));
        } else {
          console.error("The access token hasn't expired yet");
          reject(new Error('Unable to refresh the token'));
        }

    })
    .catch((error) => {
      console.error("Error in refreshing the token: "+error);
    });
  });
}

export async function setVolume(AccessToken, volumeValue) {
  return new Promise((resolve, reject) => {

    // Define the API endpoint
    const apiUrl = `https://api.spotify.com/v1/me/player/volume?volume_percent=${volumeValue}`;

    // Define the headers, including the Authorization header with your access token
    const headers = {
      'Authorization': `Bearer ${AccessToken}`,
      'Content-Type': 'application/json' // Spotify API requires 'Content-Type' header
    };

    // Create the request object
    const requestOptions = {
      method: 'PUT',
      headers: headers,
      body: null // No request body needed for this request
    };

    // Perform the PUT request to change the volume
    fetch(apiUrl, requestOptions) 
      .then((response) => {
        try {

          if (response.status === 204) {
            // 204 status indicates success with no content
            console.log('Volume changed successfully');
            resolve(true);
          } else if (response.ok) {
            return response.json();
          } else {
            throw new Error('Error changing volume: '+response.statusText);
          }

        } catch (error) {
            console.error("Error in changing volume: "+error);
            reject(false);
        }
      })
      .then((data) => {
        console.log('Volume changed successfully: '+data);
        resolve(true);
      })
      .catch((error) => {
        console.error('Error changing volume: '+error);
        reject(false);
      });
  });
}

async function getQueue(AccessToken) {
  return new Promise((resolve, reject) => {
    
    //Define the API Endpoint => in this case, the queue
    const url = `https://api.spotify.com/v1/me/player/queue`;

    // Define the headers, including the Authorization header with your access token
    const headers = {
      'Authorization': `Bearer ${AccessToken}`,
    };

    const requestOptions = {
      method: 'GET',
      headers: headers, 
    }

    fetch(url, requestOptions)
      .then((response) => {
        try {
          if (response.ok) {
            return response.json();
          }
        } catch (error) {
          console.error("Error in getting the JSON queue data: "+error);
          reject(false);
        }
      })
      .then((data) => {
        try {
          //Get the 'queue' specific array from response.json data
          const queue = data.queue;
          const songsInQueue = [];

          if (queue.length === 0) { resolve(0); }

          for (let i = 0; i < queue.length; i++) {
            const songData = queue[i];

            //Create song object (idk might be useful in later stages of development to have more info)
            const song = {
              id: songData.id,
              name: songData.name,
              artist: songData.artists[0].name,
              album: songData.album.name,
              duration_ms: songData.duration_ms,
            };
            songsInQueue.push(song);
          }
          console.log('Current Queue Length: '+songsInQueue.length);
          resolve(songsInQueue);
        } catch (error) {
          console.error("Couldn't get arraylist data of songs in queue: "+error);
          reject(null);
        }
      })
      .catch((error) => {
        console.error("Error in fetching queue data (from fetch function): "+error);
        reject(false);
      })
  });
}

//TEST: --IT WORKS 
/*
authorizeSpotify()
  .then((accessToken) => {
    playSong('修煉愛情', 'jj lin', accessToken);
  })
  .catch((error) => {
    console.error('Spotify Authentication failed: '+error);
  });
*/