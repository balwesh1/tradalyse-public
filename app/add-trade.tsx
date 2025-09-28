import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
  const [loading] = useState(false);
  
  const [saving, setSaving] = useState(false);
  const [tags, setTags] = useState<Tag[]>([]);
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedStrategy, setSelectedStrategy] = useState<string>('');
  
  // Modal states
  const [showAssetTypeModal, setShowAssetTypeModal] = useState(false);
  
  // Date input states
  const [entryDateInput, setEntryDateInput] = useState('');
  const [exitDateInput, setExitDateInput] = useState('');

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
    entryDate: '',
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

  const assetTypes = useMemo(() => ['Stock', 'Option', 'Future', 'Crypto', 'ETF', 'Bond'], []);

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  const validateAndFormatDate = (dateInput: string) => {
    // Remove any non-numeric characters except /
    const cleaned = dateInput.replace(/[^\d/]/g, '');
    
    // Basic MM/DD/YYYY format validation
    const dateRegex = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
    const match = cleaned.match(dateRegex);
    
    if (!match) return null;
    
    const [, month, day, year] = match;
    const monthNum = parseInt(month, 10);
    const dayNum = parseInt(day, 10);
    const yearNum = parseInt(year, 10);
    
    // Validate ranges
    if (monthNum < 1 || monthNum > 12) return null;
    if (dayNum < 1 || dayNum > 31) return null;
    if (yearNum < 1900 || yearNum > 2100) return null;
    
    // Create date and validate it's a real date
    const date = new Date(yearNum, monthNum - 1, dayNum);
    if (date.getMonth() !== monthNum - 1 || date.getDate() !== dayNum || date.getFullYear() !== yearNum) {
      return null;
    }
    
    // Return in YYYY-MM-DD format for database
    return `${yearNum}-${monthNum.toString().padStart(2, '0')}-${dayNum.toString().padStart(2, '0')}`;
  };

  const formatDateInput = (value: string) => {
    // Remove any non-numeric characters except /
    const cleaned = value.replace(/[^\d/]/g, '');
    
    // Auto-format as user types
    if (cleaned.length <= 2) {
      return cleaned;
    } else if (cleaned.length <= 5) {
      return cleaned.replace(/^(\d{2})(\d)/, '$1/$2');
    } else {
      return cleaned.replace(/^(\d{2})(\d{2})(\d{4})/, '$1/$2/$3');
    }
  };

  const dateOptions = useMemo(() => {
    const dates = [];
    const today = new Date();
    const startDate = new Date(2020, 0, 1); // Start from 2020
    
    // Generate dates from 2020 to today (limit to 1000 for performance)
    let count = 0;
    for (let date = new Date(today); date >= startDate && count < 1000; date.setDate(date.getDate() - 1)) {
      dates.push(date.toISOString().split('T')[0]);
      count++;
    }
    return dates;
  }, []);


  const calculateTotalCost = (price: string, quantity: string, lotSize: string) => {
    const priceNum = parseFloat(price) || 0;
    const quantityNum = parseFloat(quantity) || 0;
    const lotSizeNum = parseFloat(lotSize) || 100;
    
    if (formData.assetType === 'Option') {
      return priceNum * lotSizeNum * quantityNum;
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
    if (!entryDateInput.trim()) {
      Alert.alert('Error', 'Entry date is required');
      return;
    }

    // Validate and format dates
    const formattedEntryDate = validateAndFormatDate(entryDateInput);
    if (!formattedEntryDate) {
      Alert.alert('Error', 'Please enter a valid entry date in MM/DD/YYYY format');
      return;
    }

    let formattedExitDate = null;
    if (exitDateInput.trim()) {
      formattedExitDate = validateAndFormatDate(exitDateInput);
      if (!formattedExitDate) {
        Alert.alert('Error', 'Please enter a valid exit date in MM/DD/YYYY format');
        return;
      }
    }

    try {
      setSaving(true);

      const pnl = formData.status === 'Closed' ? calculatePnL() : 0;
      const exitDate = formData.status === 'Closed' && formattedExitDate ? formattedExitDate : null;

      const tradeData = {
        user_id: user?.id,
        symbol: formData.symbol.trim(),
        side: formData.tradeType,
        trade_type: formData.tradeType,
        asset_type: formData.assetType || 'Stock',
        price: parseFloat(formData.entryPrice), // Legacy price field
        entry_price: parseFloat(formData.entryPrice),
        exit_price: formData.exitPrice ? parseFloat(formData.exitPrice) : null,
        stop_loss: formData.stopLoss ? parseFloat(formData.stopLoss) : null,
        standard_lot_size: parseFloat(formData.standardLotSize),
        quantity: parseFloat(formData.quantity),
        pnl: pnl,
        status: formData.status.toLowerCase(),
        entry_date: formattedEntryDate,
        exit_date: exitDate,
        strategy_id: selectedStrategy || null,
        tags: selectedTags.length > 0 ? selectedTags : null,
        notes: formData.notes.trim() || null,
      };

      const { data, error } = await supabase
        .from('trades')
        .insert(tradeData)
        .select();

      if (error) {
        Alert.alert('Error', `Failed to save trade: ${error.message}`);
        return;
      }

      // Clear form data
      setFormData({
        symbol: '',
        tradeType: 'Long',
        assetType: 'Stock',
        entryPrice: '',
        exitPrice: '',
        stopLoss: '',
        standardLotSize: '100',
        quantity: '',
        entryDate: '',
        exitDate: '',
        status: 'Open',
        notes: '',
      });
      setEntryDateInput('');
      setExitDateInput('');
      setSelectedTags([]);
      setSelectedStrategy('');
      
      Alert.alert('Success', 'Trade saved successfully!', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error) {
      Alert.alert('Error', `An unexpected error occurred: ${error}`);
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
                      P&amp;L: ${calculatePnL().toFixed(2)}
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
                  <Text style={styles.fieldLabel}>Entry Date * (MM/DD/YYYY)</Text>
                  <TextInput
                    style={styles.input}
                    value={entryDateInput}
                    onChangeText={(text) => {
                      const formatted = formatDateInput(text);
                      setEntryDateInput(formatted);
                    }}
                    placeholder="MM/DD/YYYY"
                    placeholderTextColor="#6B7280"
                    keyboardType="numeric"
                    maxLength={10}
                  />
                </View>

                <View style={styles.formField}>
                  <Text style={styles.fieldLabel}>Exit Date (MM/DD/YYYY)</Text>
                  <TextInput
                    style={styles.input}
                    value={exitDateInput}
                    onChangeText={(text) => {
                      const formatted = formatDateInput(text);
                      setExitDateInput(formatted);
                      
                      // Auto-set status to Closed if exit date is provided
                      if (formatted.trim() && validateAndFormatDate(formatted)) {
                        setFormData(prev => ({ ...prev, status: 'Closed' }));
                      } else if (!formatted.trim()) {
                        // Reset to Open if exit date is cleared
                        setFormData(prev => ({ ...prev, status: 'Open' }));
                      }
                    }}
                    placeholder="MM/DD/YYYY"
                    placeholderTextColor="#6B7280"
                    keyboardType="numeric"
                    maxLength={10}
                  />
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
              
              {strategies.length > 0 && (
                <View style={styles.formField}>
                  <Text style={styles.fieldLabel}>Strategy</Text>
                  <View style={styles.tagsContainer}>
                    {strategies.map((strategy) => (
                      <TouchableOpacity
                        key={strategy.id}
                        style={[
                          styles.tagButton,
                          selectedStrategy === strategy.id && styles.tagButtonSelected,
                          { borderColor: '#3B82F6' }
                        ]}
                        onPress={() => setSelectedStrategy(selectedStrategy === strategy.id ? '' : strategy.id)}
                      >
                        <View style={[styles.tagColor, { backgroundColor: '#3B82F6' }]} />
                        <Text style={[
                          styles.tagButtonText,
                          selectedStrategy === strategy.id && styles.tagButtonTextSelected
                        ]}>
                          {strategy.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

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
              onPress={() => {
                handleSave();
              }}
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
  // Calendar widget styles
  calendarContainer: {
    gap: 16,
  },
  dateSelectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  dateSelectorLabel: {
    color: '#B8BCC8',
    fontSize: 16,
    fontWeight: '500',
    minWidth: 60,
    marginRight: 12,
  },
  dateSelectorScroll: {
    flex: 1,
    maxHeight: 50,
  },
  dateSelectorOption: {
    backgroundColor: '#2D3748',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#4A5568',
    minWidth: 50,
    alignItems: 'center',
  },
  dateSelectorOptionSelected: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  dateSelectorOptionText: {
    color: '#B8BCC8',
    fontSize: 14,
    textAlign: 'center',
  },
  dateSelectorOptionTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  dateConfirmButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    paddingVertical: 12,
    marginTop: 16,
  },
  dateConfirmButtonText: {
    color: '#FFFFFF',
    textAlign: 'center',
    fontWeight: '600',
    fontSize: 16,
  },
});
