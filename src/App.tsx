/**
 * React Native App for Amazon Vega OS/Kepler
 * 
 * Native IPTV application for Fire TV
 * No WebView - Pure React Native components
 * 
 * Features:
 * - Native React Native UI
 * - Fire TV remote control support (D-PAD)
 * - Back button handling
 * - Device code generation
 * - IPTV player functionality
 */

import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { 
    View, 
    StyleSheet, 
    BackHandler,
    TVEventHandler,
    NativeModules,
    Alert,
} from 'react-native';
import { LoginScreen } from './screens/LoginScreen';
import { HomeScreen } from './screens/HomeScreen';
import { hashToDeviceCode, generateFallbackCode } from './utils/deviceCode';

const { DeviceInfo } = NativeModules;

type Screen = 'login' | 'home';

export const App: React.FC = () => {
    const [currentScreen, setCurrentScreen] = useState<Screen>('login');
    const [deviceCode, setDeviceCode] = useState<string>('');
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    
    // User data
    const [username, setUsername] = useState('');
    const [serverUrl, setServerUrl] = useState('');
    const [userExpiry, setUserExpiry] = useState('');
    
    // Content counts
    const [liveTvCount, setLiveTvCount] = useState(0);
    const [moviesCount, setMoviesCount] = useState(0);
    const [seriesCount, setSeriesCount] = useState(0);

    // Generate device code on mount
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

    // Handle Fire TV remote Back button
    useEffect(() => {
        const backHandler = BackHandler.addEventListener(
            'hardwareBackPress',
            () => {
                if (currentScreen === 'home') {
                    Alert.alert(
                        'Wyjść z aplikacji?',
                        'Czy na pewno chcesz wyjść?',
                        [
                            { text: 'Nie', style: 'cancel' },
                            { text: 'Tak', onPress: () => BackHandler.exitApp() },
                        ]
                    );
                    return true;
                }
                return false;
            }
        );

        return () => backHandler.remove();
    }, [currentScreen]);

    // Handle TV D-PAD events
    useEffect(() => {
        const tvEventHandler = new TVEventHandler();
        
        tvEventHandler.enable(undefined, (cmp, evt) => {
            if (evt && evt.eventType) {
                console.log('TV Event:', evt.eventType);
                // D-PAD events are handled by focusable components
            }
        });

        return () => tvEventHandler.disable();
    }, []);

    // Handle device login
    const handleDeviceLogin = useCallback(async () => {
        // TODO: Implement API call to check device code
        // For now, simulate successful login
        console.log('Device login with code:', deviceCode);
        
        // Simulate API response
        setTimeout(() => {
            setIsLoggedIn(true);
            setUsername('Test User');
            setUserExpiry('Ważne do: 2025-12-31');
            setLiveTvCount(150);
            setMoviesCount(500);
            setSeriesCount(200);
            setCurrentScreen('home');
        }, 1000);
    }, [deviceCode]);

    // Handle manual login with credentials
    const handleLogin = useCallback(async (
        url: string,
        user: string,
        pass: string
    ) => {
        // TODO: Implement API call to authenticate
        console.log('Login:', url, user);
        
        setServerUrl(url);
        setUsername(user);
        
        // Simulate API response
        setTimeout(() => {
            setIsLoggedIn(true);
            setUserExpiry('Ważne do: 2025-12-31');
            setLiveTvCount(150);
            setMoviesCount(500);
            setSeriesCount(200);
            setCurrentScreen('home');
        }, 1000);
    }, []);

    // Navigation handlers
    const handleNavigateLiveTV = useCallback(() => {
        console.log('Navigate to Live TV');
        Alert.alert('Live TV', 'Lista kanałów będzie dostępna wkrótce');
    }, []);

    const handleNavigateMovies = useCallback(() => {
        console.log('Navigate to Movies');
        Alert.alert('Filmy', 'Lista filmów będzie dostępna wkrótce');
    }, []);

    const handleNavigateSeries = useCallback(() => {
        console.log('Navigate to Series');
        Alert.alert('Seriale', 'Lista seriali będzie dostępna wkrótce');
    }, []);

    const handleNavigateAccount = useCallback(() => {
        console.log('Navigate to Account');
        Alert.alert('Konto', 'Ustawienia konta będą dostępne wkrótce');
    }, []);

    return (
        <View style={styles.container}>
            {currentScreen === 'login' && (
                <LoginScreen
                    deviceCode={deviceCode}
                    onLogin={handleLogin}
                    onDeviceLogin={handleDeviceLogin}
                />
            )}
            {currentScreen === 'home' && (
                <HomeScreen
                    username={username}
                    expiry={userExpiry}
                    liveTvCount={liveTvCount}
                    moviesCount={moviesCount}
                    seriesCount={seriesCount}
                    onNavigateLiveTV={handleNavigateLiveTV}
                    onNavigateMovies={handleNavigateMovies}
                    onNavigateSeries={handleNavigateSeries}
                    onNavigateAccount={handleNavigateAccount}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0d1117',
    },
});

export default App;
