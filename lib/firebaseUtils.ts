import {
  collection,
  getDocs,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  DocumentData,
  Timestamp,
} from "firebase/firestore";
import { db, auth } from "./firebase";
import {
  FirestoreApplication,
  FirestoreUser,
  APPLICATION_STATUS,
  CombinedApplicationData,
  PortalConfig,
} from "./types";

export { APPLICATION_STATUS } from "./types";
export type { CombinedApplicationData } from "./types";

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
export async function fetchAllUsers(): Promise<FirestoreUser[]> {
  try {
    const usersRef = collection(db, 'users');
    const querySnapshot = await getDocs(usersRef);
    
    const users: FirestoreUser[] = [];
    querySnapshot.forEach((doc) => {
      users.push({
        id: doc.id,
        ...doc.data()
      } as FirestoreUser);
    });
    
    return users;
  } catch (error) {
    console.error('Error fetching users:', error);
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
      console.warn(`User with ID ${userId} not found`);
      return null;
    }
  } catch (error) {
    console.error(`Error fetching user ${userId}:`, error);
    return null;
  }
}

/**
 * Combines application data with corresponding user data for evaluation interface
 */
export async function fetchApplicationsWithUsers(): Promise<CombinedApplicationData[]> {
  try {
    console.log('Fetching applications and users...');
    
    const [applications, users] = await Promise.all([
      fetchAllApplications(),
      fetchAllUsers()
    ]);
    
    console.log(`Fetched ${applications.length} applications and ${users.length} users`);
    
    // Create a map of users by ID for efficient lookup
    const usersMap = new Map<string, FirestoreUser>();
    users.forEach(user => {
      usersMap.set(user.id, user);
    });
    
    // Combine applications with their corresponding users
    const combinedData: CombinedApplicationData[] = applications
      .map(application => {
        const user = usersMap.get(application.id);
        
        if (!user) {
          console.warn(`No user found for application ID: ${application.id}`);
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
          evaluationStatus: 'pending'
        } as CombinedApplicationData;
      })
      .filter((item): item is CombinedApplicationData => item !== null);

      console.log(combinedData);
    
    console.log(`Successfully combined ${combinedData.length} applications with users`);
    return combinedData;
    
  } catch (error) {
    console.error('Error fetching applications with users:', error);
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
  } catch (error) {
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
      console.warn('Portal config document not found');
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
    };

    return config;
    
  } catch (error) {
    console.error('Error fetching portal config:', error);
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
    console.log('Portal config updated successfully');
    return true;
    
  } catch (error) {
    console.error('Error updating portal config:', error);
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



