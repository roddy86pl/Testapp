/**
 * Account Screen
 * User account information and settings
 */

import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Alert,
} from 'react-native';
import { UserInfo } from '../services/iptvApi';

interface AccountScreenProps {
    userInfo: UserInfo;
    serverUrl: string;
    onLogout: () => void;
    onBack: () => void;
}

export const AccountScreen: React.FC<AccountScreenProps> = ({
    userInfo,
    serverUrl,
    onLogout,
    onBack,
}) => {
    const handleLogout = () => {
        Alert.alert(
            'Wylogować?',
            'Czy na pewno chcesz się wylogować?',
            [
                { text: 'Anuluj', style: 'cancel' },
                { text: 'Wyloguj', onPress: onLogout, style: 'destructive' },
            ]
        );
    };

    const formatDate = (timestamp: string) => {
        try {
            const date = new Date(parseInt(timestamp) * 1000);
            return date.toLocaleDateString('pl-PL', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
            });
        } catch {
            return timestamp;
        }
    };

    const isExpired = () => {
        try {
            const expDate = new Date(parseInt(userInfo.exp_date) * 1000);
            return expDate < new Date();
        } catch {
            return false;
        }
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={onBack}>
                    <Text style={styles.backButtonText}>← Powrót</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Konto użytkownika</Text>
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* User Info Card */}
                <View style={styles.card}>
                    <View style={styles.userIcon}>
                        <Text style={styles.userIconText}>👤</Text>
                    </View>
                    <Text style={styles.username}>{userInfo.username}</Text>
                    <View style={[styles.statusBadge, isExpired() ? styles.expiredBadge : styles.activeBadge]}>
                        <Text style={styles.statusText}>
                            {isExpired() ? '❌ Wygasło' : '✅ Aktywne'}
                        </Text>
                    </View>
                </View>

                {/* Account Details */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Szczegóły konta</Text>
                    
                    <View style={styles.detailsCard}>
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Nazwa użytkownika:</Text>
                            <Text style={styles.detailValue}>{userInfo.username}</Text>
                        </View>
                        
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Status:</Text>
                            <Text style={styles.detailValue}>{userInfo.status}</Text>
                        </View>
                        
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Data wygaśnięcia:</Text>
                            <Text style={[styles.detailValue, isExpired() && styles.expiredText]}>
                                {formatDate(userInfo.exp_date)}
                            </Text>
                        </View>
                        
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Data utworzenia:</Text>
                            <Text style={styles.detailValue}>{formatDate(userInfo.created_at)}</Text>
                        </View>
                        
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Konto próbne:</Text>
                            <Text style={styles.detailValue}>
                                {userInfo.is_trial === '1' ? 'Tak' : 'Nie'}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Connection Info */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Informacje o połączeniu</Text>
                    
                    <View style={styles.detailsCard}>
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Serwer:</Text>
                            <Text style={styles.detailValue} numberOfLines={1}>
                                {serverUrl}
                            </Text>
                        </View>
                        
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Aktywne połączenia:</Text>
                            <Text style={styles.detailValue}>{userInfo.active_cons}</Text>
                        </View>
                        
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Max połączeń:</Text>
                            <Text style={styles.detailValue}>{userInfo.max_connections}</Text>
                        </View>
                    </View>
                </View>

                {/* Supported Formats */}
                {userInfo.allowed_output_formats && userInfo.allowed_output_formats.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Obsługiwane formaty</Text>
                        <View style={styles.formatsContainer}>
                            {userInfo.allowed_output_formats.map((format, index) => (
                                <View key={index} style={styles.formatBadge}>
                                    <Text style={styles.formatText}>{format.toUpperCase()}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                {/* Message */}
                {userInfo.message && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Wiadomość</Text>
                        <View style={styles.messageCard}>
                            <Text style={styles.messageText}>{userInfo.message}</Text>
                        </View>
                    </View>
                )}

                {/* Action Buttons */}
                <View style={styles.actionsContainer}>
                    <TouchableOpacity
                        style={[styles.actionButton, styles.logoutButton]}
                        onPress={handleLogout}
                        hasTVPreferredFocus={true}
                    >
                        <Text style={styles.actionButtonText}>🚪 Wyloguj się</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.footer}>
                    <Text style={styles.footerText}>TestApp v1.0.0</Text>
                    <Text style={styles.footerText}>Amazon Fire TV | Vega OS</Text>
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
    card: {
        backgroundColor: '#161b22',
        borderRadius: 16,
        padding: 40,
        alignItems: 'center',
        marginBottom: 30,
        borderWidth: 2,
        borderColor: '#30363d',
    },
    userIcon: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#1f6feb',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    userIconText: {
        fontSize: 60,
    },
    username: {
        fontSize: 36,
        fontWeight: 'bold',
        color: '#c9d1d9',
        marginBottom: 15,
    },
    statusBadge: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
    },
    activeBadge: {
        backgroundColor: '#238636',
    },
    expiredBadge: {
        backgroundColor: '#da3633',
    },
    statusText: {
        fontSize: 20,
        fontWeight: '600',
        color: '#fff',
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
    detailsCard: {
        backgroundColor: '#161b22',
        borderRadius: 12,
        padding: 25,
        borderWidth: 1,
        borderColor: '#30363d',
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 15,
        paddingBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#30363d',
    },
    detailLabel: {
        fontSize: 20,
        color: '#8b949e',
    },
    detailValue: {
        fontSize: 20,
        fontWeight: '600',
        color: '#c9d1d9',
        flex: 1,
        textAlign: 'right',
    },
    expiredText: {
        color: '#f85149',
    },
    formatsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    formatBadge: {
        backgroundColor: '#1f6feb',
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: 8,
    },
    formatText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#fff',
    },
    messageCard: {
        backgroundColor: '#161b22',
        borderRadius: 12,
        padding: 20,
        borderWidth: 1,
        borderColor: '#ffa657',
    },
    messageText: {
        fontSize: 20,
        color: '#c9d1d9',
        lineHeight: 28,
    },
    actionsContainer: {
        marginTop: 20,
        marginBottom: 30,
    },
    actionButton: {
        paddingVertical: 20,
        paddingHorizontal: 40,
        borderRadius: 8,
        alignItems: 'center',
        borderWidth: 2,
    },
    logoutButton: {
        backgroundColor: '#da3633',
        borderColor: '#f85149',
    },
    actionButtonText: {
        fontSize: 24,
        fontWeight: '600',
        color: '#fff',
    },
    footer: {
        alignItems: 'center',
        paddingVertical: 30,
        borderTopWidth: 1,
        borderTopColor: '#30363d',
    },
    footerText: {
        fontSize: 16,
        color: '#8b949e',
        marginBottom: 5,
    },
});
