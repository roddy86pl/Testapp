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
 * - IPTV player functionality with API integration
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
import { LiveTVScreen } from './screens/LiveTVScreen';
import { MoviesScreen } from './screens/MoviesScreen';
import { SeriesScreen } from './screens/SeriesScreen';
import { EpisodesScreen } from './screens/EpisodesScreen';
import { hashToDeviceCode, generateFallbackCode } from './utils/deviceCode';
import { 
    IPTVApi, 
    DeviceCodeApi,
    LiveCategory,
    LiveChannel,
    VodCategory,
    VodMovie,
    SeriesCategory,
    SeriesInfo,
    Episode,
} from './services/iptvApi';

const { DeviceInfo } = NativeModules;

type Screen = 'login' | 'home' | 'livetv' | 'movies' | 'series' | 'episodes';

export const App: React.FC = () => {
    const [currentScreen, setCurrentScreen] = useState<Screen>('login');
    const [deviceCode, setDeviceCode] = useState<string>('');
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    
    // API client
    const [iptvApi, setIptvApi] = useState<IPTVApi | null>(null);
    
    // User data
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [serverUrl, setServerUrl] = useState('');
    const [userExpiry, setUserExpiry] = useState('');
    
    // Live TV
    const [liveCategories, setLiveCategories] = useState<LiveCategory[]>([]);
    const [liveChannels, setLiveChannels] = useState<LiveChannel[]>([]);
    const [liveTvLoading, setLiveTvLoading] = useState(false);
    
    // Movies
    const [vodCategories, setVodCategories] = useState<VodCategory[]>([]);
    const [vodMovies, setVodMovies] = useState<VodMovie[]>([]);
    const [moviesLoading, setMoviesLoading] = useState(false);
    
    // Series
    const [seriesCategories, setSeriesCategories] = useState<SeriesCategory[]>([]);
    const [seriesList, setSeriesList] = useState<SeriesInfo[]>([]);
    const [seriesLoading, setSeriesLoading] = useState(false);
    
    // Episodes
    const [selectedSeries, setSelectedSeries] = useState<SeriesInfo | null>(null);
    const [episodes, setEpisodes] = useState<Record<string, Episode[]>>({});
    const [episodesLoading, setEpisodesLoading] = useState(false);

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
                if (currentScreen === 'episodes') {
                    setCurrentScreen('series');
                    return true;
                } else if (currentScreen === 'livetv' || currentScreen === 'movies' || currentScreen === 'series') {
                    setCurrentScreen('home');
                    return true;
                } else if (currentScreen === 'home') {
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
            }
        });

        return () => tvEventHandler.disable();
    }, []);

    // Load all categories when logged in
    const loadAllCategories = useCallback(async (api: IPTVApi) => {
        try {
            const [liveCategories, vodCategories, seriesCategories] = await Promise.all([
                api.getLiveCategories(),
                api.getVodCategories(),
                api.getSeriesCategories(),
            ]);
            
            setLiveCategories(liveCategories);
            setVodCategories(vodCategories);
            setSeriesCategories(seriesCategories);
        } catch (error) {
            console.error('Failed to load categories:', error);
        }
    }, []);

    // Handle device login
    const handleDeviceLogin = useCallback(async () => {
        try {
            const deviceApi = new DeviceCodeApi();
            const result = await deviceApi.checkDeviceCode(deviceCode);
            
            if (!result.success || !result.serverUrl || !result.username || !result.password) {
                Alert.alert('Błąd', result.message || 'Kod urządzenia nie został zarejestrowany');
                return;
            }
            
            // Create API client and authenticate
            const api = new IPTVApi(result.serverUrl, result.username, result.password);
            const userInfo = await api.authenticate();
            
            setIptvApi(api);
            setServerUrl(result.serverUrl);
            setUsername(result.username);
            setPassword(result.password);
            setUserExpiry(`Ważne do: ${userInfo.exp_date}`);
            setIsLoggedIn(true);
            
            // Load categories
            await loadAllCategories(api);
            
            // Load initial counts
            const [liveStreams, vodStreams, series] = await Promise.all([
                api.getLiveStreams(),
                api.getVodStreams(),
                api.getSeries(),
            ]);
            
            setLiveChannels(liveStreams);
            setVodMovies(vodStreams);
            setSeriesList(series);
            
            setCurrentScreen('home');
        } catch (error) {
            console.error('Device login error:', error);
            Alert.alert('Błąd', 'Nie udało się zalogować kodem urządzenia');
        }
    }, [deviceCode, loadAllCategories]);

    // Handle manual login with credentials
    const handleLogin = useCallback(async (
        url: string,
        user: string,
        pass: string
    ) => {
        try {
            const api = new IPTVApi(url, user, pass);
            const userInfo = await api.authenticate();
            
            setIptvApi(api);
            setServerUrl(url);
            setUsername(user);
            setPassword(pass);
            setUserExpiry(`Ważne do: ${userInfo.exp_date}`);
            setIsLoggedIn(true);
            
            // Load categories
            await loadAllCategories(api);
            
            // Load initial counts
            const [liveStreams, vodStreams, series] = await Promise.all([
                api.getLiveStreams(),
                api.getVodStreams(),
                api.getSeries(),
            ]);
            
            setLiveChannels(liveStreams);
            setVodMovies(vodStreams);
            setSeriesList(series);
            
            setCurrentScreen('home');
        } catch (error) {
            console.error('Login error:', error);
            Alert.alert('Błąd', 'Nie udało się zalogować. Sprawdź dane i spróbuj ponownie.');
            throw error;
        }
    }, [loadAllCategories]);

    // Navigation handlers
    const handleNavigateLiveTV = useCallback(async () => {
        setCurrentScreen('livetv');
        
        if (!iptvApi) return;
        
        // Load all channels if not loaded
        if (liveChannels.length === 0) {
            setLiveTvLoading(true);
            try {
                const streams = await iptvApi.getLiveStreams();
                setLiveChannels(streams);
            } catch (error) {
                console.error('Failed to load live channels:', error);
                Alert.alert('Błąd', 'Nie udało się załadować kanałów');
            } finally {
                setLiveTvLoading(false);
            }
        }
    }, [iptvApi, liveChannels]);

    const handleLiveCategorySelect = useCallback(async (categoryId: string) => {
        if (!iptvApi) return;
        
        setLiveTvLoading(true);
        try {
            const streams = await iptvApi.getLiveStreams(categoryId);
            setLiveChannels(streams);
        } catch (error) {
            console.error('Failed to load category channels:', error);
            Alert.alert('Błąd', 'Nie udało się załadować kanałów');
        } finally {
            setLiveTvLoading(false);
        }
    }, [iptvApi]);

    const handleSelectChannel = useCallback((channel: LiveChannel) => {
        if (!iptvApi) return;
        const streamUrl = iptvApi.getLiveStreamUrl(channel.stream_id, channel.stream_type);
        Alert.alert('Kanał', `Odtwarzanie: ${channel.name}\n${streamUrl}`);
        // TODO: Implement video player
    }, [iptvApi]);

    const handleNavigateMovies = useCallback(async () => {
        setCurrentScreen('movies');
        
        if (!iptvApi) return;
        
        if (vodMovies.length === 0) {
            setMoviesLoading(true);
            try {
                const streams = await iptvApi.getVodStreams();
                setVodMovies(streams);
            } catch (error) {
                console.error('Failed to load movies:', error);
                Alert.alert('Błąd', 'Nie udało się załadować filmów');
            } finally {
                setMoviesLoading(false);
            }
        }
    }, [iptvApi, vodMovies]);

    const handleMovieCategorySelect = useCallback(async (categoryId: string) => {
        if (!iptvApi) return;
        
        setMoviesLoading(true);
        try {
            const streams = await iptvApi.getVodStreams(categoryId);
            setVodMovies(streams);
        } catch (error) {
            console.error('Failed to load category movies:', error);
            Alert.alert('Błąd', 'Nie udało się załadować filmów');
        } finally {
            setMoviesLoading(false);
        }
    }, [iptvApi]);

    const handleSelectMovie = useCallback((movie: VodMovie) => {
        if (!iptvApi) return;
        const streamUrl = iptvApi.getVodStreamUrl(movie.stream_id, movie.container_extension);
        Alert.alert('Film', `Odtwarzanie: ${movie.name}\n${streamUrl}`);
        // TODO: Implement video player
    }, [iptvApi]);

    const handleNavigateSeries = useCallback(async () => {
        setCurrentScreen('series');
        
        if (!iptvApi) return;
        
        if (seriesList.length === 0) {
            setSeriesLoading(true);
            try {
                const series = await iptvApi.getSeries();
                setSeriesList(series);
            } catch (error) {
                console.error('Failed to load series:', error);
                Alert.alert('Błąd', 'Nie udało się załadować seriali');
            } finally {
                setSeriesLoading(false);
            }
        }
    }, [iptvApi, seriesList]);

    const handleSeriesCategorySelect = useCallback(async (categoryId: string) => {
        if (!iptvApi) return;
        
        setSeriesLoading(true);
        try {
            const series = await iptvApi.getSeries(categoryId);
            setSeriesList(series);
        } catch (error) {
            console.error('Failed to load category series:', error);
            Alert.alert('Błąd', 'Nie udało się załadować seriali');
        } finally {
            setSeriesLoading(false);
        }
    }, [iptvApi]);

    const handleSelectSeries = useCallback(async (series: SeriesInfo) => {
        if (!iptvApi) return;
        
        setSelectedSeries(series);
        setEpisodesLoading(true);
        
        try {
            const seriesData = await iptvApi.getSeriesInfo(series.series_id);
            setEpisodes(seriesData.episodes);
            setCurrentScreen('episodes');
        } catch (error) {
            console.error('Failed to load episodes:', error);
            Alert.alert('Błąd', 'Nie udało się załadować odcinków');
        } finally {
            setEpisodesLoading(false);
        }
    }, [iptvApi]);

    const handleSelectEpisode = useCallback((episode: Episode) => {
        if (!iptvApi) return;
        const streamUrl = iptvApi.getSeriesStreamUrl(episode.id, episode.container_extension);
        Alert.alert('Odcinek', `Odtwarzanie: ${episode.title}\n${streamUrl}`);
        // TODO: Implement video player
    }, [iptvApi]);

    const handleNavigateAccount = useCallback(() => {
        Alert.alert('Konto', `Użytkownik: ${username}\n${userExpiry}\nSerwer: ${serverUrl}`);
    }, [username, userExpiry, serverUrl]);

    const handleBackToHome = useCallback(() => {
        setCurrentScreen('home');
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
                    liveTvCount={liveChannels.length}
                    moviesCount={vodMovies.length}
                    seriesCount={seriesList.length}
                    onNavigateLiveTV={handleNavigateLiveTV}
                    onNavigateMovies={handleNavigateMovies}
                    onNavigateSeries={handleNavigateSeries}
                    onNavigateAccount={handleNavigateAccount}
                />
            )}
            {currentScreen === 'livetv' && (
                <LiveTVScreen
                    categories={liveCategories}
                    channels={liveChannels}
                    onSelectChannel={handleSelectChannel}
                    onSelectCategory={handleLiveCategorySelect}
                    onBack={handleBackToHome}
                    loading={liveTvLoading}
                />
            )}
            {currentScreen === 'movies' && (
                <MoviesScreen
                    categories={vodCategories}
                    movies={vodMovies}
                    onSelectMovie={handleSelectMovie}
                    onSelectCategory={handleMovieCategorySelect}
                    onBack={handleBackToHome}
                    loading={moviesLoading}
                />
            )}
            {currentScreen === 'series' && (
                <SeriesScreen
                    categories={seriesCategories}
                    series={seriesList}
                    onSelectSeries={handleSelectSeries}
                    onSelectCategory={handleSeriesCategorySelect}
                    onBack={handleBackToHome}
                    loading={seriesLoading}
                />
            )}
            {currentScreen === 'episodes' && selectedSeries && (
                <EpisodesScreen
                    seriesInfo={selectedSeries}
                    episodes={episodes}
                    onSelectEpisode={handleSelectEpisode}
                    onBack={() => setCurrentScreen('series')}
                    loading={episodesLoading}
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
