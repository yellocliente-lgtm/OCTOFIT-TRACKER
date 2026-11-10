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
| Activity tracking | `GET /api/activities`, `POST /api/activities` | List and create valid activity records. POST accepts `userId`, `teamId`, `type`, and `minutes`; `userId` and `teamId` must be well-formed IDs for an existing user and team; otherwise respond with a deliberate 4xx (never a 500 from a cast error). A created activity stores the submitted `user`, `team`, `type`, and `minutes` plus computed `points` and `occurredAt`. |
| Teams | `GET /api/teams`, `POST /api/teams` | List and create teams with members. Created and listed teams keep the submitted `name` and `mascot`. Reject a team without a name with `400`. |
| Leaderboard | `GET /api/leaderboard` | Return teams ordered by the sum of their activity points, highest first. Each entry has `teamName`, `totalPoints`, and a 1-based `rank`. |
| Workout suggestions | `GET /api/workouts/suggestions/:userEmail` | Recommend workouts from recent activity patterns for the matching seeded user's email address. The first suggestion's `focus` matches that user's goal or recent activity, with a `reason` explaining why. An email with no matching user returns a deliberate 4xx (for example, `404`). |

## Implementation decisions

Record your plan here before editing code.

- Presentation tier decision: Keep React views focused on presentation and use the shared API client with relative `/api` paths; show accessible loading, error, empty, and populated states.
- Logic tier decision: Keep Express routes thin and put input validation and business rules in explicit service functions; return deliberate 4xx responses for invalid or missing resources.
- Data tier decision: Use Mongoose schemas for persistence validation and the shared MongoDB configuration; keep demo seeding idempotent and preserve unrelated user data.
- Activity tracking approach: Accept `userId`, `teamId`, `type`, and positive finite `minutes`; require existing user and team records; assign one point per minute and set `occurredAt` on the server.
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

## Test plan

Record the commands you run and what each failure means.

- Data-tier command: `npm run test:data --prefix octofit-tracker/backend` (a failure indicates schema, seed, or persistence contract regressions).
- API command: `npm run test:api --prefix octofit-tracker/backend` (a failure indicates route, service, response, or request-validation contract regressions).
- Frontend command: `npm test --prefix octofit-tracker/frontend` (a failure indicates presentation, API integration, or accessible-state regressions).
- Backend build command: `npm run build --prefix octofit-tracker/backend` (a failure indicates TypeScript or backend compilation errors).
- Frontend build command: `npm run build --prefix octofit-tracker/frontend` (a failure indicates TypeScript or Vite production-build errors).
