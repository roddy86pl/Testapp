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

import * as React from "react";
import { useState, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  BackHandler,
  NativeModules,
  Alert,
} from "react-native";
import { LoginScreen } from "./screens/LoginScreen";
import { HomeScreen } from "./screens/HomeScreen";
import { LiveTVScreen } from "./screens/LiveTVScreen";
import { MoviesScreen } from "./screens/MoviesScreen";
import { SeriesScreen } from "./screens/SeriesScreen";
import { EpisodesScreen } from "./screens/EpisodesScreen";
import { MovieDetailsScreen } from "./screens/MovieDetailsScreen";
import { SeriesDetailsScreen } from "./screens/SeriesDetailsScreen";
import { AccountScreen } from "./screens/AccountScreen";
import { SettingsScreen } from "./screens/SettingsScreen";
import { PlayerScreen } from "./screens/PlayerScreen";
import { hashToDeviceCode, generateFallbackCode } from "./utils/deviceCode";
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
  UserInfo,
} from "./services/iptvApi";

const { DeviceInfo } = NativeModules;

type Screen =
  | "login"
  | "home"
  | "livetv"
  | "movies"
  | "series"
  | "episodes"
  | "moviedetails"
  | "seriesdetails"
  | "account"
  | "settings"
  | "player";

export const App: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<Screen>("login");
  const [deviceCode, setDeviceCode] = useState<string>("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // API client
  const [iptvApi, setIptvApi] = useState<IPTVApi | null>(null);

  // User data
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [serverUrl, setServerUrl] = useState("");
  const [userExpiry, setUserExpiry] = useState("");
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);

  // Live TV
  const [liveCategories, setLiveCategories] = useState<LiveCategory[]>([]);
  const [liveChannels, setLiveChannels] = useState<LiveChannel[]>([]);
  const [liveTvLoading, setLiveTvLoading] = useState(false);

  // Movies
  const [vodCategories, setVodCategories] = useState<VodCategory[]>([]);
  const [vodMovies, setVodMovies] = useState<VodMovie[]>([]);
  const [moviesLoading, setMoviesLoading] = useState(false);
  const [selectedMovie, setSelectedMovie] = useState<VodMovie | null>(null);

  // Series
  const [seriesCategories, setSeriesCategories] = useState<SeriesCategory[]>(
    []
  );
  const [seriesList, setSeriesList] = useState<SeriesInfo[]>([]);
  const [seriesLoading, setSeriesLoading] = useState(false);

  // Episodes
  const [selectedSeries, setSelectedSeries] = useState<SeriesInfo | null>(null);
  const [episodes, setEpisodes] = useState<Record<string, Episode[]>>({});
  const [episodesLoading, setEpisodesLoading] = useState(false);

  // Player
  const [playerStreamUrl, setPlayerStreamUrl] = useState("");
  const [playerTitle, setPlayerTitle] = useState("");

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
        console.log("Device code generation error:", error);
        setDeviceCode(generateFallbackCode());
      }
    };

    generateDeviceCode();
  }, []);

  // Handle Fire TV remote Back button
  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        if (currentScreen === "player") {
          // Player screen handles its own back button
          return false;
        } else if (currentScreen === "episodes") {
          setCurrentScreen("seriesdetails");
          return true;
        } else if (currentScreen === "moviedetails") {
          setCurrentScreen("movies");
          return true;
        } else if (currentScreen === "seriesdetails") {
          setCurrentScreen("series");
          return true;
        } else if (
          currentScreen === "account" ||
          currentScreen === "settings"
        ) {
          setCurrentScreen("home");
          return true;
        } else if (
          currentScreen === "livetv" ||
          currentScreen === "movies" ||
          currentScreen === "series"
        ) {
          setCurrentScreen("home");
          return true;
        } else if (currentScreen === "home") {
          Alert.alert("Wyjść z aplikacji?", "Czy na pewno chcesz wyjść?", [
            { text: "Nie", style: "cancel" },
            { text: "Tak", onPress: () => BackHandler.exitApp() },
          ]);
          return true;
        }
        return false;
      }
    );

    return () => backHandler.remove();
  }, [currentScreen]);

  // Load all categories when logged in
  const loadAllCategories = useCallback(async (api: IPTVApi) => {
    try {
      const [liveCategories, vodCategories, seriesCategories] =
        await Promise.all([
          api.getLiveCategories(),
          api.getVodCategories(),
          api.getSeriesCategories(),
        ]);

      setLiveCategories(liveCategories);
      setVodCategories(vodCategories);
      setSeriesCategories(seriesCategories);
    } catch (error) {
      console.error("Failed to load categories:", error);
    }
  }, []);

  // Handle device login
  const handleDeviceLogin = useCallback(async () => {
    try {
      const deviceApi = new DeviceCodeApi();
      const result = await deviceApi.checkDeviceCode(deviceCode);

      if (
        !result.success ||
        !result.serverUrl ||
        !result.username ||
        !result.password
      ) {
        Alert.alert(
          "Błąd",
          result.message || "Kod urządzenia nie został zarejestrowany"
        );
        return;
      }

      // Create API client and authenticate
      const api = new IPTVApi(
        result.serverUrl,
        result.username,
        result.password
      );
      const userInfo = await api.authenticate();

      setIptvApi(api);
      setServerUrl(result.serverUrl);
      setUsername(result.username);
      setPassword(result.password);
      setUserInfo(userInfo);
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

      setCurrentScreen("home");
    } catch (error) {
      console.error("Device login error:", error);
      Alert.alert("Błąd", "Nie udało się zalogować kodem urządzenia");
    }
  }, [deviceCode, loadAllCategories]);

  // Handle manual login with credentials
  const handleLogin = useCallback(
    async (url: string, user: string, pass: string) => {
      try {
        const api = new IPTVApi(url, user, pass);
        const userInfo = await api.authenticate();

        setIptvApi(api);
        setServerUrl(url);
        setUsername(user);
        setPassword(pass);
        setUserInfo(userInfo);
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

        setCurrentScreen("home");
      } catch (error) {
        console.error("Login error:", error);
        Alert.alert(
          "Błąd",
          "Nie udało się zalogować. Sprawdź dane i spróbuj ponownie."
        );
        throw error;
      }
    },
    [loadAllCategories]
  );

  // Navigation handlers
  const handleNavigateLiveTV = useCallback(async () => {
    setCurrentScreen("livetv");

    if (!iptvApi) {
      return;
    }

    // Load all channels if not loaded
    if (liveChannels.length === 0) {
      setLiveTvLoading(true);
      try {
        const streams = await iptvApi.getLiveStreams();
        setLiveChannels(streams);
      } catch (error) {
        console.error("Failed to load live channels:", error);
        Alert.alert("Błąd", "Nie udało się załadować kanałów");
      } finally {
        setLiveTvLoading(false);
      }
    }
  }, [iptvApi, liveChannels]);

  const handleLiveCategorySelect = useCallback(
    async (categoryId: string) => {
      if (!iptvApi) {
        return;
      }

      setLiveTvLoading(true);
      try {
        const streams = await iptvApi.getLiveStreams(categoryId);
        setLiveChannels(streams);
      } catch (error) {
        console.error("Failed to load category channels:", error);
        Alert.alert("Błąd", "Nie udało się załadować kanałów");
      } finally {
        setLiveTvLoading(false);
      }
    },
    [iptvApi]
  );

  const handleNavigateMovies = useCallback(async () => {
    setCurrentScreen("movies");

    if (!iptvApi) {
      return;
    }

    if (vodMovies.length === 0) {
      setMoviesLoading(true);
      try {
        const streams = await iptvApi.getVodStreams();
        setVodMovies(streams);
      } catch (error) {
        console.error("Failed to load movies:", error);
        Alert.alert("Błąd", "Nie udało się załadować filmów");
      } finally {
        setMoviesLoading(false);
      }
    }
  }, [iptvApi, vodMovies]);

  const handleMovieCategorySelect = useCallback(
    async (categoryId: string) => {
      if (!iptvApi) {
        return;
      }

      setMoviesLoading(true);
      try {
        const streams = await iptvApi.getVodStreams(categoryId);
        setVodMovies(streams);
      } catch (error) {
        console.error("Failed to load category movies:", error);
        Alert.alert("Błąd", "Nie udało się załadować filmów");
      } finally {
        setMoviesLoading(false);
      }
    },
    [iptvApi]
  );

  const handleSelectMovie = useCallback((movie: VodMovie) => {
    setSelectedMovie(movie);
    setCurrentScreen("moviedetails");
  }, []);

  const handlePlayMovie = useCallback(
    (movie: VodMovie) => {
      if (!iptvApi) {
        return;
      }
      const streamUrl = iptvApi.getVodStreamUrl(
        movie.stream_id,
        movie.container_extension
      );
      setPlayerStreamUrl(streamUrl);
      setPlayerTitle(movie.name);
      setCurrentScreen("player");
    },
    [iptvApi]
  );

  const handleNavigateSeries = useCallback(async () => {
    setCurrentScreen("series");

    if (!iptvApi) {
      return;
    }

    if (seriesList.length === 0) {
      setSeriesLoading(true);
      try {
        const series = await iptvApi.getSeries();
        setSeriesList(series);
      } catch (error) {
        console.error("Failed to load series:", error);
        Alert.alert("Błąd", "Nie udało się załadować seriali");
      } finally {
        setSeriesLoading(false);
      }
    }
  }, [iptvApi, seriesList]);

  const handleSeriesCategorySelect = useCallback(
    async (categoryId: string) => {
      if (!iptvApi) {
        return;
      }

      setSeriesLoading(true);
      try {
        const series = await iptvApi.getSeries(categoryId);
        setSeriesList(series);
      } catch (error) {
        console.error("Failed to load category series:", error);
        Alert.alert("Błąd", "Nie udało się załadować seriali");
      } finally {
        setSeriesLoading(false);
      }
    },
    [iptvApi]
  );

  const handleSelectSeries = useCallback((series: SeriesInfo) => {
    setSelectedSeries(series);
    setCurrentScreen("seriesdetails");
  }, []);

  const handleViewEpisodes = useCallback(
    async (series: SeriesInfo) => {
      if (!iptvApi) {
        return;
      }

      setSelectedSeries(series);
      setEpisodesLoading(true);

      try {
        const seriesData = await iptvApi.getSeriesInfo(series.series_id);
        setEpisodes(seriesData.episodes);
        setCurrentScreen("episodes");
      } catch (error) {
        console.error("Failed to load episodes:", error);
        Alert.alert("Błąd", "Nie udało się załadować odcinków");
      } finally {
        setEpisodesLoading(false);
      }
    },
    [iptvApi]
  );

  const handleSelectEpisode = useCallback(
    (episode: Episode) => {
      if (!iptvApi) {
        return;
      }
      const streamUrl = iptvApi.getSeriesStreamUrl(
        episode.id,
        episode.container_extension
      );
      setPlayerStreamUrl(streamUrl);
      setPlayerTitle(episode.title);
      setCurrentScreen("player");
    },
    [iptvApi]
  );

  const handleSelectChannel = useCallback(
    (channel: LiveChannel) => {
      if (!iptvApi) {
        return;
      }
      const streamUrl = iptvApi.getLiveStreamUrl(
        channel.stream_id,
        channel.stream_type
      );
      setPlayerStreamUrl(streamUrl);
      setPlayerTitle(channel.name);
      setCurrentScreen("player");
    },
    [iptvApi]
  );

  const handleNavigateAccount = useCallback(() => {
    setCurrentScreen("account");
  }, []);

  const handleNavigateSettings = useCallback(() => {
    setCurrentScreen("settings");
  }, []);

  const handleLogout = useCallback(() => {
    setIsLoggedIn(false);
    setIptvApi(null);
    setUserInfo(null);
    setUsername("");
    setPassword("");
    setServerUrl("");
    setUserExpiry("");
    setLiveCategories([]);
    setLiveChannels([]);
    setVodCategories([]);
    setVodMovies([]);
    setSeriesCategories([]);
    setSeriesList([]);
    setSelectedSeries(null);
    setEpisodes({});
    setCurrentScreen("login");
  }, []);

  const handleClearCache = useCallback(() => {
    // Clear cached data
    setLiveChannels([]);
    setVodMovies([]);
    setSeriesList([]);
    setEpisodes({});
    console.log("Cache cleared");
  }, []);

  const handleBackToHome = useCallback(() => {
    setCurrentScreen("home");
  }, []);

  return (
    <View style={styles.container}>
      {currentScreen === "login" && (
        <LoginScreen
          deviceCode={deviceCode}
          onLogin={handleLogin}
          onDeviceLogin={handleDeviceLogin}
        />
      )}
      {currentScreen === "home" && (
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
          onNavigateSettings={handleNavigateSettings}
        />
      )}
      {currentScreen === "livetv" && (
        <LiveTVScreen
          categories={liveCategories}
          channels={liveChannels}
          onSelectChannel={handleSelectChannel}
          onSelectCategory={handleLiveCategorySelect}
          onBack={handleBackToHome}
          loading={liveTvLoading}
        />
      )}
      {currentScreen === "movies" && (
        <MoviesScreen
          categories={vodCategories}
          movies={vodMovies}
          onSelectMovie={handleSelectMovie}
          onSelectCategory={handleMovieCategorySelect}
          onBack={handleBackToHome}
          loading={moviesLoading}
        />
      )}
      {currentScreen === "series" && (
        <SeriesScreen
          categories={seriesCategories}
          series={seriesList}
          onSelectSeries={handleSelectSeries}
          onSelectCategory={handleSeriesCategorySelect}
          onBack={handleBackToHome}
          loading={seriesLoading}
        />
      )}
      {currentScreen === "episodes" && selectedSeries && (
        <EpisodesScreen
          seriesInfo={selectedSeries}
          episodes={episodes}
          onSelectEpisode={handleSelectEpisode}
          onBack={() => setCurrentScreen("seriesdetails")}
          loading={episodesLoading}
        />
      )}
      {currentScreen === "moviedetails" && selectedMovie && (
        <MovieDetailsScreen
          movie={selectedMovie}
          onPlay={handlePlayMovie}
          onBack={() => setCurrentScreen("movies")}
        />
      )}
      {currentScreen === "seriesdetails" && selectedSeries && (
        <SeriesDetailsScreen
          series={selectedSeries}
          onViewEpisodes={handleViewEpisodes}
          onBack={() => setCurrentScreen("series")}
        />
      )}
      {currentScreen === "account" && userInfo && (
        <AccountScreen
          userInfo={userInfo}
          serverUrl={serverUrl}
          onLogout={handleLogout}
          onBack={handleBackToHome}
        />
      )}
      {currentScreen === "settings" && (
        <SettingsScreen
          onBack={handleBackToHome}
          onClearCache={handleClearCache}
        />
      )}
      {currentScreen === "player" && (
        <PlayerScreen
          streamUrl={playerStreamUrl}
          title={playerTitle}
          onBack={() => setCurrentScreen("home")}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0d1117",
  },
});

export default App;
