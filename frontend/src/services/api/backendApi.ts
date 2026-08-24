import { Patient, Prescription } from '../../types';

const BASE_URL = '/api';

async function request<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`);
  if (!res.ok) {
    throw new Error(`Request to ${path} failed with status ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const backendApi = {
  getPatient: (id: string) => request<Patient>(`/patients/${id}`),
  getPrescriptions: (patientId?: string) =>
    request<Prescription[]>(`/prescriptions${patientId ? `?patientId=${patientId}` : ''}`),
};
