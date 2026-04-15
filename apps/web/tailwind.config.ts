import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))"
        },
        border: "hsl(var(--border))",
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))"
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))"
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))"
        },
        danger: {
          DEFAULT: "hsl(var(--danger))",
          foreground: "hsl(var(--danger-foreground))"
        },
        panel: "hsl(var(--panel))",
        panelAlt: "hsl(var(--panel-alt))",
        overlay: "hsl(var(--overlay))"
      },
      borderRadius: {
        sm: "6px",
        md: "8px",
        lg: "12px"
      },
      spacing: {
        panel: "1rem",
        "table-x": "0.875rem",
        "table-y": "0.6875rem",
        "context-x": "1.25rem"
      },
      boxShadow: {
        panel: "0 10px 24px rgba(15, 23, 42, 0.08)",
        inset: "inset 0 1px 0 rgba(255,255,255,0.45)"
      },
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "\"Segoe UI\"",
          "sans-serif"
        ],
        mono: [
          "\"SFMono-Regular\"",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Monaco",
          "Consolas",
          "\"Liberation Mono\"",
          "\"Courier New\"",
          "monospace"
        ]
      }
    }
  },
  plugins: []
};

export default config;
