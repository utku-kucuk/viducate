// Static demo build: REACT_APP_DEMO=true swaps the HTTP layer for an in-browser mock API.
import axios from 'axios';

export const IS_DEMO = process.env.REACT_APP_DEMO === 'true';

if (IS_DEMO) {
  // Loaded lazily so the regular build never ships the mock data
  const { mockAdapter } = require('./mockApi');
  axios.defaults.adapter = mockAdapter;
}
