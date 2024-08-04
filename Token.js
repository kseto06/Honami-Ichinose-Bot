export class Token {
    constructor(accessToken, refreshToken) {
        this.accessToken = accessToken;
        this.refreshToken = refreshToken;
    }

    getAccessToken() {
        return this.accessToken;
    }

    setAccessToken(accessToken) {
        this.accessToken = accessToken;
    }

    getRefreshToken() {
        return this.refreshToken;
    }

    setRefreshToken(refreshToken) {
        this.refreshToken = refreshToken;
    }
}

