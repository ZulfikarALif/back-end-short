import axios from "axios";

const API_KEY = process.env.SAFE_BROWSING_API_KEY;

if (!API_KEY) {
  console.error("[SafeBrowsing] WARNING: API_KEY tidak ada di .env! Semua link dianggap aman.");
}

const API_URL = "https://safebrowsing.googleapis.com/v4/threatMatches:find";

export const checkSafeBrowsing = async (url) => {
  if (!API_KEY) {
    return { isSafe: true };
  }

  try {
    const response = await axios.post(
      API_URL,
      {
        client: {
          clientId: "quickclickhub",
          clientVersion: "1.0.0",
        },
        threatInfo: {
          threatTypes: [
            "MALWARE",
            "SOCIAL_ENGINEERING",
            "UNWANTED_SOFTWARE",
            "POTENTIALLY_HARMFUL_APPLICATION",
          ],
          platformTypes: ["ANY_PLATFORM"],
          threatEntryTypes: ["URL"],
          threatEntries: [{ url }],
        },
      },
      {
        params: { key: API_KEY },
        timeout: 10000,
      }
    );

    if (response.data?.matches && response.data.matches.length > 0) {
      const threatType = response.data.matches[0].threatType;
      console.log(`[Google Safe Browsing] BERBAHAYA (${threatType}): ${url}`);
      return { isSafe: false, threatType };
    }

    console.log(`[Google Safe Browsing] AMAN: ${url}`);
    return { isSafe: true };
  } catch (error) {
    if (error.response) {
      console.error("[SafeBrowsing] API Error:", error.response.status, error.response.data);
    } else {
      console.error("[SafeBrowsing] Request Error:", error.message);
    }
    return { isSafe: true }; // Fail-open
  }
};