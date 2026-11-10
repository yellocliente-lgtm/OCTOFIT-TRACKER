import mongoose from 'mongoose';
import { Activity, Team, User, Workout } from '../models/index.js';

function serviceError(status: number, message: string) {
  return Object.assign(new Error(message), { status });
}

export async function listActivities() {
  return Activity.find().lean();
}

export async function createActivity(input: unknown) {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw serviceError(400, 'Activity details are required');
  }

  const { userId, teamId, type, minutes } = input as Record<string, unknown>;
  if (typeof userId !== 'string' || !mongoose.isObjectIdOrHexString(userId)) {
    throw serviceError(400, 'A valid userId is required');
  }
  if (typeof teamId !== 'string' || !mongoose.isObjectIdOrHexString(teamId)) {
    throw serviceError(400, 'A valid teamId is required');
  }
  if (typeof type !== 'string' || type.trim().length === 0) {
    throw serviceError(400, 'A non-empty activity type is required');
  }
  if (typeof minutes !== 'number' || !Number.isFinite(minutes) || minutes <= 0) {
    throw serviceError(400, 'Minutes must be a positive finite number');
  }

  const [userExists, teamExists] = await Promise.all([
    User.exists({ _id: userId }),
    Team.exists({ _id: teamId }),
  ]);
  if (!userExists || !teamExists) {
    throw serviceError(404, 'User or team not found');
  }

  return Activity.create({
    user: userId,
    team: teamId,
    type: type.trim(),
    minutes,
    points: minutes,
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
