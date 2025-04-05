import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

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

export default function AddTopicModal() {
  const [newTopic, setNewTopic] = useState('');
  const router = useRouter();

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
        console.log("Topic added:", topicToAdd);
        router.back(); // Go back to previous screen
      } else {
        Alert.alert("Duplicate", `The topic "${topicToAdd}" already exists.`);
      }
    } catch (storageError) {
      console.error("Error saving topic:", storageError);
      Alert.alert('Error', 'Failed to save the new topic.');
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"} 
      style={styles.container}
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
            onPress={() => router.back()}
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
  );
}

const styles = StyleSheet.create({
  container: {
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