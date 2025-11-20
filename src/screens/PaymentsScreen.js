// [file name]: screens/PaymentsScreen.js
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  Alert,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import ApiService from '../services/api';
import { borderRadius, colors, spacing, typography } from '../styles/theme';

export default function PaymentsScreen({ navigation }) {
  const [paymentData, setPaymentData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPaymentData();
  }, []);

  const loadPaymentData = async () => {
    try {
      console.log('🔄 Caricamento dati pagamento...');
      const { email } = await ApiService.getSavedCredentials();
      const result = await ApiService.getPaymentInfo(email);
      console.log('💰 Risultato pagamento:', result);
      
      setPaymentData(result);
    } catch (error) {
      console.error('❌ Errore caricamento pagamento:', error);
      setPaymentData({ success: false, hasPayment: false });
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!paymentData?.paymentLink) return;

    try {
      console.log('🔗 Apertura link pagamento:', paymentData.paymentLink);
      const supported = await Linking.canOpenURL(paymentData.paymentLink);
      
      if (supported) {
        await Linking.openURL(paymentData.paymentLink);
        
        // Mostra un avviso
        Alert.alert(
          'Pagamento Avviato',
          'Completa il pagamento nella pagina che si è aperta.\n\nTorna qui dopo aver completato.',
          [{ text: 'Ho Capito' }]
        );
      } else {
        Alert.alert('Errore', 'Impossibile aprire il link di pagamento');
      }
    } catch (error) {
      Alert.alert('Errore', 'Si è verificato un errore durante l\'apertura del pagamento');
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <MaterialCommunityIcons name="loading" size={48} color={colors.primary} />
        <Text style={styles.loadingText}>Caricamento pagamento...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Pagamento</Text>
      </View>

      {!paymentData?.success ? (
        <View style={styles.errorCard}>
          <MaterialCommunityIcons name="alert-circle" size={64} color={colors.error} />
          <Text style={styles.errorTitle}>Errore</Text>
          <Text style={styles.errorText}>
            Impossibile caricare i dati di pagamento
          </Text>
        </View>
      ) : paymentData?.hasPayment ? (
        <View style={styles.paymentCard}>
          <MaterialCommunityIcons name="credit-card-fast" size={64} color={colors.warning} />
          <Text style={styles.paymentTitle}>Pagamento in Sospeso</Text>
          
          {paymentData.importo && (
            <Text style={styles.amountText}>Importo: {paymentData.importo}</Text>
          )}
          
          {paymentData.scadenza && (
            <Text style={styles.dueDateText}>Scadenza: {paymentData.scadenza}</Text>
          )}
          
          <Text style={styles.paymentDescription}>
            {paymentData.descrizione || 'È disponibile un pagamento in sospeso per il tuo abbonamento.'}
          </Text>
          
          <TouchableOpacity style={styles.payButton} onPress={handlePayment}>
            <MaterialCommunityIcons name="lock-open-outline" size={24} color={colors.textPrimary} />
            <Text style={styles.payButtonText}>Procedi al Pagamento</Text>
          </TouchableOpacity>
          
          <Text style={styles.noteText}>
            Clicca il pulsante sopra per completare il pagamento in modo sicuro.
          </Text>
        </View>
      ) : (
        <View style={styles.noPaymentCard}>
          <MaterialCommunityIcons name="check-circle-outline" size={64} color={colors.success} />
          <Text style={styles.noPaymentTitle}>Nessun Pagamento in Sospeso</Text>
          <Text style={styles.noPaymentDescription}>
            Al momento non ci sono pagamenti pendenti. Tutto è in regola!
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingVertical: spacing.lg,
  },
  headerTitle: {
    ...typography.h1,
    textAlign: 'center',
  },
  paymentCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.warning,
  },
  paymentTitle: {
    ...typography.h2,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
    color: colors.warning,
  },
  amountText: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  dueDateText: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  paymentDescription: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 24,
  },
  payButton: {
    flexDirection: 'row',
    backgroundColor: colors.warning,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  payButtonText: {
    ...typography.h3,
    fontWeight: 'bold',
    marginLeft: spacing.sm,
  },
  noteText: {
    ...typography.bodySmall,
    color: colors.textTertiary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  noPaymentCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  noPaymentTitle: {
    ...typography.h2,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  noPaymentDescription: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  errorCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.error,
  },
  errorTitle: {
    ...typography.h2,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
    color: colors.error,
  },
  errorText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
});