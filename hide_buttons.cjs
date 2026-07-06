const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith('.tsx')) {
      results.push(file);
    }
  });
  return results;
}

const files = walk('./src/pages');
files.forEach(file => {
  let original = fs.readFileSync(file, 'utf8');
  let content = original;
  
  // For Buttons with border-red-200
  content = content.replace(
    /className="([^"]*border-red-200[^"]*)"(\s*onClick=\{[^\}]*handleDelete)/g, 
    'className="$1 admin-only"$2'
  );

  // For DropdownMenuItem with text-red-600
  content = content.replace(
    /className="([^"]*text-red-600[^"]*)"/g, 
    (match, p1) => {
      // Only add admin-only if it's not already there
      if (!p1.includes('admin-only')) {
        return `className="${p1} admin-only"`;
      }
      return match;
    }
  );

  if (content !== original) {
    fs.writeFileSync(file, content);
    console.log("Updated", file);
  }
});
