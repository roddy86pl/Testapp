/**
 * Series Details Screen
 * Shows detailed information about a selected series
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
} from 'react-native';
import { SeriesInfo } from '../services/iptvApi';

interface SeriesDetailsScreenProps {
  series: SeriesInfo;
  onViewEpisodes: (series: SeriesInfo) => void;
  onBack: () => void;
}

export const SeriesDetailsScreen: React.FC<SeriesDetailsScreenProps> = ({
  series,
  onViewEpisodes,
  onBack,
}) => {
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← Powrót</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Szczegóły serialu</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Series Backdrop/Cover */}
        <View style={styles.coverContainer}>
          {series.cover ? (
            <Image
              source={{ uri: series.cover }}
              style={styles.cover}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.cover, styles.coverPlaceholder]}>
              <Text style={styles.coverPlaceholderText}>📺</Text>
            </View>
          )}

          {/* View Episodes Button Overlay */}
          <TouchableOpacity
            style={styles.viewButtonOverlay}
            onPress={() => onViewEpisodes(series)}
            hasTVPreferredFocus={true}
          >
            <View style={styles.viewButton}>
              <Text style={styles.viewButtonText}>📺 Zobacz odcinki</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Series Info */}
        <View style={styles.infoContainer}>
          <Text style={styles.title}>{series.name}</Text>

          {/* Meta Information */}
          <View style={styles.metaContainer}>
            {series.rating && (
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>Ocena:</Text>
                <Text style={styles.metaValue}>⭐ {series.rating}</Text>
              </View>
            )}
            {series.genre && (
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>Gatunek:</Text>
                <Text style={styles.metaValue}>{series.genre}</Text>
              </View>
            )}
            {series.release_date && (
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>Premiera:</Text>
                <Text style={styles.metaValue}>{series.release_date}</Text>
              </View>
            )}
            {series.episode_run_time && (
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>Czas odcinka:</Text>
                <Text style={styles.metaValue}>
                  {series.episode_run_time} min
                </Text>
              </View>
            )}
          </View>

          {/* Plot/Description */}
          {series.plot && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Opis</Text>
              <Text style={styles.plotText}>{series.plot}</Text>
            </View>
          )}

          {/* Cast & Crew */}
          {(series.cast || series.director) && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Obsada i twórcy</Text>
              {series.director && (
                <View style={styles.crewItem}>
                  <Text style={styles.crewLabel}>Reżyseria:</Text>
                  <Text style={styles.crewValue}>{series.director}</Text>
                </View>
              )}
              {series.cast && (
                <View style={styles.crewItem}>
                  <Text style={styles.crewLabel}>Obsada:</Text>
                  <Text style={styles.crewValue}>{series.cast}</Text>
                </View>
              )}
            </View>
          )}

          {/* Technical Info */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Informacje techniczne</Text>
            <View style={styles.techInfo}>
              <Text style={styles.techInfoText}>
                Series ID: {series.series_id}
              </Text>
              {series.category_id && (
                <Text style={styles.techInfoText}>
                  Kategoria: {series.category_id}
                </Text>
              )}
              {series.last_modified && (
                <Text style={styles.techInfoText}>
                  Ostatnia aktualizacja:{' '}
                  {new Date(
                    parseInt(series.last_modified, 10) * 1000
                  ).toLocaleDateString('pl-PL')}
                </Text>
              )}
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={[styles.actionButton, styles.primaryButton]}
              onPress={() => onViewEpisodes(series)}
            >
              <Text style={styles.actionButtonText}>📺 Zobacz odcinki</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.secondaryButton]}
              onPress={() => console.log('Add to favorites')}
            >
              <Text style={styles.actionButtonText}>
                ❤️ Dodaj do ulubionych
              </Text>
            </TouchableOpacity>
          </View>

          {/* YouTube Trailer */}
          {series.youtube_trailer && (
            <TouchableOpacity
              style={styles.trailerButton}
              onPress={() =>
                console.log('Play trailer:', series.youtube_trailer)
              }
            >
              <Text style={styles.trailerButtonText}>🎬 Obejrzyj zwiastun</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
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
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#c9d1d9',
  },
  content: {
    flex: 1,
  },
  coverContainer: {
    width: '100%',
    height: 500,
    position: 'relative',
  },
  cover: {
    width: '100%',
    height: '100%',
  },
  coverPlaceholder: {
    backgroundColor: '#30363d',
    justifyContent: 'center',
    alignItems: 'center',
  },
  coverPlaceholderText: {
    fontSize: 120,
  },
  viewButtonOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  viewButton: {
    backgroundColor: '#1f6feb',
    paddingHorizontal: 60,
    paddingVertical: 25,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: '#58a6ff',
  },
  viewButtonText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
  },
  infoContainer: {
    padding: 40,
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#c9d1d9',
    marginBottom: 30,
  },
  metaContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 30,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 40,
    marginBottom: 15,
  },
  metaLabel: {
    fontSize: 20,
    color: '#8b949e',
    marginRight: 10,
  },
  metaValue: {
    fontSize: 22,
    fontWeight: '600',
    color: '#ffa657',
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#c9d1d9',
    marginBottom: 15,
  },
  plotText: {
    fontSize: 20,
    color: '#c9d1d9',
    lineHeight: 32,
  },
  crewItem: {
    marginBottom: 12,
  },
  crewLabel: {
    fontSize: 18,
    color: '#8b949e',
    marginBottom: 5,
  },
  crewValue: {
    fontSize: 20,
    color: '#c9d1d9',
  },
  techInfo: {
    backgroundColor: '#161b22',
    padding: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#30363d',
  },
  techInfoText: {
    fontSize: 18,
    color: '#8b949e',
    marginBottom: 8,
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 20,
    marginTop: 20,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 20,
    paddingHorizontal: 30,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 2,
  },
  primaryButton: {
    backgroundColor: '#238636',
    borderColor: '#2ea043',
  },
  secondaryButton: {
    backgroundColor: '#30363d',
    borderColor: '#484f58',
  },
  actionButtonText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#fff',
  },
  trailerButton: {
    marginTop: 20,
    paddingVertical: 18,
    paddingHorizontal: 30,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#da3633',
    borderWidth: 2,
    borderColor: '#f85149',
  },
  trailerButtonText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#fff',
  },
});
