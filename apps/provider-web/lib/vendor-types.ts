/** Minimal unified request row from `GET .../unified-requests/realtime/vendor/me`. */
export type VendorJob = {
  id: string;
  tenantId: string;
  vendorId?: string;
  type: string;
  status: 'pending' | 'assigned' | 'in_progress' | 'completed';
  createdAt: string;
  updatedAt: string;
  propertyIds?: string[];
  primaryPropertyId?: string;
};
