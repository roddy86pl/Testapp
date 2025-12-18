/**
 * PolFun Box - Main Application Component for Vega OS
 * 
 * Używa WebView do wyświetlania aplikacji webowej IPTV
 * Wspiera:
 * - Nawigację D-PAD pilotem Fire TV
 * - Odtwarzanie wideo HLS/DASH
 * - DRM (Widevine/PlayReady)
 */

import { WebView, WebViewMessageEvent } from '@amazon-devices/webview';
import * as React from 'react';
import { useRef, useState, useCallback, useEffect } from 'react';
import { 
    View, 
    StyleSheet, 
    BackHandler, 
    Platform,
    TVEventHandler,
    NativeModules
} from 'react-native';

// Pobierz informacje o urządzeniu Vega (jeśli dostępne)
const { DeviceInfo } = NativeModules;

// URL do aplikacji webowej - może być lokalny lub zdalny
const WEB_APP_URL = 'file:///android_asset/web/index.html';
// Alternatywnie dla wersji hosted:
// const WEB_APP_URL = 'https://app.polfun.de/vega/';

export const App: React.FC = () => {
    const webViewRef = useRef<WebView>(null);
    const [canGoBack, setCanGoBack] = useState(false);
    const [deviceCode, setDeviceCode] = useState<string>('');

    // Generowanie kodu urządzenia dla Vega OS
    useEffect(() => {
        const generateDeviceCode = async () => {
            try {
                // Próba pobrania unikalnego ID urządzenia z Vega API
                if (DeviceInfo && DeviceInfo.getUniqueId) {
                    const uniqueId = await DeviceInfo.getUniqueId();
                    const code = hashToDeviceCode(uniqueId);
                    setDeviceCode(code);
                } else {
                    // Fallback - generuj na podstawie timestamp
                    const fallbackCode = generateFallbackCode();
                    setDeviceCode(fallbackCode);
                }
            } catch (error) {
                console.log('Device code generation error:', error);
                setDeviceCode(generateFallbackCode());
            }
        };
        
        generateDeviceCode();
    }, []);

    // Konwersja ID na 8-znakowy kod
    const hashToDeviceCode = (input: string): string => {
        let hash = 0;
        for (let i = 0; i < input.length; i++) {
            hash = ((hash << 5) - hash) + input.charCodeAt(i);
            hash = hash & hash;
        }
        
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code = '';
        let num = Math.abs(hash);
        
        for (let j = 0; j < 8; j++) {
            code += chars[num % chars.length];
            num = Math.floor(num / chars.length) + (j * 7);
        }
        
        return code;
    };

    // Generowanie fallback kodu
    const generateFallbackCode = (): string => {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code = '';
        for (let i = 0; i < 8; i++) {
            code += chars[Math.floor(Math.random() * chars.length)];
        }
        return code;
    };

    // Obsługa przycisku Back na pilocie Fire TV
    useEffect(() => {
        const backHandler = BackHandler.addEventListener(
            'hardwareBackPress',
            () => {
                if (canGoBack && webViewRef.current) {
                    // Wyślij wiadomość do WebView o naciśnięciu Back
                    webViewRef.current.postMessage(JSON.stringify({
                        type: 'BACK_PRESSED'
                    }));
                    return true; // Zapobiegaj domyślnej akcji
                }
                return false; // Pozwól systemowi obsłużyć (zamknij aplikację)
            }
        );

        return () => backHandler.remove();
    }, [canGoBack]);

    // Obsługa zdarzeń TV (D-PAD)
    useEffect(() => {
        const tvEventHandler = new TVEventHandler();
        
        tvEventHandler.enable(undefined, (cmp, evt) => {
            if (evt && evt.eventType) {
                // Przekazujemy zdarzenia TV do WebView
                if (webViewRef.current) {
                    webViewRef.current.postMessage(JSON.stringify({
                        type: 'TV_EVENT',
                        eventType: evt.eventType,
                        eventKeyAction: evt.eventKeyAction
                    }));
                }
            }
        });

        return () => tvEventHandler.disable();
    }, []);

    // Obsługa wiadomości z WebView
    const handleMessage = useCallback((event: WebViewMessageEvent) => {
        try {
            const data = JSON.parse(event.nativeEvent.data);
            
            switch (data.type) {
                case 'NAVIGATION_STATE':
                    setCanGoBack(data.canGoBack);
                    break;
                    
                case 'EXIT_APP':
                    BackHandler.exitApp();
                    break;
                    
                case 'GET_DEVICE_INFO':
                    // Wyślij informacje o urządzeniu do WebView
                    webViewRef.current?.postMessage(JSON.stringify({
                        type: 'DEVICE_INFO',
                        deviceCode: deviceCode,
                        platform: 'VegaOS',
                        brand: 'Amazon Fire TV'
                    }));
                    break;
                    
                case 'LOG':
                    console.log('[WebView]', data.message);
                    break;
                    
                default:
                    console.log('Unknown message type:', data.type);
            }
        } catch (error) {
            console.log('Message parse error:', error);
        }
    }, [deviceCode]);

    // JavaScript do wstrzyknięcia w WebView
    const injectedJavaScript = `
        (function() {
            // Oznacz platformę jako VegaOS
            window.VEGA_OS = true;
            window.PLATFORM = 'VegaOS';
            window.DEVICE_CODE = '${deviceCode}';
            
            // Nadpisz wykrywanie platformy
            window.isVegaOS = function() { return true; };
            window.isTizenOS = function() { return false; };
            
            // Komunikacja z React Native
            window.postToNative = function(data) {
                if (window.ReactNativeWebView) {
                    window.ReactNativeWebView.postMessage(JSON.stringify(data));
                }
            };
            
            // Informuj o możliwości cofania
            window.updateNavigationState = function(canGoBack) {
                window.postToNative({
                    type: 'NAVIGATION_STATE',
                    canGoBack: canGoBack
                });
            };
            
            // Nasłuchuj na wiadomości z React Native
            window.addEventListener('message', function(event) {
                try {
                    var data = JSON.parse(event.data);
                    
                    if (data.type === 'BACK_PRESSED') {
                        // Wywołaj funkcję handleBackButton jeśli istnieje
                        if (typeof window.handleBackButton === 'function') {
                            window.handleBackButton();
                        } else {
                            // Domyślna obsługa - wróć do poprzedniego ekranu
                            if (window.history.length > 1) {
                                window.history.back();
                            }
                        }
                    }
                    
                    if (data.type === 'DEVICE_INFO') {
                        window.DEVICE_CODE = data.deviceCode;
                        window.PLATFORM = data.platform;
                        window.DEVICE_BRAND = data.brand;
                        
                        // Wywołaj callback jeśli istnieje
                        if (typeof window.onDeviceInfoReceived === 'function') {
                            window.onDeviceInfoReceived(data);
                        }
                    }
                    
                    if (data.type === 'TV_EVENT') {
                        // Przekształć zdarzenie TV na KeyboardEvent
                        var keyMap = {
                            'up': 38,
                            'down': 40,
                            'left': 37,
                            'right': 39,
                            'select': 13,
                            'playPause': 10252,
                            'play': 415,
                            'pause': 19,
                            'stop': 413,
                            'rewind': 412,
                            'fastForward': 417
                        };
                        
                        var keyCode = keyMap[data.eventType];
                        if (keyCode) {
                            var event = new KeyboardEvent('keydown', {
                                keyCode: keyCode,
                                which: keyCode,
                                bubbles: true
                            });
                            document.dispatchEvent(event);
                        }
                    }
                } catch (e) {
                    console.log('Message parse error:', e);
                }
            });
            
            // Poproś o informacje o urządzeniu
            setTimeout(function() {
                window.postToNative({ type: 'GET_DEVICE_INFO' });
            }, 100);
            
            console.log('PolFun Box - VegaOS bridge initialized');
        })();
        true;
    `;

    // Obsługa błędów ładowania WebView
    const handleError = (syntheticEvent: any) => {
        const { nativeEvent } = syntheticEvent;
        console.error('WebView error:', nativeEvent);
    };

    // Obsługa zakończenia ładowania
    const handleLoad = () => {
        console.log('WebView loaded successfully');
        
        // Wyślij informacje o urządzeniu po załadowaniu
        if (deviceCode) {
            webViewRef.current?.postMessage(JSON.stringify({
                type: 'DEVICE_INFO',
                deviceCode: deviceCode,
                platform: 'VegaOS',
                brand: 'Amazon Fire TV'
            }));
        }
    };

    return (
        <View style={styles.container}>
            <WebView
                ref={webViewRef}
                hasTVPreferredFocus={true}
                source={{ uri: WEB_APP_URL }}
                style={styles.webview}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                mediaPlaybackRequiresUserAction={false}
                allowsInlineMediaPlayback={true}
                mixedContentMode="always"
                injectedJavaScript={injectedJavaScript}
                onMessage={handleMessage}
                onError={handleError}
                onLoad={handleLoad}
                onLoadStart={(event) => {
                    console.log('Loading:', event.nativeEvent.url);
                }}
                onLoadEnd={() => {
                    console.log('Load complete');
                }}
                // Ważne dla wideo
                allowsFullscreenVideo={true}
                // Cache dla lepszej wydajności
                cacheEnabled={true}
                // Wyłącz zoom
                scalesPageToFit={false}
                // User agent dla identyfikacji
                userAgent="Mozilla/5.0 (Linux; VegaOS; Fire TV Stick) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 PolFunBox/1.0"
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0d1117',
    },
    webview: {
        flex: 1,
        backgroundColor: '#0d1117',
    },
});

export default App;
