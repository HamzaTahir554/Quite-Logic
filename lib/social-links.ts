export const socialPlatforms = [
  "LinkedIn",
  "Instagram",
  "GitHub",
  "Facebook",
  "X",
  "YouTube",
] as const;
export type SocialPlatform = (typeof socialPlatforms)[number];
export type PublicSocialLink = {
  id: string;
  platform: SocialPlatform;
  url: string;
  order: number;
};
export type ManagedSocialLink = Omit<PublicSocialLink, "id"> & {
  _id: string;
  enabled: boolean;
};
