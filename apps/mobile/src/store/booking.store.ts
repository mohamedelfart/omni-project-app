import { create } from 'zustand';

import { LocalProperty } from '../data/local-properties';

export type BookingStatus = 'requested' | 'confirmed' | 'completed';

export type PropertyBooking = {
  id: string;
  propertyId: string;
  propertyTitle: string;
  propertyLocation: string;
  propertyImage: string;
  date: string;
  time: string;
  status: BookingStatus;
  createdAtIso: string;
};

type BookingStoreState = {
  bookings: PropertyBooking[];
  createBooking: (params: { property: LocalProperty; date: string; time: string }) => PropertyBooking;
  updateBookingStatus: (bookingId: string, status: BookingStatus) => void;
};

export const useBookingStore = create<BookingStoreState>((set) => ({
  bookings: [],
  createBooking: ({ property, date, time }) => {
    const booking: PropertyBooking = {
      id: `b-${property.id}-${Date.now()}`,
      propertyId: property.id,
      propertyTitle: property.title,
      propertyLocation: property.location,
      propertyImage: property.images[0] ?? '',
      date,
      time,
      status: 'requested',
      createdAtIso: new Date().toISOString(),
    };

    set((state) => ({ bookings: [booking, ...state.bookings] }));
    return booking;
  },
  updateBookingStatus: (bookingId, status) => {
    set((state) => ({
      bookings: state.bookings.map((booking) =>
        booking.id === bookingId ? { ...booking, status } : booking,
      ),
    }));
  },
}));
