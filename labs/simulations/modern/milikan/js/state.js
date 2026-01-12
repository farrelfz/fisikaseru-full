export const state = {
  simKey: 'modern/milikan',
  defaultUser: 'guest',
  getUserId: () => localStorage.getItem('fs_user') || 'guest',
  setUserId: (uid) => localStorage.setItem('fs_user', uid),
};
