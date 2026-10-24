const fs = require('node:fs');
const { parseAst } = require('rollup/dist/shared/parseAst.js');
const ast = parseAst(fs.readFileSync('src/legacy-app.js', 'utf8'));
const boot = ast.body.find(node => node.type === 'FunctionDeclaration' && node.id.name === '__boot');
if (!boot) throw new Error('Boot function not found');
const names = new Set();
function bindings(pattern) {
  if (!pattern) return;
  if (pattern.type === 'Identifier') names.add(pattern.name);
  else if (pattern.type === 'ObjectPattern') pattern.properties.forEach(property => bindings(property.value || property.argument));
  else if (pattern.type === 'ArrayPattern') pattern.elements.forEach(bindings);
  else if (pattern.type === 'AssignmentPattern') bindings(pattern.left);
  else if (pattern.type === 'RestElement') bindings(pattern.argument);
}
function declarations(node) {
  if (!node) return;
  if (node.type === 'VariableDeclaration') node.declarations.forEach(entry => bindings(entry.id));
  if ((node.type === 'FunctionDeclaration' || node.type === 'ClassDeclaration') && node.id) names.add(node.id.name);
  if (node.type === 'BlockStatement') node.body.forEach(declarations);
  if (node.type === 'TryStatement') { declarations(node.block); declarations(node.handler?.body); declarations(node.finalizer); }
}
boot.body.body.forEach(declarations);
for (const entry of ast.body) if (entry.type === 'ImportDeclaration') entry.specifiers.forEach(specifier => names.add(specifier.local.name));
// optional-libraries.js installs this browser global before legacy-app loads.
 names.add('__lib');
const missing = [];
let factoryCount = 0;
function walk(node, callback) {
  if (!node || typeof node !== 'object') return;
  callback(node);
  for (const [key, value] of Object.entries(node)) {
    if (key === 'parent') continue;
    if (Array.isArray(value)) value.forEach(child => walk(child, callback));
    else if (value && typeof value === 'object' && typeof value.type === 'string') walk(value, callback);
  }
}
walk(boot, node => {
  if (node.type !== 'CallExpression' || node.callee.type !== 'Identifier' || !/^create\w+/.test(node.callee.name)) return;
  const deps = node.arguments[0];
  if (deps?.type !== 'ObjectExpression') return;
  factoryCount++;
  for (const property of deps.properties) {
    if (property.type === 'Property' && property.shorthand && property.value.type === 'Identifier' && !names.has(property.value.name)) missing.push(`${node.callee.name}: ${property.value.name}`);
  }
});
if (factoryCount < 17) throw new Error(`Expected at least 17 page factories; found ${factoryCount}`);
console.log(`Checked ${factoryCount} page factories; missing shorthand dependencies: ${missing.length}`);
for (const item of missing) console.log(item);

if (missing.length) process.exitCode = 1;
