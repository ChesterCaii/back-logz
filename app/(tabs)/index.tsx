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
  Alert,
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
const GEMINI_API_KEY = "API KEY";
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`;
const ASYNC_STORAGE_TOPICS_KEY = "@BacklogzApp:topics";

// --- Theme ---
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
  gradientStart: "#1f1c2c",
  gradientEnd: "#928dab",
};

/**
 * Helper function to extract key topics from a transcript.
 * It sends a prompt to Gemini asking for key topics as a comma-separated list.
 */
const getKeyTopicsFromTranscript = async (
  transcript: string
): Promise<string[]> => {
  const prompt = `Extract the key topics from the following transcript. Return them as a comma-separated list. Transcript: "${transcript}"`;
  try {
    const response = await axios.post(
      GEMINI_API_URL,
      { contents: [{ parts: [{ text: prompt }] }] },
      { headers: { "Content-Type": "application/json" } }
    );
    const topicsText =
      response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (topicsText) {
      // Assumes topics are comma-separated.
      const topics = topicsText
        .split(",")
        .map((t: string) => t.trim())
        .filter((t: string) => t.length > 0);
      return topics;
    } else {
      console.error("No topics were returned from Gemini.");
      return [];
    }
  } catch (error) {
    console.error("Error extracting topics from transcript:", error);
    return [];
  }
};

/**
 * A small component to render each recommendation with a press animation.
 */
const RecommendationBox = ({
  topic,
  onPress,
}: {
  topic: string;
  onPress: (topic: string) => void;
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };
  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };
  return (
    <Animated.View
      style={[styles.recommendationBox, { transform: [{ scale: scaleAnim }] }]}
    >
      <TouchableOpacity
        activeOpacity={0.8}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={() => onPress(topic)}
      >
        <Text style={styles.recommendationText}>{topic}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

/**
 * Recommendations Component
 *
 * Displays one recommendation box at a time, containing a key topic.
 * A timer (default 10 seconds) counts down—if no selection is made, the recommendation auto-advances.
 * When a topic is selected, it is saved to AsyncStorage and the next recommendation is displayed.
 * It also calls onAlignRecommendation to align the transcript view.
 */
interface RecommendationsProps {
  transcript: string;
  onAlignRecommendation?: (topic: string) => void;
}

const Recommendations = ({
  transcript,
  onAlignRecommendation,
}: RecommendationsProps) => {
  const [allTopics, setAllTopics] = useState<string[]>([]);
  const [currentRecommendation, setCurrentRecommendation] = useState<
    string | null
  >(null);
  const [timer, setTimer] = useState<number>(10); // Timer in seconds

  // Save the selected topic to AsyncStorage
  const saveTopic = async (topic: string) => {
    try {
      const currentTopicsJson = await AsyncStorage.getItem(
        ASYNC_STORAGE_TOPICS_KEY
      );
      const currentTopics = currentTopicsJson
        ? JSON.parse(currentTopicsJson)
        : [];
      const updatedTopics = [...currentTopics, topic];
      await AsyncStorage.setItem(
        ASYNC_STORAGE_TOPICS_KEY,
        JSON.stringify(updatedTopics)
      );
      console.log("Saved topic:", topic);
    } catch (error) {
      console.error("Error saving topic:", error);
    }
  };

  // Load key topics from the transcript using the helper function
  const loadKeyTopics = useCallback(async () => {
    const topics = await getKeyTopicsFromTranscript(transcript);
    setAllTopics(topics);
  }, [transcript]);

  // When a new transcript is received, extract topics.
  useEffect(() => {
    if (transcript) {
      loadKeyTopics();
    }
  }, [transcript, loadKeyTopics]);

  // Function to load the next recommendation
  const nextRecommendation = () => {
    if (allTopics.length > 0) {
      const next = allTopics[0];
      setCurrentRecommendation(next);
      setAllTopics((prev) => prev.slice(1));
      setTimer(10);
      if (onAlignRecommendation) {
        onAlignRecommendation(next);
      }
    } else {
      setCurrentRecommendation(null);
    }
  };

  // When allTopics is updated and no recommendation is showing, show the next one.
  useEffect(() => {
    if (transcript && !currentRecommendation && allTopics.length > 0) {
      nextRecommendation();
    }
  }, [allTopics, currentRecommendation, transcript]);

  // Timer for auto-advancing if no selection is made
  useEffect(() => {
    if (!currentRecommendation) return;
    if (timer <= 0) {
      nextRecommendation();
      return;
    }
    const interval = setInterval(() => {
      setTimer((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [timer, currentRecommendation]);

  const handleSelect = (topic: string) => {
    saveTopic(topic);
    nextRecommendation();
  };

  return (
    <View style={styles.recommendationsContainer}>
      {currentRecommendation ? (
        <>
          <Text style={styles.timerText}>
            You might also like ({timer}s remaining):
          </Text>
          <View style={styles.singleBoxContainer}>
            <RecommendationBox
              topic={currentRecommendation}
              onPress={handleSelect}
            />
          </View>
        </>
      ) : (
        <Text style={styles.noRecommendationText}>
          No more recommendations.
        </Text>
      )}
    </View>
  );
};

/**
 * Main Component: QuickPlayScreen
 *
 * Generates a podcast transcript, plays it with expo-speech, shows transcript and recommendations.
 * When a recommendation appears, the transcript auto-scrolls to the paragraph that mentions it.
 * The big animated button toggles between starting and stopping the podcast.
 * A round icon button in the controls container allows you to access the notes view.
 * The transcript toggle and notes button are now combined in a single horizontal container.
 */
export default function QuickPlayScreen() {
  // Load fonts
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_700Bold,
  });

  // Core state variables
  const [isLoading, setIsLoading] = useState(false);
  const [topics, setTopics] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [currentTopic, setCurrentTopic] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string>("");
  const [progress, setProgress] = useState(0);
  const [estimatedDuration, setEstimatedDuration] = useState(0);
  const [transcriptParagraphs, setTranscriptParagraphs] = useState<string[]>(
    []
  );
  const [activeParagraphIndex, setActiveParagraphIndex] = useState(0);
  const [showTranscript, setShowTranscript] = useState(false);
  const [highlightedParagraphIndex, setHighlightedParagraphIndex] = useState<
    number | null
  >(null);

  // For measuring transcript container height & paragraph layouts.
  const [containerHeight, setContainerHeight] = useState(0);
  const [paragraphLayouts, setParagraphLayouts] = useState<
    { y: number; height: number }[]
  >([]);
  const transcriptScrollViewRef = useRef<ScrollView>(null);

  const params = useLocalSearchParams<{ topicToPlay?: string }>();
  const router = useRouter();

  // --- Animated Play/Stop Button Setup ---
  const buttonAnim = useRef(new Animated.Value(0)).current;
  const scale = buttonAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.9],
  });
  const rotate = buttonAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "10deg"],
  });
  const handlePressIn = () => {
    Animated.timing(buttonAnim, {
      toValue: 1,
      duration: 100,
      useNativeDriver: true,
    }).start();
  };
  const handlePressOut = () => {
    Animated.timing(buttonAnim, {
      toValue: 0,
      duration: 100,
      useNativeDriver: true,
    }).start();
  };

  // Pulse (glow) animation for the outer ring.
  const pulseAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [pulseAnim]);
  const pulseScale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.5],
  });
  const pulseOpacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.5, 0],
  });

  // Animated value for the transcript pull-up view.
  const transcriptAnim = useRef(new Animated.Value(0)).current;
  const maxTranscriptHeight = 120;

  // Toggle transcript visibility with a slight delay.
  const toggleTranscript = () => {
    setTimeout(() => {
      if (showTranscript) {
        Animated.timing(transcriptAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: false,
        }).start(() => setShowTranscript(false));
      } else {
        setShowTranscript(true);
        Animated.timing(transcriptAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: false,
        }).start();
      }
    }, 100);
  };

  // --- Progress Timer ---
  const progressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const startProgressTimer = (startingProgress = 0, duration: number) => {
    if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    const interval = 50;
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
  const stopProgressTimer = () => {
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
  };

  const updateTranscriptParagraphs = useCallback((text: string) => {
    const paragraphs = text.includes("\n")
      ? text.split("\n").filter((p) => p.trim().length > 0)
      : text
          .split(". ")
          .map((p, i, arr) => (i < arr.length - 1 ? p + ". " : p));
    setTranscriptParagraphs(paragraphs);
  }, []);

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

  // Auto-scroll effect (only when transcript is visible)
  useEffect(() => {
    if (!showTranscript) return;
    if (paragraphLayouts.length === 0 || containerHeight === 0) return;
    if (activeParagraphIndex < paragraphLayouts.length) {
      const { y, height } = paragraphLayouts[activeParagraphIndex];
      const offset = y + height / 2 - containerHeight / 2;
      transcriptScrollViewRef.current?.scrollTo({ y: offset, animated: true });
    }
  }, [activeParagraphIndex, paragraphLayouts, containerHeight, showTranscript]);

  // Function to align transcript with a recommended topic.
  const scrollToTopic = (topic: string) => {
    const lowerTopic = topic.toLowerCase();
    const index = transcriptParagraphs.findIndex((para) =>
      para.toLowerCase().includes(lowerTopic)
    );
    if (index !== -1 && transcriptScrollViewRef.current) {
      const layout = paragraphLayouts[index];
      if (layout) {
        transcriptScrollViewRef.current.scrollTo({
          y: layout.y,
          animated: true,
        });
      }
      setHighlightedParagraphIndex(index);
      setTimeout(() => setHighlightedParagraphIndex(null), 3000);
    }
  };

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
      // Prompt for generating a podcast script
      const prompt = `Generate a short, engaging podcast script (around 200-300 words) about the topic: "${topic}". If possible, briefly mention 1-2 credible sources related to the topic. Structure it like a mini-podcast segment.`;
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
            const duration = totalWords / 2.5;
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

  const handlePlayRandom = async () => {
    if (isLoading) return;
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

  // Big button now toggles: if a podcast is playing, stop it; otherwise, start a random one.
  const handleTogglePlay = () => {
    if (isLoading) {
      handleStop();
    } else {
      handlePlayRandom();
    }
  };

  const handleStop = () => {
    Speech.stop();
    stopProgressTimer();
    setError(null);
    setIsLoading(false);
    setCurrentTopic(null);
    setTranscript("");
    setTranscriptParagraphs([]);
    setActiveParagraphIndex(0);
    setShowTranscript(false);
    console.log("Speech stopped and state reset.");
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

  const renderTranscriptParagraphs = () => {
    return transcriptParagraphs.map((para, index) => (
      <Text
        key={index}
        style={[
          styles.transcriptParagraph,
          highlightedParagraphIndex === index && styles.highlightedParagraph,
        ]}
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

  const transcriptHeightInterpolate = transcriptAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, maxTranscriptHeight],
  });

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

        {/* Big Animated Button used for both play and stop */}
        <View style={styles.animatedButtonWrapper}>
          <Animated.View
            style={[
              styles.pulseRing,
              { transform: [{ scale: pulseScale }], opacity: pulseOpacity },
            ]}
          />
          <Animated.View
            style={[
              styles.animatedButtonContainer,
              { transform: [{ scale }, { rotate }] },
            ]}
          >
            <TouchableOpacity
              activeOpacity={0.8}
              onPressIn={handlePressIn}
              onPressOut={handlePressOut}
              onPress={handleTogglePlay}
            >
              <LinearGradient
                colors={[theme.primary, theme.success]}
                style={styles.playButton}
              >
                {isLoading ? (
                  <Ionicons name="stop" size={60} color={theme.text} />
                ) : (
                  <Ionicons name="play" size={60} color={theme.text} />
                )}
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </View>

        {/* Combined Transcript Toggle & Notes Bar */}
        {transcript && (
          <View style={styles.bottomBar}>
            <TouchableOpacity
              style={styles.bottomBarButton}
              onPress={() => setTimeout(toggleTranscript, 100)}
            >
              <Text style={styles.bottomBarText}>
                {showTranscript ? "Hide Transcript" : "View Transcript"}
              </Text>
              <Ionicons
                name={showTranscript ? "chevron-down" : "chevron-up"}
                size={24}
                color={theme.text}
              />
            </TouchableOpacity>
            {currentTopic && (
              <TouchableOpacity
                style={styles.bottomBarButton}
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
                <Text style={styles.bottomBarText}>Notes</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Animated Transcript Container */}
        {transcript && (
          <Animated.View
            style={[
              styles.transcriptContainer,
              {
                height: transcriptHeightInterpolate,
                overflow: "hidden",
                opacity: transcriptHeightInterpolate.interpolate({
                  inputRange: [0, maxTranscriptHeight],
                  outputRange: [0, 1],
                }),
              },
            ]}
            onLayout={(e) => setContainerHeight(e.nativeEvent.layout.height)}
          >
            <ScrollView ref={transcriptScrollViewRef}>
              {renderTranscriptParagraphs()}
            </ScrollView>
          </Animated.View>
        )}

        {/* Progress Slider (Reduced margin-top) */}
        {transcript && (
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
        )}

        {/* Display Errors */}
        {error && <Text style={styles.errorText}>{error}</Text>}
        {!GEMINI_API_KEY && (
          <Text style={styles.warningText}>API Key Missing!</Text>
        )}

        {/* Recommendations Section */}
        {transcript && (
          <Recommendations
            transcript={transcript}
            onAlignRecommendation={scrollToTopic}
          />
        )}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradientContainer: { flex: 1 },
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
  animatedButtonWrapper: {
    marginBottom: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  pulseRing: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: theme.primary,
  },
  animatedButtonContainer: { zIndex: 1 },
  playButton: {
    width: 150,
    height: 150,
    borderRadius: 75,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  controlsContainer: {
    flexDirection: "row",
    marginBottom: 20,
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
  bottomBar: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    marginVertical: 10,
  },
  bottomBarButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.card,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 25,
  },
  bottomBarText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 16,
    color: theme.text,
    marginLeft: 6,
  },
  transcriptToggleBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.card,
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 25,
    marginTop: 20,
  },
  transcriptToggleText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 16,
    color: theme.text,
    marginRight: 8,
  },
  transcriptContainer: {
    marginTop: 10,
    padding: 10,
    backgroundColor: theme.card,
    borderRadius: 10,
    width: "100%",
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
  highlightedParagraph: {
    backgroundColor: "rgba(0,188,212,0.2)",
    borderRadius: 5,
  },
  sliderContainer: {
    width: "100%",
    marginTop: 10,
    alignItems: "center",
  },
  slider: { width: "100%", height: 40 },
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
  recommendationsContainer: {
    padding: 15,
    backgroundColor: theme.card,
    borderRadius: 12,
    marginVertical: 10,
    width: "100%",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  timerText: {
    color: theme.text,
    marginBottom: 8,
    fontSize: 16,
    fontFamily: "Poppins_400Regular",
  },
  boxesContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  singleBoxContainer: {
    width: "100%",
    alignItems: "center",
  },
  recommendationBox: {
    backgroundColor: theme.primary,
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginVertical: 5,
    width: "90%",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 3,
    elevation: 2,
  },
  recommendationText: {
    color: theme.text,
    fontWeight: "bold",
    fontSize: 15,
    textAlign: "center",
    fontFamily: "Poppins_700Bold",
  },
  noRecommendationText: {
    color: theme.textSecondary,
    fontSize: 14,
    fontFamily: "Poppins_400Regular",
  },
});
