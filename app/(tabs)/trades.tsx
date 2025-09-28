import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    SafeAreaView,
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

export default function TradesScreen() {
  const { user } = useAuth();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedTrades, setSelectedTrades] = useState<string[]>([]);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  const fetchTrades = useCallback(async (page = 0, reset = true) => {
    if (!user) return;

    try {
      if (reset) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const pageSize = 20;
      const from = page * pageSize;
      const to = from + pageSize - 1;

      // First, get the total count
      const { count, error: countError } = await supabase
        .from('trades')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      if (countError) {
        console.error('Error fetching trade count:', countError);
        return;
      }

      setTotalCount(count || 0);

      // Then fetch the paginated data
      const { data, error } = await supabase
        .from('trades')
        .select('*')
        .eq('user_id', user.id)
        .order('entry_date', { ascending: false })
        .range(from, to);

      if (error) {
        console.error('Error fetching trades:', error);
        return;
      }

      if (reset) {
        setTrades(data || []);
        setCurrentPage(0);
      } else {
        setTrades(prev => [...prev, ...(data || [])]);
        setCurrentPage(page);
      }

      // Check if there are more records
      const hasMoreRecords = (data?.length || 0) === pageSize && (from + pageSize) < (count || 0);
      setHasMore(hasMoreRecords);
    } catch (error) {
      console.error('Error fetching trades:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [user]);

  useEffect(() => {
    fetchTrades(0, true);
  }, [fetchTrades]);

  const loadMoreTrades = useCallback(() => {
    if (!loadingMore && hasMore) {
      fetchTrades(currentPage + 1, false);
    }
  }, [loadingMore, hasMore, currentPage, fetchTrades]);

  const handleTradeSelect = (tradeId: string) => {
    setSelectedTrades(prev => 
      prev.includes(tradeId) 
        ? prev.filter(id => id !== tradeId)
        : [...prev, tradeId]
    );
  };

  const handleSelectAll = () => {
    if (selectedTrades.length === trades.length) {
      setSelectedTrades([]);
    } else {
      setSelectedTrades(trades.map(trade => trade.id));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedTrades.length === 0) return;

    Alert.alert(
      'Delete Trades',
      `Are you sure you want to delete ${selectedTrades.length} trade(s)?`,
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
                .in('id', selectedTrades);

              if (error) {
                Alert.alert('Error', 'Failed to delete trades');
                return;
              }

              setSelectedTrades([]);
              setShowBulkActions(false);
              fetchTrades(0, true);
            } catch (error) {
              Alert.alert('Error', 'Failed to delete trades');
            }
          }
        }
      ]
    );
  };

  const handleTradePress = (trade: Trade) => {
    // Navigate to trade details page
    router.push(`/trade-details/${trade.id}`);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric'
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

  const renderTradeRow = ({ item: trade }: { item: Trade }) => (
    <TouchableOpacity
      style={styles.tradeRow}
      onPress={() => handleTradePress(trade)}
    >
      <TouchableOpacity
        style={styles.checkbox}
        onPress={() => handleTradeSelect(trade.id)}
      >
        <View style={[
          styles.checkboxInner,
          selectedTrades.includes(trade.id) && styles.checkboxSelected
        ]}>
          {selectedTrades.includes(trade.id) && (
            <Text style={styles.checkmark}>✓</Text>
          )}
        </View>
      </TouchableOpacity>
      
      <Text style={styles.cellText}>{formatDate(trade.entry_date)}</Text>
      <Text style={styles.cellText}>{trade.symbol}</Text>
      
      <View style={[styles.statusBadge, { backgroundColor: getStatusColor(trade.status) }]}>
        <Text style={styles.statusText}>{getStatusText(trade.status)}</Text>
      </View>
      
      <Text style={styles.cellText}>
        {trade.exit_date ? formatDate(trade.exit_date) : '-'}
      </Text>
      <Text style={styles.cellText}>{formatPrice(trade.entry_price)}</Text>
      <Text style={styles.cellText}>
        {trade.exit_price ? formatPrice(trade.exit_price) : '-'}
      </Text>
      <Text style={[styles.cellText, { color: getPnLColor(trade.pnl) }]}>
        {trade.pnl !== null ? formatPrice(trade.pnl) : '-'}
      </Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={styles.loadingText}>Loading trades...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Trade History</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.settingsButton}>
            <Text style={styles.settingsIcon}>⚙️</Text>
          </TouchableOpacity>
          
          {selectedTrades.length > 0 && (
            <TouchableOpacity
              style={styles.bulkActionsButton}
              onPress={() => setShowBulkActions(!showBulkActions)}
            >
              <Text style={styles.bulkActionsText}>
                Bulk actions ({selectedTrades.length}) ▼
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Bulk Actions Menu */}
      {showBulkActions && (
        <View style={styles.bulkActionsMenu}>
          <TouchableOpacity
            style={styles.bulkActionItem}
            onPress={handleBulkDelete}
          >
            <Text style={styles.bulkActionText}>Delete Selected</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Table Header */}
      <View style={styles.tableHeader}>
        <TouchableOpacity style={styles.checkbox} onPress={handleSelectAll}>
          <View style={[
            styles.checkboxInner,
            selectedTrades.length === trades.length && styles.checkboxSelected
          ]}>
            {selectedTrades.length === trades.length && (
              <Text style={styles.checkmark}>✓</Text>
            )}
          </View>
        </TouchableOpacity>
        
        <Text style={styles.headerText}>Open date</Text>
        <Text style={styles.headerText}>Symbol</Text>
        <Text style={styles.headerText}>Status</Text>
        <Text style={styles.headerText}>Close date</Text>
        <Text style={styles.headerText}>Entry price</Text>
        <Text style={styles.headerText}>Exit price</Text>
        <Text style={styles.headerText}>Net P&L</Text>
      </View>

      {/* Trades List */}
      {trades.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No trades found</Text>
          <Text style={styles.emptySubtext}>Start by adding your first trade</Text>
        </View>
      ) : (
        <FlatList
          data={trades}
          renderItem={renderTradeRow}
          keyExtractor={(item) => item.id}
          style={styles.tradesList}
          showsVerticalScrollIndicator={true}
          onEndReached={loadMoreTrades}
          onEndReachedThreshold={0.1}
          ListFooterComponent={() => (
            loadingMore ? (
              <View style={styles.loadingMoreContainer}>
                <ActivityIndicator size="small" color="#FFFFFF" />
                <Text style={styles.loadingMoreText}>Loading more trades...</Text>
              </View>
            ) : !hasMore && trades.length > 0 ? (
              <View style={styles.endOfListContainer}>
                <Text style={styles.endOfListText}>
                  Showing {trades.length} of {totalCount} trades
                </Text>
              </View>
            ) : null
          )}
        />
      )}
      
      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/add-trade')}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#E5E5E5',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsIcon: {
    fontSize: 18,
  },
  bulkActionsButton: {
    backgroundColor: '#1A1A1A',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  bulkActionsText: {
    color: '#E5E5E5',
    fontSize: 14,
    fontWeight: '500',
  },
  bulkActionsMenu: {
    backgroundColor: '#1A1A1A',
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  bulkActionItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  bulkActionText: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: '500',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#1A1A1A',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  headerText: {
    color: '#CCCCCC',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  tradesList: {
    flex: 1,
  },
  tradeRow: {
    flexDirection: 'row',
    backgroundColor: '#000000',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A1A',
    alignItems: 'center',
  },
  checkbox: {
    width: 24,
    height: 24,
    marginRight: 12,
  },
  checkboxInner: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#555555',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
  },
  checkmark: {
    color: '#000000',
    fontSize: 12,
    fontWeight: 'bold',
  },
  cellText: {
    color: '#E5E5E5',
    fontSize: 14,
    flex: 1,
    textAlign: 'center',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginHorizontal: 4,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  emptyText: {
    color: '#CCCCCC',
    fontSize: 18,
    fontWeight: '500',
    marginBottom: 8,
  },
  emptySubtext: {
    color: '#999999',
    fontSize: 14,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: 100,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabText: {
    color: '#000000',
    fontSize: 24,
    fontWeight: 'bold',
  },
  loadingMoreContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  loadingMoreText: {
    color: '#CCCCCC',
    fontSize: 14,
  },
  endOfListContainer: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  endOfListText: {
    color: '#999999',
    fontSize: 14,
  },
});
