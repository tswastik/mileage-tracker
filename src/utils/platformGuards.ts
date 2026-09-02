import { Platform } from 'react-native';

// expo-file-system's File/Directory/Paths API has no web implementation
// (confirmed via its own "expo-file-system is not supported on web" runtime
// warning, which otherwise surfaces as an unhelpful internal error like
// "this.validatePath is not a function"). Export/backup/restore are native
// (Android/iOS via Expo Go) features only — this turns that into a message
// a person testing on web can actually act on.
export function assertFileSystemSupported(): void {
  if (Platform.OS === 'web') {
    throw new Error('Export and backup need a phone or emulator — they are not supported in the web preview.');
  }
}
