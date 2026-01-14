
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getMarketInsights = async (marketData: any) => {
  const response = await ai.models.generateContent({
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
  });

  return JSON.parse(response.text);
};

export const generateTokenDescription = async (name: string, symbol: string) => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Generate a catchy, high-engagement marketing description for a new Base chain token named ${name} ($${symbol}). It should sound like it was launched on Clanker or Farcaster. Max 80 characters.`,
  });
  return response.text;
};

export const getSwapQuote = async (from: string, to: string, amount: string) => {
  const response = await ai.models.generateContent({
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
  });
  return JSON.parse(response.text);
};

export const fetchTokenMetadata = async (address: string) => {
  const response = await ai.models.generateContent({
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
  });
  return JSON.parse(response.text);
};
