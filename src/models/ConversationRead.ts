import mongoose, { Document, Schema } from 'mongoose';

export interface IConversationRead {
  _id: mongoose.Types.ObjectId;
  conversationId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  lastReadAt: Date;
  updatedAt: Date;
}

export type ConversationReadDocument = IConversationRead & Document;

const ConversationReadSchema = new Schema<IConversationRead>(
  {
    conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    lastReadAt: { type: Date, required: true },
  },
  { timestamps: true }
);

ConversationReadSchema.index({ conversationId: 1, userId: 1 }, { unique: true });

export const ConversationReadModel = mongoose.model<IConversationRead>(
  'ConversationRead',
  ConversationReadSchema
);
