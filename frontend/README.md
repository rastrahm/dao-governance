# DAO Governance Frontend

Next.js 15 · wallet (MetaMask → Anvil) · tema claro/oscuro · perfiles UI.

## Prueba completa (Anvil + wallet)

```shell
# Terminal 1
export PATH="$HOME/.foundry/bin:$PATH"
anvil

# Terminal 2 — deploy corto para demo
cd ..
MIN_DELAY=60 VOTING_PERIOD=10 forge script script/Deploy.s.sol:Deploy \
  --rpc-url http://127.0.0.1:8545 --broadcast

# Copiá las direcciones del log a frontend/.env.local (ver .env.example)

# Terminal 3
cd frontend
npm install
npm run dev
```

### MetaMask

1. Red: RPC `http://127.0.0.1:8545`, chainId `31337`, símbolo ETH.
2. Importá la cuenta Anvil #0:
   `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`
3. En la UI: **Conectar wallet** → perfil **Operador**.

### Flujo on-chain

1. Delegar (`self`)
2. Crear propuesta (Box)
3. **Minar (abrir voto)** → Votar For
4. **Minar (cerrar voto)** → Queue
5. **Warp MIN_DELAY** → Execute
6. Ver Box actualizado

Los botones Minar/Warp hablan directo al RPC de Anvil (cheatcodes); las txs van por tu wallet.
