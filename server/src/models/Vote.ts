import mongoose, { Schema, Document } from 'mongoose';

export interface IVote extends Document {
  eventId: mongoose.Types.ObjectId;
  songRequestId: mongoose.Types.ObjectId;
  sessionIdHash: string;
  ipHash: string;
  createdAt: Date;
}

const VoteSchema = new Schema<IVote>({
  eventId:        { type: Schema.Types.ObjectId, ref: 'Event', required: true, index: true },
  songRequestId:  { type: Schema.Types.ObjectId, ref: 'SongRequest', required: true, index: true },
  sessionIdHash:  { type: String, required: true },
  ipHash:         { type: String, required: true },
  createdAt:      { type: Date, default: Date.now },
});

VoteSchema.index({ songRequestId: 1, sessionIdHash: 1 }, { unique: true });

export default mongoose.model<IVote>('Vote', VoteSchema);
