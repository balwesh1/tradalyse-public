import React from 'react';
import { SafeAreaView, Text, View } from 'react-native';

export default function TradesScreen() {
  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="flex-1 justify-center items-center px-6">
        <Text className="text-2xl font-bold text-gray-900 mb-4">
          Trade History
        </Text>
        <Text className="text-gray-600 text-center">
          Your trading history will appear here
        </Text>
      </View>
    </SafeAreaView>
  );
}
