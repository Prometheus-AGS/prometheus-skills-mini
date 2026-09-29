// The only way this project reads a text file.
//
// A Windows checkout, or an OKF bundle cloned from someone else's repository, can arrive
// with CRLF endings. Normalising once here means no parser has to think about it — and
// the parsers are made tolerant anyway, because this module is not the only possible
// caller (see rules/lib/render.mjs).
//
// Deliberately not handled: lone CR (classic Mac) and mixed endings. Neither has been
// observed, and inventing behaviour for them would be guesswork.

import fs from 'node:fs';

export function readText(file) {
  return fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
}
