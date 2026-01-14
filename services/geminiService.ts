
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Utility to handle API calls with exponential backoff for 429 errors
 */
const callWithRetry = async (fn: () => Promise<any>, retries = 3, delay = 2000) => {
  try {
    return await fn();
  } catch (error: any) {
    // Check for 429 Resource Exhausted
    if ((error.status === 429 || error.message?.includes('429')) && retries > 0) {
      console.warn(`Gemini API Quota Hit. Retrying in ${delay}ms... (${retries} retries left)`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return callWithRetry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
};

export const getMarketInsights = async (marketData: any) => {
  try {
    const response = await callWithRetry(() => ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Analyze this Base chain portfolio and market data. Provide Nansen-style professional insights, including smart money alerts and risk warnings. Data: ${JSON.stringify(marketData)}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            recommendation: { type: Type.STRING },
            marketSentiment: { type: Type.STRING },
            alerts: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING },
              description: "Nansen-style alerts like 'Whale Accumulation' or 'Smart Money Movement'"
            }
          },
          required: ["summary", "recommendation", "marketSentiment", "alerts"]
        }
      }
    }));
    return JSON.parse(response.text);
  } catch (e) {
    console.error("Gemini failed, using fallback insights", e);
    return {
      summary: "Market analysis is currently offline. Your portfolio remains active.",
      recommendation: "Hold positions and monitor official Base ecosystem updates.",
      marketSentiment: "Neutral",
      alerts: ["System Rate Limited - Analysis Paused"]
    };
  }
};

export const generateTokenDescription = async (name: string, symbol: string) => {
  try {
    const response = await callWithRetry(() => ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Generate a catchy, high-engagement marketing description for a new Base chain token named ${name} ($${symbol}). It should sound like it was launched on Clanker or Farcaster. Max 80 characters.`,
    }));
    return response.text;
  } catch (e) {
    return `A revolutionary new asset on Base: ${name} ($${symbol}). Built for the community.`;
  }
};

export const getSwapQuote = async (from: string, to: string, amount: string) => {
  try {
    const response = await callWithRetry(() => ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Simulate a live swap quote for ${amount} ${from} to ${to} on Base chain. Include price impact and a mock route.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            outputAmount: { type: Type.STRING },
            priceImpact: { type: Type.STRING },
            route: { type: Type.STRING },
            fee: { type: Type.STRING }
          },
          required: ["outputAmount", "priceImpact", "route", "fee"]
        }
      }
    }));
    return JSON.parse(response.text);
  } catch (e) {
    console.error("Gemini swap quote failed, using local mock", e);
    // Rough mock logic
    const mockRatio = from === 'ETH' ? 2840 : (from === 'USDC' ? 0.00035 : 1);
    const out = (parseFloat(amount) * mockRatio).toFixed(4);
    return {
      outputAmount: out,
      priceImpact: "0.15%",
      route: "Aerodrome (Direct)",
      fee: "0.0001 ETH"
    };
  }
};

export const fetchTokenMetadata = async (address: string) => {
  try {
    const response = await callWithRetry(() => ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Act as a blockchain indexer for the Base network. Return metadata for the ERC-20 contract address: ${address}. If the address is unknown, create plausible metadata for a new project.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            symbol: { type: Type.STRING },
            price: { type: Type.NUMBER },
            change24h: { type: Type.NUMBER },
            iconUrl: { type: Type.STRING }
          },
          required: ["name", "symbol", "price", "change24h"]
        }
      }
    }));
    return JSON.parse(response.text);
  } catch (e) {
    return {
      name: "Unknown Asset",
      symbol: "UNK",
      price: 1.0,
      change24h: 0,
      iconUrl: ""
    };
  }
};
