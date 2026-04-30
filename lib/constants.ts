// Cookie names
export const VIEWER_COOKIE = 'viewer_session';
export const OWNER_COOKIE = 'owner_session';

// JWT issuer claim
export const JWT_ISSUER = 'travel-taste';

// Cookie lifetimes (seconds)
export const VIEWER_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days, rolling
export const OWNER_COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days, absolute

// Rate limits
export const VIEWER_REDEEM_LIMIT = { count: 10, windowSec: 60 };
export const OWNER_LOGIN_LIMIT = { count: 5, windowSec: 600 };

// Upload constraints
export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024; // 20 MB
export const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic']);
export const RESIZE_MAX_EDGE_PX = 2400;

// Storage
export const POSTS_BUCKET = 'posts';
export const SIGNED_URL_TTL_SEC = 60 * 60; // 1 hour
