Feature: Persistent Favorites, "Up Next" Queue & Live Lyrics

Context

We have basic localStorage. We need to expand this into a "Library" feel where users can manage their saved tracks, see what's playing next, and view lyrics while listening.

Requirements

1. Enhanced Favorites View

Add a "My Library" toggle button in the header.

When active, hide the search results and display only songs stored in localStorage.

Each card in this view should have a "Remove from Favorites" button (color: #EF4444).

2. "Play All" Favorites & Auto-next

If a user is in the "My Library" view, clicking "Play" on a song should automatically queue the remaining favorite songs.

When the current 30s preview ends, automatically trigger the next song in the list.

3. Live Lyrics Integration

Add a "Lyrics" button to the mini-player.

When clicked, open a centered, elegant overlay (Modal) with a blurred background (glassmorphism).

Source: Use a free Lyrics API (e.g., api.lyrics.ovh/v1/{artist}/{title}) to fetch the lyrics when a song starts.

UI: Display lyrics in a clear, scrollable format with high typography hierarchy.

Fallback: If no lyrics are found, show a friendly message: "Lời bài hát đang được cập nhật..."

4. Toast Notifications

Implement a lightweight toast notification system (using pure JS/CSS).

Show a success toast (#10B981) when a song is added to favorites.

Show an info toast when a song starts playing.

5. Persistence Logic

Ensure the localStorage stores the full object (image, trackName, artistName, previewUrl) so the library can load offline/instantly without re-fetching from the API.

UI/UX Notes

Use a "Floating Action Button" (FAB) style for the Lyrics toggle on mobile devices.

Ensure the Lyrics modal is responsive and can be dismissed easily with an 'X' button or by clicking outside.