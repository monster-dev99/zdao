import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./hooks/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
  	extend: {
  		colors: {
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			},
  			sidebar: {
  				DEFAULT: 'hsl(var(--sidebar-background))',
  				foreground: 'hsl(var(--sidebar-foreground))',
  				primary: 'hsl(var(--sidebar-primary))',
  				'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
  				accent: 'hsl(var(--sidebar-accent))',
  				'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
  				border: 'hsl(var(--sidebar-border))',
  				ring: 'hsl(var(--sidebar-ring))'
  			},
  			// Cyberpunk monochrome colors
  			cyber: {
  				black: '#000000',
  				'dark-gray': '#0a0a0a',
  				gray: '#1a1a1a',
  				'light-gray': '#2a2a2a',
  				white: '#ffffff',
  				'off-white': '#e0e0e0',
  				'medium-gray': '#a0a0a0'
  			},
  			// Neon accent colors
  			neon: {
  				cyan: '#00ffff',
  				'cyan-dark': '#00cccc',
  				'cyan-light': '#33ffff',
  				magenta: '#ff00ff',
  				'magenta-dark': '#cc00cc',
  				'magenta-light': '#ff33ff'
  			},
  			// Glow effects
  			glow: {
  				cyan: '#00ffff',
  				magenta: '#ff00ff'
  			}
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)',
  			none: '0'
  		},
  		boxShadow: {
  			'cyber-cyan': '0 0 10px #00ffff, 0 0 20px #00ffff, 0 0 30px #00ffff',
  			'cyber-magenta': '0 0 10px #ff00ff, 0 0 20px #ff00ff, 0 0 30px #ff00ff',
  			'cyber-glow': '0 0 5px currentColor, 0 0 10px currentColor, 0 0 15px currentColor'
  		},
  		keyframes: {
  			'accordion-down': {
  				from: {
  					height: '0'
  				},
  				to: {
  					height: 'var(--radix-accordion-content-height)'
  				}
  			},
  			'accordion-up': {
  				from: {
  					height: 'var(--radix-accordion-content-height)'
  				},
  				to: {
  					height: '0'
  				}
  			},
  			'scan-line': {
  				'0%': {
  					transform: 'translateY(-100%)'
  				},
  				'100%': {
  					transform: 'translateY(100vh)'
  				}
  			},
  			'glow-pulse': {
  				'0%, 100%': {
  					opacity: '1',
  					filter: 'brightness(1)'
  				},
  				'50%': {
  					opacity: '0.8',
  					filter: 'brightness(1.2)'
  				}
  			},
  			'cyber-flicker': {
  				'0%, 100%': {
  					opacity: '1'
  				},
  				'41.99%': {
  					opacity: '1'
  				},
  				'42%': {
  					opacity: '0'
  				},
  				'42.01%': {
  					opacity: '1'
  				},
  				'43%': {
  					opacity: '1'
  				},
  				'43.01%': {
  					opacity: '0'
  				},
  				'45%': {
  					opacity: '0'
  				},
  				'45.01%': {
  					opacity: '1'
  				}
  			}
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out',
  			'scan-line': 'scan-line 3s linear infinite',
  			'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
  			'cyber-flicker': 'cyber-flicker 0.15s infinite'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
