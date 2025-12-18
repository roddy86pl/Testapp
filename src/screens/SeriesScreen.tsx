/**
 * Series Screen
 * Displays series categories and shows
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
import { SeriesCategory, SeriesInfo } from '../services/iptvApi';

interface SeriesScreenProps {
  categories: SeriesCategory[];
  series: SeriesInfo[];
  onSelectSeries: (series: SeriesInfo) => void;
  onSelectCategory: (categoryId: string) => void;
  onBack: () => void;
  loading?: boolean;
}

export const SeriesScreen: React.FC<SeriesScreenProps> = ({
  categories,
  series,
  onSelectSeries,
  onSelectCategory,
  onBack,
  loading = false,
}) => {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategoryId(categoryId);
    onSelectCategory(categoryId);
  };

  const renderCategory = ({ item }: { item: SeriesCategory }) => (
    <TouchableOpacity
      style={[
        styles.categoryItem,
        selectedCategoryId === item.category_id && styles.categoryItemSelected,
      ]}
      onPress={() => handleCategorySelect(item.category_id)}
    >
      <Text style={styles.categoryText}>{item.category_name}</Text>
    </TouchableOpacity>
  );

  const renderSeries = ({ item }: { item: SeriesInfo }) => (
    <TouchableOpacity
      style={styles.seriesItem}
      onPress={() => onSelectSeries(item)}
      hasTVPreferredFocus={item.num === 1}
    >
      {item.cover ? (
        <Image
          source={{ uri: item.cover }}
          style={styles.seriesPoster}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.seriesPoster, styles.seriesPosterPlaceholder]}>
          <Text style={styles.seriesPosterText}>📺</Text>
        </View>
      )}
      <View style={styles.seriesInfo}>
        <Text style={styles.seriesName} numberOfLines={2}>
          {item.name}
        </Text>
        {item.rating && (
          <View style={styles.ratingContainer}>
            <Text style={styles.ratingText}>⭐ {item.rating}</Text>
          </View>
        )}
        {item.genre && (
          <Text style={styles.genreText} numberOfLines={1}>
            {item.genre}
          </Text>
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
        <Text style={styles.title}>Seriale</Text>
        <Text style={styles.seriesCount}>{series.length} seriali</Text>
      </View>

      <View style={styles.content}>
        {/* Categories sidebar */}
        <View style={styles.categoriesContainer}>
          <Text style={styles.sectionTitle}>Kategorie</Text>
          <FlatList
            data={categories}
            renderItem={renderCategory}
            keyExtractor={(item) => item.category_id}
            showsVerticalScrollIndicator={false}
          />
        </View>

        {/* Series grid */}
        <View style={styles.seriesContainer}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#58a6ff" />
              <Text style={styles.loadingText}>Ładowanie seriali...</Text>
            </View>
          ) : series.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Brak seriali w tej kategorii</Text>
            </View>
          ) : (
            <FlatList
              data={series}
              renderItem={renderSeries}
              keyExtractor={(item) => item.series_id.toString()}
              numColumns={4}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.seriesList}
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
  seriesCount: {
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
  seriesContainer: {
    flex: 1,
    padding: 20,
  },
  seriesList: {
    paddingBottom: 20,
  },
  seriesItem: {
    width: '23%',
    margin: '1%',
    backgroundColor: '#161b22',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#30363d',
    overflow: 'hidden',
  },
  seriesPoster: {
    width: '100%',
    height: 220,
  },
  seriesPosterPlaceholder: {
    backgroundColor: '#30363d',
    justifyContent: 'center',
    alignItems: 'center',
  },
  seriesPosterText: {
    fontSize: 64,
  },
  seriesInfo: {
    padding: 12,
  },
  seriesName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#c9d1d9',
    marginBottom: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  ratingText: {
    fontSize: 16,
    color: '#ffa657',
  },
  genreText: {
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
