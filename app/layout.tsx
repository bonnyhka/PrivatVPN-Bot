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

                window.addEventListener('error', function (event) {
                  var target = event && event.target;
                  var isAssetError = target && target !== window;
                  send({
                    type: isAssetError ? 'asset-error' : 'window-error',
                    message: isAssetError
                      ? ('Asset load error: ' + ((target.src || target.href || target.tagName || 'unknown')))
                      : String(event.message || 'Unknown window error'),
                    stack: event.error && event.error.stack ? String(event.error.stack) : null,
                    source: event.filename || (target && (target.src || target.href)) || null,
                    lineno: event.lineno || null,
                    colno: event.colno || null,
                    href: location.href,
                    userAgent: navigator.userAgent,
                    timestamp: new Date().toISOString()
                  });
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
