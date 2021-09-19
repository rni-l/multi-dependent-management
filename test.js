const semver = require('semver');

console.log(semver.diff('v1.2.0', 'v1.3.0'));
console.log(semver.diff('v1.2.0', 'v1.1.0'));
console.log(semver.diff('v1.2.0', 'v1.3.1'));
console.log(semver.diff('v1.2.0', 'v2.3.0'));
console.log(semver.diff('v1.2.0-beta.1', 'v1.2.0-beta.2'));
console.log(semver.diff('v1.2.0', 'v1.2.1'));

console.log(semver.valid('~1.2.0'));
