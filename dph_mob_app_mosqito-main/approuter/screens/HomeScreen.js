import { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Button, Alert, ActivityIndicator, Dimensions, Image
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import MapView, { Marker } from 'react-native-maps';
import { useNavigation } from '@react-navigation/native';

export default function WaterDashboard() {
  const [hasLocationPermission, setHasLocationPermission] = useState(null);
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [image, setImage] = useState(null);
  const [ppm, setPpm] = useState(null);

  const navigation = useNavigation();
  const mapRef = useRef(null);

  const getLocationUpdates = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    setHasLocationPermission(status === 'granted');

    if (status !== 'granted') return;

    const loc = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.BestForNavigation,
    });

    setLocation(loc.coords);
  };

  const refreshLocation = async () => {
    setRefreshing(true);
    await getLocationUpdates();

    if (location && mapRef.current) {
      mapRef.current.animateToRegion(
        {
          latitude: location.latitude,
          longitude: location.longitude,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        },
        1000
      );
    }

    setRefreshing(false);
  };

  useEffect(() => {
    let subscription;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setHasLocationPermission(status === 'granted');

      if (status !== 'granted') return;

      subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          distanceInterval: 1,
          timeInterval: 1000,
        },
        (loc) => setLocation(loc.coords)
      );
    })();

    return () => {
      if (subscription) subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (hasLocationPermission === false) {
      Alert.alert(
        'Location Permission Denied',
        'Please enable location permission from settings to use this feature.',
        [{ text: 'OK' }]
      );
    }
  }, [hasLocationPermission]);

  const handleCaptureAndPredict = async () => {
    if (!location || location.accuracy > 50) {
      Alert.alert('Invalid Location', 'Please wait for better GPS accuracy');
      return;
    }

    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (permissionResult.status !== 'granted') {
      Alert.alert('Permission Denied', 'Camera access is required');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [3, 4],
      quality: 1,
    });

    if (!result.canceled) {
      const photo = result.assets[0];
      setImage(photo.uri);
      setLoading(true);
      setPpm(null);

      try {
        const formData = new FormData();
        formData.append('image', {
          uri: photo.uri,
          name: 'sample.jpg',
          type: 'image/jpeg',
        });

        const response = await fetch('https://chlorine-detection-api.onrender.com/predict', {
          method: 'POST',
          body: formData,
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

        const data = await response.json();
        if (data?.prediction !== undefined) {
          const roundedPPM = parseFloat(data.prediction).toFixed(2);
          setPpm(roundedPPM);
          Alert.alert('Success', `Prediction: ${roundedPPM} ppm`);

          await AsyncStorage.setItem('chlorine_last_check', JSON.stringify({
            ppm: roundedPPM,
            latitude: location.latitude,
            longitude: location.longitude,
            timestamp: new Date().toISOString(),
          }));
        } else {
          Alert.alert('Prediction Error', 'No ppm value returned.');
        }
      } catch (err) {
        console.error(err);
        Alert.alert('Error', 'Failed to predict ppm.');
      } finally {
        setLoading(false);
      }
    }
  };

  if (hasLocationPermission === null) return <View />;
  if (hasLocationPermission === false)
    return <Text style={styles.permissionText}>No access to location. Please enable permissions.</Text>;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Chlorine PPM Detection</Text>

      {location ? (
        <>
          <MapView
            ref={mapRef}
            style={styles.map}
            initialRegion={{
              latitude: location.latitude,
              longitude: location.longitude,
              latitudeDelta: 0.005,
              longitudeDelta: 0.005,
            }}
          >
            <Marker coordinate={location} title="Your Location" />
          </MapView>

          <Text style={styles.locationText}>
            📍 Lat: {location.latitude.toFixed(6)} | Lon: {location.longitude.toFixed(6)}{"\n"}
            Accuracy: {location.accuracy ? location.accuracy.toFixed(2) : 'N/A'} meters
          </Text>

          {location.accuracy > 50 && (
            <Text style={styles.accuracyWarning}>
              Waiting for better GPS accuracy (below 50 meters)...
            </Text>
          )}
        </>
      ) : (
        <Text style={styles.locationText}>Fetching location...</Text>
      )}

      {image && <Image source={{ uri: image }} style={styles.imagePreview} />}

      {ppm && (
        <Text style={styles.ppmText}>
          🔬 Predicted Chlorine: {ppm} ppm{"\n"}
          {parseFloat(ppm) > 3 && '⚠️ Above Safe Limit!'}
        </Text>
      )}

      <View style={styles.buttonRow}>
        {loading ? (
          <ActivityIndicator size="small" color="#000" style={styles.button} />
        ) : (
          <View style={styles.button}>
            <Button title="Capture & Predict" color="#007AFF" onPress={handleCaptureAndPredict} />
          </View>
        )}
        {refreshing ? (
          <ActivityIndicator size="small" color="#888" style={styles.button} />
        ) : (
          <View style={styles.button}>
            <Button title="🔄 Refresh" color="#34C759" onPress={refreshLocation} />
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 50, alignItems: 'center', backgroundColor: '#fff' },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
  map: { width: Dimensions.get('window').width * 0.9, height: 300, borderRadius: 12 },
  locationText: { marginTop: 10, fontSize: 16, textAlign: 'center' },
  accuracyWarning: { color: 'red', marginTop: 5, fontWeight: 'bold' },
  ppmText: { marginTop: 15, fontSize: 16, color: '#2c3e50', textAlign: 'center', fontWeight: 'bold' },
  permissionText: { flex: 1, fontSize: 18, textAlign: 'center', marginTop: 50 },
  imagePreview: { width: 200, height: 260, marginTop: 15, borderRadius: 8 },
  buttonRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20, width: '90%' },
  button: { flex: 1, marginHorizontal: 5, borderRadius: 8, overflow: 'hidden' },
});
