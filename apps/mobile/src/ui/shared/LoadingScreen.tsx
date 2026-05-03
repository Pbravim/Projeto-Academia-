import { ActivityIndicator, StyleSheet, View } from 'react-native';

export function LoadingScreen() {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#c96f2d" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f0e8',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
