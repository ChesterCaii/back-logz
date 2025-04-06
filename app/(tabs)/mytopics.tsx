import React, { useState, useCallback } from "react";
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  SafeAreaView,
  Platform,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

const ASYNC_STORAGE_TOPICS_KEY = "@BacklogzApp:topics";

// Define Dark Theme Colors (should match _layout.tsx)
const theme = {
  background: "#121212",
  card: "#1e1e1e",
  text: "#ffffff",
  textSecondary: "#b0b0b0",
  primary: "#00bcd4",
  inactive: "#757575",
  border: "#272727",
  error: "#cf6679",
  success: "#4caf50",
  warning: "#ffab00",
  stop: "#f44336",
};

export default function MyTopicsScreen() {
  const [topics, setTopics] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  const loadTopics = useCallback(async () => {
    console.log("Loading topics...");
    setIsLoading(true);
    try {
      const topicsJson = await AsyncStorage.getItem(ASYNC_STORAGE_TOPICS_KEY);
      const loadedTopics = topicsJson ? JSON.parse(topicsJson) : [];
      setTopics(loadedTopics);
      console.log("Topics loaded:", loadedTopics.length);
    } catch (e) {
      console.error("Failed to load topics.", e);
      Alert.alert("Error", "Failed to load saved topics.");
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadTopics();
    }, [loadTopics])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadTopics();
  }, [loadTopics]);

  const handleDeleteTopic = async (topicToDelete: string) => {
    console.log("handleDeleteTopic called for:", topicToDelete);
    Alert.alert(
      "Delete Topic",
      `Are you sure you want to delete "${topicToDelete}"?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            console.log("Alert 'Delete' button pressed for:", topicToDelete);
            try {
              const updatedTopics = topics.filter(
                (topic) => topic !== topicToDelete
              );
              await AsyncStorage.setItem(
                ASYNC_STORAGE_TOPICS_KEY,
                JSON.stringify(updatedTopics)
              );
              setTopics(updatedTopics);
              console.log("Delete confirmed for:", topicToDelete);
              console.log("Topic deleted:", topicToDelete);
            } catch (e) {
              console.error("Failed to delete topic.", e);
              Alert.alert("Error", "Failed to delete topic.");
            }
          },
        },
      ]
    );
  };

  const handlePlaySpecificTopic = (topic: string) => {
    console.log("Navigating to play:", topic);
    router.push({ pathname: "/", params: { topicToPlay: topic } });
  };

  const renderTopicItem = ({ item }: { item: string }) => (
    <TouchableOpacity
      style={styles.topicItemContainer}
      onPress={() => handlePlaySpecificTopic(item)}
      activeOpacity={0.7}
    >
      <Text style={styles.topicText}>{item}</Text>
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          onPress={() => {
            console.log(`Notes TouchableOpacity onPress fired for: ${item}`);
            router.push({
              pathname: "/(modals)/view-notes",
              params: { topicName: item },
            });
          }}
          style={styles.iconButton}
        >
          <Ionicons
            name="document-text-outline"
            size={24}
            color={theme.primary}
          />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={(e) => {
            e.stopPropagation();
            console.log(`Delete TouchableOpacity onPress fired for: ${item}`);
            handleDeleteTopic(item);
          }}
          style={styles.iconButton}
        >
          <Ionicons name="trash-bin-outline" size={24} color={theme.error} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.safeArea, { paddingTop: Platform.OS === "android" ? 25 : 0 }]}>
      <FlatList
      data={topics}
      renderItem={renderTopicItem}
      keyExtractor={(item) => item}
      style={styles.list}
      contentContainerStyle={styles.listContent}
      ListEmptyComponent={
        <Text style={styles.emptyText}>Your topic backlog is empty.</Text>
      }
      refreshControl={
        <RefreshControl
        refreshing={refreshing}
        onRefresh={onRefresh}
        colors={[theme.primary]}
        tintColor={theme.primary}
        progressBackgroundColor={theme.card}
        />
      }
      />

      <TouchableOpacity
      style={styles.fab}
      onPress={() => router.push("/(modals)/add-topic")}
      >
      <Ionicons name="add" size={30} color={theme.text} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.background,
  },
  title: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
    color: theme.text,
    paddingTop: Platform.OS === "ios" ? 10 : 25,
    paddingBottom: 20,
    backgroundColor: theme.background,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    paddingBottom: 90,
  },
  topicItemContainer: {
    backgroundColor: theme.card,
    paddingVertical: 18,
    paddingHorizontal: 15,
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  topicText: {
    fontSize: 17,
    color: theme.text,
    flex: 1,
    marginRight: 10,
    fontFamily: "Inter_400Regular",
  },
  buttonContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconButton: {
    padding: 8,
  },
  emptyText: {
    textAlign: "center",
    marginTop: 60,
    fontSize: 16,
    color: theme.textSecondary,
    fontFamily: "Inter_400Regular",
  },
  fab: {
    position: "absolute",
    margin: 16,
    right: 20,
    bottom: Platform.select({ ios: 100, android: 20 }),
    backgroundColor: theme.primary,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 5,
  },
});
