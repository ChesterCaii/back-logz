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
import { useRouter, useLocalSearchParams } from 'expo-router';

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

export default function AddNoteModal() {
  const [newNote, setNewNote] = useState('');
  const router = useRouter();
  const { topicName } = useLocalSearchParams<{ topicName: string }>();

  const handleAddNote = async () => {
    const noteToAdd = newNote.trim();
    if (!noteToAdd) {
      Alert.alert("Input Error", "Please enter a note.");
      return;
    }

    try {
      const notesJson = await AsyncStorage.getItem(`@BacklogzApp:notes:${topicName}`);
      let existingNotes: string[] = notesJson ? JSON.parse(notesJson) : [];

      existingNotes.push(noteToAdd);
      await AsyncStorage.setItem(`@BacklogzApp:notes:${topicName}`, JSON.stringify(existingNotes));
      console.log("Note added:", noteToAdd);
      router.back(); // Go back to notes list
    } catch (error) {
      console.error("Error saving note:", error);
      Alert.alert('Error', 'Failed to save the note.');
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"} 
      style={styles.container}
    >
      <View style={styles.modalView}>
        <Text style={styles.modalTitle}>Add Note</Text>
        <TextInput
          style={styles.modalInput}
          placeholder="Enter your note"
          placeholderTextColor={theme.textSecondary}
          value={newNote}
          onChangeText={setNewNote}
          autoFocus={true}
          keyboardAppearance="dark"
          multiline={true}
          numberOfLines={4}
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
            onPress={handleAddNote}
          >
            <Text style={styles.modalButtonText}>Add Note</Text>
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
    minHeight: 100,
    borderColor: theme.border,
    backgroundColor: theme.background,
    color: theme.text,
    borderWidth: 1,
    borderRadius: 10,
    marginBottom: 30,
    paddingHorizontal: 15,
    paddingVertical: 10,
    width: '100%',
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    textAlignVertical: 'top',
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