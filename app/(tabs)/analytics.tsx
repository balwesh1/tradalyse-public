import React from 'react';
import { SafeAreaView, Text, View } from 'react-native';

export default function AnalyticsScreen() {
  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="flex-1 justify-center items-center px-6">
        <Text className="text-2xl font-bold text-gray-900 mb-4">
          Analytics Dashboard
        </Text>
        <Text className="text-gray-600 text-center">
          Trading analytics and insights will appear here
        </Text>
      </View>
    </SafeAreaView>
  );
}
