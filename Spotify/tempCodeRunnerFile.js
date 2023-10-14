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

  accessToken = tokenData.access_token;
  refreshToken = tokenData.refresh_token;

  console.log('Access Token:', accessToken);
  console.log('Refresh Token:', refreshToken);

  spotifyApi.setAccessToken(accessToken);

  res.send('You are now authorized!! Yay <3');
  // Can now use the access token to make Spotify API requests  
});
