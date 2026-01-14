
import { GoogleGenAI, Type } from "@google/genai";
import { SentimentPoint } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Simple In-Memory Cache to prevent repeated hits for same data
const cache = new Map<string, { data: any, timestamp: number }>();
const INSIGHTS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const QUOTE_CACHE_TTL = 30 * 1000; // 30 seconds

/**
 * Utility to handle API calls with exponential backoff for 429 errors
 */
const callWithRetry = async (fn: () => Promise<any>, retries = 2, delay = 3000) => {
  try {
    return await fn();
  } catch (error: any) {
    const isQuotaError = error.status === 429 || error.message?.includes('429') || error.message?.includes('RESOURCE_EXHAUSTED');
    if (isQuotaError && retries > 0) {
      console.warn(`Gemini API Quota Hit. Retrying in ${delay}ms... (${retries} retries left)`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return callWithRetry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
};

export const getMarketInsights = async (marketData: any) => {
  const cacheKey = `insights_${JSON.stringify(marketData.map((t: any) => t.symbol))}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < INSIGHTS_CACHE_TTL) {
    return cached.data;
  }

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
    const data = JSON.parse(response.text);
    cache.set(cacheKey, { data, timestamp: Date.now() });
    return data;
  } catch (e) {
    console.error("Gemini failed, using fallback insights", e);
    return {
      summary: "Market analysis is currently using cached or default data due to high network demand.",
      recommendation: "Hold positions and monitor official Base ecosystem updates.",
      marketSentiment: "Neutral",
      alerts: ["Real-time Analysis Throttled", "Smart Money: Watching ETH entry levels"]
    };
  }
};

export const getHistoricalSentiment = async (): Promise<SentimentPoint[]> => {
  const cacheKey = 'historical_sentiment';
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < INSIGHTS_CACHE_TTL) {
    return cached.data;
  }

  // Simulate an API call with randomized but trending data
  await new Promise(resolve => setTimeout(resolve, 500));
  const points: SentimentPoint[] = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(now.getDate() - i);
    points.push({
      date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      score: 40 + Math.floor(Math.random() * 40) // 40-80 range
    });
  }
  cache.set(cacheKey, { data: points, timestamp: Date.now() });
  return points;
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
  const cacheKey = `quote_${from}_${to}_${amount}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < QUOTE_CACHE_TTL) {
    return cached.data;
  }

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
    const data = JSON.parse(response.text);
    cache.set(cacheKey, { data, timestamp: Date.now() });
    return data;
  } catch (e) {
    console.error("Gemini swap quote failed, using local mock", e);
    // Rough mock logic
    const mockRatio = from === 'ETH' ? 2840 : (from === 'USDC' ? 0.00035 : 1);
    const out = (parseFloat(amount) * mockRatio).toFixed(4);
    const fallback = {
      outputAmount: out,
      priceImpact: "0.15%",
      route: "Aerodrome (Direct)",
      fee: "0.0001 ETH"
    };
    return fallback;
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
