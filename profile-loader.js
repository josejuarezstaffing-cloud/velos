/* Loads the profile editor on top of the chat app without changing its layout. */
const profileTheme = document.createElement('link');
profileTheme.rel = 'stylesheet';
profileTheme.href = 'profile.css';
document.head.append(profileTheme);
const profileFeature = document.createElement('script');
profileFeature.src = 'profile.js';
document.head.append(profileFeature);
