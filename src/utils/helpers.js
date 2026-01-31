const AI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";

// Using Gemini 2.0 Flash - the latest and most powerful
const AI_MODEL = "gemini-2.0-flash";

export const callGemini = async (userQuery, systemPrompt, imageBase64 = null, expectJson = false, retries = 0) => {
  if (!AI_API_KEY) {
    console.error("Missing AI API Key. Check your .env file.");
    return "Error: API Key is missing in .env file.";
  }

  console.log("🤖 Calling AI Engine...");

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${AI_MODEL}:generateContent?key=${AI_API_KEY}`;

  // Conditional Prompting
  let finalPrompt = `${systemPrompt}\n\nUser Request: ${userQuery}`;

  if (expectJson) {
    finalPrompt = `${systemPrompt}\n\nCRITICAL INSTRUCTION: Return ONLY valid JSON. Do not use Markdown code blocks. Do not add introductory text.\n\nUser Request: ${userQuery}`;
  }

  const parts = [{ text: finalPrompt }];

  if (imageBase64) {
    parts.push({
      inlineData: {
        mimeType: "image/jpeg",
        data: imageBase64
      }
    });
  }

  const payload = { contents: [{ role: "user", parts: parts }] };

  try {
    console.log("📤 Sending AI request...");
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      console.error("❌ AI API Error:", response.status, errData);

      if (response.status === 429) return "Error: API Usage Limit Exceeded (429). Wait a moment and try again.";
      if (response.status === 400) return "Error: Bad Request (400). Check input format.";
      if (response.status === 404) return "Error: Model not found (404). The AI model may have changed.";
      return `Error: ${errData?.error?.message || response.statusText} (${response.status})`;
    }

    const result = await response.json();
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text;

    console.log("✅ AI response received:", text?.substring(0, 100) + "...");

    if (!text) return "Error: AI returned empty response.";
    return text;

  } catch (error) {
    console.error("🔴 Network Error:", error);
    if (retries < 2) {
      console.log(`🔄 Retrying... (attempt ${retries + 2})`);
      await new Promise(r => setTimeout(r, 1000 * Math.pow(2, retries)));
      return callGemini(userQuery, systemPrompt, imageBase64, expectJson, retries + 1);
    }
    return `Error: Network connection failed. Check your internet.`;
  }
};

export const cleanAIResponse = (text) => {
  if (!text || typeof text !== 'string') return null;
  if (text.startsWith("Error:")) return null;

  try {
    let clean = text.replace(/```json/gi, '').replace(/```/g, '').trim();
    const start = clean.indexOf('{');
    const end = clean.lastIndexOf('}');

    if (start !== -1 && end !== -1) {
      clean = clean.substring(start, end + 1);
    } else {
      // Only warn if we expected JSON but didn't find braces
      // console.warn("No JSON braces found in:", text);
      return null;
    }

    return JSON.parse(clean);
  } catch (e) {
    console.warn("JSON Parse Failed:", e);
    return null;
  }
};

export const calculateBMI = (weightKg, heightCm) => {
  if (!weightKg || !heightCm) return 0;
  const heightM = heightCm / 100;
  return +(weightKg / (heightM * heightM)).toFixed(1);
};

export const getLevel = (xp, levels) => {
  return levels.slice().reverse().find(l => xp >= l.minXp) || levels[0];
};


