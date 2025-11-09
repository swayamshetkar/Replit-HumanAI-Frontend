/* PersonaAI + HumanAI Integration */

// Tiny toast
function toast(msg){
  const t=document.createElement('div');
  t.textContent=msg;
  Object.assign(t.style,{
    position:'fixed',bottom:'20px',right:'20px',zIndex:100,
    background:'var(--accent)',color:'#fff',padding:'10px 14px',
    borderRadius:'12px',boxShadow:'0 10px 30px rgba(0,0,0,.3)'
  });
  document.body.appendChild(t);
  setTimeout(()=>t.remove(),1400);
}

function getEmotionEmoji(emotion) {
  const emojiMap = {
    happy: "😊",
    frustrated: "😠",
    neutral: "😐"
  };
  return emojiMap[emotion] || "🤔";
}

/* ===== SIDEBAR (global) ===== */
function initSidebar(){
  const sidebar=document.getElementById('sidebar');
  const backdrop=document.getElementById('backdrop');
  const openBtn=document.getElementById('sidebarOpen');
  const closeBtn=document.getElementById('sidebarClose');
  if(!sidebar) return;

  function pinSidebar(pinned){
    if(pinned){
      sidebar.classList.add('pinned');
      document.body.classList.add('with-sidebar');
      backdrop && backdrop.classList.remove('show');
      sidebar.classList.remove('open');
    } else {
      sidebar.classList.remove('pinned');
      document.body.classList.remove('with-sidebar');
    }
  }

  function updatePinned(){
    const shouldPin = window.innerWidth >= 1100;
    pinSidebar(shouldPin);
  }

  openBtn && openBtn.addEventListener('click',()=>{
    // Toggle behavior: if pinned, unpin/close; if open, close; else open
    if(sidebar.classList.contains('pinned')){
      sidebar.classList.remove('pinned');
      document.body.classList.remove('with-sidebar');
      sidebar.classList.remove('open');
      backdrop && backdrop.classList.remove('show');
      return;
    }
    if(sidebar.classList.contains('open')){
      sidebar.classList.remove('open');
      backdrop && backdrop.classList.remove('show');
    } else {
      sidebar.classList.add('open');
      backdrop && backdrop.classList.add('show');
    }
  });
  closeBtn && closeBtn.addEventListener('click',()=>{
    if(sidebar.classList.contains('pinned')){
      pinSidebar(false);
    }
    sidebar.classList.remove('open');
    backdrop && backdrop.classList.remove('show');
  });
  backdrop && backdrop.addEventListener('click',()=>{
    sidebar.classList.remove('open');
    backdrop.classList.remove('show');
  });

  window.addEventListener('resize', updatePinned);
  updatePinned();
}

/* ===== HOME PAGE ===== */
function initHome(){
  if(!document.getElementById('homePage')) return;

  // Accordion
  document.querySelectorAll('[data-acc]').forEach(btn=>{
    btn.addEventListener('click',()=>{
      const id=btn.getAttribute('data-acc');
      document.getElementById('acc-'+id).classList.toggle('hidden');
    });
  });

  // History handlers
  const histSession = document.getElementById('historySession');
  const histLoad = document.getElementById('historyLoadBtn');
  const histClear = document.getElementById('historyClearBtn');
  const histList = document.getElementById('historyList');

  if(histSession){
    histSession.value = localStorage.getItem('persona_session_id') || '';
    histSession.addEventListener('change', e => localStorage.setItem('persona_session_id', e.target.value));
  }

  function renderHistory(data){
    if(!histList) return;
    const messages = normalizeHistory(data);
    if(!messages.length){
      histList.classList.remove('hidden');
      histList.innerHTML = '<div class="muted">No messages found for this session.</div>';
      return;
    }
    const roleAvatar = (r)=> r==='user'?'🧑':'🤖';
    histList.classList.remove('hidden');
    histList.innerHTML = messages.map(m=>{
      const safe = (m.content||'').replace(/</g,'&lt;');
      const meta = [m.time||m.timestamp||''].filter(Boolean).join(' · ');
      return `<div class="history-item">
        <div class="avatar">${roleAvatar((m.role||'ai').toLowerCase())}</div>
        <div class="bubble">
          <div>${safe}</div>
          ${meta?`<div class="meta">${meta}</div>`:''}
        </div>
      </div>`;
    }).join('');
  }

  function normalizeHistory(payload){
    // Try common shapes: payload.reply (json), payload.raw, payload.data
    const p = (payload && (payload.reply||payload.data||payload)) || {};
    const tryArrays = [p.history, p.entries, p.messages, p.conversation, p.chats, p];
    for(const arr of tryArrays){
      if(Array.isArray(arr)){
        return arr.map(x=>{
          if(typeof x==='string') return { role:'ai', content:x };
          const role = x.role || x.author || x.speaker || (x.is_user? 'user' : 'ai');
          const content = x.content || x.text || x.message || '';
          return { role, content, time: x.time || x.timestamp || x.created_at };
        });
      }
    }
    // If object with array under p.data
    if(Array.isArray(p.data)){
      return p.data.map(x=>({ role: x.role||'ai', content: x.content||'' }));
    }
    return [];
  }

  histLoad && histLoad.addEventListener('click', async ()=>{
    const sid = (histSession?.value||'').trim();
    if(!sid){ toast('Enter session id'); return; }
    try{
      const { getHistory } = await import('/src/api/backend.js');
      const res = await getHistory(sid);
      if(!res.ok){ toast('⚠️ Failed to load'); }
      renderHistory(res.reply ?? res.data ?? res);
    }catch(e){ toast('Error: '+(e?.message||e)); }
  });
  histClear && histClear.addEventListener('click', ()=>{
    if(histList){ histList.innerHTML=''; histList.classList.add('hidden'); }
  });

  // Camera controls
  const camera = document.getElementById('camera');
  const toggleCameraBtn = document.getElementById('toggleCamera');
  let cameraActive = false;

  toggleCameraBtn.addEventListener('click', async () => {
    if (!cameraActive) {
      try {
        await window.HumanAI.initCamera(camera);
        camera.style.display = 'block';
        toggleCameraBtn.textContent = 'Stop Camera';
        cameraActive = true;
        toast('📹 Camera started');
      } catch (e) {
        toast('Camera error: ' + (e?.message || 'Permission denied'));
      }
    } else {
      window.HumanAI.stopCamera(camera);
      camera.style.display = 'none';
      toggleCameraBtn.textContent = 'Start Camera';
      cameraActive = false;
      toast('Camera stopped');
    }
  });

  // Mode selector (Code / Study / Refactor)
  const promptInput = document.getElementById('prompt');
  const modeButtons = Array.from(document.querySelectorAll('.mode-btn'));
  const MODE_KEY = 'persona_mode';
  const placeholders = {
    code: 'Describe what you want to build or fix…',
    study: 'What topic do you want to learn today?',
    refactor: 'Paste code or describe the refactor you want…'
  };
  
  function applyMode(mode){
    modeButtons.forEach(b=>{
      const is = b.getAttribute('data-mode')===mode;
      b.classList.toggle('active', is);
      b.setAttribute('aria-selected', String(is));
    });
    localStorage.setItem(MODE_KEY, mode);
    if(promptInput && placeholders[mode]){
      promptInput.placeholder = placeholders[mode];
    }
  }
  
  modeButtons.forEach(btn=>{
    btn.addEventListener('click',()=>applyMode(btn.getAttribute('data-mode')));
  });
  
  // Init mode from storage or default
  applyMode(localStorage.getItem(MODE_KEY) || 'study');

  // Chat thread behavior
  const messagesEl = document.getElementById('messages');
  const sendBtn = document.getElementById('send');
  const emotionText = document.getElementById('emotion-text');
  const confidenceText = document.getElementById('confidence-text');
  const sourceText = document.getElementById('source-text');
  
  function el(tag, cls, text){
    const e = document.createElement(tag);
    if(cls) e.className = cls;
    if(typeof text === 'string') e.textContent = text;
    return e;
  }
  
  function appendMessage(kind, text, meta = null){
    if(!messagesEl) return;
    const wrap = el('div', `msg ${kind}`);
    const avatar = el('div', 'avatar', kind==='user'?'🧑':'🤖');
    const bubble = el('div','bubble');
    bubble.textContent = text;
    
    // Add metadata to AI message
    if (kind === 'ai' && meta) {
      const metaDiv = el('div', 'meta');
      metaDiv.innerHTML = `<span>😊 ${meta.emotion}</span><span>📊 ${(meta.emotionConfidence*100).toFixed(0)}%</span><span>🔍 ${meta.emotionSource}</span>`;
      bubble.appendChild(metaDiv);
    }
    
    wrap.appendChild(avatar);
    wrap.appendChild(bubble);
    messagesEl.appendChild(wrap);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }
  
  function typingOn(){
    if(!messagesEl) return null;
    const wrap = el('div','msg ai');
    const avatar = el('div','avatar','🤖');
    const bubble = el('div','bubble');
    const dots = el('span');
    dots.innerHTML = 'Typing…';
    bubble.appendChild(dots);
    wrap.appendChild(avatar);wrap.appendChild(bubble);
    messagesEl.appendChild(wrap);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return wrap;
  }
  
  function typingOff(node){ if(node && node.parentNode) node.parentNode.removeChild(node); }

  function currentMode(){
    return (localStorage.getItem(MODE_KEY) || 'study');
  }

  async function sendPrompt(){
    const val = (promptInput?.value || '').trim();
    if(!val) { toast('Type something to send'); return; }
    
    // On first send: transition layout
    const mainSection = document.getElementById('mainSection');
    if(mainSection && mainSection.classList.contains('initial-state')){
      mainSection.classList.remove('initial-state');
      mainSection.classList.add('chatting');
      if(messagesEl) {
        messagesEl.classList.remove('hidden');
      }
    }
    
    appendMessage('user', val);
    if(promptInput) promptInput.value='';
    const node = typingOn();
    
    // Update emotion status
    if (emotionText) emotionText.textContent = 'Detecting...';
    
    try {
      const mode = currentMode();
      const useCamera = cameraActive && camera.srcObject;
      
      // Call HumanAI bridge: analyze + send to backend
      const result = await window.HumanAI.analyzeAndSend({
        mode,
        text: val,
        videoEl: useCamera ? camera : null,
        useCamera
      });
      
      typingOff(node);
      
      // Update emotion display in sidebar
      if (result.metadata) {
        const { emotion, emotionConfidence, emotionSource } = result.metadata;
        if (emotionText) emotionText.textContent = `${emotion.toUpperCase()} ${getEmotionEmoji(emotion)}`;
        if (confidenceText) confidenceText.textContent = `${(emotionConfidence * 100).toFixed(0)}%`;
        if (sourceText) sourceText.textContent = emotionSource;
      }
      
      // Show AI reply
      const replyText = typeof result.reply === 'string' ? result.reply : JSON.stringify(result.reply);
      appendMessage('ai', replyText, result.metadata);
      
    } catch (e) {
      typingOff(node);
      appendMessage('ai', `Error: ${e?.message || e}`);
      toast('Failed to send');
    }
  }

  if(sendBtn) sendBtn.addEventListener('click', sendPrompt);
  if(promptInput){
    promptInput.addEventListener('keydown',(e)=>{
      if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); sendPrompt(); }
    });
  }

  // Fill Personal Info
  const email = localStorage.getItem('persona_email') || 'guest@example.com';
  const emailEl = document.getElementById('infoEmail');
  if(emailEl) emailEl.textContent = email;

  // Sidebar personalization mirrors
  const sidebarText= document.getElementById('sidebarText');
  const sidebarCode= document.getElementById('sidebarCode');

  // Load saved personalization
  const savedText = localStorage.getItem('persona_pref_text') || '';
  const savedCode = localStorage.getItem('persona_code_snippet') || '';

  if(sidebarText) sidebarText.value = savedText;
  if(sidebarCode) sidebarCode.value = savedCode;

  // Enable editing directly from sidebar (live-save to localStorage)
  if(sidebarText){
    sidebarText.addEventListener('input', (e)=>{
      const v = e.target.value;
      localStorage.setItem('persona_pref_text', v);
    });
  }
  if(sidebarCode){
    sidebarCode.addEventListener('input', (e)=>{
      const v = e.target.value;
      localStorage.setItem('persona_code_snippet', v);
    });
  }

  // Guided onboarding (first run): text then code
  const GUIDE_KEY = 'persona_guide_done';
  const modal1 = document.getElementById('guideModal1');
  const modal2 = document.getElementById('guideModal2');
  const g1Upload = document.getElementById('guide1UploadBtn');
  const g1Skip = document.getElementById('guide1SkipBtn');
  const g2Upload = document.getElementById('guide2UploadBtn');
  const g2UploadNow = document.getElementById('guide2UploadNowBtn');
  const g2Skip = document.getElementById('guide2SkipBtn');
  const guideText = document.getElementById('guideText');
  const guideDrop = document.getElementById('guideDrop');
  const guideFilesInput = document.getElementById('guideFiles');
  const guideFilesList = document.getElementById('guideFilesList');
  let guideFiles = [];

  function showModal(modal){
    if(!modal) return;
    document.body.classList.add('guide-active');
    modal.classList.add('show');
  }
  function hideModal(modal){
    if(!modal) return;
    modal.classList.remove('show');
    // If no other guide modal is visible, release the blur lock
    const anyShown = document.querySelector('.modal.show');
    if(!anyShown){ document.body.classList.remove('guide-active'); }
  }
  function openSidebarAndExpandPersonalization(){
    const sidebar = document.getElementById('sidebar');
    const backdrop = document.getElementById('backdrop');
    if(!sidebar.classList.contains('pinned')){
      sidebar.classList.add('open');
      backdrop && backdrop.classList.add('show');
    }
    // Expand the personalization panel
    const btn = document.querySelector('[data-acc="pers"]');
    const panel = document.getElementById('acc-pers');
    if(btn && panel && panel.classList.contains('hidden')){ btn.click(); }
  }

  function startGuide(){
    // Slight delay to avoid layout shift
    setTimeout(()=> showModal(modal1), 350);
  }

  // Guide actions
  g1Upload && g1Upload.addEventListener('click', async ()=>{
    const val = (guideText?.value || '').trim();
    if(!val){ toast('Enter personal text'); return; }
    try {
      const { trainPersonal } = await import('/src/api/backend.js');
      const res = await trainPersonal(val);
      toast(res.ok ? '✅ Text uploaded' : '⚠️ Upload failed');
    } catch(e){ toast('Error: '+(e?.message||e)); }
    hideModal(modal1);
    showModal(modal2);
  });
  g1Skip && g1Skip.addEventListener('click', ()=>{
    hideModal(modal1);
    showModal(modal2);
  });

  g2Upload && g2Upload.addEventListener('click', ()=>{
    guideFilesInput && guideFilesInput.click();
  });

  // Drag & drop handling for guide modal 2
  function renderGuideFiles(){
    if(!guideFilesList) return;
    if(!guideFiles.length){ guideFilesList.classList.add('hidden'); guideFilesList.innerHTML=''; return; }
    guideFilesList.classList.remove('hidden');
    guideFilesList.innerHTML = guideFiles.map((f,i)=>`<div class=\"file-item\">${f.filename}<button data-remove=\"${i}\" class=\"btn\" style=\"padding:4px 8px;font-size:11px;margin-left:8px\">✕</button></div>`).join('');
  }
  guideFilesList && guideFilesList.addEventListener('click', e => {
    const idx = e.target.getAttribute('data-remove');
    if(idx){ guideFiles.splice(Number(idx),1); renderGuideFiles(); }
  });
  function handleGuideFiles(fileList){
    const arr = Array.from(fileList);
    arr.forEach(f=>{
      const reader = new FileReader();
      reader.onload = ev => {
        guideFiles.push({ filename:f.name, content: ev.target.result });
        renderGuideFiles();
      };
      reader.readAsText(f);
    });
  }
  guideFilesInput && guideFilesInput.addEventListener('change', e => {
    handleGuideFiles(e.target.files);
    guideFilesInput.value='';
  });
  ['dragenter','dragover'].forEach(ev=>{
    guideDrop && guideDrop.addEventListener(ev, e => { e.preventDefault(); guideDrop.classList.add('dragover'); });
  });
  ['dragleave','drop'].forEach(ev=>{
    guideDrop && guideDrop.addEventListener(ev, e => { e.preventDefault(); guideDrop.classList.remove('dragover'); });
  });
  guideDrop && guideDrop.addEventListener('drop', e => {
    if(e.dataTransfer?.files?.length){ handleGuideFiles(e.dataTransfer.files); }
  });
  guideDrop && guideDrop.addEventListener('click', ()=> guideFilesInput && guideFilesInput.click());
  guideDrop && guideDrop.addEventListener('keydown', e => { if(e.key==='Enter') guideFilesInput && guideFilesInput.click(); });

  g2UploadNow && g2UploadNow.addEventListener('click', async ()=>{
    if(!guideFiles.length){ toast('Select files first'); return; }
    try {
      const { trainModel } = await import('/src/api/backend.js');
      const res = await trainModel({ files: guideFiles });
      toast(res.ok ? '✅ Code uploaded' : '⚠️ Upload failed');
    } catch(e){ toast('Error: '+(e?.message||e)); }
    hideModal(modal2);
    localStorage.setItem(GUIDE_KEY, '1');
  });
  g2Skip && g2Skip.addEventListener('click', ()=>{
    hideModal(modal2);
    localStorage.setItem(GUIDE_KEY, '1');
  });

  // Allow forcing guide via ?guide=1 and reset button
  const params = new URLSearchParams(location.search);
  if(params.get('guide') === '1'){
    localStorage.removeItem(GUIDE_KEY);
  }

  const guideResetBtn = document.getElementById('guideResetBtn');
  if(guideResetBtn){
    guideResetBtn.addEventListener('click', ()=>{
      localStorage.removeItem(GUIDE_KEY);
      startGuide();
    });
  }

  if(localStorage.getItem(GUIDE_KEY) !== '1'){
    startGuide();
  }
}

// ===== PERSONALIZATION HANDLERS (TEXT + CODE) =====
function initPersonalization(){
  const textArea = document.getElementById('sidebarText');
  const textUploadBtn = document.getElementById('personalTextUploadBtn');
  const textEditBtn = document.getElementById('personalTextEditBtn');

  const dropArea = document.getElementById('codeDropArea');
  const fileInput = document.getElementById('codeFileInput');
  const filesList = document.getElementById('codeFilesList');
  const codeUploadBtn = document.getElementById('personalCodeUploadBtn');
  const codeEditBtn = document.getElementById('personalCodeEditBtn');

  let files = []; // {filename, content}
  let editingEnabled = false;

  // Persist text locally
  if(textArea){
    const saved = localStorage.getItem('persona_pref_text') || '';
    textArea.value = saved;
    textArea.addEventListener('input', e => {
      localStorage.setItem('persona_pref_text', e.target.value);
    });
  }

  // Upload personal text
  textUploadBtn && textUploadBtn.addEventListener('click', async () => {
    const val = (textArea?.value || '').trim();
    if(!val){ toast('Enter text first'); return; }
    try {
      const { trainPersonal } = await import('/src/api/backend.js');
      const res = await trainPersonal(val);
      toast(res.ok ? '✅ Text uploaded' : '⚠️ Upload failed');
    } catch(e){ toast('Error: '+ (e?.message||e)); }
  });

  // Toggle editing for text
  textEditBtn && textEditBtn.addEventListener('click', () => {
    if(!textArea) return;
    const disabled = textArea.hasAttribute('disabled');
    if(disabled){
      textArea.removeAttribute('disabled');
      textEditBtn.textContent = 'Disable Edit';
      toast('✏️ Editing enabled');
    } else {
      textArea.setAttribute('disabled','true');
      textEditBtn.textContent = 'Enable Edit';
      toast('🔒 Editing disabled');
    }
  });

  // Helper render file list
  function renderFiles(){
    if(!filesList) return;
    if(!files.length){ filesList.classList.add('hidden'); filesList.innerHTML=''; return; }
    filesList.classList.remove('hidden');
    filesList.innerHTML = files.map((f,i)=>`
      <div class="file-item" data-index="${i}">
        <span style="flex:1;overflow:hidden;text-overflow:ellipsis">${f.filename}</span>
        <button class="btn" data-edit="${i}" style="padding:4px 10px;font-size:12px">Edit</button>
        <button class="btn" data-remove="${i}" style="padding:4px 10px;font-size:12px">✕</button>
      </div>
      ${editingEnabled ? `<textarea class="input" data-content="${i}" rows="4" style="margin-top:6px">${f.content.replace(/</g,'&lt;')}</textarea>`:''}
    `).join('');
  }

  // Enable file selection via click
  dropArea && dropArea.addEventListener('click',()=> fileInput && fileInput.click());
  dropArea && dropArea.addEventListener('keydown', e => { if(e.key==='Enter'){ fileInput && fileInput.click(); }});

  function handleFiles(fileList){
    const arr = Array.from(fileList);
    arr.forEach(f=>{
      const reader = new FileReader();
      reader.onload = e => {
        files.push({ filename: f.name, content: e.target.result });
        renderFiles();
      };
      reader.readAsText(f);
    });
  }

  fileInput && fileInput.addEventListener('change', e => {
    handleFiles(e.target.files);
    fileInput.value='';
  });

  // Drag & drop events
  ['dragenter','dragover'].forEach(ev=>{
    dropArea && dropArea.addEventListener(ev, e => { e.preventDefault(); dropArea.classList.add('dragover'); });
  });
  ['dragleave','drop'].forEach(ev=>{
    dropArea && dropArea.addEventListener(ev, e => { e.preventDefault(); dropArea.classList.remove('dragover'); });
  });
  dropArea && dropArea.addEventListener('drop', e => {
    if(e.dataTransfer?.files?.length){ handleFiles(e.dataTransfer.files); }
  });

  // Global edit toggle for code (show textareas)
  codeEditBtn && codeEditBtn.addEventListener('click', () => {
    editingEnabled = !editingEnabled;
    renderFiles();
    toast(editingEnabled ? '✏️ File editing on' : '🔒 File editing off');
  });

  // Delegate clicks for edit/remove / update content
  filesList && filesList.addEventListener('click', e => {
    const editIdx = e.target.getAttribute('data-edit');
    const removeIdx = e.target.getAttribute('data-remove');
    if(removeIdx){
      files.splice(Number(removeIdx),1);
      renderFiles();
      return;
    }
    if(editIdx && !editingEnabled){
      toast('Enable editing first');
    }
  });
  filesList && filesList.addEventListener('input', e => {
    const idx = e.target.getAttribute('data-content');
    if(idx){ files[Number(idx)].content = e.target.value; }
  });

  // Upload code files to /train
  codeUploadBtn && codeUploadBtn.addEventListener('click', async () => {
    if(!files.length){ toast('No files'); return; }
    try {
      const { trainModel } = await import('/src/api/backend.js');
      const res = await trainModel({ files });
      toast(res.ok ? '✅ Code uploaded' : '⚠️ Upload failed');
    } catch(e){ toast('Error: '+ (e?.message||e)); }
  });
}

document.addEventListener('DOMContentLoaded',()=>{
  initSidebar();
  initHome();
  initPersonalization();
});
