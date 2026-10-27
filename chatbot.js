(() => {
  const launcher = document.getElementById('school-chat-launcher');
  const openSectionButton = document.getElementById('open-school-chat');
  const panel = document.getElementById('school-chat-panel');
  const closeButton = document.getElementById('school-chat-close');
  const form = document.getElementById('school-chat-form');
  const input = document.getElementById('school-chat-input');
  const sendButton = document.getElementById('school-chat-send');
  const messages = document.getElementById('school-chat-messages');
  if (!launcher || !panel || !form || !input || !sendButton || !messages) return;

  // La conversación vive en memoria del navegador y se reinicia al recargar.
  const history = [];
  let busy = false;

  function openChat() {
    panel.hidden = false;
    launcher.setAttribute('aria-expanded', 'true');
    input.focus();
  }
  function closeChat() {
    panel.hidden = true;
    launcher.setAttribute('aria-expanded', 'false');
    launcher.focus();
  }
  function addMessage(text, who, extraClass = '') {
    const bubble = document.createElement('div');
    bubble.className = `school-chat-message ${who}${extraClass ? ` ${extraClass}` : ''}`;
    bubble.textContent = text;
    messages.appendChild(bubble);
    messages.scrollTop = messages.scrollHeight;
    return bubble;
  }
  function setBusy(value) {
    busy = value;
    sendButton.disabled = value;
    input.disabled = value;
    sendButton.textContent = value ? '…' : '➤';
  }

  launcher.addEventListener('click', () => panel.hidden ? openChat() : closeChat());
  openSectionButton?.addEventListener('click', openChat);
  closeButton?.addEventListener('click', closeChat);
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !panel.hidden) closeChat();
  });
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      form.requestSubmit();
    }
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (busy) return;
    const message = input.value.trim();
    if (!message) return;

    addMessage(message, 'user');
    input.value = '';
    setBusy(true);
    const pending = addMessage('Estoy pensando…', 'assistant', 'pending');

    try {
     const response = await fetch('https://escuela-interactiva-chatbot.onrender.com/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          history: history.slice(-12)
        })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'No pude obtener una respuesta. Intentá de nuevo.');
      if (typeof data.reply !== 'string' || !data.reply.trim()) throw new Error('El asistente devolvió una respuesta vacía. Probá otra vez.');
      pending.textContent = data.reply;
      pending.classList.remove('pending');
      history.push({ role: 'user', text: message }, { role: 'model', text: data.reply });
      if (history.length > 20) history.splice(0, history.length - 20);
    } catch (error) {
      pending.textContent = error.message || 'Hubo un error de conexión. Revisá que el servidor esté encendido.';
      pending.classList.remove('pending');
    } finally {
      setBusy(false);
      input.focus();
      messages.scrollTop = messages.scrollHeight;
    }
  });
})();
