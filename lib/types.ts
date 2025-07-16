export interface FirestoreApplication {
  id: string;
  accommodations: string;
  bigProblem: string;
  createdAt: string;
  desiredRoles: string;
  dietary_restrictions: string;
  hackathonCount: number;
  interestingProject: string;
  motivation: string;
  referralSource: string;
  resume: string;
  updatedAt: string;
  score?: number;
  evaluationNotes?: string;
  list_teammates?: string;
}

export interface FirestoreUser {
  id: string;
  admin: boolean;
  createdAt: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  dateOfBirth: string;
  date_of_birth: string;
  education: string;
  email: string;
  firstName: string;
  first_name: string;
  genderIdentity: string;
  gender_identity: string;
  github: string;
  grade: number | null;
  lastName: string;
  last_name: string;
  linkedin: string;
  portfolio: string;
  preferredName: string;
  school: string;
  status: string;
  updatedAt: string;
  year: number;
}

/**
 * Mentor type of user.
 */
export interface FirestoreMentor {
  id: string;
  email: string;
  name: string;
  mentor: boolean;
  specialization: string;
  availableMentorings: AvailableMentoring[];
}

export interface AvailableMentoring {
  startTime: number;
  endTime: number;
  location: string;
}

/**
 * Define appointment booked by hackers for a mentor. Related to collection `mentorships`.
 */
export interface MentorshipAppointment {
  id: string;
  startTime: number;
  endTime: number;
  mentorId: string;
  hackerId: string; // a hacker book for one team
  hackerDescription: string; // inquiry needed by hacker
}

/**
 * Graded applications are applications that have been scored.
 * This category is exclusive to the admin portal, and is not recorded in the DB.
 */
export enum APPLICATION_STATUS {
  NOT_APPLICABLE = "not applicable",
  DRAFT = "draft",
  SUBMITTED = "submitted",
  GRADED = "graded",
  WAITLISTED = "waitlisted",
  REJECTED = "rejected",
  ACCEPTED = "accepted",
  CONFIRMED_RSVP = "confirmed rsvp",
}

export interface CombinedApplicationData {
  id: string;
  accommodations: string;
  bigProblem: string;
  desiredRoles: string;
  dietary_restrictions: string;
  hackathonCount: number;
  interestingProject: string;
  motivation: string;
  referralSource: string;
  resume: string;
  applicationCreatedAt: string;
  applicationUpdatedAt: string;
  firstName: string;
  lastName: string;
  preferredName: string;
  email: string;
  education: string;
  school: string;
  github: string;
  linkedin: string;
  portfolio: string;
  year: number;
  date_of_birth: string;
  gender_identity: string;
  status: string;
  userCreatedAt: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  userUpdatedAt: string;
  score?: number;
  evaluationNotes?: string;
  evaluationStatus?: "pending" | "approved" | "rejected";
  list_teammates?: string;
}

export interface PortalConfig {
  applicationCloseDate: Date;
  applicationReleaseDate: Date;
  applicationStartDate: Date;
  applicationsOpen: boolean;
  hackathonEndDate: Date;
  hackathonStartDate: Date;
  maxApplicationEvaluationScore: number;
}

export interface Question {
  id: string;
  order: number;
  placeholder: string;
  state: string;
  text: string;
  type: string;
  validation: {
    maxLength?: number;
    required?: boolean;
  };
}
