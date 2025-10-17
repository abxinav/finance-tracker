import { getOAuth2Client } from './googleSheets';

// Generate OAuth URL for user to authorize
export function getAuthUrl() {
  const oauth2Client = getOAuth2Client();
  
  const scopes = [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive.file',
  ];
  
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent',
  });
}

// Exchange authorization code for tokens
export async function getTokensFromCode(code) {
  const oauth2Client = getOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

// Refresh access token
export async function refreshAccessToken(refreshToken) {
  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({ refresh_token: refreshToken });

  const { credentials } = await oauth2Client.refreshAccessToken();
  return credentials;
}

// Get valid access token (refresh if expired)
export async function getValidAccessToken(accessToken, refreshToken) {
  if (!accessToken) {
    throw new Error('No access token available');
  }

  try {
    // Try to use the current access token by making a test request
    const oauth2Client = getOAuth2Client();
    oauth2Client.setCredentials({ access_token: accessToken });

    // If we reach here, token is valid
    return accessToken;
  } catch (error) {
    // Token might be expired, try to refresh
    if (refreshToken) {
      const newCredentials = await refreshAccessToken(refreshToken);
      return newCredentials.access_token;
    }
    throw new Error('Token expired and no refresh token available');
  }
}
