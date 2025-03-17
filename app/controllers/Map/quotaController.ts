// src/controllers/Map/quotaController.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db, auth } from "../../config/firebaseConfig";
import { Place } from "@/app/types/MapTypes";

// STRICT LIMIT: Maximum 20 API calls per day (doubled from 10)
const MAX_DAILY_QUOTA = 20;
const QUOTA_STORAGE_KEY = "places_api_quota_v2";

interface QuotaRecord {
  date: string;
  count: number;
  lastReset: number;
  apiCalls: {
    places: number;
    directions: number;
  };
}

/**
 * Get today's date string in YYYY-MM-DD format for quota tracking
 */
const getTodayString = (): string => {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(
    today.getDate()
  ).padStart(2, "0")}`;
};

/**
 * Initialize or get the current quota record
 */
export const getQuotaRecord = async (): Promise<QuotaRecord> => {
  try {
    // Try Firebase first if user is logged in
    const currentUser = auth.currentUser;
    if (currentUser) {
      const quotaDocRef = doc(db, "users", currentUser.uid, "settings", "apiQuota");
      const quotaDoc = await getDoc(quotaDocRef);

      if (quotaDoc.exists()) {
        const quotaData = quotaDoc.data();
        const today = getTodayString();

        // Reset quota if it's a new day
        if (quotaData.date !== today) {
          console.log("New day - resetting API quota in Firebase");
          const newRecord: QuotaRecord = {
            date: today,
            count: 0,
            lastReset: Date.now(),
            apiCalls: {
              places: 0,
              directions: 0,
            },
          };
          await setDoc(quotaDocRef, {
            ...newRecord,
            updatedAt: serverTimestamp(),
          });
          return newRecord;
        }

        return quotaData as QuotaRecord;
      } else {
        // Initialize new quota record in Firebase
        const newRecord: QuotaRecord = {
          date: getTodayString(),
          count: 0,
          lastReset: Date.now(),
          apiCalls: {
            places: 0,
            directions: 0,
          },
        };
        await setDoc(quotaDocRef, {
          ...newRecord,
          updatedAt: serverTimestamp(),
        });
        return newRecord;
      }
    }

    // Fallback to AsyncStorage if Firebase isn't available
    const storedQuota = await AsyncStorage.getItem(QUOTA_STORAGE_KEY);
    if (storedQuota) {
      const quotaRecord: QuotaRecord = JSON.parse(storedQuota);
      const today = getTodayString();

      // Reset quota if it's a new day
      if (quotaRecord.date !== today) {
        console.log("New day - resetting API quota");
        const newRecord: QuotaRecord = {
          date: today,
          count: 0,
          lastReset: Date.now(),
          apiCalls: {
            places: 0,
            directions: 0,
          },
        };
        await AsyncStorage.setItem(QUOTA_STORAGE_KEY, JSON.stringify(newRecord));
        return newRecord;
      }

      return quotaRecord;
    }

    // Initialize new quota record
    const newRecord: QuotaRecord = {
      date: getTodayString(),
      count: 0,
      lastReset: Date.now(),
      apiCalls: {
        places: 0,
        directions: 0,
      },
    };
    await AsyncStorage.setItem(QUOTA_STORAGE_KEY, JSON.stringify(newRecord));
    return newRecord;
  } catch (error) {
    console.error("Error getting quota record:", error);
    // Return a new record if error
    return {
      date: getTodayString(),
      count: 0,
      lastReset: Date.now(),
      apiCalls: {
        places: 0,
        directions: 0,
      },
    };
  }
};

/**
 * Check if we have quota available for a particular API call type
 * @param apiType Type of API call ('places' or 'directions')
 * @returns Boolean indicating if quota is available
 */
export const hasQuotaAvailable = async (apiType: "places" | "directions"): Promise<boolean> => {
  try {
    const quota = await getQuotaRecord();

    // Reserve a smaller number of calls for each type to ensure we have some quota left
    // for important operations. We're using much smaller values than before.
    const priorityAllowance = apiType === "places" ? 5 : 2;

    // Log current quota status
    console.log(
      `[quotaController] Quota: ${quota.count}/${MAX_DAILY_QUOTA}, Reserved for ${apiType}: ${priorityAllowance}`
    );

    // Check if we have enough unreserved quota available
    // This means we can use (MAX_DAILY_QUOTA - priorityAllowance) calls before hitting the reserved quota
    const hasUnreservedQuota = quota.count < MAX_DAILY_QUOTA - priorityAllowance;

    if (!hasUnreservedQuota) {
      console.log(`[quotaController] Using reserved quota for ${apiType}`);
    }

    // Allow the call if we're under the total quota (always allow if we haven't hit absolute max)
    return quota.count < MAX_DAILY_QUOTA;
  } catch (error) {
    console.error("[quotaController] Error checking quota:", error);
    // Be conservative and return false on error
    return false;
  }
};

/**
 * Record an API call and update the quota
 * @param apiType Type of API call ('places' or 'directions')
 * @returns Boolean indicating success
 */
export const recordApiCall = async (apiType: "places" | "directions"): Promise<boolean> => {
  try {
    const quota = await getQuotaRecord();

    // Check if we've already hit our limit
    if (quota.count >= MAX_DAILY_QUOTA) {
      console.warn(`Daily quota of ${MAX_DAILY_QUOTA} API calls exceeded!`);
      return false;
    }

    // Update the quota
    quota.count += 1;
    quota.apiCalls[apiType] += 1;

    // Save updated quota
    const currentUser = auth.currentUser;
    if (currentUser) {
      const quotaDocRef = doc(db, "users", currentUser.uid, "settings", "apiQuota");
      await setDoc(quotaDocRef, {
        ...quota,
        updatedAt: serverTimestamp(),
      });
    } else {
      // Fallback to AsyncStorage
      await AsyncStorage.setItem(QUOTA_STORAGE_KEY, JSON.stringify(quota));
    }

    console.log(`API call recorded: ${apiType}. Total today: ${quota.count}/${MAX_DAILY_QUOTA}`);
    return true;
  } catch (error) {
    console.error("Error recording API call:", error);
    return false;
  }
};

/**
 * Get the remaining quota for today
 * @returns Number of remaining API calls
 */
export const getRemainingQuota = async (): Promise<number> => {
  try {
    const quota = await getQuotaRecord();
    return Math.max(0, MAX_DAILY_QUOTA - quota.count);
  } catch (error) {
    console.error("Error getting remaining quota:", error);
    return 0; // Be conservative on errors
  }
};

/**
 * Get quota usage statistics
 */
export const getQuotaStats = async (): Promise<{
  used: number;
  total: number;
  remaining: number;
  byApiType: {
    places: number;
    directions: number;
  };
  resetTime: string;
}> => {
  try {
    const quota = await getQuotaRecord();

    // Calculate time until reset
    const resetDate = new Date();
    resetDate.setDate(resetDate.getDate() + 1);
    resetDate.setHours(0, 0, 0, 0);

    return {
      used: quota.count,
      total: MAX_DAILY_QUOTA,
      remaining: MAX_DAILY_QUOTA - quota.count,
      byApiType: quota.apiCalls,
      resetTime: resetDate.toLocaleTimeString(),
    };
  } catch (error) {
    console.error("Error getting quota stats:", error);
    return {
      used: 0,
      total: MAX_DAILY_QUOTA,
      remaining: MAX_DAILY_QUOTA,
      byApiType: {
        places: 0,
        directions: 0,
      },
      resetTime: "Unknown",
    };
  }
};
