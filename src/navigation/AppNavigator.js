import { MaterialCommunityIcons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Platform, View, Text, StyleSheet, Animated } from 'react-native';
import { useEffect, useState, useRef } from 'react';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../styles/theme';
import ApiService from '../services/api';
import * as Updates from 'expo-updates'; // 🔥 Importa expo-updates

// Screens
import BookingsScreen from '../screens/BookingsScreen';
import HomeScreen from '../screens/HomeScreen';
import LoginScreen from '../screens/LoginScreen';
import SlotsScreen from '../screens/SlotsScreen';
import ScegliDataScreen from '../screens/ScegliDataScreen';
import UpdatesScreen from '../screens/UpdatesScreen';
import PaymentsScreen from '../screens/PaymentsScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const BookingStack = createNativeStackNavigator();

// Stack per le prenotazioni
function BookingStackScreen() {
  return (
    <BookingStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <BookingStack.Screen name="ScegliData" component={ScegliDataScreen} />
      <BookingStack.Screen name="ScegliSlot" component={SlotsScreen} />
    </BookingStack.Navigator>
  );
}

// 🔔 Componente Icona con Campanella Animata
function AnimatedBellIcon({ color, size, hasNotification }) {
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (hasNotification) {
      const startAnimation = () => {
        Animated.sequence([
          Animated.timing(rotateAnim, {
            toValue: -0.3,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(rotateAnim, {
            toValue: 0.3,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(rotateAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.timing(scaleAnim, {
              toValue: 1.2,
              duration: 100,
              useNativeDriver: true,
            }),
            Animated.timing(scaleAnim, {
              toValue: 1,
              duration: 100,
              useNativeDriver: true,
            }),
          ]),
        ]).start(() => {
          setTimeout(startAnimation, 3000);
        });
      };

      startAnimation();
    } else {
      rotateAnim.setValue(0);
      scaleAnim.setValue(1);
    }
  }, [hasNotification]);

  const rotateStyle = {
    transform: [
      { 
        rotate: rotateAnim.interpolate({
          inputRange: [-1, 1],
          outputRange: ['-30deg', '30deg']
        })
      },
      { scale: scaleAnim }
    ]
  };

  return (
    <View style={styles.iconContainer}>
      <Animated.View style={hasNotification ? rotateStyle : null}>
        <MaterialCommunityIcons 
          name={hasNotification ? "bell-ring" : "bell"} 
          size={size} 
          color={color} 
        />
      </Animated.View>
      
      {hasNotification && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>!</Text>
        </View>
      )}
    </View>
  );
}

// 🔄 Componente Icona Aggiornamenti con Notifica
function AnimatedUpdateIcon({ color, size, hasUpdate }) {
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (hasUpdate) {
      // Animazione rotazione continua
      Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        })
      ).start();

      // Animazione pulsante per il badge
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.3,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      rotateAnim.setValue(0);
      pulseAnim.setValue(1);
    }
  }, [hasUpdate]);

  const rotateStyle = {
    transform: [
      { 
        rotate: rotateAnim.interpolate({
          inputRange: [0, 1],
          outputRange: ['0deg', '360deg']
        })
      }
    ]
  };

  const pulseStyle = {
    transform: [{ scale: pulseAnim }]
  };

  return (
    <View style={styles.iconContainer}>
      <Animated.View style={hasUpdate ? rotateStyle : null}>
        <MaterialCommunityIcons 
          name={hasUpdate ? "update" : "information"} 
          size={size} 
          color={color} 
        />
      </Animated.View>
      
      {hasUpdate && (
        <Animated.View style={[styles.updateBadge, pulseStyle]}>
          <Text style={styles.badgeText}>!</Text>
        </Animated.View>
      )}
    </View>
  );
}

// 🔥 FUNZIONE: Confronta versioni (es: "1.0.2" vs "1.0.3")
function compareVersions(currentVersion, latestVersion) {
  if (!currentVersion || !latestVersion) return false;
  
  try {
    const currentParts = currentVersion.split('.').map(Number);
    const latestParts = latestVersion.split('.').map(Number);
    
    // Confronta major, minor, patch
    for (let i = 0; i < Math.max(currentParts.length, latestParts.length); i++) {
      const currentPart = currentParts[i] || 0;
      const latestPart = latestParts[i] || 0;
      
      if (latestPart > currentPart) {
        return true; // Nuova versione disponibile
      } else if (latestPart < currentPart) {
        return false; // Versione corrente è più nuova
      }
    }
    
    return false; // Versioni uguali
  } catch (error) {
    console.error('Errore nel confronto versioni:', error);
    return false;
  }
}

function MainTabs() {
  const insets = useSafeAreaInsets();
  const [hasPendingPayment, setHasPendingPayment] = useState(false);
  const [hasNewUpdate, setHasNewUpdate] = useState(false);
  const [currentAppVersion, setCurrentAppVersion] = useState(null);
  
  useEffect(() => {
    // Ottieni la versione corrente dell'app
    getCurrentAppVersion();
    checkForPayments();
    checkForUpdates();
    
    const interval = setInterval(() => {
      checkForPayments();
      checkForUpdates();
    }, 120000);
    
    return () => clearInterval(interval);
  }, [currentAppVersion]); // 🔥 Riassegna quando currentAppVersion cambia

  // 🔥 Ottieni la versione corrente dell'app
  const getCurrentAppVersion = async () => {
    try {
      // Metodo 1: Usa expo-updates (consigliato)
      if (Updates) {
        const update = await Updates.checkForUpdateAsync();
        const version = Updates.runtimeVersion || Updates.manifest?.version;
        setCurrentAppVersion(version);
        console.log('📱 Versione app corrente:', version);
      } else {
        // Metodo 2: Usa app.json (fallback)
        const appConfig = require('../../app.json');
        const version = appConfig.expo.version;
        setCurrentAppVersion(version);
        console.log('📱 Versione app corrente (fallback):', version);
      }
    } catch (error) {
      console.error('Errore nel recupero versione app:', error);
      // Metodo 3: Versione hardcodata (ultima risorsa)
      setCurrentAppVersion('1.0.2'); // 🔥 SOSTITUISCI con la tua versione attuale
    }
  };

  const checkForPayments = async () => {
    try {
      const { email } = await ApiService.getSavedCredentials();
      if (!email) {
        setHasPendingPayment(false);
        return;
      }

      const result = await ApiService.getPaymentInfo(email);
      console.log('💰 Controllo pagamenti:', result);
      
      if (result.success && result.hasPayment) {
        setHasPendingPayment(true);
      } else {
        setHasPendingPayment(false);
      }
    } catch (error) {
      console.error('Errore controllo pagamenti:', error);
      setHasPendingPayment(false);
    }
  };

  const checkForUpdates = async () => {
    try {
      const result = await ApiService.getAppUpdateInfo();
      console.log('🔄 Controllo aggiornamenti:', result);
      
      if (result.success && result.updateAvailable && result.latestVersion) {
        // 🔥 CONFRONTA LE VERSIONI
        const isNewVersionAvailable = compareVersions(currentAppVersion, result.latestVersion);
        
        if (isNewVersionAvailable) {
          setHasNewUpdate(true);
          console.log(`🆕 NUOVA VERSIONE DISPONIBILE: ${currentAppVersion} → ${result.latestVersion}`);
        } else {
          setHasNewUpdate(false);
          console.log(`✅ APP AGGIORNATA: ${currentAppVersion} (ultima: ${result.latestVersion})`);
        }
      } else {
        setHasNewUpdate(false);
        console.log('📱 Nessun aggiornamento disponibile');
      }
    } catch (error) {
      console.error('Errore controllo aggiornamenti:', error);
      setHasNewUpdate(false);
    }
  };
  
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.backgroundLight,
          borderTopColor: colors.cardBorder,
          borderTopWidth: 1,
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Slots"
        component={BookingStackScreen}
        options={{
          tabBarLabel: 'Prenota',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="calendar-plus" size={size} color={color} />
          ),
        }}
      />
      
      {/* 🔔 TAB PAGAMENTI CON CAMPANELLA ANIMATA */}
      <Tab.Screen
        name="Payments"
        component={PaymentsScreen}
        listeners={{
          tabPress: () => {
            checkForPayments();
          },
          focus: () => {
            checkForPayments();
          },
        }}
        options={{
          tabBarLabel: hasPendingPayment ? 'Pagamento 🔔' : 'Pagamenti',
          tabBarIcon: ({ color, size }) => (
            <AnimatedBellIcon 
              color={color} 
              size={size} 
              hasNotification={hasPendingPayment}
            />
          ),
        }}
      />
      
      <Tab.Screen
        name="Bookings"
        component={BookingsScreen}
        options={{
          tabBarLabel: 'Prenotazioni',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="bookmark" size={size} color={color} />
          ),
        }}
      />
      
      {/* 🔄 TAB AGGIORNAMENTI - NOTIFICA SOLO SE VERSIONE DIVERSA */}
      <Tab.Screen
        name="Updates"
        component={UpdatesScreen}
        listeners={{
          tabPress: () => {
            checkForUpdates();
          },
          focus: () => {
            checkForUpdates();
          },
        }}
        options={{
          tabBarLabel: hasNewUpdate ? 'News 🆕' : 'Aggiornamenti',
          tabBarIcon: ({ color, size }) => (
            <AnimatedUpdateIcon 
              color={color} 
              size={size} 
              hasUpdate={hasNewUpdate}
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

// Stili (rimangono uguali)
const styles = StyleSheet.create({
  iconContainer: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -6,
    backgroundColor: colors.error,
    borderRadius: 8,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.backgroundLight,
    zIndex: 1,
  },
  updateBadge: {
    position: 'absolute',
    top: -4,
    right: -6,
    backgroundColor: colors.warning,
    borderRadius: 8,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.backgroundLight,
    zIndex: 1,
  },
  badgeText: {
    color: colors.textPrimary,
    fontSize: 10,
    fontWeight: 'bold',
  },
});

export default function AppNavigator() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.background },
          }}
        >
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Main" component={MainTabs} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}