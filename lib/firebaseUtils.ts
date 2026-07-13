import {
  collection,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  setDoc,
  query,
  Timestamp,
  where,
  orderBy,
  addDoc,
  deleteDoc,
  serverTimestamp,
  writeBatch,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";
import { db, auth, storage } from "./firebase";
import {
  FirestoreApplication,
  FirestoreUser,
  CombinedApplicationData,
  PortalConfig,
  MatchConfig,
  MentorshipConfig,
  FirestoreMentor,
  MentorshipAppointment,
  APPLICATION_STATUS,
  TeamFormation,
  FirestoreTeam,
  FirestoreTable,
} from "./types";
import { ONE_SLOT_INTERVAL_MINUTES } from "@/config";
import { getDownloadURL, ref } from "firebase/storage";

export { APPLICATION_STATUS } from "./types";
export type { CombinedApplicationData } from "./types";


/**
 * Normalizes a Firestore timestamp-ish value to milliseconds for sorting.
 * Handles Firestore Timestamp, { seconds }, Date, number, ISO string, and
 * missing/invalid values (which sort last via -Infinity).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toMillis(value: any): number {
  if (!value) return -Infinity;
  if (typeof value.toMillis === "function") return value.toMillis();
  if (typeof value.seconds === "number") return value.seconds * 1000;
  if (value instanceof Date) return value.getTime();
  if (typeof value === "number") return value;
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? -Infinity : parsed;
}

/**
 * Fetches all applications from Firestore, ordered by creation date (newest first)
 */
export async function fetchAllApplications(): Promise<FirestoreApplication[]> {
  try {
    const applicationsRef = collection(db, 'applications');
    // Note: we intentionally do NOT use Firestore orderBy('createdAt') here.
    // Firestore silently excludes documents that are missing the orderBy field,
    // which would hide applications without a createdAt. Fetch everything and
    // sort client-side instead, pushing docs without createdAt to the end.
    const querySnapshot = await getDocs(applicationsRef);

    const applications: FirestoreApplication[] = [];
    querySnapshot.forEach((doc) => {
      applications.push({
        id: doc.id,
        ...doc.data()
      } as FirestoreApplication);
    });

    applications.sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));

    return applications;
  } catch (error) {
    console.error('Error fetching applications:', error);
    throw new Error('Failed to fetch applications');
  }
}

/**
 * Fetches all team formations from the `formations` collection, sorted
 * alphabetically by team name (teams without a name sort last).
 */
export async function fetchAllFormations(): Promise<TeamFormation[]> {
  try {
    const formationsRef = collection(db, 'formations');
    const querySnapshot = await getDocs(formationsRef);

    const formations: TeamFormation[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      formations.push({
        id: doc.id,
        ...data,
        members: Array.isArray(data.members) ? data.members : [],
      } as TeamFormation);
    });

    formations.sort((a, b) =>
      (a.teamName || '￿').localeCompare(b.teamName || '￿')
    );

    return formations;
  } catch (error) {
    console.error('Error fetching formations:', error);
    throw new Error('Failed to fetch formations');
  }
}

// Event iteration this admin writes formations for. Matches the import scripts.
export const FORMATION_VERSION = "7.0";

/**
 * Creates a new (empty) team in the `formations` collection. The doc id is
 * auto-generated and mirrored into the `id` field, matching the shape written
 * by scripts/import-formations.mjs. Returns the created team with local
 * timestamps for immediate display (real server timestamps land on next reload).
 */
export async function createFormation(
  teamName: string,
  updatedBy: string
): Promise<TeamFormation> {
  const ref = doc(collection(db, 'formations'));
  await setDoc(ref, {
    id: ref.id,
    members: [],
    teamName,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    updatedBy,
    version: FORMATION_VERSION,
  });

  return {
    id: ref.id,
    members: [],
    teamName,
    createdAt: new Date(),
    updatedAt: new Date(),
    updatedBy,
    version: FORMATION_VERSION,
  };
}

/**
 * Adds a member UID to a team (no-op if already present). Refreshes
 * updatedAt / updatedBy. The caller ensures the team is not already full and
 * that the user isn't already on another team (use moveFormationMember for that).
 */
export async function addFormationMember(
  teamId: string,
  uid: string,
  updatedBy: string
): Promise<boolean> {
  try {
    await updateDoc(doc(db, 'formations', teamId), {
      members: arrayUnion(uid),
      updatedAt: serverTimestamp(),
      updatedBy,
    });
    return true;
  } catch (error) {
    console.error('Error adding formation member:', error);
    return false;
  }
}

/**
 * Moves a member UID out of one team and into another in a single atomic batch.
 * Both teams get their `updatedAt`/`updatedBy` refreshed. The caller is
 * responsible for ensuring the destination team is not already full.
 */
export async function moveFormationMember(
  fromTeamId: string,
  toTeamId: string,
  uid: string,
  updatedBy: string
): Promise<boolean> {
  try {
    const batch = writeBatch(db);
    const fromRef = doc(db, 'formations', fromTeamId);
    const toRef = doc(db, 'formations', toTeamId);

    batch.update(fromRef, {
      members: arrayRemove(uid),
      updatedAt: serverTimestamp(),
      updatedBy,
    });
    batch.update(toRef, {
      members: arrayUnion(uid),
      updatedAt: serverTimestamp(),
      updatedBy,
    });

    await batch.commit();
    return true;
  } catch (error) {
    console.error('Error moving formation member:', error);
    return false;
  }
}

/**
 * Fetches all teams from the live `teams` collection (created via the portal's
 * Speed Dating / matching flow). Members arrays are normalized to always be an
 * array so callers can rely on `.includes`/`.length`.
 */
export async function fetchAllTeams(): Promise<FirestoreTeam[]> {
  try {
    const teamsRef = collection(db, 'teams');
    const querySnapshot = await getDocs(teamsRef);

    const teams: FirestoreTeam[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      teams.push({
        id: doc.id,
        ...data,
        members: Array.isArray(data.members) ? data.members : [],
      } as FirestoreTeam);
    });

    return teams;
  } catch (error) {
    console.error('Error fetching teams:', error);
    throw new Error('Failed to fetch teams');
  }
}

/**
 * Marks a Speed Dating applicant as having already found a team by rewriting
 * their application's `teamFormation` answer to the "already have a team"
 * option, so they drop out of the Speed Dating pool. Also stamps who/when for
 * an audit trail. `alreadyHaveTeamOption` is the exact option string from the
 * teamFormation question (passed in so the wording stays in sync with the form).
 */
export async function markApplicationFoundTeam(
  uid: string,
  updatedBy: string,
  alreadyHaveTeamOption: string
): Promise<boolean> {
  try {
    await updateDoc(doc(db, 'applications', uid), {
      teamFormation: alreadyHaveTeamOption,
      foundTeamMarkedBy: updatedBy,
      foundTeamMarkedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return true;
  } catch (error) {
    console.error('Error marking application as found team:', error);
    return false;
  }
}

/**
 * Deletes a team from the `formations` collection.
 */
export async function deleteFormation(teamId: string): Promise<boolean> {
  try {
    await deleteDoc(doc(db, 'formations', teamId));
    return true;
  } catch (error) {
    console.error('Error deleting formation:', error);
    return false;
  }
}

/**
 * Fetches all tables from the `tables` collection, sorted by location then
 * table number so the room layout renders in a stable order.
 */
export async function fetchAllTables(): Promise<FirestoreTable[]> {
  try {
    const tablesRef = collection(db, 'tables');
    const querySnapshot = await getDocs(tablesRef);

    const tables: FirestoreTable[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      tables.push({
        id: doc.id,
        ...data,
        formations: Array.isArray(data.formations) ? data.formations : [],
        capacity: Number(data.capacity) || 0,
        tableNumber: Number(data.tableNumber) || 0,
      } as FirestoreTable);
    });

    tables.sort(
      (a, b) =>
        (a.location || '').localeCompare(b.location || '') ||
        a.tableNumber - b.tableNumber
    );

    return tables;
  } catch (error) {
    console.error('Error fetching tables:', error);
    throw new Error('Failed to fetch tables');
  }
}

/**
 * Creates a new (empty) table in the `tables` collection. The doc id is
 * auto-generated. Returns the created table with local timestamps for
 * immediate display (real server timestamps land on next reload).
 */
export async function createTable(
  params: { location: string; capacity: number; tableNumber: number },
  updatedBy: string
): Promise<FirestoreTable> {
  const ref = doc(collection(db, 'tables'));
  const payload = {
    capacity: params.capacity,
    formations: [] as string[],
    location: params.location,
    tableNumber: params.tableNumber,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    updatedBy,
  };
  await setDoc(ref, payload);

  return {
    id: ref.id,
    ...payload,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Creates several empty tables in one atomic batch (used for bulk-adding a
 * numbered range). Each item becomes its own doc. Returns the created tables
 * with local timestamps for immediate display.
 */
export async function createTablesBulk(
  items: { location: string; capacity: number; tableNumber: number }[],
  updatedBy: string
): Promise<FirestoreTable[]> {
  const batch = writeBatch(db);
  const created: FirestoreTable[] = [];

  for (const item of items) {
    const ref = doc(collection(db, 'tables'));
    const payload = {
      capacity: item.capacity,
      formations: [] as string[],
      location: item.location,
      tableNumber: item.tableNumber,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      updatedBy,
    };
    batch.set(ref, payload);
    created.push({
      ...payload,
      id: ref.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  await batch.commit();
  return created;
}

/**
 * Assigns a formation (team) to a table by adding its id to `formations`
 * (no-op if already present). Refreshes updatedAt / updatedBy.
 */
export async function assignFormationToTable(
  tableId: string,
  formationId: string,
  updatedBy: string
): Promise<boolean> {
  try {
    await updateDoc(doc(db, 'tables', tableId), {
      formations: arrayUnion(formationId),
      updatedAt: serverTimestamp(),
      updatedBy,
    });
    return true;
  } catch (error) {
    console.error('Error assigning formation to table:', error);
    return false;
  }
}

/**
 * Removes a formation (team) from a table's `formations` array. Refreshes
 * updatedAt / updatedBy.
 */
export async function removeFormationFromTable(
  tableId: string,
  formationId: string,
  updatedBy: string
): Promise<boolean> {
  try {
    await updateDoc(doc(db, 'tables', tableId), {
      formations: arrayRemove(formationId),
      updatedAt: serverTimestamp(),
      updatedBy,
    });
    return true;
  } catch (error) {
    console.error('Error removing formation from table:', error);
    return false;
  }
}

/**
 * Moves a formation from one table to another in a single atomic batch (remove
 * from the source, add to the destination). Both tables get their
 * updatedAt / updatedBy refreshed. Caller ensures the destination has room.
 */
export async function moveFormationBetweenTables(
  fromTableId: string,
  toTableId: string,
  formationId: string,
  updatedBy: string
): Promise<boolean> {
  try {
    const batch = writeBatch(db);
    batch.update(doc(db, 'tables', fromTableId), {
      formations: arrayRemove(formationId),
      updatedAt: serverTimestamp(),
      updatedBy,
    });
    batch.update(doc(db, 'tables', toTableId), {
      formations: arrayUnion(formationId),
      updatedAt: serverTimestamp(),
      updatedBy,
    });
    await batch.commit();
    return true;
  } catch (error) {
    console.error('Error moving formation between tables:', error);
    return false;
  }
}

/**
 * Deletes a table from the `tables` collection.
 */
export async function deleteTable(tableId: string): Promise<boolean> {
  try {
    await deleteDoc(doc(db, 'tables', tableId));
    return true;
  } catch (error) {
    console.error('Error deleting table:', error);
    return false;
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
          acceptedAt: user.acceptedAt,
          rejectedAt: user.rejectedAt,
          confirmedRsvpAt: user.confirmedRsvpAt,

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
          allergies: application.allergies,
          dietaryRestrictions: application.dietaryRestrictions,
          medicalConditions: application.medicalConditions,
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
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
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
 * Retrieves team matching configuration
 */
export async function getMatchConfig(): Promise<MatchConfig | null> {
  try {
    const configRef = doc(db, 'config', 'matchConfig');
    const configSnap = await getDoc(configRef);

    if (!configSnap.exists()) {
      return null;
    }

    const data = configSnap.data();

    const config: MatchConfig = {
      isMatchOpen: Boolean(data.isMatchOpen),
      startDate: data.startDate.toDate(),
      endDate: data.endDate.toDate(),
    };

    return config;

  } catch {
    return null;
  }
}

/**
 * Creates or updates team matching configuration in Firestore
 * @param config - The match configuration data to save
 */
export async function updateMatchConfig(config: MatchConfig): Promise<boolean> {
  try {
    const configRef = doc(db, 'config', 'matchConfig');

    const firestoreData = {
      isMatchOpen: config.isMatchOpen,
      startDate: Timestamp.fromDate(config.startDate),
      endDate: Timestamp.fromDate(config.endDate),
    };

    await setDoc(configRef, firestoreData, { merge: true });
    return true;

  } catch {
    return false;
  }
}

/**
 * Retrieves mentorship configuration
 */
export async function getMentorshipConfig(): Promise<MentorshipConfig | null> {
  try {
    const configRef = doc(db, 'config', 'mentorshipConfig');
    const configSnap = await getDoc(configRef);

    if (!configSnap.exists()) {
      return null;
    }

    const data = configSnap.data();

    const config: MentorshipConfig = {
      isMentorshipOpen: Boolean(data.isMentorshipOpen),
      startDate: data.startDate.toDate(),
      endDate: data.endDate.toDate(),
    };

    return config;

  } catch {
    return null;
  }
}

/**
 * Creates or updates mentorship configuration in Firestore
 * @param config - The mentorship configuration data to save
 */
export async function updateMentorshipConfig(config: MentorshipConfig): Promise<boolean> {
  try {
    const configRef = doc(db, 'config', 'mentorshipConfig');

    const firestoreData = {
      isMentorshipOpen: config.isMentorshipOpen,
      startDate: Timestamp.fromDate(config.startDate),
      endDate: Timestamp.fromDate(config.endDate),
    };

    await setDoc(configRef, firestoreData, { merge: true });
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
      await updateDoc(userRef, { status, rejectedAt: serverTimestamp() });
    }
    console.debug(`User ${userId} status updated to: ${status}`);
    return true;
  } catch (error) {
    console.error(`Error updating user ${userId} status:`, error);
    return false;
  }
}

/**
 * Reverts a user's status one step backwards in the flow:
 * confirmed rsvp → accepted, accepted/rejected → submitted.
 */
export async function revertUserStatus(userId: string, currentStatus: string): Promise<boolean> {
  try {
    const userRef = doc(db, 'users', userId);
    let newStatus: string;

    if (currentStatus === APPLICATION_STATUS.CONFIRMED_RSVP) {
      newStatus = APPLICATION_STATUS.ACCEPTED;
    } else if (currentStatus === APPLICATION_STATUS.ACCEPTED || currentStatus === APPLICATION_STATUS.REJECTED) {
      newStatus = APPLICATION_STATUS.SUBMITTED;
    } else {
      return false;
    }

    await updateDoc(userRef, { status: newStatus });
    console.debug(`User ${userId} status reverted from ${currentStatus} to ${newStatus}`);
    return true;
  } catch (error) {
    console.error(`Error reverting user ${userId} status:`, error);
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
 * Marks that the results email (same template for accept/reject) was sent to a user in Firestore
 */
export async function updateApplicationResultEmail(userId: string): Promise<boolean> {
  try {
    const applicationRef = doc(db, 'users', userId);
    const updatedData = {
      resultEmailSent: true,
      resultEmailSentAt: serverTimestamp()
    };
    await updateDoc(applicationRef, updatedData);
    return true;
  } catch (error) {
    console.error(`Error updating application result email for ${userId}:`, error);
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

    const appointments: MentorshipAppointment[] = [];
    querySnapshot.forEach((doc) => {
      appointments.push({
        id: doc.id,
        ...doc.data()
      } as MentorshipAppointment);
    });

    return appointments;
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
      location: location,
      hackerId: null,
      isBooked: false
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