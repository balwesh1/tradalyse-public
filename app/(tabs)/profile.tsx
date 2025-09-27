import { useAuth } from '@/contexts/AuthContext';
import { router } from 'expo-router';
import React from 'react';
import { SafeAreaView, Text, TouchableOpacity, View } from 'react-native';

export default function ProfileScreen() {
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    router.replace('/signin');
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="flex-1 px-6 py-8">
        <View className="mb-8">
          <Text className="text-2xl font-bold text-gray-900 mb-2">
            Profile
          </Text>
          <Text className="text-gray-600">
            Manage your account settings
          </Text>
        </View>

        <View className="bg-white rounded-xl p-6 shadow-sm mb-6">
          <Text className="text-lg font-semibold text-gray-900 mb-2">
            Account Information
          </Text>
          <Text className="text-gray-600 mb-1">
            Email: {user?.email}
          </Text>
          <Text className="text-gray-600">
            User ID: {user?.id}
          </Text>
        </View>

        <View className="space-y-4">
          <TouchableOpacity className="bg-blue-600 rounded-xl p-4">
            <Text className="text-white font-semibold text-lg text-center">
              Edit Profile
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity className="bg-gray-600 rounded-xl p-4">
            <Text className="text-white font-semibold text-lg text-center">
              Settings
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            className="bg-red-600 rounded-xl p-4"
            onPress={handleSignOut}
          >
            <Text className="text-white font-semibold text-lg text-center">
              Sign Out
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
