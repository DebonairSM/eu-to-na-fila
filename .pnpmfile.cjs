function readPackage(pkg) {
  // Allow build scripts for these packages
  if (pkg.name === 'better-sqlite3' || pkg.name === 'esbuild') {
    pkg.scripts = pkg.scripts || {};
  }
  return pkg;
}

module.exports = {
  hooks: {
    readPackage
  }
};

