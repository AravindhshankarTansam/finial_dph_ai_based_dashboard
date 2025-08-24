import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  Image,
  Pressable,
  ScrollView,
  Modal,
  TouchableOpacity,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Calendar } from 'react-native-calendars';
import {
  getDatewiseUserCount,
  getDatewiseUserCountDetails,
} from '../../../api';

export default function SettingsScreen({ navigation }) {
  const [user, setUser] = useState(null);
  const [markedDates, setMarkedDates] = useState({});
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedCount, setSelectedCount] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');

  useEffect(() => {
    const loadUser = async () => {
      try {
        const json = await AsyncStorage.getItem('user_info');
        if (json) {
          const parsedUser = JSON.parse(json);
          setUser(parsedUser);
        }
      } catch (err) {
        console.error('❌ Failed to load user_info:', err);
      }
    };

const loadMarkedDates = async () => {
  try {
    const json = await AsyncStorage.getItem('user_info');
    const user = JSON.parse(json);
    if (!user) return;

    // console.log('🟢 Loaded user:', user.user_id);

    const counts = await getDatewiseUserCount(user.user_id);
    // console.log('📥 Raw counts from API:', counts);
    // Example: { "04-08-2025": 2, "05-08-2025": 1 }

    const marked = {};
    Object.entries(counts).forEach(([ddmmyyyy, count]) => {
      if (!ddmmyyyy || ddmmyyyy === 'null') return;

      // console.log('🔍 Processing date string:', ddmmyyyy);

      const [day, month, year] = ddmmyyyy.split('-');
      const yyyymmdd = `${year}-${month}-${day}`;

      // console.log(`➡️ Converted ${ddmmyyyy} → ${yyyymmdd}`);

      marked[yyyymmdd] = {
        marked: true,
        dotColor: '#f72d4fff',
        activeOpacity: 0,
      };
    });

    // console.log('✅ Final markedDates:', marked);
    setMarkedDates(marked);
  } catch (err) {
    console.error('❌ Failed to load marked dates:', err);
  }
};


    loadUser();
    loadMarkedDates();
  }, []);

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('user_info');
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    } catch (_error) {
      Alert.alert('Error', 'Failed to logout. Please try again.');
    }
  };

const handleDatePress = async (day) => {
  try {
    const date = day.dateString; // YYYY-MM-DD

    if (!markedDates[date]) return;

    const json = await AsyncStorage.getItem('user_info');
    const user = JSON.parse(json);

    // ✅ Convert to DD-MM-YYYY for the API
    const [yyyy, mm, dd] = date.split('-');
    const ddmmyyyy = `${dd}-${mm}-${yyyy}`;

    const details = await getDatewiseUserCountDetails(user.user_id, ddmmyyyy);

    setSelectedDate(ddmmyyyy); // optional, for display
    setSelectedCount(details.count || 0);
    setModalVisible(true);
  } catch (err) {
    console.error('❌ Failed to load date details:', err);
  }
};


  if (!user) return <Text style={styles.loading}>Loading...</Text>;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.profileCard}>
        <Image
          source={require('./../../../../assets/user_icon.png')}
          style={styles.avatar}
        />
        <Text style={styles.name}>{user.username}</Text>
        <Text style={styles.userId}>User ID: {user.user_id}</Text>
      </View>

      <View style={styles.infoContainer}>
        <InfoRow label="Email" value={user.email} />
        <InfoRow label="District" value={user.district_name} />
        {user.block_name && <InfoRow label="Block" value={user.block_name} />}
        <InfoRow label="Status" value={user.status} />
      </View>

      <View style={styles.calendarWrapper}>
        <Text style={styles.sectionTitle}>Data Collected (by Date)</Text>
        <Calendar
          markingType={'dot'}
          markedDates={markedDates}
          onDayPress={handleDatePress}
        />
      </View>

      <View style={styles.logoutWrapper}>
        <Pressable
          style={({ pressed }) => [
            styles.logoutBtn,
            pressed && styles.logoutBtnPressed,
          ]}
          onPress={handleLogout}
        >
          <Text style={styles.logoutText}>Logout</Text>
        </Pressable>
      </View>

      {/* Modal */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>🗓️ {selectedDate}</Text>
            <Text style={styles.modalText}>📊 Entries: {selectedCount}</Text>
            <TouchableOpacity
              onPress={() => setModalVisible(false)}
              style={styles.modalCloseButton}
            >
              <Text style={styles.modalCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function InfoRow({ label, value }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value || '-'}</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f2f3f5',
    paddingTop: 40,
  },
  loading: {
    flex: 1,
    textAlign: 'center',
    marginTop: 100,
    fontSize: 18,
  },
  profileCard: {
    backgroundColor: '#232f3e',
    paddingVertical: 32,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#fff',
  },
  name: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
  },
  userId: {
    color: '#ccc',
    fontSize: 14,
    marginTop: 4,
  },
  infoContainer: {
    margin: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    elevation: 4,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  infoLabel: {
    fontSize: 16,
    color: '#555',
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 16,
    color: '#222',
    maxWidth: '60%',
    textAlign: 'right',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    marginLeft: 8,
    color: '#333',
  },
  calendarWrapper: {
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 12,
    padding: 16,
    elevation: 3,
  },
  logoutWrapper: {
    marginHorizontal: 20,
    marginBottom: 40,
    marginTop: 10,
  },
  logoutBtn: {
    backgroundColor: '#e53935',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    elevation: 3,
  },
  logoutBtnPressed: {
    backgroundColor: '#c62828',
  },
  logoutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: '#000000aa',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    width: '80%',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  modalText: {
    fontSize: 16,
    marginVertical: 6,
    textAlign: 'center',
  },
  modalCloseButton: {
    marginTop: 20,
    backgroundColor: '#ff3030ff',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  modalCloseText: {
    color: '#fff',
    fontSize: 16,
  },
});
