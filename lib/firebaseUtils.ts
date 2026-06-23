import {
  collection,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  query,
  Timestamp,
  where,
  orderBy,
  addDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db, auth, storage } from "./firebase";
import {
  FirestoreApplication,
  FirestoreUser,
  CombinedApplicationData,
  PortalConfig,
  FirestoreMentor,
  MentorshipAppointment,
  APPLICATION_STATUS,
} from "./types";
import { ONE_SLOT_INTERVAL_MINUTES } from "@/config";
import { getDownloadURL, ref } from "firebase/storage";

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
          status: user.status || 'not applicable',
          applicationCreatedAt: application.createdAt,
          applicationUpdatedAt: application.updatedAt,
          userCreatedAt: user.createdAt,
          userUpdatedAt: user.updatedAt,

          // Profile
          firstName: user.firstName,
          lastName: user.lastName,
          genderIdentity: user.genderIdentity,
          dateOfBirth: user.dateOfBirth,
          nationality: user.nationality,
          countryOfResidence: user.countryOfResidence,
          preferredLanguage: user.preferredLanguage,
          currentOccupation: user.currentOccupation,
          occupationPlace: user.occupationPlace,
          occupationDetail: user.occupationDetail,
          universityYear: user.universityYear,
          email: user.email,
          phone: user.phone,

          // Team
          teamFormation: application.teamFormation,
          teamName: application.teamName,
          teamMembers: application.teamMembers,
          interestedTrack: application.interestedTrack,

          // Speed Dating
          primaryRole: application.primaryRole,
          roleProficiency: application.roleProficiency,
          toolsUsed: application.toolsUsed,
          pastProjects: application.pastProjects,

          // Application
          resume: application.resume,
          github: application.github,
          linkedin: application.linkedin,
          devpost: application.devpost,
          qDreamCreation: application.qDreamCreation,
          qProudestMoment: application.qProudestMoment,
          qWhyGarudaHacks: application.qWhyGarudaHacks,

          // Logistical
          overnightPlan: application.overnightPlan,
          leaveLetter: application.leaveLetter,

          // Emergency & Consent
          phoneEmergency: application.phoneEmergency,
          emergencyWays: application.emergencyWays,
          emergencyRelation: application.emergencyRelation,
          signedConsent: application.signedConsent,
          referralCode: application.referralCode,

          // Additional
          hackathonCount: application.hackathonCount,
          ghCount: application.ghCount,
          joinSource: application.joinSource,
          referralSource: application.referralSource,
          joinReason: application.joinReason,

          // Evaluation
          score: application.score || null,
          evaluationNotes: application.evaluationNotes || null,

          // Retry
          retryCount: application.retryCount || 0,
        } as CombinedApplicationData;
      })
      .filter((item): item is CombinedApplicationData => item !== null);

    return combinedData;

  } catch {
    throw new Error('Failed to fetch applications with users');
  }
}

/**
 * Formats a Firestore Timestamp or ISO string to human-readable format (e.g., "Jan 15, 2024")
 */
export function formatApplicationDate(value: any): string { // eslint-disable-line @typescript-eslint/no-explicit-any
  try {
    const date = value?.toDate ? value.toDate() : new Date(value);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return String(value);
  }
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
export async function updateUserStatus(userId: string, status: APPLICATION_STATUS.ACCEPTED | APPLICATION_STATUS.REJECTED): Promise<boolean> {
  try {
    const userRef = doc(db, 'users', userId);
    if (status === APPLICATION_STATUS.ACCEPTED) {
      await updateDoc(userRef, { status, acceptedAt: serverTimestamp() });
    } else if (status === APPLICATION_STATUS.REJECTED) {
      await updateDoc(userRef, { status, acceptedAt: serverTimestamp() });
    }
    console.debug(`User ${userId} status updated to: ${status}`);
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

    const updateData: { score: number; evaluationNotes?: string; updatedAt: ReturnType<typeof serverTimestamp> } = {
      score,
      updatedAt: serverTimestamp()
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
 * Resets a user's status to NOT_APPLICABLE and increments the application's retryCount by 1.
 */
export async function resetApplicationStatus(userId: string): Promise<boolean> {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, { status: 'not applicable' });

    const applicationRef = doc(db, 'applications', userId);
    const applicationSnap = await getDoc(applicationRef);
    const currentRetryCount = applicationSnap.exists() ? (applicationSnap.data().retryCount || 0) : 0;
    await updateDoc(applicationRef, { retryCount: currentRetryCount + 1 });

    return true;
  } catch (error) {
    console.error(`Error resetting application status for ${userId}:`, error);
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
      acceptanceEmailSentAt: serverTimestamp()
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
  } catch (error){
    throw new Error(`Error when trying to fetch mentors: ${error}`);
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
    const mentorshipRef = collection(db, 'mentorships');

    const firebaseQuery = query(
      mentorshipRef,
      where('mentorId', '==', mentorId),
      orderBy('startTime', 'asc')
    );
    const querySnapshot = await getDocs(firebaseQuery);

    const users: MentorshipAppointment[] = [];
    querySnapshot.forEach((doc) => {
      users.push({
        id: doc.id,
        ...doc.data()
      } as MentorshipAppointment);
    });

    return users;
  } catch (error) {
    console.log("Error", error)
    throw new Error('Failed to fetch mentors');
  }
}

/**
 * Add mentorship appointment.
 */
export async function addMentorshipAppointment(startDate: number, mentorId: string, location: string) {
  try {
    var endDate = startDate + (ONE_SLOT_INTERVAL_MINUTES * 60)
    var mentorshipAppointment: MentorshipAppointment = {
      startTime: startDate,
      endTime: endDate,
      mentorId: mentorId,
      location: location
    }
    const mentorshipRef = collection(db, 'mentorships');
    const docRef = await addDoc(mentorshipRef, mentorshipAppointment)
    return docRef.id
  } catch (error) {
    console.log(error)
    throw new Error('Failed to add a new mentorship appointment slot')
  }
}

/**
 * Delete mentorship slot.
 */
export async function deleteMentorshipAppointment(mentorshipId: string) {
  try {
    const docRef = doc(db, 'mentorships', mentorshipId);
    await deleteDoc(docRef);
    return true
  } catch (error) {
    console.error(error)
    throw new Error('Error when deleting a mentorship appointment')
  }
}

/**
 * Fetch mentor image
 */
export async function getMentorProfilePicture(mentor_name: string) {
  try{
    const imageRef = ref(storage, `/mentors/${mentor_name}.png`)
    const url = await getDownloadURL(imageRef)
    return url
  } catch (error) {
    return ''
  }
}