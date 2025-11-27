import { View, Text, ScrollView } from "react-native";
import { Image } from "react-native";

const videos = [
    { id: '1', title: 'Belajar React Native Dasar', thumbnail: 'https://via.placeholder.com/300x200' },
    { id: '2', title: 'Mengenal TypeScript di Project', thumbnail: 'https://via.placeholder.com/300x200' },
    { id: '3', title: 'Optimasi Performance Aplikasi', thumbnail: 'https://via.placeholder.com/300x200' },
    { id: '4', title: 'Integrasi API dengan Axios', thumbnail: 'https://via.placeholder.com/300x200' },
    { id: '5', title: 'Styling dengan NativeWind', thumbnail: 'https://via.placeholder.com/300x200' },
    { id: '6', title: 'Navigasi dengan React Navigation', thumbnail: 'https://via.placeholder.com/300x200' },
    { id: '7', title: 'State Management Modern', thumbnail: 'https://via.placeholder.com/300x200' },
];


export default function DownloadScreen() {
    return(
        <ScrollView>
            <View>
                <Text className="text-white mt-6 ml-4 text-2xl font-bold">Offline Video</Text>
                <View className="flex-row flex-wrap">
                    {videos.map((v) => (
                        <View key={v.id} className="w-1/2 px-4 mt-4">
                            <View className="rounded-xl p-4">
                                <Image source={{ uri: v.thumbnail }} className="w-full h-24 rounded-lg mb-4 bg-gray-800" resizeMode="cover" />
                                <Text className="text-white text-lg font-semibold">{v.title}</Text>
                                <Text className="text-slate-400 mt-2">Status: Downloaded</Text>
                            </View>
                        </View>
                    ))}
                </View>
            </View>
        </ScrollView>
    );
}