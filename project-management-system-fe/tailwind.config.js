/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Poppins", "sans-serif"],
      },
      colors: {
        primary: {
          DEFAULT: "#6f42c1",
          dark: "#5a32a3",
          darker: "#4a2e8a",
        },
        secondary: {
          DEFAULT: "#3f51b5",
          light: "#5ebeeb",
        },
        accent: {
          DEFAULT: "#1a237e",
        },
        success: "#28a745",
        danger: "#dc3545",
        warning: "#ffc107",
        info: "#17a2b8",
        light: "#f8f9fa",
        muted: "#6c757d",
        border: "#e9ecef",
        dark: "#212529",
        darkest: "#101828",
      },
      spacing: {
        "3xl": "2rem",
      },
      boxShadow: {
        sm: "0 2px 8px rgba(0, 0, 0, 0.08)",
        md: "0 4px 12px rgba(111, 66, 193, 0.3)",
        lg: "0 8px 24px rgba(111, 66, 193, 0.15)",
        xl: "0 10px 30px rgba(111, 66, 193, 0.15)",
      },
      borderRadius: {
        xl: "1rem",
      },
    },
  },
  plugins: [],
};
