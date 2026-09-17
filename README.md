# 7th IT Congress Raffle System

A blockchain-inspired raffle name picker built with Next.js, React, TypeScript, and TailwindCSS.

## Features

- **Admin Panel**: Upload Excel files, customize appearance (logo, title, theme, background)
- **Dual Raffle Modes**: Participant Raffle and School Raffle
- **Winner Persistence**: Winners are stored and cannot be picked again, even after page refresh
- **Blockchain Animation**: Visual blockchain-inspired animation during winner selection
- **Customizable Themes**: Choose from multiple color themes and background styles
- **Excel Integration**: Upload data from Excel files with "Participants" and "Schools" sheets

## Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Run Development Server**
   ```bash
   npm run dev
   ```

3. **Open Application**
   - Raffle Display: http://localhost:3000
   - Admin Panel: http://localhost:3000/admin

## Usage

### Admin Panel (/admin)

1. **Upload Excel File**
   - Prepare an Excel file (.xlsx or .xls) with two sheets:
     - **Participants**: Column with participant names (e.g., "Name", "name")
     - **Schools**: Column with school names (e.g., "School", "school")
   - Click "Choose File" and select your Excel file
   - Click "Upload" to process the data

2. **Customize Appearance**
   - **Title**: Change the raffle title
   - **Logo URL**: Add a logo image URL
   - **Theme Color**: Choose from Purple, Blue, Green, Red, Orange
   - **Background Style**: Select Gradient, Solid, or Animated
   - Click "Save Configuration" to apply changes

3. **Actions**
   - **Open Raffle**: Navigate to the raffle display page
   - **Reset Winners**: Clear all winner history (requires confirmation)

### Raffle Display (/)

1. **Select Mode**
   - Click "Participant Raffle" or "School Raffle" to switch modes

2. **Pick Winner**
   - Click "Pick Winner" to start the selection process
   - Blockchain animation will play during selection
   - Winner will be displayed with celebration animation
   - Winner is automatically saved and removed from available pool

3. **View Stats**
   - Available: Number of entries remaining
   - Winners: Number of winners already selected

4. **Refresh**
   - Click "Refresh" to reload data from server

## Data Persistence

The system stores three types of data in the `data/` directory:

- **config.json**: Raffle configuration (title, logo, theme, background)
- **participants.json**: Uploaded participant and school data
- **winners.json**: List of all winners (prevents duplicates)

Winners persist across page refreshes and browser sessions. To reset winners, use the "Reset Winners" button in the admin panel.

## Excel File Format

### Participants Sheet
```
| Name          |
|---------------|
| John Doe      |
| Jane Smith    |
| Bob Johnson   |
```

### Schools Sheet
```
| School                    |
|---------------------------|
| University of Technology  |
| State College             |
| Technical Institute       |
```

**Note**: Column headers can be "Name"/"name" for participants and "School"/"school" for schools. The system is case-insensitive.

## Technology Stack

- **Framework**: Next.js 16 (App Router)
- **UI**: React 19 + TypeScript
- **Styling**: TailwindCSS
- **Excel Parsing**: xlsx
- **Storage**: JSON files (file-based persistence)

## Deployment

For production deployment:

```bash
npm run build
npm start
```

The app will run on port 3000 by default.

## Troubleshooting

- **Winners appearing again**: Make sure the server is running continuously. Stopping the server may cause data loss if not properly persisted.
- **Excel upload fails**: Verify your Excel file has sheets named "Participants" and "Schools" (case-sensitive).
- **Logo not showing**: Ensure the logo URL is publicly accessible and in a supported image format.

## Support

For issues or questions, contact the IT Congress organizing team.
