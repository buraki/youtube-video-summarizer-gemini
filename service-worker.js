// Ephemeral Background Service Worker for Manifest V3

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SUMMARIZE_VIDEO') {
    // Wrap the async flow in an immediately invoked function expression (IIFE)
    (async () => {
      try {
        const { geminiApiKey } = await chrome.storage.sync.get('geminiApiKey');
        
        if (!geminiApiKey) {
          sendResponse({ success: false, error: 'NO_API_KEY' });
          return;
        }

        const { transcript, title, description, channel, language, isFallback } = message;
        
        // Build the system prompt and payload
        const prompt = buildPrompt(transcript, title, description, channel, language, isFallback);
        const resultText = await callGeminiApi(geminiApiKey, prompt);
        
        sendResponse({ success: true, summary: resultText });
      } catch (err) {
        console.error('Error generating summary in service worker:', err);
        sendResponse({ success: false, error: err.message || 'UNKNOWN_ERROR' });
      }
    })();
    
    return true; // Keeps the message channel open for async response
  } else if (message.type === 'ASK_QUESTION') {
    (async () => {
      try {
        const { geminiApiKey } = await chrome.storage.sync.get('geminiApiKey');
        
        if (!geminiApiKey) {
          sendResponse({ success: false, error: 'NO_API_KEY' });
          return;
        }

        const { videoContext, chatHistory, newQuestion, languageCode } = message;
        const resultText = await callGeminiChatApi(geminiApiKey, videoContext, chatHistory, newQuestion, languageCode);
        
        sendResponse({ success: true, answer: resultText });
      } catch (err) {
        console.error('Error answering question in service worker:', err);
        sendResponse({ success: false, error: err.message || 'UNKNOWN_ERROR' });
      }
    })();
    
    return true; // Keeps the message channel open for async response
  }
});

// Helper to map language code to full language name
function getLanguageName(langCode) {
  const languages = {
    en: 'English',
    tr: 'Turkish (Türkçe)',
    es: 'Spanish (Español)',
    de: 'German (Deutsch)',
    fr: 'French (Français)',
    ru: 'Russian (Русский)',
    pt: 'Portuguese (Português)'
  };
  return languages[langCode] || 'English';
}

// Construct prompt for Gemini
function buildPrompt(transcript, title, description, channel, languageCode, isFallback) {
  const targetLanguage = getLanguageName(languageCode);
  
  if (isFallback) {
    // Prompt when transcript is NOT available
    return `You are an expert video summarizer. The following YouTube video does not have a transcript available.
Please generate an informative summary of what this video is likely about based on its metadata.
The user's preferred language for the summary is: ${targetLanguage}.
Please write the summary ENTIRELY in ${targetLanguage}!

Here is the video metadata:
Title: ${title}
Channel: ${channel}
Description:
${description}

Your summary MUST be structured in markdown as follows:
### 📌 Overview
Provide a brief 1-2 sentence overview of the video's main topic, explaining that a full transcript was unavailable.

### 🔑 Anticipated Takeaways
Provide 4-5 bullet points of the expected key takeaways or main arguments of the video, inferred from the description.

### 📝 Final Note
A short concluding sentence summarizing the estimated impact or target audience of this video.`;
  } else {
    // Standard prompt when transcript is available
    return `You are an expert video summarizer. Please summarize the following YouTube video transcript.
The user's preferred language for the summary is: ${targetLanguage}.
Please write the summary ENTIRELY in ${targetLanguage}!

Here is the video info:
Title: ${title}
Channel: ${channel}

Here is the transcript:
${transcript}

Your summary MUST be structured in markdown as follows:
### 📌 Overview
Provide a brief, compelling 1-2 sentence overview of the video's core theme and purpose.

### 🔑 Key Takeaways
Provide 5-7 bullet points of the main arguments, insights, or findings in the video. If the transcript has timestamps, mention approximate timings. Focus on concrete facts rather than vague summaries.

### 💡 Core Conclusion
Provide a powerful, 1-2 sentence concluding synthesis of the video's overall message or impact.`;
  }
}

// Make the fetch call to Gemini API with dynamic self-healing fallback support
async function callGeminiApi(apiKey, prompt, modelOverride = null) {
  const modelName = modelOverride || 'models/gemini-1.5-flash';
  const endpoint = `https://generativelanguage.googleapis.com/v1/${modelName}:generateContent?key=${apiKey}`;
  
  console.log(`[Gemini SW] Initiating generateContent with target model: ${modelName}`);
  
  const payload = {
    contents: [
      {
        parts: [
          {
            text: prompt
          }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.2, // Low temperature for highly focused summaries
      topP: 0.8,
      topK: 40
    }
  };

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const message = errorData.error?.message || `HTTP error! Status: ${response.status}`;
      
      // If the model is not found or supported, throw a specific error type to trigger self-healing
      if (response.status === 404 || message.includes('not found') || message.includes('not supported')) {
        const customErr = new Error(message);
        customErr.isModelError = true;
        throw customErr;
      }
      throw new Error(message);
    }

    const responseData = await response.json();
    const candidate = responseData.candidates?.[0];
    const text = candidate?.content?.parts?.[0]?.text;
    
    if (!text) {
      throw new Error('Gemini did not return any text.');
    }

    return text;

  } catch (err) {
    // If it's a model-not-found/supported error and we haven't already performed a self-healing fallback
    if (err.isModelError && !modelOverride) {
      console.warn('[Gemini SW] Primary model not found. Running self-healing catalog check...');
      
      try {
        const fallbackModel = await resolveBestAvailableModel(apiKey);
        if (fallbackModel) {
          console.log(`[Gemini SW] Self-healing success! Retrying summarization with best available model: ${fallbackModel}`);
          return await callGeminiApi(apiKey, prompt, fallbackModel);
        }
      } catch (fallbackErr) {
        console.error('[Gemini SW] Self-healing resolution failed:', fallbackErr);
      }
    }
    
    throw err;
  }
}

// Queries the model catalog using the user's API Key and resolves the best available model name
async function resolveBestAvailableModel(apiKey) {
  const catalogUrl = `https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`;
  const response = await fetch(catalogUrl);
  if (!response.ok) {
    throw new Error(`Failed to list available models. Status: ${response.status}`);
  }
  
  const data = await response.json();
  if (!data.models || data.models.length === 0) {
    return null;
  }
  
  // 1. Look for models supporting generateContent
  const eligibleModels = data.models.filter(m => 
    m.supportedGenerationMethods && 
    m.supportedGenerationMethods.includes('generateContent')
  );
  
  if (eligibleModels.length === 0) return null;
  
  // 2. Select the best match in order of preference
  // Preference 1: gemini-1.5-flash-latest, gemini-1.5-flash, gemini-2.0-flash, gemini-2.5-flash
  const flashModel = eligibleModels.find(m => m.name.includes('flash') && !m.name.includes('8b'));
  if (flashModel) return flashModel.name;
  
  // Preference 2: Any flash model (like gemini-1.5-flash-8b)
  const anyFlash = eligibleModels.find(m => m.name.includes('flash'));
  if (anyFlash) return anyFlash.name;
  
  // Preference 3: Any gemini model (like gemini-1.5-pro, gemini-pro)
  const proModel = eligibleModels.find(m => m.name.includes('gemini'));
  if (proModel) return proModel.name;
  
  // Preference 4: The first eligible model in the list
  return eligibleModels[0].name;
}

// Make the fetch call to Gemini API for a chat turn with full context and history
async function callGeminiChatApi(apiKey, videoContext, chatHistory, newQuestion, languageCode, modelOverride = null) {
  const modelName = modelOverride || 'models/gemini-1.5-flash';
  const endpoint = `https://generativelanguage.googleapis.com/v1/${modelName}:generateContent?key=${apiKey}`;
  
  const targetLanguage = getLanguageName(languageCode);
  
  // Create system instructions or initial context
  const systemInstruction = `You are a helpful assistant specialized in answering questions about the following YouTube video.
Use the provided video details and transcript to answer any questions precisely.
If the answer cannot be found in the video transcript or metadata, use your general knowledge to give a helpful and relevant answer, but mention that it is not explicitly discussed in the video.
You MUST write all your responses ENTIRELY in ${targetLanguage}!
Keep your answers clear, informative, and reasonably concise, matching the structure of a premium chat interface.`;

  // Start building the contents array
  const contents = [];
  
  // 1. First turn: Initial context and system instructions
  contents.push({
    role: 'user',
    parts: [{ text: `${systemInstruction}\n\nHere is the video info:\nTitle: ${videoContext.title}\nChannel: ${videoContext.channel}\n\nTranscript / Metadata:\n${videoContext.transcript}` }]
  });
  
  contents.push({
    role: 'model',
    parts: [{ text: `Understood! I have read the video details and transcript. I will answer all your questions about this video in ${targetLanguage}. Please ask your question.` }]
  });
  
  // 2. Append existing chat history
  if (chatHistory && chatHistory.length > 0) {
    for (const turn of chatHistory) {
      contents.push({
        role: turn.role, // 'user' or 'model'
        parts: [{ text: turn.text }]
      });
    }
  }
  
  // 3. Append the new user question
  contents.push({
    role: 'user',
    parts: [{ text: newQuestion }]
  });

  const payload = {
    contents: contents,
    generationConfig: {
      temperature: 0.3,
      topP: 0.8,
      topK: 40
    }
  };

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const message = errorData.error?.message || `HTTP error! Status: ${response.status}`;
      
      if (response.status === 404 || message.includes('not found') || message.includes('not supported')) {
        const customErr = new Error(message);
        customErr.isModelError = true;
        throw customErr;
      }
      throw new Error(message);
    }

    const responseData = await response.json();
    const candidate = responseData.candidates?.[0];
    const text = candidate?.content?.parts?.[0]?.text;
    
    if (!text) {
      throw new Error('Gemini did not return any text.');
    }

    return text;

  } catch (err) {
    if (err.isModelError && !modelOverride) {
      console.warn('[Gemini SW] Primary model not found during chat. Running self-healing fallback...');
      try {
        const fallbackModel = await resolveBestAvailableModel(apiKey);
        if (fallbackModel) {
          return await callGeminiChatApi(apiKey, videoContext, chatHistory, newQuestion, languageCode, fallbackModel);
        }
      } catch (fallbackErr) {
        console.error('[Gemini SW] Self-healing resolution failed during chat:', fallbackErr);
      }
    }
    throw err;
  }
}
