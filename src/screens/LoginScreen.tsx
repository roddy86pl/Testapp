/**
 * Login Screen for Vega OS IPTV App
 * Displays device code and registration form
 */

import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    StyleSheet,
    TouchableOpacity,
    Alert,
} from 'react-native';
import { APP_NAME, APP_SUBTITLE, APP_VERSION, PLATFORM_NAME } from '../utils/constants';

interface LoginScreenProps {
    deviceCode: string;
    onLogin: (serverUrl: string, username: string, password: string) => Promise<void>;
    onDeviceLogin: () => Promise<void>;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
    deviceCode,
    onLogin,
    onDeviceLogin,
}) => {
    const [showForm, setShowForm] = useState(false);
    const [serverUrl, setServerUrl] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleRegister = async () => {
        if (!serverUrl || !username || !password) {
            Alert.alert('Błąd', 'Wypełnij wszystkie pola');
            return;
        }

        setLoading(true);
        try {
            await onLogin(serverUrl, username, password);
        } catch (error) {
            Alert.alert('Błąd', 'Nie udało się zalogować');
        } finally {
            setLoading(false);
        }
    };

    const handleDeviceLogin = async () => {
        setLoading(true);
        try {
            await onDeviceLogin();
        } catch (error) {
            Alert.alert('Błąd', 'Nie udało się zalogować kodem urządzenia');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.leftPanel}>
                {/* Logo */}
                <View style={styles.logoContainer}>
                    <View style={styles.logoIcon}>
                        <Text style={styles.logoText}>▶</Text>
                    </View>
                </View>

                {/* Title */}
                <Text style={styles.title}>{APP_NAME}</Text>
                <Text style={styles.subtitle}>{APP_SUBTITLE}</Text>

                {/* Device Code */}
                <View style={styles.deviceCodeBox}>
                    <Text style={styles.deviceCodeLabel}>Kod urządzenia</Text>
                    <Text style={styles.deviceCodeValue}>{deviceCode}</Text>
                </View>

                {/* Buttons */}
                <TouchableOpacity
                    style={[styles.button, styles.primaryButton]}
                    onPress={handleDeviceLogin}
                    disabled={loading}
                    hasTVPreferredFocus={true}
                >
                    <Text style={styles.buttonText}>
                        {loading ? 'Ładowanie...' : 'Zaloguj kodem urządzenia'}
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.button, styles.secondaryButton]}
                    onPress={() => setShowForm(!showForm)}
                    disabled={loading}
                >
                    <Text style={styles.buttonText}>
                        {showForm ? 'Ukryj formularz' : 'Pokaż formularz rejestracji'}
                    </Text>
                </TouchableOpacity>

                <Text style={styles.versionText}>v{APP_VERSION} | {PLATFORM_NAME}</Text>
            </View>

            {showForm && (
                <View style={styles.rightPanel}>
                    <View style={styles.form}>
                        <Text style={styles.formTitle}>Rejestracja konta</Text>
                        <Text style={styles.formSubtitle}>Wprowadź dane serwera IPTV</Text>

                        <View style={styles.formGroup}>
                            <Text style={styles.label}>Adres serwera</Text>
                            <TextInput
                                style={styles.input}
                                value={serverUrl}
                                onChangeText={setServerUrl}
                                placeholder="http://twoj-serwer.com"
                                placeholderTextColor="#666"
                                keyboardType="url"
                                autoCapitalize="none"
                            />
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.label}>Nazwa użytkownika</Text>
                            <TextInput
                                style={styles.input}
                                value={username}
                                onChangeText={setUsername}
                                placeholder="Nazwa użytkownika"
                                placeholderTextColor="#666"
                                autoCapitalize="none"
                            />
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.label}>Hasło</Text>
                            <TextInput
                                style={styles.input}
                                value={password}
                                onChangeText={setPassword}
                                placeholder="Hasło"
                                placeholderTextColor="#666"
                                secureTextEntry
                            />
                        </View>

                        <TouchableOpacity
                            style={[styles.button, styles.primaryButton]}
                            onPress={handleRegister}
                            disabled={loading}
                        >
                            <Text style={styles.buttonText}>Zarejestruj</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        flexDirection: 'row',
        backgroundColor: '#0d1117',
    },
    leftPanel: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 60,
    },
    rightPanel: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 60,
        backgroundColor: '#161b22',
    },
    logoContainer: {
        marginBottom: 30,
    },
    logoIcon: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#58a6ff',
        justifyContent: 'center',
        alignItems: 'center',
    },
    logoText: {
        fontSize: 60,
        color: '#fff',
    },
    title: {
        fontSize: 56,
        fontWeight: 'bold',
        color: '#58a6ff',
        marginBottom: 12,
    },
    subtitle: {
        fontSize: 28,
        color: '#8b949e',
        marginBottom: 40,
    },
    deviceCodeBox: {
        backgroundColor: '#161b22',
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#30363d',
        padding: 30,
        marginBottom: 40,
        alignItems: 'center',
        minWidth: 400,
    },
    deviceCodeLabel: {
        fontSize: 20,
        color: '#8b949e',
        marginBottom: 12,
    },
    deviceCodeValue: {
        fontSize: 48,
        fontWeight: 'bold',
        color: '#58a6ff',
        letterSpacing: 8,
        fontFamily: 'monospace',
    },
    button: {
        paddingVertical: 20,
        paddingHorizontal: 40,
        borderRadius: 8,
        marginVertical: 10,
        minWidth: 400,
        alignItems: 'center',
    },
    primaryButton: {
        backgroundColor: '#238636',
    },
    secondaryButton: {
        backgroundColor: '#30363d',
    },
    buttonText: {
        fontSize: 24,
        fontWeight: '600',
        color: '#fff',
    },
    versionText: {
        fontSize: 18,
        color: '#484f58',
        marginTop: 40,
    },
    form: {
        width: '100%',
        maxWidth: 600,
    },
    formTitle: {
        fontSize: 36,
        fontWeight: 'bold',
        color: '#c9d1d9',
        marginBottom: 12,
    },
    formSubtitle: {
        fontSize: 20,
        color: '#8b949e',
        marginBottom: 30,
    },
    formGroup: {
        marginBottom: 24,
    },
    label: {
        fontSize: 20,
        color: '#c9d1d9',
        marginBottom: 8,
    },
    input: {
        backgroundColor: '#0d1117',
        borderWidth: 1,
        borderColor: '#30363d',
        borderRadius: 6,
        padding: 16,
        fontSize: 22,
        color: '#c9d1d9',
    },
});
