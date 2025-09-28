import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

interface Trade {
  id: string;
  symbol: string;
  side: string;
  trade_type: string;
  asset_type: string;
  entry_price: number;
  exit_price: number | null;
  stop_loss: number | null;
  standard_lot_size: number;
  quantity: number;
  commission: number;
  pnl: number | null;
  status: string;
  entry_date: string;
  exit_date: string | null;
  strategy_id: string | null;
  tags: string[] | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export default function TradeDetailsScreen() {
  const { user } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [trade, setTrade] = useState<Trade | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchTrade = useCallback(async () => {
    if (!user || !id) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('trades')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error fetching trade:', error);
        Alert.alert('Error', 'Trade not found');
        router.back();
        return;
      }

      setTrade(data);
    } catch (error) {
      console.error('Error fetching trade:', error);
      Alert.alert('Error', 'Failed to load trade details');
      router.back();
    } finally {
      setLoading(false);
    }
  }, [user, id]);

  useEffect(() => {
    fetchTrade();
  }, [fetchTrade]);

  const handleDelete = () => {
    if (!trade) return;

    Alert.alert(
      'Delete Trade',
      'Are you sure you want to delete this trade?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('trades')
                .delete()
                .eq('id', trade.id);

              if (error) {
                Alert.alert('Error', 'Failed to delete trade');
                return;
              }

              Alert.alert('Success', 'Trade deleted successfully', [
                { text: 'OK', onPress: () => router.back() }
              ]);
            } catch (error) {
              Alert.alert('Error', 'Failed to delete trade');
            }
          }
        }
      ]
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatPrice = (price: number) => {
    return `$${price.toFixed(2)}`;
  };

  const getStatusColor = (status: string) => {
    return status === 'closed' ? '#10B981' : '#F59E0B';
  };

  const getStatusText = (status: string) => {
    return status === 'closed' ? 'CLOSED' : 'OPEN';
  };

  const getPnLColor = (pnl: number | null) => {
    if (pnl === null) return '#CCCCCC';
    return pnl >= 0 ? '#10B981' : '#EF4444';
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={styles.loadingText}>Loading trade details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!trade) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Trade not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Trade Details</Text>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={handleDelete}
        >
          <Text style={styles.deleteButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          {/* Basic Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Basic Information</Text>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Symbol</Text>
              <Text style={styles.infoValue}>{trade.symbol}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Trade Type</Text>
              <Text style={styles.infoValue}>{trade.trade_type}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Asset Type</Text>
              <Text style={styles.infoValue}>{trade.asset_type}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Status</Text>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(trade.status) }]}>
                <Text style={styles.statusText}>{getStatusText(trade.status)}</Text>
              </View>
            </View>
          </View>

          {/* Pricing Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pricing Information</Text>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Entry Price</Text>
              <Text style={styles.infoValue}>{formatPrice(trade.entry_price)}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Exit Price</Text>
              <Text style={styles.infoValue}>
                {trade.exit_price ? formatPrice(trade.exit_price) : 'N/A'}
              </Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Stop Loss</Text>
              <Text style={styles.infoValue}>
                {trade.stop_loss ? formatPrice(trade.stop_loss) : 'N/A'}
              </Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Quantity</Text>
              <Text style={styles.infoValue}>{trade.quantity}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Commission</Text>
              <Text style={styles.infoValue}>{formatPrice(trade.commission)}</Text>
            </View>
            
            {trade.asset_type === 'Option' && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Standard Lot Size</Text>
                <Text style={styles.infoValue}>{trade.standard_lot_size}</Text>
              </View>
            )}
          </View>

          {/* Dates */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Dates</Text>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Entry Date</Text>
              <Text style={styles.infoValue}>{formatDate(trade.entry_date)}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Exit Date</Text>
              <Text style={styles.infoValue}>
                {trade.exit_date ? formatDate(trade.exit_date) : 'N/A'}
              </Text>
            </View>
          </View>

          {/* Performance */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Performance</Text>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Net P&L</Text>
              <Text style={[styles.infoValue, { color: getPnLColor(trade.pnl) }]}>
                {trade.pnl !== null ? formatPrice(trade.pnl) : 'N/A'}
              </Text>
            </View>
          </View>

          {/* Tags */}
          {trade.tags && trade.tags.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Tags</Text>
              <View style={styles.tagsContainer}>
                {trade.tags.map((tag, index) => (
                  <View key={index} style={styles.tag}>
                    <Text style={styles.tagText}>{tag}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Notes */}
          {trade.notes && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Notes</Text>
              <Text style={styles.notesText}>{trade.notes}</Text>
            </View>
          )}

          {/* Metadata */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Metadata</Text>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Created</Text>
              <Text style={styles.infoValue}>{formatDate(trade.created_at)}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Last Updated</Text>
              <Text style={styles.infoValue}>{formatDate(trade.updated_at)}</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 18,
    fontWeight: '500',
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
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  backButtonText: {
    color: '#E5E5E5',
    fontSize: 16,
    fontWeight: '500',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#E5E5E5',
  },
  deleteButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  deleteButtonText: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  section: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#E5E5E5',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  infoLabel: {
    color: '#CCCCCC',
    fontSize: 16,
    fontWeight: '500',
  },
  infoValue: {
    color: '#E5E5E5',
    fontSize: 16,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: '#2A2A2A',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  tagText: {
    color: '#E5E5E5',
    fontSize: 14,
    fontWeight: '500',
  },
  notesText: {
    color: '#E5E5E5',
    fontSize: 16,
    lineHeight: 24,
  },
});
