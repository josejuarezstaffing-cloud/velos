// Profile editor and points display. Uses Supabase Auth and Postgres as the source of truth.
(() => {
  const cfg = window.VELOS_CONFIG;
  if (!cfg?.supabaseUrl || !cfg?.supabaseAnonKey || !window.supabase) return;
  const db = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });
  const $ = (selector, root = document) => root.querySelector(selector);
  const escapeHTML = (value = '') => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let currentUser = null;
  let profile = null;
  let newAvatar = null;

  const modal = document.createElement('dialog');
  modal.className = 'modal profile-modal';
  modal.id = 'profile-modal';
  modal.innerHTML = `<button class="modal-close" type="button" aria-label="Close profile">×</button>
    <p class="section-kicker">YOUR VELOS IDENTITY</p><h2>Your profile</h2>
    <p class="modal-intro">Your name and picture appear beside your messages.</p>
    <form id="profile-form">
      <div class="profile-picture-row"><div class="profile-picture-preview" id="profile-preview">V</div><div><label class="upload-button" for="profile-avatar-file">Change picture</label><input id="profile-avatar-file" class="sr-only" type="file" accept="image/png,image/jpeg,image/webp,image/gif"><small>JPG, PNG, WebP or GIF · up to 3 MB</small></div></div>
      <div class="form-field"><label for="profile-name">Display name</label><input id="profile-name" maxlength="40" required></div>
      <div class="form-field"><label for="profile-handle">Username</label><div class="username-input"><span>@</span><input id="profile-handle" minlength="3" maxlength="24" pattern="[A-Za-z0-9_]+" required><small>3–24 letters, numbers, or underscores.</small></div></div>
      <p class="profile-email" id="profile-email"></p>
      <section class="points-card" aria-label="Your Velos points"><span class="points-star">✳</span><div><strong id="profile-points">0</strong><span>Velos points</span></div><p>+1 point for every message you send in a space.</p></section>
      <p class="form-error" id="profile-error" role="alert"></p><button class="primary-button full" type="submit" id="profile-save">Save profile <span>↗</span></button>
    </form><button class="signout-button" id="profile-signout" type="button">Sign out</button>`;
  document.body.append(modal);

  const initials = name => String(name || 'V').trim().split(/\s+/).slice(0,2).map(p => p[0] || '').join('').toUpperCase() || 'V';
  function flash(message) {
    let toast = $('#toast');
    if (!toast) { toast = document.createElement('div'); toast.id='profile-toast'; toast.className='toast'; toast.setAttribute('role','status'); document.body.append(toast); }
    toast.textContent = message; toast.classList.add('visible'); clearTimeout(flash.timer); flash.timer=setTimeout(()=>toast.classList.remove('visible'),2800);
  }
  function setPreview(url, name) {
    const preview = $('#profile-preview');
    preview.innerHTML = url ? `<img src="${escapeHTML(url)}" alt="Profile picture">` : escapeHTML(initials(name));
  }
  function signedIn() { return Boolean(currentUser); }
  async function loadProfile() {
    currentUser = (await db.auth.getUser()).data.user;
    if (!currentUser) { profile=null; return; }
    const { data, error } = await db.from('profiles').select('user_id,username,display_name,avatar_url,points').eq('user_id',currentUser.id).single();
    if (error) { flash(`Could not load profile: ${error.message}`); return; }
    profile=data;
    const avatarButton = $('#user-avatar');
    if (avatarButton) {
      avatarButton.classList.remove('hidden');
      avatarButton.setAttribute('aria-label','Open profile');
      avatarButton.innerHTML = profile.avatar_url ? `<img src="${escapeHTML(profile.avatar_url)}" alt="">` : escapeHTML(initials(profile.display_name));
    }
  }
  async function openProfile() {
    await loadProfile();
    if (!signedIn()) { flash('Log in first to open your profile.'); return; }
    if (!currentUser.email_confirmed_at && !currentUser.confirmed_at) { flash('Verify your email before editing your profile.'); return; }
    $('#profile-name').value=profile.display_name || '';
    $('#profile-handle').value=profile.username || '';
    $('#profile-points').textContent=Number(profile.points || 0).toLocaleString();
    $('#profile-email').textContent=`Verified email · ${currentUser.email || ''}`;
    $('#profile-error').textContent=''; $('#profile-avatar-file').value=''; newAvatar=null;
    setPreview(profile.avatar_url, profile.display_name); modal.showModal();
  }
  function close() { modal.close(); }
  modal.querySelector('.modal-close').addEventListener('click',close);
  $('#user-avatar')?.addEventListener('click',openProfile);
  $('#mobile-account')?.addEventListener('click',openProfile);
  $('#profile-signout').addEventListener('click',async()=>{const {error}=await db.auth.signOut(); if(error){$('#profile-error').textContent=error.message;return;} close(); flash('You are signed out.');});
  $('#profile-avatar-file').addEventListener('change',event=>{
    const file=event.target.files?.[0]; if(!file)return;
    if(file.size>3*1024*1024){$('#profile-error').textContent='Choose an image smaller than 3 MB.';event.target.value='';return;}
    newAvatar=file; const reader=new FileReader(); reader.onload=()=>setPreview(reader.result,$('#profile-name').value); reader.readAsDataURL(file);
  });
  $('#profile-name').addEventListener('input',()=>{if(!newAvatar&&!profile?.avatar_url)setPreview(null,$('#profile-name').value);});
  $('#profile-form').addEventListener('submit',async event=>{
    event.preventDefault(); $('#profile-error').textContent='';
    const name=$('#profile-name').value.trim(), username=$('#profile-handle').value.trim().toLowerCase();
    if(!currentUser?.email_confirmed_at&&!currentUser?.confirmed_at){$('#profile-error').textContent='Verify your email before editing your profile.';return;}
    if(!/^[a-zA-Z0-9_]{3,24}$/.test(username)){ $('#profile-error').textContent='Username must be 3–24 letters, numbers, or underscores.';return; }
    const button=$('#profile-save'); button.disabled=true; button.textContent='Saving…';
    try {
      let avatar_url=profile.avatar_url || null;
      if(newAvatar){
        const typeExt={'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/gif':'gif'}[newAvatar.type];
        if(!typeExt) throw new Error('Choose a JPG, PNG, WebP, or GIF image.');
        const path=`${currentUser.id}/${crypto.randomUUID()}.${typeExt}`;
        const {error:uploadError}=await db.storage.from('avatars').upload(path,newAvatar,{contentType:newAvatar.type});
        if(uploadError)throw uploadError;
        avatar_url=db.storage.from('avatars').getPublicUrl(path).data.publicUrl;
      }
      const {data,error}=await db.from('profiles').update({display_name:name,username,avatar_url}).eq('user_id',currentUser.id).select('user_id,username,display_name,avatar_url,points').single();
      if(error)throw error;
      profile=data; await db.auth.updateUser({data:{display_name:name}}); await loadProfile(); close(); flash('Profile saved. Your message identity is updated.');
      document.dispatchEvent(new CustomEvent('velos:profile-updated',{detail:profile}));
    } catch(error) {
      $('#profile-error').textContent=error.code==='23505'?'That username is already taken. Choose another.':(error.message || 'Could not save your profile.');
    } finally {button.disabled=false;button.innerHTML='Save profile <span>↗</span>';}
  });
  db.auth.onAuthStateChange((_event,session)=>{currentUser=session?.user || null; if(currentUser)setTimeout(loadProfile,0);else{profile=null;const avatar=$('#user-avatar');avatar?.classList.add('hidden');}});
  loadProfile();
})();
