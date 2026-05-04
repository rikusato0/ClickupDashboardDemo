import mongoose from 'mongoose'

const ClientSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    domain: { type: String, default: '' },
    segment: { type: String, default: '' },
    clickUpSpaceId: { type: String, required: true },
    clickUpFolderId: { type: String, default: '' },
    clickUpListId: { type: String, default: '' },
    accountManagerStaffId: { type: String, default: '' },
    openTaskCount: { type: Number, default: 0 },
    engagementCode: { type: String, default: '' },
    emailDomains: { type: [String], default: [] },
  },
  { timestamps: true },
)

export const ClientModel =
  mongoose.models.Client || mongoose.model('Client', ClientSchema)

const StaffSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    initials: { type: String, default: '' },
    email: { type: String, default: '' },
  },
  { timestamps: true },
)

export const StaffModel =
  mongoose.models.Staff || mongoose.model('Staff', StaffSchema)

const TimeEntrySchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    date: { type: String, required: true, index: true },
    staffId: { type: String, required: true, index: true },
    clientId: { type: String, required: true, index: true },
    taskType: { type: String, required: true },
    hours: { type: Number, required: true },
    description: { type: String, default: '' },
    clickUpTaskId: { type: String, default: '' },
    clickUpTaskName: { type: String, default: '' },
  },
  { timestamps: true },
)

TimeEntrySchema.index({ date: 1, staffId: 1 })

export const TimeEntryModel =
  mongoose.models.TimeEntry || mongoose.model('TimeEntry', TimeEntrySchema)

const EmailMessageSchema = new mongoose.Schema(
  {
    messageId: { type: String, required: true, unique: true },
    threadId: { type: String, required: true, index: true },
    internalDate: { type: Date, required: true, index: true },
    fromEmail: { type: String, default: '' },
    fromName: { type: String, default: '' },
    toEmails: { type: [String], default: [] },
    subject: { type: String, default: '' },
    snippet: { type: String, default: '' },
    staffId: { type: String, default: '' },
    clientId: { type: String, default: '', index: true },
    isInbound: { type: Boolean, default: false },
    labelIds: { type: [String], default: [] },
  },
  { timestamps: true },
)

EmailMessageSchema.index({ threadId: 1, internalDate: 1 })

export const EmailMessageModel =
  mongoose.models.EmailMessage ||
  mongoose.model('EmailMessage', EmailMessageSchema)

const ThreadInsightSchema = new mongoose.Schema(
  {
    threadId: { type: String, required: true, unique: true, index: true },
    clientId: { type: String, default: '' },
    category: { type: String, default: 'Ad hoc requests' },
    sentiment: { type: Number, default: 0 },
    summary: { type: String, default: '' },
    analyzedAt: { type: Date, default: Date.now },
    model: { type: String, default: '' },
  },
  { timestamps: true },
)

export const ThreadInsightModel =
  mongoose.models.ThreadInsight ||
  mongoose.model('ThreadInsight', ThreadInsightSchema)

const CalendarEventSchema = new mongoose.Schema(
  {
    eventId: { type: String, required: true },
    staffId: { type: String, required: true, index: true },
    staffEmail: { type: String, required: true },
    start: { type: Date, required: true, index: true },
    end: { type: Date, required: true },
    summary: { type: String, default: '' },
    htmlLink: { type: String, default: '' },
    zoomJoinUrl: { type: String, default: '' },
    attendeeEmails: { type: [String], default: [] },
    clientHint: { type: String, default: '' },
  },
  { timestamps: true },
)

CalendarEventSchema.index({ eventId: 1, staffEmail: 1 }, { unique: true })

export const CalendarEventModel =
  mongoose.models.CalendarEvent ||
  mongoose.model('CalendarEvent', CalendarEventSchema)

const ZoomTranscriptSchema = new mongoose.Schema(
  {
    meetingUuid: { type: String, required: true, unique: true },
    topic: { type: String, default: '' },
    startTime: { type: Date },
    hostEmail: { type: String, default: '' },
    participantEmails: { type: [String], default: [] },
    transcriptText: { type: String, default: '' },
    clientId: { type: String, default: '' },
    rawPayload: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true },
)

export const ZoomTranscriptModel =
  mongoose.models.ZoomTranscript ||
  mongoose.model('ZoomTranscript', ZoomTranscriptSchema)

const SyncStateSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    lastRunAt: { type: Date },
    lastHistoryId: { type: String, default: '' },
    meta: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true },
)

export const SyncStateModel =
  mongoose.models.SyncState || mongoose.model('SyncState', SyncStateSchema)
