export interface Device {
  id: string;           // Database device ID (hash) - used for queries
  name: string;         // Display name for the user
  friendlyName: string; // Alias for name
  databaseId: string;   // Explicit database ID for clarity
}

export interface LegacyDevice {
  id: string;
  name: string;
}
