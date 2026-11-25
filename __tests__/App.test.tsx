import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

jest.mock('@/lib/convex', () => ({
  convexClient: null,
  isConvexConfigured: false,
}));

import App from '../App';

test('renders Cirquo mobile shell cleanly without backend', async () => {
  jest.useFakeTimers();
  let tree: ReactTestRenderer.ReactTestRenderer | undefined;
  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(<App />);
  });
  expect(tree).toBeDefined();
  await ReactTestRenderer.act(async () => {
    tree?.unmount();
  });
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
});
