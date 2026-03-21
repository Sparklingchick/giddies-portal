// ═══════════════════════════════════════════════════════════
//  GX-REALTIME.JS — Live Chat + Online Presence
//  Real-time sync via Supabase channels
// ═══════════════════════════════════════════════════════════

const GXRealtime = (() => {

  let _channels = {};
  let _presenceChannel = null;

  // ══════════════════════════════════════
  //  PRESENCE — Who's Online
  // ══════════════════════════════════════

  function startPresenceTracking() {
    const sb = GXAuth.getSB();
    const sess = GXAuth.getSession();
    if (!sb || !sess) {
      // Fallback: localStorage-based presence
      _updateLocalPresence(sess);
      setInterval(() => _updateLocalPresence(GXAuth.getSession()), 12000);
      return;
    }

    // Supabase Presence channel
    _presenceChannel = sb.channel('portal-presence', {
      config: { presence: { key: sess.email } }
    });

    _presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = _presenceChannel.presenceState();
        _renderOnlineCount(Object.keys(state).length);
        if (typeof onPresenceUpdate === 'function') onPresenceUpdate(state);
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        console.log('Joined:', newPresences.map(p => p.name).join(', '));
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        console.log('Left:', leftPresences.map(p => p.name).join(', '));
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await _presenceChannel.track({
            name:  sess.name,
            role:  sess.role,
            dept:  sess.department || '',
            email: sess.email,
            page:  document.title,
            ts:    Date.now(),
          });
        }
      });
  }

  function _updateLocalPresence(sess) {
    if (!sess) return;
    try {
      const p = JSON.parse(localStorage.getItem('gx_presence') || '{}');
      p[sess.email] = { name: sess.name, role: sess.role, dept: sess.department || '', ts: Date.now() };
      localStorage.setItem('gx_presence', JSON.stringify(p));
      const online = Object.values(p).filter(v => Date.now() - v.ts < 45000);
      _renderOnlineCount(online.length);
    } catch(e) {}
  }

  function _renderOnlineCount(count) {
    const el = document.getElementById('onlineCount');
    if (el) el.textContent = count + ' online';
  }

  function getOnlineList() {
    if (_presenceChannel) {
      const state = _presenceChannel.presenceState();
      return Object.values(state).flat().map(p => ({
        name:  p.name,
        role:  p.role,
        dept:  p.dept,
        email: p.email,
        page:  p.page,
      }));
    }
    // localStorage fallback
    try {
      const p = JSON.parse(localStorage.getItem('gx_presence') || '{}');
      return Object.values(p).filter(v => Date.now() - v.ts < 45000);
    } catch(e) { return []; }
  }

  function stopPresence() {
    if (_presenceChannel) {
      _presenceChannel.unsubscribe();
      _presenceChannel = null;
    }
  }

  // ══════════════════════════════════════
  //  REAL-TIME CHAT
  // ══════════════════════════════════════

  function subscribeToRoom(roomId, onMessage) {
    const sb = GXAuth.getSB();
    if (!sb) return null;

    // Unsubscribe from existing channel for this room
    if (_channels['chat:' + roomId]) {
      _channels['chat:' + roomId].unsubscribe();
    }

    const channel = sb.channel('chat:' + roomId)
      .on('postgres_changes', {
        event:  'INSERT',
        schema: 'public',
        table:  'messages',
        filter: `room_id=eq.${roomId}`,
      }, payload => {
        onMessage(payload.new);
      })
      .subscribe();

    _channels['chat:' + roomId] = channel;
    return channel;
  }

  function unsubscribeFromRoom(roomId) {
    const key = 'chat:' + roomId;
    if (_channels[key]) {
      _channels[key].unsubscribe();
      delete _channels[key];
    }
  }

  // ══════════════════════════════════════
  //  REAL-TIME NOTIFICATIONS
  // ══════════════════════════════════════

  function subscribeToNotifications(employeeId, onNotification) {
    const sb = GXAuth.getSB();
    if (!sb) return null;

    const key = 'notifs:' + employeeId;
    if (_channels[key]) _channels[key].unsubscribe();

    const channel = sb.channel(key)
      .on('postgres_changes', {
        event:  'INSERT',
        schema: 'public',
        table:  'notifications',
        filter: `employee_id=eq.${employeeId}`,
      }, payload => {
        onNotification(payload.new);
        // Show toast
        GXUtils.toast(payload.new.title + ': ' + payload.new.message, payload.new.type || 'in');
        // Update notification badge
        const dot = document.querySelector('.red-dot');
        if (dot) dot.style.display = 'block';
      })
      .subscribe();

    _channels[key] = channel;
    return channel;
  }

  // ══════════════════════════════════════
  //  REAL-TIME LEAVE UPDATES
  // ══════════════════════════════════════

  function subscribeToLeaveUpdates(employeeId, onUpdate) {
    const sb = GXAuth.getSB();
    if (!sb) return null;

    const key = 'leave:' + employeeId;
    if (_channels[key]) _channels[key].unsubscribe();

    const channel = sb.channel(key)
      .on('postgres_changes', {
        event:  'UPDATE',
        schema: 'public',
        table:  'leave_requests',
        filter: `employee_id=eq.${employeeId}`,
      }, payload => {
        onUpdate(payload.new);
      })
      .subscribe();

    _channels[key] = channel;
    return channel;
  }

  // ══════════════════════════════════════
  //  CLEANUP
  // ══════════════════════════════════════

  function cleanup() {
    stopPresence();
    Object.values(_channels).forEach(ch => ch.unsubscribe());
    _channels = {};
  }

  window.addEventListener('beforeunload', cleanup);

  // ── PUBLIC API ──
  return {
    startPresenceTracking,
    getOnlineList,
    stopPresence,
    subscribeToRoom,
    unsubscribeFromRoom,
    subscribeToNotifications,
    subscribeToLeaveUpdates,
    cleanup,
  };

})();
