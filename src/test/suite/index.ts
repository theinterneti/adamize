import * as path from 'path';
import Mocha from 'mocha';
import { glob } from 'glob';

export function run(): Promise<void> {
  // Create the mocha test
  const mocha = new Mocha({
    ui: 'tdd',
    color: true,
    timeout: 10000,
  });

  const testsRoot = path.resolve(__dirname, '..');

  return new Promise<void>((c, e) => {
    // Use glob to find all test files
    glob('**/**.test.js', { cwd: testsRoot })
      .then((files: string[]) => {
        // Add files to the test suite
        files.forEach((f: string) => {
          // eslint-disable-next-line no-console
          console.log(`Adding test file: ${f}`);
          mocha.addFile(path.resolve(testsRoot, f));
        });

        try {
          // Run the mocha test
          mocha.run((failures: number) => {
            if (failures > 0) {
              e(new Error(`${failures} tests failed.`));
            } else {
              c();
            }
          });
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error(err);
          e(err);
        }
      })
      .catch((err: unknown) => {
        // eslint-disable-next-line no-console
        console.error(err);
        e(err);
      });
  });
}
