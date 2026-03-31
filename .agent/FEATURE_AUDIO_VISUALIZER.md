Feature: Real-time Audio Visualizer & Smooth Transitions

Context

VibeTunes currently plays audio using a standard HTML5 <audio> tag. We want to add a visual layer that reacts to the music and smooths out the user experience.

Requirements

1. Canvas Visualizer

Add a <canvas> element inside the fixed mini-player at the bottom.

Use the Web Audio API (AudioContext, AnalyserNode) to extract frequency data from the audio preview.

Draw a simple, elegant bar visualizer or a wave visualizer using the primary color #1E6FC3.

The visualizer should only animate when music is playing to save resources.

2. Audio Fading (Crossfade-like)

When a user switches between songs, implement a brief fade-out of the current track and a fade-in of the new track (approx 300ms) to avoid "audio popping".

3. Dynamic Title Update

Update the browser document.title to "🎵 [Song Name] - [Artist Name]" when playing, and revert to "VibeTunes" when paused.

Technical Implementation Notes (JavaScript/jQuery)

Ensure the AudioContext is created/resumed after a user gesture (browser security policy).

Use window.requestAnimationFrame for the canvas drawing loop for 60fps performance.

The visualizer should be responsive and fit within the mini-player's layout.