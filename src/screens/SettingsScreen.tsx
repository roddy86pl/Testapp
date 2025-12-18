/**
 * Settings Screen
 * Application settings and preferences
 */

import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Alert,
} from 'react-native';

interface SettingsScreenProps {
    onBack: () => void;
    onClearCache: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
    onBack,
    onClearCache,
}) => {
    const [autoplay, setAutoplay] = useState(true);
    const [notifications, setNotifications] = useState(true);
    const [hdQuality, setHdQuality] = useState(true);
    const [subtitles, setSubtitles] = useState(false);

    const handleClearCache = () => {
        Alert.alert(
            'Wyczyść pamięć podręczną',
            'Czy na pewno chcesz wyczyścić cache aplikacji?',
            [
                { text: 'Anuluj', style: 'cancel' },
                {
                    text: 'Wyczyść',
                    onPress: () => {
                        onClearCache();
                        Alert.alert('Gotowe', 'Pamięć podręczna została wyczyszczona');
                    },
                },
            ]
        );
    };

    const handleResetSettings = () => {
        Alert.alert(
            'Resetuj ustawienia',
            'Czy na pewno chcesz przywrócić domyślne ustawienia?',
            [
                { text: 'Anuluj', style: 'cancel' },
                {
                    text: 'Resetuj',
                    onPress: () => {
                        setAutoplay(true);
                        setNotifications(true);
                        setHdQuality(true);
                        setSubtitles(false);
                        Alert.alert('Gotowe', 'Ustawienia zostały zresetowane');
                    },
                },
            ]
        );
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={onBack}>
                    <Text style={styles.backButtonText}>← Powrót</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Ustawienia</Text>
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* Playback Settings */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>⚙️ Odtwarzanie</Text>
                    
                    <TouchableOpacity
                        style={styles.settingRow}
                        onPress={() => setAutoplay(!autoplay)}
                        hasTVPreferredFocus={true}
                    >
                        <View style={styles.settingInfo}>
                            <Text style={styles.settingName}>Automatyczne odtwarzanie</Text>
                            <Text style={styles.settingDescription}>
                                Automatycznie odtwarzaj następny odcinek
                            </Text>
                        </View>
                        <View style={[styles.toggle, autoplay && styles.toggleActive]}>
                            <Text style={styles.toggleText}>{autoplay ? 'ON' : 'OFF'}</Text>
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.settingRow}
                        onPress={() => setHdQuality(!hdQuality)}
                    >
                        <View style={styles.settingInfo}>
                            <Text style={styles.settingName}>Jakość HD</Text>
                            <Text style={styles.settingDescription}>
                                Preferuj najwyższą jakość wideo
                            </Text>
                        </View>
                        <View style={[styles.toggle, hdQuality && styles.toggleActive]}>
                            <Text style={styles.toggleText}>{hdQuality ? 'ON' : 'OFF'}</Text>
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.settingRow}
                        onPress={() => setSubtitles(!subtitles)}
                    >
                        <View style={styles.settingInfo}>
                            <Text style={styles.settingName}>Napisy</Text>
                            <Text style={styles.settingDescription}>
                                Włącz napisy domyślnie
                            </Text>
                        </View>
                        <View style={[styles.toggle, subtitles && styles.toggleActive]}>
                            <Text style={styles.toggleText}>{subtitles ? 'ON' : 'OFF'}</Text>
                        </View>
                    </TouchableOpacity>
                </View>

                {/* App Settings */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>📱 Aplikacja</Text>
                    
                    <TouchableOpacity
                        style={styles.settingRow}
                        onPress={() => setNotifications(!notifications)}
                    >
                        <View style={styles.settingInfo}>
                            <Text style={styles.settingName}>Powiadomienia</Text>
                            <Text style={styles.settingDescription}>
                                Wyświetlaj powiadomienia o nowych treściach
                            </Text>
                        </View>
                        <View style={[styles.toggle, notifications && styles.toggleActive]}>
                            <Text style={styles.toggleText}>{notifications ? 'ON' : 'OFF'}</Text>
                        </View>
                    </TouchableOpacity>
                </View>

                {/* Storage & Cache */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>💾 Pamięć</Text>
                    
                    <TouchableOpacity
                        style={styles.actionRow}
                        onPress={handleClearCache}
                    >
                        <View style={styles.settingInfo}>
                            <Text style={styles.settingName}>Wyczyść cache</Text>
                            <Text style={styles.settingDescription}>
                                Usuń tymczasowe pliki i dane
                            </Text>
                        </View>
                        <Text style={styles.actionArrow}>→</Text>
                    </TouchableOpacity>
                </View>

                {/* About */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>ℹ️ Informacje</Text>
                    
                    <View style={styles.infoCard}>
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Wersja aplikacji:</Text>
                            <Text style={styles.infoValue}>1.0.0</Text>
                        </View>
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Platforma:</Text>
                            <Text style={styles.infoValue}>Amazon Fire TV</Text>
                        </View>
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>System:</Text>
                            <Text style={styles.infoValue}>Vega OS / Kepler</Text>
                        </View>
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>React Native:</Text>
                            <Text style={styles.infoValue}>0.72.0</Text>
                        </View>
                    </View>
                </View>

                {/* Advanced */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>🔧 Zaawansowane</Text>
                    
                    <TouchableOpacity
                        style={styles.actionRow}
                        onPress={handleResetSettings}
                    >
                        <View style={styles.settingInfo}>
                            <Text style={styles.settingName}>Resetuj ustawienia</Text>
                            <Text style={styles.settingDescription}>
                                Przywróć domyślne ustawienia aplikacji
                            </Text>
                        </View>
                        <Text style={styles.actionArrow}>→</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.footer}>
                    <Text style={styles.footerText}>
                        © 2025 TestApp. Wszystkie prawa zastrzeżone.
                    </Text>
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
        padding: 40,
    },
    section: {
        marginBottom: 40,
    },
    sectionTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#c9d1d9',
        marginBottom: 20,
    },
    settingRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#161b22',
        padding: 25,
        borderRadius: 12,
        marginBottom: 15,
        borderWidth: 2,
        borderColor: '#30363d',
    },
    settingInfo: {
        flex: 1,
        marginRight: 20,
    },
    settingName: {
        fontSize: 24,
        fontWeight: '600',
        color: '#c9d1d9',
        marginBottom: 5,
    },
    settingDescription: {
        fontSize: 18,
        color: '#8b949e',
    },
    toggle: {
        width: 80,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#30363d',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#484f58',
    },
    toggleActive: {
        backgroundColor: '#238636',
        borderColor: '#2ea043',
    },
    toggleText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#fff',
    },
    actionRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#161b22',
        padding: 25,
        borderRadius: 12,
        marginBottom: 15,
        borderWidth: 2,
        borderColor: '#30363d',
    },
    actionArrow: {
        fontSize: 32,
        color: '#58a6ff',
        fontWeight: 'bold',
    },
    infoCard: {
        backgroundColor: '#161b22',
        borderRadius: 12,
        padding: 25,
        borderWidth: 1,
        borderColor: '#30363d',
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 15,
        paddingBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#30363d',
    },
    infoLabel: {
        fontSize: 20,
        color: '#8b949e',
    },
    infoValue: {
        fontSize: 20,
        fontWeight: '600',
        color: '#c9d1d9',
    },
    footer: {
        alignItems: 'center',
        paddingVertical: 30,
        marginTop: 20,
    },
    footerText: {
        fontSize: 16,
        color: '#8b949e',
    },
});
