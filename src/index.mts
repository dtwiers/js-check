#!/usr/bin/env node
import chalk from 'chalk';
import { readdir, readFile } from 'fs/promises';
import { join, normalize } from 'path';

type GetHasFile = (dirContents: string[]) => boolean;

const getHasPackageJson: GetHasFile = dirContents => dirContents.includes('package.json');
const getHasNpmLock: GetHasFile = dirContents => dirContents.includes('package-lock.json');
const getHasPnpmLock: GetHasFile = dirContents => dirContents.includes('pnpm-lock.yaml');
const getHasYarnLock: GetHasFile = directoryContents => directoryContents.includes('yarn.lock');

const checkAndLogLockfile = (hasLockFile: boolean, packageManagerName: string) => {
  if (hasLockFile) {
    console.log(chalk.blue(`${packageManagerName} Lockfile Found.`));
  }
};

const lookUpDirectory = async (path: string) => {
  console.warn(chalk.blackBright(`Checking ${path}...`));
  const directoryContents = await readdir(path, { encoding: 'utf-8' });
  const hasPackageJson = getHasPackageJson(directoryContents);

  if (!hasPackageJson && normalize(join(path, '..')) !== path) {
    lookUpDirectory(normalize(join(path, '..')));
    return;
  }
  if (!hasPackageJson) {
    console.log(chalk.yellow('No package.json found'));
    process.exit(1);
  }

  const hasNpmLock = getHasNpmLock(directoryContents);
  const hasPnpmLock = getHasPnpmLock(directoryContents);
  const hasYarnLock = getHasYarnLock(directoryContents);
  checkAndLogLockfile(hasNpmLock, 'NPM');
  checkAndLogLockfile(hasPnpmLock, 'PNPM');
  checkAndLogLockfile(hasYarnLock, 'Yarn');

  const lockFileCount = [hasNpmLock, hasPnpmLock, hasYarnLock].filter(Boolean).length;
  if (lockFileCount > 1) {
    console.log(
      chalk.bold.redBright(
        'Caution: Multiple Lockfiles Found. It is recommended to only have one lockfile.'
      )
    );
  }
  if (hasPackageJson) {
    const packageJson = JSON.parse(
      await readFile(join(path, 'package.json'), { encoding: 'utf-8' })
    );
    const scripts: Record<string, string> | undefined = packageJson.scripts;
    if (!scripts) {
      console.log(chalk.yellow('No scripts found in package.json.'));
    } else {
      const maxKeyLength = Object.keys(scripts).reduce(
        (accum, key) => Math.max(accum, key.length),
        0
      );
      const maxValWidth = (process.stdout.columns ?? 80) - maxKeyLength - 8;

      console.log(chalk.bold.green('Available Commands:'));
      Object.entries(scripts).forEach(([key, val]) => {
        const shortenedVal =
          val.substring(0, maxValWidth) + (val.length > maxValWidth ? '...' : '');
        console.log(
          ` ${chalk.cyanBright(key.padEnd(maxKeyLength, ' '))} ${chalk.magenta.dim(shortenedVal)}`
        );
      });
    }
  }
};

lookUpDirectory(process.cwd());
