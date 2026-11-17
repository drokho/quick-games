// F12 Games stand-in for the bare `@series-inc/rundot-game-sdk` import.
//
// Games mostly import types from it (erased at build time), but a few import
// runtime values such as the HapticFeedbackStyle enum. Without this alias the
// PWA build would bundle the real SDK. Add any other runtime export a game
// needs here, with the same values as the SDK.

export { default } from './run-shim';

export enum HapticFeedbackStyle {
  Light = 'light',
  Medium = 'medium',
  Heavy = 'heavy',
  Success = 'success',
  Warning = 'warning',
  Error = 'error',
}
