# 🔍 Onde Encontrar seu Username do Docker Hub

## 📍 Opções para Encontrar seu Username

### 1. **No Site do Docker Hub** (Mais Fácil)

1. Acesse: **https://hub.docker.com**
2. Faça login (se ainda não estiver)
3. Seu username aparece:
   - **No canto superior direito** (ao lado da foto de perfil)
   - **Na URL** quando você acessa seu perfil: `https://hub.docker.com/u/SEU-USERNAME`
   - **No menu dropdown** ao clicar na foto de perfil

### 2. **Verificar se Já Está Logado Localmente**

Execute no PowerShell:

```powershell
docker info
```

Procure por uma linha que diz:
```
Username: seu-username-aqui
```

### 3. **Verificar Arquivo de Configuração**

O Docker salva suas credenciais em:
```
C:\Users\SEU-USUARIO\.docker\config.json
```

Você pode verificar manualmente (mas cuidado, não compartilhe este arquivo!).

---

## 🆕 Se Você Ainda Não Tem Conta

1. Acesse: **https://hub.docker.com/signup**
2. Crie uma conta gratuita
3. Escolha um username (pode ser diferente do email)
4. Verifique seu email
5. Pronto! Seu username é o que você escolheu

---

## ✅ Depois de Encontrar

Depois que souber seu username, execute:

```powershell
# Fazer login (se ainda não fez)
docker login

# Publicar imagens
.\build-e-push-imagens.ps1 -DockerUser SEU-USERNAME-AQUI
```

**Exemplo:**
```powershell
.\build-e-push-imagens.ps1 -DockerUser joaosilva
```

---

## 💡 Dica

Seu username do Docker Hub é:
- **Diferente do email** (você escolhe ao criar a conta)
- **Único** (ninguém mais pode ter o mesmo)
- **Visível no seu perfil** do Docker Hub

---

## 🔗 Links Úteis

- **Docker Hub:** https://hub.docker.com
- **Meu Perfil:** https://hub.docker.com/u/SEU-USERNAME (substitua SEU-USERNAME)
- **Repositórios:** https://hub.docker.com/repositories


