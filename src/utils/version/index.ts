import semver from 'semver';

// system config
export const DEV_NODE_VERSION = '14.0.0';

export const checkVersion = (checkVersion = process.version) => {
  return semver.gte(checkVersion, DEV_NODE_VERSION);
};
