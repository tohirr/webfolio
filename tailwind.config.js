
const {
  default: flattenColorPalette,
} = require("tailwindcss/lib/util/flattenColorPalette");
const svgToDataUri = require("mini-svg-data-uri");

export default {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    fontFamily: {
      mono: ['"Space Mono"'],

      extend: {
        backgroundImage: {
          'field': "url('/field.png')",
        }
      }
  },},
  plugins: [
    function ({ matchUtilities, theme }) {
      matchUtilities(
        {
          "bg-grid": (value) => ({
            backgroundImage: `linear-gradient(90deg,${value} 1px,transparent 0),linear-gradient(180deg,${value} 1px,transparent 0);`,
            backgroundSize: `24px 24px`,
          }),
        },
        { values: flattenColorPalette(theme("backgroundColor")), type: "color" }
      );
    },
  ],
} 