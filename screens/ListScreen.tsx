import React from 'react';
import { View, Text, FlatList, Pressable } from 'react-native';

const DATA = Array.from({ length: 20 }).map((_, i) => ({
  id: `item-${i + 1}`,
  title: `Item ${i + 1}`,
  subtitle: `Deskripsi singkat item ${i + 1}`,
}));

export default function ListScreen() {
  const renderItem = ({ item }: { item: typeof DATA[number] }) => (
    <Pressable
      onPress={() => console.log('Pressed', item.id)}
      className="bg-slate-800 rounded-xl p-4 mb-3 active:bg-slate-700"
    >
      <Text className="text-white text-base font-medium">{item.title}</Text>
      <Text className="text-slate-400 text-sm mt-1">{item.subtitle}</Text>
    </Pressable>
  );

  return (
    <View className="flex-1 bg-slate-950 p-4">
      <Text className="text-white text-2xl font-semibold mb-4">List</Text>
      <FlatList
        data={DATA}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 16 }}
      />
    </View>
  );
}
