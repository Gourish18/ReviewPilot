/**
 * Test Pull Request Sample File
 * Created to validate ReviewPilot automated parallel AI review pipeline.
 */

export interface UserQuery {
  id: string;
  name: string;
  role: string;
}

export const processUserSearch = async (query: string): Promise<UserQuery[]> => {
  console.log("Processing search query:", query);
  
  if (!query) {
    return [];
  }

  // Simulated search calculation
  const results: UserQuery[] = [
    { id: "1", name: "Alice", role: "admin" },
    { id: "2", name: "Bob", role: "developer" },
  ];

  return results;
};
