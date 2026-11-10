export const activeUserEmail = 'mona@example.com';

export type IndividualProfile = {
  _id: string;
  name: string;
  email: string;
  team?: string;
  fitnessGoal: string;
  age?: number;
  weightKg?: number;
  heightCm?: number;
  weeklyGoalMinutes: number;
};

export type IndividualActivity = {
  _id?: string;
  user?: string;
  team?: string;
  type: string;
  minutes: number;
  points: number;
  calories?: number;
  occurredAt?: string;
};