import React, { useEffect, useMemo, useRef } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import WebView from 'react-native-webview';

type HcaptchaMessage =
  | { type: 'token'; token: string }
  | { type: 'error'; message: string }
  | { type: 'expired' };

type Props = {
  siteKey: string;
  onToken: (token: string) => void;
  onError?: (message: string) => void;
  onExpire?: () => void;
  resetSignal?: number;
};

export default function HcaptchaWidget({
  siteKey,
  onToken,
  onError,
  onExpire,
  resetSignal,
}: Props) {
  const webRef = useRef<WebView>(null);

  useEffect(() => {
    if (!webRef.current) return;
    if (typeof resetSignal === 'number') {
      webRef.current.injectJavaScript('try{hcaptcha.reset();}catch(e){};true;');
    }
  }, [resetSignal]);

  const html = useMemo(
    () => `<!doctype html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <style>
      html, body { margin: 0; padding: 0; background: transparent; }
      #container { display:flex; justify-content:center; align-items:center; height: 100%; }
    </style>
    <script src="https://js.hcaptcha.com/1/api.js" async defer></script>
    <script>
      function onSuccess(token) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'token', token }));
      }
      function onError() {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'error', message: 'Captcha failed to load.' }));
      }
      function onExpire() {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'expired' }));
      }
    </script>
  </head>
  <body>
    <div id="container">
      <div class="h-captcha"
        data-sitekey="${siteKey}"
        data-callback="onSuccess"
        data-error-callback="onError"
        data-expired-callback="onExpire"
      ></div>
    </div>
  </body>
</html>`,
    [siteKey]
  );

  return (
    <View style={styles.wrapper}>
      <WebView
        ref={webRef}
        originWhitelist={['*']}
        source={{ html, baseUrl: Platform.OS === 'android' ? 'https://localhost' : '' }}
        javaScriptEnabled
        domStorageEnabled
        onMessage={(event) => {
          try {
            const msg = JSON.parse(event.nativeEvent.data) as HcaptchaMessage;
            if (msg.type === 'token') onToken(msg.token);
            if (msg.type === 'error') onError?.(msg.message);
            if (msg.type === 'expired') onExpire?.();
          } catch (e) {
            onError?.('Captcha failed to load.');
          }
        }}
        style={styles.webview}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    height: 130,
    width: '100%',
    overflow: 'hidden',
    borderRadius: 12,
  },
  webview: {
    backgroundColor: 'transparent',
  },
});
