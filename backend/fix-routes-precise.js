const fs = require('fs');

// Lista de arquivos de rotas para corrigir
const routeFiles = [
  'src/routes/automation.routes.ts',
  'src/routes/barcode.ts',
  'src/routes/interactions.ts',
  'src/routes/product.routes.ts',
  'src/routes/sale.routes.ts',
  'src/routes/stock-movements.ts'
];

function fixRouteFile(filePath) {
  console.log(`Corrigindo: ${filePath}`);
  
  let content = fs.readFileSync(filePath, 'utf8');
  let lines = content.split('\n');
  let modified = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Verificar se a linha tem res.json, res.status, res.send ou next() mas não tem return
    if (
      (line.includes('res.json(') || 
       line.includes('res.status(') || 
       line.includes('res.send(') || 
       line.includes('next(')) &&
      !line.includes('return ') &&
      !line.includes('return;') &&
      line.trim() !== '' &&
      !line.includes('//') &&
      !line.includes('/*') &&
      !line.includes('*/')
    ) {
      // Adicionar return no início da linha (após a indentação)
      const match = line.match(/^(\s*)(.*)$/);
      if (match) {
        lines[i] = match[1] + 'return ' + match[2];
        modified = true;
        console.log(`  Linha ${i + 1}: Adicionado return`);
      }
    }
  }
  
  if (modified) {
    fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
    console.log(`✅ ${filePath} corrigido`);
  } else {
    console.log(`ℹ️  ${filePath} não precisava de correção`);
  }
}

// Corrigir todos os arquivos
routeFiles.forEach(file => {
  if (fs.existsSync(file)) {
    fixRouteFile(file);
  } else {
    console.log(`❌ Arquivo não encontrado: ${file}`);
  }
});

console.log('\n🎉 Correção de rotas concluída!'); 