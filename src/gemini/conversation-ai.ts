import { ai, model } from "./gemini";

interface MessagePayload {
  role: "user" | "model" | "assistant";
  content: string;
}

export async function generateConversationReply(
  messagesHistory: MessagePayload[],
  userMessage: string
): Promise<string> {
  try {
    // 1. Format history to match expected Gemini schema ({ role, parts: [{ text }] })
    const formattedHistory = messagesHistory.map((msg) => ({
      role: msg.role === "assistant" ? "model" : msg.role,
      parts: [{ text: msg.content }],
    }));

    // 2. Initialize a chat session with prior conversation history
    const chat = ai.chats.create({
      model: model,
      history: formattedHistory,
    });

    // 3. Send the new user message to the active chat session
    const result = await chat.sendMessage({
      message: userMessage,
    });

    return result.text ?? "No response generated from model.";
  } catch (error: any) {
    console.error("Gemini Reply Generation Error:", error.message);
    throw new Error("Failed to generate response from AI model");
  }
}