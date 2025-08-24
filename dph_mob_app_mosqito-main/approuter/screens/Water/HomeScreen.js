import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';
import MapView, { Marker } from 'react-native-maps';

export default function WaterQualityScreen({ navigation }) {
  const [location, setLocation] = useState(null);
  const [locationStatus, setLocationStatus] = useState('loading');
  const [actualPPM, setActualPPM] = useState('');
  const [samplingPoint, setSamplingPoint] = useState(null);
  const [ppmSubmitted, setPpmSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const mapRef = useRef(null); 

  const [items, setItems] = useState([
    { label: 'Over Head Tank', value: 'OHT' },
     { label: 'Ground Level Reservoir', value: 'GLR' },
    { label: 'Tail End', value: 'TAIL' },
    { label: 'Mid Point', value: 'MID' },
  ]);

  useEffect(() => {
    let locationInterval = null;

    const fetchLocation = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission not granted');
        setLocationStatus('failed');
        return;
      }

      const isLocationEnabled = await Location.hasServicesEnabledAsync();
      if (!isLocationEnabled) {
        Alert.alert('Location Disabled', 'Please enable GPS/location services.');
        setLocationStatus('failed');
        return;
      }

      setLocationStatus('loading');

      locationInterval = setInterval(async () => {
        try {
          const loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Highest,
            timeout: 10000,
            maximumAge: 5000,
          });

          if (loc?.coords?.accuracy <= 100) {
            clearInterval(locationInterval);
            setLocation(loc.coords);
            setLocationStatus('success');
          }
        } catch (err) {
          console.log('Still waiting for GPS...', err.message);
        }
      }, 3000);
    };

    fetchLocation();

    return () => {
      if (locationInterval) clearInterval(locationInterval);
    };
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      setActualPPM('');
      setSamplingPoint('');
      setOpen(false);
    }, [])
  );

  const handlePPMSubmit = () => {
    if (!actualPPM) {
      Alert.alert('Missing Field', 'Please enter the actual PPM value.');
      return;
    }
    setPpmSubmitted(true);
    Alert.alert('Submitted', `Actual PPM: ${actualPPM}`);
  };

  const handleCaptureAndPredict = async () => {
    if (!location) {
      Alert.alert('Invalid Location', 'Please wait for better GPS accuracy');
      return;
    }

    if (!actualPPM || !samplingPoint) {
      Alert.alert("Missing Info", "Please enter actual PPM and select a sampling point.");
      return;
    }

    const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
    if (!cameraPermission.granted) {
      Alert.alert('Permission Denied', 'Camera access is required');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      base64: true,
      quality: 1,
      allowsEditing: false,
    });

    if (!result.canceled && result.assets?.[0]?.uri) {
      const photo = result.assets[0];
      const uri = photo.uri;
      setCapturedImage(uri);
      setLoading(true);

      try {
        const formData = new FormData();
        formData.append('image', {
          uri,
          name: 'photo.jpg',
          type: 'image/jpeg',
        });

        const response = await fetch('https://cd.tndphpm.com/predict', {
          method: 'POST',
          body: formData,
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

        const contentType = response.headers.get('Content-Type');

        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ Server Error:', errorText);
          Alert.alert('Server Error', `Status: ${response.status}`);
          return;
        }

        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();

          if (data?.ppm !== undefined) {
            const chlorineData = {
              ppm: data.ppm.toFixed(2),
              imageUri: uri,
              latitude: location.latitude,
              longitude: location.longitude,
              samplingPoint,
              actualPPM,
              timestamp: new Date().toISOString(),
            };

            await AsyncStorage.setItem('chlorine_last_check', JSON.stringify(chlorineData));

            Alert.alert('Success', `Predicted: ${data.ppm.toFixed(2)} ppm`, [
              { text: 'OK', onPress: () => navigation.navigate('PreviewWaterScreen', { resultData: chlorineData }) },
            ]);
          } else {
            Alert.alert('Prediction Error', 'No ppm value returned');
          }
        } else {
          const text = await response.text();
          console.error('❌ Unexpected content:', text);
          Alert.alert('Error', 'Unexpected response from server');
        }
      } catch (err) {
        console.error(err);
        Alert.alert('Error', 'Failed to predict ppm.');
      } finally {
        setLoading(false);
      }
    }
  };

  const renderMap = () => {
    if (!location) return null;
    return (
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={{
          latitude: location.latitude,
          longitude: location.longitude,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        }}
        showsUserLocation
        showsMyLocationButton
      >
        <Marker coordinate={location} title="Your Location" />
      </MapView>
    );
  };

  if (locationStatus === 'loading') {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#0A84FF" />
        <Text style={styles.loadingText}>📡 Getting GPS Location...</Text>
      </View>
    );
  }

  const isCaptureDisabled = !actualPPM || !samplingPoint || !location;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.container}>
        <Text style={styles.title}>💧 Water Quality Testing</Text>

        {renderMap()}

        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="Enter Actual PPM"
            keyboardType="numeric"
            value={actualPPM}
            onChangeText={setActualPPM}
          />
          <TouchableOpacity style={styles.submitButton} onPress={handlePPMSubmit}>
            <Text style={styles.buttonText}>Submit</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.dropdownWrapper}>
          <DropDownPicker
            open={open}
            value={samplingPoint}
            items={items}
            setOpen={setOpen}
            setValue={setSamplingPoint}
            setItems={setItems}
            placeholder="Select Sampling Point"
            style={styles.dropdown}
            dropDownContainerStyle={{ borderColor: '#ccc' }}
            zIndex={3000}
            zIndexInverse={1000}
          />
        </View>

        <TouchableOpacity
          style={[styles.captureButton, isCaptureDisabled && { backgroundColor: '#ccc' }]}
          onPress={handleCaptureAndPredict}
          disabled={isCaptureDisabled || loading}
        >
          <Text style={styles.buttonText}>📷 Capture & Predict</Text>
        </TouchableOpacity>

        {loading && <ActivityIndicator style={{ marginTop: 15 }} size="large" color="#555" />}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 55,
    paddingHorizontal: 15,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  map: {
    width: '100%',
    height: Dimensions.get('window').height * 0.3,
    marginBottom: 15,
    borderRadius: 12,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    gap: 10,
    zIndex: 10,
  },
  input: {
    flex: 1,
    borderColor: '#ccc',
    borderWidth: 1,
    padding: 10,
    borderRadius: 10,
  },
  submitButton: {
    backgroundColor: '#0A84FF',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 10,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
  dropdownWrapper: {
    zIndex: 3000,
    marginBottom: 20,
  },
  dropdown: {
    borderRadius: 10,
    borderColor: '#ccc',
  },
  captureButton: {
    backgroundColor: '#34C759',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: '#444',
  },
});
