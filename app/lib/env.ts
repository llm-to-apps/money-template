export function requiredEnv(key: string) {
  const value = process.env[key];

  if (!value) {
    throw new Error(`${key} is required`);
  }

  return value;
}

export function isProductionEnv() {
  return process.env.NODE_ENV === 'production';
}

export function authSecret() {
  return requiredEnv('AUTH_SECRET');
}

export function authMode() {
  const mode = process.env.MONEY_AUTH_MODE ?? 'oauth';

  if (mode !== 'oauth' && mode !== 'local') {
    throw new Error('MONEY_AUTH_MODE must be oauth or local');
  }

  return mode;
}

export function isLocalAuthMode() {
  return authMode() === 'local';
}

export function localAuthUser() {
  return {
    email: process.env.MONEY_LOCAL_USER_EMAIL ?? 'dev@example.local',
    id: process.env.MONEY_LOCAL_USER_ID ?? 'local-dev-user',
    name: process.env.MONEY_LOCAL_USER_NAME ?? 'Local',
    role: process.env.MONEY_LOCAL_USER_ROLE ?? 'admin'
  };
}

export function moneyDevMcpToken() {
  return process.env.MONEY_DEV_MCP_TOKEN || null;
}

export function appPublicUrl() {
  return requiredEnv('APP_PUBLIC_URL').replace(/\/+$/, '');
}

export function oauthClientId() {
  return requiredEnv('OAUTH_CLIENT_ID');
}

export function oauthClientSecret() {
  return requiredEnv('OAUTH_CLIENT_SECRET');
}

export function oauthAuthorizeUrl() {
  return requiredEnv('OAUTH_AUTHORIZE_URL');
}

export function oauthInternalTokenUrl() {
  return requiredEnv('OAUTH_INTERNAL_TOKEN_URL');
}

export function oauthInternalUserinfoUrl() {
  return requiredEnv('OAUTH_INTERNAL_USERINFO_URL');
}

export function oauthIssuerOrigin() {
  return new URL(requiredEnv('OAUTH_ISSUER_URL')).origin;
}

export function oauthRedirectUri() {
  return requiredEnv('OAUTH_REDIRECT_URI');
}

export function os7RequestHostHeader(): Record<string, string> {
  return {
    host: requiredEnv('OAUTH_REQUEST_HOST')
  };
}

export function projectId() {
  return requiredEnv('PROJECT_ID');
}

export function projectTokenIntrospectionUrl() {
  return requiredEnv('OS7_PROJECT_TOKEN_INTROSPECTION_URL');
}

export function projectServiceApiBaseUri() {
  return requiredEnv('PROJECT_SERVICE_API_BASE_URI').replace(/\/+$/, '');
}

export function projectServiceApiToken() {
  return requiredEnv('PROJECT_SERVICE_API_TOKEN');
}
