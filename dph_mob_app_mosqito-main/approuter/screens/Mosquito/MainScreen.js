import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Modal, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDatewiseUserCount } from '../../api'; // Adjust path as needed

export default function MainScreen({ navigation }) {
  const [totalCollection, setTotalCollection] = useState(0);
  const [todayCollected, setTodayCollected] = useState(0);
  const [totalPushed, setTotalPushed] = useState(0);
  const [isPushing, setIsPushing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  const getTodayDateString = () => {
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yyyy = now.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
  };

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const json = await AsyncStorage.getItem('user_info');
        const user = JSON.parse(json);
        if (!user?.user_id) return;

        const data = await getDatewiseUserCount(user.user_id);

        const entries = Object.entries(data || {});
        const today = getTodayDateString();

        const total = entries.reduce((sum, [, count]) => sum + count, 0);
        const todayCount = data[today] || 0;

        setTotalCollection(total);
        setTodayCollected(todayCount);
        setTotalPushed(total); // You can adjust this if backend tracks pushed separately
      } catch (err) {
        console.error('Failed to fetch counts:', err);
      }
    };

    fetchCounts();
  }, []);

  const handlePush = () => {
    setIsPushing(true);
    setTimeout(() => {
      setIsPushing(false);
      alert('Data push simulated. Add backend later.');
    }, 1500);
  };

  const handleTakeData = () => setModalVisible(true);

  const handleUrbanSelect = () => {
    setModalVisible(false);
    navigation.navigate('DataCollection', { areaType: 'Urban' });
  };

  const handleRuralSelect = () => {
    setModalVisible(false);
    navigation.navigate('DataCollection', { areaType: 'Rural' });
  };

  const handleShowDataList = () => {
    navigation.navigate('MosquitoDataFlow', { screen: 'DataList' });
  };

  return (
    <View style={styles.container}>
      <View style={styles.imageRow}>
        <Image source={require('./../../../assets/TN_logo.png')} style={styles.logoLeft} resizeMode="contain" />
        <Image source={require('../../../assets/dph.png')} style={styles.logoRight} resizeMode="contain" />
      </View>

      <Text style={styles.title}>DBC Dashboard</Text>

      <View style={styles.cardRow}>
        <View style={[styles.card, styles.squareCard, { backgroundColor: '#26A69A' }]}>
          <Text style={styles.cardTitle}>Total Data</Text>
          <Text style={styles.cardValue}>{totalCollection}</Text>
        </View>
        <View style={[styles.card, styles.squareCard, { backgroundColor: '#10b981' }]}>
          <Text style={styles.cardTitle}>Today</Text>
          <Text style={styles.cardValue}>{todayCollected}</Text>
        </View>
        <View style={[styles.card, styles.squareCard, { backgroundColor: '#f59e0b' }]}>
          <Text style={styles.cardTitle}>Pushed</Text>
          <Text style={styles.cardValue}>{totalPushed}</Text>
        </View>
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: '#6366f1' }]}
          onPress={handlePush}
          disabled={isPushing || todayCollected === 0}
        >
          {isPushing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="cloud-upload-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.pushButtonText}>Push Data</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={[styles.actionButton, { backgroundColor: '#22c55e' }]} onPress={handleTakeData}>
          <Ionicons name="document-text-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.pushButtonText}>Take Data</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.centeredButtonWrapper}>
        <TouchableOpacity style={styles.centeredButton} onPress={handleShowDataList}>
          <Ionicons name="reader-outline" size={20} color="#fff" style={styles.icon} />
          <Text style={styles.buttonText}>Show Data List</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Select Area Type</Text>
            <TouchableOpacity style={styles.areaButton} onPress={handleUrbanSelect}>
              <Text style={styles.areaButtonText}>Urban</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.areaButton} onPress={handleRuralSelect}>
              <Text style={styles.areaButtonText}>Rural</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={{ color: 'red', textAlign: 'center', marginTop: 10 }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 40,
    backgroundColor: '#f9fafb',
  },
  imageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 26,
    paddingHorizontal: 10,
    marginTop: 10,
  },
  logoLeft: {
    width: 120,
    height: 120,
  },
  logoRight: {
    width: 120,
    height: 120,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  card: {
    borderRadius: 12,
    padding: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
  },
  cardTitle: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 8,
  },
  cardValue: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  squareCard: {
    width: '30%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 20,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
  },
  pushButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  centeredButtonWrapper: {
    alignItems: 'center',
    marginVertical: 10,
  },
  centeredButton: {
    flexDirection: 'row',
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    alignItems: 'center',
    elevation: 4,
    width: '70%',
    justifyContent: 'center',
  },
  icon: {
    marginRight: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: '#000000aa',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 20,
  },
  areaButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  areaButtonText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
  },
});
