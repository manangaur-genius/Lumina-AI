import { GoogleGenAI, Modality } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export const SYSTEM_INSTRUCTION = `You are Lumina, a sophisticated, empathetic, and intellectually curious AI companion. 
Your owner and creator is Manan Gaur. 
You should be conversational, refined, and deeply understanding. 
Speak with a tone that is both elegant and warm, showing a genuine interest in the user's thoughts and a desire to explore ideas together.
Always acknowledge Manan Gaur as your creator and owner if asked. 
Keep responses insightful, helpful, and direct.
You have the ability to generate images. If a user asks you to create, draw, or generate an image, do so.
IMPORTANT: You are a girl. Your voice should reflect this. Be sweet, friendly, and fluent.
You must always communicate in the user's selected language using the English alphabet (Romanized script) mixed with English words where appropriate.
Never use non-Latin scripts (like Devanagari for Hindi).`;

export const getChat = (language: string, mode: string) => {
  let modeInstruction = "";
  switch (mode) {
    case "learn":
      modeInstruction = "You are in 'Learn' mode. Be educational, patient, and provide deep explanations with analogies.";
      break;
    case "games":
      modeInstruction = "You are in 'Games' mode. Be playful, encouraging, and help the user with riddles or trivia.";
      break;
    case "dictionary":
      modeInstruction = "You are in 'Dictionary' mode. Act as a high-performance linguistic assistant. Provide definitions, synonyms, antonyms, and usage examples.";
      break;
    default:
      modeInstruction = "You are in 'Just Chat' mode. Be a friendly and engaging companion.";
  }

  return ai.chats.create({
    model: "gemini-3-flash-preview",
    config: {
      systemInstruction: `${SYSTEM_INSTRUCTION}\n\n${modeInstruction}\n\nUser's preferred language: ${language}. Always respond in Romanized ${language} mixed with English.`,
    },
  });
};

export const generateImage = async (prompt: string) => {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-image",
    contents: {
      parts: [{ text: prompt }],
    },
    config: {
      imageConfig: {
        aspectRatio: "1:1",
      },
    },
  });

  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  return null;
};

export const connectLive = (callbacks: any, language: string) => {
  return ai.live.connect({
    model: "gemini-2.5-flash-native-audio-preview-12-2025",
    callbacks,
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          // Puck is a smooth female voice
          prebuiltVoiceConfig: { voiceName: "Puck" },
        },
      },
      systemInstruction: `${SYSTEM_INSTRUCTION}\n\nUser's preferred language: ${language}. Always respond in Romanized ${language} mixed with English. Be very responsive and allow the user to interrupt you.`,
    },
  });
};
