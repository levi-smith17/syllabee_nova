// ── API Response ──────────────────────────────────────────
export interface ApiResponse<T = unknown> {
  statusCode: number
  data?: T
  error?: string
}

// ── User ──────────────────────────────────────────────────
export interface User {
  id: string
  email: string
  name: string | null
  isAdmin?: boolean
  status?: string
  createdAt: string | null
}

// ── Term ──────────────────────────────────────────────────
export interface Term {
  pk: string
  sk: 'METADATA'
  name: string
  numWeeks: number
  startDate: string
  endDate: string
  hasBreak: boolean
  hasMidpointBreak: boolean
  supportsMasterSyllabi: boolean
  archived: boolean
}

// ── Course ────────────────────────────────────────────────
export interface Course {
  pk: string
  sk: 'METADATA'
  prefix: string
  number: string
  name: string
  totalCreditHours: number
  classCreditHours: number
  labCreditHours: number
  creditHourRatioName: string
  creditHourRatioClass: number
  creditHourRatioLab: number
  inactive: boolean
  futureName?: string
  ownerId: string
}

// ── Section ───────────────────────────────────────────────
export interface Section {
  pk: string
  sk: string
  instructorId: string
  format: string
  masterSyllabusId?: string
  archived: boolean
  ownerId: string
  legacyHash?: string
}

// ── Block ─────────────────────────────────────────────────
export type BlockType =
  | 'content_block'
  | 'details_block'
  | 'file_block'
  | 'grade_determination_block'
  | 'list_block'
  | 'schedule_block'
  | 'table_block'
  | 'video_block'
  | 'response_block'

export interface Block {
  pk: string
  sk: 'METADATA'
  name: string
  type: BlockType
  ownerId: string
  printHeading: boolean
  printGroup?: string
  published: boolean
  permalink?: string
  effectiveTerm?: string
  content: Record<string, unknown>
}

// ── Segment ───────────────────────────────────────────────
export interface Segment {
  pk: string
  sk: 'METADATA'
  name: string
  description?: string
  printHeading: boolean
  printingOptional: boolean
  effectiveTerm?: string
  ownerId: string
}

// ── MasterSyllabus ────────────────────────────────────────
export interface MasterSyllabus {
  pk: string
  sk: 'METADATA'
  id: string
  title: string
  termCode?: string
  officeHours?: string
  interactiveView: boolean
  timeout: number
  prohibitBacktracking: boolean
  maxAttempts: number
  maxPoints: number
  randomizeResponses: boolean
  pointsLadder: boolean
  pointsLadderDeduction: number
  locked: boolean
  ownerId: string
  createdAt: string
}

export interface SyllabusSegment {
  id: string
  syllabusId: string
  name: string
  description?: string
  printHeading: number
  printingOptional: boolean
  isVisible: boolean
  sortOrder: number
  effectiveTerm?: string
  sections?: string[]
}

export interface EditorSection {
  id: string
  courseId: string
  courseCode: string
  termId: string
  termCode: string
  sectionCode: string
  meetingDays?: string | null
  meetingTime?: string | null
}

export interface SyllabusBlock {
  id: string
  syllabusId: string
  segmentId: string
  type: BlockType
  name: string
  isVisible: boolean
  sortOrder: number
  printHeading: number
  content: Record<string, unknown>
  published: boolean
  permalink?: string
}

export interface SyllabusDetail {
  syllabus: MasterSyllabus
  segments: (SyllabusSegment & { blocks: SyllabusBlock[] })[]
}

export interface GradingScale {
  id: string
  name: string
  ownerId: string
  createdAt: string
  grades: GradingScaleGrade[]
}

export interface GradingScaleGrade {
  id: string
  scaleId: string
  letter: string
  minPercent: number
  maxPercent: number
}

// ── Student Progress ──────────────────────────────────────
export interface SectionProgress {
  pk: string
  sk: 'METADATA'
  masterSyllabusId: string
  startTime?: string
  stopTime?: string
  progress: number
  completed: boolean
  points: number
  ltiLaunchId?: string
}

// ── Internship ────────────────────────────────────────────
export type InternshipStatus = 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'WITHDRAWN'

export interface Internship {
  pk: string
  sk: 'METADATA'
  id: string
  studentId: string
  studentName: string
  studentEmail: string
  sectionId?: string
  status: InternshipStatus
  startDate?: string
  endDate?: string
  completedHours: number
  createdAt: string
  createdBy: string
}

export interface InternshipLocation {
  pk: string
  sk: string
  id: string
  employerName: string
  address?: string
  city?: string
  state?: string
  zip?: string
  supervisorName?: string
  supervisorEmail?: string
  supervisorPhone?: string
  validated: boolean
  createdAt: string
}

export interface InternshipJournalEntry {
  pk: string
  sk: string
  id: string
  locationId?: string
  title: string
  description: string
  date: string
  timeStart: string
  timeEnd: string
  totalMinutes: number
  verified: boolean
  createdAt: string
}

export interface InternshipSettings {
  pk: 'SETTINGS'
  sk: 'INTERNSHIP'
  requiredHours: number
  journalPoints: number
}

// ── Branding ──────────────────────────────────────────────
export interface Branding {
  institution: string
  coreValues?: string
  backgroundImageKey?: string
}

// ── QuickLink ─────────────────────────────────────────────
export interface QuickLink {
  pk: string
  sk: string
  name: string
  link: string
  target: string
  restricted: boolean
}