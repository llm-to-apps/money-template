import 'server-only';

import { cookies } from 'next/headers';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

import { prisma } from '@/server/db';
import { logInfo, logWarn } from '@/server/logger';
import {
  authSecret,
  isLocalAuthMode,
  localAuthUser,
  oauthAuthorizeUrl,
  oauthClientId,
  oauthClientSecret,
  oauthInternalTokenUrl,
  oauthInternalUserinfoUrl,
  oauthIssuerOrigin,
  os7RequestHostHeader
} from './env';

const sessionCookie = 'money_session';
const oauthStateCookie = 'money_oauth_state';
const loggedOutCookie = 'logged_out';
const sessionTtlSeconds = 60 * 60 * 24 * 30;

export type CurrentUser = {
  id: string;
  email: string;
  name: string | null;
  role: string;
};

type OAuthUserInfo = {
  sub: string;
  email: string;
  name?: string | null;
  role: string;
};

export async function createOAuthRequest(origin: string) {
  ensureOAuthAuthMode();
  const state = createSignedOAuthState();
  const redirectUri = oauthRedirectUri(origin);
  const cookieStore = await cookies();
  cookieStore.set(oauthStateCookie, state, {
    httpOnly: true,
    sameSite: 'none',
    secure: true,
    maxAge: 10 * 60,
    path: '/'
  });
  logInfo('auth.oauth_request.created', {
    clientId: oauthClientId(),
    origin,
    provider: 'os7',
    redirectUri
  });

  return {
    clientId: oauthClientId(),
    parentOrigin: oauthIssuerOrigin(),
    redirectUri,
    scope: 'openid email profile',
    state
  };
}

export async function createLoginRedirectUrl(
  origin: string,
  promptNone = true
) {
  const oauthRequest = await createOAuthRequest(origin);
  const url = new URL(oauthAuthorizeUrl());
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', oauthRequest.clientId);
  url.searchParams.set('redirect_uri', oauthRequest.redirectUri);
  url.searchParams.set('scope', oauthRequest.scope);
  url.searchParams.set('state', oauthRequest.state);

  if (promptNone) {
    url.searchParams.set('prompt', 'none');
  }

  return url;
}

export async function handleOAuthCallback({
  code,
  origin,
  state
}: {
  code: string;
  origin: string;
  state: string;
}) {
  ensureOAuthAuthMode();
  const startedAt = Date.now();
  logInfo('auth.oauth_callback.started', {
    codePresent: Boolean(code),
    origin,
    provider: 'os7',
    statePresent: Boolean(state)
  });
  await verifyOAuthState(state);
  logInfo('auth.oauth_state.verified', { provider: 'os7' });
  const accessToken = await exchangeCodeForAccessToken(code, origin);
  const userInfo = await fetchUserInfo(accessToken);
  const user = await prisma.user.upsert({
    where: {
      id: userInfo.sub
    },
    update: {
      email: userInfo.email,
      name: userInfo.name ?? null,
      role: userInfo.role
    },
    create: {
      id: userInfo.sub,
      email: userInfo.email,
      name: userInfo.name ?? null,
      role: userInfo.role
    }
  });

  await createSession({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role
  });
  logInfo('auth.session.created', {
    elapsedMs: Date.now() - startedAt,
    origin,
    provider: 'os7',
    userId: user.id
  });
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const cookieStore = await cookies();

  if (isLocalAuthMode()) {
    if (cookieStore.get(loggedOutCookie)?.value === '1') {
      logInfo('auth.local_user.signed_out', {
        mode: 'local'
      });
      return null;
    }

    const user = localAuthUser();
    logInfo('auth.local_user.accepted', {
      mode: 'local',
      userId: user.id
    });

    return user;
  }

  const token = cookieStore.get(sessionCookie)?.value;

  if (!token) {
    logInfo('auth.session.missing');
    return null;
  }

  const session = await prisma.session.findUnique({
    where: {
      tokenHash: hashSessionToken(token)
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          role: true
        }
      }
    }
  });

  if (!session) {
    logInfo('auth.session.not_found');
    return null;
  }

  if (session.expiresAt.getTime() <= Date.now()) {
    logInfo('auth.session.expired', {
      sessionId: session.id,
      userId: session.userId
    });
    await prisma.session
      .delete({ where: { id: session.id } })
      .catch(() => null);
    return null;
  }

  logInfo('auth.session.accepted', {
    userId: session.user.id
  });
  return session.user;
}

export async function isManuallyLoggedOut() {
  const cookieStore = await cookies();
  return cookieStore.get(loggedOutCookie)?.value === '1';
}

export async function clearSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookie)?.value;

  if (isLocalAuthMode()) {
    cookieStore.delete(sessionCookie);
    return;
  }

  if (token) {
    await prisma.session
      .delete({
        where: {
          tokenHash: hashSessionToken(token)
        }
      })
      .catch(() => null);
  }

  cookieStore.delete(sessionCookie);
}

export async function markManuallyLoggedOut() {
  const cookieStore = await cookies();
  cookieStore.set(loggedOutCookie, '1', {
    httpOnly: true,
    ...manualLogoutCookieOptions(),
    maxAge: 60 * 60 * 24 * 30,
    path: '/'
  });
}

export async function clearManualLogout() {
  const cookieStore = await cookies();
  cookieStore.set(loggedOutCookie, '', {
    httpOnly: true,
    ...manualLogoutCookieOptions(),
    maxAge: 0,
    path: '/'
  });
}

async function createSession(user: CurrentUser) {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + sessionTtlSeconds * 1000);

  await prisma.session.create({
    data: {
      tokenHash: hashSessionToken(token),
      userId: user.id,
      expiresAt
    }
  });

  const cookieStore = await cookies();
  cookieStore.set(sessionCookie, token, {
    httpOnly: true,
    sameSite: 'none',
    secure: true,
    maxAge: sessionTtlSeconds,
    path: '/'
  });
  await clearManualLogout();
}

async function verifyOAuthState(state: string) {
  const cookieStore = await cookies();
  const expectedState = cookieStore.get(oauthStateCookie)?.value;
  cookieStore.delete(oauthStateCookie);

  if (expectedState && constantTimeEqual(expectedState, state)) {
    return;
  }

  if (verifySignedOAuthState(state)) {
    logInfo('auth.oauth_state.signed_verified', {
      cookieStatePresent: Boolean(expectedState),
      provider: 'os7'
    });
    return;
  }

  if (!expectedState || !constantTimeEqual(expectedState, state)) {
    logWarn('auth.oauth_state.invalid', {
      expectedStatePresent: Boolean(expectedState),
      provider: 'os7',
      receivedStatePresent: Boolean(state)
    });
    throw new Error('Invalid OAuth state');
  }
}

async function exchangeCodeForAccessToken(code: string, origin: string) {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: oauthRedirectUri(origin),
    client_id: oauthClientId(),
    client_secret: oauthClientSecret()
  });

  const tokenUrl = oauthInternalTokenUrl();
  const startedAt = Date.now();
  logInfo('auth.oauth_token_exchange.started', {
    provider: 'os7'
  });
  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      ...os7RequestHostHeader()
    },
    body
  });

  if (!response.ok) {
    logWarn('auth.oauth_token_exchange.failed', {
      elapsedMs: Date.now() - startedAt,
      provider: 'os7',
      status: response.status
    });
    throw new Error(`OAuth token exchange failed: ${response.status}`);
  }

  const payload = (await response.json()) as { access_token?: string };

  if (!payload.access_token) {
    logWarn('auth.oauth_token_exchange.failed', {
      elapsedMs: Date.now() - startedAt,
      provider: 'os7',
      status: 'missing_access_token'
    });
    throw new Error('OAuth token response did not include an access token');
  }

  logInfo('auth.oauth_token_exchange.finished', {
    elapsedMs: Date.now() - startedAt,
    provider: 'os7',
    status: response.status
  });

  return payload.access_token;
}

async function fetchUserInfo(accessToken: string) {
  const userinfoUrl = oauthInternalUserinfoUrl();
  const startedAt = Date.now();
  logInfo('auth.oauth_userinfo.started', {
    provider: 'os7'
  });
  const response = await fetch(userinfoUrl, {
    headers: {
      authorization: `Bearer ${accessToken}`,
      ...os7RequestHostHeader()
    }
  });

  if (!response.ok) {
    logWarn('auth.oauth_userinfo.failed', {
      elapsedMs: Date.now() - startedAt,
      provider: 'os7',
      status: response.status
    });
    throw new Error(`OAuth userinfo request failed: ${response.status}`);
  }

  const payload = (await response.json()) as OAuthUserInfo;

  if (!payload.sub || !payload.email || !payload.role) {
    logWarn('auth.oauth_userinfo.failed', {
      elapsedMs: Date.now() - startedAt,
      provider: 'os7',
      status: 'invalid_payload'
    });
    throw new Error('OAuth userinfo response is missing sub, email, or role');
  }

  logInfo('auth.oauth_userinfo.finished', {
    elapsedMs: Date.now() - startedAt,
    provider: 'os7',
    status: response.status,
    userId: payload.sub
  });

  return payload;
}

function hashSessionToken(value: string) {
  return createHmac('sha256', authSecret()).update(value).digest('base64url');
}

function oauthRedirectUri(origin: string) {
  return `${origin.replace(/\/+$/, '')}/api/auth/callback/os7`;
}

function createSignedOAuthState() {
  const nonce = randomBytes(24).toString('base64url');
  const issuedAt = Date.now().toString(36);
  const payload = `${issuedAt}.${nonce}`;
  const signature = signOAuthStatePayload(payload);

  return `${payload}.${signature}`;
}

function verifySignedOAuthState(state: string) {
  const [issuedAt, nonce, signature] = state.split('.');

  if (!issuedAt || !nonce || !signature) {
    return false;
  }

  const issuedAtMs = Number.parseInt(issuedAt, 36);

  if (
    !Number.isFinite(issuedAtMs) ||
    Date.now() - issuedAtMs > 10 * 60 * 1000
  ) {
    return false;
  }

  const expectedSignature = signOAuthStatePayload(`${issuedAt}.${nonce}`);

  return constantTimeEqual(expectedSignature, signature);
}

function signOAuthStatePayload(payload: string) {
  return createHmac('sha256', authSecret()).update(payload).digest('base64url');
}

function ensureOAuthAuthMode() {
  if (isLocalAuthMode()) {
    throw new Error('OAuth is disabled when MONEY_AUTH_MODE=local');
  }
}

function manualLogoutCookieOptions() {
  if (isLocalAuthMode()) {
    return {
      sameSite: 'lax' as const,
      secure: false
    };
  }

  return {
    sameSite: 'none' as const,
    secure: true
  };
}

function constantTimeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}
