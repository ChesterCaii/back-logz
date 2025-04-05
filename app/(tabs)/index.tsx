import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  // TextInput, // Removed
  // ScrollView, // Removed (using View for centered content)
  Platform,
  ActivityIndicator,
  TouchableOpacity,
  Alert, // For showing errors or messages
} from 'react-native';
import * as Speech from 'expo-speech';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router'; // To reload topics when tab focused

// --- API Key & Constants --- 
const GEMINI_API_KEY = 'YOUR_API_KEY_HERE'; // Placeholder for push
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`;
const ASYNC_STORAGE_TOPICS_KEY = '@BacklogzApp:topics';

// --- Theme --- (Keep for styling)
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

// --- Component --- 
export default function QuickPlayScreen() { // Renamed component
  const [isLoading, setIsLoading] = useState(false); // Loading state for generation/speech
  const [topics, setTopics] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  // --- Load Topics Function --- 
  const loadTopics = useCallback(async () => {
    console.log('QuickPlay: Loading topics...');
    try {
      const topicsJson = await AsyncStorage.getItem(ASYNC_STORAGE_TOPICS_KEY);
      const loadedTopics = topicsJson ? JSON.parse(topicsJson) : [];
      setTopics(loadedTopics);
      console.log('QuickPlay: Topics loaded:', loadedTopics.length);
    } catch (e) {
      console.error('QuickPlay: Failed to load topics.', e);
      // Don't alert here, handle empty list in playRandom
    }
  }, []);

  // Reload topics when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadTopics();
    }, [loadTopics])
  );

  // --- Play Random Logic --- 
  const handlePlayRandom = async () => {
    setError(null);
    Speech.stop(); // Stop any previous speech

    if (topics.length === 0) {
      setError("Your backlog is empty! Add topics in the Backlog tab first.");
      // Optionally reload topics here in case they were just added
      // loadTopics();
      return;
    }
    
    // 1. Pick Random Topic
    const randomIndex = Math.floor(Math.random() * topics.length);
    const randomTopic = topics[randomIndex];
    console.log(`Playing random topic: ${randomTopic}`);
    setIsLoading(true);
    
    // 2. Generate Script via Gemini
    const prompt = `Generate a short, engaging podcast script (around 200-300 words) about the topic: "${randomTopic}". The tone should be informative yet conversational. If possible, briefly mention 1-2 credible sources related to the topic within the script. Structure it like a mini-podcast segment.`;

    try {
      const response = await axios.post(GEMINI_API_URL, {
        contents: [{ parts: [{ text: prompt }] }],
      }, { headers: { 'Content-Type': 'application/json' } });

      const script = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (script) {
        // 3. Clean and Speak Immediately
        const cleanedScript = script.replace(/\*\*[^\*]+\*\*\s*/g, '').trim();
        if (cleanedScript) {
          Speech.speak(cleanedScript, {
            onDone: () => setIsLoading(false), // Stop loading when speech finishes
            onError: (err) => {
                console.error('Speech error:', err);
                setError('Failed to play audio for the topic.');
                setIsLoading(false);
            }
          });
          // Note: isLoading remains true WHILE speaking
        } else {
          setError('Generated script was empty after cleaning.');
          setIsLoading(false);
        }
      } else {
        console.error('Invalid response structure from Gemini API:', response.data);
        setError('Failed to parse the generated script.');
        setIsLoading(false);
      }
    } catch (err: any) { // API Error
      console.error('Error calling Gemini API for random play:', err);
      let errorMessage = 'Failed to generate script for the random topic.';
      if (axios.isAxiosError(err) && err.response) {
        errorMessage = `API Error (${err.response.status}): ${err.response.data?.error?.message || 'Unknown API error'}`;
      }
      setError(errorMessage);
      setIsLoading(false);
    }
    // Note: We don't set isLoading(false) here if speech started, it's handled by onDone/onError
  };
  
  // --- Stop Speech --- (if user wants to stop mid-generation/speech)
  const handleStop = () => {
      Speech.stop();
      setIsLoading(false); // Also stop loading indicator if stopped manually
  }

  // --- Render --- 
  return (
    // Use View for centering, ScrollView not needed for this layout
    <View style={styles.container}> 
      <Text style={styles.title}>Quick Play</Text>
      <Text style={styles.subtitle}>Tap below to play a random topic from your backlog</Text>

      {/* Big Play Button */}      
      <TouchableOpacity 
        style={[styles.playButton, isLoading && styles.buttonDisabled]} 
        onPress={handlePlayRandom}
        disabled={isLoading}
      >
        {isLoading ? (
            <ActivityIndicator size="large" color={theme.text} /> 
        ) : (
            <Ionicons name="play" size={60} color={theme.text} />
        )}
      </TouchableOpacity>

      {/* Show Stop button only while loading/speaking */}      
      {isLoading && (
          <TouchableOpacity 
            style={[styles.stopButton]}
            onPress={handleStop}
          >
             <Ionicons name="stop" size={24} color={theme.text} />
          </TouchableOpacity>
      )}

      {/* Display Errors */}      
      {error && <Text style={styles.errorText}>{error}</Text>}
      
      {/* API Key Warning (Keep just in case) */}
      {!GEMINI_API_KEY && <Text style={styles.warningText}>API Key Missing!</Text>}
      
    </View>
  );
}

// --- Styles --- 
const styles = StyleSheet.create({
  container: { // Changed from scrollContainer
      flex: 1, // Take full screen
      alignItems: 'center',
      justifyContent: 'center', // Center everything
      padding: 30, // Generous padding
      backgroundColor: theme.background, 
  },
  title: {
      fontSize: 36, // Even larger title
      fontFamily: 'Inter_700Bold',
      marginBottom: 15, 
      textAlign: 'center',
      color: theme.text, 
  },
  subtitle: {
      fontSize: 16, 
      fontFamily: 'Inter_400Regular',
      marginBottom: 60, // Large space before button
      textAlign: 'center',
      color: theme.textSecondary, 
  },
  playButton: {
    backgroundColor: theme.primary, 
    width: 150, // Large button
    height: 150,
    borderRadius: 75, // Make it circular
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40, // Space below play button
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  buttonDisabled: {
    backgroundColor: theme.inactive,
    opacity: 0.5,
  },
  stopButton: {
    backgroundColor: theme.card, 
    borderColor: theme.textSecondary, 
    borderWidth: 1,
    width: 70, // Smaller stop button
    height: 70,
    borderRadius: 35, // Circular
    paddingHorizontal: 0, 
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20, // Space above stop button
  },
  errorText: {
    color: theme.error,
    marginTop: 30, // More space for error
    textAlign: 'center',
    paddingHorizontal: 10, 
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
  },
  warningText: {
      color: theme.warning,
      fontSize: 12,
      marginTop: 15,
      fontFamily: 'Inter_400Regular',
      position: 'absolute', // Keep out of the way
      bottom: 20,
  },
  // Removed unused styles: input, generateButton, loadingText, playbackControlsContainer
});
