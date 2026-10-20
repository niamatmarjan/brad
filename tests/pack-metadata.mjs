// Normalize observed npm --json output forms for regression tests only.
export function parsePackMetadata(stdout, expectedName) {
  let parsed;
  try { parsed = JSON.parse(stdout); }
  catch { throw new Error('npm pack returned malformed JSON'); }
  let record;
  if (Array.isArray(parsed)) {
    if (parsed.length !== 1) throw new Error('npm pack expected exactly one package record');
    record = parsed[0];
  } else if (parsed && typeof parsed === 'object') {
    if (Object.hasOwn(parsed, 'files')) record = parsed;
    else {
      const entries = Object.entries(parsed);
      if (entries.length !== 1 || entries[0][0] !== expectedName)
        throw new Error('npm pack returned unexpected package-name keys');
      record = entries[0][1];
    }
  }
  if (!record || typeof record !== 'object' || record.name !== expectedName ||
      !Array.isArray(record.files) ||
      !record.files.every(file => file && typeof file.path === 'string' &&
        file.path.length > 0 && !file.path.startsWith('/') &&
        !file.path.split('/').includes('..')))
    throw new Error('npm pack returned an invalid package record or file list');
  return record;
}
