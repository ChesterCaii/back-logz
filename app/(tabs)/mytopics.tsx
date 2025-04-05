import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  SafeAreaView,
  Modal,
  TextInput,
  Button,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';

const ASYNC_STORAGE_TOPICS_KEY = '@BacklogzApp:topics';

// Define Dark Theme Colors (should match _layout.tsx)
const theme = {
  background: '#121212',
  card: '#1e1e1e',         
  text: '#ffffff',          
  textSecondary: '#b0b0b0', 
  primary: '#00bcd4',       
  inactive: '#757575',     
  border: '#272727',       
  error: '#cf6679',        
  success: '#4caf50',
  warning: '#ffab00',     
  stop: '#f44336',         
};

export default function MyTopicsScreen() {
  const [topics, setTopics] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [newTopic, setNewTopic] = useState('');

  const loadTopics = useCallback(async () => {
    console.log('Loading topics...');
    setIsLoading(true);
    try {
      const topicsJson = await AsyncStorage.getItem(ASYNC_STORAGE_TOPICS_KEY);
      const loadedTopics = topicsJson ? JSON.parse(topicsJson) : [];
      setTopics(loadedTopics);
      console.log('Topics loaded:', loadedTopics.length);
    } catch (e) {
      console.error('Failed to load topics.', e);
      Alert.alert('Error', 'Failed to load saved topics.');
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

  const handleAddTopic = async () => {
    const topicToAdd = newTopic.trim();
    if (!topicToAdd) {
        Alert.alert("Input Error", "Please enter a topic name.");
        return;
    }

    try {
      const existingTopicsJson = await AsyncStorage.getItem(ASYNC_STORAGE_TOPICS_KEY);
      let existingTopics: string[] = existingTopicsJson ? JSON.parse(existingTopicsJson) : [];

      if (!existingTopics.some(t => t.toLowerCase() === topicToAdd.toLowerCase())) {
        existingTopics.push(topicToAdd);
        existingTopics.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
        
        await AsyncStorage.setItem(ASYNC_STORAGE_TOPICS_KEY, JSON.stringify(existingTopics));
        setTopics(existingTopics);
        console.log("Topic added via modal:", topicToAdd);
        setNewTopic('');
        setModalVisible(false);
      } else {
        Alert.alert("Duplicate", `The topic "${topicToAdd}" already exists.`);
      }
    } catch (storageError) {
      console.error("Error saving topic via modal:", storageError);
      Alert.alert('Error', 'Failed to save the new topic.');
    }
  };

  const handleDeleteTopic = async (topicToDelete: string) => {
    console.log('handleDeleteTopic called for:', topicToDelete);
    Alert.alert(
      'Delete Topic',
      `Are you sure you want to delete "${topicToDelete}"?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            console.log("Alert 'Delete' button pressed for:", topicToDelete);
            try {
              const updatedTopics = topics.filter((topic) => topic !== topicToDelete);
              await AsyncStorage.setItem(ASYNC_STORAGE_TOPICS_KEY, JSON.stringify(updatedTopics));
              setTopics(updatedTopics);
              console.log('Delete confirmed for:', topicToDelete);
              console.log('Topic deleted:', topicToDelete);
            } catch (e) {
              console.error('Failed to delete topic.', e);
              Alert.alert('Error', 'Failed to delete topic.');
            }
          },
        },
      ]
    );
  };

  const renderTopicItem = ({ item }: { item: string }) => (
    <View style={styles.topicItemContainer}>
      <Text style={styles.topicText}>{item}</Text>
      <TouchableOpacity 
        onPress={() => {
            console.log(`Delete TouchableOpacity onPress fired for: ${item}`); 
            handleDeleteTopic(item);
        }}
        style={styles.deleteButton}
      >
        <Ionicons name="trash-bin-outline" size={24} color={theme.error} />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <Text style={styles.title}>Backlog</Text>
      <FlatList
        data={topics}
        renderItem={renderTopicItem}
        keyExtractor={(item) => item}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={<Text style={styles.emptyText}>Your topic backlog is empty.</Text>}
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

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => {
          setModalVisible(!modalVisible);
          setNewTopic('');
        }}
      >
        <KeyboardAvoidingView 
            behavior={Platform.OS === "ios" ? "padding" : "height"} 
            style={styles.modalOverlay}
        >
            <View style={styles.modalView}>
              <Text style={styles.modalTitle}>Add Topic to Backlog</Text>
              <TextInput
                  style={styles.modalInput}
                  placeholder="Enter topic name"
                  placeholderTextColor={theme.textSecondary}
                  value={newTopic}
                  onChangeText={setNewTopic}
                  autoFocus={true}
                  keyboardAppearance="dark"
              />
              <View style={styles.modalButtonRow}>
                  <TouchableOpacity 
                    style={[styles.modalButton, styles.cancelButton]} 
                    onPress={() => { setModalVisible(false); setNewTopic(''); }}
                  >
                     <Text style={styles.modalButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.modalButton, styles.addButton]} 
                    onPress={handleAddTopic}
                  >
                      <Text style={styles.modalButtonText}>Add Topic</Text>
                  </TouchableOpacity>
              </View>
            </View>
        </KeyboardAvoidingView>
      </Modal>

      <TouchableOpacity
        style={styles.fab}
        onPress={() => setModalVisible(true)}
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
    fontFamily: 'Inter_700Bold',
    textAlign: 'center',
    color: theme.text,
    paddingTop: Platform.OS === 'ios' ? 10 : 25,
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  topicText: {
    fontSize: 17,
    color: theme.text,
    flex: 1,
    marginRight: 10,
    fontFamily: 'Inter_400Regular',
  },
  deleteButton: {
      padding: 8,
  },
  emptyText: {
      textAlign: 'center',
      marginTop: 60,
      fontSize: 16,
      color: theme.textSecondary,
      fontFamily: 'Inter_400Regular',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 20,
    bottom: Platform.OS === 'ios' ? 40 : 25,
    backgroundColor: theme.primary,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 5,
  },
  modalOverlay: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  modalView: {
    margin: 20,
    backgroundColor: theme.card,
    borderRadius: 15,
    padding: 25,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    width: '90%',
  },
  modalTitle: {
      fontSize: 22,
      fontFamily: 'Inter_600SemiBold',
      marginBottom: 25,
      color: theme.text,
  },
  modalInput: {
    height: 50,
    borderColor: theme.border,
    backgroundColor: theme.background,
    color: theme.text,
    borderWidth: 1,
    borderRadius: 10,
    marginBottom: 30,
    paddingHorizontal: 15,
    width: '100%',
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
  },
  modalButtonRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      width: '100%',
  },
  modalButton: {
      borderRadius: 8,
      paddingVertical: 12,
      paddingHorizontal: 20,
      elevation: 2,
      minWidth: 100,
      alignItems: 'center',
  },
  cancelButton: {
      backgroundColor: theme.inactive,
  },
  addButton: {
      backgroundColor: theme.primary,
  },
  modalButtonText: {
      color: theme.text,
      fontFamily: 'Inter_600SemiBold',
      textAlign: 'center',
  },
});
