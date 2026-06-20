export interface FirestoreApplication {
  id: string;
  createdAt: string;
  updatedAt: string;

  // Team
  teamFormation: string;
  teamName: string;
  teamMembers?: string;
  interestedTrack: string;

  // Speed Dating
  primaryRole: string;
  roleProficiency: string;
  toolsUsed: string;
  pastProjects?: string;

  // Application
  resume: string;
  github?: string;
  linkedin?: string;
  devpost?: string;
  qDreamCreation: string;
  qProudestMoment: string;
  qWhyGarudaHacks: string;

  // Logistical
  overnightPlan: string;
  leaveLetter: string;

  // Emergency & Consent
  phoneEmergency: string;
  emergencyWays: string;
  emergencyRelation: string;
  signedConsent: string;
  referralCode?: string;

  // Additional
  hackathonCount: string;
  ghCount: string[];
  joinSource: string[];
  referralSource: string;
  joinReason: string;

  // Evaluation
  score?: number;
  evaluationNotes?: string;
}

export interface FirestoreUser {
  id: string;
  admin: boolean;
  createdAt: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  updatedAt: string;
  status: string;

  // Profile
  firstName: string;
  lastName: string;
  genderIdentity: string;
  dateOfBirth: string;
  nationality: string;
  countryOfResidence: string;
  preferredLanguage: string;
  currentOccupation: string;
  occupationPlace: string;
  occupationDetail: string;
  universityYear?: string;
  email: string;
  phone: string;
}

/**
 * Mentor type of user.
 */
export interface FirestoreMentor {
  id?: string;
  email: string;
  name: string;
  mentor: boolean;
  specialization: string;
  discordUsername: string;
  intro: string; // introduction given by mentor
}

/**
 * Define appointment booked by hackers for a mentor. Related to collection `mentorships`.
 */
export interface MentorshipAppointment {
  id?: string;
  startTime: number;
  endTime: number;
  mentorId: string;
  hackerId?: string; // a hacker book for the whole team
  hackerDescription?: string; // desc given needed by hacker
  location: string;
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
  status: string;
  applicationCreatedAt: string;
  applicationUpdatedAt: string;
  userCreatedAt: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  userUpdatedAt: string;

  // Profile (from users)
  firstName: string;
  lastName: string;
  genderIdentity: string;
  dateOfBirth: string;
  nationality: string;
  countryOfResidence: string;
  preferredLanguage: string;
  currentOccupation: string;
  occupationPlace: string;
  occupationDetail: string;
  universityYear?: string;
  email: string;
  phone: string;

  // Team (from applications)
  teamFormation: string;
  teamName: string;
  teamMembers?: string;
  interestedTrack: string;

  // Speed Dating (from applications)
  primaryRole: string;
  roleProficiency: string;
  toolsUsed: string;
  pastProjects?: string;

  // Application (from applications)
  resume: string;
  github?: string;
  linkedin?: string;
  devpost?: string;
  qDreamCreation: string;
  qProudestMoment: string;
  qWhyGarudaHacks: string;

  // Logistical (from applications)
  overnightPlan: string;
  leaveLetter: string;

  // Emergency & Consent (from applications)
  phoneEmergency: string;
  emergencyWays: string;
  emergencyRelation: string;
  signedConsent: string;
  referralCode?: string;

  // Additional (from applications)
  hackathonCount: string;
  ghCount: string[];
  joinSource: string[];
  referralSource: string;
  joinReason: string;

  // Evaluation
  score?: number;
  evaluationNotes?: string;
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

