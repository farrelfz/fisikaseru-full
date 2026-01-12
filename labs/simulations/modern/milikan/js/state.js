export const state = {
  simKey: 'modern/milikan',
  defaultUser: 'guest',
  getUserId: () => localStorage.getItem('fs_user') || 'guest',
  setUserId: (uid) => localStorage.setItem('fs_user', uid),
  apiBase: window.FS_API_BASE || 'http://localhost:4000',
};
