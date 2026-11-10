import mongoose from 'mongoose';
import { Activity, Team, User, Workout } from '../models/index.js';

function serviceError(status: number, message: string) {
  return Object.assign(new Error(message), { status });
}

export async function listActivities() {
  return Activity.find().lean();
}

function validEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

const exerciseMet: Record<string, number> = {
  walk: 3.5,
  walking: 3.5,
  caminhada: 3.5,
  run: 8,
  running: 8,
  corrida: 8,
  bike: 7.5,
  bicycle: 7.5,
  cycling: 7.5,
  ciclismo: 7.5,
  strength: 5,
  'strength training': 5,
  musculacao: 5,
  'musculação': 5,
  other: 4,
};

function estimateCalories(type: string, minutes: number, weightKg?: number | null) {
  if (!weightKg) return undefined;
  const met = exerciseMet[type.trim().toLowerCase()] ?? 4;
  return Math.round(met * weightKg * (minutes / 60));
}

export async function getProfile(userEmail: string) {
  if (typeof userEmail !== 'string' || !validEmail(userEmail)) {
    throw serviceError(400, 'A valid user email is required');
  }

  const user = await User.findOne({ email: userEmail.trim().toLowerCase() })
    .select('_id name email team fitnessGoal age weightKg heightCm weeklyGoalMinutes')
    .lean();
  if (!user) throw serviceError(404, 'User not found');
  return user;
}

export async function updateProfile(userEmail: string, input: unknown) {
  if (typeof userEmail !== 'string' || !validEmail(userEmail)) {
    throw serviceError(400, 'A valid user email is required');
  }
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw serviceError(400, 'Profile details are required');
  }

  const { name, age, weightKg, heightCm, fitnessGoal, weeklyGoalMinutes } = input as Record<string, unknown>;
  if (typeof name !== 'string' || name.trim().length === 0) {
    throw serviceError(400, 'A non-empty name is required');
  }
  if (typeof age !== 'number' || !Number.isInteger(age) || age < 1 || age > 120) {
    throw serviceError(400, 'Age must be a whole number between 1 and 120');
  }
  if (typeof weightKg !== 'number' || !Number.isFinite(weightKg) || weightKg < 20 || weightKg > 400) {
    throw serviceError(400, 'Weight must be between 20 and 400 kilograms');
  }
  if (typeof heightCm !== 'number' || !Number.isFinite(heightCm) || heightCm < 100 || heightCm > 250) {
    throw serviceError(400, 'Height must be between 100 and 250 centimeters');
  }
  if (typeof fitnessGoal !== 'string' || fitnessGoal.trim().length === 0) {
    throw serviceError(400, 'A fitness goal is required');
  }
  if (typeof weeklyGoalMinutes !== 'number' || !Number.isInteger(weeklyGoalMinutes) || weeklyGoalMinutes < 1 || weeklyGoalMinutes > 1680) {
    throw serviceError(400, 'Weekly goal must be between 1 and 1680 minutes');
  }

  const user = await User.findOneAndUpdate(
    { email: userEmail.trim().toLowerCase() },
    { $set: { name: name.trim(), age, weightKg, heightCm, fitnessGoal: fitnessGoal.trim(), weeklyGoalMinutes } },
    { new: true, runValidators: true },
  ).select('_id name email team fitnessGoal age weightKg heightCm weeklyGoalMinutes').lean();
  if (!user) throw serviceError(404, 'User not found');
  return user;
}

export async function listUserActivities(userId: unknown) {
  if (typeof userId !== 'string' || !mongoose.isObjectIdOrHexString(userId)) {
    throw serviceError(400, 'A valid userId is required');
  }
  const user = await User.findById(userId).select('weightKg').lean();
  if (!user) throw serviceError(404, 'User not found');
  const activities = await Activity.find({ user: userId }).sort({ occurredAt: -1 }).lean();
  return activities.map((activity) => ({
    ...activity,
    calories: activity.calories ?? estimateCalories(activity.type, activity.minutes, user.weightKg),
  }));
}

export async function createActivity(input: unknown) {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw serviceError(400, 'Activity details are required');
  }

  const { userId, teamId, type, minutes } = input as Record<string, unknown>;
  if (typeof userId !== 'string' || !mongoose.isObjectIdOrHexString(userId)) {
    throw serviceError(400, 'A valid userId is required');
  }
  if (teamId !== undefined && (typeof teamId !== 'string' || !mongoose.isObjectIdOrHexString(teamId))) {
    throw serviceError(400, 'A valid teamId is required');
  }
  if (typeof type !== 'string' || type.trim().length === 0) {
    throw serviceError(400, 'A non-empty activity type is required');
  }
  if (typeof minutes !== 'number' || !Number.isFinite(minutes) || minutes <= 0) {
    throw serviceError(400, 'Minutes must be a positive finite number');
  }

  const user = await User.findById(userId).select('team weightKg').lean();
  if (!user) throw serviceError(404, 'User not found');
  const assignedTeamId = teamId ?? user.team?.toString();
  if (!assignedTeamId || !await Team.exists({ _id: assignedTeamId })) {
    throw serviceError(404, 'User or team not found');
  }

  const calories = estimateCalories(type, minutes, user.weightKg);

  return Activity.create({
    user: userId,
    team: assignedTeamId,
    type: type.trim(),
    minutes,
    points: minutes,
    ...(calories !== undefined ? { calories } : {}),
    occurredAt: new Date(),
  });
}

export async function listTeams() {
  return Team.find().lean();
}

export async function createTeam(input: unknown) {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw serviceError(400, 'Team details are required');
  }

  const { name, mascot, members = [] } = input as Record<string, unknown>;
  if (typeof name !== 'string' || name.trim().length === 0) {
    throw serviceError(400, 'A non-empty team name is required');
  }
  if (typeof mascot !== 'string' || mascot.trim().length === 0) {
    throw serviceError(400, 'A non-empty team mascot is required');
  }
  if (!Array.isArray(members)) {
    throw serviceError(400, 'Team members must be an array of user IDs');
  }
  if (!members.every((member) => typeof member === 'string' && mongoose.isObjectIdOrHexString(member))) {
    throw serviceError(400, 'Every team member must have a valid user ID');
  }

  const memberIds = [...new Set(members as string[])];
  const existingMembers = await User.countDocuments({ _id: { $in: memberIds } });
  if (existingMembers !== memberIds.length) {
    throw serviceError(404, 'One or more team members were not found');
  }

  return Team.create({
    name: name.trim(),
    mascot: mascot.trim(),
    members: memberIds,
  });
}

export async function getLeaderboard() {
  const teams = await Team.aggregate<{ teamName: string; totalPoints: number }>([
    {
      $lookup: {
        from: Activity.collection.name,
        localField: '_id',
        foreignField: 'team',
        as: 'activities',
      },
    },
    {
      $project: {
        _id: 0,
        teamName: '$name',
        totalPoints: { $sum: '$activities.points' },
      },
    },
    { $sort: { totalPoints: -1, teamName: 1 } },
  ]);

  return teams.map((team, index) => ({ ...team, rank: index + 1 }));
}

function normalizeWorkoutFocus(value: unknown) {
  if (typeof value !== 'string') return '';

  const normalized = value.trim().toLowerCase();
  const activityFocus: Record<string, string> = {
    run: 'endurance',
    running: 'endurance',
    cycle: 'endurance',
    cycling: 'endurance',
    walk: 'endurance',
    walking: 'endurance',
    'strength training': 'strength',
    weights: 'strength',
    stretch: 'mobility',
    stretching: 'mobility',
    yoga: 'mobility',
    'weight-loss': 'endurance',
    'weight loss': 'endurance',
    'general-fitness': 'endurance',
    'general fitness': 'endurance',
  };

  return activityFocus[normalized] ?? normalized;
}

export async function suggestWorkouts(userEmail: string) {
  if (typeof userEmail !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userEmail.trim())) {
    throw serviceError(400, 'A valid user email is required');
  }

  const email = userEmail.trim().toLowerCase();
  const user = await User.findOne({ email }).lean();
  if (!user) {
    throw serviceError(404, 'User not found');
  }

  const [recentActivities, workouts] = await Promise.all([
    Activity.find({ user: user._id }).sort({ occurredAt: -1 }).limit(5).select('type').lean(),
    Workout.find().lean(),
  ]);
  const goalFocus = normalizeWorkoutFocus(user.fitnessGoal);

  return workouts
    .map((workout, index) => {
      const workoutFocus = normalizeWorkoutFocus(workout.focus);
      const matchesGoal = Boolean(goalFocus && workoutFocus === goalFocus);
      const matchingActivities = recentActivities.filter(
        (activity) => normalizeWorkoutFocus(activity.type) === workoutFocus,
      );
      const reasonParts: string[] = [];

      if (matchesGoal) {
        reasonParts.push(`Matches your ${user.fitnessGoal} goal`);
      } else if (goalFocus) {
        reasonParts.push(`Offers variety for your ${user.fitnessGoal} goal`);
      }
      if (matchingActivities.length > 0) {
        reasonParts.push(`reflects recent ${matchingActivities[0].type} activity`);
      }

      return {
        suggestion: {
          ...workout,
          reason: reasonParts.length > 0 ? `${reasonParts.join(' and ')}.` : 'Recommended to support a balanced routine.',
        },
        score: (matchesGoal ? 100 : 0) + matchingActivities.length * 10,
        index,
      };
    })
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .map(({ suggestion }) => suggestion);
}

export { User };
