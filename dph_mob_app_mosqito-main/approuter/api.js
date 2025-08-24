import AsyncStorage from '@react-native-async-storage/async-storage';

// Use your actual IP address or domain
// const BASE_URL = 'http://localhost:3000';
const BASE_URL = 'http://192.168.1.10:3000';
// 
// Authentication
export const loginUser = async (username, password) => {
  console.log("📤 Sending login request to:", `${BASE_URL}/login`);
  console.log("📦 Request body:", { username, password });

  const response = await fetch(`${BASE_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  console.log("📥 Raw response status:", response.status);
  console.log("📥 Raw response headers:", [...response.headers]);

  const data = await response.json();
  console.log("📥 Parsed response JSON:", data);

  if (!response.ok) throw new Error(data.message || 'Login failed');

  await AsyncStorage.setItem('user_info', JSON.stringify(data.user));
  return data.user;
};

// Push data
export const pushChlorineDataByRole = async (data, user) => {
  try {
    // Decide endpoint based on user role or module
    const isHudCollector = user?.role === 'hud_data_collector';
    const apiUrl = isHudCollector
      ? `${BASE_URL}/dashboard/chl_hud_datacollection`
      : `${BASE_URL}/dashboard/chl_datacollection`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    const contentType = response.headers.get('Content-Type') || '';
    const isJson = contentType.includes('application/json');
    const body = isJson ? await response.json() : await response.text();

    if (!response.ok) throw new Error(body?.message || 'Failed to push data');

    return body;
  } catch (error) {
    console.error('❌ Chlorine data push failed:', error);
    throw error;
  }
};


// Get date-wise user count
export const getDatewiseUserCount = async (user_id, isHudCollector = false) => {
  const endpoint = isHudCollector
    ? `${BASE_URL}/dashboard/chl_hud_datacollection/count-by-date?user_id=${user_id}`
    : `${BASE_URL}/dashboard/datacollection/count-by-date?user_id=${user_id}`;

  const response = await fetch(endpoint);
  const data = await response.json();

  if (!response.ok) throw new Error(data.message || 'Failed to fetch user data counts');
  return data;
};

// Get detailed user count by date
export const getDatewiseUserCountDetails = async (user_id, date, isHudCollector = false) => {
  const endpoint = isHudCollector
    ? `${BASE_URL}/dashboard/chl_hud_datacollection/details-by-date?user_id=${user_id}&date=${date}`
    : `${BASE_URL}/dashboard/datacollection/details-by-date?user_id=${user_id}&date=${date}`;

  const response = await fetch(endpoint);
  const data = await response.json();

  if (!response.ok) throw new Error(data.message || 'Failed to fetch count details');
  return data;
};

// Push chlorine data (handles HUD and regular data)
export const pushChlorineData = async (data, user) => {
  try {
    const isHudCollector = user?.role === 'hud_data_collector';
    const apiUrl = isHudCollector
      ? `${BASE_URL}/dashboard/chl_hud_datacollection`
      : `${BASE_URL}/dashboard/chl_datacollection`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    const contentType = response.headers.get('Content-Type') || '';
    const isJson = contentType.includes('application/json');
    const body = isJson ? await response.json() : await response.text();

    if (!response.ok) throw new Error(body?.message || 'Failed to push chl data');

    return body;
  } catch (error) {
    console.error('❌ Chlorine data push failed:', error);
    throw error;
  }
};


//  Dashboard
export const getDashboardData = async () => { 
  try {
    const response = await fetch(`${BASE_URL}/dashboard/data`);
    const data = await response.json();

    if (!response.ok) throw new Error(data.message || 'Failed to fetch dashboard data');

    return data;
  } catch (error) {
    console.error('❌ Dashboard data fetch failed:', error);
    throw error;
  }
};

// Get inspection plan
    export const getInspectionPlan = async (user_id) => {
      try {
        const response = await fetch(`${BASE_URL}/dashboard/inspection-plan?user_id=${user_id}`);

        if (!response.ok) {
          throw new Error('Failed to fetch');
        }

        const data = await response.json();
        // console.log("Raw API response:", data);

        if (data.printablePlan && Array.isArray(data.printablePlan)) {
          // Filter plans to only include those for the current user
          const userPlans = data.printablePlan.filter(plan => plan.user_id === user_id);
          return userPlans;
        } else {
          console.warn("API returned no printablePlan array:", data);
          return [];
        }
      } catch (error) {
        console.error("❌ API call failed (getInspectionPlan):", error);
        return [];
      }
    };

export const savePlanStatus = async (payload) => {
  try {
    const res = await fetch(`${BASE_URL}/dashboard/save-plan-status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Save plan status failed');
    }

    return data;
  } catch (err) {
    console.error('❌ API error (savePlanStatus):', err);
    throw err;
  }
};

// export const getInspectionPlanStatus = async (user_id) => {
//   try {
//     const response = await fetch(`${BASE_URL}/dashboard/inspection-plan-status?user_id=${user_id}`);
//     const data = await response.json();

//     if (!response.ok) {
//       throw new Error(data.message || 'Failed to fetch inspection plan status');
//     }

//     return data;
//   } catch (err) {
//     console.error('❌ Error fetching inspection plan status:', err);
//     throw err;
//   }
// };

// ✅ Get saved inspection plan status for a user
// api/index.js
export const getInspectionPlanStatus = async (user_id) => {
  try {
    const response = await fetch(`${BASE_URL}/dashboard/get-save-plan-status?user_id=${user_id}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch inspection plan status');
    }

    return data; 
  } catch (err) {
    console.error('❌ Error fetching inspection plan status:', err);
    throw err;
  }
};
