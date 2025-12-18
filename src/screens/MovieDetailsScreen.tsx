/**
 * Movie Details Screen
 * Shows detailed information about a selected movie
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
import {VodMovie} from '../services/iptvApi';

interface MovieDetailsScreenProps {
  movie: VodMovie;
  onPlay: (movie: VodMovie) => void;
  onBack: () => void;
}

export const MovieDetailsScreen: React.FC<MovieDetailsScreenProps> = ({
  movie,
  onPlay,
  onBack,
}) => {
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← Powrót</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Szczegóły filmu</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Movie Backdrop/Poster */}
        <View style={styles.posterContainer}>
          {movie.stream_icon ? (
            <Image
              source={{uri: movie.stream_icon}}
              style={styles.poster}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.poster, styles.posterPlaceholder]}>
              <Text style={styles.posterPlaceholderText}>🎬</Text>
            </View>
          )}

          {/* Play Button Overlay */}
          <TouchableOpacity
            style={styles.playButtonOverlay}
            onPress={() => onPlay(movie)}
            hasTVPreferredFocus={true}>
            <View style={styles.playButton}>
              <Text style={styles.playButtonText}>▶ Odtwórz</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Movie Info */}
        <View style={styles.infoContainer}>
          <Text style={styles.title}>{movie.name}</Text>

          {/* Meta Information */}
          <View style={styles.metaContainer}>
            {movie.rating && (
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>Ocena:</Text>
                <Text style={styles.metaValue}>⭐ {movie.rating}</Text>
              </View>
            )}
            {movie.added && (
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>Dodano:</Text>
                <Text style={styles.metaValue}>
                  {new Date(
                    parseInt(movie.added, 10) * 1000,
                  ).toLocaleDateString('pl-PL')}
                </Text>
              </View>
            )}
            {movie.container_extension && (
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>Format:</Text>
                <Text style={styles.metaValue}>
                  {movie.container_extension.toUpperCase()}
                </Text>
              </View>
            )}
          </View>

          {/* Stream Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Informacje techniczne</Text>
            <View style={styles.techInfo}>
              <Text style={styles.techInfoText}>
                Stream ID: {movie.stream_id}
              </Text>
              <Text style={styles.techInfoText}>Type: {movie.stream_type}</Text>
              {movie.category_id && (
                <Text style={styles.techInfoText}>
                  Kategoria: {movie.category_id}
                </Text>
              )}
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={[styles.actionButton, styles.primaryButton]}
              onPress={() => onPlay(movie)}>
              <Text style={styles.actionButtonText}>▶ Odtwórz teraz</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.secondaryButton]}
              onPress={() => console.log('Add to favorites')}>
              <Text style={styles.actionButtonText}>
                ❤️ Dodaj do ulubionych
              </Text>
            </TouchableOpacity>
          </View>
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
  posterContainer: {
    width: '100%',
    height: 500,
    position: 'relative',
  },
  poster: {
    width: '100%',
    height: '100%',
  },
  posterPlaceholder: {
    backgroundColor: '#30363d',
    justifyContent: 'center',
    alignItems: 'center',
  },
  posterPlaceholderText: {
    fontSize: 120,
  },
  playButtonOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  playButton: {
    backgroundColor: '#1f6feb',
    paddingHorizontal: 60,
    paddingVertical: 25,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: '#58a6ff',
  },
  playButtonText: {
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
});
