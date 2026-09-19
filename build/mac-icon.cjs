const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const sharp = require('sharp');

// App Store validation requires the 512-point @2x representation (1024 pixels).
// Render every native size from the vector master, rather than upscaling a PNG.
module.exports = async bundle => {
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'eksaar-icons-'));
  const iconset = path.join(temporary, 'AppIcon.iconset');
  await fs.mkdir(iconset);
  try {
    const svg = await fs.readFile(path.join(__dirname, '../public/icon.svg'));
    for (const points of [16, 32, 128, 256, 512]) {
      for (const scale of [1, 2]) {
        const name = `icon_${points}x${points}${scale === 2 ? '@2x' : ''}.png`;
        await sharp(svg).resize(points * scale, points * scale).png().toFile(path.join(iconset, name));
      }
    }
    const iconName = execFileSync('/usr/libexec/PlistBuddy', ['-c', 'Print :CFBundleIconFile', path.join(bundle, 'Contents/Info.plist')], {encoding:'utf8'}).trim();
    if (path.basename(iconName) !== iconName) throw new Error('Unexpected bundle icon path');
    execFileSync('/usr/bin/iconutil', ['-c', 'icns', iconset, '-o', path.join(bundle, 'Contents/Resources', iconName.endsWith('.icns') ? iconName : `${iconName}.icns`)]);
  } finally {
    await fs.rm(temporary, {recursive:true, force:true});
  }
};
