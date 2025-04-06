import React from "react";
import { SafeAreaView, StyleSheet } from "react-native";
import { Slot } from "expo-router";

// filepath: /home/ashkan/Desktop/spring_25/spring_25_sideprojects/sfhacks/back-logz/app/(modals)/_layout.tsx

export default function ModalLayout() {
	return (
		<SafeAreaView style={styles.container}>
			<Slot />
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#121212", // Match the theme background color
	},
});
