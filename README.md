# avatar-chat-app-mobile

This is a react native application to allow the the mobile application of the avatar-chat-app

---

Main Features:
🎯 Avatar Management

Create, view, and delete avatars
Store avatar images, descriptions, and associated files
Persistent avatar data with documents and images

📸 Camera Integration

Real-time camera view with overlay interface
Face detection simulation (can be integrated with ML Kit or similar)
Capture photos for avatar creation
Visual scan frame for better UX

💬 Chat Functionality

Individual chat sessions per avatar
Text messaging with avatar responses
Voice message recording and playback
System messages for file uploads

📁 File Management

Document and image upload support
File type detection and categorization
File size formatting and display

🎨 Modern UI/UX

Gradient backgrounds with glassmorphism effects
Smooth animations and transitions
Responsive design for different screen sizes
Intuitive navigation between views

Key Camera Features:

Face Recognition Flow: Point camera at person → Detect if avatar exists → Either chat with existing avatar or create new one
Visual Feedback: Scan frame overlay and instructional text
Permission Handling: Automatic camera permission requests
Image Capture: High-quality photo capture for avatar creation

Usage Flow:

Start: View list of existing avatars
Camera Mode: Tap camera icon to scan for people
Detection: App simulates face recognition (integrate with ML service)
Action: Either chat with detected avatar or create new one
Chat: Full-featured messaging with voice and file support

The app maintains the same functionality as the original web version while adding the requested camera-based avatar detection feature. The face recognition is currently simulated but can be easily integrated with services like Google ML Kit, AWS Rekognition, or custom ML models.
