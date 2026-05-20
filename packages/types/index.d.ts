export interface ApiResponse<T = unknown> {
    statusCode: number;
    data?: T;
    error?: string;
}
export interface User {
    id: string;
    email: string;
    name: string | null;
    role: 'ADMIN' | 'INSTRUCTOR';
    status: string;
    createdAt: string;
}
export interface Term {
    pk: string;
    sk: 'METADATA';
    name: string;
    numWeeks: number;
    startDate: string;
    endDate: string;
    hasBreak: boolean;
    hasMidpointBreak: boolean;
    supportsMasterSyllabi: boolean;
    archived: boolean;
}
export interface Course {
    pk: string;
    sk: 'METADATA';
    prefix: string;
    number: string;
    name: string;
    totalCreditHours: number;
    classCreditHours: number;
    labCreditHours: number;
    creditHourRatioName: string;
    creditHourRatioClass: number;
    creditHourRatioLab: number;
    inactive: boolean;
    futureName?: string;
    ownerId: string;
}
export interface Section {
    pk: string;
    sk: string;
    instructorId: string;
    format: string;
    masterSyllabusId?: string;
    archived: boolean;
    ownerId: string;
    legacyHash?: string;
}
export type BlockType = 'content_block' | 'details_block' | 'file_block' | 'course_syllabus_block' | 'grade_determination_block' | 'list_block' | 'schedule_block' | 'table_block' | 'video_block' | 'response_block';
export interface Block {
    pk: string;
    sk: 'METADATA';
    name: string;
    type: BlockType;
    ownerId: string;
    printHeading: boolean;
    printGroup?: string;
    published: boolean;
    permalink?: string;
    effectiveTerm?: string;
    content: Record<string, unknown>;
}
export interface Segment {
    pk: string;
    sk: 'METADATA';
    name: string;
    description?: string;
    printHeading: boolean;
    printingOptional: boolean;
    effectiveTerm?: string;
    ownerId: string;
}
export interface MasterSyllabus {
    pk: string;
    sk: 'METADATA';
    termCode: string;
    officeHours?: string;
    interactiveView: boolean;
    timeout: number;
    prohibitBacktracking: boolean;
    maxAttempts: number;
    maxPoints: number;
    randomizeResponses: boolean;
    pointsLadder: boolean;
    pointsLadderDeduction: number;
    locked: boolean;
    ownerId: string;
}
export interface SectionProgress {
    pk: string;
    sk: 'METADATA';
    masterSyllabusId: string;
    startTime?: string;
    stopTime?: string;
    progress: number;
    completed: boolean;
    points: number;
    ltiLaunchId?: string;
}
export interface Internship {
    pk: string;
    sk: 'METADATA';
    sectionId: string;
    studentId: string;
    completedHours: number;
}
export interface Branding {
    institution: string;
    coreValues?: string;
    backgroundImageKey?: string;
}
export interface QuickLink {
    pk: string;
    sk: string;
    name: string;
    link: string;
    target: string;
    restricted: boolean;
}
//# sourceMappingURL=index.d.ts.map