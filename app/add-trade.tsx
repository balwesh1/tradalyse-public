import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Modal,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

interface Tag {
  id: string;
  name: string;
  color: string;
}

interface Strategy {
  id: string;
  name: string;
  description: string | null;
}

export default function AddTradeScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tags, setTags] = useState<Tag[]>([]);
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedStrategy, setSelectedStrategy] = useState<string>('');
  
  // Modal states
  const [showAssetTypeModal, setShowAssetTypeModal] = useState(false);
  const [showStrategyModal, setShowStrategyModal] = useState(false);
  const [showEntryDateModal, setShowEntryDateModal] = useState(false);
  const [showExitDateModal, setShowExitDateModal] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    symbol: '',
    tradeType: 'Long',
    assetType: 'Stock',
    entryPrice: '',
    exitPrice: '',
    stopLoss: '',
    standardLotSize: '100',
    quantity: '',
    entryDate: new Date().toISOString().split('T')[0],
    exitDate: '',
    status: 'Open',
    notes: '',
  });

  const fetchTags = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('tags')
        .select('*')
        .eq('user_id', user?.id)
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching tags:', error);
        return;
      }
      setTags(data || []);
    } catch (error) {
      console.error('Error in fetchTags:', error);
    }
  }, [user?.id]);

  const fetchStrategies = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('strategies')
        .select('*')
        .eq('user_id', user?.id)
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching strategies:', error);
        return;
      }
      setStrategies(data || []);
    } catch (error) {
      console.error('Error in fetchStrategies:', error);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user) {
      fetchTags();
      fetchStrategies();
    }
  }, [user, fetchTags, fetchStrategies]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleTag = (tagId: string) => {
    setSelectedTags(prev => 
      prev.includes(tagId) 
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    );
  };

  const assetTypes = ['Stock', 'Option', 'Future', 'Crypto', 'ETF', 'Bond'];

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  const generateDateOptions = () => {
    const dates = [];
    const today = new Date();
    for (let i = 0; i < 365; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      dates.push(date.toISOString().split('T')[0]);
    }
    return dates;
  };

  const calculateTotalCost = (price: string, quantity: string, lotSize: string) => {
    const priceNum = parseFloat(price) || 0;
    const quantityNum = parseFloat(quantity) || 0;
    const lotSizeNum = parseFloat(lotSize) || 100;
    
    if (formData.assetType === 'Option') {
      return priceNum * lotSizeNum;
    }
    return priceNum * quantityNum;
  };

  const calculatePnL = () => {
    if (!formData.exitPrice || !formData.entryPrice || !formData.quantity) {
      return 0;
    }

    const entryTotal = calculateTotalCost(formData.entryPrice, formData.quantity, formData.standardLotSize);
    const exitTotal = calculateTotalCost(formData.exitPrice, formData.quantity, formData.standardLotSize);
    
    if (formData.tradeType === 'Long') {
      return exitTotal - entryTotal;
    } else {
      return entryTotal - exitTotal;
    }
  };

  const handleSave = async () => {
    // Validation
    if (!formData.symbol.trim()) {
      Alert.alert('Error', 'Symbol is required');
      return;
    }
    if (!formData.entryPrice.trim()) {
      Alert.alert('Error', 'Entry price is required');
      return;
    }
    if (!formData.quantity.trim()) {
      Alert.alert('Error', 'Quantity is required');
      return;
    }

    try {
      setSaving(true);

      const pnl = formData.status === 'Closed' ? calculatePnL() : 0;
      const exitDate = formData.status === 'Closed' && formData.exitDate ? formData.exitDate : null;

      const { error } = await supabase
        .from('trades')
        .insert({
          user_id: user?.id,
          symbol: formData.symbol.trim(),
          side: formData.tradeType,
          trade_type: formData.tradeType,
          asset_type: formData.assetType,
          entry_price: parseFloat(formData.entryPrice),
          exit_price: formData.exitPrice ? parseFloat(formData.exitPrice) : null,
          stop_loss: formData.stopLoss ? parseFloat(formData.stopLoss) : null,
          standard_lot_size: parseFloat(formData.standardLotSize),
          quantity: parseFloat(formData.quantity),
          pnl: pnl,
          status: formData.status.toLowerCase(),
          entry_date: formData.entryDate,
          exit_date: exitDate,
          strategy_id: selectedStrategy || null,
          tags: selectedTags.length > 0 ? selectedTags : null,
          notes: formData.notes.trim() || null,
        });

      if (error) {
        Alert.alert('Error', 'Failed to save trade');
        console.error('Error saving trade:', error);
        return;
      }

      Alert.alert('Success', 'Trade saved successfully', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
      console.error('Error in handleSave:', error);
    } finally {
      setSaving(false);
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
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <SafeAreaView style={styles.container}>
        <ScrollView style={styles.scrollView}>
          <View style={styles.content}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Add New Trade</Text>
              <Text style={styles.subtitle}>Enter your trade details manually</Text>
            </View>

            {/* Basic Information */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Basic Information</Text>
              
              <View style={styles.formRow}>
                <View style={styles.formField}>
                  <Text style={styles.fieldLabel}>Symbol *</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.symbol}
                    onChangeText={(text) => handleInputChange('symbol', text)}
                    placeholder="AAPL, TSLA231018C00200000"
                    placeholderTextColor="#6B7280"
                    autoCapitalize="characters"
                  />
                </View>
              </View>

              <View style={styles.formRow}>
                <View style={styles.formField}>
                  <Text style={styles.fieldLabel}>Trade Type *</Text>
                  <View style={styles.radioGroup}>
                    <TouchableOpacity
                      style={[
                        styles.radioButton,
                        formData.tradeType === 'Long' && styles.radioButtonSelected
                      ]}
                      onPress={() => handleInputChange('tradeType', 'Long')}
                    >
                      <Text style={[
                        styles.radioButtonText,
                        formData.tradeType === 'Long' && styles.radioButtonTextSelected
                      ]}>
                        Long
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.radioButton,
                        formData.tradeType === 'Short' && styles.radioButtonSelected
                      ]}
                      onPress={() => handleInputChange('tradeType', 'Short')}
                    >
                      <Text style={[
                        styles.radioButtonText,
                        formData.tradeType === 'Short' && styles.radioButtonTextSelected
                      ]}>
                        Short
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.formField}>
                  <Text style={styles.fieldLabel}>Asset Type *</Text>
                  <TouchableOpacity
                    style={styles.dropdown}
                    onPress={() => setShowAssetTypeModal(true)}
                  >
                    <Text style={styles.dropdownText}>{formData.assetType}</Text>
                    <Text style={styles.dropdownArrow}>▼</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Pricing Information */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Pricing Information</Text>
              
              <View style={styles.formRow}>
                <View style={styles.formField}>
                  <Text style={styles.fieldLabel}>Entry Price *</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.entryPrice}
                    onChangeText={(text) => handleInputChange('entryPrice', text)}
                    placeholder="150.00"
                    placeholderTextColor="#6B7280"
                    keyboardType="numeric"
                  />
                </View>

                <View style={styles.formField}>
                  <Text style={styles.fieldLabel}>Exit Price</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.exitPrice}
                    onChangeText={(text) => handleInputChange('exitPrice', text)}
                    placeholder="155.00"
                    placeholderTextColor="#6B7280"
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={styles.formRow}>
                <View style={styles.formField}>
                  <Text style={styles.fieldLabel}>Stop Loss</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.stopLoss}
                    onChangeText={(text) => handleInputChange('stopLoss', text)}
                    placeholder="145.00"
                    placeholderTextColor="#6B7280"
                    keyboardType="numeric"
                  />
                </View>

                <View style={styles.formField}>
                  <Text style={styles.fieldLabel}>Quantity *</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.quantity}
                    onChangeText={(text) => handleInputChange('quantity', text)}
                    placeholder="100"
                    placeholderTextColor="#6B7280"
                    keyboardType="numeric"
                  />
                </View>
              </View>

              {formData.assetType === 'Option' && (
                <View style={styles.formRow}>
                  <View style={styles.formField}>
                    <Text style={styles.fieldLabel}>Standard Lot Size</Text>
                    <TextInput
                      style={styles.input}
                      value={formData.standardLotSize}
                      onChangeText={(text) => handleInputChange('standardLotSize', text)}
                      placeholder="100"
                      placeholderTextColor="#6B7280"
                      keyboardType="numeric"
                    />
                  </View>
                </View>
              )}

              {/* Cost Calculations */}
              {formData.entryPrice && formData.quantity && (
                <View style={styles.calculationBox}>
                  <Text style={styles.calculationTitle}>Cost Calculations</Text>
                  <Text style={styles.calculationText}>
                    Entry Total: ${calculateTotalCost(formData.entryPrice, formData.quantity, formData.standardLotSize).toFixed(2)}
                  </Text>
                  {formData.exitPrice && (
                    <Text style={styles.calculationText}>
                      Exit Total: ${calculateTotalCost(formData.exitPrice, formData.quantity, formData.standardLotSize).toFixed(2)}
                    </Text>
                  )}
                  {formData.exitPrice && (
                    <Text style={[
                      styles.calculationText,
                      styles.pnlText,
                      calculatePnL() >= 0 ? styles.profitText : styles.lossText
                    ]}>
                      P&L: ${calculatePnL().toFixed(2)}
                    </Text>
                  )}
                </View>
              )}
            </View>

            {/* Dates and Status */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Dates and Status</Text>
              
              <View style={styles.formRow}>
                <View style={styles.formField}>
                  <Text style={styles.fieldLabel}>Entry Date *</Text>
                  <TouchableOpacity
                    style={styles.dateButton}
                    onPress={() => setShowEntryDateModal(true)}
                  >
                    <Text style={styles.dateButtonText}>
                      {formatDate(formData.entryDate) || 'Select Date'}
                    </Text>
                    <Text style={styles.dropdownArrow}>📅</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.formField}>
                  <Text style={styles.fieldLabel}>Exit Date</Text>
                  <TouchableOpacity
                    style={styles.dateButton}
                    onPress={() => setShowExitDateModal(true)}
                  >
                    <Text style={styles.dateButtonText}>
                      {formatDate(formData.exitDate) || 'Select Date'}
                    </Text>
                    <Text style={styles.dropdownArrow}>📅</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.formRow}>
                <View style={styles.formField}>
                  <Text style={styles.fieldLabel}>Trade Status *</Text>
                  <View style={styles.radioGroup}>
                    <TouchableOpacity
                      style={[
                        styles.radioButton,
                        formData.status === 'Open' && styles.radioButtonSelected
                      ]}
                      onPress={() => handleInputChange('status', 'Open')}
                    >
                      <Text style={[
                        styles.radioButtonText,
                        formData.status === 'Open' && styles.radioButtonTextSelected
                      ]}>
                        Open
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.radioButton,
                        formData.status === 'Closed' && styles.radioButtonSelected
                      ]}
                      onPress={() => handleInputChange('status', 'Closed')}
                    >
                      <Text style={[
                        styles.radioButtonText,
                        formData.status === 'Closed' && styles.radioButtonTextSelected
                      ]}>
                        Closed
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>

            {/* Strategy and Tags */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Strategy and Tags</Text>
              
              <View style={styles.formRow}>
                <View style={styles.formField}>
                  <Text style={styles.fieldLabel}>Strategy</Text>
                  <TouchableOpacity
                    style={styles.dropdown}
                    onPress={() => setShowStrategyModal(true)}
                  >
                    <Text style={styles.dropdownText}>
                      {selectedStrategy ? strategies.find(s => s.id === selectedStrategy)?.name || 'Select Strategy' : 'None'}
                    </Text>
                    <Text style={styles.dropdownArrow}>▼</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {tags.length > 0 && (
                <View style={styles.formField}>
                  <Text style={styles.fieldLabel}>Tags</Text>
                  <View style={styles.tagsContainer}>
                    {tags.map((tag) => (
                      <TouchableOpacity
                        key={tag.id}
                        style={[
                          styles.tagButton,
                          selectedTags.includes(tag.id) && styles.tagButtonSelected,
                          { borderColor: tag.color }
                        ]}
                        onPress={() => toggleTag(tag.id)}
                      >
                        <View style={[styles.tagColor, { backgroundColor: tag.color }]} />
                        <Text style={[
                          styles.tagButtonText,
                          selectedTags.includes(tag.id) && styles.tagButtonTextSelected
                        ]}>
                          {tag.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
            </View>

            {/* Notes */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Notes</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.notes}
                onChangeText={(text) => handleInputChange('notes', text)}
                placeholder="Add any additional notes about this trade..."
                placeholderTextColor="#6B7280"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            {/* Save Button */}
            <TouchableOpacity
              style={[styles.saveButton, saving && styles.buttonDisabled]}
              onPress={handleSave}
              disabled={saving}
            >
              <Text style={styles.saveButtonText}>
                {saving ? 'Saving...' : 'Save Trade'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Asset Type Modal */}
        <Modal
          visible={showAssetTypeModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowAssetTypeModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Select Asset Type</Text>
              {assetTypes.map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.modalOption,
                    formData.assetType === type && styles.modalOptionSelected
                  ]}
                  onPress={() => {
                    handleInputChange('assetType', type);
                    setShowAssetTypeModal(false);
                  }}
                >
                  <Text style={[
                    styles.modalOptionText,
                    formData.assetType === type && styles.modalOptionTextSelected
                  ]}>
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowAssetTypeModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Strategy Modal */}
        <Modal
          visible={showStrategyModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowStrategyModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Select Strategy</Text>
              <TouchableOpacity
                style={[
                  styles.modalOption,
                  !selectedStrategy && styles.modalOptionSelected
                ]}
                onPress={() => {
                  setSelectedStrategy('');
                  setShowStrategyModal(false);
                }}
              >
                <Text style={[
                  styles.modalOptionText,
                  !selectedStrategy && styles.modalOptionTextSelected
                ]}>
                  None
                </Text>
              </TouchableOpacity>
              {strategies.map((strategy) => (
                <TouchableOpacity
                  key={strategy.id}
                  style={[
                    styles.modalOption,
                    selectedStrategy === strategy.id && styles.modalOptionSelected
                  ]}
                  onPress={() => {
                    setSelectedStrategy(strategy.id);
                    setShowStrategyModal(false);
                  }}
                >
                  <Text style={[
                    styles.modalOptionText,
                    selectedStrategy === strategy.id && styles.modalOptionTextSelected
                  ]}>
                    {strategy.name}
                  </Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowStrategyModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Entry Date Modal */}
        <Modal
          visible={showEntryDateModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowEntryDateModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Select Entry Date</Text>
              <ScrollView style={styles.dateScrollView}>
                {generateDateOptions().map((date) => (
                  <TouchableOpacity
                    key={date}
                    style={[
                      styles.modalOption,
                      formData.entryDate === date && styles.modalOptionSelected
                    ]}
                    onPress={() => {
                      handleInputChange('entryDate', date);
                      setShowEntryDateModal(false);
                    }}
                  >
                    <Text style={[
                      styles.modalOptionText,
                      formData.entryDate === date && styles.modalOptionTextSelected
                    ]}>
                      {formatDate(date)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowEntryDateModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Exit Date Modal */}
        <Modal
          visible={showExitDateModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowExitDateModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Select Exit Date</Text>
              <ScrollView style={styles.dateScrollView}>
                <TouchableOpacity
                  style={[
                    styles.modalOption,
                    !formData.exitDate && styles.modalOptionSelected
                  ]}
                  onPress={() => {
                    handleInputChange('exitDate', '');
                    setShowExitDateModal(false);
                  }}
                >
                  <Text style={[
                    styles.modalOptionText,
                    !formData.exitDate && styles.modalOptionTextSelected
                  ]}>
                    No Exit Date
                  </Text>
                </TouchableOpacity>
                {generateDateOptions().map((date) => (
                  <TouchableOpacity
                    key={date}
                    style={[
                      styles.modalOption,
                      formData.exitDate === date && styles.modalOptionSelected
                    ]}
                    onPress={() => {
                      handleInputChange('exitDate', date);
                      setShowExitDateModal(false);
                    }}
                  >
                    <Text style={[
                      styles.modalOptionText,
                      formData.exitDate === date && styles.modalOptionTextSelected
                    ]}>
                      {formatDate(date)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowExitDateModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0E1A',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingVertical: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#B8BCC8',
    marginTop: 16,
    fontSize: 16,
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    color: '#B8BCC8',
    fontSize: 16,
  },
  section: {
    backgroundColor: '#1A1F2E',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 20,
  },
  formRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  formField: {
    flex: 1,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#B8BCC8',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#2D3748',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#FFFFFF',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#4A5568',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  radioGroup: {
    flexDirection: 'row',
    gap: 12,
  },
  radioButton: {
    flex: 1,
    backgroundColor: '#2D3748',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#4A5568',
    alignItems: 'center',
  },
  radioButtonSelected: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  radioButtonText: {
    color: '#B8BCC8',
    fontSize: 16,
    fontWeight: '500',
  },
  radioButtonTextSelected: {
    color: '#FFFFFF',
  },
  dropdown: {
    backgroundColor: '#2D3748',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#4A5568',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownText: {
    color: '#FFFFFF',
    fontSize: 16,
    flex: 1,
  },
  dropdownArrow: {
    color: '#B8BCC8',
    fontSize: 12,
    marginLeft: 8,
  },
  dateButton: {
    backgroundColor: '#2D3748',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#4A5568',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    flex: 1,
  },
  calculationBox: {
    backgroundColor: '#2D3748',
    borderRadius: 8,
    padding: 16,
    marginTop: 16,
  },
  calculationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  calculationText: {
    fontSize: 14,
    color: '#B8BCC8',
    marginBottom: 4,
  },
  pnlText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
  },
  profitText: {
    color: '#10B981',
  },
  lossText: {
    color: '#EF4444',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2D3748',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#4A5568',
  },
  tagButtonSelected: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  tagColor: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  tagButtonText: {
    color: '#B8BCC8',
    fontSize: 14,
    fontWeight: '500',
  },
  tagButtonTextSelected: {
    color: '#FFFFFF',
  },
  saveButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1A1F2E',
    borderRadius: 16,
    padding: 20,
    width: '80%',
    maxHeight: '70%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalOption: {
    backgroundColor: '#2D3748',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#4A5568',
  },
  modalOptionSelected: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  modalOptionText: {
    color: '#B8BCC8',
    fontSize: 16,
    textAlign: 'center',
  },
  modalOptionTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  modalCancelButton: {
    backgroundColor: 'transparent',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#4A5568',
  },
  modalCancelText: {
    color: '#B8BCC8',
    fontSize: 16,
    textAlign: 'center',
  },
  dateScrollView: {
    maxHeight: 300,
  },
});
