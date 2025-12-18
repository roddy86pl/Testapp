/**
 * React Native App for Amazon Vega OS/Kepler
 * 
 * A basic starter application optimized for Amazon Fire TV devices
 * running on Vega OS (Linux-based).
 * 
 * Features:
 * - TV-optimized UI layout
 * - Fire TV remote control support
 * - Landscape orientation for TV screens
 */

import * as React from 'react';
import { useEffect } from 'react';
import { 
    View, 
    Text,
    StyleSheet, 
    BackHandler,
    TVEventHandler,
    Platform
} from 'react-native';

export const App: React.FC = () => {
    // Handle Fire TV remote Back button
    useEffect(() => {
        const backHandler = BackHandler.addEventListener(
            'hardwareBackPress',
            () => {
                // On Fire TV, back button exits the app
                BackHandler.exitApp();
                return true;
            }
        );

        return () => backHandler.remove();
    }, []);

    // Handle TV D-PAD events (navigation with remote)
    useEffect(() => {
        const tvEventHandler = new TVEventHandler();
        
        tvEventHandler.enable(undefined, (cmp, evt) => {
            if (evt && evt.eventType) {
                console.log('TV Event:', evt.eventType);
                // Here you can handle D-PAD navigation events:
                // 'up', 'down', 'left', 'right', 'select', 'playPause', etc.
            }
        });

        return () => tvEventHandler.disable();
    }, []);

    return (
        <View style={styles.container}>
            <View style={styles.welcomeBox}>
                <Text style={styles.title}>Welcome to Vega OS</Text>
                <Text style={styles.subtitle}>React Native Application</Text>
                <View style={styles.divider} />
                <Text style={styles.info}>Platform: Amazon Fire TV</Text>
                <Text style={styles.info}>Runtime: Vega OS/Kepler</Text>
                <Text style={styles.info}>React Native: 0.72.0</Text>
                <View style={styles.divider} />
                <Text style={styles.instructions}>
                    Navigate using your Fire TV remote
                </Text>
                <Text style={styles.instructions}>
                    Press Back to exit
                </Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0d1117',
        justifyContent: 'center',
        alignItems: 'center',
    },
    welcomeBox: {
        backgroundColor: '#161b22',
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#30363d',
        padding: 60,
        alignItems: 'center',
        maxWidth: 800,
    },
    title: {
        fontSize: 56,
        fontWeight: 'bold',
        color: '#58a6ff',
        marginBottom: 16,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 36,
        color: '#8b949e',
        marginBottom: 32,
        textAlign: 'center',
    },
    divider: {
        height: 2,
        width: '100%',
        backgroundColor: '#30363d',
        marginVertical: 24,
    },
    info: {
        fontSize: 28,
        color: '#c9d1d9',
        marginVertical: 8,
        textAlign: 'center',
    },
    instructions: {
        fontSize: 24,
        color: '#8b949e',
        marginTop: 8,
        textAlign: 'center',
    },
});

export default App;
