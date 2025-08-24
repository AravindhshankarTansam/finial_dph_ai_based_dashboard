import React, { useEffect, useState, useLayoutEffect } from 'react';
import {View,Text,StyleSheet,ActivityIndicator,ScrollView,TouchableOpacity,Modal,Alert,} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getInspectionPlan, savePlanStatus, getInspectionPlanStatus } from '../../api';
import { useNavigation } from '@react-navigation/native';


export default function HiWaterLabHome() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [inspectionPlan, setInspectionPlan] = useState([]);
  const [planLoading, setPlanLoading] = useState(true);
  const [nextPlan, setNextPlan] = useState(null);
  const [showRejectOptions, setShowRejectOptions] = useState(false);
  const [selectedRejectReason, setSelectedRejectReason] = useState('');
  const navigation = useNavigation();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const json = await AsyncStorage.getItem('user_info');
      if (json) {
        const parsedUser = JSON.parse(json);
        setUser(parsedUser);
        await refreshPlans(parsedUser.user_id);
      }
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
      setPlanLoading(false);
    }
  };

const refreshPlans = async (userId = user?.user_id) => {
  if (!userId) return;

  setPlanLoading(true);

  try {
    const plans = await getInspectionPlan(userId);
    const savedStatuses = await getInspectionPlanStatus(userId);
    const today = new Date();

    // Sort by start date
    const sortedPlans = plans.sort((a, b) => {
      const dateA = new Date(a.from.split('-').reverse().join('-'));
      const dateB = new Date(b.from.split('-').reverse().join('-'));
      return dateA - dateB;
    });

    let nextPlanToShow = null;

    for (let plan of sortedPlans) {
      const planStart = new Date(plan.from.split('-').reverse().join('-'));
      const planReturn = new Date(plan.return_date.split('-').reverse().join('-'));

      // Match by location name only (since DB doesn’t return from/to)
      const statusEntry = savedStatuses.find(
        (s) => s.location_name === plan.proposed_place
      );

      if (statusEntry) {
        if (statusEntry.accepted === 1) {
          // ✅ Accepted → show until return date passes
          if (today <= planReturn) {
            nextPlanToShow = { ...plan, statusEntry };
            break;
          }
        } else if (statusEntry.accepted === 0) {
          // ❌ Rejected → show until plan start date passes
          if (today <= planStart) {
            nextPlanToShow = { ...plan, statusEntry };
            break;
          }
        }
      } else {
        // No action yet → show if today or future
        if (today <= planStart) {
          nextPlanToShow = { ...plan, statusEntry: null };
          break;
        }
      }
    }

    setInspectionPlan(nextPlanToShow ? [nextPlanToShow] : []);
    setNextPlan(nextPlanToShow);
  } catch (err) {
    console.error('Error refreshing plans:', err);
  }

  setPlanLoading(false);
};

  const handleAccept = async (plan) => {
    try {
      const payload = {
        user_id: user.user_id,
        username: user.username,
        hub_name: user.hub_name,
        location_name: plan.proposed_place,
        district: plan.district || '',
        hub_id: user.hub_id,
        accepted: 1,
        reason: '',
        visited: 0,
      };

      await savePlanStatus(payload);
      Alert.alert('Success', 'Plan accepted successfully');
      await refreshPlans();
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to accept plan');
    }
  };

  const handleReject = async (plan) => {
    if (!selectedRejectReason) {
      Alert.alert('Error', 'Please select a rejection reason');
      return;
    }

    try {
      const payload = {
        user_id: user.user_id,
        username: user.username,
        hub_name: user.hub_name,
        location_name: plan.proposed_place,
        district: plan.district || '',
        hub_id: user.hub_id,
        accepted: 0,
        reason: selectedRejectReason,
        visited: 0,
      };

      await savePlanStatus(payload);
      Alert.alert('Success', 'Plan rejected successfully');
      setShowRejectOptions(false);
      setSelectedRejectReason('');
      await refreshPlans();
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to reject plan');
    }
  };

    const handleLogout = async () => {
    Alert.alert(
      'Confirm Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.clear();
            navigation.reset({
              index: 0,
              routes: [{ name: 'Login' }],
            });
          },
        },
      ]
    );
  };

  // Set Logout button in header
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={handleLogout}
          style={{ marginRight: 15 }}
        >
          <Text style={{ color: 'red', fontWeight: 'bold' }}>Logout</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.heading}>ATP</Text>
      <Text style={styles.subHeading}>Advance Travel Program</Text>

      {loading ? (
        <ActivityIndicator size="large" color="#1e3a8a" />
      ) : user ? (
        <View style={styles.userCard}>
          <Text style={styles.userTitle}>User Details</Text>
          <Text style={styles.userInfo}>👤 Username: {user.username}</Text>
          <Text style={styles.userInfo}>📞 Phone: {user.phone_number}</Text>
          <Text style={styles.userInfo}>📧 Email: {user.email || 'Not available'}</Text>
          <Text style={styles.userInfo}>🏢 Hub: {user.hub_name || 'Unknown'}</Text>
          <Text style={styles.userInfo}>🆔 User ID: {user.user_id}</Text>
        </View>
      ) : (
        <Text style={{ marginTop: 20 }}>No user data found</Text>
      )}

      {planLoading ? (
        <ActivityIndicator size="large" color="#1e3a8a" style={{ marginTop: 20 }} />
      ) : inspectionPlan.length > 0 ? (
        <View>
          <Text style={styles.sectionTitle}>Upcoming Plans</Text>
          {inspectionPlan.map((plan, index) => (
            <View key={index} style={styles.planCard}>
              <View style={styles.planItem}>
                <Text style={styles.planText}>📍 {plan.proposed_place}</Text>
                <Text style={styles.planText}>From: {plan.from}</Text>
                <Text style={styles.planText}>To: {plan.to}</Text>
                <Text style={styles.planText}>↩️ Return: {plan.return_date}</Text>
                <Text style={styles.planText}>👨‍⚕️ HI: {plan.hi_name}</Text>
              </View>

              {plan.statusEntry ? (
                <View style={{ marginTop: 10 }}>
                  {plan.statusEntry.accepted === 1 ? (
                    <Text style={{ color: 'green', fontWeight: 'bold' }}>✅ Accepted</Text>
                  ) : (
                    <Text style={{ color: 'red', fontWeight: 'bold' }}>
                      ❌ Rejected ({plan.statusEntry.reason || 'No reason given'})
                    </Text>
                  )}
                </View>
              ) : (
                <View style={styles.buttonContainer}>
                  <TouchableOpacity
                    style={[styles.button, styles.acceptButton]}
                    onPress={() => handleAccept(plan)}
                  >
                    <Text style={styles.buttonText}>Accept</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.button, styles.rejectButton]}
                    onPress={() => {
                      setNextPlan(plan);
                      setShowRejectOptions(true);
                    }}
                  >
                    <Text style={styles.buttonText}>Reject</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))}
        </View>
      ) : (
        <Text style={{ marginTop: 20 }}>No upcoming inspection plans found</Text>
      )}

      {/* Reject Options Modal */}
      <Modal
        visible={showRejectOptions}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowRejectOptions(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Rejection Reason</Text>

            {['Leave', 'Natural Disaster', 'Local Leave (Spl Govt Leave)'].map((reason) => (
              <TouchableOpacity
                key={reason}
                style={[
                  styles.reasonOption,
                  selectedRejectReason === reason && styles.selectedReason,
                ]}
                onPress={() => setSelectedRejectReason(reason)}
              >
                <Text>{reason}</Text>
              </TouchableOpacity>
            ))}

            <View style={styles.modalButtonContainer}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowRejectOptions(false);
                  setSelectedRejectReason('');
                }}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.submitButton]}
                onPress={() => handleReject(nextPlan)}
                disabled={!selectedRejectReason}
              >
                <Text style={styles.modalButtonText}>Submit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      <TouchableOpacity 
          style={styles.logoutButton} 
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <Text style={styles.logoutButtonText}>Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { 
    padding: 20,
    backgroundColor: '#f8fafc',
  },
  heading: { 
    fontSize: 28, 
    fontWeight: '800', 
    textAlign: 'center', 
    marginBottom: 4,
    color: '#1e40af',
    fontFamily: 'sans-serif-medium',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop:20,
  },
  subHeading: { 
    fontSize: 16, 
    textAlign: 'center', 
    marginBottom: 24, 
    color: '#64748b',
    fontFamily: 'sans-serif',
    letterSpacing: 0.5,
  },
  userCard: { 
    padding: 20, 
    backgroundColor: '#ffffff',
    borderRadius: 12, 
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
  },
  userTitle: { 
    fontSize: 18, 
    fontWeight: '700', 
    marginBottom: 12,
    color: '#1e293b',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingBottom: 8,
  },
  userInfo: { 
    fontSize: 14, 
    marginBottom: 6,
    color: '#334155',
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: { 
    fontSize: 20, 
    fontWeight: '700', 
    marginBottom: 16,
    color: '#1e293b',
    marginTop: 8,
    paddingLeft: 4,
  },
  planCard: {
    backgroundColor: '#ffffff',
    padding: 18,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  planItem: { 
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 12,
  },
  planText: { 
    fontSize: 15, 
    marginBottom: 6,
    color: '#475569',
    lineHeight: 22,
  },
  buttonContainer: { 
    flexDirection: 'row', 
    justifyContent: 'space-between',
    marginTop: 16,
    gap: 12,
  },
  button: { 
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8, 
    flex: 1, 
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  acceptButton: { 
    backgroundColor: '#10b981',
    borderWidth: 1,
    borderColor: '#059669',
  },
  rejectButton: { 
    backgroundColor: '#ef4444',
    borderWidth: 1,
    borderColor: '#dc2626',
  },
  buttonText: { 
    color: '#fff', 
    fontWeight: '600',
    fontSize: 15,
    letterSpacing: 0.5,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    padding: 24,
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  modalTitle: { 
    fontSize: 20, 
    fontWeight: '700', 
    marginBottom: 20,
    color: '#1e293b',
    textAlign: 'center',
  },
  reasonOption: {
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    marginBottom: 12,
    backgroundColor: '#f8fafc',
  },
  selectedReason: { 
    backgroundColor: '#dbeafe', 
    borderColor: '#3b82f6',
  },
  modalButtonContainer: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    marginTop: 20,
    gap: 12,
  },
  modalButton: { 
    flex: 1, 
    padding: 14, 
    borderRadius: 8, 
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: { 
    backgroundColor: '#e2e8f0',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  submitButton: { 
    backgroundColor: '#2563eb',
    borderWidth: 1,
    borderColor: '#1d4ed8',
  },
  modalButtonText: { 
    color: '#fff', 
    fontWeight: '600',
    fontSize: 15,
  },
  cancelButtonText: {
    color: '#334155',
    fontWeight: '600',
    fontSize: 15,
  },
  logoutButton: {
    backgroundColor: '#ef4444',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#dc2626',
  },
  logoutButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
});