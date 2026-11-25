jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async () => null),
  setItem: jest.fn(async () => undefined),
  removeItem: jest.fn(async () => undefined),
}));

jest.mock('@react-native-community/geolocation', () => ({
  getCurrentPosition: jest.fn(),
  watchPosition: jest.fn(),
  clearWatch: jest.fn(),
}));

jest.mock('@react-native-clipboard/clipboard', () => ({
  setString: jest.fn(),
  getString: jest.fn(async () => ''),
}));

jest.mock('react-native-image-picker', () => ({
  launchImageLibrary: jest.fn(async () => ({ didCancel: true })),
}));

jest.mock('react-native-webview', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    WebView: (props) => React.createElement(View, props),
  };
});

jest.mock('react-native-gesture-handler', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    GestureHandlerRootView: ({ children, ...props }) =>
      React.createElement(View, props, children),
  };
});

jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const { View } = require('react-native');
  const insets = { top: 0, right: 0, bottom: 0, left: 0 };
  const frame = { x: 0, y: 0, width: 390, height: 844 };
  const SafeAreaInsetsContext = React.createContext(insets);
  const SafeAreaFrameContext = React.createContext(frame);
  return {
    SafeAreaProvider: ({ children }) =>
      React.createElement(
        SafeAreaFrameContext.Provider,
        { value: frame },
        React.createElement(
          SafeAreaInsetsContext.Provider,
          { value: insets },
          React.createElement(View, null, children),
        ),
      ),
    SafeAreaView: ({ children, ...props }) =>
      React.createElement(View, props, children),
    SafeAreaInsetsContext,
    SafeAreaFrameContext,
    useSafeAreaInsets: () => insets,
    useSafeAreaFrame: () => frame,
    initialWindowMetrics: { frame, insets },
  };
});

jest.mock('react-native-screens', () => {
  const React = require('react');
  const { View } = require('react-native');
  const Passthrough = ({ children, ...props }) =>
    React.createElement(View, props, children);
  return new Proxy(
    {
      enableScreens: jest.fn(),
      enableFreeze: jest.fn(),
      screensEnabled: () => false,
      Screen: Passthrough,
      ScreenContainer: Passthrough,
      ScreenStack: Passthrough,
      ScreenStackItem: Passthrough,
      FullWindowOverlay: Passthrough,
    },
    {
      get: (target, prop) => {
        if (prop === '__esModule') return true;
        if (prop in target) return target[prop];
        return Passthrough;
      },
    },
  );
});

jest.mock(
  '@env',
  () => ({
    CONVEX_URL: '',
    MAPBOX_ACCESS_TOKEN: '',
    MIDTRANS_CLIENT_KEY: '',
  }),
  { virtual: true },
);

jest.mock('lucide-react-native', () => {
  const React = require('react');
  const { View } = require('react-native');
  return new Proxy(
    {},
    {
      get: (_target, prop) => {
        if (prop === '__esModule') return true;
        return (props) => React.createElement(View, props);
      },
    },
  );
});

jest.mock('react-native-svg', () => {
  const React = require('react');
  const { View } = require('react-native');
  const MockSvg = ({ children, ...props }) =>
    React.createElement(View, props, children);
  return {
    __esModule: true,
    default: MockSvg,
    Svg: MockSvg,
    Path: MockSvg,
    Circle: MockSvg,
    Rect: MockSvg,
    Line: MockSvg,
    Polyline: MockSvg,
    Polygon: MockSvg,
    G: MockSvg,
  };
});
