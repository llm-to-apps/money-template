import { cookies } from 'next/headers';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

import { prisma } from './db';
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
  oauthRedirectUri,
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
  const cookieStore = await cookies();
  cookieStore.set(oauthStateCookie, state, {
    httpOnly: true,
    sameSite: 'none',
    secure: true,
    maxAge: 10 * 60,
    path: '/'
  });
  console.info('[Money Auth] created OAuth request', {
    clientId: oauthClientId(),
    origin,
    parentOrigin: oauthIssuerOrigin(),
    redirectUri: oauthRedirectUri(),
    state
  });

  return {
    clientId: oauthClientId(),
    parentOrigin: oauthIssuerOrigin(),
    redirectUri: oauthRedirectUri(),
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
  console.info('[Money Auth] handling callback', {
    codePresent: Boolean(code),
    origin,
    state
  });
  await verifyOAuthState(state);
  console.info('[Money Auth] state verified', { state });
  const accessToken = await exchangeCodeForAccessToken(code);
  console.info('[Money Auth] token exchange complete', { state });
  const userInfo = await fetchUserInfo(accessToken);
  console.info('[Money Auth] userinfo fetched', {
    email: userInfo.email,
    state,
    sub: userInfo.sub
  });
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
  console.info('[Money Auth] local session created', {
    email: user.email,
    origin,
    state,
    userId: user.id
  });
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const cookieStore = await cookies();

  if (isLocalAuthMode()) {
    if (cookieStore.get(loggedOutCookie)?.value === '1') {
      console.info('[Money Auth] local dev user is signed out');
      return null;
    }

    const user = localAuthUser();
    console.info('[Money Auth] local dev user accepted', {
      email: user.email,
      userId: user.id
    });

    return user;
  }

  const token = cookieStore.get(sessionCookie)?.value;

  if (!token) {
    console.info('[Money Auth] no local session cookie');
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
    console.info('[Money Auth] local session not found');
    return null;
  }

  if (session.expiresAt.getTime() <= Date.now()) {
    console.info('[Money Auth] local session expired', {
      sessionId: session.id,
      userId: session.userId
    });
    await prisma.session.delete({ where: { id: session.id } }).catch(() => null);
    return null;
  }

  console.info('[Money Auth] local session accepted', {
    email: session.user.email,
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
    console.info('[Money Auth] verified signed OAuth state', {
      cookieStatePresent: Boolean(expectedState),
      receivedState: state
    });
    return;
  }

  if (!expectedState || !constantTimeEqual(expectedState, state)) {
    console.warn('[Money Auth] invalid OAuth state', {
      expectedStatePresent: Boolean(expectedState),
      receivedState: state
    });
    throw new Error('Invalid OAuth state');
  }
}

async function exchangeCodeForAccessToken(code: string) {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: oauthRedirectUri(),
    client_id: oauthClientId(),
    client_secret: oauthClientSecret()
  });

  const tokenUrl = oauthInternalTokenUrl();
  console.info('[Money Auth] exchanging code for token', {
    tokenUrl,
    usingInternalUrl: true
  });
  const response = await fetch(
    tokenUrl,
    {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      ...os7RequestHostHeader()
    },
    body
    }
  );

  if (!response.ok) {
    console.warn('[Money Auth] token exchange failed', {
      status: response.status,
      tokenUrl
    });
    throw new Error(`OAuth token exchange failed: ${response.status}`);
  }

  const payload = (await response.json()) as { access_token?: string };

  if (!payload.access_token) {
    throw new Error('OAuth token response did not include an access token');
  }

  return payload.access_token;
}

async function fetchUserInfo(accessToken: string) {
  const userinfoUrl = oauthInternalUserinfoUrl();
  console.info('[Money Auth] fetching userinfo', {
    userinfoUrl,
    usingInternalUrl: true
  });
  const response = await fetch(
    userinfoUrl,
    {
    headers: {
      authorization: `Bearer ${accessToken}`,
      ...os7RequestHostHeader()
    }
    }
  );

  if (!response.ok) {
    console.warn('[Money Auth] userinfo failed', {
      status: response.status,
      userinfoUrl
    });
    throw new Error(`OAuth userinfo request failed: ${response.status}`);
  }

  const payload = (await response.json()) as OAuthUserInfo;

  if (!payload.sub || !payload.email || !payload.role) {
    throw new Error('OAuth userinfo response is missing sub, email, or role');
  }

  return payload;
}

function hashSessionToken(value: string) {
  return createHmac('sha256', authSecret()).update(value).digest('base64url');
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

  if (!Number.isFinite(issuedAtMs) || Date.now() - issuedAtMs > 10 * 60 * 1000) {
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
    leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer)
  );
}
