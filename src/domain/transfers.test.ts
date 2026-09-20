import { describe, expect, it } from 'vitest';
import { initialState } from './mockData';
import type { AppState } from './types';

const freshState = (): AppState => structuredClone(initialState);
import { createTransfer, destinationApprove, hqApprove, receiveTransfer, withdrawTransfer } from './transfers';

const base = {
  vehicleId: 'v-002',
  fromCampusId: 'east',
  toCampusId: 'west',
  coachId: 'c-qian',
  priority: 2 as const,
  eta: '2026-09-21 10:00'
};

describe('transfer state machine', () => {
  it('rejects duplicate submissions by idempotency key', () => {
    const command = { ...base, idempotencyKey: 'same-key' };
    const once = createTransfer(freshState(), command);
    const twice = createTransfer(once, command);
    expect(twice.transfers).toHaveLength(once.transfers.length);
  });

  it('queues concurrent requests and releases only one winner', () => {
    const first = createTransfer(freshState(), { ...base, idempotencyKey: 'first', priority: 2 });
    const firstId = first.transfers.at(-1)!.id;
    const second = createTransfer(first, { ...base, idempotencyKey: 'second', priority: 1, toCampusId: 'north' });
    const secondId = second.transfers.at(-1)!.id;
    expect(second.transfers.find((item) => item.id === firstId)?.status).toBe('awaiting_destination');
    expect(second.transfers.find((item) => item.id === secondId)?.status).toBe('queued');

    const withdrawn = withdrawTransfer(second, firstId);
    expect(withdrawn.transfers.find((item) => item.id === firstId)?.status).toBe('withdrawn');
    const promoted = withdrawn.transfers.find((item) => item.id === secondId);
    expect(promoted?.status).toBe('awaiting_destination');
  });

  it('rolls approval forward only through destination then hq', () => {
    const created = createTransfer(freshState(), { ...base, idempotencyKey: 'approval-flow' });
    const id = created.transfers.at(-1)!.id;
    const wrongOrder = hqApprove(created, id);
    expect(wrongOrder.transfers.find((item) => item.id === id)?.status).toBe('awaiting_destination');
    const destinationApproved = destinationApprove(created, id);
    const approved = hqApprove(destinationApproved, id);
    expect(approved.transfers.find((item) => item.id === id)?.status).toBe('approved');
  });

  it('changes vehicle campus only after destination receives', () => {
    const created = createTransfer(freshState(), { ...base, idempotencyKey: 'receive-flow' });
    const id = created.transfers.at(-1)!.id;
    let state = hqApprove(destinationApprove(created, id), id);
    const transfer = state.transfers.find((item) => item.id === id)!;
    state = { ...state, transfers: state.transfers.map((item) => item.id === id ? { ...item, status: 'in_transit', progress: 1 } : item) };
    expect(state.vehicles.find((vehicle) => vehicle.id === transfer.vehicleId)?.currentCampusId).toBe('east');
    state = receiveTransfer({ ...state, transfers: state.transfers.map((item) => item.id === id ? { ...item, status: 'arrived' } : item) }, id);
    expect(state.vehicles.find((vehicle) => vehicle.id === transfer.vehicleId)?.currentCampusId).toBe('west');
  });
});
