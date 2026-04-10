import { create } from 'zustand';

import { LocalProperty } from '../data/local-properties';

export type TicketStatus = 'pending' | 'accepted' | 'in_progress' | 'completed';

export type MaintenanceTicket = {
  id: string;
  tenantName: string;
  tenantPhone: string;
  serviceType: string;
  propertyId: string;
  propertyTitle: string;
  propertyAddress: string;
  propertyImage: string;
  coordinate: { latitude: number; longitude: number };
  status: TicketStatus;
  vendorName?: string;
  requestedDate: string;
  requestedTime: string;
  createdAtIso: string;
  acceptedAtIso?: string;
  inProgressAtIso?: string;
  completedAtIso?: string;
};

type TicketStoreState = {
  tickets: MaintenanceTicket[];
  createTicket: (params: {
    tenantName: string;
    tenantPhone: string;
    serviceType: string;
    property: LocalProperty;
    coordinate: { latitude: number; longitude: number };
    requestedDate: string;
    requestedTime: string;
  }) => MaintenanceTicket;
  acceptTicket: (ticketId: string, vendorName: string) => void;
  updateTicketStatus: (ticketId: string, status: TicketStatus) => void;
};

export const useTicketStore = create<TicketStoreState>((set) => ({
  tickets: [],
  createTicket: ({
    tenantName,
    tenantPhone,
    serviceType,
    property,
    coordinate,
    requestedDate,
    requestedTime,
  }) => {
    const createdAtIso = new Date().toISOString();
    const ticket: MaintenanceTicket = {
      id: `t-${property.id}-${Date.now()}`,
      tenantName,
      tenantPhone,
      serviceType,
      propertyId: property.id,
      propertyTitle: property.title,
      propertyAddress: property.location,
      propertyImage: property.images[0] ?? '',
      coordinate,
      status: 'pending',
      requestedDate,
      requestedTime,
      createdAtIso,
    };

    set((state) => ({ tickets: [ticket, ...state.tickets] }));
    return ticket;
  },
  acceptTicket: (ticketId, vendorName) => {
    const now = new Date().toISOString();
    set((state) => ({
      tickets: state.tickets.map((ticket) =>
        ticket.id === ticketId
          ? {
              ...ticket,
              status: 'accepted',
              vendorName,
              acceptedAtIso: now,
            }
          : ticket,
      ),
    }));
  },
  updateTicketStatus: (ticketId, status) => {
    const now = new Date().toISOString();
    set((state) => ({
      tickets: state.tickets.map((ticket) => {
        if (ticket.id !== ticketId) return ticket;

        if (status === 'in_progress') {
          return { ...ticket, status, inProgressAtIso: now };
        }

        if (status === 'completed') {
          return { ...ticket, status, completedAtIso: now };
        }

        return { ...ticket, status };
      }),
    }));
  },
}));

export function getTicketDurationMinutes(ticket: MaintenanceTicket) {
  if (!ticket.completedAtIso) return null;
  const start = new Date(ticket.createdAtIso).getTime();
  const end = new Date(ticket.completedAtIso).getTime();
  return Math.max(0, Math.round((end - start) / 60000));
}
