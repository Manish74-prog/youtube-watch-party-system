# YouTube Watch Party

A real-time collaborative video watching platform built with React, Node.js, and Socket.IO. The application allows users to create synchronized watch rooms where playback actions (play, pause, seeking, and video changes) reflect instantly across all connected participants with backend role-based access control.

## Live Deployment
- **Client (Frontend):** https://your-client-app.vercel.app
- **Server (WebSocket Backend):** https://your-server-api.onrender.com

---

## Features
- **Real-Time Video Synchronization:** Broadcasts play, pause, seek offsets (+/-10s), and new YouTube URLs across all room members in real time.
- **Room Management:** Join or create rooms dynamically using unique room IDs.
- **Role-Based Access Control (RBAC):**
  - **Host:** Room creator. Full privileges including playback control, URL changes, promoting participants to Moderator, and kicking users.
  - **Moderator:** Elevated participant allowed to control playback and load new videos.
  - **Participant:** Default viewer role. Read-only interface with playback controls disabled.
- **Backend Authorization Enforcement:** All incoming socket events are validated against the user's role on the server before state updates are broadcasted.
- **Initial State Catch-Up:** New participants automatically receive a snapshot of the current video ID, timestamp, and play/pause state upon joining.
- **Echo Prevention:** Handled via sync state flags to ensure automated player updates do not trigger reciprocal socket events back to the server.

---

## Tech Stack
- **Frontend:** React.js, Vite, React-YouTube (YouTube IFrame Player API), CSS
- **Backend:** Node.js, Express, Socket.IO, CORS
- **State Management:** In-memory Object-Oriented state architecture (Room, Participant, RoomManager)

