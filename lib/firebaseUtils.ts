import {
  collection,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  query,
  orderBy,
  Timestamp,
  where,
} from "firebase/firestore";
import { db, auth } from "./firebase";
import {
  FirestoreApplication,
  FirestoreUser,
  CombinedApplicationData,
  PortalConfig,
  Question,
  FirestoreMentor,
  MentorshipAppointment,
} from "./types";

export { APPLICATION_STATUS } from "./types";
export type { CombinedApplicationData } from "./types";

// Cache for questions to avoid repeated Firebase calls
let questionsCache: Map<string, Question> | null = null;

/**
 * Fetches all applications from Firestore, ordered by creation date (newest first)
 */
export async function fetchAllApplications(): Promise<FirestoreApplication[]> {
  try {
    const applicationsRef = collection(db, 'applications');
    const q = query(applicationsRef, orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);

    const applications: FirestoreApplication[] = [];
    querySnapshot.forEach((doc) => {
      applications.push({
        id: doc.id,
        ...doc.data()
      } as FirestoreApplication);
    });

    return applications;
  } catch (error) {
    console.error('Error fetching applications:', error);
    throw new Error('Failed to fetch applications');
  }
}

/**
 * Fetches all users from Firestore
 */
export async function fetchAllUsers(status?: string): Promise<FirestoreUser[]> {
  try {
    const usersRef = collection(db, 'users');
    const firebaseQuery = status ? query(usersRef, where('status', '==', status)) : usersRef;
    const querySnapshot = await getDocs(firebaseQuery);

    const users: FirestoreUser[] = [];
    querySnapshot.forEach((doc) => {
      users.push({
        id: doc.id,
        ...doc.data()
      } as FirestoreUser);
    });

    return users;
  } catch {
    throw new Error('Failed to fetch users');
  }
}

/**
 * Fetches a specific user by their ID
 */
export async function fetchUserById(userId: string): Promise<FirestoreUser | null> {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      return {
        id: userSnap.id,
        ...userSnap.data()
      } as FirestoreUser;
    } else {
      return null;
    }
  } catch {
    return null;
  }
}

/**
 * Combines application data with corresponding user data for evaluation interface
 */
export async function fetchApplicationsWithUsers(status?: string, minScore?: number): Promise<CombinedApplicationData[]> {
  try {
    let [applications, users] = await Promise.all([
      fetchAllApplications(),
      fetchAllUsers(status)
    ]);

    if (minScore !== undefined && minScore > 0) {
      applications = applications.filter(application => application.score !== undefined && application.score >= minScore);
    }

    applications.sort((a, b) => {
      if (a.score === undefined) {
        return 1;
      }
      if (b.score === undefined) {
        return -1;
      }
      return b.score - a.score;
    });

    const usersMap = new Map<string, FirestoreUser>();
    users.forEach(user => {
      usersMap.set(user.id, user);
    });

    const combinedData: CombinedApplicationData[] = applications
      .map(application => {
        const user = usersMap.get(application.id);

        if (!user) {
          return null;
        }

        return {
          id: application.id,
          accommodations: application.accommodations,
          bigProblem: application.bigProblem,
          desiredRoles: application.desiredRoles,
          dietary_restrictions: application.dietary_restrictions,
          hackathonCount: application.hackathonCount,
          interestingProject: application.interestingProject,
          motivation: application.motivation,
          referralSource: application.referralSource,
          resume: application.resume,
          applicationCreatedAt: application.createdAt,
          applicationUpdatedAt: application.updatedAt,
          score: application.score || null,
          evaluationNotes: application.evaluationNotes || null,
          firstName: user.firstName || user.first_name,
          lastName: user.lastName || user.last_name,
          preferredName: user.preferredName,
          email: user.email,
          education: user.education,
          school: user.school,
          github: user.github,
          linkedin: user.linkedin,
          portfolio: user.portfolio,
          year: user.year,
          date_of_birth: user.date_of_birth,
          gender_identity: user.gender_identity,
          status: user.status || 'not applicable',
          userCreatedAt: user.createdAt,
          userUpdatedAt: user.updatedAt,
          evaluationStatus: 'pending',
          list_teammates: application.list_teammates
        } as CombinedApplicationData;
      })
      .filter((item): item is CombinedApplicationData => item !== null);

    return combinedData;

  } catch {
    throw new Error('Failed to fetch applications with users');
  }
}

/**
 * Converts education level strings to readable display format
 */
export function getEducationLevel(education: string): string {
  const educationMap: { [key: string]: string } = {
    'High School / Equivalent': 'High School',
    'University / College (Undergraduate)': 'Undergraduate',
    'University / College (Graduate)': 'Graduate',
    'Other': 'Other'
  };

  return educationMap[education] || education;
}

/**
 * Formats date string to human-readable format (e.g., "Jan 15, 2024")
 */
export function formatApplicationDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return dateString;
  }
}

/**
 * Converts year number to ordinal string (e.g., 1 → "1st Year", 2 → "2nd Year")
 */
export function getYearSuffix(year: number): string {
  if (year === 1) return '1st Year';
  if (year === 2) return '2nd Year';
  if (year === 3) return '3rd Year';
  if (year >= 4) return `${year}th Year`;
  return `Year ${year}`;
}

/**
 * Retrieves portal configuration including application dates and status flags
 */
export async function getPortalConfig(): Promise<PortalConfig | null> {
  try {
    const configRef = doc(db, 'config', 'portalConfig');
    const configSnap = await getDoc(configRef);

    if (!configSnap.exists()) {
      return null;
    }

    const data = configSnap.data();

    const config: PortalConfig = {
      applicationCloseDate: data.applicationCloseDate.toDate(),
      applicationReleaseDate: data.applicationReleaseDate.toDate(),
      applicationStartDate: data.applicationStartDate.toDate(),
      applicationsOpen: Boolean(data.applicationsOpen),
      hackathonEndDate: data.hackathonEndDate.toDate(),
      hackathonStartDate: data.hackathonStartDate.toDate(),
      maxApplicationEvaluationScore: data.maxApplicationEvaluationScore,
    };

    return config;

  } catch {
    return null;
  }
}

/**
 * Updates portal configuration in Firestore
 * @param config - The portal configuration data to save
 */
export async function updatePortalConfig(config: PortalConfig): Promise<boolean> {
  try {
    const configRef = doc(db, 'config', 'portalConfig');

    // Convert Date objects to Firestore timestamps
    const firestoreData = {
      applicationCloseDate: Timestamp.fromDate(config.applicationCloseDate),
      applicationReleaseDate: Timestamp.fromDate(config.applicationReleaseDate),
      applicationStartDate: Timestamp.fromDate(config.applicationStartDate),
      applicationsOpen: config.applicationsOpen,
      hackathonEndDate: Timestamp.fromDate(config.hackathonEndDate),
      hackathonStartDate: Timestamp.fromDate(config.hackathonStartDate),
    };

    await updateDoc(configRef, firestoreData);
    return true;

  } catch {
    return false;
  }
}

/**
 * Updates a user's status in Firestore given their ID and new status
 */
export async function updateUserStatus(userId: string, status: string): Promise<boolean> {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, { status, acceptedAt: new Date });
    console.log(`User ${userId} status updated to: ${status}`);
    return true;
  } catch (error) {
    console.error(`Error updating user ${userId} status:`, error);
    return false;
  }
}

/**
 * Updates an application's score and evaluation notes in Firestore
 * @param applicationId - The ID of the application to update
 * @param score - The numerical score (0-20)
 * @param evaluationNotes - Optional evaluation notes
 */
export async function updateApplicationScore(
  applicationId: string,
  score: number,
  evaluationNotes?: string
): Promise<boolean> {
  try {
    const applicationRef = doc(db, 'applications', applicationId);

    const updateData: { score: number; evaluationNotes?: string; updatedAt: string } = {
      score,
      updatedAt: new Date().toISOString()
    };

    if (evaluationNotes && evaluationNotes.trim() !== '') {
      updateData.evaluationNotes = evaluationNotes.trim();
    }

    await updateDoc(applicationRef, updateData);
    return true;
  } catch {
    return false;
  }
}

/**
 * Debug utility to log current authentication token details
 * @deprecated TODO: Remove after testing
 */
export async function debugAuthToken() {
  const user = auth.currentUser;
  if (user) {
    console.log('Current user email:', user.email);
    console.log('Email verified:', user.emailVerified);
    try {
      const token = await user.getIdTokenResult();
      console.log('Auth token claims:', token.claims);
      console.log('Token email:', token.claims.email);
      console.log('Token email_verified:', token.claims.email_verified);
    } catch (error) {
      console.error('Error getting token:', error);
    }
  } else {
    console.log('No user signed in');
  }
}

/**
 * Fetches all questions from Firestore and caches them
 */
export async function fetchQuestions(): Promise<Map<string, Question>> {
  if (questionsCache) {
    return questionsCache;
  }

  try {
    const questionsRef = collection(db, 'questions');
    const querySnapshot = await getDocs(questionsRef);

    const questions = new Map<string, Question>();
    querySnapshot.forEach((doc) => {
      questions.set(doc.id, {
        id: doc.id,
        ...doc.data()
      } as Question);
    });

    questionsCache = questions;
    return questions;
  } catch (error) {
    console.error('Error fetching questions:', error);
    return new Map();
  }
}

/**
 * Gets question text by ID, with fallback to formatted ID if not found
 */
export async function getQuestionText(questionId: string): Promise<string> {
  try {
    const questions = await fetchQuestions();
    const question = questions.get(questionId);

    if (question) {
      return question.text;
    }

    // Fallback: format the ID as a readable title
    return formatQuestionId(questionId);
  } catch (error) {
    console.error(`Error getting question text for ${questionId}:`, error);
    return formatQuestionId(questionId);
  }
}

/**
 * Formats question ID as a readable title (fallback)
 */
function formatQuestionId(questionId: string): string {
  return questionId
    .replace(/([A-Z])/g, ' $1') // Add space before capital letters
    .replace(/^./, str => str.toUpperCase()) // Capitalize first letter
    .trim();
}

/**
 * Change an application's status in Firestore
 */
export async function updateApplicationStatus(userId: string, status: string): Promise<boolean> {
  try {
    const applicationRef = doc(db, 'users', userId);
    const updatedData = {
      status: status,
      acceptedAt: new Date().toISOString()
    };
    await updateDoc(applicationRef, updatedData);
    return true;
  } catch (error) {
    console.error(`Error updating application status for ${userId}:`, error);
    return false;
  }
}

/**
 * Change an application's acceptance email bool in Firestore
 */
export async function updateApplicationAcceptanceEmail(userId: string): Promise<boolean> {
  try {
    const applicationRef = doc(db, 'users', userId);
    const updatedData = {
      acceptanceEmailSent: true,
      acceptanceEmailSentAt: new Date().toISOString()
    };
    await updateDoc(applicationRef, updatedData);
    return true;
  } catch (error) {
    console.error(`Error updating application acceptance email for ${userId}:`, error);
    return false;
  }
}

/**
 * Fetch list of mentors from database.
 */
export async function fetchMentors(): Promise<FirestoreMentor[]> {
  try {
    const usersRef = collection(db, 'users');
    const firebaseQuery = query(usersRef, where('mentor', '==', true));
    const querySnapshot = await getDocs(firebaseQuery);

    const users: FirestoreMentor[] = [];
    querySnapshot.forEach((doc) => {
      users.push({
        id: doc.id,
        ...doc.data()
      } as FirestoreMentor);
    });

    return users;
  } catch {
    throw new Error('Failed to fetch mentors');
  }
}

/**
 * Fetch mentor from db provided user id.
 */
export async function fetchMentorById(uid: string): Promise<FirestoreMentor | null> {
  try {
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      return {
        id: userSnap.id,
        ...userSnap.data()
      } as FirestoreMentor;
    } else {
      return null;
    }
  } catch {
    return null;
  }
}

/**
 * Fetch booked mentorship schedules.
 */
export async function fetchMentorshipAppointmentsByMentorId(mentorId: string) {
  try {
    const usersRef = collection(db, 'mentorships');
    const firebaseQuery = query(usersRef, where('mentorId', '==', mentorId));
    const querySnapshot = await getDocs(firebaseQuery);

    const users: MentorshipAppointment[] = [];
    querySnapshot.forEach((doc) => {
      users.push({
        id: doc.id,
        ...doc.data()
      } as MentorshipAppointment);
    });

    return users;
  } catch {
    throw new Error('Failed to fetch mentors');
  }
}