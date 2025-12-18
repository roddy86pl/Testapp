/**
 * Episodes Screen
 * Displays episodes of a selected series
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Episode, SeriesInfo } from '../services/iptvApi';

interface EpisodesScreenProps {
  seriesInfo: SeriesInfo;
  episodes: Record<string, Episode[]>;
  onSelectEpisode: (episode: Episode) => void;
  onBack: () => void;
  loading?: boolean;
}

export const EpisodesScreen: React.FC<EpisodesScreenProps> = ({
  seriesInfo,
  episodes,
  onSelectEpisode,
  onBack,
  loading = false,
}) => {
  const seasons = Object.keys(episodes).sort(
    (a, b) => parseInt(a, 10) - parseInt(b, 10)
  );
  const [selectedSeason, setSelectedSeason] = useState<string>(
    seasons[0] || '1'
  );

  const currentEpisodes = episodes[selectedSeason] || [];

  const renderSeason = ({ item }: { item: string }) => (
    <TouchableOpacity
      style={[
        styles.seasonItem,
        selectedSeason === item && styles.seasonItemSelected,
      ]}
      onPress={() => setSelectedSeason(item)}
    >
      <Text style={styles.seasonText}>Sezon {item}</Text>
    </TouchableOpacity>
  );

  const renderEpisode = ({ item }: { item: Episode }) => (
    <TouchableOpacity
      style={styles.episodeItem}
      onPress={() => onSelectEpisode(item)}
      hasTVPreferredFocus={item.episode_num === 1}
    >
      {item.info?.movie_image ? (
        <Image
          source={{ uri: item.info.movie_image }}
          style={styles.episodeThumbnail}
          resizeMode="cover"
        />
      ) : (
        <View
          style={[styles.episodeThumbnail, styles.episodeThumbnailPlaceholder]}
        >
          <Text style={styles.episodeThumbnailText}>▶</Text>
        </View>
      )}
      <View style={styles.episodeInfo}>
        <Text style={styles.episodeNumber}>Odcinek {item.episode_num}</Text>
        <Text style={styles.episodeTitle} numberOfLines={2}>
          {item.title}
        </Text>
        {item.info?.duration && (
          <Text style={styles.episodeDuration}>⏱ {item.info.duration}</Text>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← Powrót</Text>
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.title}>{seriesInfo.name}</Text>
          {seriesInfo.genre && (
            <Text style={styles.genre}>{seriesInfo.genre}</Text>
          )}
        </View>
      </View>

      {/* Series info banner */}
      {seriesInfo.plot && (
        <View style={styles.infoBanner}>
          <Text style={styles.plot} numberOfLines={3}>
            {seriesInfo.plot}
          </Text>
          {seriesInfo.rating && (
            <Text style={styles.rating}>⭐ {seriesInfo.rating}</Text>
          )}
        </View>
      )}

      <View style={styles.content}>
        {/* Seasons sidebar */}
        <View style={styles.seasonsContainer}>
          <Text style={styles.sectionTitle}>Sezony</Text>
          <FlatList
            data={seasons}
            renderItem={renderSeason}
            keyExtractor={(item) => item}
            showsVerticalScrollIndicator={false}
          />
        </View>

        {/* Episodes list */}
        <View style={styles.episodesContainer}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#58a6ff" />
              <Text style={styles.loadingText}>Ładowanie odcinków...</Text>
            </View>
          ) : currentEpisodes.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Brak odcinków w tym sezonie</Text>
            </View>
          ) : (
            <FlatList
              data={currentEpisodes}
              renderItem={renderEpisode}
              keyExtractor={(item) => item.id}
              numColumns={2}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.episodesList}
            />
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
    alignItems: 'center',
    padding: 30,
    backgroundColor: '#161b22',
    borderBottomWidth: 2,
    borderBottomColor: '#30363d',
  },
  backButton: {
    padding: 10,
    marginRight: 20,
  },
  backButtonText: {
    fontSize: 24,
    color: '#58a6ff',
    fontWeight: '600',
  },
  headerInfo: {
    flex: 1,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#c9d1d9',
  },
  genre: {
    fontSize: 20,
    color: '#8b949e',
    marginTop: 5,
  },
  infoBanner: {
    backgroundColor: '#161b22',
    padding: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#30363d',
  },
  plot: {
    fontSize: 18,
    color: '#c9d1d9',
    lineHeight: 26,
    marginBottom: 10,
  },
  rating: {
    fontSize: 20,
    color: '#ffa657',
  },
  content: {
    flex: 1,
    flexDirection: 'row',
  },
  seasonsContainer: {
    width: 250,
    backgroundColor: '#161b22',
    borderRightWidth: 2,
    borderRightColor: '#30363d',
    padding: 20,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#c9d1d9',
    marginBottom: 20,
  },
  seasonItem: {
    padding: 15,
    marginBottom: 10,
    borderRadius: 8,
    backgroundColor: '#0d1117',
    borderWidth: 1,
    borderColor: '#30363d',
  },
  seasonItemSelected: {
    backgroundColor: '#1f6feb',
    borderColor: '#58a6ff',
  },
  seasonText: {
    fontSize: 20,
    color: '#c9d1d9',
    fontWeight: '600',
  },
  episodesContainer: {
    flex: 1,
    padding: 20,
  },
  episodesList: {
    paddingBottom: 20,
  },
  episodeItem: {
    width: '48%',
    margin: '1%',
    backgroundColor: '#161b22',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#30363d',
    overflow: 'hidden',
    flexDirection: 'row',
    padding: 15,
  },
  episodeThumbnail: {
    width: 120,
    height: 80,
    borderRadius: 8,
    marginRight: 15,
  },
  episodeThumbnailPlaceholder: {
    backgroundColor: '#30363d',
    justifyContent: 'center',
    alignItems: 'center',
  },
  episodeThumbnailText: {
    fontSize: 32,
    color: '#58a6ff',
  },
  episodeInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  episodeNumber: {
    fontSize: 16,
    color: '#58a6ff',
    fontWeight: '600',
    marginBottom: 5,
  },
  episodeTitle: {
    fontSize: 18,
    color: '#c9d1d9',
    marginBottom: 5,
  },
  episodeDuration: {
    fontSize: 14,
    color: '#8b949e',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 24,
    color: '#8b949e',
    marginTop: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 24,
    color: '#8b949e',
  },
});
