// Cross-platform post-build: copies static assets into the standalone output.
import { cpSync, existsSync } from 'fs';

const copies = [
  ['.next/static', '.next/standalone/.next/static'],
  ['public', '.next/standalone/public'],
  // Next's file tracer only picks up scripts it can see referenced as
  // string literals (e.g. path.join(process.cwd(), 'scripts', 'x.py')) — it
  // can't see cross-script Python imports like `from _ocr_common import`,
  // so shared helper modules silently go missing from standalone/scripts
  // unless copied explicitly here.
  ['scripts', '.next/standalone/scripts'],
];

for (const [from, to] of copies) {
  if (!existsSync(from)) {
    console.error(`postbuild: source not found: ${from}`);
    process.exit(1);
  }
  cpSync(from, to, { recursive: true });
  console.log(`postbuild: copied ${from} -> ${to}`);
}
