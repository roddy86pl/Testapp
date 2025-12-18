/**
 * Live TV Screen
 * Displays categories and channels
 */

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from "react-native";
import { LiveCategory, LiveChannel } from "../services/iptvApi";

interface LiveTVScreenProps {
  categories: LiveCategory[];
  channels: LiveChannel[];
  onSelectChannel: (channel: LiveChannel) => void;
  onSelectCategory: (categoryId: string) => void;
  onBack: () => void;
  loading?: boolean;
}

export const LiveTVScreen: React.FC<LiveTVScreenProps> = ({
  categories,
  channels,
  onSelectChannel,
  onSelectCategory,
  onBack,
  loading = false,
}) => {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategoryId(categoryId);
    onSelectCategory(categoryId);
  };

  const renderCategory = ({ item }: { item: LiveCategory }) => (
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

  const renderChannel = ({ item }: { item: LiveChannel }) => (
    <TouchableOpacity
      style={styles.channelItem}
      onPress={() => onSelectChannel(item)}
      hasTVPreferredFocus={item.num === 1}
    >
      {item.stream_icon ? (
        <Image
          source={{ uri: item.stream_icon }}
          style={styles.channelIcon}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.channelIcon, styles.channelIconPlaceholder]}>
          <Text style={styles.channelIconText}>📺</Text>
        </View>
      )}
      <View style={styles.channelInfo}>
        <Text style={styles.channelName} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.channelNumber}>#{item.num}</Text>
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
        <Text style={styles.title}>Telewizja na żywo</Text>
        <Text style={styles.channelCount}>{channels.length} kanałów</Text>
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

        {/* Channels list */}
        <View style={styles.channelsContainer}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#58a6ff" />
              <Text style={styles.loadingText}>Ładowanie kanałów...</Text>
            </View>
          ) : channels.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Brak kanałów w tej kategorii</Text>
            </View>
          ) : (
            <FlatList
              data={channels}
              renderItem={renderChannel}
              keyExtractor={(item) => item.stream_id.toString()}
              numColumns={3}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.channelsList}
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
    backgroundColor: "#0d1117",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 30,
    backgroundColor: "#161b22",
    borderBottomWidth: 2,
    borderBottomColor: "#30363d",
  },
  backButton: {
    padding: 10,
  },
  backButtonText: {
    fontSize: 24,
    color: "#58a6ff",
    fontWeight: "600",
  },
  title: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#c9d1d9",
  },
  channelCount: {
    fontSize: 20,
    color: "#8b949e",
  },
  content: {
    flex: 1,
    flexDirection: "row",
  },
  categoriesContainer: {
    width: 300,
    backgroundColor: "#161b22",
    borderRightWidth: 2,
    borderRightColor: "#30363d",
    padding: 20,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#c9d1d9",
    marginBottom: 20,
  },
  categoryItem: {
    padding: 15,
    marginBottom: 10,
    borderRadius: 8,
    backgroundColor: "#0d1117",
    borderWidth: 1,
    borderColor: "#30363d",
  },
  categoryItemSelected: {
    backgroundColor: "#1f6feb",
    borderColor: "#58a6ff",
  },
  categoryText: {
    fontSize: 20,
    color: "#c9d1d9",
  },
  channelsContainer: {
    flex: 1,
    padding: 20,
  },
  channelsList: {
    paddingBottom: 20,
  },
  channelItem: {
    width: "31%",
    margin: "1%",
    backgroundColor: "#161b22",
    borderRadius: 12,
    padding: 15,
    borderWidth: 2,
    borderColor: "#30363d",
    alignItems: "center",
  },
  channelIcon: {
    width: 100,
    height: 100,
    borderRadius: 8,
    marginBottom: 10,
  },
  channelIconPlaceholder: {
    backgroundColor: "#30363d",
    justifyContent: "center",
    alignItems: "center",
  },
  channelIconText: {
    fontSize: 48,
  },
  channelInfo: {
    width: "100%",
    alignItems: "center",
  },
  channelName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#c9d1d9",
    marginBottom: 5,
    textAlign: "center",
  },
  channelNumber: {
    fontSize: 14,
    color: "#8b949e",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 24,
    color: "#8b949e",
    marginTop: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    fontSize: 24,
    color: "#8b949e",
  },
});
