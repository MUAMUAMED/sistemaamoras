const fs = require('fs');
const path = require('path');

// Lista de arquivos para corrigir
const files = [
  'src/routes/automation.routes.ts',
  'src/routes/barcode.ts',
  'src/routes/interactions.ts',
  'src/routes/product.routes.ts',
  'src/routes/sale.routes.ts',
  'src/routes/stock-movements.ts'
];

function fixFile(filePath) {
  console.log(`Corrigindo ${filePath}...`);
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Padrões para encontrar e corrigir
  const patterns = [
    // Padrão 1: } catch (error) { ... } })
    {
      search: /(\s+}\s+catch\s*\([^)]+\)\s*\{[^}]+return\s+res\.status\(\d+\)\.json\([^)]+\);\s*}\s*)\}\);/g,
      replace: '$1  return;\n});'
    },
    // Padrão 2: } catch (error) { ... next(error); } })
    {
      search: /(\s+}\s+catch\s*\([^)]+\)\s*\{[^}]+return\s+next\([^)]+\);\s*}\s*)\}\);/g,
      replace: '$1  return;\n});'
    },
    // Padrão 3: } catch (error) { ... } }) sem return
    {
      search: /(\s+}\s+catch\s*\([^)]+\)\s*\{[^}]+(?:console\.error|res\.status)[^}]+}\s*)\}\);/g,
      replace: '$1  return;\n});'
    }
  ];
  
  let modified = false;
  
  patterns.forEach(pattern => {
    const newContent = content.replace(pattern.search, pattern.replace);
    if (newContent !== content) {
      content = newContent;
      modified = true;
    }
  });
  
  if (modified) {
    fs.writeFileSync(filePath, content);
    console.log(`✓ ${filePath} corrigido`);
  } else {
    console.log(`- ${filePath} não precisou de correção`);
  }
}

// Corrigir todos os arquivos
files.forEach(file => {
  const fullPath = path.join(__dirname, file);
  if (fs.existsSync(fullPath)) {
    fixFile(fullPath);
  } else {
    console.log(`⚠ Arquivo não encontrado: ${fullPath}`);
  }
});

console.log('\nCorreções concluídas!'); 