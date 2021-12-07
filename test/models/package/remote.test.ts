import { RemotePackage } from '@/models/package';
import { join, resolve } from 'path';
import os from 'os';
import { pathExistsSync, readJsonSync, writeJsonSync } from 'fs-extra';
import { rmdirSync } from 'fs';

describe('test remote package function', () => {
  let rp: RemotePackage;
  beforeAll(async () => {
    rp = new RemotePackage({
      name: 'foo',
      version: '1.x',
      storageDir: os.tmpdir(),
    });
    jest.spyOn(rp, 'loadPkgInfo').mockImplementation(() =>
      Promise.resolve({
        name: 'foo',
        version: '1.0.0',
        dist: {
          shasum: '943e0ec03df00ebeb6273a5b94b916ba54b47581',
          tarball: 'https://registry.npmjs.org/foo/-/foo-1.0.0.tgz',
        },
        engines: { node: '>= v0.2' },
        _resolved: 'https://registry.npmjs.org/foo/-/foo-1.0.0.tgz',
        _from: 'foo@1.x',
        _integrity: 'sha1-lD4OwD3wDr62JzpblLkWulS0dYE=',
        _id: 'foo@1.0.0',
      }),
    );
  });
  it('When the version is blurred, the real version can be retrieved, the finalPkgPath is packagename@version', async () => {
    const finalPkgPath = await rp.getFinalPkgPath();
    expect(finalPkgPath).toBe('foo@1.0.0');
  });
  it('When the version is blurred, the real version can be retrieved, the sourceDir is storageDir/packagename@version', async () => {
    const sourceDir = await rp.getSourceDir();
    expect(sourceDir).toBe(join(os.tmpdir(), 'foo@1.0.0'));
  });
});

describe('test remote package, test remote data', () => {
  let rp: RemotePackage;
  let sourceDir: string;
  beforeAll(async () => {
    rp = new RemotePackage({
      name: 'foo',
      version: '1.x',
      storageDir: os.tmpdir(),
    });
    sourceDir = await rp.getSourceDir();
    rmdirSync(sourceDir, { recursive: true });
    expect(await rp.exists()).toBeFalsy();
    await rp.download();
    expect(pathExistsSync(resolve(sourceDir, 'package.json'))).toBeTruthy();
    await rp.install();
  });
  afterAll(() => {
    rmdirSync(sourceDir, { recursive: true });
  });

  it('test catch package info', async function () {
    const pkgInfo = await rp.loadPkgInfo();
    expect(pkgInfo.version).toBe('1.0.0');
  });

  it('test download', async () => {
    expect(
      pathExistsSync(resolve(sourceDir, 'package-lock.json')),
    ).toBeTruthy();
    const execFilePath = await rp.getExecFilePath();
    expect(execFilePath).toBe(resolve(sourceDir, 'index.js'));
  });

  it('test main enterance', async () => {
    const pkgJsonPath = await rp.getPackageJsonPath(sourceDir);
    const jsonInfo = readJsonSync(pkgJsonPath);
    jsonInfo.main = 'index2.js';
    writeJsonSync(pkgJsonPath, jsonInfo, { spaces: 2 });
    rp.loadExecFile = false;
    const execFilePath = await rp.getExecFilePath();
    expect(execFilePath).toBe(resolve(sourceDir, 'index2.js'));
  });

  it('test module enterance', async () => {
    const pkgJsonPath = await rp.getPackageJsonPath(sourceDir);
    const jsonInfo = readJsonSync(pkgJsonPath);
    delete jsonInfo.main;
    rp.loadExecFile = false;
    jsonInfo.module = 'index3.js';
    writeJsonSync(pkgJsonPath, jsonInfo, { spaces: 2 });
    const execFilePath = await rp.getExecFilePath();
    expect(execFilePath).toBe(resolve(sourceDir, 'index3.js'));
  });
});
