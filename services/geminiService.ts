
import { GoogleGenAI, Type } from "@google/genai";
import { AIInsight, SentimentPoint, CandleData } from "../types";

let ai: GoogleGenAI | null = null;
let lastApiKey: string | null = null;

const getClient = () => {
  const runtimeKey = (typeof localStorage !== 'undefined' ? localStorage.getItem('GEMINI_API_KEY') : null) ||
    process.env.GEMINI_API_KEY ||
    process.env.API_KEY;
  if (!runtimeKey) return null;
  if (!ai || runtimeKey !== lastApiKey) {
    ai = new GoogleGenAI({ apiKey: runtimeKey });
    lastApiKey = runtimeKey;
  }
  return ai;
};

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

export const getHistoricalPriceData = async (timeframe: string): Promise<CandleData[]> => {
  const cacheKey = `price_history_${timeframe}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < INSIGHTS_CACHE_TTL) {
    return cached.data;
  }

  await new Promise(resolve => setTimeout(resolve, 800));
  const data: CandleData[] = [];
  let basePrice = 2800;
  const count = timeframe === '1D' ? 24 : timeframe === '7D' ? 28 : timeframe === '1M' ? 30 : 52;
  
  for (let i = 0; i < count; i++) {
    const open = basePrice + (Math.random() - 0.5) * 50;
    const close = open + (Math.random() - 0.5) * 40;
    const high = Math.max(open, close) + Math.random() * 20;
    const low = Math.min(open, close) - Math.random() * 20;
    const volume = 500000 + Math.random() * 1000000;
    
    let timeLabel = "";
    if (timeframe === '1D') timeLabel = `${i}:00`;
    else if (timeframe === '7D') timeLabel = `Day ${Math.floor(i/4)}`;
    else if (timeframe === '1M') timeLabel = `Day ${i + 1}`;
    else timeLabel = `Week ${i + 1}`;

    data.push({ time: timeLabel, open, close, high, low, volume });
    basePrice = close;
  }
  
  cache.set(cacheKey, { data, timestamp: Date.now() });
  return data;
};

export const getMarketInsights = async (marketData: any): Promise<AIInsight | null> => {
  const cacheKey = `insights_${JSON.stringify(marketData.map((t: any) => t.symbol))}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < INSIGHTS_CACHE_TTL) {
    return cached.data;
  }

  const client = getClient();
  if (!client) {
    return null;
  }

  try {
    const response = await callWithRetry(() => client.models.generateContent({
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
    console.error("Gemini failed to fetch insights", e);
    return null;
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
  const client = getClient();
  if (!client) {
    return '';
  }

  try {
    const response = await callWithRetry(() => client.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Generate a catchy, high-engagement marketing description for a new Base chain token named ${name} ($${symbol}). It should sound like it was launched on Clanker or Farcaster. Max 80 characters.`,
    }));
    return response.text;
  } catch (e) {
    return '';
  }
};

export const getSwapQuote = async (from: string, to: string, amount: string) => {
  const cacheKey = `quote_${from}_${to}_${amount}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < QUOTE_CACHE_TTL) {
    return cached.data;
  }

  const client = getClient();
  if (!client) {
    return null;
  }

  try {
    const response = await callWithRetry(() => client.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Simulate a live swap quote for ${amount} ${from} to ${to} on Base chain. Include price impact, network fee, slippage, and a mock route.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            outputAmount: { type: Type.STRING },
            priceImpact: { type: Type.STRING },
            route: { type: Type.STRING },
            fee: { type: Type.STRING },
            slippage: { type: Type.STRING },
            networkFeeUsd: { type: Type.STRING }
          },
          required: ["outputAmount", "priceImpact", "route", "fee", "slippage", "networkFeeUsd"]
        }
      }
    }));
    const data = JSON.parse(response.text);
    cache.set(cacheKey, { data, timestamp: Date.now() });
    return data;
  } catch (e) {
    console.error("Gemini swap quote failed", e);
    return null;
  }
};

export const fetchTokenMetadata = async (address: string) => {
  const client = getClient();
  if (!client) {
    return null;
  }

  try {
    const response = await callWithRetry(() => client.models.generateContent({
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
    return null;
  }
};
