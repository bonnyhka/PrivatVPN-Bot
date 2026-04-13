import type { Metadata, Viewport } from 'next'
import './globals.css'
import Script from 'next/script'
import { TelegramProvider } from '@/components/providers/telegram-provider'

const _fontSans = "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif"

export const metadata: Metadata = {
  title: 'PrivatVPN - Telegram Mini App',
  description: 'Быстрый и безопасный VPN сервис через Telegram',
}

export const viewport: Viewport = {
  themeColor: '#132430',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ru">
      <head>
        <Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />
        <Script
          id="client-error-capture"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
                var sent = 0;
                var reloadCountKey = 'privatvpn_asset_reload_count_v2';
                var maxReloadAttempts = 3;
                function send(payload) {
                  if (sent > 20) return;
                  sent += 1;
                  try {
                    var body = JSON.stringify(payload);
                    if (navigator.sendBeacon) {
                      var blob = new Blob([body], { type: 'application/json' });
                      navigator.sendBeacon('/api/client-error', blob);
                      return;
                    }
                    fetch('/api/client-error', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: body,
                      keepalive: true,
                    }).catch(function () {});
                  } catch (e) {}
                }

                function isRecoverableAssetIssue(message, source, target) {
                  var text = String(message || '') + ' ' + String(source || '') + ' ' + String((target && (target.src || target.href || target.tagName)) || '');
                  text = text.toLowerCase();
                  return (
                    text.indexOf('asset load error') !== -1 ||
                    text.indexOf('chunkloaderror') !== -1 ||
                    text.indexOf('failed to fetch dynamically imported module') !== -1 ||
                    text.indexOf('failed to load module script') !== -1 ||
                    text.indexOf('/_next/static/') !== -1 ||
                    text.indexOf('middleware-manifest') !== -1
                  );
                }

                function tryRecoverFromAssetIssue() {
                  try {
                    var attempts = Number(sessionStorage.getItem(reloadCountKey) || '0');
                    if (!Number.isFinite(attempts)) attempts = 0;
                    if (attempts >= maxReloadAttempts) return;
                    sessionStorage.setItem(reloadCountKey, String(attempts + 1));

                    var nextUrl = new URL(location.href);
                    nextUrl.searchParams.set('__miniapp_reload', String(Date.now()));
                    nextUrl.searchParams.set('__miniapp_attempt', String(attempts + 1));
                    location.replace(nextUrl.toString());
                  } catch (e) {
                    try {
                      location.reload();
                    } catch (_) {}
                  }
                }

                try {
                  setTimeout(function () {
                    try { sessionStorage.removeItem(reloadCountKey); } catch (e) {}
                  }, 15000);
                } catch (e) {}

                window.addEventListener('error', function (event) {
                  var target = event && event.target;
                  var isAssetError = target && target !== window;
                  var message = isAssetError
                    ? ('Asset load error: ' + ((target.src || target.href || target.tagName || 'unknown')))
                    : String(event.message || 'Unknown window error');
                  var source = event.filename || (target && (target.src || target.href)) || null;
                  send({
                    type: isAssetError ? 'asset-error' : 'window-error',
                    message: message,
                    stack: event.error && event.error.stack ? String(event.error.stack) : null,
                    source: source,
                    lineno: event.lineno || null,
                    colno: event.colno || null,
                    href: location.href,
                    userAgent: navigator.userAgent,
                    timestamp: new Date().toISOString()
                  });

                  if (isRecoverableAssetIssue(message, source, target)) {
                    tryRecoverFromAssetIssue();
                  }
                }, true);

                window.addEventListener('unhandledrejection', function (event) {
                  var reason = event.reason;
                  var message = 'Unhandled promise rejection';
                  var stack = null;

                  if (typeof reason === 'string') {
                    message = reason;
                  } else if (reason && typeof reason === 'object') {
                    message = String(reason.message || reason.toString() || message);
                    stack = reason.stack ? String(reason.stack) : null;
                  }

                  send({
                    type: 'unhandledrejection',
                    message: message,
                    stack: stack,
                    source: null,
                    lineno: null,
                    colno: null,
                    href: location.href,
                    userAgent: navigator.userAgent,
                    timestamp: new Date().toISOString()
                  });

                  if (isRecoverableAssetIssue(message, null, null)) {
                    tryRecoverFromAssetIssue();
                  }
                });
              })();
            `,
          }}
        />
      </head>
      <body style={{ fontFamily: _fontSans }} className="antialiased">
        <TelegramProvider>
          {children}
        </TelegramProvider>
      </body>
    </html>
  )
}
