// Transform only skill instruction bodies. The original Markdown was authored
// relative to skills/<id>/, while Docusaurus renders it under docs/catalog/.
const {existsSync, statSync} = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');
const generated = path.join(root, 'site/docs-catalog/skills');
const github = 'https://github.com/Prometheus-AGS/prometheus-skills-mini';

module.exports = function catalogSourceLinks() {
  return (tree, file) => {
    if (path.dirname(file.path) !== generated) return;
    const source = path.join(root, 'skills', path.basename(file.path, '.md'));
    let seenPageTitle = false;
    function visit(node) {
      if (node.type === 'heading') {
        if (seenPageTitle) node.depth = Math.min(6, node.depth + 1);
        seenPageTitle = true;
      }
      if (['link', 'image', 'definition'].includes(node.type) && node.url &&
          !/^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(node.url)) {
        const [, pathname, suffix] = /^([^?#]*)(.*)$/.exec(node.url);
        const filePath = path.resolve(source, pathname);
        const relative = path.relative(root, filePath);
        if (relative && !relative.startsWith('..') && existsSync(filePath)) {
          const route = relative.split(path.sep).map(encodeURIComponent).join('/');
          const view = node.type === 'image' ? 'raw' : statSync(filePath).isDirectory() ? 'tree' : 'blob';
          node.url = github + '/' + view + '/main/' + route + suffix;
        } else if (node.type === 'link') {
          // Some instructions refer to files in the consumer's project.
          // Display the reference without generating a dead catalog route.
          delete node.url;
          node.type = 'emphasis';
        }
      }
      if (node.children) node.children.forEach(visit);
    }
    tree.children.forEach(visit);
  };
};
