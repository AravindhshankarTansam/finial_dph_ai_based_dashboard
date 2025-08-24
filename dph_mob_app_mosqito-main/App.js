import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useFonts, Ubuntu_400Regular, Ubuntu_700Bold } from '@expo-google-fonts/ubuntu';
import MosquitoLoginScreen from './approuter/screens/Mosquito/MosquitoLoginScreen';
import MosquitoDashboard from './approuter/screens/Mosquito/HomeScreen';
import WaterLoginScreen from './approuter/screens/Water/WaterLoginScreen';
import CapturePredictScreen from './approuter/screens/Water/CapturePredictScreen';
import PreviewWaterScreen from './approuter/screens/Water/PreviewWaterScreen';
import WaterDashboard from './approuter/screens/Water/HomeScreen';
import DataCollectionScreen from './approuter/screens/Mosquito/DataCollection/DataCollection';
import DataListScreen from './approuter/screens/Mosquito/DataCollection/DataList';
import PreviewScreen from './approuter/screens/Mosquito/DataCollection/PreviewScreen';
import HiWaterLabLogin from './approuter/screens/inspection_HI/HiWaterLabLogin';
import HiWaterLabHome from './approuter/screens/inspection_HI/HiWaterLabHome';
import { ThemeProvider, useThemeContext } from './approuter/context/ThemeContext';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();


// --- Mosquito Tabs ---
function MosquitoTabs() {
  const HomeScreen = require('./approuter/screens/Mosquito/MainScreen').default;
  const SettingsScreen = require('./approuter/screens/Mosquito/Settings/SettingsScreen').default;
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#3b82f6',
        tabBarInactiveTintColor: 'gray',
        tabBarIcon: ({ color, size }) => {
          let iconName = route.name === 'Home' ? 'home' : 'settings';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

// --- Mosquito Stack ---
function MosquitoStackScreen() {
  const MosquitoStack = createStackNavigator();

  return (
    <MosquitoStack.Navigator screenOptions={{ headerShown: false }}>
      <MosquitoStack.Screen name="MosquitoDashboard" component={MosquitoDashboard} />
      <MosquitoStack.Screen name="MosquitoTabs" component={MosquitoTabs} />
    </MosquitoStack.Navigator>
  );
}

// --- Mosquito Data Tabs ---
function MosquitoDataTabs({ navigation }) {
  const SyncDataScreen = require('./approuter/screens/Mosquito/DataCollection/SyncData').default;

  const RedirectToMain = () => {
    React.useEffect(() => {
      navigation.navigate('MosquitoFlow', {
        screen: 'MosquitoTabs',
        params: { screen: 'Home' },
      });
    }, []);
    return null;
  };

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: true,
        tabBarActiveTintColor: '#3b82f6',
        tabBarInactiveTintColor: 'gray',
        tabBarIcon: ({ color, size }) => {
          let iconName;
          if (route.name === 'Home') iconName = 'home';
          else if (route.name === 'DataList') iconName = 'list';
          else if (route.name === 'SyncData') iconName = 'cloud-upload';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={RedirectToMain} options={{ headerShown: false }} />
      <Tab.Screen name="DataList" component={DataListScreen} />
      <Tab.Screen name="SyncData" component={SyncDataScreen} />
    </Tab.Navigator>
  );
}

// --- Water Tabs ---
function WaterTabs() {
  const SettingsScreen = require('./approuter/screens/Water/Settings/SettingsScreen').default;
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#0284c7',
        tabBarInactiveTintColor: 'gray',
        tabBarIcon: ({ focused, color, size }) => {
          let iconName = route.name === 'WaterHome' ? 'water' : 'settings';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="WaterHome" component={WaterDashboard} options={{ title: 'Home' }} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}
// --- Login Screen ---
function LoginScreen({ navigation }) {
  return (
    <View style={styles.container}>
     <View style={styles.logoRow}>
        <Image source={require('./assets/dph.png')} style={styles.logoLeft}/>
        <Image source={require('./assets/tnlogo.png')} style={styles.logoMiddle} />
        <Image source={require('./assets/dph.png')} style={styles.logoRight} />
      </View>

      {/* <Text style={styles.title}>DPH</Text> */}
      <Text style={styles.subtitle}>Directorate of Public Health and Preventive Medicine</Text>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: '#3b82f6' }]}
        onPress={() => navigation.navigate('MosquitoLogin')}
      >
        <Text style={styles.buttonText}>Domestic Breeding Checker</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={[styles.button, { backgroundColor: '#FFD801' }]}
        onPress={() => navigation.navigate('WaterLogin')}
      >
        <Text style={styles.buttonText}>AI Chlorination Check</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={[styles.button, { backgroundColor: '#5ABCD8' }]}
        onPress={() => navigation.navigate('HiWaterLabLogin')}
      >
        <Text style={styles.buttonText}>Water Quality Analysis</Text>
      </TouchableOpacity>
      <Text style={styles.footerNote}>Field Monitoring Application</Text>
      <View style={styles.footerContainer}>
        
        <Text style={styles.footerNoteOne}>Version 1.0.0</Text>
        <Text style={styles.footerNoteTwo}>
          Developed by <Text style={styles.footerNoteTwoBold}>TANSAM</Text>
        </Text>
      </View>
    </View>
  );
}

// --- App Container ---
function AppContainer() {
  const { theme } = useThemeContext();

  return (
    <NavigationContainer theme={theme}>
      <Stack.Navigator initialRouteName="Login" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="MosquitoLogin" component={MosquitoLoginScreen} />
        <Stack.Screen name="MosquitoFlow" component={MosquitoStackScreen} />
        <Stack.Screen name="WaterLogin" component={WaterLoginScreen} />
        <Stack.Screen name="WaterFlow" component={WaterTabs} />
        <Stack.Screen name="DataCollection" component={DataCollectionScreen} />
        <Stack.Screen name="MosquitoDataFlow" component={MosquitoDataTabs} />
        <Stack.Screen name="PreviewScreen" component={PreviewScreen} />
        <Stack.Screen name="CapturePredict" component={CapturePredictScreen} />
        <Stack.Screen name="PreviewWaterScreen" component={PreviewWaterScreen} />
        <Stack.Screen name="HiWaterLabLogin" component={HiWaterLabLogin} />
        <Stack.Screen name="HiWaterLabHome" component={HiWaterLabHome} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

// --- App Entry Point ---
export default function App() {
  const [fontsLoaded] = useFonts({
    Ubuntu_400Regular,
    Ubuntu_700Bold,
  });

  if (!fontsLoaded) return null;

  return (
    <ThemeProvider>
      <AppContainer />
    </ThemeProvider>
  );
}

// --- Styles ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    backgroundColor: '#e2eafc',
  },
  title: {
    fontSize: 22,
    marginBottom: 30,
    fontFamily: 'Ubuntu_700Bold',
  },
  button: {
    width: '82%',
    paddingVertical: 12,
    borderRadius: 10,
    marginVertical: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: '#000000',
    fontSize: 18,
    fontFamily: 'Ubuntu_400Regular',
  },
  logoRow: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    width: '120%',
    marginBottom: 20,
  },
  logoMiddle: {
    width: 130,
    height: 120,
    resizeMode: 'contain',
    marginTop: -20,
  },
  logoLeft: {
    width: 130,
    height: 100,
    resizeMode: 'contain',
    marginBottom:20,
  },
  logoRight: {
    width: 130,
    height: 100,
    resizeMode: 'contain',
    marginBottom:20,
  },
  subtitle: {
    fontSize: 19,
    color: '#000080',
    marginBottom: 10,
    fontFamily: 'Ubuntu_700Bold',
    textAlign: 'center',
    width: '90%',
  },
  footerContainer: {
    position: 'absolute',
    bottom: 20,
    width: '100%',
    alignItems: 'center',
  },
  footerNote: {
    marginTop: 50,
    fontSize: 19,
    color: '#333',
    fontFamily: 'Ubuntu_400Regular',
    textAlign: 'center',
  },
  footerNoteOne: {
    fontSize: 16,
    color: '#555',
    fontFamily: 'Ubuntu_400Regular',
    textAlign: 'center',
    marginTop: 4,
  },
  footerNoteTwo: {
    fontSize: 16,
    color: '#555',
    fontFamily: 'Ubuntu_400Regular',
    textAlign: 'center',
    marginTop: 4,
  },
  footerNoteTwoBold: {
    fontFamily: 'Ubuntu_700Bold',
    color: '#000080',
  },
});
