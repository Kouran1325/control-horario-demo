// Select reutilizable para respuestas públicas de User.
// Usado por login, me, avatar, admin users...

export const userPublicSelect = {
  id: true,
  email: true,
  name: true,
  avatarUrl: true,
  role: true,
  enabled: true,

  privacyInfoAcceptedAt: true,
  privacyInfoVersion: true,

  createdAt: true,
  updatedAt: true,
};

export const userAdminSelect = {
  ...userPublicSelect,
};