import type { TankDesign } from '../core/types';
// Retired Flash endpoints stay behind explicit interfaces. No hidden network requests,
// fake sign-in, or indefinitely pending server searches are used by the offline game.
export interface CommunityTanks {
  search(query: { avatar: boolean; classId?: number; gunPoints?: number }): Promise<TankDesign[]>;
  publish(tank: TankDesign): Promise<{ id: string }>;
  rate(id: string, rating: number): Promise<void>;
}
export interface Accounts {
  signIn(): Promise<{ id: string; name: string }>;
  signOut(): Promise<void>;
}
export interface PartsPacks {
  list(): Promise<{ id: string; name: string; installed: boolean }[]>;
  install(id: string): Promise<void>;
}
export interface Achievements {
  unlock(name: string): Promise<void>;
}
export class ServiceUnavailable extends Error {
  constructor(service: string) {
    super(`${service} is not connected.`);
    this.name = 'ServiceUnavailable';
  }
}
export const community: CommunityTanks = {
  search: async () => [],
  publish: async () => {
    throw new ServiceUnavailable('Community tank sharing');
  },
  rate: async () => {
    throw new ServiceUnavailable('Community ratings');
  },
};
export const accounts: Accounts = {
  signIn: async () => {
    throw new ServiceUnavailable('Accounts');
  },
  signOut: async () => {},
};
export const partsPacks: PartsPacks = {
  list: async () => [],
  install: async () => {
    throw new ServiceUnavailable('Parts packs');
  },
};
export const achievements: Achievements = {
  unlock: async () => {
    /* Local medals are saved in Profile. Wire platform awards here. */
  },
};

export interface PlatformStats {
  report(name: string, value: number): Promise<void>;
}
export interface Advertisements {
  show(slot: 'preloader' | 'menu'): Promise<boolean>;
}
export const platformStats: PlatformStats = { report: async () => {} };
export const advertisements: Advertisements = { show: async () => false };

/** Historical Credits destinations, intentionally not opened by the offline build. */
export type CreditWebsite = 'studio' | 'composer' | 'social';
// Historical destinations from GameData._-Yf/_-ZS and Main.URL_OPEN(7), not active URLs.
export const CREDIT_WEBSITE_URLS: Record<CreditWebsite, string> = {
  studio: 'http://www.herointeractive.com/',
  composer: 'http://www.polyphonemusic.com/',
  social: 'http://www.facebook.com/#!/pages/Hero-Interactive/58398819916',
};
export interface LegacyWebsites {
  open(destination: CreditWebsite): void;
}
export const legacyWebsites: LegacyWebsites = {
  open: (destination) => {
    const label = {
      studio: 'Hero Interactive website',
      composer: 'Polyphone Music website',
      social: 'Hero Interactive Facebook page',
    }[destination];
    throw new ServiceUnavailable(label);
  },
};
