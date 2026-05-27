import mongoose, { Schema, Document } from 'mongoose';

export type UserRole = 'dj' | 'admin';

export interface IUser extends Document {
  email: string;
  passwordHash: string;
  displayName: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email:        { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    displayName:  { type: String, required: true },
    role:         { type: String, enum: ['dj', 'admin'], default: 'dj' },
  },
  { timestamps: true }
);

export default mongoose.model<IUser>('User', UserSchema);
