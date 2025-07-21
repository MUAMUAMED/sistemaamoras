const fs = require('fs');
const path = require('path');

// Verificar se o diretório de uploads existe
const uploadsDir = path.join(__dirname, 'backend', 'uploads');
const productsDir = path.join(uploadsDir, 'products');

console.log('🔍 Verificando diretórios de upload...');

// Verificar diretório uploads
if (!fs.existsSync(uploadsDir)) {
  console.log('❌ Diretório uploads não existe. Criando...');
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('✅ Diretório uploads criado');
} else {
  console.log('✅ Diretório uploads existe');
}

// Verificar diretório products
if (!fs.existsSync(productsDir)) {
  console.log('❌ Diretório products não existe. Criando...');
  fs.mkdirSync(productsDir, { recursive: true });
  console.log('✅ Diretório products criado');
} else {
  console.log('✅ Diretório products existe');
}

// Verificar permissões
try {
  fs.accessSync(productsDir, fs.constants.W_OK);
  console.log('✅ Permissões de escrita OK');
} catch (error) {
  console.log('❌ Erro de permissões:', error.message);
}

// Listar arquivos existentes
console.log('\n📁 Arquivos existentes em products:');
try {
  const files = fs.readdirSync(productsDir);
  if (files.length === 0) {
    console.log('   (nenhum arquivo)');
  } else {
    files.forEach(file => {
      const filePath = path.join(productsDir, file);
      const stats = fs.statSync(filePath);
      console.log(`   📄 ${file} (${(stats.size / 1024).toFixed(2)} KB)`);
    });
  }
} catch (error) {
  console.log('❌ Erro ao listar arquivos:', error.message);
}

console.log('\n🎯 Teste de upload concluído!'); 