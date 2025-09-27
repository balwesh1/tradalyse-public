import { useAuth } from '@/contexts/AuthContext';
import { router } from 'expo-router';
import React from 'react';
import {
    SafeAreaView,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

export default function HomeScreen() {
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    router.replace('/signin');
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView className="flex-1">
        <View className="px-6 py-8">
          {/* Header */}
          <View className="flex-row justify-between items-center mb-8">
            <View>
              <Text className="text-2xl font-bold text-gray-900">
                Welcome back!
              </Text>
              <Text className="text-gray-600">
                {user?.email}
              </Text>
            </View>
            <TouchableOpacity
              onPress={handleSignOut}
              className="bg-red-500 px-4 py-2 rounded-lg"
            >
              <Text className="text-white font-medium">Sign Out</Text>
            </TouchableOpacity>
          </View>

          {/* Stats Cards */}
          <View className="flex-row justify-between mb-8">
            <View className="bg-white rounded-xl p-4 flex-1 mr-2 shadow-sm">
              <Text className="text-gray-600 text-sm mb-1">Total Trades</Text>
              <Text className="text-2xl font-bold text-gray-900">0</Text>
              <Text className="text-green-500 text-sm">+0% this month</Text>
            </View>
            <View className="bg-white rounded-xl p-4 flex-1 ml-2 shadow-sm">
              <Text className="text-gray-600 text-sm mb-1">Win Rate</Text>
              <Text className="text-2xl font-bold text-gray-900">0%</Text>
              <Text className="text-gray-500 text-sm">No trades yet</Text>
            </View>
          </View>

          <View className="flex-row justify-between mb-8">
            <View className="bg-white rounded-xl p-4 flex-1 mr-2 shadow-sm">
              <Text className="text-gray-600 text-sm mb-1">P&L</Text>
              <Text className="text-2xl font-bold text-gray-900">$0.00</Text>
              <Text className="text-gray-500 text-sm">No trades yet</Text>
            </View>
            <View className="bg-white rounded-xl p-4 flex-1 ml-2 shadow-sm">
              <Text className="text-gray-600 text-sm mb-1">Best Trade</Text>
              <Text className="text-2xl font-bold text-gray-900">$0.00</Text>
              <Text className="text-gray-500 text-sm">No trades yet</Text>
            </View>
          </View>

          {/* Quick Actions */}
          <View className="mb-8">
            <Text className="text-xl font-semibold text-gray-900 mb-4">
              Quick Actions
            </Text>
            <View className="space-y-3">
              <TouchableOpacity className="bg-blue-600 rounded-xl p-4">
                <Text className="text-white font-semibold text-lg text-center">
                  Add New Trade
                </Text>
              </TouchableOpacity>
              <TouchableOpacity className="bg-green-600 rounded-xl p-4">
                <Text className="text-white font-semibold text-lg text-center">
                  View Trade History
                </Text>
              </TouchableOpacity>
              <TouchableOpacity className="bg-purple-600 rounded-xl p-4">
                <Text className="text-white font-semibold text-lg text-center">
                  Analytics Dashboard
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Recent Trades */}
          <View className="mb-8">
            <Text className="text-xl font-semibold text-gray-900 mb-4">
              Recent Trades
            </Text>
            <View className="bg-white rounded-xl p-6 shadow-sm">
              <Text className="text-gray-500 text-center">
                No trades recorded yet
              </Text>
              <Text className="text-gray-400 text-center text-sm mt-2">
                Start by adding your first trade
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
