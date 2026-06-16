import { NextRequest, NextResponse } from 'next/server';

import { clearManualLogout, createOAuthRequest } from '../../lib/auth';
import { isLocalAuthMode } from '../../lib/env';
import { publicOrigin } from '../../lib/request-origin';

export async function GET(request: NextRequest) {
  if (isLocalAuthMode()) {
    await clearManualLogout();

    return NextResponse.redirect(new URL('/', request.url));
  }

  const origin = publicOrigin();
  const oauthRequest = await createOAuthRequest(origin);
  const payload = JSON.stringify(oauthRequest).replace(/</g, '\\u003c');
  console.info('[Money OAuth Login] rendered bridge login', {
    clientId: oauthRequest.clientId,
    isFrameHint: request.headers.get('sec-fetch-dest') === 'iframe',
    origin,
    parentOrigin: oauthRequest.parentOrigin,
    redirectUri: oauthRequest.redirectUri,
    state: oauthRequest.state
  });

  return new NextResponse(
    `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Signing in</title>
    <style>
      :root { color-scheme: light; }
      body {
        min-height: 100vh;
        margin: 0;
        display: grid;
        place-items: center;
        background: #f5f7f4;
        color: #17211f;
        font-family: Arial, Helvetica, sans-serif;
      }
      main {
        display: grid;
        justify-items: center;
        gap: 14px;
        padding: 28px;
        text-align: center;
      }
      h1 {
        margin: 0;
        font-size: 18px;
        letter-spacing: 0;
      }
      .spinner {
        width: 34px;
        height: 34px;
        border: 3px solid #d9dfda;
        border-top-color: #0f8b6f;
        border-radius: 999px;
        animation: spin 0.8s linear infinite;
      }
      @keyframes spin { to { transform: rotate(360deg); } }
    </style>
  </head>
  <body>
    <main>
      <div class="spinner" aria-hidden="true"></div>
      <h1 id="status">Signing you in...</h1>
    </main>
    <script>
      const oauthRequest = ${payload};
      const status = document.getElementById('status');
      const interactiveLoginUrl = '/api/auth/login?interactive=1';
      console.info('[Money OAuth Frame] login page loaded', {
        isFrame: window.parent !== window,
        parentOrigin: oauthRequest.parentOrigin,
        redirectUri: oauthRequest.redirectUri,
        state: oauthRequest.state
      });

      if (window.parent === window) {
        console.info('[Money OAuth Frame] top-level login fallback');
        window.location.replace('/api/auth/login');
      } else {
        let isDone = false;
        let requestAttempt = 0;
        let retryInterval = 0;
        const timeout = window.setTimeout(() => {
          isDone = true;
          window.clearInterval(retryInterval);
          console.warn('[Money OAuth Frame] oauth:response timeout; falling back to interactive login');
          window.location.replace(interactiveLoginUrl);
        }, 15000);

        window.addEventListener('message', (event) => {
          console.info('[Money OAuth Frame] message received', {
            eventOrigin: event.origin,
            expectedOrigin: oauthRequest.parentOrigin,
            stateMatches: event.data?.state === oauthRequest.state,
            type: event.data?.type
          });

          if (event.origin !== oauthRequest.parentOrigin || event.data?.state !== oauthRequest.state) {
            console.warn('[Money OAuth Frame] ignored message', {
              eventOrigin: event.origin,
              expectedOrigin: oauthRequest.parentOrigin,
              eventState: event.data?.state,
              expectedState: oauthRequest.state,
              type: event.data?.type
            });
            return;
          }

          if (event.data.type === 'oauth:response' && event.data.code) {
            isDone = true;
            window.clearTimeout(timeout);
            window.clearInterval(retryInterval);
            console.info('[Money OAuth Frame] oauth:response accepted; redirecting to callback');
            const callbackUrl = new URL(oauthRequest.redirectUri);
            callbackUrl.searchParams.set('code', event.data.code);
            callbackUrl.searchParams.set('state', oauthRequest.state);
            window.location.replace(callbackUrl.toString());
            return;
          }

          if (event.data.type === 'oauth:error') {
            isDone = true;
            window.clearTimeout(timeout);
            window.clearInterval(retryInterval);
            console.error('[Money OAuth Frame] oauth:error received', event.data);
            status.textContent = event.data.message || 'Sign-in failed. Opening OS7 sign-in...';
            window.location.replace(interactiveLoginUrl);
          }
        });

        function postOAuthRequest() {
          if (isDone) {
            return;
          }

          requestAttempt += 1;
          console.info('[Money OAuth Frame] posting oauth:request', {
            attempt: requestAttempt,
            clientId: oauthRequest.clientId,
            parentOrigin: oauthRequest.parentOrigin,
            redirectUri: oauthRequest.redirectUri,
            state: oauthRequest.state
          });
          window.parent.postMessage(
            {
              type: 'oauth:request',
              clientId: oauthRequest.clientId,
              redirectUri: oauthRequest.redirectUri,
              scope: oauthRequest.scope,
              state: oauthRequest.state
            },
            oauthRequest.parentOrigin
          );
        }

        postOAuthRequest();
        retryInterval = window.setInterval(postOAuthRequest, 500);
      }
    </script>
  </body>
</html>`,
    {
      headers: {
        'content-type': 'text/html; charset=utf-8'
      }
    }
  );
}
