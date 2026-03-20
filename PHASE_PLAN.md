# Web DB Viewer - Project Phase Plan

## Overview
Build a client-side SQLite database viewer that runs entirely in the browser using sql.js (WebAssembly). A read-only database viewer inspired by DB Browser for SQLite.

**Goal**: Simple, focused tool for viewing SQLite databases and executing SQL queries.

---

## Phase 1: Foundation & Infrastructure
**Goal**: Set up project structure, configure build tools, establish base UI components and dark theme.

### Key Tasks:
- Configure Tailwind CSS v4 with dark theme
- Set up Vite configuration for WASM file handling
- Create base folder structure (`components/ui`, `context`, `lib`, `types`)
- Implement base UI components (Button, Tabs, Card)
- Set up CSS variables for dark theme styling
- Create utility functions (`cn()` for className merging)
- Configure TypeScript with path aliases

**Deliverables**:
- Working dev server with dark theme
- Base UI component library
- Project structure established

**Estimated Effort**: 1-2 days

---

## Phase 2: sql.js Integration & File Loading
**Goal**: Initialize sql.js and implement database file loading.

### Key Tasks:
- Initialize sql.js with proper WASM file loading
- Create `DbViewerContext` for state management using React Context
- Implement database file upload (drag-drop + file picker)
- Handle database errors and validation
- Test with sample SQLite databases

**Deliverables**:
- Working sql.js initialization
- Database file upload functionality
- Database state management with Context

**Estimated Effort**: 1-2 days

---

## Phase 3: Tab-Based Layout & Navigation
**Goal**: Create the main application layout with tab navigation similar to DB Browser.

### Key Tasks:
- Create tab container component
- Implement two main tabs: "Browse Data" and "Execute SQL"
- Create table selector dropdown for Browse Data tab
- Set up layout with header, tab bar, and content area

**Deliverables**:
- Tab-based navigation UI
- Table selector for browsing
- Content area for tab panels

**Estimated Effort**: 1 day

---

## Phase 4: Browse Data Tab
**Goal**: Display table data with pagination controls.

### Key Tasks:
- Query and display table data in a grid
- Implement pagination (First, Previous, Next, Last buttons)
- Show column headers with column names
- Display row count information
- Handle empty tables gracefully

**Deliverables**:
- Table data grid display
- Working pagination controls
- Row count display

**Estimated Effort**: 2-3 days

---

## Phase 5: Execute SQL Tab
**Goal**: SQL editor with query execution and results display.

### Key Tasks:
- Create textarea for SQL input
- Implement execute button
- Parse and execute SQL queries using sql.js
- Display query results in a grid (reuse Browse Data grid)
- Show execution time and row count
- Display basic error messages for failed queries

**Deliverables**:
- Working SQL editor with execute functionality
- Query results display
- Error handling with basic messages
- Execution time and row count display

**Estimated Effort**: 2-3 days

---

## Phase 6: Polish & Bug Fixes
**Goal**: Refine the user experience and fix issues.

### Key Tasks:
- Add loading states during query execution
- Improve error messages
- Add keyboard shortcuts (Ctrl+Enter to execute query)
- Ensure proper cleanup on database unload
- Test with various database files
- Fix any bugs discovered during testing

**Deliverables**:
- Polished user experience
- Stable application
- Tested with real databases

**Estimated Effort**: 1-2 days

---

## Phase 7: Database Structure Tab
**Goal**: Add a comprehensive database structure viewer like DB Browser's Structure tab.

### Key Tasks:
- Query and display all tables in the database
- Show table schemas with column details (name, type, constraints, defaults)
- Display indexes with their columns and uniqueness
- Show foreign key relationships between tables
- List views, triggers, and other database objects
- Create collapsible/expandable sections for each object type
- Add search functionality to find specific objects

**Deliverables**:
- Database Structure tab with complete schema information
- Tables with column details (types, nullability, defaults)
- Indexes display
- Foreign key relationship visualization
- Views and triggers listing
- Object search functionality

**Estimated Effort**: 3-4 days

---

## Phase 8: Data Sorting & Filtering
**Goal**: Add basic sorting and filtering capabilities to the data grid.

### Key Tasks:
- Implement click-to-sort on column headers (ascending/descending)
- Add visual sort indicators (arrows) to column headers
- Create global text filter box for searching across all columns
- Highlight matching text in filtered results
- Add column-specific filter dropdowns
- Handle sorting for different data types (text, numbers, dates)
- Maintain sort/filter state when changing pages

**Deliverables**:
- Click-to-sort on any column header
- Global search/filter box
- Column-specific filters
- Visual indicators for sorted columns
- Filter result highlighting

**Estimated Effort**: 2-3 days

---

## Phase 9: Multiple Query Results
**Goal**: Support multiple query result sets in the Execute SQL tab.

### Key Tasks:
- Create tab system within Execute SQL panel for multiple results
- Each query execution creates a new result tab
- Allow closing individual result tabs
- Add tab naming (e.g., "Query 1", "Query 2", or custom names)
- Maintain query SQL with each result tab
- Add "Close all tabs" functionality
- Limit maximum number of open tabs (configurable)

**Deliverables**:
- Tab-based results within Execute SQL panel
- Multiple concurrent query results
- Tab management (close, rename)
- Query association with each tab

**Estimated Effort**: 2-3 days

---

## Phase 10: Enhanced Polish & Performance
**Goal**: Advanced UX improvements and performance optimization.

### Key Tasks:
- Add data grid virtualization for large datasets
- Implement lazy loading for table data
- Add tooltips for long cell content
- Improve keyboard navigation throughout the app
- Add more keyboard shortcuts (Ctrl+O to open, Ctrl+N new query, etc.)
- Optimize query performance
- Add progress indicators for long-running queries
- Responsive design improvements

**Deliverables**:
- Optimized performance for large databases
- Enhanced keyboard navigation
- Better UX feedback (tooltips, progress)
- Responsive design refinements

**Estimated Effort**: 2-3 days

---

## Summary

### MVP (Phases 1-6)
| Phase | Description | Estimated Time |
|-------|-------------|----------------|
| 1 | Foundation & Infrastructure | 1-2 days |
| 2 | sql.js Integration & File Loading | 1-2 days |
| 3 | Tab-Based Layout & Navigation | 1 day |
| 4 | Browse Data Tab | 2-3 days |
| 5 | Execute SQL Tab | 2-3 days |
| 6 | Polish & Bug Fixes | 1-2 days |

**MVP Total**: 8-13 days

### Expansion (Phases 7-10)
| Phase | Description | Estimated Time |
|-------|-------------|----------------|
| 7 | Database Structure Tab | 3-4 days |
| 8 | Data Sorting & Filtering | 2-3 days |
| 9 | Multiple Query Results | 2-3 days |
| 10 | Enhanced Polish & Performance | 2-3 days |

**Expansion Total**: 9-13 days

**Complete Project Total**: 17-26 days

---

## MVP Scope (Phases 1-6)

### What's Included:
- **Browse Data Tab**: View table contents with pagination
- **Execute SQL Tab**: Execute SQL queries with results display
- **Read-Only**: View data only, no modifications
- **Single Database**: One database file open at a time
- **Dark Theme**: Consistent dark UI theme
- **Basic SQL Editor**: Textarea with execute button
- **Query Info**: Execution time and row count
- **Keyboard Shortcuts**: Ctrl+Enter to execute query

### What's Excluded (from MVP):
- Database Structure/Schema view
- Data sorting and filtering
- Multiple query result tabs
- Data editing (inline or otherwise)
- Multiple database support
- Export functionality (CSV/JSON)
- Query history or bookmarks
- Visual query builder
- Syntax highlighting in SQL editor

---

## Expansion Features (Phases 7-10)

### What Gets Added:
- **Database Structure Tab** (Phase 7): Complete schema viewer with tables, columns, indexes, foreign keys, views, and triggers
- **Data Sorting & Filtering** (Phase 8): Click-to-sort columns, global search, column-specific filters
- **Multiple Query Results** (Phase 9): Tab-based results within Execute SQL panel
- **Enhanced Performance** (Phase 10): Virtualization, lazy loading, keyboard navigation, tooltips

### Still Excluded (even after expansion):
- Data editing (inline or otherwise)
- Multiple database support
- Export functionality (CSV/JSON)
- Query history or bookmarks
- Visual query builder
- Syntax highlighting in SQL editor
- ERD diagrams
- Data visualization/charts
- SQL log viewer

---

## Success Criteria

### MVP Success (Phases 1-6):
1. User can open a SQLite database file (.db, .sqlite, .sqlite3)
2. User can browse table data using the Browse Data tab
3. User can execute SELECT queries in the Execute SQL tab
4. Query results display with execution time and row count
5. Pagination works for large tables
6. Basic errors are displayed when queries fail
7. Application is stable and doesn't crash on valid database files

### Full Project Success (Phases 1-10):
All MVP criteria plus:
8. User can view complete database structure (tables, columns, indexes, foreign keys, views, triggers)
9. User can sort columns by clicking headers
10. User can filter data using global search and column-specific filters
11. User can execute multiple queries and switch between results using tabs
12. Application handles large databases efficiently with virtualization
