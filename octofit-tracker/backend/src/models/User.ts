import { Schema, model } from 'mongoose';

const userSchema = new Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, trim: true, lowercase: true },
  team: { type: Schema.Types.ObjectId, ref: 'Team' },
  fitnessGoal: { type: String, required: true, trim: true },
  age: { type: Number, min: 1, max: 120 },
  weightKg: { type: Number, min: 20, max: 400 },
  heightCm: { type: Number, min: 100, max: 250 },
  weeklyGoalMinutes: { type: Number, min: 1, max: 1680, default: 150 },
});

export const User = model('User', userSchema);
