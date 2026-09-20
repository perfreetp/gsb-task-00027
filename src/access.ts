import type { AppState, Campus, DispatchRequest, Vehicle } from './types';

export const canAccessCampus = (state: AppState, campusId?: string) => {
  if (!campusId) return false;
  if (state.role.role === 'hq') return true;
  if (state.role.role === 'principal') return state.role.campusId === campusId;
  const coachCampus = state.coaches.find((coach) => coach.id === state.role.coachId)?.campusId;
  return coachCampus === campusId;
};

export const accessibleCampuses = (state: AppState): Campus[] => {
  if (state.role.role === 'hq') return state.campuses;
  return state.campuses.filter((campus) => canAccessCampus(state, campus.id));
};

export const accessibleVehicles = (state: AppState): Vehicle[] => {
  if (state.role.role === 'hq') return state.vehicles;
  if (state.role.role === 'principal') {
    return state.vehicles.filter((vehicle) => [vehicle.ownerCampusId, vehicle.currentCampusId].includes(state.role.campusId!) ||
      state.requests.some((request) => request.vehicleId === vehicle.id && [request.fromCampusId, request.toCampusId].includes(state.role.campusId!)));
  }
  return state.vehicles.filter((vehicle) => vehicle.assignedCoachId === state.role.coachId ||
    state.requests.some((request) => request.vehicleId === vehicle.id && request.coachId === state.role.coachId));
};

export const accessibleRequests = (state: AppState): DispatchRequest[] => {
  if (state.role.role === 'hq') return state.requests;
  if (state.role.role === 'principal') {
    return state.requests.filter((request) => [request.fromCampusId, request.toCampusId].includes(state.role.campusId!));
  }
  return state.requests.filter((request) => request.coachId === state.role.coachId);
};
