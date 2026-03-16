import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type {
  User,
  Company,
  CompanyListResponse,
  Vendor,
  VendorListResponse,
  VendorCreateResponse,
} from '@/types';

// ── Users ────────────────────────────────────────────
export function useCurrentUser() {
  return useQuery({
    queryKey: ['users', 'me'],
    queryFn: async () => {
      const { data } = await api.get<User>('/api/v1/users/me');
      return data;
    },
  });
}

export function useUsers(params?: {
  skip?: number;
  limit?: number;
  company_id?: string;
  role?: string;
  is_active?: boolean;
  search?: string;
}) {
  return useQuery({
    queryKey: ['users', params],
    queryFn: async () => {
      const { data } = await api.get<{ items: User[]; total: number }>('/api/v1/users', { params });
      return data;
    },
  });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const { data } = await api.post<User>('/api/v1/users', payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: { id: string } & Record<string, unknown>) => {
      const { data } = await api.patch<User>(`/api/v1/users/${id}`, payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/v1/users/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

// ── Companies ────────────────────────────────────────
export function useCompanies(params?: { skip?: number; limit?: number; status?: string; search?: string }) {
  return useQuery({
    queryKey: ['companies', params],
    queryFn: async () => {
      const { data } = await api.get<CompanyListResponse>('/api/v1/companies', { params });
      return data;
    },
  });
}

// ── Vendors ──────────────────────────────────────────
export function useVendors(params?: { limit?: number; search?: string; status?: string }) {
  return useQuery({
    queryKey: ['vendors', params],
    queryFn: async () => {
      const { data } = await api.get<VendorListResponse>('/api/v1/vendors', { params });
      return data;
    },
  });
}

export function useVendor(id: string) {
  return useQuery({
    queryKey: ['vendors', id],
    queryFn: async () => {
      const { data } = await api.get<Vendor>(`/api/v1/vendors/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateVendor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const { data } = await api.post<VendorCreateResponse>('/api/v1/vendors', payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vendors'] });
    },
  });
}

export function useUpdateVendor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: { id: string } & Record<string, unknown>) => {
      const { data } = await api.patch<Vendor>(`/api/v1/vendors/${id}`, payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vendors'] });
    },
  });
}

// ── Purchase Orders ──────────────────────────────────
export interface PO {
  id: string;
  po_number: string;
  po_date: string;
  description: string | null;
  amount_total: number;
  amount_invoiced: number;
  amount_remaining: number;
  status: string;
  vendor_id: string;
}

export function usePurchaseOrders(params?: { limit?: number; search?: string; status?: string }) {
  return useQuery({
    queryKey: ['purchase-orders', params],
    queryFn: async () => {
      const { data } = await api.get<{ items: PO[]; total: number }>('/api/v1/purchase-orders', { params });
      return data;
    },
  });
}

export function useCreatePurchaseOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const { data } = await api.post('/api/v1/purchase-orders', payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchase-orders'] });
    },
  });
}

// ── Tax Rates ────────────────────────────────────────
export interface TaxRate {
  id: string;
  company_id: string | null;
  tax_name: string;
  tax_type: string;
  state_code: string | null;
  rate_pct: number;
  effective_date: string;
  expiry_date: string | null;
  is_active: boolean;
  notes: string | null;
}

export function useTaxRates(params?: { limit?: number; state_code?: string }) {
  return useQuery({
    queryKey: ['tax-rates', params],
    queryFn: async () => {
      const { data } = await api.get<{ items: TaxRate[]; total: number }>('/api/v1/tax-rates', { params });
      return data;
    },
  });
}

export function useCreateTaxRate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const { data } = await api.post('/api/v1/tax-rates', payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tax-rates'] });
    },
  });
}
