import OpenAI from "openai";

/**
 * Reusable Weather lookup tool.
 * Queries wttr.in for real-time weather.
 */
export async function getWeather(location: string): Promise<string> {
  try {
    const res = await fetch(`https://wttr.in/${encodeURIComponent(location.toLowerCase())}?format=%C+%t`);
    if (!res.ok) throw new Error("wttr.in status not ok");
    const data = await res.text();
    return JSON.stringify({ location, weatherInfo: data.trim() });
  } catch (error: any) {
    return JSON.stringify({ error: `Not able to find weather for this ${location}` });
  }
}

/**
 * Reusable YouTube Search lookup tool.
 * Queries official YouTube API snippet endpoint.
 */
export async function getYouTubeVideosData(channelName: string, topic: string): Promise<string> {
  try {
    const API_KEY = process.env.YOUTUBE_API_KEY || process.env.YT_API;
    if (!API_KEY) {
      return JSON.stringify({ error: "YouTube API key is not configured on the server." });
    }
    const search = `${channelName} ${topic} tutorial`;
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=3&q=${encodeURIComponent(search)}&type=video&key=${API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`YouTube API error: ${res.status}`);
    const data = await res.json();
    const videos = data.items?.map((item: any) => ({
      title: item.snippet.title,
      link: `https://www.youtube.com/watch?v=${item.id.videoId}`,
      thumbnail: item.snippet.thumbnails?.medium?.url
    })) || [];
    return JSON.stringify({ topic, videos });
  } catch (error: any) {
    console.error("YouTube API Error:", error.message);
    return JSON.stringify({
      error: `Could not find YouTube videos for ${topic}`,
    });
  }
}

/**
 * Reusable safe calculator tool.
 */
export function safeCalculate(expression: string): string {
  // Only allow digits, whitespace, and basic math operators/parentheses.
  if (!/^[\d\s+\-*/().]+$/.test(expression)) {
    return "Error: expression contains disallowed characters.";
  }
  try {
    // eslint-disable-next-line no-new-func
    const result = Function(`"use strict"; return (${expression})`)();
    return String(result);
  } catch {
    return "Error: could not evaluate expression.";
  }
}

/**
 * Tool definitions shared by the Tool Calling and Workflow Agent demos.
 * Add a new tool by: (1) describing it here, (2) adding its implementation
 * to `toolImplementations`. Nothing else needs to change.
 */
export const toolDefinitions: OpenAI.Chat.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "get_weather",
      description: "Get the current weather for a given city.",
      parameters: {
        type: "object",
        properties: {
          city: { type: "string", description: "City name, e.g. 'Mumbai'" },
        },
        required: ["city"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "calculate",
      description: "Evaluate a basic arithmetic expression.",
      parameters: {
        type: "object",
        properties: {
          expression: { type: "string", description: "e.g. '(12 + 8) * 3'" },
        },
        required: ["expression"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_youtube_videos",
      description: "Suggest YouTube videos for a topic from a channel.",
      parameters: {
        type: "object",
        properties: {
          channelName: { type: "string", description: "YouTube Channel Name" },
          topic: { type: "string", description: "Search Topic" },
        },
        required: ["channelName", "topic"],
      },
    },
  },
];

/** Implementations, keyed by the same names declared in `toolDefinitions`. */
export const toolImplementations: Record<string, (args: any) => Promise<string> | string> = {
  get_weather: async ({ city }: { city: string }) => getWeather(city),
  calculate: ({ expression }: { expression: string }) => safeCalculate(expression),
  get_youtube_videos: async ({ channelName, topic }: { channelName: string; topic: string }) =>
    getYouTubeVideosData(channelName, topic),
};

export async function runTool(name: string, args: any): Promise<string> {
  const impl = toolImplementations[name];
  if (!impl) return `Error: unknown tool "${name}".`;
  return impl(args);
}

import { tool } from "ai";
import { z } from "zod";

export const webSearchTool = tool({
  description: "Search the web for real-time information. Use this when the user asks about current events, recent news, live data, or anything you don't have knowledge about.",
  inputSchema: z.object({
    query: z.string().describe("The search query to look up on the web"),
  }),
  execute: async ({ query }) => {
    const apiKey = process.env.TAVILY_API_KEY;
    if (!apiKey) {
      return { error: "Web search is not configured.", results: [] };
    }

    try {
      const res = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          api_key: apiKey,
          query: query,
          search_depth: "basic",
          max_results: 5,
        }),
      });

      if (!res.ok) {
        throw new Error(`Tavily API error: ${res.status}`);
      }

      const data = await res.json();
      const results = (data.results || []).map((r: any) => ({
        title: r.title,
        url: r.url,
        description: r.content,
      }));

      return { query, results, resultCount: results.length };
    } catch (error: any) {
      console.error("Tavily search error:", error.message);
      return { error: `Search failed: ${error.message}`, results: [] };
    }
  },
});

