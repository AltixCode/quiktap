/**
 * The router spies the `expo-router` mock in `jest.setup.js` hands to every screen.
 *
 * Reached through `jest.requireMock` rather than by calling `useRouter()` at module
 * scope, which would be a hook called outside a component.
 */
export const testRouter = (
  jest.requireMock('expo-router') as {
    router: { push: jest.Mock; replace: jest.Mock; back: jest.Mock };
  }
).router;
