import { MaterialCommunityIcons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Platform, View, Text, StyleSheet } from 'react-native';
import { useEffect, useState } from 'react'; // ✅ CORRETTO: import da 'react'
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../styles/theme';
import ApiService from '../services/api';

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

function MainTabs() {
  const insets = useSafeAreaInsets();
  const [hasPendingPayment, setHasPendingPayment] = useState(false);
  
  useEffect(() => {
    checkForPayments();
  }, []);

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
        console.log('✅ Badge pagamento ATTIVATO - Pagamento pendente');
      } else {
        setHasPendingPayment(false);
        console.log('❌ Badge pagamento DISATTIVATO - Nessun pagamento');
      }
    } catch (error) {
      console.error('Errore controllo pagamenti:', error);
      setHasPendingPayment(false);
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
          // ⭐ Altezza dinamica basata su safe area
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
      
      {/* 🔥 TAB PAGAMENTI SEMPRE VISIBILE CON BADGE */}
      <Tab.Screen
        name="Payments"
        component={PaymentsScreen}
        listeners={{
          tabPress: () => {
            // Ricarica i dati quando si clicca sul tab
            checkForPayments();
          },
        }}
        options={{
          tabBarLabel: hasPendingPayment ? 'Pagamento 🔔' : 'Pagamenti',
          tabBarIcon: ({ color, size }) => (
            <View style={styles.iconContainer}>
              <MaterialCommunityIcons 
                name="credit-card" 
                size={size} 
                color={color} 
              />
              {hasPendingPayment && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>!</Text>
                </View>
              )}
            </View>
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
      
      <Tab.Screen
        name="Updates"
        component={UpdatesScreen}
        options={{
          tabBarLabel: 'Aggiornamenti',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="update" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

// Stili per il badge
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