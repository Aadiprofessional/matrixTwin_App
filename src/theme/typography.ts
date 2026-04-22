import { StyleSheet } from 'react-native';

// Font sizes mapped from Tailwind text-* scale used in web app
// text-xs=11 text-sm=13 text-base=15 text-lg=18 text-xl=22 text-2xl=28 text-3xl=34 text-4xl=40 text-5xl=52 text-6xl=64 text-7xl=76
export const typography = StyleSheet.create({
  // Hero (web: text-6xl / text-7xl)
  hero: { fontSize: 64, fontWeight: '700', lineHeight: 72 },
  // Headings
  h1: { fontSize: 40, fontWeight: '700', lineHeight: 48 },
  h2: { fontSize: 34, fontWeight: '700', lineHeight: 42 },
  h3: { fontSize: 28, fontWeight: '600', lineHeight: 36 },
  h4: { fontSize: 22, fontWeight: '600', lineHeight: 30 },
  h5: { fontSize: 18, fontWeight: '600', lineHeight: 26 },
  // Body
  body1: { fontSize: 15, fontWeight: '400', lineHeight: 24 },
  body2: { fontSize: 13, fontWeight: '400', lineHeight: 20 },
  // Labels / small
  label: { fontSize: 13, fontWeight: '500', lineHeight: 20 },
  caption: { fontSize: 11, fontWeight: '400', lineHeight: 16 },
  // Buttons
  button: { fontSize: 15, fontWeight: '600', lineHeight: 22 },
  buttonSm: { fontSize: 13, fontWeight: '600', lineHeight: 18 },
});

