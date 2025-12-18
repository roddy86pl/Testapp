/**
 * Movies Screen (VOD)
 * Displays movie categories and films
 */

import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import {VodCategory, VodMovie} from '../services/iptvApi';

interface MoviesScreenProps {
  categories: VodCategory[];
  movies: VodMovie[];
  onSelectMovie: (movie: VodMovie) => void;
  onSelectCategory: (categoryId: string) => void;
  onBack: () => void;
  loading?: boolean;
}

export const MoviesScreen: React.FC<MoviesScreenProps> = ({
  categories,
  movies,
  onSelectMovie,
  onSelectCategory,
  onBack,
  loading = false,
}) => {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategoryId(categoryId);
    onSelectCategory(categoryId);
  };

  const renderCategory = ({item}: {item: VodCategory}) => (
    <TouchableOpacity
      style={[
        styles.categoryItem,
        selectedCategoryId === item.category_id && styles.categoryItemSelected,
      ]}
      onPress={() => handleCategorySelect(item.category_id)}>
      <Text style={styles.categoryText}>{item.category_name}</Text>
    </TouchableOpacity>
  );

  const renderMovie = ({item}: {item: VodMovie}) => (
    <TouchableOpacity
      style={styles.movieItem}
      onPress={() => onSelectMovie(item)}
      hasTVPreferredFocus={item.num === 1}>
      {item.stream_icon ? (
        <Image
          source={{uri: item.stream_icon}}
          style={styles.moviePoster}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.moviePoster, styles.moviePosterPlaceholder]}>
          <Text style={styles.moviePosterText}>🎬</Text>
        </View>
      )}
      <View style={styles.movieInfo}>
        <Text style={styles.movieName} numberOfLines={2}>
          {item.name}
        </Text>
        {item.rating && (
          <View style={styles.ratingContainer}>
            <Text style={styles.ratingText}>⭐ {item.rating}</Text>
          </View>
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
        <Text style={styles.title}>Filmy</Text>
        <Text style={styles.movieCount}>{movies.length} filmów</Text>
      </View>

      <View style={styles.content}>
        {/* Categories sidebar */}
        <View style={styles.categoriesContainer}>
          <Text style={styles.sectionTitle}>Kategorie</Text>
          <FlatList
            data={categories}
            renderItem={renderCategory}
            keyExtractor={item => item.category_id}
            showsVerticalScrollIndicator={false}
          />
        </View>

        {/* Movies grid */}
        <View style={styles.moviesContainer}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#58a6ff" />
              <Text style={styles.loadingText}>Ładowanie filmów...</Text>
            </View>
          ) : movies.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Brak filmów w tej kategorii</Text>
            </View>
          ) : (
            <FlatList
              data={movies}
              renderItem={renderMovie}
              keyExtractor={item => item.stream_id.toString()}
              numColumns={4}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.moviesList}
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
    justifyContent: 'space-between',
    padding: 30,
    backgroundColor: '#161b22',
    borderBottomWidth: 2,
    borderBottomColor: '#30363d',
  },
  backButton: {
    padding: 10,
  },
  backButtonText: {
    fontSize: 24,
    color: '#58a6ff',
    fontWeight: '600',
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#c9d1d9',
  },
  movieCount: {
    fontSize: 20,
    color: '#8b949e',
  },
  content: {
    flex: 1,
    flexDirection: 'row',
  },
  categoriesContainer: {
    width: 300,
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
  categoryItem: {
    padding: 15,
    marginBottom: 10,
    borderRadius: 8,
    backgroundColor: '#0d1117',
    borderWidth: 1,
    borderColor: '#30363d',
  },
  categoryItemSelected: {
    backgroundColor: '#1f6feb',
    borderColor: '#58a6ff',
  },
  categoryText: {
    fontSize: 20,
    color: '#c9d1d9',
  },
  moviesContainer: {
    flex: 1,
    padding: 20,
  },
  moviesList: {
    paddingBottom: 20,
  },
  movieItem: {
    width: '23%',
    margin: '1%',
    backgroundColor: '#161b22',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#30363d',
    overflow: 'hidden',
  },
  moviePoster: {
    width: '100%',
    height: 220,
  },
  moviePosterPlaceholder: {
    backgroundColor: '#30363d',
    justifyContent: 'center',
    alignItems: 'center',
  },
  moviePosterText: {
    fontSize: 64,
  },
  movieInfo: {
    padding: 12,
  },
  movieName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#c9d1d9',
    marginBottom: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 16,
    color: '#ffa657',
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
