import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Edit form state
  const [editData, setEditData] = useState({
    symbol: '',
    entry_price: '',
    exit_price: '',
    stop_loss: '',
    quantity: '',
    commission: '',
    notes: '',
    status: '',
    pnl: 0,
  });
  
  // Modal states
  const [showStatusModal, setShowStatusModal] = useState(false);

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
      
      // Initialize edit data
      setEditData({
        symbol: data.symbol || '',
        entry_price: data.entry_price?.toString() || '',
        exit_price: data.exit_price?.toString() || '',
        stop_loss: data.stop_loss?.toString() || '',
        quantity: data.quantity?.toString() || '',
        commission: data.commission?.toString() || '',
        notes: data.notes || '',
        status: data.status || '',
        pnl: data.pnl || 0,
      });
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

  const calculatePnL = (entryPrice: string, exitPrice: string, quantity: string, commission: string, tradeType: string, assetType: string, lotSize: number) => {
    if (!entryPrice || !exitPrice || !quantity) {
      return 0;
    }

    const entryPriceNum = parseFloat(entryPrice);
    const exitPriceNum = parseFloat(exitPrice);
    const quantityNum = parseFloat(quantity);
    
    // For options, multiply by lot size (typically 100)
    const multiplier = assetType === 'Option' ? lotSize : 1;
    
    const entryTotal = entryPriceNum * quantityNum * multiplier;
    const exitTotal = exitPriceNum * quantityNum * multiplier;
    
    let pnl = 0;
    if (tradeType === 'Long') {
      pnl = exitTotal - entryTotal;
    } else {
      pnl = entryTotal - exitTotal;
    }
    
    // Subtract commission from profit/loss
    const commissionAmount = parseFloat(commission) || 0;
    return pnl - commissionAmount;
  };

  const handleInputChange = (field: string, value: string) => {
    setEditData(prev => {
      const updated = { ...prev, [field]: value };
      
      // Recalculate P&L when pricing fields change
      if (['entry_price', 'exit_price', 'quantity', 'commission'].includes(field)) {
        const calculatedPnL = calculatePnL(
          updated.entry_price,
          updated.exit_price,
          updated.quantity,
          updated.commission,
          trade?.side || 'Long',
          trade?.asset_type || 'Stock',
          trade?.standard_lot_size || 100
        );
        updated.pnl = calculatedPnL;
      }
      
      return updated;
    });
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    if (!trade) return;
    
    // Reset edit data to original values
    setEditData({
      symbol: trade.symbol || '',
      entry_price: trade.entry_price?.toString() || '',
      exit_price: trade.exit_price?.toString() || '',
      stop_loss: trade.stop_loss?.toString() || '',
      quantity: trade.quantity?.toString() || '',
      commission: trade.commission?.toString() || '',
      notes: trade.notes || '',
      status: trade.status || '',
      pnl: trade.pnl || 0,
    });
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!trade) return;

    // Validation
    if (!editData.symbol.trim()) {
      Alert.alert('Error', 'Symbol is required');
      return;
    }
    if (!editData.entry_price.trim()) {
      Alert.alert('Error', 'Entry price is required');
      return;
    }
    if (!editData.quantity.trim()) {
      Alert.alert('Error', 'Quantity is required');
      return;
    }

    try {
      setSaving(true);

      const updateData = {
        symbol: editData.symbol.trim(),
        entry_price: parseFloat(editData.entry_price),
        exit_price: editData.exit_price ? parseFloat(editData.exit_price) : null,
        stop_loss: editData.stop_loss ? parseFloat(editData.stop_loss) : null,
        quantity: parseFloat(editData.quantity),
        commission: parseFloat(editData.commission) || 0,
        pnl: editData.pnl,
        notes: editData.notes.trim() || null,
        status: editData.status,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('trades')
        .update(updateData)
        .eq('id', trade.id);

      if (error) {
        Alert.alert('Error', `Failed to update trade: ${error.message}`);
        return;
      }

      // Refresh trade data
      await fetchTrade();
      setIsEditing(false);
      Alert.alert('Success', 'Trade updated successfully');
    } catch (error) {
      console.error('Error updating trade:', error);
      Alert.alert('Error', 'Failed to update trade');
    } finally {
      setSaving(false);
    }
  };

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
              console.error('Error deleting trade:', error);
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
        <View style={styles.headerActions}>
          {isEditing ? (
            <>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleCancel}
                disabled={saving}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, saving && styles.disabledButton]}
                onPress={handleSave}
                disabled={saving}
              >
                <Text style={styles.saveButtonText}>
                  {saving ? 'Saving...' : 'Save'}
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity
                style={styles.editButton}
                onPress={handleEdit}
              >
                <Text style={styles.editButtonText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={handleDelete}
              >
                <Text style={styles.deleteButtonText}>Delete</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          {/* Basic Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Basic Information</Text>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Symbol</Text>
              {isEditing ? (
                <TextInput
                  style={styles.textInput}
                  value={editData.symbol}
                  onChangeText={(value) => handleInputChange('symbol', value)}
                  placeholder="Enter symbol"
                  placeholderTextColor="#666666"
                />
              ) : (
                <Text style={styles.infoValue}>{trade.symbol}</Text>
              )}
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
              {isEditing ? (
                <TouchableOpacity
                  style={[styles.statusBadge, { backgroundColor: getStatusColor(editData.status) }]}
                  onPress={() => setShowStatusModal(true)}
                >
                  <Text style={styles.statusText}>{getStatusText(editData.status)}</Text>
                </TouchableOpacity>
              ) : (
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(trade.status) }]}>
                  <Text style={styles.statusText}>{getStatusText(trade.status)}</Text>
                </View>
              )}
            </View>
          </View>

          {/* Pricing Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pricing Information</Text>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Entry Price</Text>
              {isEditing ? (
                <TextInput
                  style={styles.textInput}
                  value={editData.entry_price}
                  onChangeText={(value) => handleInputChange('entry_price', value)}
                  placeholder="0.00"
                  placeholderTextColor="#666666"
                  keyboardType="numeric"
                />
              ) : (
                <Text style={styles.infoValue}>{formatPrice(trade.entry_price)}</Text>
              )}
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Exit Price</Text>
              {isEditing ? (
                <TextInput
                  style={styles.textInput}
                  value={editData.exit_price}
                  onChangeText={(value) => handleInputChange('exit_price', value)}
                  placeholder="0.00"
                  placeholderTextColor="#666666"
                  keyboardType="numeric"
                />
              ) : (
                <Text style={styles.infoValue}>
                  {trade.exit_price ? formatPrice(trade.exit_price) : 'N/A'}
                </Text>
              )}
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Stop Loss</Text>
              {isEditing ? (
                <TextInput
                  style={styles.textInput}
                  value={editData.stop_loss}
                  onChangeText={(value) => handleInputChange('stop_loss', value)}
                  placeholder="0.00"
                  placeholderTextColor="#666666"
                  keyboardType="numeric"
                />
              ) : (
                <Text style={styles.infoValue}>
                  {trade.stop_loss ? formatPrice(trade.stop_loss) : 'N/A'}
                </Text>
              )}
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Quantity</Text>
              {isEditing ? (
                <TextInput
                  style={styles.textInput}
                  value={editData.quantity}
                  onChangeText={(value) => handleInputChange('quantity', value)}
                  placeholder="0"
                  placeholderTextColor="#666666"
                  keyboardType="numeric"
                />
              ) : (
                <Text style={styles.infoValue}>{trade.quantity}</Text>
              )}
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Commission</Text>
              {isEditing ? (
                <TextInput
                  style={styles.textInput}
                  value={editData.commission}
                  onChangeText={(value) => handleInputChange('commission', value)}
                  placeholder="0.00"
                  placeholderTextColor="#666666"
                  keyboardType="numeric"
                />
              ) : (
                <Text style={styles.infoValue}>{formatPrice(trade.commission)}</Text>
              )}
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
              <Text style={[styles.infoValue, { color: getPnLColor(isEditing ? editData.pnl : trade.pnl) }]}>
                {isEditing ? (
                  editData.pnl !== null ? formatPrice(editData.pnl) : 'N/A'
                ) : (
                  trade.pnl !== null ? formatPrice(trade.pnl) : 'N/A'
                )}
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
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notes</Text>
            {isEditing ? (
              <TextInput
                style={styles.notesInput}
                value={editData.notes}
                onChangeText={(value) => handleInputChange('notes', value)}
                placeholder="Add notes about this trade..."
                placeholderTextColor="#666666"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            ) : (
              <Text style={styles.notesText}>{trade.notes || 'No notes added'}</Text>
            )}
          </View>

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

      {/* Status Modal */}
      <Modal
        visible={showStatusModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowStatusModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Status</Text>
            <TouchableOpacity
              style={styles.modalOption}
              onPress={() => {
                handleInputChange('status', 'open');
                setShowStatusModal(false);
              }}
            >
              <Text style={styles.modalOptionText}>Open</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalOption}
              onPress={() => {
                handleInputChange('status', 'closed');
                setShowStatusModal(false);
              }}
            >
              <Text style={styles.modalOptionText}>Closed</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalCancel}
              onPress={() => setShowStatusModal(false)}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
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
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
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
  headerActions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  editButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  editButtonText: {
    color: '#10B981',
    fontSize: 16,
    fontWeight: '500',
  },
  saveButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#10B981',
    borderRadius: 6,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  cancelButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  cancelButtonText: {
    color: '#CCCCCC',
    fontSize: 16,
    fontWeight: '500',
  },
  disabledButton: {
    opacity: 0.6,
  },
  textInput: {
    backgroundColor: '#2A2A2A',
    borderWidth: 1,
    borderColor: '#444444',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#E5E5E5',
    fontSize: 16,
    minWidth: 120,
    textAlign: 'right',
  },
  notesInput: {
    backgroundColor: '#2A2A2A',
    borderWidth: 1,
    borderColor: '#444444',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: '#E5E5E5',
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 20,
    width: '80%',
    maxWidth: 300,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#E5E5E5',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#2A2A2A',
  },
  modalOptionText: {
    color: '#E5E5E5',
    fontSize: 16,
    textAlign: 'center',
  },
  modalCancel: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 8,
    backgroundColor: '#333333',
  },
  modalCancelText: {
    color: '#CCCCCC',
    fontSize: 16,
    textAlign: 'center',
  },
});
