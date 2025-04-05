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
import { useLocalSearchParams } from 'expo-router'; // Import hook to get params

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
  const params = useLocalSearchParams<{ topicToPlay?: string }>(); // Get params

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

  // --- Play Specific Topic Logic --- 
  const playSpecificTopic = useCallback(async (topic: string) => {
      setError(null);
      Speech.stop();
      console.log(`Playing specific topic: ${topic}`);
      console.log('SETTING isLoading = true (playSpecificTopic start)');
      setIsLoading(true);
      
      // Generate Script via Gemini (same logic as random, but with specific topic)
      const prompt = `Generate a short, engaging podcast script (around 200-300 words) about the topic: "${topic}". The tone should be informative yet conversational. If possible, briefly mention 1-2 credible sources related to the topic within the script. Structure it like a mini-podcast segment.`;
      try {
          const response = await axios.post(GEMINI_API_URL, { contents: [{ parts: [{ text: prompt }] }], }, { headers: { 'Content-Type': 'application/json' } });
          const script = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (script) {
              const cleanedScript = script.replace(/\*\*[^\*]+\*\*\s*/g, '').trim();
              if (cleanedScript) {
                  Speech.speak(cleanedScript, {
                      onDone: () => {
                           console.log('SETTING isLoading = false (speech onDone)');
                           setIsLoading(false);
                      }, 
                      onError: (err) => { 
                          console.error('Speech error:', err);
                          setError('Failed to play audio for the topic.');
                          console.log('SETTING isLoading = false (speech onError)');
                          setIsLoading(false);
                      }
                  });
              } else {
                  setError('Generated script was empty after cleaning.');
                  console.log('SETTING isLoading = false (empty cleaned script)');
                  setIsLoading(false);
              }
          } else {
              console.error('Invalid response structure from Gemini API:', response.data);
              setError('Failed to parse the generated script.');
              console.log('SETTING isLoading = false (invalid API response)');
              setIsLoading(false);
          }
      } catch (err: any) { // API Error
          console.error('Error calling Gemini API for random play:', err);
          let errorMessage = 'Failed to generate script for the random topic.';
          if (axios.isAxiosError(err) && err.response) {
              errorMessage = `API Error (${err.response.status}): ${err.response.data?.error?.message || 'Unknown API error'}`;
          }
          setError(errorMessage);
          console.log('SETTING isLoading = false (API catch block)');
          setIsLoading(false);
      }
  }, []); // Dependencies: none needed directly, uses state/constants

  // --- Play Random Logic --- 
  const handlePlayRandom = async () => {
    setError(null);
    Speech.stop(); // Stop any previous speech

    if (topics.length === 0) {
      setError("Your backlog is empty! Add topics in the Backlog tab first.");
      return;
    }
    
    // 1. Pick Random Topic
    const randomIndex = Math.floor(Math.random() * topics.length);
    const randomTopic = topics[randomIndex];
    console.log(`Playing random topic: ${randomTopic}`);
    
    playSpecificTopic(randomTopic); // Reuse the specific play logic
  };

  // --- Effect to Play Topic from Params --- 
  useEffect(() => {
    // Check if launched with a topic parameter
    const topicFromParam = params.topicToPlay;
    if (topicFromParam) {
        // We need a slight delay or state check to ensure this doesn't fire *every* time
        // For simplicity now, we play it. Could refine with state.
        console.log('Received topicToPlay param:', topicFromParam);
        playSpecificTopic(topicFromParam);
        // How to clear the param? Navigation state resets usually handle this,
        // but might need manual clearing if it persists across focuses.
    }
  }, [params, playSpecificTopic]); // Depend on params

  // Reload topics when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadTopics();
    }, [loadTopics])
  );

  // --- Stop Speech --- (if user wants to stop mid-generation/speech)
  const handleStop = () => {
      Speech.stop();
      setError(null); 
      console.log('SETTING isLoading = false (handleStop)');
      setIsLoading(false); 
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
