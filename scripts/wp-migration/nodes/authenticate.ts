import type { MigrationState } from "../state";
import { WPClient } from "../wp-client";

export async function authenticateNode(
  _state: MigrationState
): Promise<Partial<MigrationState>> {
  console.log("\n=== Phase 0: Authenticating with WordPress ===");

  const token = await WPClient.authenticate();
  const userId = await WPClient.verifyAdmin(token);

  console.log(`Authenticated as user ID ${userId}`);

  return {
    jwtToken: token,
    migrationLog: [
      {
        phase: "authenticate",
        message: `JWT obtained, verified user ID ${userId}`,
        timestamp: new Date().toISOString(),
      },
    ],
  };
}
