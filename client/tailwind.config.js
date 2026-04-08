/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#121212",
        cream: "#f8f2e8",
        ember: "#db5c31",
        algae: "#145f53",
        fog: "#e9dfd2"
      },
      fontFamily: {
        display: ["Bricolage Grotesque", "sans-serif"],
        body: ["Space Grotesk", "sans-serif"]
      },
      boxShadow: {
        card: "0 20px 35px rgba(18, 18, 18, 0.12)"
      }
    }
  },
  plugins: []
};
