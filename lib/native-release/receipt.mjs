import fs from 'node:fs';
import { createHash } from 'node:crypto';

export function fileHash(file) {
  const hash = createHash('sha256');
  const fd = fs.openSync(file, 'r');
  const chunk = Buffer.alloc(256 * 1024);
  try {
    for (let size; (size = fs.readSync(fd, chunk)) > 0;) hash.update(chunk.subarray(0, size));
    return hash.digest('hex');
  } finally {
    fs.closeSync(fd);
  }
}

export const receiptFile = (file) => file + '.prometheus-mini.json';

export function ownedExecutable(file, name) {
  try {
    if (!fs.lstatSync(file).isFile() || !fs.lstatSync(receiptFile(file)).isFile()) return false;
    const receipt = JSON.parse(fs.readFileSync(receiptFile(file), 'utf8'));
    return receipt.owner === 'prometheus-skills-mini' && receipt.name === name && receipt.sha256 === fileHash(file);
  } catch { return false; }
}
