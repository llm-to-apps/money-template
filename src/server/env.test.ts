import { afterEach, describe, expect, it, vi } from 'vitest';

const originalEnv = { ...process.env };

describe('server env helpers', () => {
  afterEach(() => {
    process.env = { ...originalEnv } as NodeJS.ProcessEnv;
    vi.resetModules();
  });

  it('returns defaults for local development helpers', async () => {
    process.env = {
      MONEY_AUTH_MODE: 'local',
      MONEY_DEV_MCP_TOKEN: 'dev-token',
      NODE_ENV: 'production'
    } as NodeJS.ProcessEnv;

    const {
      authMode,
      isLocalAuthMode,
      isProductionEnv,
      localAuthUser,
      moneyDevMcpToken
    } = await import('./env');

    expect(authMode()).toBe('local');
    expect(isLocalAuthMode()).toBe(true);
    expect(isProductionEnv()).toBe(true);
    expect(localAuthUser()).toEqual({
      email: 'dev@example.local',
      id: 'local-dev-user',
      name: 'Local',
      role: 'admin'
    });
    expect(moneyDevMcpToken()).toBe('dev-token');
  });

  it('normalizes URL helpers and headers', async () => {
    process.env = {
      AUTH_SECRET: 'secret',
      NODE_ENV: 'test',
      OAUTH_AUTHORIZE_URL: 'https://auth.example.com/authorize',
      OAUTH_CLIENT_ID: 'client-id',
      OAUTH_CLIENT_SECRET: 'client-secret',
      OAUTH_INTERNAL_TOKEN_URL: 'https://auth.internal/token',
      OAUTH_INTERNAL_USERINFO_URL: 'https://auth.internal/userinfo',
      OAUTH_ISSUER_URL: 'https://issuer.example.com/oauth',
      OAUTH_REQUEST_HOST: 'money.example.com',
      OS7_PROJECT_TOKEN_INTROSPECTION_URL: 'https://auth.internal/introspect',
      PROJECT_ID: 'project_1',
      PROJECT_SERVICE_API_BASE_URI: 'https://api.example.com///',
      PROJECT_SERVICE_API_TOKEN: 'project-token'
    } as NodeJS.ProcessEnv;

    const env = await import('./env');

    expect(env.authSecret()).toBe('secret');
    expect(env.oauthAuthorizeUrl()).toBe('https://auth.example.com/authorize');
    expect(env.oauthClientId()).toBe('client-id');
    expect(env.oauthClientSecret()).toBe('client-secret');
    expect(env.oauthInternalTokenUrl()).toBe('https://auth.internal/token');
    expect(env.oauthInternalUserinfoUrl()).toBe(
      'https://auth.internal/userinfo'
    );
    expect(env.oauthIssuerOrigin()).toBe('https://issuer.example.com');
    expect(env.os7RequestHostHeader()).toEqual({ host: 'money.example.com' });
    expect(env.projectId()).toBe('project_1');
    expect(env.projectTokenIntrospectionUrl()).toBe(
      'https://auth.internal/introspect'
    );
    expect(env.projectServiceApiBaseUri()).toBe('https://api.example.com');
    expect(env.projectServiceApiToken()).toBe('project-token');
  });

  it('throws when a required value is missing', async () => {
    process.env = { NODE_ENV: 'test' } as NodeJS.ProcessEnv;

    const { authSecret } = await import('./env');

    expect(() => authSecret()).toThrow('AUTH_SECRET is required');
  });
});
