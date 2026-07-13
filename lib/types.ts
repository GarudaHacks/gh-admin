export interface FirestoreApplication {
  id: string;
  createdAt: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  updatedAt: any; // eslint-disable-line @typescript-eslint/no-explicit-any

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
  allergies?: string;
  dietaryRestrictions?: string;
  medicalConditions?: string;
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

  // Retry
  retryCount?: number;
}

export interface FirestoreUser {
  id: string;
  admin: boolean;
  createdAt: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  updatedAt: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  acceptedAt?: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  rejectedAt?: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  confirmedRsvpAt?: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  status: string;

  // Dispensation (leave) letter. The PDF is created by
  // scripts/generate-leave-letters.mjs (which stamps leaveLetterGeneratedAt) and
  // emailed from the Mailing page (which stamps leaveLetterSentAt on each send).
  leaveLetterUrl?: string;
  leaveLetterGeneratedAt?: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  leaveLetterSentAt?: any; // eslint-disable-line @typescript-eslint/no-explicit-any

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
  mentor: boolean;
  email: string;
  displayName: string;
  mentorTitle: string;
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
  hackerId?: string | null; // a hacker book for the whole team
  hackerDescription?: string; // desc given needed by hacker
  location: string;
  isBooked?: boolean;
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
  CANCELED = "canceled"
}

export interface TeamFormation {
  id: string; // doc id
  createdAt: any // eslint-disable-line @typescript-eslint/no-explicit-any
  updatedAt: any // eslint-disable-line @typescript-eslint/no-explicit-any
  updatedBy: string // "system" or staff email
  teamName: string
  version: string // marking which event iteration this data belong to, e.g. "7.0"
  members: string[] // list uid
}

/**
 * A team in the live `teams` collection (created through the portal's Speed
 * Dating / matching flow). Distinct from `formations`, which the admin curates.
 */
export interface FirestoreTeam {
  id: string; // doc id
  members: string[]; // list of member uids (includes the leader)
  leader?: string; // uid of the team leader
  name?: string; // team name
}

/**
 * A physical table in the venue (the `tables` collection). Teams (formations)
 * are seated here: each formation the table holds is referenced by id in
 * `formations`. A table normally holds one formation; holding more than one
 * means different teams share it.
 */
export interface FirestoreTable {
  id: string; // doc id
  createdAt: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  updatedAt: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  updatedBy: string; // "system" or staff email
  capacity: number; // number of seats
  formations: string[]; // formation (team) ids seated at this table
  location: string; // room / area name, grouped in the layout
  tableNumber: number; // human-facing table number
}

export interface CombinedApplicationData {
  id: string;
  status: string;
  applicationCreatedAt: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  applicationUpdatedAt: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  userCreatedAt: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  userUpdatedAt: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  acceptedAt?: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  rejectedAt?: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  confirmedRsvpAt?: any; // eslint-disable-line @typescript-eslint/no-explicit-any

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
  allergies?: string;
  dietaryRestrictions?: string;
  medicalConditions?: string;
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

  // Retry
  retryCount?: number;
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

export interface MatchConfig {
  isMatchOpen: boolean
  startDate: Date
  endDate: Date
}

export interface MentorshipConfig {
  isMentorshipOpen: boolean
  startDate: Date
  endDate: Date
}