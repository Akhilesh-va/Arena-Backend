import mongoose, { Document, Schema } from 'mongoose';

export interface IUser {
  _id: mongoose.Types.ObjectId;
  email: string;
  passwordHash?: string;
  firebaseUid?: string;
  displayName: string;
  photoUrl?: string;
  /** Sign-up form: age (e.g. "16") */
  age?: string;
  /** Sign-up form: gender */
  gender?: string;
  /** Sign-up form: full phone with country code */
  phoneNumber?: string;
  /** Sign-up form: primary game (e.g. "BGMI") */
  primaryGame?: string;
  bio?: string;
  region?: string;
  tagline?: string;
  coverImageUrl?: string;
  username?: string;
  /** Portfolio achievements (title, description, gameName). */
  achievements?: Array<{ title: string; description?: string; gameName?: string }>;
  isEmailVerified: boolean;
  fcmTokens: string[];
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type UserDocument = IUser & Document;

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: false, select: false },
    firebaseUid: { type: String, required: false, sparse: true, unique: true },
    displayName: { type: String, required: true, trim: true },
    photoUrl: { type: String },
    age: { type: String, trim: true },
    gender: { type: String, trim: true },
    phoneNumber: { type: String, trim: true },
    primaryGame: { type: String, trim: true },
    bio: { type: String },
    region: { type: String },
    tagline: { type: String },
    coverImageUrl: { type: String },
    // Unique, optional username/handle (e.g. for search and profile URLs)
    username: { type: String, sparse: true, trim: true, unique: true },
    achievements: {
      type: [
        {
          title: { type: String, required: true },
          description: { type: String },
          gameName: { type: String },
        },
      ],
      default: undefined,
    },
    isEmailVerified: { type: Boolean, default: false },
    fcmTokens: { type: [String], default: [] },
    resetPasswordToken: { type: String, select: false },
    resetPasswordExpires: { type: Date, select: false },
  },
  { timestamps: true }
);

export const UserModel = mongoose.model<IUser>('User', UserSchema);
