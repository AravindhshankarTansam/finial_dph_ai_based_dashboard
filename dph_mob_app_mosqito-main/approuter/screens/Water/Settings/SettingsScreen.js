import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  Pressable,
  Alert,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getInspectionPlan, savePlanStatus } from '../../../api.js';

export default function SettingsScreen({ navigation }) {
  const [user, setUser] = useState(null);
  const [upcomingVisits, setUpcomingVisits] = useState([]);
  const [showRejectReason, setShowRejectReason] = useState(false);
  const [selectedVisitIndex, setSelectedVisitIndex] = useState(null);
  const [loading, setLoading] = useState(true);

  // ---------- helpers ----------
  const val = (obj, ...keys) =>
    keys.reduce((out, k) => (out != null ? out : obj?.[k]), null) ?? '-';

  const parseDMY = (dmy) => {
    // expects dd-mm-yyyy or dd/mm/yyyy
    if (!dmy) return null;
    const parts = dmy.replace(/\//g, '-').split('-');
    if (parts.length !== 3) return null;
    const [dd, mm, yyyy] = parts.map((p) => parseInt(p, 10));
    if (!dd || !mm || !yyyy) return null;
    return new Date(yyyy, mm - 1, dd);
  };

  const today0 = () => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  };

  // ---------- actions ----------
  const handleAccept = async (visit, index) => {
    const payload = {
      user_id: user.user_id,
      location_name: visit.proposed_place,
      district: visit.district || 'Unknown',
      hub_id: user.hub_id,
      username: user.username,
      hub_name: user.hub_name,
      accepted: 1,
      reason: '',
    };

    try {
      await savePlanStatus(payload);
      setUpcomingVisits((prev) => {
        const updated = [...prev];
        updated[index] = { ...updated[index], statusInfo: { type: 'accepted' } };
        return updated;
      });
    } catch (err) {
      console.error('❌ Accept failed:', err);
      Alert.alert('Error', 'Failed to accept. Please try again.');
    }
  };

  const handleReject = async (visit, reason, index) => {
    const payload = {
      user_id: user.user_id,
      phone_number: user.phone_number,
      location_name: visit.proposed_place,
      district: visit.district || 'Unknown',
      hub_id: user.hub_id,
      username: user.username,
      hub_name: user.hub_name,
      accepted: 0,
      reason,
    };

    try {
      await savePlanStatus(payload);
      setUpcomingVisits((prev) => {
        const updated = [...prev];
        const type = reason === 'Leave' ? 'rejected' : 'rescheduled';
        updated[index] = { ...updated[index], statusInfo: { type, reason } };
        return updated;
      });
    } catch (err) {
      console.error('❌ Reject failed:', err);
      Alert.alert('Error', 'Failed to reject. Please try again.');
    }
  };

  // ---------- load ----------
  useEffect(() => {
    const loadUserAndPlan = async () => {
      try {
        setLoading(true);
        const json = await AsyncStorage.getItem('user_info');
        if (!json) {
          setLoading(false);
          return;
        }

        const parsedUser = JSON.parse(json);
        console.log('✅ Loaded user:', parsedUser);
        setUser(parsedUser);

        const planData = await getInspectionPlan(parsedUser.user_id);
        console.log('✅ Plan data:', planData);

        const plans = Array.isArray(planData?.printablePlan)
          ? planData.printablePlan
          : Array.isArray(planData)
          ? planData
          : [];

        const today = today0();

        const upcomingOnly = plans
          .filter((plan) => {
            const planDate = parseDMY(plan.from);
            if (!planDate) return false;
            planDate.setHours(0, 0, 0, 0);
            return plan.user_id === parsedUser.user_id && planDate >= today;
          })
          .sort((a, b) => {
            const dateA = parseDMY(a.from);
            const dateB = parseDMY(b.from);
            return dateA - dateB;
          });

        const extractDistrict = (place) => {
          if (!place) return '';
          const parts = place.split(',');
          return parts.length > 1 ? parts[parts.length - 1].trim() : '';
        };

        const withDistrict = upcomingOnly.map((plan) => ({
          ...plan,
          district: plan.district || extractDistrict(plan.proposed_place),
        }));

        // use first only (like your old code). If you want all, remove slice.
        setUpcomingVisits(withDistrict.slice(0, 1));
      } catch (err) {
        console.error('❌ Failed to load user or plan:', err);
      } finally {
        setLoading(false);
      }
    };

    loadUserAndPlan();
  }, []);

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('user_info');
      navigation.reset({ index: 0, routes: [{ name: 'WaterLogin' }] });
    } catch (_err) {
      Alert.alert('Error', 'Failed to logout. Please try again.');
    }
  };

  // ---------- UI ----------
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color="#1a73e8" size="large" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>No user found. Please login again.</Text>
        <Pressable style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Go to Login</Text>
        </Pressable>
      </View>
    );
  }

  const email = val(user, 'email', 'Email'); // fallback if key is 'Email'
const phone = val(user, 'phone_number', 'phone', 'phoneNumber');
  const status = val(user, 'status');
  const moduleName = val(user, 'module');

  return (
    <ScrollView style={styles.container}>
      <View style={styles.profileCard}>
        <Image
          source={require('./../../../../assets/user_icon.png')}
          style={styles.avatar}
        />
        <Text style={styles.name}>{val(user, 'username', 'name')}</Text>
        <Text style={styles.userId}>User ID: {val(user, 'user_id')}</Text>
      </View>

      <View style={styles.infoContainer}>
        <InfoRow label="Phone Number" value={phone} />
        <InfoRow label="Status" value={status} />
        {/* <InfoRow label="HUB ID" value={hubId} /> */}
        <InfoRow label="Email" value={email} />
        <InfoRow label="Division" value={moduleName} />
      </View>

      {/* <View style={styles.upcomingWrapper}>
        <Text style={styles.upcomingTitle}>🧭 Upcoming Inspection</Text>

        {upcomingVisits.length === 0 ? (
          <Text style={styles.noVisits}>No upcoming visits assigned.</Text>
        ) : (
          upcomingVisits.map((visit, index) => (
          <View
            key={index}
            style={[
              styles.visitCard,
              visit.statusInfo?.type === 'accepted' && styles.acceptedCard,
              visit.statusInfo?.type === 'rejected' && styles.rejectedCard,
              visit.statusInfo?.type === 'rescheduled' && styles.rescheduledCard,
            ]}
          >
            <Text style={styles.visitDate}>
              📅 {visit.from} → {visit.to}
            </Text>
            <Text style={styles.visitPlace}>📍 {visit.proposed_place}</Text>

            {visit.statusInfo && (
              <Text style={styles.statusText}>
                {visit.statusInfo.type === 'accepted' && '✅ Accepted'}
                {visit.statusInfo.type === 'rejected' &&
                  `❌ Rejected due to ${visit.statusInfo.reason}`}
                {visit.statusInfo.type === 'rescheduled' && '🔁 Rescheduled'}
              </Text>
            )}

            {!visit.statusInfo && (
              <View style={styles.buttonRow}>
                <Pressable
                  style={({ pressed }) => [
                    styles.acceptButton,
                    pressed && { backgroundColor: '#1e7e34' },
                  ]}
                  onPress={() =>
                    Alert.alert('Confirm', 'Are you sure you want to accept?', [
                      {
                        text: 'OK',
                        onPress: () => handleAccept(visit, index),
                      },
                      { text: 'Cancel', style: 'cancel' },
                    ])
                  }
                >
                  <Text style={styles.buttonText}>Accept</Text>
                </Pressable>

                <Pressable
                  style={({ pressed }) => [
                    styles.rejectButton,
                    pressed && { backgroundColor: '#b71c1c' },
                  ]}
                  onPress={() =>
                    Alert.alert('Confirm', 'Are you sure you want to reject?', [
                      {
                        text: 'OK',
                        onPress: () => {
                          setShowRejectReason(true);
                          setSelectedVisitIndex(index);
                        },
                      },
                      { text: 'Cancel', style: 'cancel' },
                    ])
                  }
                >
                  <Text style={styles.buttonText}>Reject</Text>
                </Pressable>
              </View>
            )}

            {showRejectReason && selectedVisitIndex === index && (
              <View style={styles.dropdownContainer}>
                <Text style={styles.dropdownLabel}>Select Reason:</Text>
                <View style={styles.dropdown}>
                  {['Leave', 'Natural Disaster', 'Special Govt Holiday'].map(
                    (reason) => (
                      <Pressable
                        key={reason}
                        style={styles.dropdownItem}
                        onPress={() => {
                          setShowRejectReason(false);
                          handleReject(visit, reason, index);
                        }}
                      >
                        <Text style={styles.dropdownText}>{reason}</Text>
                      </Pressable>
                    )
                  )}
                </View>
              </View>
            )}
          </View>
        )))}
      </View> */}

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
    </ScrollView>
  );
}

const InfoRow = ({ label, value }) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue}>{value || '-'}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    paddingBottom: 60,
    backgroundColor: '#f5f7fb',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f7fb',
  },
  loadingText: {
    fontSize: 16,
    color: '#444',
    marginTop: 10,
  },
  profileCard: {
    backgroundColor: '#1a73e8',
    paddingVertical: 80,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#fff',
  },
  name: {
    fontSize: 20,
    color: '#fff',
    fontWeight: 'bold',
  },
  userId: {
    fontSize: 14,
    color: '#e0e0e0',
    marginTop: 4,
  },
  infoContainer: {
    margin: 16,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    elevation: 2,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 8,
  },
  infoLabel: {
    fontWeight: '600',
    color: '#444',
  },
  infoValue: {
    color: '#222',
    fontWeight: '500',
  },
  upcomingWrapper: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  upcomingTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a237e',
    marginBottom: 10,
  },
  noVisits: {
    color: '#999',
    fontStyle: 'italic',
  },
  visitCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  acceptedCard: {
    backgroundColor: '#e8f5e9',
    borderColor: '#66bb6a',
    borderWidth: 1,
  },
  rejectedCard: {
    backgroundColor: '#ffebee',
    borderColor: '#ef5350',
    borderWidth: 1,
  },
  rescheduledCard: {
    backgroundColor: '#e0f2f1',
    borderColor: '#26a69a',
    borderWidth: 1,
  },
  visitDate: {
    fontSize: 14,
    color: '#444',
  },
  visitPlace: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1b1b1b',
    marginTop: 6,
  },
  statusText: {
    marginTop: 10,
    fontStyle: 'italic',
    color: '#444',
    fontWeight: '500',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  acceptButton: {
    flex: 1,
    backgroundColor: '#4caf50',
    padding: 10,
    marginRight: 6,
    borderRadius: 8,
    alignItems: 'center',
  },
  rejectButton: {
    flex: 1,
    backgroundColor: '#f44336',
    padding: 10,
    marginLeft: 6,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  dropdownContainer: {
    marginTop: 12,
  },
  dropdownLabel: {
    marginBottom: 6,
    fontWeight: '600',
    color: '#333',
  },
  dropdown: {
    backgroundColor: '#eee',
    borderRadius: 8,
    padding: 8,
  },
  dropdownItem: {
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  dropdownText: {
    fontSize: 15,
    color: '#333',
  },
  logoutWrapper: {
    marginTop: 30,
    alignItems: 'center',
    marginBottom: 50,
  },
  logoutBtn: {
    backgroundColor: '#ff0000be',
    paddingVertical: 14,
    paddingHorizontal: 120,
    borderRadius: 10,
    alignItems: 'center',
  },
  logoutBtnPressed: {
    backgroundColor: '#f75e5eff',
  },
  logoutText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
