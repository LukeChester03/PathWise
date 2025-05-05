import AsyncStorage from "@react-native-async-storage/async-storage";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db, auth } from "../../config/firebaseConfig";

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

const getTodayString = (): string => {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(
    today.getDate()
  ).padStart(2, "0")}`;
};

export const getQuotaRecord = async (): Promise<QuotaRecord> => {
  try {
    const currentUser = auth.currentUser;
    if (currentUser) {
      const quotaDocRef = doc(db, "users", currentUser.uid, "settings", "apiQuota");
      const quotaDoc = await getDoc(quotaDocRef);

      if (quotaDoc.exists()) {
        const quotaData = quotaDoc.data();
        const today = getTodayString();

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

    const storedQuota = await AsyncStorage.getItem(QUOTA_STORAGE_KEY);
    if (storedQuota) {
      const quotaRecord: QuotaRecord = JSON.parse(storedQuota);
      const today = getTodayString();

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

export const hasQuotaAvailable = async (apiType: "places" | "directions"): Promise<boolean> => {
  try {
    const quota = await getQuotaRecord();

    const priorityAllowance = apiType === "places" ? 5 : 2;

    console.log(
      `[quotaController] Quota: ${quota.count}/${MAX_DAILY_QUOTA}, Reserved for ${apiType}: ${priorityAllowance}`
    );

    const hasUnreservedQuota = quota.count < MAX_DAILY_QUOTA - priorityAllowance;

    if (!hasUnreservedQuota) {
      console.log(`[quotaController] Using reserved quota for ${apiType}`);
    }

    return quota.count < MAX_DAILY_QUOTA;
  } catch (error) {
    console.error("[quotaController] Error checking quota:", error);
    return false;
  }
};

export const recordApiCall = async (apiType: "places" | "directions"): Promise<boolean> => {
  try {
    const quota = await getQuotaRecord();

    if (quota.count >= MAX_DAILY_QUOTA) {
      console.warn(`Daily quota of ${MAX_DAILY_QUOTA} API calls exceeded!`);
      return false;
    }

    quota.count += 1;
    quota.apiCalls[apiType] += 1;

    const currentUser = auth.currentUser;
    if (currentUser) {
      const quotaDocRef = doc(db, "users", currentUser.uid, "settings", "apiQuota");
      await setDoc(quotaDocRef, {
        ...quota,
        updatedAt: serverTimestamp(),
      });
    } else {
      await AsyncStorage.setItem(QUOTA_STORAGE_KEY, JSON.stringify(quota));
    }

    console.log(`API call recorded: ${apiType}. Total today: ${quota.count}/${MAX_DAILY_QUOTA}`);
    return true;
  } catch (error) {
    console.error("Error recording API call:", error);
    return false;
  }
};

export const getRemainingQuota = async (): Promise<number> => {
  try {
    const quota = await getQuotaRecord();
    return Math.max(0, MAX_DAILY_QUOTA - quota.count);
  } catch (error) {
    console.error("Error getting remaining quota:", error);
    return 0;
  }
};

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
