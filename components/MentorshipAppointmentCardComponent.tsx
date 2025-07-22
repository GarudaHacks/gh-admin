'use client';

import { epochToStringDate } from '@/lib/helpers';
import { MentorshipAppointment } from '@/lib/types';
import Separator from './Separator';
import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import { doc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { deleteMentorshipAppointment } from '@/lib/firebaseUtils';
import { useRouter } from 'next/navigation';

interface MentorshipAppointmentCardComponentProps {
  mentorshipAppointment: MentorshipAppointment;
}

export default function MentorshipAppointmentCardComponent({
  mentorshipAppointment,
}: MentorshipAppointmentCardComponentProps) {
  const router = useRouter()
  const [deleteModalActive, setDeleteModalActive] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteAppointment = async () => {
    setIsDeleting(true);
    try {
      deleteMentorshipAppointment(mentorshipAppointment.id!).then((res) => {
        if (res) {
          window.location.reload()
        }
      })
    } catch (error) {
      console.error('Error deleting appointment:', error);
      alert('Failed to delete appointment');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="border bg-zinc-50/10 rounded-xl p-4 flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <div className='flex flex-row items-center gap-1'>
        {mentorshipAppointment.hackerId ? (
          <span className="border rounded-full py-1 px-2 text-xs bg-green-500">Booked</span>
        ) : (
          <span className="border rounded-full py-1 px-2 text-xs">Available</span>
        )}
        {mentorshipAppointment.location === 'online' ? (
          <span className="border rounded-full py-1 px-2 text-xs bg-yellow-700">Online</span>
        ) : (
          <span className="border rounded-full py-1 px-2 text-xs bg-blue-700">Offline</span>
        )}

        </div>
        <p className="text-end text-xs text-muted-foreground">
          Mentoring ID: {mentorshipAppointment.id}
        </p>
      </div>
      <div>
        {epochToStringDate(mentorshipAppointment.startTime)} -{' '}
        {epochToStringDate(mentorshipAppointment.endTime)}{' '}
        <span className="font-bold">
          ({(mentorshipAppointment.endTime - mentorshipAppointment.startTime) / 60}{' '}
          minutes)
        </span>
      </div>
      {mentorshipAppointment.hackerDescription && (
        <div className="text-sm flex flex-col gap-4">
          <p className="text-muted-foreground text-sm">Hacker's Inquiry:</p>
          <p>{mentorshipAppointment.hackerDescription}</p>
        </div>
      )}

      <div className="flex justify-end">
        <button
          onClick={() => setDeleteModalActive(true)}
          className="p-2 hover:bg-red-100 rounded-full"
          aria-label="Delete appointment"
          disabled={isDeleting}
        >
          <Trash2 className="text-red-500" />
        </button>
      </div>

      {/* Modal for confirmation */}
      {deleteModalActive && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-zinc-800/100 rounded-lg p-6 w-full max-w-md mx-4">
            <h2 className="text-lg font-semibold mb-4">Confirm Deletion</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Are you sure you want to delete this appointment? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-4">
              <button
                onClick={() => setDeleteModalActive(false)}
                className="px-4 py-2 rounded"
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAppointment}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}