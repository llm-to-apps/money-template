import 'server-only';

import { z } from 'zod';

const envSchema = z.object({
  AUTH_SECRET: z.string().min(1).optional(),
  MONEY_AUTH_MODE: z.enum(['oauth', 'local']).default('oauth'),
  MONEY_DEV_MCP_TOKEN: z.string().min(1).optional(),
  MONEY_LOCAL_USER_EMAIL: z.string().email().default('dev@example.local'),
  MONEY_LOCAL_USER_ID: z.string().min(1).default('local-dev-user'),
  MONEY_LOCAL_USER_NAME: z.string().min(1).default('Local'),
  MONEY_LOCAL_USER_ROLE: z.string().min(1).default('admin'),
  NODE_ENV: z.string().optional(),
  OAUTH_AUTHORIZE_URL: z.string().url().optional(),
  OAUTH_CLIENT_ID: z.string().min(1).optional(),
  OAUTH_CLIENT_SECRET: z.string().min(1).optional(),
  OAUTH_INTERNAL_TOKEN_URL: z.string().url().optional(),
  OAUTH_INTERNAL_USERINFO_URL: z.string().url().optional(),
  OAUTH_ISSUER_URL: z.string().url().optional(),
  OAUTH_REQUEST_HOST: z.string().min(1).optional(),
  OS7_PROJECT_TOKEN_INTROSPECTION_URL: z.string().url().optional(),
  PROJECT_ID: z.string().min(1).optional(),
  PROJECT_SERVICE_API_BASE_URI: z.string().url().optional(),
  PROJECT_SERVICE_API_TOKEN: z.string().min(1).optional()
});

type MoneyEnv = z.infer<typeof envSchema>;

let cachedEnv: MoneyEnv | null = null;

export function env() {
  cachedEnv ??= envSchema.parse(process.env);
  return cachedEnv;
}

export function requiredEnv(key: string) {
  const value = env()[key as keyof MoneyEnv];

  if (!value) {
    throw new Error(`${key} is required`);
  }

  return value;
}

export function isProductionEnv() {
  return env().NODE_ENV === 'production';
}

export function authSecret() {
  return requiredEnv('AUTH_SECRET');
}

export function authMode() {
  return env().MONEY_AUTH_MODE;
}

export function isLocalAuthMode() {
  return authMode() === 'local';
}

export function localAuthUser() {
  const currentEnv = env();

  return {
    email: currentEnv.MONEY_LOCAL_USER_EMAIL,
    id: currentEnv.MONEY_LOCAL_USER_ID,
    name: currentEnv.MONEY_LOCAL_USER_NAME,
    role: currentEnv.MONEY_LOCAL_USER_ROLE
  };
}

export function moneyDevMcpToken() {
  return env().MONEY_DEV_MCP_TOKEN ?? null;
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
