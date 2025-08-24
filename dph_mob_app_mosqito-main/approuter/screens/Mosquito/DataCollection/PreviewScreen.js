import React, { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, Text, StyleSheet, Alert, Image, Pressable, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import * as Location from 'expo-location';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { MaterialIcons } from '@expo/vector-icons';

export default function PreviewScreen({ route }) {
  const navigation = useNavigation();
  const { formData } = route.params || {};

  const [address, setAddress] = useState(null);
  const [loadingAddress, setLoadingAddress] = useState(true);

  useEffect(() => {
    (async () => {
      if (!formData?.location) return;

      try {
        const [reverseGeocode] = await Location.reverseGeocodeAsync({
          latitude: formData.location.latitude,
          longitude: formData.location.longitude,
        });

        if (reverseGeocode) {
          const formattedAddress = `${reverseGeocode.name || ''} ${reverseGeocode.street || ''}, ${reverseGeocode.city || ''}, ${reverseGeocode.region || ''} ${reverseGeocode.postalCode || ''}`.trim();
          setAddress(formattedAddress);
        } else {
          setAddress('Address not found');
        }
      } catch (_) {
        setAddress('Failed to fetch address');
      } finally {
        setLoadingAddress(false);
      }
    })();
  }, [formData?.location]);

const handleSubmit = async () => {
  try {
    const userInfo = formData.userInfo;

    if (!userInfo || !userInfo.user_id || !userInfo.username || !userInfo.district_name) {
      Alert.alert('Missing User Info', 'User information is incomplete or not found');
      return;
    }

    const now = new Date();

    // Format date as DD-MM-YYYY
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0'); // months are zero-indexed
    const year = now.getFullYear();
    const date = `${day}-${month}-${year}`;

    // Format time as HH:MM:SS
    const time = now.toTimeString().split(' ')[0];

    const completeData = {
      user_id: userInfo.user_id,
      username: userInfo.username,
      district: userInfo.district_name,
      date,
      time,
      areaType: formData.areaType,
      location: formData.location,
      address: address || 'N/A', // ✅ Add address here
      images: formData.images.map(img => ({ uri: img.uri })),
      synced: false,
    };

    const existingData = await AsyncStorage.getItem('mosquito_data');
    const parsedData = existingData ? JSON.parse(existingData) : [];
    const updatedData = [...parsedData, completeData];
    await AsyncStorage.setItem('mosquito_data', JSON.stringify(updatedData));

    Alert.alert('Saved', 'Data saved locally. You can sync later.');
    navigation.reset({
      index: 0,
      routes: [{
        name: 'DataCollection',
        params: { key: Date.now().toString() },
      }],
    });
  } catch (error) {
    console.error('Local save error:', error);
    Alert.alert('Error', 'Failed to save data locally. Please try again.');
  }
};


  if (!formData) {
    return (
      <View style={styles.fallbackContainer}>
        <Text style={styles.fallbackText}>Missing form data.</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <BlurView intensity={80} tint="light" style={styles.stickyHeader}>
        <Text style={styles.header}>Preview Data Collection</Text>
      </BlurView>

      <ScrollView contentContainerStyle={styles.container}>
        <View style={{ height: 90 }} />

        {/* User Info Cards */}
        {formData.userInfo && (
          <>
            <Card label="User ID" value={formData.userInfo.user_id} />
            <Card label="Name" value={formData.userInfo.username} />
            <Card label="District" value={formData.userInfo.district_name} />
          </>
        )}

        <Card label="Area Type" value={formData.areaType} />
        <Card
          label="Coordinates"
          value={`Lat: ${formData.location.latitude.toFixed(6)}, Lon: ${formData.location.longitude.toFixed(6)}`}
        />
        <Card
          label="Resolved Address"
          value={loadingAddress ? <ActivityIndicator color="#3b82f6" /> : address}
        />

        {/* Image Preview */}
        <View style={[styles.card, styles.imageCard]}>
          <Text style={styles.label}>Images</Text>
          {formData.images.length > 0 ? (
            <ScrollView horizontal>
              {formData.images.map((img, i) => (
                <Image key={i} source={{ uri: img.uri }} style={styles.image} />
              ))}
            </ScrollView>
          ) : (
            <Text>No images captured.</Text>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.flexButton}>
            <LinearGradient colors={['#3b82f6', '#2563eb']} style={styles.button}>
              <MaterialIcons name="edit" size={20} color="#fff" />
              <Text style={styles.buttonText}>Edit</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleSubmit} style={styles.flexButton}>
            <LinearGradient colors={['#16a34a', '#15803d']} style={styles.button}>
              <MaterialIcons name="check" size={20} color="#fff" />
              <Text style={styles.buttonText}>Submit</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

function Card({ label, value }) {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 40,
  },
  stickyHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 90,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    paddingTop: 40,
    backgroundColor: 'rgba(255,255,255,0.8)',
  },
  header: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  card: {
    backgroundColor: '#f1f5f9',
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    color: '#555',
  },
  value: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111',
    marginTop: 5,
  },
  imageCard: {
    paddingBottom: 16,
  },
  image: {
    width: 100,
    height: 100,
    marginRight: 10,
    borderRadius: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  flexButton: {
    flex: 1,
    marginHorizontal: 5,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    marginLeft: 8,
    fontWeight: '600',
  },
  fallbackContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  fallbackText: {
    fontSize: 16,
    color: 'red',
    fontWeight: '500',
  },
});
