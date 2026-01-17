const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";

export const callGemini = async (userQuery, systemPrompt, imageBase64 = null, expectJson = false, retries = 0) => {
  if (!GEMINI_API_KEY) {
      console.error("Missing Gemini API Key. Check your .env file.");
      return "Error: API Key is missing in .env file.";
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${GEMINI_API_KEY}`;
  
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
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        console.error("Gemini API Error:", response.status, errData);
        
        if (response.status === 429) return "Error: API Usage Limit Exceeded (429).";
        if (response.status === 400) return "Error: Bad Request (Check Image format).";
        return `Error: ${response.statusText} (${response.status})`;
    }
    
    const result = await response.json();
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!text) return "Error: AI returned empty response.";
    return text;

  } catch (error) {
    console.error("Network Error:", error);
    if (retries < 2) {
      await new Promise(r => setTimeout(r, 1000 * Math.pow(2, retries)));
      return callGemini(userQuery, systemPrompt, imageBase64, expectJson, retries + 1);
    }
    return `Error: Network connection failed.`;
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