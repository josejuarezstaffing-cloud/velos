window.VELOS_CONFIG = {
  // Public browser configuration. Never use a Supabase service_role key here.
  supabaseUrl: "https://dmdwdmgqtskjfxkuujiw.supabase.co",
  supabaseAnonKey: "sb_publishable_GAB4g3KMYmI8N5SBgJx9ew_IxlSF76G"
};

// Load profile UI styles after the app styles, then load the profile module only
// after the deferred chat script has installed its message/profile event handlers.
const profileStyles = document.createElement('link');
profileStyles.rel = 'stylesheet';
profileStyles.href = 'profile.css?v=2';
document.head.append(profileStyles);
const chatAvatarStyles = document.createElement('link');
chatAvatarStyles.rel = 'stylesheet';
chatAvatarStyles.href = 'chat-avatar.css?v=1';
document.head.append(chatAvatarStyles);
document.addEventListener('DOMContentLoaded', () => {
  const profileScript = document.createElement('script');
  profileScript.src = 'profile.js?v=2';
  document.body.append(profileScript);
}, { once: true });
