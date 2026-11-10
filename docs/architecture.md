# OctoFit Tracker architecture

OctoFit Tracker is a three-tier application for a school fitness program. The starter code includes API contracts and intentionally incomplete implementation points so you can use GitHub Copilot agent mode in a test-driven loop.

![Three-tier OctoFit architecture](../.github/images/octofit-architecture.svg)

## Tier boundaries

- **Presentation tier**: React 19, Vite, React Router, Bootstrap, and a shared API client in `octofit-tracker/frontend/src`.
- **Logic tier**: Express and TypeScript routes/services in `octofit-tracker/backend/src` expose `/api/*` behavior on port `8000`.
- **Data tier**: Mongoose models and seed data in `octofit-tracker/backend/src/models` and `src/scripts/seed.ts` persist to MongoDB on port `27017`.

## Ports and environment rules

- MongoDB: `27017`
- Express API: `8000`
- Vite frontend: `5173`
- The browser calls relative `/api` paths. Vite proxies them to `http://localhost:8000`, so the unauthenticated API port stays private in Codespaces. `VITE_API_BASE_URL` can override the base URL.

## API contract

| Capability | Method and path | Expected behavior |
| --- | --- | --- |
| Individual profile | `GET /api/profile/:userEmail`, `PUT /api/profile/:userEmail` | Read or update the existing user's name, age, weight, height, fitness goal, and weekly exercise-minute goal. Validate email, identity, ranges, and required profile fields; preserve existing fields such as team membership. |
| Activity tracking | `GET /api/activities`, `GET /api/activities/user/:userId`, `POST /api/activities` | Preserve the complete activity list and expose a user's history in reverse chronological order. POST accepts `userId`, optional `teamId`, `type`, and positive `minutes`; validate user/team references and return deliberate 4xx errors. If omitted, `teamId` comes from the user's existing team. Store points, date, and an estimated calorie value when profile weight is available. Legacy records without calories remain unchanged and receive an estimate only in individual-history responses. |
| Teams | `GET /api/teams`, `POST /api/teams` | List and create teams with members. Created and listed teams keep the submitted `name` and `mascot`. Reject a team without a name with `400`. |
| Leaderboard | `GET /api/leaderboard` | Return teams ordered by the sum of their activity points, highest first. Each entry has `teamName`, `totalPoints`, and a 1-based `rank`. |
| Workout suggestions | `GET /api/workouts/suggestions/:userEmail` | Recommend workouts from the user's goal and recent individual history. The first suggestion's `focus` matches that user's goal or recent activity, with a `reason` explaining why. An email with no matching user returns a deliberate 4xx (for example, `404`). |

## Implementation decisions

Record your plan here before editing code.

- Presentation tier decision: Keep React views focused on presentation and use the shared API client with relative `/api` paths; show accessible loading, error, empty, and populated states.
- Logic tier decision: Keep Express routes thin and put input validation and business rules in explicit service functions; return deliberate 4xx responses for invalid or missing resources.
- Data tier decision: Use Mongoose schemas for persistence validation and the shared MongoDB configuration; keep demo seeding idempotent and preserve unrelated user data.
- Activity tracking approach: Associate records with an existing user and their existing team; accept supported exercises and positive finite minutes; assign one point per minute, set `occurredAt` on the server, and estimate calories from exercise intensity, duration, and optional profile weight without rewriting legacy records.
- Individual tracking approach: Extend the existing demo user's optional physical measurements and weekly minute goal; filter personal history and calculate dashboard summaries and daily/weekly/monthly charts from saved records.
- Team management approach: Require a team name, preserve its mascot, validate member references, and keep team membership links consistent.
- Leaderboard approach: Aggregate activity points by team, sort by total points descending, and return a 1-based rank with each team name and total.
- Workout suggestions approach: Find the user by email, use their fitness goal and recent activity to prioritize matching workouts, and include a reason for the recommendation; return 4xx when no user matches.

### Development plan

1. Strengthen Mongoose schema validation and defaults, then verify the data contracts.
2. Implement activity creation and listing with service-level validation, computed points, and server-generated timestamps.
3. Implement team creation and membership handling, then implement the leaderboard aggregation.
4. Implement workout suggestions based on user goals and recent activity.
5. Connect the React views to the API, including activity and team creation flows and accessible request states.
6. Run the focused contract tests and builds for each tier, then run the full project validation suite.
7. Preserve the existing team, leaderboard, and exercise-suggestion contracts while enabling individual profiles, goals, history, and calorie estimates.

## Test plan

Record the commands you run and what each failure means.

- Data-tier command: `npm run test:data --prefix octofit-tracker/backend` (a failure indicates schema, seed, or persistence contract regressions).
- API command: `npm run test:api --prefix octofit-tracker/backend` (a failure indicates route, service, response, or request-validation contract regressions).
- Individual data/API command: `npm test --prefix octofit-tracker/backend -- tests/individual.contract.test.ts` (a failure indicates profile, per-user history, calorie, or individual-goal regressions).
- Frontend command: `npm test --prefix octofit-tracker/frontend` (a failure indicates presentation, API integration, or accessible-state regressions).
- Backend build command: `npm run build --prefix octofit-tracker/backend` (a failure indicates TypeScript or backend compilation errors).
- Frontend build command: `npm run build --prefix octofit-tracker/frontend` (a failure indicates TypeScript or Vite production-build errors).
