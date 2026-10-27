export const ROLE_HOME = Object.freeze({
  Patient: '/patient',
  Doctor: '/doctor',
  Admin: '/admin',
});

const ROLE_KEYS = [
  'role',
  'roles',
  'http://schemas.microsoft.com/ws/2008/06/identity/claims/role',
];

const ROLES = {
  patient: 'Patient',
  doctor: 'Doctor',
  admin: 'Admin',
};

export const AUTH_MESSAGES = Object.freeze({
  invalid_token: 'Invalid authentication token. Please sign in again.',
  invalid_role: 'Invalid role claims. Please contact support.',
  missing_role: 'Your account has no supported role. Please contact support.',
  unsupported_role: 'Your account role is not supported. Please contact support.',
  ambiguous_role: 'Your account has conflicting roles. Please contact support.',
  expired: 'Your session has expired. Please sign in again.',
  credentials: 'Invalid email or password.',
  forbidden: 'Unauthorized access. You do not have permission to access this resource.',
  locked: 'Your account is temporarily locked. Please try again later.',
  unconfirmed: 'Please confirm your email before logging in.',
  network: 'Unable to connect to the server.',
  failed: 'Login failed. Please try again.',
  signed_out: 'You have been signed out.',
  cancelled: 'The sign-in attempt was cancelled. Please sign in again.',
});

export class AuthError extends Error {
  constructor(code) {
    super(AUTH_MESSAGES[code] || AUTH_MESSAGES.failed);
    this.name = 'AuthError';
    this.code = code;
  }
}

function decodeSegment(segment) {
  if (!/^[A-Za-z0-9_-]+$/.test(segment) || segment.length % 4 === 1) {
    throw new AuthError('invalid_token');
  }

  const base64 = segment.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(base64);
  const bytes = Uint8Array.from(binary, character => character.charCodeAt(0));
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
}

function parseObject(text) {
  const value = JSON.parse(text);
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new AuthError('invalid_token');
  }

  // JSON.parse silently keeps the last duplicate property. Reject duplicates
  // so two conflicting role or expiration claims cannot hide each other.
  const tokens = text.match(/"(?:[^"\\]|\\.)*"|[{}[\],:]|[^\s{}[\],:]+/g) || [];
  const keys = new Set();
  let depth = 0;

  for (let index = 0; index < tokens.length; index++) {
    const token = tokens[index];

    if (token === '{' || token === '[') {
      depth++;
    } else if (token === '}' || token === ']') {
      depth--;
    } else if (depth === 1 && token.startsWith('"') && tokens[index + 1] === ':') {
      const key = JSON.parse(token);
      if (keys.has(key)) {
        throw new AuthError('invalid_token');
      }
      keys.add(key);
    }
  }

  return value;
}

export function extractRole(claims) {
  const roleNames = [];

  for (const key of ROLE_KEYS) {
    if (!Object.hasOwn(claims, key)) {
      continue;
    }

    const claim = claims[key];
    let claimValues = [claim];
    if (Array.isArray(claim)) {
      claimValues = claim;
    }

    if (claimValues.length === 0) {
      throw new AuthError('invalid_role');
    }

    for (const value of claimValues) {
      if (typeof value !== 'string') {
        throw new AuthError('invalid_role');
      }

      for (const roleName of value.split(',')) {
        roleNames.push(roleName.trim().toLowerCase());
      }
    }
  }

  if (roleNames.length === 0) {
    throw new AuthError('missing_role');
  }

  // Keep validation in stages so malformed claims take priority over conflicts.
  for (const roleName of roleNames) {
    if (roleName === '') {
      throw new AuthError('invalid_role');
    }
  }

  for (const roleName of roleNames) {
    if (!Object.hasOwn(ROLES, roleName)) {
      throw new AuthError('unsupported_role');
    }
  }

  const userRole = ROLES[roleNames[0]];
  for (const roleName of roleNames) {
    if (ROLES[roleName] !== userRole) {
      throw new AuthError('ambiguous_role');
    }
  }

  return userRole;
}

export function validateToken(token, now = Date.now()) {
  try {
    if (typeof token !== 'string' || token.length > 65536) {
      throw new AuthError('invalid_token');
    }

    const parts = token.split('.');
    if (parts.length !== 3 || !/^[A-Za-z0-9_-]+$/.test(parts[2]) || parts[2].length % 4 === 1) {
      throw new AuthError('invalid_token');
    }

    const header = parseObject(decodeSegment(parts[0]));
    if (typeof header.alg !== 'string' || !header.alg.trim() || header.alg.toLowerCase() === 'none') {
      throw new AuthError('invalid_token');
    }

    const claims = parseObject(decodeSegment(parts[1]));
    if (typeof claims.exp !== 'number' || !Number.isFinite(claims.exp) || claims.exp <= 0 || claims.exp * 1000 > Number.MAX_SAFE_INTEGER) {
      throw new AuthError('invalid_token');
    }

    const expiresAt = claims.exp * 1000;
    if (expiresAt <= now) {
      throw new AuthError('expired');
    }

    for (const key of ['nbf', 'iat']) {
      if (Object.hasOwn(claims, key)) {
        const value = claims[key];
        if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
          throw new AuthError('invalid_token');
        }
      }
    }

    if (claims.nbf !== undefined && claims.nbf * 1000 > now) {
      throw new AuthError('invalid_token');
    }

    const role = extractRole(claims);
    const nameClaims = [
      claims.name,
      claims.unique_name,
      claims['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'],
    ];
    const user = {};
    for (const name of nameClaims) {
      if (typeof name === 'string' && name.trim()) {
        user.name = name;
        break;
      }
    }

    // These are frontend checks. Only the backend can verify the JWT signature.
    return Object.freeze({ token, role, expiresAt, user: Object.freeze(user) });
  } catch (error) {
    if (error instanceof AuthError) {
      throw error;
    }
    throw new AuthError('invalid_token');
  }
}

export function tokenFromResponse(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new AuthError('invalid_token');
  }
  if (!Object.hasOwn(data, 'token') || typeof data.token !== 'string' || !data.token) {
    throw new AuthError('invalid_token');
  }
  return data.token;
}
