import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
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

export default function SettingsScreen() {
  const { user } = useAuth();
  const [tags, setTags] = useState<Tag[]>([]);
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [showAddTag, setShowAddTag] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [editTagName, setEditTagName] = useState('');
  const [newStrategyName, setNewStrategyName] = useState('');
  const [newStrategyDescription, setNewStrategyDescription] = useState('');
  const [showAddStrategy, setShowAddStrategy] = useState(false);
  const [editingStrategy, setEditingStrategy] = useState<Strategy | null>(null);
  const [editStrategyName, setEditStrategyName] = useState('');
  const [editStrategyDescription, setEditStrategyDescription] = useState('');

  // Generate random color for new tags
  const generateRandomColor = () => {
    const colors = [
      '#3B82F6', // Blue
      '#10B981', // Green
      '#F59E0B', // Yellow
      '#EF4444', // Red
      '#8B5CF6', // Purple
      '#06B6D4', // Cyan
      '#F97316', // Orange
      '#84CC16', // Lime
      '#EC4899', // Pink
      '#6B7280', // Gray
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  const fetchTags = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('tags')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

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
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching strategies:', error);
        return;
      }

      setStrategies(data || []);
    } catch (error) {
      console.error('Error in fetchStrategies:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user) {
      fetchTags();
      fetchStrategies();
    } else {
      setLoading(false);
    }
  }, [user, fetchTags, fetchStrategies]);

  const handleAddTag = async () => {
    if (!newTagName.trim()) {
      Alert.alert('Error', 'Tag name cannot be empty');
      return;
    }

    // Check if tag already exists
    const existingTag = tags.find(tag => tag.name.toLowerCase() === newTagName.toLowerCase());
    if (existingTag) {
      Alert.alert('Error', 'A tag with this name already exists');
      return;
    }

    try {
      setSaving(true);
      const { data, error } = await supabase
        .from('tags')
        .insert({
          name: newTagName.trim(),
          color: generateRandomColor(),
          user_id: user?.id,
        })
        .select()
        .single();

      if (error) {
        Alert.alert('Error', 'Failed to create tag');
        console.error('Error creating tag:', error);
        return;
      }

      setTags(prev => [data, ...prev]);
      setNewTagName('');
      setShowAddTag(false);
      Alert.alert('Success', 'Tag created successfully');
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
      console.error('Error in handleAddTag:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleEditTag = (tag: Tag) => {
    setEditingTag(tag);
    setEditTagName(tag.name);
  };

  const handleUpdateTag = async () => {
    if (!editingTag || !editTagName.trim()) {
      Alert.alert('Error', 'Tag name cannot be empty');
      return;
    }

    // Check if tag name already exists (excluding current tag)
    const existingTag = tags.find(tag => 
      tag.name.toLowerCase() === editTagName.toLowerCase() && 
      tag.id !== editingTag.id
    );
    if (existingTag) {
      Alert.alert('Error', 'A tag with this name already exists');
      return;
    }

    try {
      setSaving(true);
      const { error } = await supabase
        .from('tags')
        .update({ name: editTagName.trim() })
        .eq('id', editingTag.id)
        .eq('user_id', user?.id);

      if (error) {
        Alert.alert('Error', 'Failed to update tag');
        console.error('Error updating tag:', error);
        return;
      }

      setTags(prev => prev.map(tag => 
        tag.id === editingTag.id 
          ? { ...tag, name: editTagName.trim() }
          : tag
      ));
      setEditingTag(null);
      setEditTagName('');
      Alert.alert('Success', 'Tag updated successfully');
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
      console.error('Error in handleUpdateTag:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingTag(null);
    setEditTagName('');
  };

  const handleDeleteTag = async (tagId: string) => {
    console.log('handleDeleteTag called with tagId:', tagId);
    Alert.alert(
      'Delete Tag',
      'Are you sure you want to delete this tag? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('Attempting to delete tag:', tagId, 'for user:', user?.id);
              
              // Check current session
              const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
              console.log('Current session for delete:', { sessionData, sessionError });
              
              const { data, error } = await supabase
                .from('tags')
                .delete()
                .eq('id', tagId)
                .eq('user_id', user?.id)
                .select();

              console.log('Delete result:', { data, error });

              if (error) {
                Alert.alert('Error', `Failed to delete tag: ${error.message}`);
                console.error('Error deleting tag:', error);
                return;
              }

              if (data && data.length > 0) {
                setTags(prev => prev.filter(tag => tag.id !== tagId));
                Alert.alert('Success', 'Tag deleted successfully');
              } else {
                Alert.alert('Error', 'Tag not found or already deleted');
              }
            } catch (error) {
              Alert.alert('Error', 'An unexpected error occurred');
              console.error('Error in handleDeleteTag:', error);
            }
          },
        },
      ]
    );
  };

  const handleAddStrategy = async () => {
    if (!newStrategyName.trim()) {
      Alert.alert('Error', 'Strategy name cannot be empty');
      return;
    }

    // Check if strategy already exists
    const existingStrategy = strategies.find(strategy => strategy.name.toLowerCase() === newStrategyName.toLowerCase());
    if (existingStrategy) {
      Alert.alert('Error', 'A strategy with this name already exists');
      return;
    }

    try {
      setSaving(true);
      const { data, error } = await supabase
        .from('strategies')
        .insert({
          name: newStrategyName.trim(),
          description: newStrategyDescription.trim() || null,
          color: generateRandomColor(),
          user_id: user?.id,
        })
        .select()
        .single();

      if (error) {
        Alert.alert('Error', 'Failed to create strategy');
        console.error('Error creating strategy:', error);
        return;
      }

      setStrategies(prev => [data, ...prev]);
      setNewStrategyName('');
      setNewStrategyDescription('');
      setShowAddStrategy(false);
      Alert.alert('Success', 'Strategy created successfully');
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
      console.error('Error in handleAddStrategy:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleEditStrategy = (strategy: Strategy) => {
    setEditingStrategy(strategy);
    setEditStrategyName(strategy.name);
    setEditStrategyDescription(strategy.description || '');
  };

  const handleUpdateStrategy = async () => {
    if (!editingStrategy || !editStrategyName.trim()) {
      Alert.alert('Error', 'Strategy name cannot be empty');
      return;
    }

    // Check if strategy name already exists (excluding current strategy)
    const existingStrategy = strategies.find(strategy => 
      strategy.name.toLowerCase() === editStrategyName.toLowerCase() && 
      strategy.id !== editingStrategy.id
    );
    if (existingStrategy) {
      Alert.alert('Error', 'A strategy with this name already exists');
      return;
    }

    try {
      setSaving(true);
      const { error } = await supabase
        .from('strategies')
        .update({ 
          name: editStrategyName.trim(),
          description: editStrategyDescription.trim() || null
        })
        .eq('id', editingStrategy.id)
        .eq('user_id', user?.id);

      if (error) {
        Alert.alert('Error', 'Failed to update strategy');
        console.error('Error updating strategy:', error);
        return;
      }

      setStrategies(prev => prev.map(strategy => 
        strategy.id === editingStrategy.id 
          ? { ...strategy, name: editStrategyName.trim(), description: editStrategyDescription.trim() || null }
          : strategy
      ));
      setEditingStrategy(null);
      setEditStrategyName('');
      setEditStrategyDescription('');
      Alert.alert('Success', 'Strategy updated successfully');
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
      console.error('Error in handleUpdateStrategy:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEditStrategy = () => {
    setEditingStrategy(null);
    setEditStrategyName('');
    setEditStrategyDescription('');
  };

  const handleDeleteStrategy = async (strategyId: string) => {
    Alert.alert(
      'Delete Strategy',
      'Are you sure you want to delete this strategy? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { data, error } = await supabase
                .from('strategies')
                .delete()
                .eq('id', strategyId)
                .eq('user_id', user?.id)
                .select();

              if (error) {
                Alert.alert('Error', `Failed to delete strategy: ${error.message}`);
                console.error('Error deleting strategy:', error);
                return;
              }

              if (data && data.length > 0) {
                setStrategies(prev => prev.filter(strategy => strategy.id !== strategyId));
                Alert.alert('Success', 'Strategy deleted successfully');
              } else {
                Alert.alert('Error', 'Strategy not found or already deleted');
              }
            } catch (error) {
              Alert.alert('Error', 'An unexpected error occurred');
              console.error('Error in handleDeleteStrategy:', error);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Loading settings...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Settings</Text>
            <Text style={styles.subtitle}>
              Manage your trading preferences and custom tags.
            </Text>
          </View>

          {/* Tags Section */}
          <View style={styles.tagsCard}>
            <View style={styles.tagsHeader}>
              <Text style={styles.cardTitle}>Custom Tags</Text>
              <TouchableOpacity
                style={styles.addTagButton}
                onPress={() => setShowAddTag(!showAddTag)}
              >
                <Text style={styles.addTagButtonText}>
                  {showAddTag ? 'Cancel' : '+ Add Tag'}
                </Text>
              </TouchableOpacity>
            </View>

            {showAddTag && (
              <View style={styles.addTagForm}>
                <TextInput
                  style={styles.tagInput}
                  value={newTagName}
                  onChangeText={setNewTagName}
                  placeholder="Enter tag name (e.g., Earnings Play)"
                  placeholderTextColor="#64748B"
                  autoCapitalize="words"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  style={[styles.createTagButton, saving && styles.buttonDisabled]}
                  onPress={handleAddTag}
                  disabled={saving}
                >
                  <Text style={styles.createTagButtonText}>
                    {saving ? 'Creating...' : 'Create Tag'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Tags List */}
            <View style={styles.tagsList}>
              {tags.length === 0 ? (
                <View style={styles.emptyTagsContainer}>
                  <Text style={styles.emptyTagsIcon}>🏷️</Text>
                  <Text style={styles.emptyTagsTitle}>No Tags Yet</Text>
                  <Text style={styles.emptyTagsMessage}>
                    Create custom tags to categorize your trades and track specific strategies.
                  </Text>
                </View>
              ) : (
                tags.map((tag) => (
                  <View key={tag.id} style={styles.tagItem}>
                    <View style={[styles.tagColor, { backgroundColor: tag.color }]} />
                    {editingTag?.id === tag.id ? (
                      <View style={styles.editTagContainer}>
                        <TextInput
                          style={styles.editTagInput}
                          value={editTagName}
                          onChangeText={setEditTagName}
                          placeholder="Tag name"
                          placeholderTextColor="#64748B"
                          autoCapitalize="words"
                          autoCorrect={false}
                        />
                        <View style={styles.editTagActions}>
                          <TouchableOpacity
                            style={styles.saveEditButton}
                            onPress={handleUpdateTag}
                            disabled={saving}
                          >
                            <Text style={styles.saveEditButtonText}>✓</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.cancelEditButton}
                            onPress={handleCancelEdit}
                          >
                            <Text style={styles.cancelEditButtonText}>✕</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ) : (
                      <>
                        <Text style={styles.tagName}>{tag.name}</Text>
                        <View style={styles.tagActions}>
                          <TouchableOpacity
                            style={styles.editTagButton}
                            onPress={() => handleEditTag(tag)}
                          >
                            <Text style={styles.editTagButtonText}>✏️</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.deleteTagButton}
                            onPress={() => {
                              console.log('Delete button pressed for tag:', tag.id, tag.name);
                              handleDeleteTag(tag.id);
                            }}
                          >
                            <Text style={styles.deleteTagButtonText}>×</Text>
                          </TouchableOpacity>
                        </View>
                      </>
                    )}
                  </View>
                ))
              )}
            </View>
          </View>

          {/* Strategies Section */}
          <View style={styles.strategiesCard}>
            <View style={styles.strategiesHeader}>
              <Text style={styles.cardTitle}>Trading Strategies</Text>
              <TouchableOpacity
                style={styles.addStrategyButton}
                onPress={() => setShowAddStrategy(!showAddStrategy)}
              >
                <Text style={styles.addStrategyButtonText}>
                  {showAddStrategy ? 'Cancel' : '+ Add Strategy'}
                </Text>
              </TouchableOpacity>
            </View>

            {showAddStrategy && (
              <View style={styles.addStrategyForm}>
                <TextInput
                  style={styles.strategyInput}
                  value={newStrategyName}
                  onChangeText={setNewStrategyName}
                  placeholder="Strategy name (e.g., Breakout, Mean Reversion)"
                  placeholderTextColor="#64748B"
                  autoCapitalize="words"
                  autoCorrect={false}
                />
                <TextInput
                  style={[styles.strategyInput, styles.strategyDescriptionInput]}
                  value={newStrategyDescription}
                  onChangeText={setNewStrategyDescription}
                  placeholder="Description (optional)"
                  placeholderTextColor="#64748B"
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
                <TouchableOpacity
                  style={[styles.createStrategyButton, saving && styles.buttonDisabled]}
                  onPress={handleAddStrategy}
                  disabled={saving}
                >
                  <Text style={styles.createStrategyButtonText}>
                    {saving ? 'Creating...' : 'Create Strategy'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Strategies List */}
            <View style={styles.strategiesList}>
              {strategies.length === 0 ? (
                <View style={styles.emptyStrategiesContainer}>
                  <Text style={styles.emptyStrategiesIcon}>📈</Text>
                  <Text style={styles.emptyStrategiesTitle}>No Strategies Yet</Text>
                  <Text style={styles.emptyStrategiesMessage}>
                    Create custom trading strategies to categorize your trades and track specific approaches.
                  </Text>
                </View>
              ) : (
                strategies.map((strategy) => (
                  <View key={strategy.id} style={styles.strategyItem}>
                    <View style={[styles.strategyColor, { backgroundColor: strategy.color }]} />
                    {editingStrategy?.id === strategy.id ? (
                      <View style={styles.editStrategyContainer}>
                        <TextInput
                          style={styles.editStrategyInput}
                          value={editStrategyName}
                          onChangeText={setEditStrategyName}
                          placeholder="Strategy name"
                          placeholderTextColor="#64748B"
                          autoCapitalize="words"
                          autoCorrect={false}
                        />
                        <TextInput
                          style={[styles.editStrategyInput, styles.editStrategyDescriptionInput]}
                          value={editStrategyDescription}
                          onChangeText={setEditStrategyDescription}
                          placeholder="Description (optional)"
                          placeholderTextColor="#64748B"
                          multiline
                          numberOfLines={2}
                          textAlignVertical="top"
                        />
                        <View style={styles.editStrategyActions}>
                          <TouchableOpacity
                            style={styles.saveEditButton}
                            onPress={handleUpdateStrategy}
                            disabled={saving}
                          >
                            <Text style={styles.saveEditButtonText}>✓</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.cancelEditButton}
                            onPress={handleCancelEditStrategy}
                          >
                            <Text style={styles.cancelEditButtonText}>✕</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ) : (
                      <>
                        <View style={styles.strategyContent}>
                          <Text style={styles.strategyName}>{strategy.name}</Text>
                          {strategy.description && (
                            <Text style={styles.strategyDescription}>{strategy.description}</Text>
                          )}
                        </View>
                        <View style={styles.strategyActions}>
                          <TouchableOpacity
                            style={styles.editStrategyButton}
                            onPress={() => handleEditStrategy(strategy)}
                          >
                            <Text style={styles.editStrategyButtonText}>✏️</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.deleteStrategyButton}
                            onPress={() => handleDeleteStrategy(strategy.id)}
                          >
                            <Text style={styles.deleteStrategyButtonText}>×</Text>
                          </TouchableOpacity>
                        </View>
                      </>
                    )}
                  </View>
                ))
              )}
            </View>
          </View>

          {/* Additional Settings Sections */}
          <View style={styles.settingsCard}>
            <Text style={styles.cardTitle}>Trading Preferences</Text>
            <Text style={styles.settingsDescription}>
              More settings and preferences will be available here in future updates.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
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
    color: '#94A3B8',
    marginTop: 16,
    fontSize: 16,
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#F8FAFC',
    marginBottom: 8,
  },
  subtitle: {
    color: '#94A3B8',
    fontSize: 16,
  },
  tagsCard: {
    backgroundColor: '#1E293B',
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
  tagsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#F8FAFC',
  },
  addTagButton: {
    backgroundColor: 'transparent',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#475569',
  },
  addTagButtonText: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '500',
  },
  addTagForm: {
    marginBottom: 20,
    gap: 12,
  },
  tagInput: {
    backgroundColor: '#334155',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#F8FAFC',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#475569',
  },
  createTagButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    paddingVertical: 12,
  },
  createTagButtonText: {
    color: '#ffffff',
    textAlign: 'center',
    fontWeight: '600',
    fontSize: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  tagsList: {
    gap: 12,
  },
  emptyTagsContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyTagsIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTagsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F8FAFC',
    marginBottom: 8,
  },
  emptyTagsMessage: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 16,
  },
  tagItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#334155',
    borderRadius: 8,
    padding: 12,
  },
  tagColor: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 12,
  },
  tagName: {
    flex: 1,
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '500',
  },
  tagActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editTagButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editTagButtonText: {
    fontSize: 12,
  },
  deleteTagButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteTagButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  editTagContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editTagInput: {
    flex: 1,
    backgroundColor: '#334155',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#F8FAFC',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#475569',
  },
  editTagActions: {
    flexDirection: 'row',
    gap: 4,
  },
  saveEditButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveEditButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  cancelEditButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#6B7280',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelEditButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  settingsCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  settingsDescription: {
    color: '#94A3B8',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
  },
  // Strategies styles
  strategiesCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    marginBottom: 24,
  },
  strategiesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  addStrategyButton: {
    backgroundColor: 'transparent',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#475569',
  },
  addStrategyButtonText: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '500',
  },
  addStrategyForm: {
    gap: 12,
    marginBottom: 20,
  },
  strategyInput: {
    backgroundColor: '#334155',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#F8FAFC',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#475569',
  },
  strategyDescriptionInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  createStrategyButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    paddingVertical: 12,
    marginTop: 8,
  },
  createStrategyButtonText: {
    color: '#ffffff',
    textAlign: 'center',
    fontWeight: '600',
    fontSize: 16,
  },
  strategiesList: {
    gap: 12,
  },
  emptyStrategiesContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyStrategiesIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyStrategiesTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F8FAFC',
    marginBottom: 8,
  },
  emptyStrategiesMessage: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 16,
  },
  strategyItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#334155',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  strategyColor: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 12,
    marginTop: 2,
  },
  strategyContent: {
    flex: 1,
    marginRight: 12,
  },
  strategyName: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  strategyDescription: {
    color: '#94A3B8',
    fontSize: 14,
    lineHeight: 18,
  },
  strategyActions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
  },
  editStrategyButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editStrategyButtonText: {
    fontSize: 12,
  },
  deleteStrategyButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteStrategyButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  editStrategyContainer: {
    flex: 1,
    gap: 8,
  },
  editStrategyInput: {
    backgroundColor: '#334155',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#F8FAFC',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#475569',
  },
  editStrategyDescriptionInput: {
    height: 60,
    textAlignVertical: 'top',
  },
  editStrategyActions: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'flex-end',
  },
});