import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

interface UserSettings {
  id: string;
  user_id: string;
  ib_flex_query_id: string | null;
  ib_flex_token: string | null;
  created_at: string;
  updated_at: string;
}

interface ImportedTrade {
  symbol: string;
  side: string;
  trade_type: string;
  asset_type: string;
  price: number; // Required field
  entry_price: number | null;
  exit_price: number | null;
  stop_loss: number | null;
  standard_lot_size: number;
  quantity: number;
  commission: number;
  pnl: number | null;
  status: string;
  entry_date: string;
  exit_date: string | null;
  notes: string | null;
}

export default function IBImportScreen() {
  const { user } = useAuth();
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [importedTrades, setImportedTrades] = useState<ImportedTrade[]>([]);
  const [importStatus, setImportStatus] = useState<string>('');
  const [showLoadingModal, setShowLoadingModal] = useState(false);

  const fetchUserSettings = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching user settings:', error);
        Alert.alert('Error', 'Failed to load settings');
        return;
      }

      setUserSettings(data);
    } catch (error) {
      console.error('Error in fetchUserSettings:', error);
      Alert.alert('Error', 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchUserSettings();
  }, [fetchUserSettings]);

  const validateCredentials = (token: string, queryId: string): string | null => {
    // Validate Flex Token format (20-30 alphanumeric characters)
    if (!/^[a-zA-Z0-9]{20,30}$/.test(token)) {
      return 'Invalid Flex Token format. Token should be 20-30 alphanumeric characters.';
    }
    
    // Validate Query ID format (6-10 digits)
    if (!/^\d{6,10}$/.test(queryId)) {
      return 'Invalid Query ID format. Query ID should be 6-10 digits.';
    }
    
    return null;
  };

  const importTrades = async () => {
    if (!userSettings?.ib_flex_query_id || !userSettings?.ib_flex_token) {
      Alert.alert(
        'Configuration Required',
        'Please configure your Interactive Brokers settings in the Settings page first.'
      );
      return;
    }

    // Validate credentials format
    const validationError = validateCredentials(
      userSettings.ib_flex_token, 
      userSettings.ib_flex_query_id
    );
    
    if (validationError) {
      Alert.alert(
        'Invalid Credentials',
        validationError + '\n\nPlease check your Flex Token and Query ID in Settings.'
      );
      return;
    }

    try {
      setImporting(true);
      setShowLoadingModal(true);
      setImportStatus('Requesting data from Interactive Brokers...\nThis may take a few minutes for large reports.');

      console.log('Calling Edge Function with:', {
        flexToken: userSettings.ib_flex_token?.substring(0, 10) + '...',
        flexQueryId: userSettings.ib_flex_query_id,
      });

      // Check if user is authenticated
      const { data: { session } } = await supabase.auth.getSession();
      console.log('User session:', session ? 'authenticated' : 'not authenticated');

      if (!session) {
        throw new Error('User not authenticated. Please log in again.');
      }

      // Call our Edge Function to handle the IB API calls with retry logic
      let data, error;
      let retryCount = 0;
      const maxRetries = 3;

      while (retryCount < maxRetries) {
        try {
          setImportStatus(`Requesting data from Interactive Brokers... (Attempt ${retryCount + 1}/${maxRetries})`);
          
          const result = await supabase.functions.invoke('import-ib-trades', {
            body: {
              flexToken: userSettings.ib_flex_token,
              flexQueryId: userSettings.ib_flex_query_id,
            },
          });

          data = result.data;
          error = result.error;

          console.log('Edge Function response:', { data, error });

          if (!error) {
            break; // Success, exit retry loop
          }

          // If it's a server error (5xx), retry
          if (error.message?.includes('500') || error.message?.includes('502') || error.message?.includes('503')) {
            retryCount++;
            if (retryCount < maxRetries) {
              const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff
              console.log(`Retrying in ${delay}ms...`);
              await new Promise(resolve => setTimeout(resolve, delay));
              continue;
            }
          }

          // For other errors, don't retry
          break;

        } catch (retryError) {
          console.error(`Attempt ${retryCount + 1} failed:`, retryError);
          retryCount++;
          
          if (retryCount < maxRetries) {
            const delay = Math.pow(2, retryCount) * 1000;
            console.log(`Retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          } else {
            throw retryError;
          }
        }
      }

      if (error) {
        console.error('Supabase function error:', error);
        throw new Error(error.message || 'Failed to call import function');
      }

      if (!data.success) {
        console.error('Function returned error:', data);
        throw new Error(data.error || 'Import failed');
      }

      setImportStatus('Checking for duplicates...');

      // Check for existing trades to prevent duplicates
      const existingTrades = await checkExistingTrades(data.trades);
      const newTrades = data.trades.filter((trade: ImportedTrade) => 
        !existingTrades.some((existing: any) => 
          existing.symbol === trade.symbol &&
          existing.entry_date === trade.entry_date &&
          existing.entry_price === trade.entry_price &&
          existing.quantity === trade.quantity
        )
      );

      setImportedTrades(newTrades);
      
      if (newTrades.length === 0) {
        setImportStatus('No new trades found. All trades already exist in your database.');
      } else if (newTrades.length < data.trades.length) {
        const duplicateCount = data.trades.length - newTrades.length;
        setImportStatus(`Found ${newTrades.length} new trades (${duplicateCount} duplicates skipped)`);
      } else {
        setImportStatus(`Successfully imported ${newTrades.length} new trades`);
      }
    } catch (error) {
      console.error('Error importing trades:', error);
      const errorMessage = (error as Error).message;
      Alert.alert('Import Error', `Failed to import trades: ${errorMessage}`);
      setImportStatus(`Import failed: ${errorMessage}`);
    } finally {
      setImporting(false);
      setShowLoadingModal(false);
    }
  };

  const checkExistingTrades = async (trades: ImportedTrade[]) => {
    if (!user || trades.length === 0) return [];

    try {
      // Get all symbols and dates from imported trades
      const symbols = [...new Set(trades.map(trade => trade.symbol))];
      const dates = [...new Set(trades.map(trade => trade.entry_date))];

      // Query existing trades that match the imported trades
      const { data, error } = await supabase
        .from('trades')
        .select('symbol, entry_date, entry_price, quantity')
        .eq('user_id', user.id)
        .in('symbol', symbols)
        .in('entry_date', dates);

      if (error) {
        console.error('Error checking existing trades:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in checkExistingTrades:', error);
      return [];
    }
  };

  const saveImportedTrades = async () => {
    if (importedTrades.length === 0) {
      Alert.alert(
        'No New Trades',
        'There are no new trades to save. All trades already exist in your database.',
        [
          {
            text: 'OK',
            onPress: () => router.push('/(tabs)/trades')
          }
        ]
      );
      return;
    }

    try {
      setImporting(true);
      setImportStatus('Saving trades to database...');

      const tradesToInsert = importedTrades.map(trade => ({
        ...trade,
        user_id: user?.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));

      const { error } = await supabase
        .from('trades')
        .insert(tradesToInsert);

      if (error) {
        throw error;
      }

      Alert.alert(
        'Success',
        `Successfully imported ${importedTrades.length} new trades`,
        [
          {
            text: 'OK',
            onPress: () => router.push('/(tabs)/trades')
          }
        ]
      );
    } catch (error) {
      console.error('Error saving trades:', error);
      Alert.alert('Error', 'Failed to save imported trades');
    } finally {
      setImporting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Interactive Brokers Import</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Content */}
        <View style={styles.content}>
          {!userSettings?.ib_flex_query_id || !userSettings?.ib_flex_token ? (
            <View style={styles.configCard}>
              <Text style={styles.configTitle}>Configuration Required</Text>
              <Text style={styles.configText}>
                Please configure your Interactive Brokers settings in the Settings page first.
              </Text>
              <TouchableOpacity
                style={styles.settingsButton}
                onPress={() => router.push('/(tabs)/explore')}
              >
                <Text style={styles.settingsButtonText}>Go to Settings</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {/* Import Button */}
              <TouchableOpacity
                style={[styles.importButton, importing && styles.disabledButton]}
                onPress={importTrades}
                disabled={importing}
              >
                <Text style={styles.importButtonText}>
                  {importing ? 'Importing...' : 'Import Trades'}
                </Text>
              </TouchableOpacity>

              {/* Status */}
              {importStatus && (
                <View style={styles.statusCard}>
                  <Text style={styles.statusText}>{importStatus}</Text>
                </View>
              )}

              {/* Imported Trades Preview */}
              {importedTrades.length > 0 && (
                <View style={styles.previewCard}>
                  <Text style={styles.previewTitle}>
                    Imported Trades ({importedTrades.length})
                  </Text>
                  
                  {importedTrades.slice(0, 5).map((trade, index) => (
                    <View key={index} style={styles.tradePreview}>
                      <Text style={styles.tradeSymbol}>{trade.symbol}</Text>
                      <Text style={styles.tradeDetails}>
                        {trade.side} • {trade.quantity} @ ${trade.price}
                      </Text>
                      <Text style={styles.tradeDate}>{trade.entry_date}</Text>
                    </View>
                  ))}
                  
                  {importedTrades.length > 5 && (
                    <Text style={styles.moreTrades}>
                      ... and {importedTrades.length - 5} more trades
                    </Text>
                  )}

                  <TouchableOpacity
                    style={styles.saveButton}
                    onPress={saveImportedTrades}
                  >
                    <Text style={styles.saveButtonText}>Save All Trades</Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}
        </View>
      </ScrollView>

      {/* Loading Modal */}
      <Modal
        visible={showLoadingModal}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.loadingModalOverlay}>
          <View style={styles.loadingModalContent}>
            <ActivityIndicator size="large" color="#3B82F6" />
            <Text style={styles.loadingModalTitle}>Importing Trades</Text>
            <Text style={styles.loadingModalText}>
              {importStatus || 'Please wait while we fetch your trade data from Interactive Brokers...'}
            </Text>
            <Text style={styles.loadingModalSubtext}>
              Interactive Brokers may need time to generate your report. This can take several minutes for large datasets.
            </Text>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#CCCCCC',
    marginTop: 16,
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  backButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  backButtonText: {
    color: '#3B82F6',
    fontSize: 16,
    fontWeight: '500',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#E5E5E5',
  },
  placeholder: {
    width: 60,
  },
  content: {
    padding: 16,
  },
  configCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  configTitle: {
    color: '#E5E5E5',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  configText: {
    color: '#CCCCCC',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  settingsButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  settingsButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  importButton: {
    backgroundColor: '#10B981',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  importButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: '#666666',
  },
  statusCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  statusText: {
    color: '#E5E5E5',
    fontSize: 14,
    textAlign: 'center',
  },
  previewCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 20,
  },
  previewTitle: {
    color: '#E5E5E5',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  tradePreview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  tradeSymbol: {
    color: '#E5E5E5',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  tradeDetails: {
    color: '#CCCCCC',
    fontSize: 14,
    flex: 2,
    textAlign: 'center',
  },
  tradeDate: {
    color: '#999999',
    fontSize: 12,
    flex: 1,
    textAlign: 'right',
  },
  moreTrades: {
    color: '#999999',
    fontSize: 14,
    textAlign: 'center',
    marginVertical: 12,
    fontStyle: 'italic',
  },
  saveButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingModalContent: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    maxWidth: 300,
    marginHorizontal: 20,
  },
  loadingModalTitle: {
    color: '#E5E5E5',
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 12,
  },
  loadingModalText: {
    color: '#CCCCCC',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 8,
  },
  loadingModalSubtext: {
    color: '#999999',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
});
