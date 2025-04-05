import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  Button,
  ScrollView,
  // SafeAreaView, // Removed as likely handled by layout
  // KeyboardAvoidingView, // Removed as likely handled by layout
  Platform,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import * as Speech from 'expo-speech';
import axios from 'axios'; // Make sure axios is imported
import AsyncStorage from '@react-native-async-storage/async-storage'; // Import AsyncStorage
import { Ionicons } from '@expo/vector-icons';
// import { db } from '../../firebase'; // Comment out Firebase import again
// import { collection, addDoc, serverTimestamp } from "firebase/firestore"; // Comment out Firestore functions again

// --- Replace key with placeholder for pushing --- 
const GEMINI_API_KEY = 'AIzaSyBdtbn0RmqhAvDEcQOAxbUod6u0W83CQnU'; 
// --- --- --- --- --- --- --- --- --- --- ------

// Use a potentially more current/available model name
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`;

// Define a key for storing topics
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

// Firebase is likely initialized in a layout file or _layout.tsx for this template
// We might not need to import it here directly, but keep firebase.js for config

export default function PodcastGeneratorScreen() {
  const [topic, setTopic] = useState('');
  const [generatedScript, setGeneratedScript] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGeneratePodcast = async () => {
    if (!GEMINI_API_KEY) {
        setError('Error: Gemini API Key not set. Please add it in app/(tabs)/index.tsx');
        return;
    }
    if (!topic.trim()) {
      setError('Please enter a topic.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setGeneratedScript('');

    console.log(`Generating podcast for: ${topic}`);

    // Construct the prompt for Gemini
    const prompt = `Generate a short, engaging podcast script (around 200-300 words) about the topic: "${topic}". The tone should be informative yet conversational. If possible, briefly mention 1-2 credible sources related to the topic within the script. Structure it like a mini-podcast segment.`;

    try {
      const response = await axios.post(GEMINI_API_URL, {
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
        // Optional: Configure generation parameters
        // generationConfig: {
        //   temperature: 0.7,
        //   maxOutputTokens: 500,
        // },
      }, {
        headers: {
          'Content-Type': 'application/json',
        }
      });

      // Extract text from the response - adjust based on actual Gemini API response structure
      const script = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (script) {
        setGeneratedScript(script.trim());
        const currentTopic = topic.trim(); // Get the topic before clearing
        setTopic(''); // Clear the input field

        // --- Save topic to AsyncStorage --- 
        try {
          // 1. Get existing topics
          const existingTopicsJson = await AsyncStorage.getItem(ASYNC_STORAGE_TOPICS_KEY);
          let existingTopics: string[] = existingTopicsJson ? JSON.parse(existingTopicsJson) : [];
          
          // 2. Add new topic if it doesn't exist (case-insensitive check)
          if (!existingTopics.some(t => t.toLowerCase() === currentTopic.toLowerCase())) {
            existingTopics.push(currentTopic);
            // Optional: Sort topics alphabetically or keep most recent at top/bottom
            existingTopics.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase())); 
            
            // 3. Save updated list
            await AsyncStorage.setItem(ASYNC_STORAGE_TOPICS_KEY, JSON.stringify(existingTopics));
            console.log("Topic saved to AsyncStorage:", currentTopic);
          } else {
            console.log("Topic already exists in AsyncStorage:", currentTopic);
          }
        } catch (storageError) {
          console.error("Error saving topic to AsyncStorage:", storageError);
          // Non-critical error, maybe show a small warning? For hackathon, console log is fine.
        }
        // --- End AsyncStorage Save ---

      } else {
        console.error('Invalid response structure from Gemini API:', response.data);
        setError('Failed to parse the generated script from the API response.');
      }
    } catch (err: any) { // Add type annotation for caught error
      console.error('Error calling Gemini API:', err);
      let errorMessage = 'Failed to generate podcast script. Please try again.';
      if (axios.isAxiosError(err) && err.response) {
        // Log more specific API error details if available
        console.error('API Error Status:', err.response.status);
        console.error('API Error Data:', err.response.data);
        errorMessage = `API Error (${err.response.status}): ${err.response.data?.error?.message || 'Unknown API error'}`;
      }
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSpeak = () => {
    if (generatedScript) {
      // More aggressive cleaning: Remove patterns like **anything** and trim
      const cleanedScript = generatedScript.replace(/\*\*[^\*]+\*\*\s*/g, '').trim(); 
      
      if (cleanedScript) { // Check if anything is left after cleaning
          Speech.speak(cleanedScript, {
            // language: 'en-US', // Optional: Specify language if needed
          });
      } else {
          setError('Script contained only non-speech parts.');
      }
    } else {
      setError('No script generated to speak.');
    }
  };

  const handleStopSpeaking = () => {
    Speech.stop();
  };

  return (
    <ScrollView 
      contentContainerStyle={styles.scrollContainer} 
      keyboardShouldPersistTaps="handled"
      style={{backgroundColor: theme.background}} // Set background on ScrollView itself
    >
      <Text style={styles.title}>Backlogz</Text> // Simplified Title

      <TextInput
        style={styles.input}
        placeholder="Enter topic to generate podcast..."
        placeholderTextColor={theme.textSecondary} 
        value={topic}
        onChangeText={setTopic}
        editable={!isLoading}
        keyboardAppearance="dark" // Use dark keyboard
      />

      {/* Generate Button */}
      <TouchableOpacity 
        style={[styles.button, styles.generateButton, (isLoading || !GEMINI_API_KEY) && styles.buttonDisabled]}
        onPress={handleGeneratePodcast}
        disabled={isLoading || !GEMINI_API_KEY}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color={theme.text} />
        ) : (
          <Text style={styles.buttonText}>Generate Script</Text>
        )}
      </TouchableOpacity>

      {!GEMINI_API_KEY && <Text style={styles.warningText}>API Key Needed!</Text>}

      {/* Use a simpler loading indicator text */}
      {isLoading && <Text style={styles.loadingText}>Generating...</Text>}

      {error && <Text style={styles.errorText}>{error}</Text>}

      {/* Playback Controls */}
      {generatedScript && !isLoading && (
          <View style={styles.playbackControlsContainer}>
             <TouchableOpacity 
               style={[styles.button, styles.playButton]} 
               onPress={handleSpeak} 
             >
               <Ionicons name="play" size={24} color={theme.text} />
             </TouchableOpacity>
             <TouchableOpacity 
               style={[styles.button, styles.stopButton]}
               onPress={handleStopSpeaking}
             >
                <Ionicons name="stop" size={24} color={theme.text} />
             </TouchableOpacity>
          </View>
      )}

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
      flexGrow: 1,
      alignItems: 'center',
      justifyContent: 'center', // Center content vertically now
      padding: 20,
      // Removed background color here, applied to ScrollView
  },
  title: {
      fontSize: 32, 
      fontFamily: 'Inter_700Bold',
      marginBottom: 40, 
      textAlign: 'center',
      color: theme.text, 
  },
  input: {
      height: 55,
      borderColor: theme.border,
      borderWidth: 1,
      borderRadius: 12, 
      marginBottom: 25, 
      paddingHorizontal: 20,
      width: '100%',
      backgroundColor: theme.card, // Darker input background
      fontSize: 17,
      fontFamily: 'Inter_400Regular', // Regular font for input
      color: theme.text, // White text in input
  },
  button: { // Base button style
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12, 
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    minHeight: 50, 
    borderWidth: 1, // Add subtle border
    borderColor: 'transparent', // Default border is transparent
  },
  buttonText: {
    color: theme.text,
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold', // Use SemiBold for button text
  },
  buttonDisabled: {
    backgroundColor: theme.inactive,
    opacity: 0.5,
    borderColor: theme.inactive,
  },
  // Specific Button Types
  generateButton: {
      backgroundColor: theme.primary, // Accent color
      borderColor: theme.primary,
      width: '100%', // Full width
      marginBottom: 15,
  },
  playbackControlsContainer: {
      flexDirection: 'row',
      justifyContent: 'center', // Center Play/Stop
      alignItems: 'center',
      width: '80%', // Controls container width
      marginTop: 40, 
  },
  playButton: {
    backgroundColor: theme.primary, // Accent for play
    borderColor: theme.primary,
    flex: 1, // Take available space
    marginRight: 10, // Space between play/stop
    // Remove fixed width
  },
  stopButton: {
    backgroundColor: theme.card, // Use card background for stop
    borderColor: theme.textSecondary, // Use secondary text for border
    width: 60, // Make stop button smaller, square-ish
    paddingHorizontal: 0, // Remove horizontal padding for icon only
  },
  loadingText: { 
    marginTop: 20,
    color: theme.textSecondary,
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
  },
  errorText: {
    color: theme.error,
    marginTop: 15,
    marginBottom: 10,
    textAlign: 'center',
    paddingHorizontal: 10, 
    fontFamily: 'Inter_400Regular',
  },
  warningText: {
      color: theme.warning,
      fontSize: 12,
      marginTop: -5,
      marginBottom: 15,
      textAlign: 'center',
      fontFamily: 'Inter_400Regular',
  },
});
