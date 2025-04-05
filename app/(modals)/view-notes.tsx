import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Alert,
  SafeAreaView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

// Theme (matching the rest of the app)
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

export default function ViewNotesModal() {
  const [notes, setNotes] = useState<string[]>([]);
  const router = useRouter();
  const { topicName } = useLocalSearchParams<{ topicName: string }>();

  const loadNotes = useCallback(async () => {
    try {
      const notesJson = await AsyncStorage.getItem(`@BacklogzApp:notes:${topicName}`);
      const loadedNotes = notesJson ? JSON.parse(notesJson) : [];
      setNotes(loadedNotes);
    } catch (e) {
      console.error('Failed to load notes:', e);
      Alert.alert('Error', 'Failed to load notes.');
    }
  }, [topicName]);

  // Use useFocusEffect instead of useEffect to reload notes when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadNotes();
    }, [loadNotes])
  );

  const handleDeleteNote = async (noteToDelete: string) => {
    Alert.alert(
      'Delete Note',
      'Are you sure you want to delete this note?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const updatedNotes = notes.filter(note => note !== noteToDelete);
              await AsyncStorage.setItem(
                `@BacklogzApp:notes:${topicName}`,
                JSON.stringify(updatedNotes)
              );
              setNotes(updatedNotes);
            } catch (e) {
              console.error('Failed to delete note:', e);
              Alert.alert('Error', 'Failed to delete note.');
            }
          }
        }
      ]
    );
  };

  const renderNote = ({ item }: { item: string }) => (
    <View style={styles.noteItem}>
      <Text style={styles.noteText}>{item}</Text>
      <TouchableOpacity
        onPress={() => handleDeleteNote(item)}
        style={styles.deleteButton}
      >
        <Ionicons name="trash-outline" size={20} color={theme.error} />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Notes for {topicName}</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
          <Ionicons name="close" size={24} color={theme.text} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={notes}
        renderItem={renderNote}
        keyExtractor={(item, index) => index.toString()}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No notes yet. Add one below!</Text>
        }
      />

      <TouchableOpacity
        style={styles.addButton}
        onPress={() => router.push({
          pathname: '/(modals)/add-note',
          params: { topicName }
        })}
      >
        <Ionicons name="add" size={30} color={theme.text} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 10,
    backgroundColor: theme.background,
  },
  title: {
    fontSize: 20,
    fontFamily: 'Inter_600SemiBold',
    color: theme.text,
    flex: 1,
  },
  closeButton: {
    padding: 8,
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100, // Space for the add button
  },
  noteItem: {
    flexDirection: 'row',
    backgroundColor: theme.card,
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    alignItems: 'center',
  },
  noteText: {
    flex: 1,
    color: theme.text,
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
  },
  deleteButton: {
    padding: 8,
  },
  emptyText: {
    textAlign: 'center',
    color: theme.textSecondary,
    fontSize: 16,
    marginTop: 20,
    fontFamily: 'Inter_400Regular',
  },
  addButton: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
}); 