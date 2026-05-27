import mongoose, { Schema, Document } from 'mongoose';

export type EventStatus = 'draft' | 'published' | 'live' | 'ended';

export interface IEvent extends Document {
  ownerId: mongoose.Types.ObjectId;
  slug: string;
  djName: string;
  eventName: string;
  tagline: string;
  genre: string;
  date: Date;
  startTime: string;
  endTime: string;
  timezone: string;
  venue: string;
  address: string;
  coverInfo: string;
  ticketLink: string;
  instagramLink: string;
  heroImageUrl: string;
  status: EventStatus;
  createdAt: Date;
  updatedAt: Date;
}

const EventSchema = new Schema<IEvent>(
  {
    ownerId:       { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    slug:          { type: String, required: true, unique: true, lowercase: true, trim: true },
    djName:        { type: String, required: true },
    eventName:     { type: String, required: true },
    tagline:       { type: String, default: '' },
    genre:         { type: String, default: '' },
    date:          { type: Date,   required: true },
    startTime:     { type: String, required: true },
    endTime:       { type: String, required: true },
    timezone:      { type: String, default: 'America/Toronto' },
    venue:         { type: String, required: true },
    address:       { type: String, default: '' },
    coverInfo:     { type: String, default: '' },
    ticketLink:    { type: String, default: '' },
    instagramLink: { type: String, default: '' },
    heroImageUrl:  { type: String, default: '' },
    status:        { type: String, enum: ['draft', 'published', 'live', 'ended'], default: 'draft' },
  },
  { timestamps: true }
);

EventSchema.virtual('isLive').get(function isLive() {
  return this.status === 'live';
});

EventSchema.set('toJSON', { virtuals: true });
EventSchema.set('toObject', { virtuals: true });

export default mongoose.model<IEvent>('Event', EventSchema);
