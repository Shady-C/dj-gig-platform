import mongoose, { Schema, Document } from 'mongoose';

export type RequestStatus = 'pending' | 'approved' | 'played' | 'rejected';

export interface ISongRequest extends Document {
  eventId: mongoose.Types.ObjectId;
  song: string;
  artist: string;
  album: string;
  artworkUrl: string;
  duration: string;
  itunesTrackId: number;
  voteCount: number;
  status: RequestStatus;
  requestedBySessionId: string;
  requestedAt: Date;
}

const SongRequestSchema = new Schema<ISongRequest>({
  eventId:       { type: Schema.Types.ObjectId, ref: 'Event', required: true, index: true },
  song:          { type: String, required: true },
  artist:        { type: String, required: true },
  album:         { type: String, default: '' },
  artworkUrl:    { type: String, default: '' },
  duration:      { type: String, default: '' },
  itunesTrackId: { type: Number, required: true },
  voteCount:     { type: Number, default: 1 },
  status:        { type: String, enum: ['pending', 'approved', 'played', 'rejected'], default: 'pending' },
  requestedBySessionId: { type: String, required: true },
  requestedAt:   { type: Date, default: Date.now },
});

SongRequestSchema.index({ eventId: 1, itunesTrackId: 1 }, { unique: true });

SongRequestSchema.virtual('votes').get(function votes() {
  return this.voteCount;
});

SongRequestSchema.set('toJSON', { virtuals: true });
SongRequestSchema.set('toObject', { virtuals: true });

export default mongoose.model<ISongRequest>('SongRequest', SongRequestSchema);
