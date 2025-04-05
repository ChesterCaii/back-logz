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
// import { db } from '../../firebase'; // Comment out Firebase import again
// import { collection, addDoc, serverTimestamp } from "firebase/firestore"; // Comment out Firestore functions again

// --- Replace key with placeholder for pushing --- 
const GEMINI_API_KEY = 'YOUR_API_KEY_HERE'; 
// --- --- --- --- --- --- --- --- --- --- ------

// Use a potentially more current/available model name
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`;

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
        setTopic(''); // <-- Clear the input field here
        // --- Comment out Firestore Add again --- 
        /* 
        try {
          const topicsCol = collection(db, "topics");
          await addDoc(topicsCol, {
            name: topic.trim(), // Save the topic name
            createdAt: serverTimestamp() // Add a timestamp
          });
          console.log("Topic saved to Firestore:", topic);
        } catch (firestoreError) {
          console.error("Error saving topic to Firestore:", firestoreError);
          // Optionally notify the user, but maybe not critical for hackathon
          // setError('Generated script, but failed to save topic to backlog.'); 
        }
        */
        // console.log("Firestore saving temporarily disabled.") // Add log message
        // --- End Firestore Add ---
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
      // Clean the script: Remove patterns like **...** and trim whitespace before speaking
      const cleanedScript = generatedScript.replace(/\*\*.*?\*\*\s*/g, '').trim(); // Use broader regex and trim
      
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
    // Removed SafeAreaView and KeyboardAvoidingView - assuming handled by layout
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <Text style={styles.title}>Backlogz Podcast Generator</Text>

      <TextInput
        style={styles.input}
        placeholder="Enter a topic (e.g., 'Quantum Computing')"
        placeholderTextColor="#999"
        value={topic}
        onChangeText={setTopic}
        editable={!isLoading}
      />

      <TouchableOpacity 
        style={[styles.button, (isLoading || !GEMINI_API_KEY) && styles.buttonDisabled]}
        onPress={handleGeneratePodcast}
        disabled={isLoading || !GEMINI_API_KEY}
      >
        <Text style={styles.buttonText}>{isLoading ? 'Generating...' : 'Generate Podcast Script'}</Text>
      </TouchableOpacity>

      {!GEMINI_API_KEY && <Text style={styles.warningText}>API Key Needed!</Text>}

      {isLoading && (
        <ActivityIndicator size="large" color="#0000ff" style={styles.loader} />
      )}

      {error && <Text style={styles.errorText}>{error}</Text>}

      {generatedScript ? (
        <View style={styles.scriptContainer}>
          <Text style={styles.scriptTitle}>Generated Script:</Text>
          <Text style={styles.scriptText}>{generatedScript}</Text>
          <View style={styles.buttonRow}>
            <TouchableOpacity 
              style={[styles.button, styles.speakButton, isLoading && styles.buttonDisabled]}
              onPress={handleSpeak}
              disabled={isLoading} 
            >
              <Text style={styles.buttonText}>Speak Script</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.button, styles.stopButton]}
              onPress={handleStopSpeaking}
            >
               <Text style={styles.buttonText}>Stop Speaking</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    padding: 20,
    paddingTop: 40, 
    backgroundColor: '#f0f4f8',
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
    color: '#333',
  },
  input: {
    height: 50,
    borderColor: '#d0d0d0',
    borderWidth: 1,
    borderRadius: 10,
    marginBottom: 20,
    paddingHorizontal: 15,
    width: '100%',
    backgroundColor: '#ffffff',
    fontSize: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2, 
  },
  button: {
    backgroundColor: '#007bff',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
    alignItems: 'center',
    width: '80%',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonDisabled: {
    backgroundColor: '#cccccc',
    opacity: 0.7,
  },
  speakButton: {
    backgroundColor: '#28a745',
    width: '45%',
  },
  stopButton: {
    backgroundColor: '#dc3545',
    width: '45%',
  },
  loader: {
    marginTop: 20,
  },
  errorText: {
    color: 'red',
    marginTop: 10,
    marginBottom: 10,
    textAlign: 'center',
    paddingHorizontal: 10, 
  },
  warningText: {
      color: 'orange',
      fontSize: 12,
      marginTop: 5,
      marginBottom: 15,
      textAlign: 'center',
  },
  scriptContainer: {
    marginTop: 30,
    padding: 20,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  scriptTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  scriptText: {
    fontSize: 16,
    lineHeight: 26,
    marginBottom: 20,
    color: '#555',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 10,
  },
});
