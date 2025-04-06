import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
  TouchableOpacity,
  Animated,
  ScrollView,
  LayoutChangeEvent,
} from "react-native";
import * as Speech from "expo-speech";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import Slider from "@react-native-community/slider";
import {
  useFonts,
  Poppins_400Regular,
  Poppins_700Bold,
} from "@expo-google-fonts/poppins";

// --- API Key & Constants ---
const GEMINI_API_KEY = "AIzaSyC9ySnOAZai1jYTkSEEKQW_Q1Ef7AD6X_s"; // Placeholder API key
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`;
const ASYNC_STORAGE_TOPICS_KEY = "@BacklogzApp:topics";

// --- Theme ---
const theme = {
  background: "#121212",
  card: "#1e1e1e",
  text: "#ffffff",
  textSecondary: "#b0b0b0",
  primary: "#00bcd4", // Blue (for controls)
  inactive: "#757575",
  border: "#272727",
  error: "#cf6679",
  success: "#4caf50",
  warning: "#ffab00",
  stop: "#f44336",
  gradientStart: "#1f1c2c",
  gradientEnd: "#928dab",
};

export default function QuickPlayScreen() {
  // Load fonts
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_700Bold,
  });

  // State variables
  const [isLoading, setIsLoading] = useState(false);
  const [topics, setTopics] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [currentTopic, setCurrentTopic] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string>("");
  const [progress, setProgress] = useState(0); // Overall progress (0 to 1)
  const [estimatedDuration, setEstimatedDuration] = useState(0); // in seconds
  const [transcriptParagraphs, setTranscriptParagraphs] = useState<string[]>(
    []
  );
  const [activeParagraphIndex, setActiveParagraphIndex] = useState(0);

  // For auto-scrolling container and paragraph measurements
  const transcriptScrollViewRef = useRef<ScrollView>(null);
  const [containerHeight, setContainerHeight] = useState(0);
  const [paragraphLayouts, setParagraphLayouts] = useState<
    { y: number; height: number }[]
  >([]);

  const params = useLocalSearchParams<{ topicToPlay?: string }>();
  const router = useRouter();

  // Animated scale for play button
  const scaleValue = useRef(new Animated.Value(1)).current;
  const onPressIn = () => {
    Animated.spring(scaleValue, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };
  const onPressOut = () => {
    Animated.spring(scaleValue, {
      toValue: 1,
      friction: 3,
      useNativeDriver: true,
    }).start();
  };

  // Ref to store the progress timer ID
  const progressTimerRef = useRef<NodeJS.Timeout | null>(null);

  // --- Start the progress timer ---
  const startProgressTimer = (startingProgress = 0, duration: number) => {
    if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    const interval = 50; // update every 50ms
    const totalTicks = (duration * 1000) / interval;
    let tickCount = startingProgress * totalTicks;
    progressTimerRef.current = setInterval(() => {
      tickCount++;
      const newProgress = tickCount / totalTicks;
      setProgress(newProgress > 1 ? 1 : newProgress);
      if (newProgress >= 1) {
        clearInterval(progressTimerRef.current!);
        progressTimerRef.current = null;
      }
    }, interval);
  };

  // --- Stop the progress timer ---
  const stopProgressTimer = () => {
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
  };

  // --- Set Transcript Paragraphs ---
  const updateTranscriptParagraphs = useCallback((text: string) => {
    const paragraphs = text.includes("\n")
      ? text.split("\n").filter((p) => p.trim().length > 0)
      : text
          .split(". ")
          .map((p, i, arr) => (i < arr.length - 1 ? p + ". " : p));
    setTranscriptParagraphs(paragraphs);
  }, []);

  // --- Compute Active Paragraph Based on Overall Progress ---
  useEffect(() => {
    if (transcriptParagraphs.length === 0) {
      setActiveParagraphIndex(0);
      return;
    }
    const totalWords = transcriptParagraphs.reduce(
      (sum, para) => sum + para.split(" ").length,
      0
    );
    const currentWord = Math.floor(totalWords * progress);
    let cumulative = 0;
    let index = 0;
    for (let i = 0; i < transcriptParagraphs.length; i++) {
      cumulative += transcriptParagraphs[i].split(" ").length;
      if (currentWord < cumulative) {
        index = i;
        break;
      }
    }
    setActiveParagraphIndex(index);
  }, [progress, transcriptParagraphs]);

  // --- Auto-Scroll to Active Paragraph using measured layouts ---
  useEffect(() => {
    if (paragraphLayouts.length === 0 || containerHeight === 0) return;
    if (activeParagraphIndex < paragraphLayouts.length) {
      const { y, height } = paragraphLayouts[activeParagraphIndex];
      const offset = y + height / 2 - containerHeight / 2;
      transcriptScrollViewRef.current?.scrollTo({ y: offset, animated: true });
    }
  }, [activeParagraphIndex, paragraphLayouts, containerHeight]);

  // --- Load Topics Function ---
  const loadTopics = useCallback(async () => {
    console.log("QuickPlay: Loading topics...");
    try {
      const topicsJson = await AsyncStorage.getItem(ASYNC_STORAGE_TOPICS_KEY);
      const loadedTopics = topicsJson ? JSON.parse(topicsJson) : [];
      setTopics(loadedTopics);
      console.log("QuickPlay: Topics loaded:", loadedTopics.length);
    } catch (e) {
      console.error("QuickPlay: Failed to load topics.", e);
    }
  }, []);

  // --- Play Specific Topic ---
  const playSpecificTopic = useCallback(
    async (topic: string) => {
      setError(null);
      Speech.stop();
      stopProgressTimer();
      setIsLoading(true);
      setCurrentTopic(topic);
      setTranscript("");
      setProgress(0);
      setTranscriptParagraphs([]);
      setParagraphLayouts([]);

      const prompt = `Generate a short, engaging podcast script (around 200-300 words) about the topic: "${topic}". The tone should be informative yet conversational. If possible, briefly mention 1-2 credible sources related to the topic within the script. Structure it like a mini-podcast segment.`;
      try {
        const response = await axios.post(
          GEMINI_API_URL,
          { contents: [{ parts: [{ text: prompt }] }] },
          { headers: { "Content-Type": "application/json" } }
        );
        const script =
          response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (script) {
          const cleanedScript = script.replace(/\*\*[^\*]+\*\*\s*/g, "").trim();
          if (cleanedScript) {
            setTranscript(cleanedScript);
            updateTranscriptParagraphs(cleanedScript);
            const totalWords = cleanedScript.split(" ").length;
            const duration = totalWords / 2.5; // estimated reading time in seconds
            setEstimatedDuration(duration);
            startProgressTimer(0, duration);
            Speech.speak(cleanedScript, {
              onDone: () => {
                console.log("Speech done; setting isLoading to false");
                stopProgressTimer();
                setIsLoading(false);
                setCurrentTopic(null);
              },
              onError: (err) => {
                console.error("Speech error:", err);
                setError("Failed to play audio for the topic.");
                stopProgressTimer();
                setIsLoading(false);
                setCurrentTopic(null);
              },
            });
          } else {
            setError("Generated script was empty after cleaning.");
            setIsLoading(false);
            setCurrentTopic(null);
          }
        } else {
          console.error("Invalid response structure:", response.data);
          setError("Failed to parse the generated script.");
          setIsLoading(false);
          setCurrentTopic(null);
        }
      } catch (err: any) {
        console.error("Error calling Gemini API:", err);
        let errorMessage = "Failed to generate script for the topic.";
        if (axios.isAxiosError(err) && err.response) {
          errorMessage = `API Error (${err.response.status}): ${
            err.response.data?.error?.message || "Unknown error"
          }`;
        }
        setError(errorMessage);
        setIsLoading(false);
        setCurrentTopic(null);
      }
    },
    [updateTranscriptParagraphs]
  );

  // --- Play Random Logic ---
  const handlePlayRandom = async () => {
    if (isLoading) return; // Prevent starting a new podcast if one is already running
    setError(null);
    Speech.stop();
    stopProgressTimer();
    if (topics.length === 0) {
      setError("Your backlog is empty! Add topics in the Backlog tab first.");
      return;
    }
    const randomIndex = Math.floor(Math.random() * topics.length);
    const randomTopic = topics[randomIndex];
    console.log(`Playing random topic: ${randomTopic}`);
    playSpecificTopic(randomTopic);
  };

  // --- Stop Speech Handler ---
  const handleStop = () => {
    Speech.stop();
    stopProgressTimer();
    setError(null);
    console.log("Stopping speech and resetting state");
    setIsLoading(false);
    setCurrentTopic(null);
  };

  useEffect(() => {
    const topicFromParam = params.topicToPlay;
    if (topicFromParam) {
      console.log("Received topicToPlay param:", topicFromParam);
      playSpecificTopic(topicFromParam);
    }
  }, [params.topicToPlay, playSpecificTopic]);

  useFocusEffect(
    useCallback(() => {
      loadTopics();
    }, [loadTopics])
  );

  if (!fontsLoaded) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  // Render transcript paragraphs (all in white)
  const renderTranscriptParagraphs = () => {
    return transcriptParagraphs.map((para, index) => (
      <Text
        key={index}
        style={styles.transcriptParagraph}
        onLayout={(event: LayoutChangeEvent) => {
          const { y, height } = event.nativeEvent.layout;
          setParagraphLayouts((prev) => {
            const newLayouts = [...prev];
            newLayouts[index] = { y, height };
            return newLayouts;
          });
        }}
      >
        {para}
      </Text>
    ));
  };

  return (
    <LinearGradient
      colors={[theme.gradientStart, theme.gradientEnd]}
      style={styles.gradientContainer}
    >
      <View style={styles.container}>
        <Text style={styles.title}>Quick Play</Text>
        <Text style={styles.subtitle}>
          {currentTopic
            ? `Now playing: ${currentTopic}`
            : "Tap below to spark a random podcast script from your backlog"}
        </Text>

        {/* Animated Play Button */}
        <Animated.View
          style={[
            styles.playButtonContainer,
            { transform: [{ scale: scaleValue }] },
          ]}
        >
          <TouchableOpacity
            style={[styles.playButton, isLoading && styles.buttonDisabled]}
            onPressIn={onPressIn}
            onPressOut={onPressOut}
            onPress={handlePlayRandom}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="large" color={theme.text} />
            ) : (
              <Ionicons name="play" size={60} color={theme.text} />
            )}
          </TouchableOpacity>
        </Animated.View>

        {/* Control: Stop Button */}
        {isLoading && (
          <View style={styles.controlsContainer}>
            <TouchableOpacity style={styles.controlButton} onPress={handleStop}>
              <Ionicons name="stop" size={24} color={theme.text} />
            </TouchableOpacity>
            {currentTopic && (
              <TouchableOpacity
                style={styles.controlButton}
                onPress={() =>
                  router.push({
                    pathname: "/(modals)/view-notes",
                    params: { topicName: currentTopic },
                  })
                }
              >
                <Ionicons
                  name="document-text-outline"
                  size={24}
                  color={theme.text}
                />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Transcript Container */}
        {transcript ? (
          <ScrollView
            style={styles.transcriptContainer}
            ref={transcriptScrollViewRef}
            onLayout={(e) => setContainerHeight(e.nativeEvent.layout.height)}
          >
            {renderTranscriptParagraphs()}
          </ScrollView>
        ) : null}

        {/* Progress Slider (visual simulation only) */}
        {transcript ? (
          <View style={styles.sliderContainer}>
            <Slider
              style={styles.slider}
              minimumValue={0}
              maximumValue={1}
              value={progress}
              minimumTrackTintColor={theme.primary}
              maximumTrackTintColor={theme.textSecondary}
              onValueChange={(value) => setProgress(value)}
            />
            <Text style={styles.progressText}>
              {Math.round(progress * estimatedDuration)}s /{" "}
              {Math.round(estimatedDuration)}s
            </Text>
          </View>
        ) : null}

        {/* Display Errors */}
        {error && <Text style={styles.errorText}>{error}</Text>}
        {!GEMINI_API_KEY && (
          <Text style={styles.warningText}>API Key Missing!</Text>
        )}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradientContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
    backgroundColor: theme.background,
  },
  title: {
    fontSize: 38,
    fontFamily: "Poppins_700Bold",
    marginBottom: 15,
    textAlign: "center",
    color: theme.text,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: "Poppins_400Regular",
    marginBottom: 60,
    textAlign: "center",
    color: theme.textSecondary,
    paddingHorizontal: 20,
  },
  playButtonContainer: {
    marginBottom: 40,
  },
  playButton: {
    backgroundColor: theme.primary,
    width: 150,
    height: 150,
    borderRadius: 75,
    justifyContent: "center",
    alignItems: "center",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  buttonDisabled: {
    backgroundColor: theme.inactive,
    opacity: 0.5,
  },
  controlsContainer: {
    flexDirection: "row",
    gap: 16,
    marginTop: 20,
  },
  controlButton: {
    backgroundColor: theme.card,
    borderColor: theme.textSecondary,
    borderWidth: 1,
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: "center",
    alignItems: "center",
  },
  transcriptContainer: {
    marginTop: 20,
    padding: 10,
    backgroundColor: theme.card,
    borderRadius: 10,
    width: "100%",
    maxHeight: 200,
  },
  transcriptParagraph: {
    fontFamily: "Poppins_400Regular",
    fontSize: 16,
    lineHeight: 24,
    marginVertical: 8,
    textAlign: "center",
    color: theme.text,
    paddingHorizontal: 8,
  },
  sliderContainer: {
    width: "100%",
    marginTop: 20,
    alignItems: "center",
  },
  slider: {
    width: "100%",
    height: 40,
  },
  progressText: {
    color: theme.textSecondary,
    fontFamily: "Poppins_400Regular",
    fontSize: 14,
  },
  errorText: {
    color: theme.error,
    marginTop: 30,
    textAlign: "center",
    paddingHorizontal: 10,
    fontFamily: "Poppins_400Regular",
    fontSize: 15,
  },
  warningText: {
    color: theme.warning,
    fontSize: 12,
    marginTop: 15,
    fontFamily: "Poppins_400Regular",
    position: "absolute",
    bottom: 20,
  },
});
