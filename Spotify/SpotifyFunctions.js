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

export async function playArtist(ArtistName, AccessToken) {
  return new Promise((resolve, reject) => {
    const searchEndpoint = 'https://api.spotify.com/v1/search';

    const searchParameters = new URLSearchParams ({
      q: `artist ${ArtistName}`,
      type: 'artist',
    });

    const headers = {
      Authorization: `Bearer ${AccessToken}`,
    };

    const url = `${searchEndpoint}?${searchParameters.toString()}`;

    fetch(url, { headers: headers, })
      .then((response) => {
        try {
          if (response.ok) {
            console.log("Search response is ok!");
            return response.json();
          }
        } catch (error) {
          console.error("Error in getting the JSON queue data: "+error);
          reject(null);
        }
      })
      //Get Album ID:
      .then((data) => {
        try {
          const artists = data.artists.items;

          if (artists.length > 0) {
            const artistID = artists[0].id;
            console.log("Fetched artistID: "+artistID);
            return artistID;
          } else {
            console.error("Error in finding artist");
            reject(false);            
          }
        } catch (error) {
          console.error("Error in returning the artist data: "+error);
          reject(null);
        }
      })
      //Use returned artist ID to get the request the artist's top tracks from the API:
      .then((returnedID) => {
        console.log("Returned artist ID: "+returnedID);
        const artistEndpoint = `https://api.spotify.com/v1/artists`;

        const headers = {
          'Authorization': `Bearer ${AccessToken}`,
        };
    
        const requestOptions = {
          method: 'GET',
          headers: headers, 
        };
        
        //Construct the finalized artist URL endpoint
        const artistURL = `${artistEndpoint}/${returnedID}/top-tracks?country=US`;

        return fetch(artistURL, requestOptions)
          .then((response) => {
            try {

              if (!response.ok) {
                throw new Error('Network response was not ok');
              }
              console.log("Response is ok!");
              return response.json();

            } catch (error) {
              console.error("Error in getting the JSON queue data: "+error);
              reject(null);
            }
          })
          .catch((error) => {
            console.error("Error in fetching the artistURL data: "+error);
            reject(null);
          })
      })      
      //Use the response to return the ArrayList of songs in the album
      .then((data) => {
        const tracks = data.tracks;
        const songList = [];

        //Iterate through each track and store their info into an array, use for-of since data does not give a total number of top tracks
        try {

          tracks.forEach((trackInfo) => { 
            const track = {
              name: trackInfo.name, 
              artists: trackInfo.artists[0].name, //First instance of artists
              duration_ms: trackInfo.duration_ms,
              uri: trackInfo.uri,
            };
            songList.push(track);
          });

        } catch (error) {
          console.error("Error in creating the songList (playArtist function): "+error);
          reject(null);
        }

        return songList;
      })
      //If song list returned, then play the first song of the songList
      .then((songList) => {
        try {
          let successful = false;
          playSong(songList[0].name, songList[0].artists, AccessToken)
            .then((success) => {
              if (success === true) {
                console.log("First song played successfully!");
                successful = true;

                //Then, if first track successfully played, add the rest to queue and resolve
                if (successful) { 
                  for (let i = 1; i < songList.length; i++) {
                    try {
                      addToQueue(songList[i].uri, AccessToken)
                        .then((result) => {
                          if (result === true) {
                            console.log(`Song number ${i} added to queue successfully!`);
                          } else {
                            console.log("Add to queue unsuccessful");
                            reject(false);
                          }
                        })
                    } catch (error) {
                      console.log("Error in adding to queue (playArtist): ", error)
                    }
                  }
                  //Process successful if it made it to here :)
                  successful = false;
                  resolve(songList[0].artists);
                }

              } else if (success === false) {
                console.log("No active devices found");
                resolve(false);
              } else {
                console.log("Couldn't play the first song");
                resolve(null);
              }
            })

        } catch (error) {
          console.error("Error in playing the artist's first track: "+error);
          reject(null);
        }
      })
      .catch((error) => {
        console.error("Error in fetching artist response: "+error);
        reject(null);
      });
  });
}

export async function returnNextTracks(ArtistName, AccessToken) {
  //console.log(AccessToken);
  await spotifyApi.setAccessToken(AccessToken);

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
              }
              return true;
            } else {
              return false;
            }
          })
          //For some reason, the next song doesn't play once the queue is added. Add a play song command here:
          .then((success) => {
            if (success === true) {
              spotifyApi.play()
                .then(() => {
                  console.log("Song resumed successfully after adding to queue!");
                  return true;
                })
                .catch((error) => {
                  //Error is caught here, in this .then() chain -- does this have to be deleted? But technically, the song does resume successfully after adding to queue
                  console.error("Error in playing the next song after adding to queue: "+error);
                });
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
export async function clearQueue(AccessToken) {
  spotifyApi.setAccessToken(AccessToken);

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
          //console.error("No current song playing"); --> Error message
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
        if (error.includes('expired')) {
          // Save the access token so that it's used in future calls
          const newAccessToken = data.body['access_token'];
          console.log("Access token has been refreshed: "+newAccessToken);

          //Return the new access token, and set it equal to the global variable in Main.js
          resolve(String(newAccessToken));
        } else {
          console.error(new Error('Unable to refresh the token: '));
          reject(null);
        }

    })
    .catch((error) => {
      console.error("Error in refreshing the token: "+error);
      if (String(error).includes("supplied")) {
        reject(false);
      }
      reject(null);
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
        if (data === undefined) { data = true; }
        console.log('Volume changed successfully: '+data);
        resolve(true);
      })
      .catch((error) => {
        console.error('Error changing volume: '+error);
        reject(false);
      });
  });
}

export async function addToQueue(uri, AccessToken) {
  return new Promise((resolve, reject) => {
   //Define API endpoints, headers, research
   const endpoint = `https://api.spotify.com/v1/me/player/queue?uri=${uri}`;

   const headers = {
    'Authorization': `Bearer ${AccessToken}`,
   }

   const requestOptions = {
    method: 'POST',
    headers: headers,
   }

   fetch(endpoint, requestOptions)
    //Fetch a response and resolve if possible, throw errors here
    .then((response) => {
      try {

        if (response.status === 204) {
          // 204 status indicates success with no content
          console.log('Track added to queue successfully');
          resolve(true);
          return;
        } else if (response.ok) {
          return response.json();
        } else {
          throw new Error('Error getting the response: '+response.statusText);
        }

      } catch (error) {
        console.error("Error in fetching the response to add to queue: "+error);
        reject(null);
      }
    })
    //Check the response and resolve
    .then((data) => {
      if (data === undefined) { data = true; }
      console.log("Song added successfully: "+data);
      resolve(true);
    })
    .catch((error) => {
      console.error("Error in using fetch (addToQueue): "+error);
      // reject(null);
      resolve(false);
    })
  });
}

export async function getQueue(AccessToken) {
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

export async function getAlbum(AccessToken, AlbumName) {
  return new Promise((resolve, reject) => { 
    const searchEndpoint = 'https://api.spotify.com/v1/search';

    const searchParameters = new URLSearchParams ({
      q: `album ${AlbumName}`,
      type: 'album',
    });

    const headers = {
      Authorization: `Bearer ${AccessToken}`,
    };

    const url = `${searchEndpoint}?${searchParameters.toString()}`;

    fetch(url, { headers: headers, })
      .then((response) => {
        try {
          if (response.ok) {
            return response.json();
          }
        } catch (error) {
          console.error("Error in getting the JSON queue data: "+error);
          reject(null);
        }
      })
      //Get Album ID:
      .then((data) => {
        try {
          const albums = data.albums.items;

          if (albums.length > 0) {
            const albumID = albums[0].id;
            console.log("Fetched albumID: "+albumID);
            return albumID;
          } else {
            console.error("Error in finding album");
            reject(false);            
          }
        } catch (error) {
          console.error("Error in returning the album data: "+error);
          reject(null);
        }
      })
      //Use returned Album ID to get the request the album from the API:
      .then((returnedID) => {
        console.log("Returned album ID: "+returnedID);
        const albumEndpoint = `https://api.spotify.com/v1/albums`;

        const headers = {
          'Authorization': `Bearer ${AccessToken}`,
        };
    
        const requestOptions = {
          method: 'GET',
          headers: headers, 
        };
        
        //Construct the finalized album URL endpoint
        const albumURL = `${albumEndpoint}/${returnedID}`;

        return fetch(albumURL, requestOptions)
          .then((response) => {
            try {
              if (response.ok) {
                console.log("Response is ok!");
                return response.json();
              }
            } catch (error) {
              console.error("Error in getting the JSON queue data: "+error);
              reject(null);
            }
          })
          .catch((error) => {
            console.error("Error in fetching the albumURL data: "+error);
          })
      })      
      //Use the response to return the ArrayList of songs in the album
      .then((data) => {
        const tracks = data.tracks.items;
        const trackCount = data.tracks.total;
        console.log("Track count: "+trackCount);
        const songList = [];

        //Iterate through each track and store their info into an arrayu
        for (let i = 0; i < trackCount; i++) {
          const trackInfo = {
            name: tracks[i].name, 
            artists: tracks[i].artists[0].name, //First instance of artists
            duration_ms: tracks[i].duration_ms,
            uri: tracks[i].uri,
          };
          songList.push(trackInfo);
        }
        resolve(songList);
      })
      .catch((error) => {
        console.error("Error in fetching album response: "+error);
        reject(null);
      });
    });
}

export async function getTrackURL(trackName, artistName, accessToken) {
  console.log(`Track Name: ${trackName} and Artist Name: ${artistName}`);
  return new Promise((resolve, reject) => {
    //Request a search to get the track id:
    const searchEndpoint = 'https://api.spotify.com/v1/search';

    const searchParameters = new URLSearchParams ({
      q: `track ${trackName} artist ${artistName}`,
      type: 'track,artist',
    });

    const headers = {
      Authorization: `Bearer ${accessToken}`,
    };

    const url = `${searchEndpoint}?${searchParameters.toString()}`;

    fetch(url, { headers: headers, })
      .then((response) => {
        try {
          if (response.ok) {
            return response.json();
          } else {
            console.log("Unable to return the JSON track response");
            reject(null);
          }
        } catch (error) {
          console.error("Error in getting the JSON track data: "+error);
          reject(null);
        }
      })
      //Use returned data to get the best matching possible track
      .then((data) => {
        if (data) {
          console.log(data);
          console.log('Most probable track id: '+data.tracks.items[0].id);
          return data.tracks.items[0].id;
        }
      })
      //Use the track id to request Get Track and get the external_urls
      .then((id) => {
        const trackEndpoint = 'https://api.spotify.com/v1/tracks';

        const headers = {
          Authorization: `Bearer ${accessToken}`,
        };

        const url = `${trackEndpoint}/${id}`;

        fetch(url, { headers: headers, })
          .then((response) => {
            try {
              if (response.ok) {
                return response.json();
              } else {
                console.log("Unable to return the JSON id response: "+response.statusText);
                return;
              }
            } catch (error) {
              console.error("Error in getting the JSON id data: "+error);
              reject(null);
            }
          })
          .then((data) => {
            if (data) {
              const trackURL = data.external_urls.spotify;
              const imageURL = data.album.images[0].url;
              const artistURL = data.artists[0].external_urls.spotify;
              const albumURL = data.album.external_urls.spotify;
              const albumName = data.album.name;
              console.log("Returned Spotify URL: "+data.external_urls.spotify);
              console.log("Returned track image object: "+data.album.images[0].url);
              console.log("Returned track album: "+data.album.name);
              resolve({ trackURL, imageURL, artistURL, albumURL, albumName });
            }
          })
          .catch((error) => {
            console.error("Error in fetching response (id chain): "+error);
          })
        })
        .catch((error) => {
          console.error("Error in fetching the overall track response: "+error);
        });
  });
}

export async function setSongPosition(position_ms, AccessToken) {
  return new Promise((resolve, reject) => { 
      //Check for valid integer value for position_ms
      if (!Number.isInteger(position_ms)) {
        reject(false);
      }

      // Define the API endpoint
      const apiUrl = `https://api.spotify.com/v1/me/player/seek?position_ms=${position_ms}`;

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

      fetch(apiUrl, requestOptions)
        .then((response) => {
          try {
            if (response.status === 204) {
              // 204 status indicates success with no content
              console.log('Song position changed successfully');
              resolve(true);

            } else if (response.ok) {
              return response.json();

            } else {
              throw new Error('Error changing pos: '+response.statusText);
            }

          } catch (error) {
            console.error("Error in getting the JSON id data: "+error);
            reject(null);
          }
        });
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