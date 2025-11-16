import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import ApiService from '../services/api';
import { borderRadius, colors, spacing, typography } from '../styles/theme';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [requestingCode, setRequestingCode] = useState(false);
  const [codeSent, setCodeSent] = useState(false);

  // Auto-login se credenziali salvate
  useEffect(() => {
    checkAutoLogin();
  }, []);

  const checkAutoLogin = async () => {
    try {
      const { email, code } = await ApiService.getSavedCredentials();
      if (email && code) {
        setEmail(email);
        setCode(code);
        // Auto-login
        handleLogin(email, code, true);
      }
    } catch (error) {
      console.log('No saved credentials');
    }
  };

  const handleRequestCode = async () => {
    if (!email || !email.includes('@')) {
      Alert.alert('Errore', 'Inserisci un indirizzo email valido');
      return;
    }

    setRequestingCode(true);
    try {
      const result = await ApiService.requestCode(email);
      
      if (result.success) {
        setCodeSent(true);
        Alert.alert(
          'Codice Inviato! ✅',
          result.message || 'Controlla la tua email per il codice di accesso.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Errore', result.message || 'Impossibile inviare il codice');
      }
    } catch (error) {
      Alert.alert('Errore', error.message);
    } finally {
      setRequestingCode(false);
    }
  };

  const handleLogin = async (emailParam, codeParam, silent = false) => {
    const emailToUse = emailParam || email;
    const codeToUse = codeParam || code;

    if (!emailToUse || !codeToUse) {
      Alert.alert('Errore', 'Inserisci email e codice di accesso');
      return;
    }

    setLoading(true);
    try {
      const result = await ApiService.login(emailToUse, codeToUse);
      
      if (result.found) {
        // Controlla stato abbonamento e certificato
        if (!result.isPaid) {
          Alert.alert(
            'Abbonamento Non Valido',
            'Il tuo abbonamento non è attivo. Contatta la reception per maggiori informazioni.',
            [{ text: 'OK' }]
          );
        } else if (result.certificateExpired) {
          Alert.alert(
            'Certificato Medico Scaduto',
            `Il tuo certificato medico è scaduto il ${result.certificateExpiryString}. Devi rinnovarlo per poter prenotare.`,
            [{ text: 'OK' }]
          );
        }
        
        // Naviga alla dashboard comunque (l'utente può vedere il suo stato)
        navigation.replace('Main', { userData: result });
        
      } else {
        if (!silent) {
          Alert.alert(
            'Accesso Negato',
            result.error || 'Credenziali non valide o codice scaduto'
          );
        }
      }
    } catch (error) {
      if (!silent) {
        Alert.alert('Errore di Connessione', error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header con logo */}
        <View style={styles.header}>
          <MaterialCommunityIcons name="dumbbell" size={48} color={colors.primary} />
          <Text style={styles.logoText}>LIFT</Text>
        </View>

        {/* Titolo */}
        <Text style={styles.welcomeText}>Bentornato!</Text>

        {/* Form */}
        <View style={styles.form}>
          {/* Email Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Il tuo indirizzo email"
                placeholderTextColor={colors.textTertiary}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
              />
            </View>
          </View>

          {/* Code Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Codice di Accesso</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Il tuo codice"
                placeholderTextColor={colors.textTertiary}
                value={code}
                onChangeText={(text) => setCode(text.toUpperCase())}
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={8}
                editable={!loading}
              />
            </View>
            
            {/* Richiedi Codice Button */}
            <TouchableOpacity
              style={styles.requestCodeButton}
              onPress={handleRequestCode}
              disabled={requestingCode || loading}
            >
              {requestingCode ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Text style={styles.requestCodeText}>
                  {codeSent ? '📧 Codice inviato! Controlla email' : 'Non hai il codice? Richiedilo'}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Login Button */}
          <TouchableOpacity
            style={[styles.loginButton, loading && styles.loginButtonDisabled]}
            onPress={() => handleLogin()}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color={colors.textPrimary} />
            ) : (
              <Text style={styles.loginButtonText}>Accedi</Text>
            )}
          </TouchableOpacity>

          {/* Info Note */}
          <View style={styles.infoBox}>
            <MaterialCommunityIcons 
              name="information-outline" 
              size={20} 
              color={colors.primary} 
            />
            <Text style={styles.infoText}>
              Il codice ha validità di 24 ore e può essere usato una sola volta
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl * 2,
    paddingBottom: spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  logoText: {
    ...typography.h1,
    fontSize: 36,
    fontWeight: 'bold',
    letterSpacing: 2,
    marginTop: spacing.md,
  },
  welcomeText: {
    ...typography.h2,
    fontSize: 32,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  form: {
    width: '100%',
  },
  inputGroup: {
    marginBottom: spacing.lg,
  },
  label: {
    ...typography.body,
    marginBottom: spacing.sm,
    fontWeight: '600',
  },
  inputContainer: {
    backgroundColor: colors.inputBackground,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.inputBorder,
  },
  input: {
    ...typography.body,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    color: colors.textPrimary,
  },
  requestCodeButton: {
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  requestCodeText: {
    ...typography.bodySmall,
    color: colors.primary,
    fontWeight: '600',
  },
  loginButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md + 2,
    alignItems: 'center',
    marginTop: spacing.md,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  loginButtonDisabled: {
    backgroundColor: colors.buttonDisabled,
    shadowOpacity: 0,
  },
  loginButtonText: {
    ...typography.h3,
    fontWeight: 'bold',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.xl,
    alignItems: 'flex-start',
  },
  infoText: {
    ...typography.bodySmall,
    flex: 1,
    marginLeft: spacing.sm,
    lineHeight: 20,
  },
});