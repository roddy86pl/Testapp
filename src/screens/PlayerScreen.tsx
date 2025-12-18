/**
 * Player Screen
 * Video player for live TV, movies, and series episodes
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  BackHandler,
  Alert,
} from 'react-native';

interface PlayerScreenProps {
  streamUrl: string;
  title: string;
  onBack: () => void;
}

export const PlayerScreen: React.FC<PlayerScreenProps> = ({
  streamUrl,
  title,
  onBack,
}) => {
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [volume, setVolume] = useState(100);

  const handleExit = useCallback(() => {
    Alert.alert(
      'Zakończyć odtwarzanie?',
      'Czy na pewno chcesz wyjść z odtwarzacza?',
      [
        { text: 'Nie', style: 'cancel' },
        { text: 'Tak', onPress: onBack },
      ]
    );
  }, [onBack]);

  useEffect(() => {
    // Handle back button
    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        handleExit();
        return true;
      }
    );

    return () => backHandler.remove();
  }, [handleExit]);

  // Auto-hide controls after 5 seconds
  useEffect(() => {
    if (showControls) {
      const timer = setTimeout(() => {
        setShowControls(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [showControls]);

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
    setShowControls(true);
  };

  const handleSeek = (seconds: number) => {
    setCurrentTime(Math.max(0, Math.min(currentTime + seconds, duration)));
    setShowControls(true);
  };

  const handleVolumeChange = (delta: number) => {
    setVolume(Math.max(0, Math.min(100, volume + delta)));
    setShowControls(true);
  };

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs
        .toString()
        .padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress =
    duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  return (
    <View style={styles.container}>
      {/* Video Player Placeholder */}
      <View style={styles.videoContainer}>
        <View style={styles.videoPlaceholder}>
          <Text style={styles.videoPlaceholderText}>
            {isPlaying ? '▶️' : '⏸️'}
          </Text>
          <Text style={styles.videoTitleText}>
            {isPlaying ? 'Odtwarzanie...' : 'Wstrzymano'}
          </Text>
        </View>
      </View>

      {/* Controls Overlay */}
      {showControls && (
        <TouchableOpacity
          style={styles.controlsOverlay}
          onPress={() => setShowControls(false)}
          activeOpacity={1}
        >
          {/* Top Bar */}
          <View style={styles.topBar}>
            <TouchableOpacity
              style={styles.exitButton}
              onPress={handleExit}
              hasTVPreferredFocus={true}
            >
              <Text style={styles.exitButtonText}>← Wyjdź</Text>
            </TouchableOpacity>
            <Text style={styles.titleText} numberOfLines={1}>
              {title}
            </Text>
            <View style={styles.volumeIndicator}>
              <Text style={styles.volumeText}>🔊 {volume}%</Text>
            </View>
          </View>

          {/* Center Controls */}
          <View style={styles.centerControls}>
            <TouchableOpacity
              style={styles.controlButton}
              onPress={() => handleSeek(-10)}
            >
              <Text style={styles.controlButtonText}>⏪ 10s</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.controlButton, styles.playPauseButton]}
              onPress={togglePlayPause}
            >
              <Text style={styles.playPauseText}>
                {isPlaying ? '⏸️' : '▶️'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.controlButton}
              onPress={() => handleSeek(10)}
            >
              <Text style={styles.controlButtonText}>10s ⏩</Text>
            </TouchableOpacity>
          </View>

          {/* Bottom Bar */}
          <View style={styles.bottomBar}>
            {/* Progress Bar */}
            <View style={styles.progressContainer}>
              <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
              <View style={styles.progressBar}>
                <View
                  style={[styles.progressFill, { width: `${progress}%` }]}
                />
              </View>
              <Text style={styles.timeText}>{formatTime(duration)}</Text>
            </View>

            {/* Additional Controls */}
            <View style={styles.additionalControls}>
              <TouchableOpacity
                style={styles.smallButton}
                onPress={() => handleVolumeChange(-10)}
              >
                <Text style={styles.smallButtonText}>🔉 -</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.smallButton}
                onPress={() => handleVolumeChange(10)}
              >
                <Text style={styles.smallButtonText}>🔊 +</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.smallButton}
                onPress={() => Alert.alert('Jakość', 'Wybierz jakość wideo')}
              >
                <Text style={styles.smallButtonText}>⚙️ Jakość</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.smallButton}
                onPress={() => Alert.alert('Napisy', 'Wybierz napisy')}
              >
                <Text style={styles.smallButtonText}>💬 Napisy</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Stream Info */}
          <View style={styles.streamInfo}>
            <Text style={styles.streamInfoText} numberOfLines={1}>
              📡 {streamUrl}
            </Text>
          </View>
        </TouchableOpacity>
      )}

      {/* Tap to show controls hint */}
      {!showControls && (
        <TouchableOpacity
          style={styles.tapToShowControls}
          onPress={() => setShowControls(true)}
        >
          <Text style={styles.tapToShowText}>
            Dotknij aby pokazać kontrolki
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  videoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoPlaceholder: {
    alignItems: 'center',
  },
  videoPlaceholderText: {
    fontSize: 120,
    marginBottom: 20,
  },
  videoTitleText: {
    fontSize: 32,
    color: '#fff',
    fontWeight: '600',
  },
  controlsOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 30,
    paddingTop: 40,
  },
  exitButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 25,
    paddingVertical: 15,
    borderRadius: 8,
  },
  exitButtonText: {
    fontSize: 24,
    color: '#fff',
    fontWeight: '600',
  },
  titleText: {
    flex: 1,
    fontSize: 28,
    color: '#fff',
    fontWeight: '600',
    marginHorizontal: 20,
  },
  volumeIndicator: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  volumeText: {
    fontSize: 20,
    color: '#fff',
    fontWeight: '600',
  },
  centerControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 40,
  },
  controlButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 30,
    paddingVertical: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  playPauseButton: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(31, 111, 235, 0.8)',
    borderColor: '#58a6ff',
  },
  controlButtonText: {
    fontSize: 24,
    color: '#fff',
    fontWeight: '600',
  },
  playPauseText: {
    fontSize: 60,
  },
  bottomBar: {
    padding: 30,
    paddingBottom: 40,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  timeText: {
    fontSize: 20,
    color: '#fff',
    fontWeight: '600',
    minWidth: 80,
    textAlign: 'center',
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 4,
    marginHorizontal: 20,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#1f6feb',
    borderRadius: 4,
  },
  additionalControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 15,
  },
  smallButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  smallButtonText: {
    fontSize: 18,
    color: '#fff',
    fontWeight: '600',
  },
  streamInfo: {
    position: 'absolute',
    bottom: 120,
    left: 30,
    right: 30,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 15,
    borderRadius: 8,
  },
  streamInfoText: {
    fontSize: 16,
    color: '#8b949e',
  },
  tapToShowControls: {
    position: 'absolute',
    bottom: 30,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  tapToShowText: {
    fontSize: 20,
    color: 'rgba(255, 255, 255, 0.6)',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 20,
  },
});
