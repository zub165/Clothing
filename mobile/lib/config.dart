/// API base URL — change per environment.
/// Android emulator: http://10.0.2.2:3100
/// iOS simulator: http://127.0.0.1:3100
/// Production VPS: https://your-domain.com
const String apiBaseUrl = String.fromEnvironment(
  'API_URL',
  defaultValue: 'http://127.0.0.1:3100',
);
