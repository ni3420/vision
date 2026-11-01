import mongoose, { Schema, Document } from "mongoose"

export interface MessageType {
  role: "user" | "assistant" | "system"
  content: string
  createdAt?: Date
}

export interface ConversationType extends Document {
  userId: string
  sessionId: string
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