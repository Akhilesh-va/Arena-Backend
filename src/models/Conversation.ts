import mongoose, { Document, Schema } from 'mongoose';

export interface IConversation {
  _id: mongoose.Types.ObjectId;
  participants: mongoose.Types.ObjectId[];
  lastMessageAt?: Date;
  lastMessageText?: string;
  lastMessageSenderId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export type ConversationDocument = IConversation & Document;

const ConversationSchema = new Schema<IConversation>(
  {
    participants: [{ type: Schema.Types.ObjectId, ref: 'User', required: true }],
    lastMessageAt: { type: Date },
    lastMessageText: { type: String },
    lastMessageSenderId: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

ConversationSchema.index({ participants: 1 });
ConversationSchema.index({ lastMessageAt: -1 });

export const ConversationModel = mongoose.model<IConversation>('Conversation', ConversationSchema);
