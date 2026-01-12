export const experimentGate = {
  key: (uid, simKey) => `prelim:${uid}:${simKey}`,
  isComplete: (uid, simKey) => Boolean(localStorage.getItem(`prelim:${uid}:${simKey}`)),
  complete: (uid, simKey, payload) => {
    localStorage.setItem(`prelim:${uid}:${simKey}` , JSON.stringify(payload));
  },
  read: (uid, simKey) => {
    const raw = localStorage.getItem(`prelim:${uid}:${simKey}`);
    return raw ? JSON.parse(raw) : null;
  },
};
