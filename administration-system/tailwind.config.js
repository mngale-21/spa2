/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Shares the "brass" accent with the Salon System's own brand so the
        // two apps read as one product family - but this control panel gets
        // its own deep-navy "control tower" identity (data-dense ops tool),
        // not a copy of the salon-facing boutique look.
        ink: {
          950: "#0B0E13",
          900: "#12161D",
          800: "#1B212B",
          700: "#272F3C",
          600: "#3A4457",
        },
        brass: {
          300: "#E4CC9A",
          400: "#D6B370",
          500: "#C79A4B",
          600: "#A97F35",
        },
        sand: {
          50: "#FAF8F4",
          100: "#F4F1EA",
          200: "#EAE4D6",
        },
        status: {
          active: "#2F9E6B",
          activeTint: "#E7F5EE",
          suspended: "#C98A2C",
          suspendedTint: "#FBF1E2",
          deleted: "#C1543F",
          deletedTint: "#FBEAE7",
        },
      },
      fontFamily: {
        display: ["'Fraunces'", "serif"],
        body: ["'Manrope'", "sans-serif"],
      },
      boxShadow: {
        soft: "0 1px 2px rgba(18, 22, 29, 0.04), 0 10px 28px -14px rgba(18, 22, 29, 0.18)",
        lift: "0 2px 6px rgba(18, 22, 29, 0.06), 0 20px 40px -18px rgba(18, 22, 29, 0.24)",
      },
      borderRadius: {
        xl2: "1.1rem",
      },
    },
  },
  plugins: [],
};
