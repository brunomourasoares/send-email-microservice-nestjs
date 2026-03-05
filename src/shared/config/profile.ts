import { AppProfile } from '../enums/app-profile.enum';

export const profile: AppProfile =
  (process.env.NODE_ENV as AppProfile) ?? AppProfile.Development;
