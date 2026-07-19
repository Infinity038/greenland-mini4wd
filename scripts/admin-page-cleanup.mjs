#!/usr/bin/env node
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const root = path.join(process.cwd(), 'app', 'admin');
const walk = dir => readdirSync(dir, { withFileTypes: true }).flatMap(entry =>
  entry.isDirectory() ? walk(path.join(dir, entry.name)) : [path.join(dir, entry.name)]
);

const removedFunctions = new Set(['checkAuth', 'saveAuth', 'LoginScreen']);
const removedBindings = new Set([
  'authed', 'setAuthed',
  'checked', 'setChecked',
  'pw', 'setPw',
  'pwErr', 'setPwErr',
]);
const ignoredCalls = new Set([
  'checkAuth', 'saveAuth',
  'setAuthed', 'setChecked',
  'setPw', 'setPwErr',
]);

function bindingNames(name, names = []) {
  if (ts.isIdentifier(name)) names.push(name.text);
  else if (ts.isArrayBindingPattern(name) || ts.isObjectBindingPattern(name)) {
    for (const element of name.elements) {
      if (ts.isBindingElement(element)) bindingNames(element.name, names);
    }
  }
  return names;
}

function containsIdentifier(node, wanted) {
  let found = false;
  function visit(child) {
    if (found) return;
    if (ts.isIdentifier(child) && wanted.has(child.text)) {
      found = true;
      return;
    }
    ts.forEachChild(child, visit);
  }
  visit(node);
  return found;
}

function containsReturn(node) {
  let found = false;
  function visit(child) {
    if (found) return;
    if (ts.isReturnStatement(child)) {
      found = true;
      return;
    }
    ts.forEachChild(child, visit);
  }
  visit(node);
  return found;
}

function isAuthEffect(statement) {
  if (!ts.isExpressionStatement(statement) || !ts.isCallExpression(statement.expression)) return false;
  const call = statement.expression;
  return ts.isIdentifier(call.expression)
    && call.expression.text === 'useEffect'
    && containsIdentifier(call, new Set(['checkAuth']));
}

function collectBusinessCalls(statement, sourceFile) {
  const calls = [];
  const seen = new Set();
  function visit(node) {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
      const name = node.expression.text;
      if (!ignoredCalls.has(name) && name !== 'useEffect') {
        const text = node.getText(sourceFile);
        if (!seen.has(text)) {
          seen.add(text);
          calls.push(text);
        }
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(statement);
  return calls;
}

function parseStatement(source) {
  const file = ts.createSourceFile('generated.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  if (file.statements.length !== 1) throw new Error(`Expected one generated statement, got ${file.statements.length}`);
  return file.statements[0];
}

function cleanVariableStatement(statement) {
  const declarations = statement.declarationList.declarations.filter(declaration => {
    const names = bindingNames(declaration.name);
    return !names.some(name => removedBindings.has(name) || name === 'ADMIN_PASSWORD');
  });
  if (declarations.length === 0) return undefined;
  if (declarations.length === statement.declarationList.declarations.length) return statement;
  return ts.factory.updateVariableStatement(
    statement,
    statement.modifiers,
    ts.factory.updateVariableDeclarationList(statement.declarationList, declarations)
  );
}

function cleanFunction(node, sourceFile) {
  if (!node.body) return node;
  const statements = [];

  for (const statement of node.body.statements) {
    if (ts.isVariableStatement(statement)) {
      const cleaned = cleanVariableStatement(statement);
      if (cleaned) statements.push(cleaned);
      continue;
    }

    if (isAuthEffect(statement)) {
      const businessCalls = collectBusinessCalls(statement, sourceFile);
      if (businessCalls.length) {
        statements.push(parseStatement(`useEffect(() => { ${businessCalls.map(call => `${call};`).join(' ')} }, []);`));
      }
      continue;
    }

    if (ts.isIfStatement(statement)
      && containsIdentifier(statement.expression, new Set(['authed', 'checked']))
      && containsReturn(statement.thenStatement)) {
      continue;
    }

    statements.push(statement);
  }

  return ts.factory.updateFunctionDeclaration(
    node,
    node.modifiers,
    node.asteriskToken,
    node.name,
    node.typeParameters,
    node.parameters,
    node.type,
    ts.factory.updateBlock(node.body, statements)
  );
}

function transformFile(file) {
  const source = readFileSync(file, 'utf8');
  const sourceFile = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const statements = [];

  for (const statement of sourceFile.statements) {
    if (ts.isFunctionDeclaration(statement) && statement.name && removedFunctions.has(statement.name.text)) {
      continue;
    }

    if (ts.isVariableStatement(statement)) {
      const cleaned = cleanVariableStatement(statement);
      if (cleaned) statements.push(cleaned);
      continue;
    }

    if (ts.isFunctionDeclaration(statement)) {
      statements.push(cleanFunction(statement, sourceFile));
      continue;
    }

    statements.push(statement);
  }

  const updated = ts.factory.updateSourceFile(sourceFile, statements);
  const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed, removeComments: false });
  const output = printer.printFile(updated).replace(/\n{3,}/g, '\n\n');
  if (output !== source) writeFileSync(file, output);
}

const changed = [];
for (const file of walk(root).filter(file => file.endsWith(`${path.sep}page.tsx`))) {
  const relative = path.relative(root, file).replaceAll('\\', '/');
  if (relative === 'page.tsx' || relative === 'login/page.tsx') continue;
  const before = readFileSync(file, 'utf8');
  transformFile(file);
  const after = readFileSync(file, 'utf8');
  if (before !== after) changed.push(relative);
}

console.log(`Cleaned ${changed.length} admin page modules.`);
for (const file of changed) console.log(`- app/admin/${file}`);
