/**
 * React Native App for Amazon Vega OS/Kepler
 * 
 * WebView wrapper for HTML/JavaScript IPTV application
 * Loads the application from index.html and scripts.js
 * 
 * Features:
 * - WebView for displaying HTML/JS app
 * - Fire TV remote control support (D-PAD)
 * - Back button handling
 * - Vega OS bridge for device information
 */

import { WebView, WebViewMessageEvent } from '@amazon-devices/webview';
import * as React from 'react';
import { useRef, useState, useCallback, useEffect } from 'react';
import { 
    View, 
    StyleSheet, 
    BackHandler,
    TVEventHandler,
    NativeModules
} from 'react-native';

// Get Vega device information (if available)
const { DeviceInfo } = NativeModules;

export const App: React.FC = () => {
    const webViewRef = useRef<WebView>(null);
    const [canGoBack, setCanGoBack] = useState(false);
    const [deviceCode, setDeviceCode] = useState<string>('');

    // Generate device code for Vega OS
    useEffect(() => {
        const generateDeviceCode = async () => {
            try {
                if (DeviceInfo && DeviceInfo.getUniqueId) {
                    const uniqueId = await DeviceInfo.getUniqueId();
                    const code = hashToDeviceCode(uniqueId);
                    setDeviceCode(code);
                } else {
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

    // Convert ID to 8-character code
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

    // Generate fallback code
    const generateFallbackCode = (): string => {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code = '';
        for (let i = 0; i < 8; i++) {
            code += chars[Math.floor(Math.random() * chars.length)];
        }
        return code;
    };

    // Handle Fire TV remote Back button
    useEffect(() => {
        const backHandler = BackHandler.addEventListener(
            'hardwareBackPress',
            () => {
                if (canGoBack && webViewRef.current) {
                    webViewRef.current.postMessage(JSON.stringify({
                        type: 'BACK_PRESSED'
                    }));
                    return true;
                }
                return false;
            }
        );

        return () => backHandler.remove();
    }, [canGoBack]);

    // Handle TV D-PAD events
    useEffect(() => {
        const tvEventHandler = new TVEventHandler();
        
        tvEventHandler.enable(undefined, (cmp, evt) => {
            if (evt && evt.eventType) {
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

    // Handle messages from WebView
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

    // JavaScript to inject into WebView
    const injectedJavaScript = `
        (function() {
            window.VEGA_OS = true;
            window.PLATFORM = 'VegaOS';
            window.DEVICE_CODE = '${deviceCode}';
            
            window.isVegaOS = function() { return true; };
            window.isTizenOS = function() { return false; };
            
            window.postToNative = function(data) {
                if (window.ReactNativeWebView) {
                    window.ReactNativeWebView.postMessage(JSON.stringify(data));
                }
            };
            
            window.updateNavigationState = function(canGoBack) {
                window.postToNative({
                    type: 'NAVIGATION_STATE',
                    canGoBack: canGoBack
                });
            };
            
            window.addEventListener('message', function(event) {
                try {
                    var data = JSON.parse(event.data);
                    
                    if (data.type === 'BACK_PRESSED') {
                        if (typeof window.handleBackButton === 'function') {
                            window.handleBackButton();
                        } else if (window.history.length > 1) {
                            window.history.back();
                        }
                    }
                    
                    if (data.type === 'DEVICE_INFO') {
                        window.DEVICE_CODE = data.deviceCode;
                        window.PLATFORM = data.platform;
                        window.DEVICE_BRAND = data.brand;
                        
                        if (typeof window.onDeviceInfoReceived === 'function') {
                            window.onDeviceInfoReceived(data);
                        }
                    }
                    
                    if (data.type === 'TV_EVENT') {
                        var keyMap = {
                            'up': 38, 'down': 40, 'left': 37, 'right': 39,
                            'select': 13, 'playPause': 10252, 'play': 415,
                            'pause': 19, 'stop': 413, 'rewind': 412, 'fastForward': 417
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
            
            setTimeout(function() {
                window.postToNative({ type: 'GET_DEVICE_INFO' });
            }, 100);
            
            console.log('Vega OS bridge initialized');
        })();
        true;
    `;

    const handleLoad = () => {
        console.log('WebView loaded successfully');
        
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
                source={{ uri: 'file:///android_asset/web/index.html' }}
                style={styles.webview}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                mediaPlaybackRequiresUserAction={false}
                allowsInlineMediaPlayback={true}
                mixedContentMode="always"
                injectedJavaScript={injectedJavaScript}
                onMessage={handleMessage}
                onLoad={handleLoad}
                allowsFullscreenVideo={true}
                cacheEnabled={true}
                scalesPageToFit={false}
                userAgent="Mozilla/5.0 (Linux; VegaOS; Fire TV Stick) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
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
