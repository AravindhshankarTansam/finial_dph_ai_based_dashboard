// PushToServerButton.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import React from 'react';
import { ActivityIndicator, Alert, Button } from 'react-native';

// Define your server URL here
const SERVER_URL = 'https://cd.tndphpm.com/api/endpoint';

export default function PushToServerButton() {
  const [isPushing, setIsPushing] = React.useState(false);

  const pushAllToServer = async () => {
    setIsPushing(true);
    try {
      const storedData = await AsyncStorage.getItem('mosquito_data');
      if (!storedData) {
        Alert.alert('No data', 'There is no data to push to server');
        return;
      }

      const data = JSON.parse(storedData);
      const unsyncedData = data.filter(item => !item.synced);

      if (unsyncedData.length === 0) {
        Alert.alert('All data synced', 'All data is already on the server');
        return;
      }

      // Push each unsynced item
      for (const item of unsyncedData) {
        try {
          const response = await fetch(SERVER_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(item),
          });

          if (response.ok) {
            // Mark as synced
            const updatedData = data.map(d => 
              d.date === item.date && d.time === item.time ? { ...d, synced: true } : d
            );
            await AsyncStorage.setItem('mosquito_data', JSON.stringify(updatedData));
          }
        } catch (error) {
          console.error(`Failed to push item ${item.date} ${item.time}:`, error);
        }
      }

      Alert.alert('Success', 'All data pushed to server');
    } catch (error) {
      console.error('Push all error:', error);
      Alert.alert('Error', 'Failed to push data to server');
    } finally {
      setIsPushing(false);
    }
  };

  return isPushing ? (
    <ActivityIndicator size="small" />
  ) : (
    <Button 
      title="Push All to Server" 
      onPress={pushAllToServer} 
      color="#4CAF50"
    />
  );
}