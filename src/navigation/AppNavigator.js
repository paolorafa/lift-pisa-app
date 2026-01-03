import { MaterialCommunityIcons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useEffect, useRef, useState } from 'react';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../styles/theme';
import { AppProvider, useApp } from '../context/AppContext';

// Screens
import BookingsScreen from '../screens/BookingsScreen';
import HomeScreen from '../screens/HomeScreen';
import LoginScreen from '../screens/LoginScreen';
import SlotsScreen from '../screens/SlotsScreen';
import ScegliDataScreen from '../screens/ScegliDataScreen';
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

function MainTabs() {
  const insets = useSafeAreaInsets();
  const { paymentData, loadPayments } = useApp();
  const [hasPendingPayment, setHasPendingPayment] = useState(false);

  // Controlla pagamenti quando il componente monta
  useEffect(() => {
    checkForPayments();
  }, [paymentData]);

  const checkForPayments = () => {
    if (paymentData?.success && paymentData?.hasPayment) {
      setHasPendingPayment(true);
    } else {
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
            loadPayments(); // Ricarica quando si clicca
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
    </Tab.Navigator>
  );
}

// Stili
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
  badgeText: {
    color: colors.textPrimary,
    fontSize: 10,
    fontWeight: 'bold',
  },
});

// ⚡ APP NAVIGATOR CON CONTEXT PROVIDER
export default function AppNavigator() {
  return (
    <SafeAreaProvider>
      <AppProvider>
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
      </AppProvider>
    </SafeAreaProvider>
  );
}