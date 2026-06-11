(function () {
  var chatOpen = false;
  var chatContainer = null;
  var messages = [];
  var sessionId = 'chat_' + Math.random().toString(36).slice(2, 10);
  var browserLang = (navigator.language || 'en').split('-')[0];

  function createChatWidget() {
    var btn = document.createElement('div');
    btn.id = 'cw-btn';
    btn.innerHTML = '💬';
    btn.style.cssText =
      'position:fixed;bottom:24px;right:24px;width:56px;height:56px;background:#00d4ff;border:none;border-radius:50%;cursor:pointer;font-size:26px;z-index:9999;box-shadow:0 4px 20px rgba(0,212,255,0.3);display:flex;align-items:center;justify-content:center;transition:transform 0.2s';
    btn.onmouseenter = function () { btn.style.transform = 'scale(1.1)' };
    btn.onmouseleave = function () { btn.style.transform = 'scale(1)' };
    btn.onclick = toggleChat;
    document.body.appendChild(btn);

    chatContainer = document.createElement('div');
    chatContainer.id = 'cw-box';
    chatContainer.style.cssText =
      'position:fixed;bottom:92px;right:24px;width:360px;height:500px;background:#1a1a1a;border-radius:16px;border:1px solid #2a2a2a;display:none;flex-direction:column;z-index:9999;box-shadow:0 8px 40px rgba(0,0,0,0.5);overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif';
    chatContainer.innerHTML =
      '<div style="padding:14px 18px;background:#0f0f0f;border-bottom:1px solid #2a2a2a;display:flex;align-items:center;gap:10px">' +
      '<div style="width:30px;height:30px;background:#00d4ff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;color:#000;font-size:14px">A</div>' +
      '<div style="flex:1"><div style="font-weight:600;color:#fff;font-size:14px">Alex</div><div style="font-size:11px;color:#00d4ff">Online</div></div>' +
      '<span style="font-size:10px;color:#666;background:#0f0f0f;padding:2px 6px;border-radius:8px;border:1px solid #2a2a2a">🌐 ' + browserLang.toUpperCase() + '</span>' +
      '<button onclick="toggleChat()" style="background:transparent;border:none;color:#a0a0a0;cursor:pointer;font-size:20px;padding:0">✕</button>' +
      '</div>' +
      '<div id="cw-msgs" style="flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:8px;background:#1a1a1a">' +
      '<div style="text-align:center;color:#666;padding:30px 10px;font-size:13px">' +
      '<div style="font-size:36px;margin-bottom:10px">👋</div><p style="margin:0 0 6px">Hi! I\'m Alex, your sales assistant.</p>' +
      '<p style="margin:0">Looking for a trial or a paid plan?</p>' +
      '</div>' +
      '</div>' +
      '<div style="padding:10px 12px;border-top:1px solid #2a2a2a;display:flex;gap:8px;background:#1a1a1a">' +
      '<input id="cw-input" type="text" placeholder="Type a message..." style="flex:1;padding:10px 12px;border-radius:8px;border:1px solid #2a2a2a;background:#0f0f0f;color:#fff;font-size:13px;outline:none">' +
      '<button id="cw-send" style="padding:10px 16px;background:#00d4ff;color:#000;border:none;border-radius:8px;font-weight:600;cursor:pointer;font-size:13px">Send</button>' +
      '</div>';
    document.body.appendChild(chatContainer);

    document.getElementById('cw-input').addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMsg(); }
    });
    document.getElementById('cw-send').addEventListener('click', sendMsg);
  }

  function sendMsg() {
    var input = document.getElementById('cw-input');
    var text = input.value.trim();
    if (!text) return;
    input.value = '';
    addMsg('user', text);
    var sendBtn = document.getElementById('cw-send');
    sendBtn.disabled = true;
    sendBtn.style.opacity = '0.5';

    // Client-side escalation detection
    var textLower = text.toLowerCase();
    var escalateWords = ['human','agent','real person','speak to someone','talk to human','personne','humain','conseiller','شخص','بشري'];
    if (escalateWords.some(function(w) { return textLower.includes(w); })) {
      addMsg('assistant', "I understand you'd like to speak with a real person. Click the WhatsApp button below to chat with Alex directly! 👇");
      addWhatsAppButton();
      sendBtn.disabled = false;
      sendBtn.style.opacity = '1';
      return;
    }

    fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: sessionId, message: text, pageUrl: window.location.href, language: browserLang }),
    })
      .then(function (r) { return r.json() })
      .then(function (data) {
        addMsg('assistant', data.reply || "I'm here to help! What are you looking for?");
        if (data.can_escalate) {
          addWhatsAppButton();
        }
      })
      .catch(function () {
        addMsg('assistant', "Sorry, I'm having trouble. Please try again.");
        addWhatsAppButton();
      })
      .finally(function () {
        sendBtn.disabled = false;
        sendBtn.style.opacity = '1';
      });
  }

  function addMsg(role, text) {
    var msgs = document.getElementById('cw-msgs');
    var div = document.createElement('div');
    div.style.cssText =
      'max-width:80%;padding:10px 14px;border-radius:12px;font-size:13px;line-height:1.5;white-space:pre-wrap;' +
      (role === 'user'
        ? 'align-self:flex-end;background:#00d4ff;color:#000'
        : 'align-self:flex-start;background:#2a2a2a;color:#fff');
    div.textContent = text;
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
  }

  function addWhatsAppButton() {
    var msgs = document.getElementById('cw-msgs');
    var existing = document.getElementById('cw-wa-btn');
    if (existing) return;
    var wa = document.createElement('a');
    wa.id = 'cw-wa-btn';
    wa.href = 'https://wa.me/31687402093';
    wa.target = '_blank';
    wa.rel = 'noreferrer';
    wa.textContent = '💬 Talk to Alex (WhatsApp)';
    wa.style.cssText =
      'display:block;text-align:center;margin:8px 0;padding:10px 14px;background:#25D366;color:#fff;border-radius:8px;font-weight:700;text-decoration:none;font-size:13px;align-self:center;max-width:90%';
    msgs.appendChild(wa);
    msgs.scrollTop = msgs.scrollHeight;
  }

  function toggleChat() {
    chatOpen = !chatOpen;
    chatContainer.style.display = chatOpen ? 'flex' : 'none';
    var btn = document.getElementById('cw-btn');
    if (btn) btn.innerHTML = chatOpen ? '✕' : '💬';
    if (chatOpen) {
      document.getElementById('cw-input').focus();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createChatWidget);
  } else {
    createChatWidget();
  }
})();
