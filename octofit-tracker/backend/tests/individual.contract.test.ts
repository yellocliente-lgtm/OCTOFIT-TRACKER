import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { Activity, Team, User, Workout } from '../src/models/index.js';

let mongo: MongoMemoryServer;
const app = createApp();

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
}, 60_000);
afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});
beforeEach(async () => {
  await Promise.all([Activity.deleteMany({}), Team.deleteMany({}), User.deleteMany({}), Workout.deleteMany({})]);
});

async function createIndividual(email = 'runner@example.com') {
  const team = await Team.create({ name: 'Runners', mascot: 'Swift', members: [] });
  const user = await User.create({
    name: 'Pessoa Ativa',
    email,
    team: team._id,
    fitnessGoal: 'endurance',
    age: 32,
    weightKg: 70,
    heightCm: 172,
    weeklyGoalMinutes: 180,
  });
  await Team.updateOne({ _id: team._id }, { $addToSet: { members: user._id } });
  return { team, user };
}

describe('OctoFit individual tracking contract', () => {
  it('reads and updates an individual profile while rejecting invalid measurements', async () => {
    await createIndividual();

    const profile = await request(app).get('/api/profile/runner%40example.com');
    expect(profile.status).toBe(200);
    expect(profile.body.profile).toMatchObject({
      name: 'Pessoa Ativa',
      email: 'runner@example.com',
      age: 32,
      weightKg: 70,
      heightCm: 172,
      fitnessGoal: 'endurance',
      weeklyGoalMinutes: 180,
    });

    const invalid = await request(app).put('/api/profile/runner%40example.com').send({
      name: 'Pessoa Ativa', age: 0, weightKg: 70, heightCm: 172, fitnessGoal: 'endurance', weeklyGoalMinutes: 180,
    });
    expect(invalid.status).toBe(400);

    const updated = await request(app).put('/api/profile/runner%40example.com').send({
      name: 'Pessoa Ativa', age: 33, weightKg: 72, heightCm: 172, fitnessGoal: 'strength', weeklyGoalMinutes: 210,
    });
    expect(updated.status).toBe(200);
    expect(updated.body.profile).toMatchObject({ age: 33, weightKg: 72, fitnessGoal: 'strength', weeklyGoalMinutes: 210 });
  });

  it('filters personal activity history and estimates calories using profile weight', async () => {
    const { user, team } = await createIndividual();
    const other = await User.create({ name: 'Outra Pessoa', email: 'other@example.com', fitnessGoal: 'mobility' });
    const created = await request(app).post('/api/activities').send({
      userId: user._id.toString(),
      type: 'run',
      minutes: 30,
    });
    expect(created.status).toBe(201);
    expect(created.body.activity.team).toBe(team._id.toString());
    expect(created.body.activity.calories).toBe(280);

    await Activity.create({
      user: other._id,
      team: team._id,
      type: 'walk',
      minutes: 15,
      points: 15,
      occurredAt: new Date(),
    });
    await Activity.create({
      user: user._id,
      team: team._id,
      type: 'bike',
      minutes: 20,
      points: 20,
      occurredAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    });
    const personalHistory = await request(app).get(`/api/activities/user/${user._id.toString()}`);
    expect(personalHistory.status).toBe(200);
    expect(personalHistory.body.activities).toHaveLength(2);
    expect(personalHistory.body.activities[0].user).toBe(user._id.toString());
    expect(personalHistory.body.activities[1].calories).toBe(175);

    const existingList = await request(app).get('/api/activities');
    expect(existingList.body.activities).toHaveLength(3);
  });

  it('maps individual goals to existing personalized workout suggestions', async () => {
    await User.create({ name: 'Pessoa Ativa', email: 'goals@example.com', fitnessGoal: 'weight-loss' });
    await Workout.create([
      { title: 'Intervals', focus: 'endurance', minutes: 25, difficulty: 'moderate' },
      { title: 'Mobility Flow', focus: 'mobility', minutes: 20, difficulty: 'easy' },
    ]);

    const response = await request(app).get('/api/workouts/suggestions/goals%40example.com');
    expect(response.status).toBe(200);
    expect(response.body.suggestions[0]).toMatchObject({ title: 'Intervals', focus: 'endurance' });
  });
});
