# Routine & Task Management System

## Database Schema

### User
- `userId` (PK)  
- `name`  
- `email` (unique)  
- `password`  
- `notificationPreferences`  

### Routine
- `routineId` (PK)  
- `userId` (FK)  
- `name`  
- `description`  
- `isActive` (boolean)  

### Task
- `taskId` (PK)  
- `userId` (FK)  
- `routineId` (FK)  
- `title`  
- `description`  
- `frequency` (Daily / Weekly / Monthly / Yearly)  
- `priority` (Low / Medium / High)  
- `status` (Active / Paused / Archived)  
- `startDate`  
- `endDate`  
- `createdAt`  

### Progress
- `progressId` (PK)  
- `userId` (FK)  
- `taskId` (FK, nullable)  
- `isExtraProgress` (boolean)  
- `title` (required if `isExtraProgress`)  
- `date`  
- `status` (Completed / Skipped / Pending)  
- `notes`  
- `createdAt`  

### Notification
- `notificationId` (PK)  
- `userId` (FK)  
- `taskId` (FK, nullable)  
- `type` (Reminder / Pending / Overdue)  
- `message`  
- `isRead`  
- `createdAt`  

---

## Functional Use-Cases (System + User)

### User Use-Cases

#### Account
- Register / Login  
- Set notification preferences  

#### Routine Management
- Create routine  
- Activate routine  
- Disable routine  
- Switch routines (auto deactivate old)  

#### Task Management
- Create task under routine  
- Pause / archive task  
- Define frequency & priority  

#### Progress Tracking
- Mark task as:
  - Completed  
  - Skipped (notes required)  
- Add extra progress without a task (`isExtraProgress`)  

#### Dashboard
- Today’s pending tasks  
- Completed vs missed  
- Extra work summary  
- Weekly / Monthly / Yearly charts  

#### Notifications
- Read / dismiss notifications  
- Receive reminders & summaries  

---

### System Use-Cases (Automated)

#### Daily Cron Job
- Auto-create pending progress  
- Send reminders  
- Detect overdue tasks  

#### Analytics Engine
- Calculate completion %  
- Generate streaks  
- Build reports  

---

## Core Business Logic Flows

### Daily Auto-Progress Flow
- For each user:
- Get active routine
- Get active tasks
- For each task:
- If no progress exists for today:
- Create Progress(status = Pending)

### Task Completion Flow
- User marks task:
- Update Progress(status = Completed)

### Task Skipped Flow
- If status = Skipped:
- Notes are mandatory

### Extra Progress Flow (isExtraProgress)
- User adds progress without task:
- taskId = null
- isExtraProgress = true
- status = Completed

---

## Business Rules (Must-Follow)

### Data Rules
- One active routine per user  
- One progress per task per day  
- Progress is immutable (no delete)  
- Skipped → notes required  
- Extra progress (`isExtraProgress`) cannot be `Pending`  

### Notification Rules
- Extra progress does not trigger reminders  
- Notifications are system-generated only  

### Analytics Rules
- Only `Completed` counts for streaks  
- Archived tasks don’t generate progress  

---

## Important Rules (Very Important)
- Notifications are never created manually  
- One notification per task per trigger  
- Always respect notification preferences  
- Extra progress never creates notifications  
- Notifications are immutable (cannot be edited)
