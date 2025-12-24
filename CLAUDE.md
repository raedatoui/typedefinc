# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` - Start development server
- `npm run build` - Build for production (static export to `out/`)
- `npm run lint` - Run Biome linter
- `npm run format` - Format code with Biome
- `npm run check` - Run Biome check with auto-fix

## Architecture

This is a Next.js 16 site for Typedef Inc with a WebGL-based landing page using React Three Fiber.

### Key Components

- **Scene.tsx** - Main 3D canvas wrapper using `@react-three/fiber`. Handles camera controls and interaction state (active/inactive based on user orbit control interaction). Auto-resets camera position when not actively interacting.

- **FragmentShaderArt.tsx** - Core visual component rendering 90,000 (300×300) instanced cubes with custom GLSL shaders. Features:
  - Simplex 3D noise for displacement and color variation
  - Cubes morph from flat grid to displaced sphere based on interaction
  - Wave/expansion effect emanates from cursor position using UV-space distance
  - Cubes rotate with random axes/speeds when in flat mode, fade to static on sphere
  - Dynamic color animation using time-based RGB oscillation

### Configuration

- **Static export**: Next.js configured with `output: 'export'` for static site generation
- **Path alias**: `@/*` maps to `./src/*`
- **Biome**: 4-space indentation, single quotes, 150 char line width
