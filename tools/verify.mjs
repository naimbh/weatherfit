// Picks the right typechecker, then runs the tests.
//
// Before `npm install` there are no real type definitions, so the checker runs
// against tools/typecheck/stubs.d.ts. Afterwards the packages ship their own
// types, which are stricter and more accurate — mixing the two produces
// confusing errors, so only ever use one.
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const installed = existsSync('node_modules/react');
const target = installed ? 'typecheck' : 'typecheck:nodeps';

console.log(
  installed
    ? 'Dependencies found — checking against real package types.'
    : 'No dependencies yet — checking against stub declarations.',
);

for (const script of [target, 'test']) {
  const run = spawnSync('npm', ['run', script], { stdio: 'inherit', shell: false });
  if (run.status !== 0) process.exit(run.status ?? 1);
}
