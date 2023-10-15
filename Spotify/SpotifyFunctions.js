/*
* HONAMI ICHINOSE DISCORD BOT - From the Classroom of the Elite
* @author Kaden (Winterlicia) <>
*/

import express from 'express';
import fetch from 'node-fetch';
import crypto from 'crypto';
import SpotifyWebApi from 'spotify-web-api-node';

const app = express();
const PORT = 3000;

//Init config.json for id and secret
import fs from 'fs';
const config = JSON.parse(fs.readFileSync('config.json', 'utf-8'));

const clientId = config.spotify_clientid; // Replace with your Spotify client ID
const clientSecret = config.spotify_clientsecret; // Replace with your Spotify client secret
const redirectUri = 'http://localhost:3000/callback'; // Replace with your redirect URI

//Define spotifyApi with client's ID and Secret
const spotifyApi = new SpotifyWebApi({
  clientId: clientId,
  clientSecret: clientSecret,
});

// In-memory storage for code_verifiers 
const codeVerifiers = new Map();

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

    if (accessToken) {
      resolve(accessToken);
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
console.log('Authorize here: http://localhost:3000/authorize');
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

      if (searchResults.body.tracks.total > 0) {
          const trackURI = searchResults.body.tracks.items[0].uri;

          // Spotify Web API to get user's device
          const devicesData = await spotifyApi.getMyDevices();
          const devices = devicesData.body.devices;

          if (devices.length > 0) {
              const activeDeviceID = devices[0].id;
              console.log('Active Device ID: ', activeDeviceID);
              
              // Play the track on the active device
              await spotifyApi.play({ uris: [trackURI], device_id: activeDeviceID });

              // You may want to return a success message or result here
              return "Song is now playing~~";
          } else {
              console.log('No active devices found');
              throw new Error("Device not found");
          }
      } else {
          return("Could not get searchResults :(");
          throw new Error("Could not get searchResults");
      }
  } catch (error) {
      console.error('Error:', error);
      throw error; // Propagate the error to the calling function
  }
}

export async function continuePlaying(ArtistID, accessToken) {
  try {
      const playbackState = await spotifyApi.getMyCurrentPlaybackState();

      if (!playbackState.body.is_playing) {
        const currentArtistTracks = await spotifyApi.getArtistTopTracks(ArtistID, 'US');

        if (artistTopTracks.body.tracks.length > 0) {
          // Select a track from the top tracks
          const nextTrack = artistTopTracks.body.tracks[0];
    
          // Play the next track
          await spotifyApi.play({ uris: [nextTrack.uri] });
          return "Next song is now playing~~";        
        }
      }
  } catch (error) {
    console.log("Error in playing other artist tracks: "+error);
  }
}

export async function getArtistID(ArtistName, AccessToken) {
  //Get the Artist's ID
  const headers = {
      'Authorization': `Bearer ${AccessToken}`,
      'Content-Type': 'application/x-www-form-urlencoded',
  }
  const params = new URLSearchParams();
  params.append('q', ArtistName);
  params.append('type', 'artist');

  return fetch('https://api.spotify.com/v1/search?' + params.toString(), { headers })
    .then(response => response.json())
    .then(data => {
      if (data.artists && data.artists.items && data.artists.items.length > 0) {
        const ArtistID = data.artists.items[0].id; //Get the first artist (most relevant match)
        console.log("Artist ID: "+ ArtistID);
        return ArtistID;
      } else {
        console.error("Couldn't get artist ID: No artist data found");
        return null; // Return a null value to indicate failure
      }
    })
    .catch((error) => {
      console.error("Couldn't get artist ID: "+error);
      return null;
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

//TEST: getArtistID: 

/*
authorizeSpotify()
  .then((accessToken) => {
    getArtistID('JJ Lin', accessToken)
      .then((artistID) => {
        console.log(`JJ Lin's Artist ID: ${artistID}`);
      })
  });
*/

