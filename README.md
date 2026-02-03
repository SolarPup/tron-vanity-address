# Tron Vanity Address

Generate a vanity address for the Tron network.

Simply `git clone` the repo, then run the program with `node index` and follow the prompts. Here I created a custom address containing "JSun" for Justin Sun.

![alt text](https://i.imgur.com/KaOhDLr.png)

Keep in mind that to create custom addresses with >4 characters can be very computer and time intensive.

Creating an address also doesn't mean that it exists on the Tron network. You will still need to activate your account by sending it some TRX or registering it with their protocol. (As always, don't send TRX to testnet accounts or they will be lost forever.)

Enjoy! :)

---

## Modo `fixed-edges` (experimental)

Adicionado suporte experimental para procurar endereços que mantenham N caracteres iniciais e M caracteres finais do endereço alvo. Este modo é altamente custoso: por exemplo, fixar 7 caracteres iniciais + 6 finais demanda ~58^13 tentativas (praticamente impossível).

Use com cuidado e sempre com `--time-limit` para evitar buscas infinitas. Exemplo:

```bash
node index.js --mode fixed-edges --similar-to TYAavN2xCDro5Gdip8UU6W9oQmM43rNxzQ --fixed-left 7 --fixed-right 6 --threads 8 --time-limit 86400
```

O programa irá avisar sobre a inviabilidade e oferecer fallback (redução de sufixo) quando apropriado.

### Persistir private key com segurança

Você pode salvar a private key encontrada em um arquivo com ou sem encriptação:

- Salvar em texto simples:

```bash
node index.js --mode fixed-edges --similar-to ... --save-file ./priv.txt
```

- Salvar encriptado (AES-256-GCM) com passphrase:

```bash
node index.js --mode fixed-edges --similar-to ... --save-file ./priv.enc --encrypt --encrypt-pass "minha-senha-secreta"
```

Se `--encrypt` for usado sem `--encrypt-pass`, o processo falhará; em versões futuras será solicitado interativamente uma passphrase.

