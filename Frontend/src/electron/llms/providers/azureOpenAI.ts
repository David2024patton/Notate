import { AzureOpenAI } from "openai";
import db from "../../db.js";
import { BrowserWindow } from "electron";
import { sendMessageChunk } from "../llmHelpers/sendMessageChunk.js";
import { truncateMessages } from "../llmHelpers/truncateMessages.js";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

let openai: AzureOpenAI;

async function initializeAzureOpenAI(
  baseURL: string,
  apiKey: string,
  model: string
) {
  openai = new AzureOpenAI({
    baseURL: baseURL,
    apiKey: apiKey,
    deployment: model,
    apiVersion: "2024-05-01-preview",
  });
}

export async function AzureOpenAIProvider(
  messages: Message[],
  activeUser: User,
  userSettings: UserSettings,
  prompt: string,
  conversationId: bigint | number,
  mainWindow: BrowserWindow | null = null,
  currentTitle: string,
  collectionId?: number,
  data?: {
    top_k: number;
    results: {
      content: string;
      metadata: string;
    }[];
  } | null,
  signal?: AbortSignal
) {
  if (!userSettings.selectedAzureId) {
    throw new Error("Azure OpenAI model not found for the active user");
  }
  const azureModel = db.getAzureOpenAIModel(
    activeUser.id,
    Number(userSettings.selectedAzureId)
  );
  if (!azureModel) {
    throw new Error("Azure OpenAI model not found for the active user");
  }

  await initializeAzureOpenAI(
    azureModel.endpoint,
    azureModel.api_key,
    azureModel.model
  );

  if (!openai) {
    throw new Error("Azure OpenAI instance not initialized");
  }

  const maxOutputTokens = (userSettings.maxTokens as number) || 4096;

  // Sort messages by timestamp to ensure proper chronological order
  const sortedMessages = [...messages].sort((a, b) => {
    const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
    const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
    return timeA - timeB; // Oldest first
  });

  // Add timestamp context to messages
  const newMessages: ChatCompletionMessageParam[] = sortedMessages.map(
    (msg, index) => {
      const isLastMessage = index === sortedMessages.length - 1;
      const timeStr = msg.timestamp
        ? new Date(msg.timestamp).toLocaleTimeString()
        : "";
      let content = msg.content;

      // Only add context to user messages
      if (msg.role === "user") {
        content = `[${timeStr}] ${content}${
          isLastMessage ? " (most recent message)" : ""
        }`;
      }

      return {
        role: msg.role as "user" | "assistant" | "system",
        content: content,
      };
    }
  );

  let dataCollectionInfo;
  if (collectionId) {
    dataCollectionInfo = db.getCollection(collectionId) as Collection;
  }

  let reasoning;
  if (userSettings.cot) {
    // Do reasoning first
    reasoning = await chainOfThought(
      newMessages,
      maxOutputTokens,
      userSettings,
      "", // Empty prompt for pure reasoning
      data ? data : null,
      dataCollectionInfo ? dataCollectionInfo : null,
      signal,
      mainWindow
    );

    // Send end of reasoning marker
    if (mainWindow) {
      mainWindow.webContents.send("reasoningEnd");
    }
  }

  const newSysPrompt: ChatCompletionMessageParam = {
    role: "system",
    content:
      prompt +
      (reasoning
        ? "\n\nUse this reasoning process to guide your response: " +
          reasoning +
          "\n\n"
        : "") +
      (data
        ? "The following is the data that the user has provided via their custom data collection: " +
          `\n\n${JSON.stringify(data)}` +
          `\n\nCollection/Store Name: ${dataCollectionInfo?.name}` +
          `\n\nCollection/Store Files: ${dataCollectionInfo?.files}` +
          `\n\nCollection/Store Description: ${dataCollectionInfo?.description}` +
          `\n\n*** THIS IS THE END OF THE DATA COLLECTION ***`
        : ""),
  };
  // Truncate messages to fit within token limits while preserving max output tokens
  const truncatedMessages = truncateMessages(newMessages, maxOutputTokens);
  truncatedMessages.unshift(newSysPrompt);
  const stream = await openai.chat.completions.create(
    {
      model: userSettings.model as string,
      messages: truncatedMessages,
      stream: true,
      temperature: Number(userSettings.temperature),
      max_tokens: Number(maxOutputTokens),
    },
    { signal }
  );

  const newMessage: Message = {
    role: "assistant",
    content: "",
    timestamp: new Date(),
    data_content: data ? JSON.stringify(data) : undefined,
  };

  try {
    for await (const chunk of stream) {
      if (signal?.aborted) {
        throw new Error("AbortError");
      }
      const content = chunk.choices[0]?.delta?.content || "";
      newMessage.content += content;
      sendMessageChunk(content, mainWindow);
    }

    if (mainWindow) {
      mainWindow.webContents.send("streamEnd");
    }

    return {
      id: conversationId,
      messages: [...messages, newMessage],
      title: currentTitle,
      content: newMessage.content,
      aborted: false,
    };
  } catch (error) {
    if (
      signal?.aborted ||
      (error instanceof Error && error.message === "AbortError")
    ) {
      return {
        id: conversationId,
        messages: messages,
        title: currentTitle,
        content: "",
        aborted: true,
      };
    }
    throw error;
  }
}

async function chainOfThought(
  messages: ChatCompletionMessageParam[],
  maxOutputTokens: number,
  userSettings: UserSettings,
  prompt: string,
  data: {
    top_k: number;
    results: {
      content: string;
      metadata: string;
    }[];
  } | null,
  dataCollectionInfo: Collection | null,
  signal?: AbortSignal,
  mainWindow: BrowserWindow | null = null
) {
  const sysPrompt: ChatCompletionMessageParam = {
    role: "system",
    content:
      "You are a reasoning engine. Your task is to analyze the question and outline your step-by-step reasoning process for how to answer it. Keep your reasoning concise and focused on the key logical steps. Only return the reasoning process, do not provide the final answer." +
      (data
        ? "The following is the data that the user has provided via their custom data collection: " +
          `\n\n${JSON.stringify(data)}` +
          `\n\nCollection/Store Name: ${dataCollectionInfo?.name}` +
          `\n\nCollection/Store Files: ${dataCollectionInfo?.files}` +
          `\n\nCollection/Store Description: ${dataCollectionInfo?.description}` +
          `\n\n*** THIS IS THE END OF THE DATA COLLECTION ***`
        : ""),
  };
  const truncatedMessages = truncateMessages(messages, maxOutputTokens);
  const newMessages = [sysPrompt, ...truncatedMessages];
  const reasoning = await openai.chat.completions.create(
    {
      model: userSettings.model as string,
      messages: newMessages,
      stream: true,
      temperature: Number(userSettings.temperature),
      max_tokens: Number(maxOutputTokens),
    },
    { signal }
  );

  let reasoningContent = "";
  for await (const chunk of reasoning) {
    if (signal?.aborted) {
      throw new Error("AbortError");
    }
    const content = chunk.choices[0]?.delta?.content || "";
    reasoningContent += content;
    sendMessageChunk("[REASONING]: " + content, mainWindow);
  }

  return reasoningContent;
}
