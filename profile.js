// Profile menu, editor, avatar, and points display for Velos.
(() => {
  const cfg = window.VELOS_CONFIG;
  if (!cfg?.supabaseUrl || !cfg?.supabaseAnonKey || !window.supabase) return;
  const db = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });
  const $ = (selector, root = document) => root.querySelector(selector);
  const escapeHTML = value => String(value || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const initials = name => String(name || 'V').trim().split(/\s+/).slice(0,2).map(p => p[0] || '').join('').toUpperCase() || 'V';
  let user = null;
  let profile = null;
  let selectedAvatar = null;

  const menu = document.createElement('section');
  menu.className = 'account-menu hidden';
  menu.id = 'account-menu';
  menu.setAttribute('aria-label','Account menu');
  menu.innerHTML = `<div class="account-menu-profile"><div class="account-menu-avatar" id="menu-avatar">V</div><div class="account-menu-identity"><strong id="menu-name">Velos member</strong><span id="menu-username">@member</span></div></div>
    <div class="account-menu-points"><span class="points-icon">✳</span><span><strong id="menu-points">0</strong><small>Velos points</small></span><span class="points-caption">+1 per message</span></div>
    <button class="account-menu-action" id="menu-edit-profile" type="button"><span>✎</span> Edit profile <b>→</b></button>
    <button class="account-menu-logout" id="menu-signout" type="button">Sign out <span>↗</span></button>`;
  document.body.append(menu);

  const modal = document.createElement('dialog');
  modal.className = 'modal profile-modal'; modal.id = 'profile-modal';
  modal.innerHTML = `<button class="modal-close" type="button" aria-label="Close profile">×</button><p class="section-kicker">YOUR VELOS IDENTITY</p><h2>Edit your profile</h2><p class="modal-intro">Your name and picture appear beside your messages.</p>
    <form id="profile-form"><div class="profile-picture-row"><div class="profile-picture-preview" id="profile-preview">V</div><div><label class="upload-button" for="profile-avatar-file">Change picture</label><input id="profile-avatar-file" class="sr-only" type="file" accept="image/png,image/jpeg,image/webp,image/gif"><small>JPG, PNG, WebP or GIF · up to 3 MB</small></div></div>
    <div class="form-field"><label for="profile-name">Display name</label><input id="profile-name" maxlength="40" required></div><div class="form-field"><label for="profile-handle">Username</label><div class="username-input"><span>@</span><input id="profile-handle" minlength="3" maxlength="24" pattern="[A-Za-z0-9_]+" required></div><small class="username-help">3–24 letters, numbers, or underscores.</small></div>
    <p class="profile-email" id="profile-email"></p><p class="form-error" id="profile-error" role="alert"></p><button class="primary-button full" type="submit" id="profile-save">Save changes <span>↗</span></button></form>`;
  document.body.append(modal);

  function toast(message) {
    let node = $('#toast');
    if (!node) { node = document.createElement('div'); node.id='profile-toast'; node.className='toast'; node.setAttribute('role','status'); document.body.append(node); }
    node.textContent=message; node.classList.add('visible'); clearTimeout(toast.timer); toast.timer=setTimeout(()=>node.classList.remove('visible'),2800);
  }
  function isVerified() { return Boolean(user?.email_confirmed_at || user?.confirmed_at); }
  function imageOrInitials(url,name) { return url ? `<img src="${escapeHTML(url)}" alt="">` : escapeHTML(initials(name)); }
  function renderAccount() {
    const trigger=$('#user-avatar');
    if (!trigger) return;
    if (!user) { trigger.classList.add('hidden'); menu.classList.add('hidden'); return; }
    trigger.classList.remove('hidden'); trigger.setAttribute('aria-label','Open account menu'); trigger.setAttribute('aria-haspopup','true'); trigger.setAttribute('aria-expanded',String(!menu.classList.contains('hidden')));
    trigger.innerHTML=imageOrInitials(profile?.avatar_url,profile?.display_name || user.user_metadata?.display_name || user.email);
    $('#menu-avatar').innerHTML=imageOrInitials(profile?.avatar_url,profile?.display_name || 'V');
    $('#menu-name').textContent=profile?.display_name || user.user_metadata?.display_name || 'Velos member';
    $('#menu-username').textContent=profile?.username ? `@${profile.username}` : '@member';
    $('#menu-points').textContent=Number(profile?.points || 0).toLocaleString();
  }
  async function refreshProfile() {
    const result=await db.auth.getUser(); user=result.data.user;
    if (!user) { profile=null; renderAccount(); return; }
    const {data,error}=await db.from('profiles').select('user_id,username,display_name,avatar_url,points').eq('user_id',user.id).single();
    if (!error) profile=data;
    renderAccount();
  }
  function positionMenu() {
    const trigger=$('#user-avatar');
    if (!trigger || menu.classList.contains('hidden')) return;
    const rect=trigger.getBoundingClientRect();
    const width=Math.min(300,window.innerWidth-24);
    menu.style.width=`${width}px`;
    const left=Math.max(12,Math.min(window.innerWidth-width-12,rect.right-width));
    menu.style.left=`${left}px`;
    menu.style.top=`${Math.min(window.innerHeight-12-menu.offsetHeight,rect.bottom+10)}px`;
  }
  async function toggleMenu(event) {
    event?.preventDefault(); event?.stopPropagation();
    if (!user) { toast('Log in to view your account.'); return; }
    if (menu.classList.contains('hidden')) {
      await refreshProfile(); menu.classList.remove('hidden'); positionMenu();
      $('#user-avatar')?.setAttribute('aria-expanded','true');
    } else closeMenu();
  }
  function closeMenu() { menu.classList.add('hidden'); $('#user-avatar')?.setAttribute('aria-expanded','false'); }
  async function openEditor() {
    closeMenu(); await refreshProfile();
    if (!user) return toast('Log in first to edit your profile.');
    if (!isVerified()) return toast('Verify your email before editing your profile.');
    $('#profile-name').value=profile?.display_name || '';
    $('#profile-handle').value=profile?.username || '';
    $('#profile-email').textContent=`Verified email · ${user.email || ''}`;
    $('#profile-error').textContent=''; $('#profile-avatar-file').value=''; selectedAvatar=null;
    $('#profile-preview').innerHTML=imageOrInitials(profile?.avatar_url,profile?.display_name);
    modal.showModal();
  }
  async function uploadAvatar(file) {
    if (!file) return profile?.avatar_url || null;
    const extensions={'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/gif':'gif'};
    const ext=extensions[file.type];
    if (!ext) throw new Error('Choose a JPG, PNG, WebP, or GIF image.');
    if (file.size>3*1024*1024) throw new Error('Profile pictures must be 3 MB or smaller.');
    const path=`${user.id}/${crypto.randomUUID()}.${ext}`;
    const {error}=await db.storage.from('avatars').upload(path,file,{contentType:file.type});
    if (error) throw error;
    return db.storage.from('avatars').getPublicUrl(path).data.publicUrl;
  }

  // Capture these clicks so the chat module's legacy sign-out click handler cannot intercept them.
  document.addEventListener('click',event=>{
    const trigger=event.target.closest('#user-avatar, #mobile-account');
    if (trigger) { event.preventDefault(); event.stopImmediatePropagation(); toggleMenu(event); return; }
    if (!menu.contains(event.target)) closeMenu();
  },true);
  $('#menu-edit-profile').addEventListener('click',openEditor);
  $('#menu-signout').addEventListener('click',async()=>{const {error}=await db.auth.signOut(); if(error){toast(error.message);return;} closeMenu();modal.close();user=null;profile=null;renderAccount();toast('You are signed out.');});
  menu.addEventListener('click',event=>event.stopPropagation());
  modal.querySelector('.modal-close').addEventListener('click',()=>modal.close());
  window.addEventListener('resize',positionMenu); window.addEventListener('scroll',positionMenu,true);
  document.addEventListener('keydown',event=>{if(event.key==='Escape')closeMenu();});
  $('#profile-avatar-file').addEventListener('change',event=>{
    const file=event.target.files?.[0]; if(!file)return;
    if(file.size>3*1024*1024){$('#profile-error').textContent='Profile pictures must be 3 MB or smaller.';event.target.value='';return;}
    selectedAvatar=file; const reader=new FileReader(); reader.onload=()=>$('#profile-preview').innerHTML=`<img src="${reader.result}" alt="Profile picture preview">`; reader.readAsDataURL(file);
  });
  $('#profile-name').addEventListener('input',()=>{if(!selectedAvatar&&!profile?.avatar_url)$('#profile-preview').textContent=initials($('#profile-name').value);});
  $('#profile-form').addEventListener('submit',async event=>{
    event.preventDefault(); $('#profile-error').textContent='';
    if (!isVerified()) { $('#profile-error').textContent='Verify your email before editing your profile.'; return; }
    const display_name=$('#profile-name').value.trim(), username=$('#profile-handle').value.trim().toLowerCase();
    if(!/^[a-zA-Z0-9_]{3,24}$/.test(username)){ $('#profile-error').textContent='Username must be 3–24 letters, numbers, or underscores.'; return; }
    const button=$('#profile-save'); button.disabled=true; button.textContent='Saving…';
    try {
      const avatar_url=await uploadAvatar(selectedAvatar);
      const {data,error}=await db.from('profiles').update({display_name,username,avatar_url}).eq('user_id',user.id).select('user_id,username,display_name,avatar_url,points').single();
      if(error)throw error;
      profile=data; await db.auth.updateUser({data:{display_name}}); renderAccount(); modal.close(); toast('Profile updated.');
      document.dispatchEvent(new CustomEvent('velos:profile-updated',{detail:profile}));
    } catch(error) { $('#profile-error').textContent=error.code==='23505'?'That username is already taken. Choose another.':(error.message || 'Could not save your profile.'); }
    finally {button.disabled=false;button.innerHTML='Save changes <span>↗</span>';}
  });
  db.auth.onAuthStateChange((_event,session)=>{user=session?.user || null; if(!user){profile=null;closeMenu();} setTimeout(refreshProfile,0);});
  refreshProfile();
})();
