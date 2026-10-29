# The Magic of Window Functions in PostgreSQL - Interactive Visual Laboratory

An interactive, animated visual laboratory designed to help you deeply understand SQL Window Functions, based on Bruce Momjian's renowned talk *"The Magic of Window Functions"*.

![Window Functions Explorer Preview](https://img.shields.io/badge/PostgreSQL-Window%20Functions-336791?style=for-the-badge&logo=postgresql&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-6-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)

---

## 🎯 What You Can Explore & Learn Deeply

1. **The 3 Meanings of `CURRENT ROW`**:
   - **Meaning #1 (Physical Row)**: In `ROWS` mode, strictly refers to the single physical row being processed.
   - **Meaning #2 (Current Row + All Peers)**: In `RANGE` mode with `ORDER BY`, expands to include all tied rows that share the same sorting value.
   - **Meaning #3 (The Entire Partition!)**: In `RANGE` mode without `ORDER BY`, all rows are treated as peers—causing `CURRENT ROW` to expand across the entire partition!
2. **`ROWS` vs `RANGE` Visual Frame Bracket**:
   - Compare sliding physical frames (e.g. `ROWS BETWEEN 3 PRECEDING AND CURRENT ROW`) vs logical value-based peer ranges.
   - Step row-by-row or hit **Play** to watch the frame bracket slide across the dataset.
3. **`PARTITION BY` Boundaries**:
   - Observe how partitions create independent walls where window calculations reset and never cross partition walls.
4. **Calculations in Action**:
   - Side-by-side computation of `COUNT()`, `SUM()`, `AVG()`, `FIRST_VALUE()`, `LAST_VALUE()`, `NTH_VALUE()`, `ROW_NUMBER()`, `RANK()`, `DENSE_RANK()`, `LAG()`, and `LEAD()`.
5. **Interactive Presets from the Video**:
   - Includes 7 curated presets matching exact timestamps from Bruce Momjian's presentation (e.g. `3 PRECEDING`, `Default OVER () Gotcha`, `Red vs Blue Partitions`, etc.).

---

## 🚀 Running Locally

```bash
# 1. Install dependencies
npm install

# 2. Start the development server
npm run dev
```

Open your browser at `http://localhost:5173` to interact with the visualizer.

---

## 🌐 Deploying to GitHub & GitHub Pages

This repository is already pre-configured with a **GitHub Actions automated workflow** (`.github/workflows/deploy.yml`).

### Step 1: Initialize Git and Commit
```bash
git init
git add .
git commit -m "Initial commit: SQL Window Functions Interactive Explorer"
```

### Step 2: Create a New GitHub Repository
1. Go to [GitHub New Repository](https://github.com/new).
2. Name your repository (e.g., `sql-window-functions-explorer`).
3. Leave it Public (or Private if you have GitHub Pro for Pages).
4. Do **not** initialize with README or .gitignore (we already have them).

### Step 3: Link and Push to GitHub
```bash
git branch -M main
git remote add origin https://github.com/<YOUR-USERNAME>/sql-window-functions-explorer.git
git push -u origin main
```

### Live Interactive App:
👉 **[https://punitgiri921.github.io/sql-window-functions-explorer/](https://punitgiri921.github.io/sql-window-functions-explorer/)**

### Enable GitHub Pages in Repository Settings (One-time setup)
1. Go to your repository settings: [github.com/punitgiri921/sql-window-functions-explorer/settings/pages](https://github.com/punitgiri921/sql-window-functions-explorer/settings/pages)
2. Under **Build and deployment** -> **Source**, select:
   👉 **GitHub Actions** *(NOT "Deploy from a branch")*.
3. The workflow in `.github/workflows/deploy.yml` will automatically build and publish the live site.
4. Your interactive laboratory will be live at:
   ```
   https://punitgiri921.github.io/sql-window-functions-explorer/
   ```

---

## 🛠️ Project Structure

- `sql_window_functions_explorer.tsx`: Main React component containing the complete interactive engine, presets, and PostgreSQL logic.
- `src/main.tsx`: React application entry point.
- `src/index.css`: Tailwind CSS definitions and custom themes.
- `index.html`: Web page shell and metadata.
- `vite.config.ts`: Vite configuration configured with relative base path for GitHub Pages compatibility.
- `.github/workflows/deploy.yml`: Automated CI/CD pipeline deploying directly to GitHub Pages on every push.
