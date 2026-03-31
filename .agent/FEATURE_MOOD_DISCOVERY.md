Feature: Mood-based Discovery & Smart Filtering

Context

The current search is keyword-based. We want to add "Mood Chips" to help users discover music based on their current feeling using pre-defined search queries.

Requirements

1. Mood Selection Bar

Add a horizontal scrolling "Mood Bar" below the search input in the header.

Elements: Rounded pills (Chips) with icons and text.

Moods & Queries:

🚀 High Energy (Search: "Electronic")

☕ Chill/Study (Search: "Lo-fi")

🎸 Rock Out (Search: "Rock")

💃 Party (Search: "Dance")

🧘 Focus (Search: "Ambient")

Action: Clicking a chip triggers a new search to the iTunes API with that keyword and updates the UI.

2. Live Search (Debounce)

Implement a debounce function (300-500ms) on the main search input.

Results should start appearing as the user types, without waiting for them to press Enter.

3. Advanced Sort/Filter

Add a small dropdown to sort the current results by:

Release Date (Newest first)

Alphabetical (Song Name)

Artist Name