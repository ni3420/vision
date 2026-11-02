import mongoose, { Schema, Document } from "mongoose"

export interface MessageType {
  role: "user" | "assistant" | "system"
  content: string
  createdAt?: Date
  provider?: string
  model?: string
  mock?: boolean
}

export interface ConversationType extends Document {
  userId: string
  sessionId: string
  title?: string
  messages: MessageType[]
  createdAt: Date
  updatedAt: Date
}

const MessageSchema = new Schema<MessageType>({
  role: {
    type: String,
    enum: ["user", "assistant", "system"],
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  provider: {
    type: String,
  },
  model: {
    type: String,
  },
  mock: {
    type: Boolean,
  },
})

const ConversationSchema = new Schema<ConversationType>(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    sessionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    title: {
      type: String,
    },
    messages: {
      type: [MessageSchema],
      default: [],
    },
  },
  { timestamps: true }
)

export const Conversation =
  mongoose.models.Conversation ||
  mongoose.model<ConversationType>("Conversation", ConversationSchema)
