const plugin = require('tailwindcss/plugin');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        canvas: '#FDF7FD',
        panel: 'rgba(255,255,255,0.08)',
        urgent: '#f08b42',
        fz: {
          plum: '#4B164C',
          pink: '#DD88CF',
          ink: '#22172A',
          canvas: '#FDF7FD',
          muted: '#6C727F',
          soft: '#F8E7F6',
          border: '#E5E6EB',
          online: '#13E398',
          danger: '#E5484D',
        },
        auth: {
          bg: '#ffffff',
          ink: '#22172A',
          muted: '#6C727F',
          border: '#E5E6EB',
          primary: '#4B164C',
          link: '#DD88CF',
          brand: '#4B164C',
          deep: '#22172A',
        },
      },
      borderRadius: {
        chip: '4px',
        control: '8px',
        card: '16px',
        panel: '20px',
        sheet: '24px',
        pill: '32px',
        full: '9999px',
      },
      spacing: {
        '60': '60px',
        '80': '80px',
        '88': '88px',
        '90': '90px',
        '92': '92px',
        '343': '343px',
        '184': '184px',
      },
      fontFamily: {
        sans: ['HankenGrotesk-Regular', 'sans-serif'],
        hanken: ['HankenGrotesk-Regular', 'sans-serif'],
        'hanken-thin': ['HankenGrotesk-Thin', 'sans-serif'],
        'hanken-light': ['HankenGrotesk-Light', 'sans-serif'],
        'hanken-regular': ['HankenGrotesk-Regular', 'sans-serif'],
        'hanken-medium': ['HankenGrotesk-Medium', 'sans-serif'],
        'hanken-semibold': ['HankenGrotesk-SemiBold', 'sans-serif'],
        'hanken-bold': ['HankenGrotesk-Bold', 'sans-serif'],
        'hanken-extrabold': ['HankenGrotesk-ExtraBold', 'sans-serif'],
        'hanken-black': ['HankenGrotesk-Black', 'sans-serif'],
      },
    },
  },
  plugins: [
    plugin(function ({ addUtilities }) {
      addUtilities({
        '.font-thin': { fontFamily: 'HankenGrotesk-Thin', fontWeight: '100' },
        '.font-hairline': { fontFamily: 'HankenGrotesk-Thin', fontWeight: '100' },
        '.font-extralight': { fontFamily: 'HankenGrotesk-Light', fontWeight: '200' },
        '.font-light': { fontFamily: 'HankenGrotesk-Light', fontWeight: '300' },
        '.font-normal': { fontFamily: 'HankenGrotesk-Regular', fontWeight: '400' },
        '.font-medium': { fontFamily: 'HankenGrotesk-Medium', fontWeight: '500' },
        '.font-semibold': { fontFamily: 'HankenGrotesk-SemiBold', fontWeight: '600' },
        '.font-bold': { fontFamily: 'HankenGrotesk-Bold', fontWeight: '700' },
        '.font-extrabold': { fontFamily: 'HankenGrotesk-ExtraBold', fontWeight: '800' },
        '.font-black': { fontFamily: 'HankenGrotesk-Black', fontWeight: '900' },
      });
    }),
  ],
};
