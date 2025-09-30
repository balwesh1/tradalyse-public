import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
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
import { PinchGestureHandler } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

interface Tag {
  id: string;
  name: string;
  color: string;
  user_id: string;
  created_at: string;
}

interface Strategy {
  id: string;
  name: string;
  description: string | null;
  color: string;
  user_id: string;
  created_at: string;
}

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
  screenshot_url: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  strategy?: Strategy | null;
  tag_objects?: Tag[] | null;
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

  // Available tags and strategies for editing
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [availableStrategies, setAvailableStrategies] = useState<Strategy[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [selectedStrategyId, setSelectedStrategyId] = useState<string>('');
  
  // Modal states
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showScreenshotModal, setShowScreenshotModal] = useState(false);
  const [uploadingScreenshot, setUploadingScreenshot] = useState(false);
  
  // Image zoom states
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);

  const fetchTrade = useCallback(async () => {
    if (!user || !id) return;

    try {
      setLoading(true);
      
      // First, fetch the trade data
      const { data: tradeData, error: tradeError } = await supabase
        .from('trades')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (tradeError) {
        console.error('Error fetching trade:', tradeError);
        Alert.alert('Error', 'Trade not found');
        router.back();
        return;
      }

      // Fetch strategy data if strategy_id exists
      let strategy = null;
      if (tradeData.strategy_id) {
        const { data: strategyData, error: strategyError } = await supabase
          .from('strategies')
          .select('*')
          .eq('id', tradeData.strategy_id)
          .eq('user_id', user.id)
          .single();

        if (!strategyError && strategyData) {
          strategy = strategyData;
        }
      }

      // Fetch tag data if tags exist
      let tagObjects = null;
      if (tradeData.tags && tradeData.tags.length > 0) {
        const { data: tagsData, error: tagsError } = await supabase
          .from('tags')
          .select('*')
          .in('id', tradeData.tags)
          .eq('user_id', user.id);

        if (!tagsError && tagsData) {
          tagObjects = tagsData;
        }
      }

      // Combine all data
      const enrichedTrade = {
        ...tradeData,
        strategy,
        tag_objects: tagObjects
      };

      setTrade(enrichedTrade);
      
      // Initialize edit data
      setEditData({
        symbol: tradeData.symbol || '',
        entry_price: tradeData.entry_price?.toString() || '',
        exit_price: tradeData.exit_price?.toString() || '',
        stop_loss: tradeData.stop_loss?.toString() || '',
        quantity: tradeData.quantity?.toString() || '',
        commission: tradeData.commission?.toString() || '',
        notes: tradeData.notes || '',
        status: tradeData.status || '',
        pnl: tradeData.pnl || 0,
      });
    } catch (error) {
      console.error('Error fetching trade:', error);
      Alert.alert('Error', 'Failed to load trade details');
      router.back();
    } finally {
      setLoading(false);
    }
  }, [user, id]);

  const fetchAvailableTags = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('tags')
        .select('*')
        .eq('user_id', user.id)
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching tags:', error);
        return;
      }

      setAvailableTags(data || []);
    } catch (error) {
      console.error('Error in fetchAvailableTags:', error);
    }
  }, [user]);

  const fetchAvailableStrategies = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('strategies')
        .select('*')
        .eq('user_id', user.id)
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching strategies:', error);
        return;
      }

      setAvailableStrategies(data || []);
    } catch (error) {
      console.error('Error in fetchAvailableStrategies:', error);
    }
  }, [user]);

  useEffect(() => {
    fetchTrade();
    fetchAvailableTags();
    fetchAvailableStrategies();
  }, [fetchTrade, fetchAvailableTags, fetchAvailableStrategies]);

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

  const handleTagToggle = (tagId: string) => {
    setSelectedTagIds(prev => {
      if (prev.includes(tagId)) {
        return prev.filter(id => id !== tagId);
      } else {
        return [...prev, tagId];
      }
    });
  };

  const handleStrategyChange = (strategyId: string) => {
    setSelectedStrategyId(strategyId);
  };

  const handleEdit = () => {
    if (!trade) return;
    
    // Initialize selected tags and strategy
    setSelectedTagIds(trade.tags || []);
    setSelectedStrategyId(trade.strategy_id || '');
    
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
    
    // Reset selected tags and strategy
    setSelectedTagIds(trade.tags || []);
    setSelectedStrategyId(trade.strategy_id || '');
    
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
        strategy_id: selectedStrategyId || null,
        tags: selectedTagIds.length > 0 ? selectedTagIds : null,
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

  // Pinch gesture handler for image zoom
  const pinchHandler = (event: any) => {
    'worklet';
    const { scale: gestureScale } = event.nativeEvent;
    
    if (event.nativeEvent.state === 1) { // BEGAN
      // Gesture started
    } else if (event.nativeEvent.state === 2) { // CHANGED
      scale.value = savedScale.value * gestureScale;
    } else if (event.nativeEvent.state === 3) { // ENDED
      savedScale.value = scale.value;
      if (scale.value < 1) {
        scale.value = withSpring(1);
        savedScale.value = 1;
      } else if (scale.value > 3) {
        scale.value = withSpring(3);
        savedScale.value = 3;
      }
    }
  };

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  const resetImageZoom = () => {
    scale.value = withSpring(1);
    savedScale.value = 1;
  };

  const handleScreenshotUpload = async () => {
    if (!trade) return;

    try {
      // For web, directly open file picker
      if (Platform.OS === 'web') {
        await pickImage('library');
        return;
      }

      // Request permissions for mobile platforms
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant camera roll permissions to upload screenshots.');
        return;
      }

      // Show action sheet for mobile platforms
      const options = [
        { text: 'Photo Library', onPress: () => pickImage('library') },
        { text: 'Camera', onPress: () => pickImage('camera') },
        { text: 'Cancel', style: 'cancel' as const }
      ];

      Alert.alert(
        'Select Screenshot',
        'Choose how you want to add a screenshot',
        options
      );
    } catch (error) {
      console.error('Error requesting permissions:', error);
      Alert.alert('Error', 'Failed to request permissions');
    }
  };

  const pickImage = async (source: 'camera' | 'library') => {
    if (!trade) return;

    try {
      setUploadingScreenshot(true);

      // For web, use different options
      const options: ImagePicker.ImagePickerOptions = Platform.OS === 'web' ? {
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false, // Disable editing on web for better compatibility
        quality: 0.8,
        base64: false,
      } : {
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: false,
      };

      let result;
      if (source === 'camera') {
        // Skip camera on web
        if (Platform.OS === 'web') {
          result = await ImagePicker.launchImageLibraryAsync(options);
        } else {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== 'granted') {
            Alert.alert('Permission Required', 'Please grant camera permissions to take photos.');
            return;
          }
          result = await ImagePicker.launchCameraAsync(options);
        }
      } else {
        result = await ImagePicker.launchImageLibraryAsync(options);
      }

      if (!result.canceled && result.assets[0]) {
        await uploadScreenshot(result.assets[0]);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      if (Platform.OS !== 'web') {
        Alert.alert('Error', 'Failed to pick image');
      }
    } finally {
      setUploadingScreenshot(false);
    }
  };

  const uploadScreenshot = async (asset: ImagePicker.ImagePickerAsset) => {
    if (!trade || !user) return;

    try {
      setUploadingScreenshot(true);

      // If there's already a screenshot, delete it first
      if (trade.screenshot_url) {
        await deleteExistingScreenshot();
      }

      // Create a unique filename
      const fileExt = asset.uri.split('.').pop() || 'jpg';
      const fileName = `${trade.id}_${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      let uploadData;

      if (Platform.OS === 'web') {
        // For web, convert blob URI to File object
        const response = await fetch(asset.uri);
        const blob = await response.blob();
        const file = new File([blob], fileName, { type: `image/${fileExt}` });
        uploadData = file;
      } else {
        // For mobile, use FormData
        const formData = new FormData();
        formData.append('file', {
          uri: asset.uri,
          type: `image/${fileExt}`,
          name: fileName,
        } as any);
        uploadData = formData;
      }

      // Upload to Supabase storage
      const { error: uploadError } = await supabase.storage
        .from('trade-screenshots')
        .upload(filePath, uploadData, {
          contentType: `image/${fileExt}`,
          upsert: false
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        Alert.alert('Error', `Failed to upload screenshot: ${uploadError.message}`);
        return;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('trade-screenshots')
        .getPublicUrl(filePath);

      // Update trade with screenshot URL
      const { error: updateError } = await supabase
        .from('trades')
        .update({ screenshot_url: publicUrl })
        .eq('id', trade.id);

      if (updateError) {
        console.error('Update error:', updateError);
        Alert.alert('Error', 'Failed to save screenshot');
        return;
      }

      // Refresh trade data
      await fetchTrade();
      Alert.alert('Success', 'Screenshot uploaded successfully');
    } catch (error) {
      console.error('Error uploading screenshot:', error);
      Alert.alert('Error', 'Failed to upload screenshot');
    } finally {
      setUploadingScreenshot(false);
    }
  };

  const deleteExistingScreenshot = async () => {
    if (!trade || !trade.screenshot_url) return;

    try {
      // Extract file path from URL
      const url = new URL(trade.screenshot_url);
      const pathParts = url.pathname.split('/');
      const filePath = pathParts.slice(-2).join('/'); // Get last 2 parts: user_id/filename

      // Delete from storage
      const { error: deleteError } = await supabase.storage
        .from('trade-screenshots')
        .remove([filePath]);

      if (deleteError) {
        console.error('Error deleting existing screenshot:', deleteError);
        // Continue with upload even if deletion fails
      }
    } catch (error) {
      console.error('Error deleting existing screenshot:', error);
      // Continue with upload even if deletion fails
    }
  };

  const handleScreenshotDelete = () => {
    if (!trade || !trade.screenshot_url) return;

    Alert.alert(
      'Delete Screenshot',
      'Are you sure you want to delete this screenshot?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: deleteScreenshot
        }
      ]
    );
  };

  const deleteScreenshot = async () => {
    if (!trade || !trade.screenshot_url) return;

    try {
      setUploadingScreenshot(true);

      // Extract file path from URL
      const url = new URL(trade.screenshot_url);
      const pathParts = url.pathname.split('/');
      const filePath = pathParts.slice(-2).join('/'); // Get last 2 parts: user_id/filename

      // Delete from storage
      const { error: deleteError } = await supabase.storage
        .from('trade-screenshots')
        .remove([filePath]);

      if (deleteError) {
        console.error('Delete error:', deleteError);
        Alert.alert('Error', 'Failed to delete screenshot from storage');
        return;
      }

      // Update trade to remove screenshot URL
      const { error: updateError } = await supabase
        .from('trades')
        .update({ screenshot_url: null })
        .eq('id', trade.id);

      if (updateError) {
        console.error('Update error:', updateError);
        Alert.alert('Error', 'Failed to remove screenshot reference');
        return;
      }

      // Refresh trade data
      await fetchTrade();
      Alert.alert('Success', 'Screenshot deleted successfully');
    } catch (error) {
      console.error('Error deleting screenshot:', error);
      Alert.alert('Error', 'Failed to delete screenshot');
    } finally {
      setUploadingScreenshot(false);
    }
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

          {/* Strategy */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Strategy</Text>
            {isEditing ? (
              <View style={styles.selectionContainer}>
                <TouchableOpacity
                  style={[
                    styles.selectionOption,
                    !selectedStrategyId && styles.selectionOptionSelected
                  ]}
                  onPress={() => handleStrategyChange('')}
                >
                  <Text style={[
                    styles.selectionOptionText,
                    !selectedStrategyId && styles.selectionOptionTextSelected
                  ]}>
                    None
                  </Text>
                </TouchableOpacity>
                {availableStrategies.map((strategy) => (
                  <TouchableOpacity
                    key={strategy.id}
                    style={[
                      styles.selectionOption,
                      selectedStrategyId === strategy.id && styles.selectionOptionSelected,
                      { borderColor: strategy.color }
                    ]}
                    onPress={() => handleStrategyChange(strategy.id)}
                  >
                    <Text style={[
                      styles.selectionOptionText,
                      selectedStrategyId === strategy.id && styles.selectionOptionTextSelected
                    ]}>
                      {strategy.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              trade.strategy ? (
                <View style={[styles.tag, { backgroundColor: trade.strategy.color }]}>
                  <Text style={styles.tagText}>{trade.strategy.name}</Text>
                </View>
              ) : (
                <Text style={styles.noSelectionText}>No strategy selected</Text>
              )
            )}
          </View>

          {/* Tags */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tags</Text>
            {isEditing ? (
              <View style={styles.selectionContainer}>
                {availableTags.map((tag) => (
                  <TouchableOpacity
                    key={tag.id}
                    style={[
                      styles.selectionOption,
                      selectedTagIds.includes(tag.id) && styles.selectionOptionSelected,
                      { borderColor: tag.color }
                    ]}
                    onPress={() => handleTagToggle(tag.id)}
                  >
                    <Text style={[
                      styles.selectionOptionText,
                      selectedTagIds.includes(tag.id) && styles.selectionOptionTextSelected
                    ]}>
                      {tag.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              trade.tag_objects && trade.tag_objects.length > 0 ? (
                <View style={styles.tagsContainer}>
                  {trade.tag_objects.map((tag) => (
                    <View key={tag.id} style={[styles.tag, { backgroundColor: tag.color }]}>
                      <Text style={styles.tagText}>{tag.name}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.noSelectionText}>No tags selected</Text>
              )
            )}
          </View>

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

          {/* Screenshot */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Screenshot</Text>
              {isEditing && (
                <TouchableOpacity
                  style={styles.addScreenshotButton}
                  onPress={handleScreenshotUpload}
                  disabled={uploadingScreenshot}
                >
                  <Text style={styles.addScreenshotButtonText}>
                    {uploadingScreenshot ? 'Uploading...' : 'Add Screenshot'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
            
            {trade.screenshot_url ? (
              <View style={styles.screenshotContainer}>
                <TouchableOpacity
                  style={styles.screenshotWrapper}
                  onPress={() => setShowScreenshotModal(true)}
                >
                  <Image
                    source={{ uri: trade.screenshot_url }}
                    style={styles.screenshotImage}
                    contentFit="cover"
                  />
                </TouchableOpacity>
                {isEditing && (
                  <TouchableOpacity
                    style={styles.deleteScreenshotButton}
                    onPress={handleScreenshotDelete}
                    disabled={uploadingScreenshot}
                  >
                    <Text style={styles.deleteScreenshotButtonText}>Delete</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <View style={styles.noScreenshotContainer}>
                <Text style={styles.noScreenshotText}>
                  {isEditing ? 'No screenshot added yet' : 'No screenshot available'}
                </Text>
                {isEditing && (
                  <TouchableOpacity
                    style={styles.addScreenshotButtonSmall}
                    onPress={handleScreenshotUpload}
                    disabled={uploadingScreenshot}
                  >
                    <Text style={styles.addScreenshotButtonTextSmall}>
                      {uploadingScreenshot ? 'Uploading...' : 'Add Screenshot'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
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

      {/* Screenshot Modal */}
      <Modal
        visible={showScreenshotModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          resetImageZoom();
          setShowScreenshotModal(false);
        }}
      >
        <View style={styles.screenshotModalOverlay}>
          <TouchableOpacity
            style={styles.screenshotModalClose}
            onPress={() => {
              resetImageZoom();
              setShowScreenshotModal(false);
            }}
          >
            <Text style={styles.screenshotModalCloseText}>✕</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.screenshotModalReset}
            onPress={resetImageZoom}
          >
            <Text style={styles.screenshotModalResetText}>Reset Zoom</Text>
          </TouchableOpacity>
          
          {trade?.screenshot_url && (
            <PinchGestureHandler onGestureEvent={pinchHandler}>
              <Animated.View style={[styles.screenshotModalContainer, animatedStyle]}>
                <Image
                  source={{ uri: trade.screenshot_url }}
                  style={styles.screenshotModalImage}
                  contentFit="contain"
                />
              </Animated.View>
            </PinchGestureHandler>
          )}
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
  selectionContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  selectionOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    backgroundColor: '#1A1A1A',
  },
  selectionOptionSelected: {
    backgroundColor: '#2A2A2A',
    borderWidth: 2,
  },
  selectionOptionText: {
    color: '#E5E5E5',
    fontSize: 14,
    fontWeight: '500',
  },
  selectionOptionTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  noSelectionText: {
    color: '#666666',
    fontSize: 14,
    fontStyle: 'italic',
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
  // Screenshot styles
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  addScreenshotButton: {
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  addScreenshotButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  addScreenshotButtonSmall: {
    backgroundColor: '#10B981',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 12,
    alignSelf: 'center',
  },
  addScreenshotButtonTextSmall: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  screenshotContainer: {
    alignItems: 'center',
  },
  screenshotWrapper: {
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 12,
  },
  screenshotImage: {
    width: 200,
    height: 150,
    borderRadius: 8,
  },
  deleteScreenshotButton: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  deleteScreenshotButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  noScreenshotContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  noScreenshotText: {
    color: '#CCCCCC',
    fontSize: 16,
    textAlign: 'center',
  },
  // Screenshot modal styles
  screenshotModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  screenshotModalClose: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    right: 20,
    zIndex: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 25,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  screenshotModalCloseText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
  },
  screenshotModalReset: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    left: 20,
    zIndex: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  screenshotModalResetText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  screenshotModalContainer: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
    justifyContent: 'center',
    alignItems: 'center',
  },
  screenshotModalImage: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  },
});
