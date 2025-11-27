/** @type {import('tailwindcss').Config} */
module.exports = {
  // Include screens so NativeWind picks up classNames used there
  content: ['./App.{js,ts,tsx}', './components/**/*.{js,ts,tsx}', './screens/**/*.{js,ts,tsx}'],

  presets: [require('nativewind/preset')],
  theme: {
    extend: {},
  },
  plugins: [],
};
