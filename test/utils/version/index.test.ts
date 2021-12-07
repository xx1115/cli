import { checkVersion, DEV_NODE_VERSION } from '@/utils';

describe(`the node version must gather than or equal to ${DEV_NODE_VERSION}`, () => {
  it(`the node version can't be less than ${DEV_NODE_VERSION}`, () => {
    expect(checkVersion('11.0.0')).toBeFalsy();
  });
  it(`the node version must equal to ${DEV_NODE_VERSION}`, () => {
    expect(checkVersion('14.0.0')).toBeTruthy();
  });
  it(`the node version must gather than ${DEV_NODE_VERSION}`, () => {
    expect(checkVersion('15.0.0')).toBeTruthy();
  });
  it(`the node version must gather than ${DEV_NODE_VERSION}, version came from process.version`, () => {
    expect(checkVersion()).toBeTruthy();
  });
});
