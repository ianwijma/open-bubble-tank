import type { TankDesign } from '../core/types';
// Online features stay behind explicit interfaces. No hidden network requests or indefinitely pending
// server searches are used by the offline game.
export interface CommunityTanks {
  search(query: { avatar: boolean; classId?: number; gunPoints?: number }): Promise<TankDesign[]>;
  publish(tank: TankDesign): Promise<{ id: string }>;
  rate(id: string, rating: number): Promise<void>;
}
export class ServiceUnavailable extends Error {
  constructor(service: string) {
    super(`${service} is not connected.`);
    this.name = 'ServiceUnavailable';
  }
}
export const community: CommunityTanks = {
  search: async () => {
    throw new ServiceUnavailable('Community tank search');
  },
  publish: async () => {
    throw new ServiceUnavailable('Community tank sharing');
  },
  rate: async () => {
    throw new ServiceUnavailable('Community ratings');
  },
};
