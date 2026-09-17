const path = require('node:path');

const allowedSites = new Set([
  'https://www.geonames.org', 'https://creativecommons.org', 'https://me.sgopala.com', 'https://sgopala.com',
  'https://panchang.eksaar.com', 'https://gopalasubramanium.github.io',
  'https://github.com', 'https://www.drikpanchang.com', 'https://aa.usno.navy.mil'
]);

function isAppURL(value) {
  try {
    const u = new URL(value);
    return u.protocol === 'panchang:' && u.host === 'app' && !u.username && !u.password;
  } catch { return false; }
}

function isExternalURL(value) {
  try {
    const u = new URL(value);
    if (u.username || u.password || !allowedSites.has(u.origin)) return false;
    if (u.hostname === 'github.com') return /^\/(cosinekitty\/astronomy|gopalasubramanium\/panchang_clock)(\/|$)/.test(u.pathname);
    return true;
  } catch { return false; }
}

function assetPath(root, value) {
  if (!isAppURL(value)) return null;
  try {
    const pathname = decodeURIComponent(new URL(value).pathname);
    if (pathname.includes('\0') || pathname.includes('\\')) return null;
    const file = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!file.startsWith(path.resolve(root) + path.sep)) return null;
    if (!/\.(?:html|js|css|json|svg|png|txt|webmanifest)$/i.test(file)) return null;
    return file;
  } catch { return null; }
}

module.exports = {isAppURL, isExternalURL, assetPath};
