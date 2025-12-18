/**
 * Home Screen for Vega OS IPTV App
 * Main menu with Live TV, Movies, Series options
 */

import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';
import {APP_NAME} from '../utils/constants';

interface HomeScreenProps {
  username: string;
  expiry: string;
  liveTvCount: number;
  moviesCount: number;
  seriesCount: number;
  onNavigateLiveTV: () => void;
  onNavigateMovies: () => void;
  onNavigateSeries: () => void;
  onNavigateAccount: () => void;
  onNavigateSettings?: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  username,
  expiry,
  liveTvCount,
  moviesCount,
  seriesCount,
  onNavigateLiveTV,
  onNavigateMovies,
  onNavigateSeries,
  onNavigateAccount,
  onNavigateSettings,
}) => {
  const currentTime = new Date().toLocaleTimeString('pl-PL', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.clock}>{currentTime}</Text>

        <View style={styles.logoContainer}>
          <View style={styles.logoIcon}>
            <Text style={styles.logoIconText}>▶</Text>
          </View>
          <Text style={styles.logoText}>
            {APP_NAME} <Text style={styles.logoBox}>Box</Text>
          </Text>
        </View>

        <View style={styles.userInfo}>
          <Text style={styles.username}>{username}</Text>
          <Text style={styles.expiry}>{expiry}</Text>
        </View>
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        {/* Live TV - Large Card */}
        <TouchableOpacity
          style={[styles.card, styles.cardLarge]}
          onPress={onNavigateLiveTV}
          hasTVPreferredFocus={true}>
          <Text style={styles.cardIcon}>▶</Text>
          <Text style={styles.cardTitle}>Telewizja na żywo</Text>
          <Text style={styles.cardCount}>{liveTvCount} kanałów</Text>
        </TouchableOpacity>

        {/* Smaller Cards Grid */}
        <View style={styles.gridContainer}>
          {/* Movies */}
          <TouchableOpacity
            style={[styles.card, styles.cardSmall]}
            onPress={onNavigateMovies}>
            <Text style={styles.cardIcon}>🎬</Text>
            <Text style={styles.cardTitle}>Filmy</Text>
            <Text style={styles.cardCount}>{moviesCount}</Text>
          </TouchableOpacity>

          {/* Series */}
          <TouchableOpacity
            style={[styles.card, styles.cardSmall]}
            onPress={onNavigateSeries}>
            <Text style={styles.cardIcon}>📺</Text>
            <Text style={styles.cardTitle}>Seriale</Text>
            <Text style={styles.cardCount}>{seriesCount}</Text>
          </TouchableOpacity>

          {/* Account */}
          <TouchableOpacity
            style={[styles.card, styles.cardSmall]}
            onPress={onNavigateAccount}>
            <Text style={styles.cardIcon}>👤</Text>
            <Text style={styles.cardTitle}>Konto</Text>
            <Text style={styles.cardCount}>Informacje</Text>
          </TouchableOpacity>

          {/* Settings */}
          {onNavigateSettings && (
            <TouchableOpacity
              style={[styles.card, styles.cardSmall]}
              onPress={onNavigateSettings}>
              <Text style={styles.cardIcon}>⚙️</Text>
              <Text style={styles.cardTitle}>Ustawienia</Text>
              <Text style={styles.cardCount}>Konfiguracja</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d1117',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 30,
    paddingTop: 40,
    backgroundColor: '#161b22',
    borderBottomWidth: 2,
    borderBottomColor: '#30363d',
  },
  clock: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#58a6ff',
    fontFamily: 'monospace',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#58a6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  logoIconText: {
    fontSize: 24,
    color: '#fff',
  },
  logoText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#c9d1d9',
  },
  logoBox: {
    color: '#58a6ff',
  },
  userInfo: {
    alignItems: 'flex-end',
  },
  username: {
    fontSize: 24,
    fontWeight: '600',
    color: '#c9d1d9',
  },
  expiry: {
    fontSize: 18,
    color: '#8b949e',
    marginTop: 4,
  },
  content: {
    flex: 1,
    padding: 40,
    flexDirection: 'row',
    gap: 30,
  },
  card: {
    borderRadius: 16,
    padding: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#30363d',
  },
  cardLarge: {
    flex: 2,
    backgroundColor: '#1f6feb',
  },
  cardSmall: {
    flex: 1,
    backgroundColor: '#161b22',
  },
  gridContainer: {
    flex: 3,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 30,
  },
  cardIcon: {
    fontSize: 80,
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  cardCount: {
    fontSize: 24,
    color: '#c9d1d9',
  },
});
